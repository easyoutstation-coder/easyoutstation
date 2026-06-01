import { Worker, type Job } from "bullmq";
import { eq, sql, desc } from "drizzle-orm";
import { getRedis } from "../lib/redis";
import { getDb } from "../queries/connection";
import { whatsappLogs, whatsappConversations, bookings, drivers, cars } from "@db/schema";
import { logBookingEvent } from "../lib/bookingEvents";
import { QUEUE_WHATSAPP_INBOUND, type WhatsAppInboundJobData } from "./queues";
import { sendWhatsAppTextRaw, toWaPhone } from "../lib/whatsapp";
import Anthropic from "@anthropic-ai/sdk";

const ADMIN_PHONE = process.env.ADMIN_PHONE || "8796564111";

// ── AI booking agent ──────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const KNOWN_DISTANCES: Record<string, number> = {
  "delhi-manali": 540, "delhi-shimla": 350, "delhi-chandigarh": 260,
  "delhi-jaipur": 280, "delhi-agra": 230, "delhi-rishikesh": 250,
  "delhi-dehradun": 300, "delhi-haridwar": 220, "delhi-mussoorie": 310,
  "delhi-nainital": 310, "delhi-mathura": 175, "delhi-amritsar": 460,
  "delhi-vrindavan": 180, "delhi-dharamshala": 490, "delhi-kasauli": 310,
  "delhi-mcleod ganj": 500, "delhi-udaipur": 670, "delhi-dalhousie": 570,
};

function routeDistance(from: string, to: string): number {
  const key = `${from.toLowerCase()}-${to.toLowerCase()}`;
  return KNOWN_DISTANCES[key] ?? 300;
}

const AI_TOOLS: Anthropic.Tool[] = [
  {
    name: "list_cars",
    description: "Get all available cars with seat count and price per km",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_fare_estimate",
    description: "Calculate fare for a route and car",
    input_schema: {
      type: "object" as const,
      properties: {
        from_city: { type: "string" },
        to_city: { type: "string" },
        price_per_km: { type: "number" },
        trip_type: { type: "string", enum: ["one_way", "round_trip"] },
      },
      required: ["from_city", "to_city", "price_per_km", "trip_type"],
    },
  },
  {
    name: "check_my_booking",
    description: "Look up the customer's latest booking by their phone number",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "create_booking",
    description: "Create the booking once all details are confirmed. Returns a payment link.",
    input_schema: {
      type: "object" as const,
      properties: {
        customer_name: { type: "string" },
        from_city: { type: "string" },
        to_city: { type: "string" },
        pickup_date: { type: "string", description: "YYYY-MM-DD" },
        trip_type: { type: "string", enum: ["one_way", "round_trip"] },
        car_id: { type: "number" },
        total_km: { type: "number" },
        total_price: { type: "number" },
        passenger_count: { type: "number" },
        pickup_address: { type: "string", description: "Full pickup address — mandatory" },
      },
      required: ["customer_name", "from_city", "to_city", "pickup_date", "trip_type", "car_id", "total_km", "total_price", "passenger_count", "pickup_address"],
    },
  },
];

