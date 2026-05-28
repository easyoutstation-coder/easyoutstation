import { Worker, type Job } from "bullmq";
import { eq } from "drizzle-orm";
import { getRedis } from "../lib/redis";
import { getDb } from "../queries/connection";
import { notificationLogs } from "@db/schema";
import { QUEUE_NOTIFICATIONS, type NotificationJobData } from "./queues";

// ── Raw send functions (no logging, no queueing) ──────────────────────────────

async function sendSmsRaw(phone: string, message: string): Promise<void> {
  const apiKey = process.env.FAST2SMS_API_KEY?.trim();
  if (!apiKey) throw new Error("FAST2SMS_API_KEY not set");
  const number = phone.replace(/\D/g, "").slice(-10);
  if (number.length !== 10) throw new Error(`Invalid phone number: ${phone}`);
  const params = new URLSearchParams({
    authorization: apiKey,
    route: "q",
    message,
    language: "english",
    flash: "0",
    numbers: number,
  });
  const res = await fetch(`https://www.fast2sms.com/dev/bulkV2?${params.toString()}`);
  const data = await res.json() as any;
  if (data.return !== true) throw new Error(`Fast2SMS error: ${JSON.stringify(data)}`);
}

async function sendEmailRaw(to: string, subject: string, text: string, from?: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not set");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: from ?? "EasyOutstation <bookings@easyoutstation.com>",
      to: [to],
      subject,
      text,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error ${res.status}: ${err}`);
  }
}

async function sendPushRaw(fcmToken: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) throw new Error("FCM_SERVER_KEY not set");
  const res = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `key=${serverKey}` },
    body: JSON.stringify({ to: fcmToken, notification: { title, body }, data }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`FCM error ${res.status}: ${err}`);
  }
}

// ── Log helpers ───────────────────────────────────────────────────────────────

async function markSent(logId: number, attempts: number): Promise<void> {
  try {
    const db = getDb();
    await db.update(notificationLogs)
      .set({ status: "sent", sentAt: new Date(), attempts })
      .where(eq(notificationLogs.id, logId));
  } catch (e) {
    console.error("[Worker] Failed to update log to sent:", e);
  }
}

async function markFailed(logId: number, attempts: number, errorMessage: string, dead = false): Promise<void> {
  try {
    const db = getDb();
    await db.update(notificationLogs)
      .set({ status: dead ? "dead" : "failed", attempts, errorMessage: errorMessage.slice(0, 500) })
      .where(eq(notificationLogs.id, logId));
  } catch (e) {
    console.error("[Worker] Failed to update log to failed:", e);
  }
}

// ── Worker ────────────────────────────────────────────────────────────────────

export function startNotificationWorker() {
  const redis = getRedis();
  if (!redis) {
    console.log("[Worker] Redis unavailable — notification worker not started (direct send active)");
    return null;
  }

  const worker = new Worker<NotificationJobData>(
    QUEUE_NOTIFICATIONS,
    async (job: Job<NotificationJobData>) => {
      const { logId, channel } = job.data;
      const attempt = (job.attemptsMade ?? 0) + 1;

      try {
        if (channel === "sms") {
          await sendSmsRaw(job.data.phone, job.data.message);
          console.log(`[Worker] SMS sent to ${job.data.phone} (job ${job.id}, attempt ${attempt})`);
        } else if (channel === "email") {
          await sendEmailRaw(job.data.to, job.data.subject, job.data.text, job.data.from);
          console.log(`[Worker] Email sent to ${job.data.to} (job ${job.id}, attempt ${attempt})`);
        } else if (channel === "push") {
          await sendPushRaw(job.data.fcmToken, job.data.title, job.data.body, job.data.data);
          console.log(`[Worker] Push sent (job ${job.id}, attempt ${attempt})`);
        }
        await markSent(logId, attempt);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Worker] Job ${job.id} attempt ${attempt} failed: ${msg}`);
        await markFailed(logId, attempt, msg);
        throw err; // re-throw so BullMQ handles retry / dead-letter
      }
    },
    {
      connection: redis,
      concurrency: 5,
    }
  );

  // After all retries exhausted
  worker.on("failed", async (job, err) => {
    if (!job) return;
    const maxAttempts = job.opts.attempts ?? 3;
    if ((job.attemptsMade ?? 0) >= maxAttempts) {
      const msg = err instanceof Error ? err.message : String(err);
      await markFailed(job.data.logId, job.attemptsMade ?? 0, msg, true);
      console.error(`[Worker] Job ${job.id} permanently dead after ${job.attemptsMade} attempts`);
    }
  });

  worker.on("error", (err) => console.error("[Worker] Notification worker error:", err.message));

  console.log("[Worker] Notification worker started (concurrency: 5)");
  return worker;
}
