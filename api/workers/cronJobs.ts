import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { bookings, users } from "@db/schema";
import { sendTripReminder, sendReviewRequest, sendBookingEmails, sendBookingSms } from "../lib/notifications";

function fmt(d: Date | string | null): string | undefined {
  return d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : undefined;
}

export async function runDailyReminders(): Promise<void> {
  try {
    const db = getDb();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const pending = await db.select().from(bookings).where(
      and(
        eq(bookings.status, "confirmed"),
        sql`DATE(${bookings.pickupDate}) = ${tomorrowStr}`,
        sql`${bookings.reminderSentAt} IS NULL`,
        sql`${bookings.driverName} IS NOT NULL`
      )
    );

    if (!pending.length) return;

    const userIds = [...new Set(pending.map(b => b.userId).filter(Boolean))];
    const userMap: Record<number, { phone: string | null; email: string | null }> = {};
    if (userIds.length > 0) {
      const rows = await db.select({ id: users.id, phone: users.phone, email: users.email })
        .from(users).where(sql`id IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);
      rows.forEach(u => { userMap[u.id] = { phone: u.phone, email: u.email }; });
    }

    for (const b of pending) {
      const phone = b.customerPhone || userMap[b.userId]?.phone || null;
      const email = b.customerEmail || userMap[b.userId]?.email || null;
      await sendTripReminder({
        customerName: b.customerName,
        customerPhone: phone,
        customerEmail: email,
        driverName: b.driverName!,
        driverPhone: b.driverPhone!,
        fromCity: b.fromCity,
        toCity: b.toCity,
        pickupDate: fmt(b.pickupDate) ?? String(b.pickupDate),
        pickupAddress: b.pickupAddress,
        bookingId: b.id,
      });
      await db.execute(sql.raw(`UPDATE bookings SET reminderSentAt = NOW() WHERE id = ${b.id}`));
      console.log(`[cron] Trip reminder queued for booking #${b.id}`);
    }
  } catch (e) {
    console.error("[cron] runDailyReminders error:", e);
  }
}

export async function runPostTripReviews(): Promise<void> {
  try {
    const db = getDb();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const done = await db.select().from(bookings).where(
      and(
        eq(bookings.status, "confirmed"),
        sql`DATE(${bookings.pickupDate}) = ${yesterdayStr}`,
        sql`${bookings.reviewSentAt} IS NULL`
      )
    );

    if (!done.length) return;

    const doneUserIds = [...new Set(done.map(b => b.userId).filter(Boolean))];
    const doneUserMap: Record<number, { phone: string | null; email: string | null }> = {};
    if (doneUserIds.length > 0) {
      const rows = await db.select({ id: users.id, phone: users.phone, email: users.email })
        .from(users).where(sql`id IN (${sql.join(doneUserIds.map(id => sql`${id}`), sql`, `)})`);
      rows.forEach(u => { doneUserMap[u.id] = { phone: u.phone, email: u.email }; });
    }

    for (const b of done) {
      const phone = b.customerPhone || doneUserMap[b.userId]?.phone || null;
      const email = b.customerEmail || doneUserMap[b.userId]?.email || null;
      await sendReviewRequest({
        customerName: b.customerName,
        customerPhone: phone,
        customerEmail: email,
        fromCity: b.fromCity,
        toCity: b.toCity,
        bookingId: b.id,
      });
      await db.execute(sql.raw(`UPDATE bookings SET reviewSentAt = NOW(), status = 'completed' WHERE id = ${b.id}`));
      console.log(`[cron] Review request queued for booking #${b.id}`);
    }
  } catch (e) {
    console.error("[cron] runPostTripReviews error:", e);
  }
}

export async function runAbandonedReminders(): Promise<void> {
  try {
    const db = getDb();
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);

    const abandoned = await db.select().from(bookings).where(
      and(
        sql`${bookings.paymentStatus} = 'pending'`,
        sql`${bookings.status} != 'cancelled'`,
        sql`${bookings.createdAt} < ${cutoff.toISOString().slice(0, 19).replace("T", " ")}`,
        sql`abandonmentReminderSentAt IS NULL`
      )
    );

    if (!abandoned.length) return;

    const userIds = [...new Set(abandoned.map(b => b.userId).filter(Boolean))];
    const userMap: Record<number, { phone: string | null; email: string | null }> = {};
    if (userIds.length > 0) {
      const rows = await db.select({ id: users.id, phone: users.phone, email: users.email })
        .from(users).where(sql`id IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);
      rows.forEach(u => { userMap[u.id] = { phone: u.phone, email: u.email }; });
    }

    for (const b of abandoned) {
      const phone = b.customerPhone || userMap[b.userId]?.phone || null;
      const email = b.customerEmail || userMap[b.userId]?.email || null;
      const pickupDateStr = fmt(b.pickupDate) ?? String(b.pickupDate);
      const returnDateStr = b.returnDate ? fmt(b.returnDate) : undefined;
      const price = parseFloat(b.totalPrice);

      try {
        await sendBookingEmails({
          bookingId: b.id,
          customerName: b.customerName,
          customerEmail: email ?? undefined,
          customerPhone: phone ?? undefined,
          carId: b.carId ?? undefined,
          fromCity: b.fromCity,
          toCity: b.toCity,
          pickupDate: pickupDateStr,
          returnDate: returnDateStr,
          returnTime: b.returnTime ?? undefined,
          totalKm: b.totalKm,
          totalPrice: price,
          tripType: b.tripType,
          passengerCount: b.passengerCount ?? 1,
          pickupAddress: b.pickupAddress ?? undefined,
          specialRequests: b.specialRequests ?? undefined,
        }, "abandonment");
      } catch (e) { console.error(`[cron] Abandonment email failed for #${b.id}:`, e); }

      if (phone) {
        try {
          await sendBookingSms(phone, b.id, b.fromCity, b.toCity, pickupDateStr, price, "abandonment", undefined, undefined, b.carId ?? undefined, b.totalKm ?? undefined);
        } catch (e) { console.error(`[cron] Abandonment SMS failed for #${b.id}:`, e); }
      }

      await db.execute(sql.raw(`UPDATE bookings SET abandonmentReminderSentAt = NOW() WHERE id = ${b.id}`));
      console.log(`[cron] Abandonment reminder queued for booking #${b.id}`);
    }
  } catch (e) {
    console.error("[cron] runAbandonedReminders error:", e);
  }
}
