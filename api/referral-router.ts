import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users, referralEvents, referralPoints, bookings, siteSettings } from "@db/schema";
import { eq, and, sql, desc, lt, isNull } from "drizzle-orm";
import { sendReferralJoinNotification, sendReferralPointsNotification } from "./lib/notifications";

const POINTS_AMOUNT = 200;
const POINTS_EXPIRY_DAYS = 90;
const ALLOCATION_DELAY_HOURS = 24;

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "EO";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function defaultProgramConfig() {
  return {
    enabled: true,
    referrerAmount: POINTS_AMOUNT,
    referredAmount: POINTS_AMOUNT,
    pointsExpireDays: POINTS_EXPIRY_DAYS,
    headline: "Give ₹200. Get ₹200.",
    subheadline: "Invite friends to EasyOutstation. When they complete their first ride, you both earn ₹200 travel credit.",
    description: "Share your unique referral link with anyone planning an outstation trip from Delhi. When they book and complete their first ride with EasyOutstation, you each receive ₹200 in travel credit — automatically credited within 24 hours of trip completion.",
    howItWorks: [
      "Copy your unique referral link from your dashboard",
      "Share it with friends, family, or travel groups",
      "When they complete their first ride, you both earn ₹200 credit"
    ],
    terms: "Terms & Conditions: (1) Referral credits of ₹200 are valid for 90 days from date of credit. (2) Credits are added within 24 hours of the referred friend's first completed ride. (3) No credits are issued for cancelled or refunded trips. (4) Credits cannot be transferred, encashed, or combined with other promotional offers. (5) One referral credit per referred user. Unlimited referrals allowed. (6) EasyOutstation reserves the right to withhold or cancel credits in cases of suspected fraudulent activity. (7) EasyOutstation may modify or discontinue the referral program at any time with prior notice.",
  };
}

async function getProgramConfig(db: ReturnType<typeof getDb>) {
  const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, "referralProgram")).limit(1);
  if (rows.length === 0) return defaultProgramConfig();
  try { return { ...defaultProgramConfig(), ...JSON.parse(rows[0].value) }; }
  catch { return defaultProgramConfig(); }
}

