import { getDb } from "../queries/connection";
import { bookingEvents } from "@db/schema";

export type BookingEventType =
  | "booking_created"
  | "payment_received"
  | "driver_assigned"
  | "vendor_confirmed"
  | "reminder_sent"
  | "review_sent"
  | "escalation_sent"
  | "cancelled"
  | "completed";

export async function logBookingEvent(
  bookingId: number,
  event: BookingEventType,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    const db = getDb();
    await db.insert(bookingEvents).values({
      bookingId,
      event,
      metaJson: meta ?? null,
    });
  } catch (e) {
    console.error(`[Events] Failed to log ${event} for booking #${bookingId}:`, e);
  }
}
