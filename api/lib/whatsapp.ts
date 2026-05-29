import { getDb } from "../queries/connection";
import { whatsappLogs, users } from "@db/schema";
import { eq } from "drizzle-orm";
import { getWhatsAppQueue, type WhatsAppTemplateComponent } from "../workers/queues";

const WA_API_BASE = "https://graph.facebook.com/v25.0";

export function toWaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "").slice(-10);
  return `91${digits}`;
}

export async function sendWhatsAppTemplateRaw(
  phone: string,
  templateName: string,
  language: string,
  components: WhatsAppTemplateComponent[]
): Promise<string> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !token) throw new Error("WhatsApp credentials not configured");

  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    to: phone,
    type: "template",
    template: {
      name: templateName,
      language: { code: language },
      ...(components.length > 0 && { components }),
    },
  };

  const res = await fetch(`${WA_API_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json() as any;
  if (!res.ok || data.error) {
    throw new Error(`WA API ${res.status}: ${JSON.stringify(data.error ?? data)}`);
  }

  return (data.messages?.[0]?.id as string) ?? "";
}

export async function sendWhatsAppTextRaw(phone: string, message: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !token) return;

  await fetch(`${WA_API_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { body: message },
    }),
  }).catch(e => console.error("[WA] Text send error:", e));
}

export async function dispatchWhatsApp(
  phone: string,
  templateName: string,
  language: string,
  components: WhatsAppTemplateComponent[],
  meta: { bookingId?: number; notificationType: string },
  fallbackSmsMessage?: string,
  skipOptOutCheck = false
): Promise<void> {
  const waPhone = toWaPhone(phone);

  if (!skipOptOutCheck) {
    try {
      const db = getDb();
      const localPhone = phone.replace(/\D/g, "").slice(-10);
      const [u] = await db.select({ whatsappOptOut: users.whatsappOptOut }).from(users).where(eq(users.phone, localPhone)).limit(1);
      if (u?.whatsappOptOut) {
        console.log(`[WA] Skipping — user ${localPhone} opted out`);
        return;
      }
    } catch { /* non-fatal */ }
  }

  const queue = getWhatsAppQueue();
  if (queue) {
    try {
      const db = getDb();
      const [result] = await db.insert(whatsappLogs).values({
        bookingId: meta.bookingId,
        direction: "outbound",
        templateName,
        phone: waPhone,
        waStatus: "sent",
        fallbackSent: false,
      });
      const logId = Number((result as any).insertId);

      await queue.add(`wa-${meta.notificationType}-${Date.now()}`, {
        logId,
        phone: waPhone,
        templateName,
        language,
        components,
        bookingId: meta.bookingId,
        notificationType: meta.notificationType,
        fallbackSmsMessage,
      });
      return;
    } catch (e) {
      console.error("[WA] Enqueue failed, trying direct send:", e);
    }
  }

  // Direct send (no Redis)
  try {
    await sendWhatsAppTemplateRaw(waPhone, templateName, language, components);
  } catch (e) {
    console.error("[WA] Direct send failed:", e);
  }
}
