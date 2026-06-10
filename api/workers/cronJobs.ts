import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { bookings, users } from "@db/schema";
import { sendTripReminder, sendReviewRequest, sendBookingEmails, sendBookingSms, sendAbandonmentFollowupSms } from "../lib/notifications";
import { logBookingEvent } from "../lib/bookingEvents";
import { sendWhatsAppTextRaw, toWaPhone } from "../lib/whatsapp";
import { markRideCompleted, autoAllocateReferralPoints } from "../lib/autoAllocateReferralPoints";

const ADMIN_PHONE = process.env.ADMIN_PHONE || "8796564111";

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
      logBookingEvent(b.id, "reminder_sent").catch(() => {});
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
      logBookingEvent(b.id, "review_sent").catch(() => {});
      logBookingEvent(b.id, "completed").catch(() => {});
      // Mark referral ride completed for the referred user (if they have a pending referral event)
      markRideCompleted(b.userId, b.id).catch(() => {});
      console.log(`[cron] Review request queued for booking #${b.id}`);
    }

    // Allocate points for any events that hit the 24-hour delay threshold
    autoAllocateReferralPoints()
      .then(n => { if (n > 0) console.log(`[cron] Referral points allocated for ${n} event(s)`); })
      .catch(e => console.error("[cron] autoAllocateReferralPoints error:", e));
  } catch (e) {
    console.error("[cron] runPostTripReviews error:", e);
  }
}

export async function runEscalationAlerts(): Promise<void> {
  try {
    const db = getDb();
    // Trips confirmed but no driver assigned, starting within 4 hours
    const cutoff = new Date(Date.now() + 4 * 60 * 60 * 1000);
    const cutoffStr = cutoff.toISOString().slice(0, 19).replace("T", " ");

    const unassigned = await db.select().from(bookings).where(
      and(
        eq(bookings.status, "confirmed"),
        sql`${bookings.driverName} IS NULL`,
        sql`${bookings.pickupDate} <= ${cutoffStr}`,
        sql`${bookings.pickupDate} >= NOW()`,
        sql`${bookings.escalationSentAt} IS NULL`
      )
    );

    if (!unassigned.length) return;

    for (const b of unassigned) {
      const pickupStr = fmt(b.pickupDate) ?? String(b.pickupDate);
      const msg = `🚨 ESCALATION: Booking #${b.id} — ${b.fromCity} to ${b.toCity} on ${pickupStr} has NO driver assigned and pickup is within 4 hours. Immediate action needed!`;

      try {
        await sendWhatsAppTextRaw(toWaPhone(ADMIN_PHONE), msg);
      } catch (e) { console.error(`[cron] Escalation WA failed for #${b.id}:`, e); }

      await db.execute(sql.raw(`UPDATE bookings SET escalationSentAt = NOW() WHERE id = ${b.id}`));
      logBookingEvent(b.id, "escalation_sent").catch(() => {});
      console.log(`[cron] Escalation alert sent for booking #${b.id}`);
    }
  } catch (e) {
    console.error("[cron] runEscalationAlerts error:", e);
  }
}