export const referralRouter = createRouter({
  getProgram: publicQuery.query(async () => {
    const db = getDb();
    return getProgramConfig(db);
  }),

  getMyCode: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [user] = await db.select({ referralCode: users.referralCode }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
    if (user?.referralCode) return { code: user.referralCode };

    let code: string;
    let attempts = 0;
    do {
      code = generateCode();
      const existing = await db.select({ id: users.id }).from(users).where(eq(users.referralCode, code)).limit(1);
      if (existing.length === 0) break;
      attempts++;
    } while (attempts < 10);

    await db.update(users).set({ referralCode: code! }).where(eq(users.id, ctx.user.id));
    return { code: code! };
  }),

  getMyStats: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id;

    const [user] = await db.select({ referralCode: users.referralCode, name: users.name }).from(users).where(eq(users.id, userId)).limit(1);

    const referrals = await db
      .select({
        id: referralEvents.id,
        status: referralEvents.status,
        rideCompletedAt: referralEvents.rideCompletedAt,
        pointsAllocatedAt: referralEvents.pointsAllocatedAt,
        createdAt: referralEvents.createdAt,
        referredName: users.name,
        referredPhone: users.phone,
      })
      .from(referralEvents)
      .leftJoin(users, eq(referralEvents.referredUserId, users.id))
      .where(eq(referralEvents.referrerId, userId))
      .orderBy(desc(referralEvents.createdAt));

    const now = new Date();
    const points = await db
      .select()
      .from(referralPoints)
      .where(and(eq(referralPoints.userId, userId), eq(referralPoints.status, "active")))
      .orderBy(desc(referralPoints.createdAt));

    const activePoints = points.filter(p => new Date(p.expiresAt) > now);
    const expiredPoints = points.filter(p => new Date(p.expiresAt) <= now);

    // Auto-expire stale active points
    if (expiredPoints.length > 0) {
      const expiredIds = expiredPoints.map(p => p.id);
      for (const id of expiredIds) {
        await db.update(referralPoints).set({ status: "expired" }).where(eq(referralPoints.id, id));
      }
    }

    const balance = activePoints.reduce((sum, p) => sum + p.amount, 0);

    const allPoints = await db
      .select()
      .from(referralPoints)
      .where(eq(referralPoints.userId, userId))
      .orderBy(desc(referralPoints.createdAt))
      .limit(20);

    return {
      code: user?.referralCode ?? null,
      referrals: referrals.map(r => ({
        id: r.id,
        status: r.status,
        referredName: r.referredName ? r.referredName.split(" ")[0] + " ***" : "Friend",
        joinedAt: r.createdAt,
        rideCompletedAt: r.rideCompletedAt,
        pointsAllocatedAt: r.pointsAllocatedAt,
      })),
      balance,
      pointsHistory: allPoints,
    };
  }),

  applyReferralCode: authedQuery
    .input(z.object({ code: z.string().min(6).max(20) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;
      const code = input.code.trim().toUpperCase();

      // Check not already referred
      const [existing] = await db.select({ id: referralEvents.id }).from(referralEvents).where(eq(referralEvents.referredUserId, userId)).limit(1);
      if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "You have already used a referral code." });

      // Find referrer by code
      const [referrer] = await db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone }).from(users).where(eq(users.referralCode, code)).limit(1);
      if (!referrer) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid referral code. Please check and try again." });
      if (referrer.id === userId) throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot use your own referral code." });

      // Check program is enabled
      const config = await getProgramConfig(db);
      if (!config.enabled) throw new TRPCError({ code: "BAD_REQUEST", message: "The referral program is not currently active." });

      // Create referral event
      await db.insert(referralEvents).values({ referrerId: referrer.id, referredUserId: userId, status: "pending" });

      // Store referredBy on the user
      await db.update(users).set({ referredBy: referrer.id }).where(eq(users.id, userId));

      // Notify referrer
      const [referredUser] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
      sendReferralJoinNotification({
        referrerName: referrer.name ?? "there",
        referrerEmail: referrer.email ?? undefined,
        referrerPhone: referrer.phone ?? undefined,
        referredName: referredUser?.name ?? "Someone",
      }).catch(console.error);

      return { success: true, referrerName: referrer.name };
    }),

  processCompletedRide: authedQuery
    .input(z.object({ bookingId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      // Find referral event for this user
      const [event] = await db.select().from(referralEvents)
        .where(and(eq(referralEvents.referredUserId, userId), eq(referralEvents.status, "pending")))
        .limit(1);

      if (!event) return { updated: false };

      // Verify this is their first completed booking
      const completedCount = await db.select({ count: sql<number>`count(*)` }).from(bookings)
        .where(and(eq(bookings.userId, userId), eq(bookings.status, "completed")));
      if ((completedCount[0]?.count ?? 0) > 1) return { updated: false };

      await db.update(referralEvents).set({
        status: "ride_completed",
        qualifyingBookingId: input.bookingId,
        rideCompletedAt: new Date(),
      }).where(eq(referralEvents.id, event.id));

      return { updated: true };
    }),

  allocateDuePoints: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id;
    const user = ctx.user;

    if (user.role !== "admin" && user.role !== "super_admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const cutoff = new Date(Date.now() - ALLOCATION_DELAY_HOURS * 60 * 60 * 1000);

    const dueEvents = await db.select().from(referralEvents)
      .where(and(
        eq(referralEvents.status, "ride_completed"),
        lt(referralEvents.rideCompletedAt, cutoff),
      ));

    const config = await getProgramConfig(db);
    let allocated = 0;

    for (const event of dueEvents) {
      const expiresAt = new Date(Date.now() + config.pointsExpireDays * 24 * 60 * 60 * 1000);

      await db.insert(referralPoints).values([
        { userId: event.referrerId, amount: config.referrerAmount, referralEventId: event.id, status: "active", expiresAt },
        { userId: event.referredUserId, amount: config.referredAmount, referralEventId: event.id, status: "active", expiresAt },
      ]);

      await db.update(referralEvents).set({ status: "points_allocated", pointsAllocatedAt: new Date() })
        .where(eq(referralEvents.id, event.id));

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

    return { allocated };
  }),
});
