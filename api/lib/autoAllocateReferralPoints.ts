import { getDb } from "../queries/connection";
import { users, referralEvents, referralPoints, siteSettings } from "@db/schema";
import { eq, and, lt, sql } from "drizzle-orm";
import { sendReferralPointsNotification } from "./notifications";

const ALLOCATION_DELAY_HOURS = 24;

async function getProgramConfig(db: ReturnType<typeof getDb>) {
  const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, "referralProgram")).limit(1);
  const defaults = { referrerAmount: 100, referredAmount: 100, pointsExpireDays: 90, terms: "Referral credits valid for 90 days. One credit per referred user." };
  if (rows.length === 0) return defaults;
  try { return { ...defaults, ...JSON.parse(rows[0].value) }; }
  catch { return defaults; }
}

export async function markRideCompleted(referredUserId: number, qualifyingBookingId: number): Promise<void> {
  const db = getDb();
  const [event] = await db.select().from(referralEvents)
    .where(and(eq(referralEvents.referredUserId, referredUserId), eq(referralEvents.status, "pending")))
    .limit(1);
  if (!event) return;
  await db.update(referralEvents).set({
    status: "ride_completed",
    qualifyingBookingId,
    rideCompletedAt: new Date(),
  }).where(eq(referralEvents.id, event.id));
}

export async function autoAllocateReferralPoints(): Promise<number> {
  const db = getDb();
  const cutoff = new Date(Date.now() - ALLOCATION_DELAY_HOURS * 60 * 60 * 1000);
  const config = await getProgramConfig(db);

  const dueEvents = await db.select().from(referralEvents)
    .where(and(
      eq(referralEvents.status, "ride_completed"),
      lt(referralEvents.rideCompletedAt, cutoff),
    ));

  let allocated = 0;

  for (const event of dueEvents) {
    const expiresAt = new Date(Date.now() + config.pointsExpireDays * 24 * 60 * 60 * 1000);

    await db.insert(referralPoints).values([
      { userId: event.referrerId, amount: config.referrerAmount, referralEventId: event.id, status: "active", expiresAt },
      { userId: event.referredUserId, amount: config.referredAmount, referralEventId: event.id, status: "active", expiresAt },
    ]);

    await db.update(referralEvents).set({ status: "points_allocated", pointsAllocatedAt: new Date() })
      .where(eq(referralEvents.id, event.id));

    // Milestone bonus: every 10th successful referral earns extra ₹200
    const [milestone] = await db.select({ count: sql<number>`count(*)` }).from(referralEvents)
      .where(and(eq(referralEvents.referrerId, event.referrerId), eq(referralEvents.status, "points_allocated")));
    const total = milestone?.count ?? 0;
    if (total % 10 === 0 && total > 0) {
      await db.insert(referralPoints).values({
        userId: event.referrerId, amount: 200, referralEventId: event.id, status: "active", expiresAt,
      });
    }

    const [referrer] = await db.select({ name: users.name, email: users.email, phone: users.phone }).from(users).where(eq(users.id, event.referrerId)).limit(1);
    const [referred] = await db.select({ name: users.name, email: users.email, phone: users.phone }).from(users).where(eq(users.id, event.referredUserId)).limit(1);

    if (referrer && referred) {
      sendReferralPointsNotification({
        referrerName: referrer.name ?? "there",
        referrerEmail: referrer.email ?? undefined,
        referrerPhone: referrer.phone ?? undefined,
        referredName: referred.name ?? "your friend",
        referredEmail: referred.email ?? undefined,
        referredPhone: referred.phone ?? undefined,
        amount: config.referrerAmount,
        expiresAt,
        terms: config.terms,
      }).catch(console.error);
    }

    allocated++;
  }

  return allocated;
}