export async function runAbandonedReminders(): Promise<void> {
  try {
    const db = getDb();

    // ── Touch 1: 30 min after creation, first reminder ────────────────────────
    const cutoff1 = new Date(Date.now() - 30 * 60 * 1000);
    const touch1 = await db.select().from(bookings).where(
      and(
        sql`${bookings.paymentStatus} = 'pending'`,
        sql`${bookings.status} != 'cancelled'`,
        sql`${bookings.createdAt} < ${cutoff1.toISOString().slice(0, 19).replace("T", " ")}`,
        sql`abandonmentReminderSentAt IS NULL`,
        sql`DATE(${bookings.pickupDate}) >= CURDATE()`
      )
    );

    if (touch1.length > 0) {
      const userIds = [...new Set(touch1.map(b => b.userId).filter(Boolean))];
      const userMap: Record<number, { phone: string | null; email: string | null }> = {};
      if (userIds.length > 0) {
        const rows = await db.select({ id: users.id, phone: users.phone, email: users.email })
          .from(users).where(sql`id IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);
        rows.forEach(u => { userMap[u.id] = { phone: u.phone, email: u.email }; });
      }

      for (const b of touch1) {
        // Atomically claim this row — prevents double-send if multiple instances run concurrently
        const [claim] = await db.execute(
          sql`UPDATE bookings SET abandonmentReminderSentAt = NOW() WHERE id = ${b.id} AND abandonmentReminderSentAt IS NULL`
        ) as any;
        if ((claim?.affectedRows ?? 0) === 0) { console.log(`[cron] Touch1 already claimed for #${b.id} — skipping`); continue; }

        const phone = b.customerPhone || userMap[b.userId]?.phone || null;
        const email = b.customerEmail || userMap[b.userId]?.email || null;
        const pickupDateStr = fmt(b.pickupDate) ?? String(b.pickupDate);
        const returnDateStr = b.returnDate ? fmt(b.returnDate) : undefined;
        const price = parseFloat(b.totalPrice);

        try {
          await sendBookingEmails({
            bookingId: b.id, customerName: b.customerName, customerEmail: email ?? undefined,
            customerPhone: phone ?? undefined, carId: b.carId ?? undefined,
            fromCity: b.fromCity, toCity: b.toCity, pickupDate: pickupDateStr,
            returnDate: returnDateStr, returnTime: b.returnTime ?? undefined,
            totalKm: b.totalKm, totalPrice: price, tripType: b.tripType,
            passengerCount: b.passengerCount ?? 1, pickupAddress: b.pickupAddress ?? undefined,
            specialRequests: b.specialRequests ?? undefined,
          }, "abandonment");
        } catch (e) { console.error(`[cron] Touch1 email failed for #${b.id}:`, e); }

        if (phone) {
          try {
            await sendBookingSms(phone, b.id, b.fromCity, b.toCity, pickupDateStr, price, "abandonment", undefined, undefined, b.carId ?? undefined, b.totalKm ?? undefined);
          } catch (e) { console.error(`[cron] Touch1 SMS failed for #${b.id}:`, e); }
        }

        console.log(`[cron] Abandonment touch-1 sent for booking #${b.id}`);
      }
    }

    // ── Touch 2: 2 hours after touch 1 ───────────────────────────────────────
    const cutoff2 = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const touch2 = await db.select().from(bookings).where(
      and(
        sql`${bookings.paymentStatus} = 'pending'`,
        sql`${bookings.status} != 'cancelled'`,
        sql`abandonmentReminderSentAt IS NOT NULL`,
        sql`abandonmentReminder2SentAt IS NULL`,
        sql`abandonmentReminderSentAt < ${cutoff2.toISOString().slice(0, 19).replace("T", " ")}`,
        sql`DATE(${bookings.pickupDate}) >= CURDATE()`
      )
    );

    if (touch2.length > 0) {
      const userIds2 = [...new Set(touch2.map(b => b.userId).filter(Boolean))];
      const userMap2: Record<number, { phone: string | null; email: string | null }> = {};
      if (userIds2.length > 0) {
        const rows = await db.select({ id: users.id, phone: users.phone, email: users.email })
          .from(users).where(sql`id IN (${sql.join(userIds2.map(id => sql`${id}`), sql`, `)})`);
        rows.forEach(u => { userMap2[u.id] = { phone: u.phone, email: u.email }; });
      }

      for (const b of touch2) {
        const [claim2] = await db.execute(
          sql`UPDATE bookings SET abandonmentReminder2SentAt = NOW() WHERE id = ${b.id} AND abandonmentReminder2SentAt IS NULL`
        ) as any;
        if ((claim2?.affectedRows ?? 0) === 0) { console.log(`[cron] Touch2 already claimed for #${b.id} — skipping`); continue; }

        const phone = b.customerPhone || userMap2[b.userId]?.phone || null;
        const email = b.customerEmail || userMap2[b.userId]?.email || null;
        if (phone) {
          const pickupDateStr = fmt(b.pickupDate) ?? String(b.pickupDate);
          try {
            await sendAbandonmentFollowupSms(phone, b.id, b.fromCity, b.toCity, pickupDateStr, parseFloat(b.totalPrice), 2, b.carId ?? undefined, b.totalKm ?? undefined, email ?? undefined, b.customerName ?? undefined);
          } catch (e) { console.error(`[cron] Touch2 SMS failed for #${b.id}:`, e); }
        }
        console.log(`[cron] Abandonment touch-2 sent for booking #${b.id}`);
      }
    }

    // ── Touch 3: 24 hours after touch 2 (final) ──────────────────────────────
    const cutoff3 = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const touch3 = await db.select().from(bookings).where(
      and(
        sql`${bookings.paymentStatus} = 'pending'`,
        sql`${bookings.status} != 'cancelled'`,
        sql`abandonmentReminder2SentAt IS NOT NULL`,
        sql`abandonmentReminder3SentAt IS NULL`,
        sql`abandonmentReminder2SentAt < ${cutoff3.toISOString().slice(0, 19).replace("T", " ")}`,
        sql`DATE(${bookings.pickupDate}) >= CURDATE()`
      )
    );

    if (touch3.length > 0) {
      const userIds3 = [...new Set(touch3.map(b => b.userId).filter(Boolean))];
      const userMap3: Record<number, { phone: string | null; email: string | null }> = {};
      if (userIds3.length > 0) {
        const rows = await db.select({ id: users.id, phone: users.phone, email: users.email })
          .from(users).where(sql`id IN (${sql.join(userIds3.map(id => sql`${id}`), sql`, `)})`);
        rows.forEach(u => { userMap3[u.id] = { phone: u.phone, email: u.email }; });
      }

      for (const b of touch3) {
        const [claim3] = await db.execute(
          sql`UPDATE bookings SET abandonmentReminder3SentAt = NOW() WHERE id = ${b.id} AND abandonmentReminder3SentAt IS NULL`
        ) as any;
        if ((claim3?.affectedRows ?? 0) === 0) { console.log(`[cron] Touch3 already claimed for #${b.id} — skipping`); continue; }

        const phone = b.customerPhone || userMap3[b.userId]?.phone || null;
        const email = b.customerEmail || userMap3[b.userId]?.email || null;
        if (phone) {
          const pickupDateStr = fmt(b.pickupDate) ?? String(b.pickupDate);
          try {
            await sendAbandonmentFollowupSms(phone, b.id, b.fromCity, b.toCity, pickupDateStr, parseFloat(b.totalPrice), 3, b.carId ?? undefined, b.totalKm ?? undefined, email ?? undefined, b.customerName ?? undefined);
          } catch (e) { console.error(`[cron] Touch3 SMS failed for #${b.id}:`, e); }
        }
        console.log(`[cron] Abandonment touch-3 sent for booking #${b.id}`);
      }
    }
  } catch (e) {
    console.error("[cron] runAbandonedReminders error:", e);
  }
}
