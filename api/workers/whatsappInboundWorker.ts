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
    description: "Calculate fare for a route and car. Always pass pickup_date. Pass return_date whenever the customer has given a return/drop-off date — the server calculates days from the actual dates so the 250 km/day minimum is applied correctly.",
    input_schema: {
      type: "object" as const,
      properties: {
        from_city: { type: "string" },
        to_city: { type: "string" },
        price_per_km: { type: "number" },
        trip_type: { type: "string", enum: ["one_way", "round_trip"] },
        pickup_date: { type: "string", description: "YYYY-MM-DD pickup date" },
        return_date: { type: "string", description: "YYYY-MM-DD return date. Required for multi-day trips. The server uses this to compute days and enforce 250 km/day minimum billing." },
      },
      required: ["from_city", "to_city", "price_per_km", "trip_type", "pickup_date"],
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
        return_date: { type: "string", description: "YYYY-MM-DD return date for multi-day trips" },
        trip_type: { type: "string", enum: ["one_way", "round_trip"] },
        trip_days: { type: "number", description: "Number of days — must match the 'days' value returned by get_fare_estimate" },
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
    const { from_city, to_city, price_per_km, trip_type, pickup_date, return_date } = input;
    const dist = routeDistance(from_city, to_city);

    // Compute days from actual dates so Claude's day-counting can't cause errors
    let days = 1;
    if (pickup_date && return_date) {
      const start = new Date(pickup_date);
      const end = new Date(return_date);
      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      days = Math.max(1, diffDays);
    } else if (trip_type === "round_trip") {
      days = 2;
    }

    const rawKm = trip_type === "round_trip" ? dist * 2 : dist;
    // Enforce 250 km/day minimum for multi-day trips
    const km = days > 1 ? Math.max(rawKm, days * 250) : rawKm;
    const driverCharge = 250 * days;
    const fare = Math.round(km * price_per_km + driverCharge);
    return JSON.stringify({ distance_km: dist, km_billed: km, days, driver_charge: driverCharge, fare_inr: fare });
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
    if (!bookingId || isNaN(bookingId)) throw new Error("Booking insert failed — no insertId returned. Check car_id is valid (use list_cars first).");
    logBookingEvent(bookingId, "booking_created", { fromCity: from_city, toCity: to_city }).catch(() => {});
    return JSON.stringify({ success: true, bookingId, paymentUrl: `https://easyoutstation.com/booking?resume=${bookingId}` });
  }

  return JSON.stringify({ error: "Unknown tool" });
}

const BOOKING_TEMPLATE = `*Name:*
*From:* (Delhi / Noida / Gurgaon / Faridabad / Ghaziabad)
*To:*
*Pickup Date (DD/MM/YYYY):*
*Return Date (DD/MM/YYYY):*
*Passengers:*
*Car:* Sedan / Ertiga / Innova / Crysta / Hycross
*Pickup Address:*`;