async function executeTool(name: string, input: any, phone: string): Promise<string> {
  const db = getDb();
  const localPhone = phone.slice(-10);

  if (name === "list_cars") {
    const list = await db.select({
      id: cars.id, name: cars.name, seats: cars.seats, pricePerKm: cars.pricePerKm, category: cars.category,
    }).from(cars).where(eq(cars.isAvailable, true));
    return JSON.stringify(
      list.filter(c => !["tempo", "bus"].includes(c.category))
        .map(c => ({ id: c.id, name: c.name, seats: c.seats, pricePerKm: parseFloat(c.pricePerKm) }))
    );
  }

  if (name === "get_fare_estimate") {
    const { from_city, to_city, price_per_km, trip_type } = input;
    const dist = routeDistance(from_city, to_city);
    const km = trip_type === "round_trip" ? dist * 2 : dist;
    const days = trip_type === "round_trip" ? 2 : 1;
    const fare = Math.round(km * price_per_km + 250 * days);
    return JSON.stringify({ distance_km: dist, km_billed: km, fare_inr: fare });
  }

  if (name === "check_my_booking") {
    const [b] = await db.select().from(bookings)
      .where(eq(bookings.customerPhone, localPhone))
      .orderBy(desc(bookings.id)).limit(1);
    if (!b) return JSON.stringify({ found: false });
    return JSON.stringify({
      found: true, bookingId: b.id, status: b.status, paymentStatus: b.paymentStatus,
      from: b.fromCity, to: b.toCity, pickupDate: b.pickupDate,
      driverName: b.driverName ?? "Not yet assigned", driverPhone: b.driverPhone ?? null,
    });
  }

  if (name === "create_booking") {
    const { customer_name, from_city, to_city, pickup_date, trip_type, car_id, total_km, total_price, passenger_count, pickup_address } = input;
    const parsedDate = new Date(pickup_date);
    if (isNaN(parsedDate.getTime())) throw new Error(`Invalid pickup_date: "${pickup_date}". Use YYYY-MM-DD format.`);
    const result = await db.insert(bookings).values({
      userId: 0, carId: car_id, fromCity: from_city, toCity: to_city,
      pickupDate: parsedDate, tripType: trip_type,
      passengerCount: passenger_count, totalKm: total_km,
      totalPrice: total_price.toString(), customerName: customer_name,
      customerPhone: localPhone, pickupAddress: pickup_address ?? null,
      paymentStatus: "pending", status: "pending",
    });
    const bookingId = Number((result as any).insertId);
    logBookingEvent(bookingId, "booking_created", { fromCity: from_city, toCity: to_city }).catch(() => {});
    return JSON.stringify({ success: true, bookingId, paymentUrl: `https://easyoutstation.com/booking?resume=${bookingId}` });
  }

  return JSON.stringify({ error: "Unknown tool" });
}

const SYSTEM_PROMPT = `You are Asha, EasyOutstation's WhatsApp booking assistant. EasyOutstation runs outstation cab services from Delhi NCR.

PRICING: Per-km rate + ₹250/day driver charge. Toll & parking paid to driver at actuals. 10% advance online confirms the booking.

TO COMPLETE A BOOKING YOU NEED (all mandatory):
1. From city  2. To city  3. Pickup date (YYYY-MM-DD)  4. Trip type (one_way/round_trip)
5. Car (use list_cars, suggest by group size)  6. Passenger count  7. Customer name  8. Pickup address (full address — NEVER skip this, always ask)

FLOW: Collect details conversationally → use get_fare_estimate to quote → confirm with customer → create_booking → send payment link.

After booking: "Pay ₹X advance here to lock your seat 🔒: [url]"

RULES:
- Short messages (WhatsApp). No walls of text.
- Never invent prices — always use tools.
- You already know the customer's phone — don't ask for it.
- For booking status queries use check_my_booking.
- If someone asks something outside cab booking, politely redirect.`;

type MsgParam = { role: "user" | "assistant"; content: string };

async function handleAiConversation(phone: string, userText: string): Promise<void> {
  const db = getDb();

  // Load history
  const [conv] = await db.select().from(whatsappConversations).where(eq(whatsappConversations.phone, phone));
  const ctx = (conv?.contextJson ?? {}) as { messages?: MsgParam[]; aiState?: string };
  const history: MsgParam[] = ctx.messages ?? [];

  // Append user message, keep rolling window of 20
  history.push({ role: "user", content: userText });
  if (history.length > 20) history.splice(0, history.length - 20);

  // Agentic loop — let Claude use tools until it sends a final reply
  const messages: Anthropic.MessageParam[] = history.map(m => ({ role: m.role, content: m.content }));
  let reply = "";

  for (let i = 0; i < 5; i++) {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      tools: AI_TOOLS,
      messages,
    });

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    const toolBlock = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");

    if (response.stop_reason === "end_turn" || !toolBlock) {
      reply = textBlock?.text ?? "";
      break;
    }

    // Execute tool — pass error back to Claude so it can recover gracefully
    let toolResult: string;
    try {
      toolResult = await executeTool(toolBlock.name, toolBlock.input as any, phone);
    } catch (e: any) {
      console.error(`[WA AI] Tool ${toolBlock.name} failed:`, e?.message ?? e);
      toolResult = JSON.stringify({ error: e?.message ?? "Tool execution failed" });
    }
    messages.push({ role: "assistant", content: response.content as any });
    messages.push({
      role: "user",
      content: [{ type: "tool_result", tool_use_id: toolBlock.id, content: toolResult }],
    } as any);
  }

  // Fallback — loop exhausted or empty reply
  if (!reply) {
    reply = "Sorry, I ran into an issue. Please call us at 8796564111 or visit easyoutstation.com to complete your booking.";
    console.error(`[WA AI] Empty reply for ${phone} — loop exhausted or Claude returned no text`);
  }

  // Save updated history
  history.push({ role: "assistant", content: reply });
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  if (conv) {
    await db.update(whatsappConversations)
      .set({ contextJson: { ...ctx, messages: history }, state: "ai_conversation", expiresAt })
      .where(eq(whatsappConversations.phone, phone));
  } else {
    await db.insert(whatsappConversations)
      .values({ phone, state: "ai_conversation", contextJson: { messages: history }, expiresAt });
  }

  await sendWhatsAppTextRaw(phone, reply);
  console.log(`[WA AI] Replied to ${phone}: ${reply.slice(0, 80)}...`);
}

