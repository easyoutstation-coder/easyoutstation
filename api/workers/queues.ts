import { Queue } from "bullmq";
import { getRedis } from "../lib/redis";

export const QUEUE_NOTIFICATIONS = "eo-notifications";
export const QUEUE_CRON = "eo-cron";
export const QUEUE_WHATSAPP = "eo-whatsapp";
export const QUEUE_WHATSAPP_INBOUND = "eo-whatsapp-inbound";

// ── Job type definitions ──────────────────────────────────────────────────────

export type SmsJobData = {
  channel: "sms";
  logId: number;
  phone: string;
  message: string;
  bookingId?: number;
  notificationType: string;
};

export type EmailJobData = {
  channel: "email";
  logId: number;
  to: string;
  subject: string;
  text: string;
  from?: string;
  bookingId?: number;
  notificationType: string;
};

export type PushJobData = {
  channel: "push";
  logId: number;
  fcmToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  bookingId?: number;
  notificationType: string;
};

export type NotificationJobData = SmsJobData | EmailJobData | PushJobData;

export type CronJobData = {
  task: "run-daily-reminders" | "run-post-trip-reviews" | "run-abandoned-reminders";
};

export type WhatsAppTemplateComponent = {
  type: "header" | "body" | "button";
  parameters: Array<{ type: "text"; text: string } | { type: "payload"; payload: string }>;
  index?: number;
  sub_type?: string;
};

export type WhatsAppOutboundJobData = {
  logId: number;
  phone: string;
  templateName: string;
  language: string;
  components: WhatsAppTemplateComponent[];
  bookingId?: number;
  notificationType: string;
  fallbackSmsMessage?: string;
};

export type WhatsAppInboundJobData = {
  payload: unknown;
};

// ── Queue instances (singletons) ─────────────────────────────────────────────

let notificationQueue: Queue<NotificationJobData> | null = null;
let cronQueue: Queue<CronJobData> | null = null;

export function getNotificationQueue(): Queue<NotificationJobData> | null {
  const redis = getRedis();
  if (!redis) return null;
  if (!notificationQueue) {
    notificationQueue = new Queue<NotificationJobData>(QUEUE_NOTIFICATIONS, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
      },
    });
    notificationQueue.on("error", (err) => console.error("[Queue:notifications] Error:", err.message));
  }
  return notificationQueue;
}

export function getCronQueue(): Queue<CronJobData> | null {
  const redis = getRedis();
  if (!redis) return null;
  if (!cronQueue) {
    cronQueue = new Queue<CronJobData>(QUEUE_CRON, {
      connection: redis,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    });
    cronQueue.on("error", (err) => console.error("[Queue:cron] Error:", err.message));
  }
  return cronQueue;
}

let whatsappQueue: Queue<WhatsAppOutboundJobData> | null = null;
let whatsappInboundQueue: Queue<WhatsAppInboundJobData> | null = null;

export function getWhatsAppQueue(): Queue<WhatsAppOutboundJobData> | null {
  const redis = getRedis();
  if (!redis) return null;
  if (!whatsappQueue) {
    whatsappQueue = new Queue<WhatsAppOutboundJobData>(QUEUE_WHATSAPP, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 200 },
      },
    });
    whatsappQueue.on("error", (err) => console.error("[Queue:whatsapp] Error:", err.message));
  }
  return whatsappQueue;
}

export function getWhatsAppInboundQueue(): Queue<WhatsAppInboundJobData> | null {
  const redis = getRedis();
  if (!redis) return null;
  if (!whatsappInboundQueue) {
    whatsappInboundQueue = new Queue<WhatsAppInboundJobData>(QUEUE_WHATSAPP_INBOUND, {
      connection: redis,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "fixed", delay: 2000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 200 },
      },
    });
    whatsappInboundQueue.on("error", (err) => console.error("[Queue:whatsapp-inbound] Error:", err.message));
  }
  return whatsappInboundQueue;
}