function buildSystemPrompt(isNewConversation: boolean): string {
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

  const newConvSection = isNewConversation ? `
━━ FIRST MESSAGE ━━
This is the customer's very first message. Greet them warmly in one short line, then send the booking template below so they can fill everything at once. End with "Or just tell me where you're heading and I'll guide you! 😊"

TEMPLATE (send exactly as shown, WhatsApp bold formatting included):
${BOOKING_TEMPLATE}

` : "";

  return `You are Asha, EasyOutstation's WhatsApp booking assistant. Be warm, concise — no walls of text.
Today's date is ${today}. Always use the correct year when converting dates customers give you (e.g. "next Monday", "June 5").
${newConvSection}
━━ TEMPLATE REPLIES ━━
When a customer's message contains filled fields like "Name:", "From:", "To:", "Pickup Date:" (they replied to the booking template), extract ALL fields in one pass and immediately call get_fare_estimate — no follow-up questions unless a field is missing or pickup city is outside Delhi NCR.

━━ PICKUP RESTRICTION ━━
Pickups ONLY from Delhi NCR: Delhi, Gurgaon, Noida, Faridabad, Ghaziabad, Rohtak, Sonipat (within 40 km of Delhi). If customer wants pickup from elsewhere, explain and ask if they can be in NCR instead.

━━ AVAILABLE ROUTES (from Delhi NCR) ━━
Manali 540km | Shimla 350km | Chandigarh 260km | Jaipur 280km | Agra 230km
Rishikesh 250km | Dehradun 300km | Haridwar 220km | Mussoorie 310km
Nainital 310km | Mathura 175km | Amritsar 460km
Custom routes also available — use get_fare_estimate with a reasonable distance estimate.

━━ CARS & RATES (per km, driver ₹250/day included) ━━
Swift Dzire ₹12/km 4 seats | Toyota Etios ₹13/km 4 seats
Maruti Ertiga ₹15/km 6 seats | Mahindra Xylo ₹16/km 7 seats
Kia Carens ₹17/km 6 seats | Toyota Innova ₹19/km 6 seats
Innova Crysta ₹20/km 6 seats (best for hills) | Innova Hycross ₹22/km 6 seats (luxury)
Use list_cars to get live IDs before calling create_booking.

━━ FARE RULES ━━
- Driver charge: ₹250/day (one way = 1 day, round trip = 2 days)
- Toll & parking: paid at actuals by customer on road — no markup
- Multi-day trips: pass BOTH pickup_date + return_date to get_fare_estimate — server enforces 250 km/day minimum
- Round trip = distance × 2 km
- 10% advance online confirms booking; 90% cash/UPI to driver at pickup
- Recommend Crysta or Hycross for hill routes (Manali, Shimla, Mussoorie, Nainital)

━━ CANCELLATION POLICY ━━
>24 hrs before pickup → 100% refund
12–24 hrs before pickup → 50% refund of advance
<12 hrs before pickup → no refund

━━ BOOKING CHECKLIST (all mandatory) ━━
1. Customer name  2. Pickup city/area (Delhi NCR only)  3. Destination
4. Pickup date → YYYY-MM-DD  5. Return date → YYYY-MM-DD (same as pickup for same-day round trip)
6. Trip type: one_way or round_trip  7. Passenger count
8. Car choice (suggest by group size & route)
9. Full pickup address — ALWAYS ask, NEVER skip

FLOW: Collect details → call get_fare_estimate with BOTH pickup_date AND return_date → quote → confirm → create_booking → send link.
IMPORTANT: Always pass pickup_date + return_date to get_fare_estimate. Never calculate fare manually.
After booking: "Booking #X confirmed! Pay ₹Y advance to lock your slot: [url]"

━━ OTHER RULES ━━
- Never invent fares — always use get_fare_estimate
- Never ask for phone number — you already have it
- Booking status → use check_my_booking
- Driver details sent within 60 min of confirmation
- Day-before reminder SMS auto-sent with driver name & number
- Support: +91-9958556011 | easyoutstation@gmail.com
- Corporate accounts: easyoutstation.com/corporate
- Referral program: ₹100 credit each when friend completes first ride (valid 90 days)
- Redirect non-cab queries politely`;
}

type MsgParam = { role: "user" | "assistant"; content: string };

async function handleAiConversation(phone: string, userText: string): Promise<void> {
  const db = getDb();

  // Load history
  const [conv] = await db.select().from(whatsappConversations).where(eq(whatsappConversations.phone, phone));
  const ctx = (conv?.contextJson ?? {}) as { messages?: MsgParam[]; aiState?: string };
  const history: MsgParam[] = ctx.messages ?? [];

  // Detect new conversation before appending — used to trigger template greeting
  const isNewConversation = history.length === 0;

  // Append user message, keep rolling window of 20
  history.push({ role: "user", content: userText });
  if (history.length > 20) history.splice(0, history.length - 20);

  // Build prompt dynamically — new conversations get the booking template section
  const systemPrompt = buildSystemPrompt(isNewConversation);

  // Agentic loop — let Claude use tools until it sends a final reply
  const messages: Anthropic.MessageParam[] = history.map(m => ({ role: m.role, content: m.content }));
  let reply = "";

  for (let i = 0; i < 5; i++) {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system: systemPrompt,
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