async function handleStatusUpdate(status: any): Promise<void> {
  const { id: wamid, status: waStatus, timestamp } = status;
  if (!wamid || !waStatus) return;

  const db = getDb();
  const ts = new Date(parseInt(timestamp) * 1000);
  const update: Record<string, unknown> = { waStatus };
  if (waStatus === "delivered") update.deliveredAt = ts;
  if (waStatus === "read") update.readAt = ts;

  await db.update(whatsappLogs)
    .set(update)
    .where(eq(whatsappLogs.waMessageId, wamid));
}

async function handleIncomingMessage(message: any, waPhone: string): Promise<void> {
  const rawText = (message.text?.body ?? "").trim();
  const text = rawText.toUpperCase();
  const db = getDb();
  const localPhone = waPhone.slice(-10);

  if (text === "STOP") {
    await db.execute(sql`UPDATE users SET whatsappOptOut = TRUE WHERE phone = ${localPhone}`);
    await sendWhatsAppTextRaw(waPhone,
      "You've been unsubscribed from EasyOutstation WhatsApp notifications. Reply START to re-subscribe."
    );
    console.log(`[WA Inbound] Opt-out: ${waPhone}`);
    return;
  }

  if (text === "START") {
    await db.execute(sql`UPDATE users SET whatsappOptOut = FALSE, whatsappOptIn = TRUE, whatsappOptInAt = NOW() WHERE phone = ${localPhone}`);
    await sendWhatsAppTextRaw(waPhone,
      "You're subscribed to EasyOutstation WhatsApp notifications. We'll keep you updated on your bookings!"
    );
    return;
  }

  if (text === "HELP") {
    await sendWhatsAppTextRaw(waPhone,
      "EasyOutstation Help\n\n📞 Call: +91-9958556011\n📧 Email: easyoutstation@gmail.com\n🌐 Web: easyoutstation.com\n\nReply STOP to unsubscribe."
    );
    return;
  }

  // Check for active conversation state
  const [conv] = await db.select().from(whatsappConversations)
    .where(eq(whatsappConversations.phone, waPhone));

  // Operational states handled by state machine; everything else goes to AI
  const operationalStates = ["awaiting_review_rating", "awaiting_driver_confirm", "awaiting_corporate_approval"];
  if (!conv || new Date() > conv.expiresAt || conv.state === "idle" || !operationalStates.includes(conv.state)) {
    if (process.env.ANTHROPIC_API_KEY) {
      await handleAiConversation(waPhone, rawText);
    }
    return;
  }

  switch (conv.state) {
    case "awaiting_review_rating": {
      if (["1", "2", "3", "4", "5"].includes(text)) {
        await sendWhatsAppTextRaw(waPhone,
          `Thank you for rating your experience ${text}/5! 🙏 Your feedback helps us improve.\n\nBook again: easyoutstation.com`
        );
        await db.update(whatsappConversations)
          .set({ state: "idle" })
          .where(eq(whatsappConversations.phone, waPhone));
      } else {
        await sendWhatsAppTextRaw(waPhone, "Please reply with a number from 1 to 5 to rate your trip.");
      }
      break;
    }

    case "awaiting_driver_confirm": {
      const ctx = conv.contextJson as { bookingId?: number } | null;
      const bookingId = ctx?.bookingId;

      if (text === "ISSUE") {
        await sendWhatsAppTextRaw(waPhone, "Noted. Our operations team has been alerted and will contact you shortly.");
        if (bookingId) {
          await sendWhatsAppTextRaw(toWaPhone(ADMIN_PHONE),
            `⚠️ Vendor reported ISSUE on Booking #${bookingId}. Call vendor: +91-${waPhone.slice(-10)}`
          );
        }
        await db.update(whatsappConversations).set({ state: "idle" }).where(eq(whatsappConversations.phone, waPhone));
        break;
      }

      // Parse "Driver Name, 9876543210" — name is everything before the last comma/space before number
      const mobileMatch = rawText.match(/(\d{10})/);
      if (!mobileMatch) {
        await sendWhatsAppTextRaw(waPhone,
          "Please reply with your driver's name and mobile number.\nExample: Suresh Kumar, 9876543210"
        );
        break;
      }
      const mobile = mobileMatch[1];
      const driverName = rawText.replace(mobile, "").replace(/[,\s]+$/, "").trim();
      if (!driverName) {
        await sendWhatsAppTextRaw(waPhone,
          "Please include the driver's name too.\nExample: Suresh Kumar, 9876543210"
        );
        break;
      }

      if (bookingId) {
        await db.update(bookings)
          .set({ driverName, driverPhone: mobile, status: "driver_assigned" })
          .where(eq(bookings.id, bookingId));

        // Auto-register driver in drivers table if not already there
        const existing = await db.select({ id: drivers.id }).from(drivers).where(eq(drivers.phone, mobile)).limit(1);
        if (!existing[0]) {
          await db.insert(drivers).values({ name: driverName, phone: mobile, isActive: true });
          console.log(`[WA Inbound] Auto-registered driver: ${driverName} (${mobile})`);
        }

        await sendWhatsAppTextRaw(toWaPhone(ADMIN_PHONE),
          `✅ Vendor confirmed driver for Booking #${bookingId}: ${driverName}, +91-${mobile}`
        );
        logBookingEvent(bookingId, "vendor_confirmed", { driverName, driverPhone: mobile }).catch(() => {});
      }
      await sendWhatsAppTextRaw(waPhone,
        `✅ Confirmed! ${driverName} (+91-${mobile}) has been registered as driver${bookingId ? ` for Trip #${bookingId}` : ""}. Safe driving! 🚗`
      );
      await db.update(whatsappConversations).set({ state: "idle" }).where(eq(whatsappConversations.phone, waPhone));
      break;
    }

    case "awaiting_corporate_approval": {
      if (text === "YES" || text === "NO") {
        // Approval handling wired in Phase 2 via context bookingId
        await sendWhatsAppTextRaw(waPhone, text === "YES"
          ? "Booking approved! ✅ The employee will be notified."
          : "Booking rejected. The employee has been notified."
        );
        await db.update(whatsappConversations)
          .set({ state: "idle" })
          .where(eq(whatsappConversations.phone, waPhone));
      }
      break;
    }
  }
}

export function startWhatsAppInboundWorker() {
  const redis = getRedis();
  if (!redis) {
    console.log("[WA Inbound] Redis unavailable — inbound worker not started");
    return null;
  }

  const worker = new Worker<WhatsAppInboundJobData>(
    QUEUE_WHATSAPP_INBOUND,
    async (job: Job<WhatsAppInboundJobData>) => {
      const entries = (job.data.payload as any)?.entry ?? [];

      for (const entry of entries) {
        for (const change of entry.changes ?? []) {
          const value = change.value;
          if (!value) continue;

          for (const status of value.statuses ?? []) {
            await handleStatusUpdate(status).catch(e =>
              console.error("[WA Inbound] Status update error:", e)
            );
          }

          for (const message of value.messages ?? []) {
            await handleIncomingMessage(message, message.from).catch(e =>
              console.error("[WA Inbound] Message handler error:", e)
            );
          }
        }
      }
    },
    { connection: redis, concurrency: 3 }
  );

  worker.on("error", (err) => console.error("[WA Inbound] Worker error:", err.message));
  console.log("[WA Inbound] WhatsApp inbound worker started (concurrency: 3)");
  return worker;
}
