import { Worker, type Job } from "bullmq";
import { eq } from "drizzle-orm";
import { getRedis } from "../lib/redis";
import { getDb } from "../queries/connection";
import { whatsappLogs, notificationLogs } from "@db/schema";
import {
  QUEUE_WHATSAPP,
  type WhatsAppOutboundJobData,
  getNotificationQueue,
} from "./queues";
import { sendWhatsAppTemplateRaw } from "../lib/whatsapp";

export function startWhatsAppWorker() {
  const redis = getRedis();
  if (!redis) {
    console.log("[WA Worker] Redis unavailable — WhatsApp worker not started");
    return null;
  }

  const worker = new Worker<WhatsAppOutboundJobData>(
    QUEUE_WHATSAPP,
    async (job: Job<WhatsAppOutboundJobData>) => {
      const { logId, phone, templateName, language, components } = job.data;
      const attempt = (job.attemptsMade ?? 0) + 1;

      try {
        const wamid = await sendWhatsAppTemplateRaw(phone, templateName, language, components);
        const db = getDb();
        await db.update(whatsappLogs)
          .set({ waMessageId: wamid, sentAt: new Date() })
          .where(eq(whatsappLogs.id, logId));
        console.log(`[WA Worker] Sent ${templateName} to ${phone} (attempt ${attempt}, wamid: ${wamid})`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[WA Worker] Failed ${templateName} to ${phone} attempt ${attempt}: ${msg}`);
        try {
          const db = getDb();
          await db.update(whatsappLogs)
            .set({ failureReason: msg.slice(0, 255) })
            .where(eq(whatsappLogs.id, logId));
        } catch {}
        throw err; // BullMQ handles retry
      }
    },
    { connection: redis, concurrency: 5 }
  );

  // After all retries exhausted — trigger SMS fallback
  worker.on("failed", async (job, err) => {
    if (!job) return;
    const maxAttempts = job.opts.attempts ?? 3;
    if ((job.attemptsMade ?? 0) < maxAttempts) return;

    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[WA Worker] Job ${job.id} permanently dead: ${msg}`);

    try {
      const db = getDb();
      await db.update(whatsappLogs)
        .set({ waStatus: "failed", fallbackSent: !!job.data.fallbackSmsMessage })
        .where(eq(whatsappLogs.id, job.data.logId));
    } catch {}

    if (job.data.fallbackSmsMessage) {
      try {
        const smsQueue = getNotificationQueue();
        if (smsQueue) {
          const db = getDb();
          const [result] = await db.insert(notificationLogs).values({
            bookingId: job.data.bookingId,
            notificationType: job.data.notificationType + "-sms-fallback",
            channel: "sms",
            recipient: job.data.phone.slice(-10),
            status: "queued",
            attempts: 0,
          });
          const smsLogId = Number((result as any).insertId);

          await smsQueue.add(`wa-fallback-sms-${Date.now()}`, {
            channel: "sms",
            logId: smsLogId,
            phone: job.data.phone.slice(-10),
            message: job.data.fallbackSmsMessage,
            bookingId: job.data.bookingId,
            notificationType: job.data.notificationType + "-sms-fallback",
          });
          console.log(`[WA Worker] SMS fallback queued for ${job.data.phone}`);
        }
      } catch (e) {
        console.error("[WA Worker] SMS fallback enqueue failed:", e);
      }
    }
  });

  worker.on("error", (err) => console.error("[WA Worker] Error:", err.message));
  console.log("[WA Worker] WhatsApp outbound worker started (concurrency: 5)");
  return worker;
}
