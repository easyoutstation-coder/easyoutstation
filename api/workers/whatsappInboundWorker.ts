import { Worker, type Job } from "bullmq";
import { eq, sql } from "drizzle-orm";
import { getRedis } from "../lib/redis";
import { getDb } from "../queries/connection";
import { whatsappLogs, whatsappConversations } from "@db/schema";
import { QUEUE_WHATSAPP_INBOUND, type WhatsAppInboundJobData } from "./queues";
import { sendWhatsAppTextRaw } from "../lib/whatsapp";

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

  if (!conv || new Date() > conv.expiresAt || conv.state === "idle") return;

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
      if (text === "CONFIRM") {
        await sendWhatsAppTextRaw(waPhone, "Trip confirmed! ✅ The customer has been notified. Safe driving! 🚗");
      } else if (text === "ISSUE") {
        await sendWhatsAppTextRaw(waPhone, "Noted. Our team has been alerted and will contact you shortly.");
      } else {
        break;
      }
      await db.update(whatsappConversations)
        .set({ state: "idle" })
        .where(eq(whatsappConversations.phone, waPhone));
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
