import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users, bookings, corporateAccounts } from "@db/schema";
import { eq, desc, sql, and, gte, lt, sum, count } from "drizzle-orm";
import { nanoid } from "nanoid";

function generateJoinCode(): string {
  return nanoid(8).toUpperCase().replace(/[^A-Z0-9]/g, "X").slice(0, 8);
}

function formatINR(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export const corporateRouter = createRouter({
  // ── Get current user's corporate account ───────────────────────────────
  getMyAccount: authedQuery
    .query(async ({ ctx }) => {
      const db = getDb();
      const [me] = await db.select({ corporateAccountId: sql<number | null>`corporateAccountId`, corporateRole: sql<string | null>`corporateRole` })
        .from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (!me?.corporateAccountId) return null;
      const [account] = await db.select().from(corporateAccounts).where(eq(corporateAccounts.id, me.corporateAccountId)).limit(1);
      if (!account) return null;
      const memberRows = await db.select({ id: users.id, name: users.name, phone: users.phone, email: users.email, corporateRole: sql<string>`corporateRole` })
        .from(users).where(sql`corporateAccountId = ${me.corporateAccountId}`);
      return { account, myRole: me.corporateRole ?? "member", members: memberRows };
    }),

  // ── Register a new corporate account ──────────────────────────────────
  registerAccount: authedQuery
    .input(z.object({
      companyName: z.string().min(2),
      gstin: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().length(10).optional(),
      address: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      // Check user isn't already linked
      const [me] = await db.select({ corporateAccountId: sql<number | null>`corporateAccountId` })
        .from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (me?.corporateAccountId) throw new TRPCError({ code: "BAD_REQUEST", message: "You are already linked to a corporate account." });

      const joinCode = generateJoinCode();
      const [{ insertId }] = await db.insert(corporateAccounts).values({
        companyName: input.companyName,
        gstin: input.gstin ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        address: input.address ?? null,
        joinCode,
        status: "pending",
        adminUserId: ctx.user.id,
      });
      await db.execute(sql.raw(`UPDATE users SET corporateAccountId = ${insertId}, corporateRole = 'admin' WHERE id = ${ctx.user.id}`));
      return { success: true, joinCode, accountId: insertId };
    }),

  // ── Join an existing account via join code ─────────────────────────────
  joinAccount: authedQuery
    .input(z.object({ joinCode: z.string().min(4) }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [me] = await db.select({ corporateAccountId: sql<number | null>`corporateAccountId` })
        .from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (me?.corporateAccountId) throw new TRPCError({ code: "BAD_REQUEST", message: "You are already linked to a corporate account." });
      const [account] = await db.select().from(corporateAccounts)
        .where(and(eq(corporateAccounts.joinCode, input.joinCode.toUpperCase()), eq(corporateAccounts.status, "active")))
        .limit(1);
      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid join code or account is not active." });
      await db.execute(sql.raw(`UPDATE users SET corporateAccountId = ${account.id}, corporateRole = 'member' WHERE id = ${ctx.user.id}`));
      return { success: true, companyName: account.companyName };
    }),

  // ── Leave the corporate account ────────────────────────────────────────
  leaveAccount: authedQuery
    .mutation(async ({ ctx }) => {
      const db = getDb();
      await db.execute(sql.raw(`UPDATE users SET corporateAccountId = NULL, corporateRole = NULL WHERE id = ${ctx.user.id}`));
      return { success: true };
    }),

  // ── Get all company trips ──────────────────────────────────────────────
  getTrips: authedQuery
    .input(z.object({ month: z.string().optional() })) // "2026-05" format
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const [me] = await db.select({ corporateAccountId: sql<number | null>`corporateAccountId` })
        .from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (!me?.corporateAccountId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const accountId = me.corporateAccountId;

      let query = db.select({
        id: bookings.id,
        fromCity: bookings.fromCity,
        toCity: bookings.toCity,
        pickupDate: bookings.pickupDate,
        totalKm: bookings.totalKm,
        totalPrice: bookings.totalPrice,
        status: bookings.status,
        customerName: bookings.customerName,
        driverName: bookings.driverName,
        tripType: bookings.tripType,
        createdAt: bookings.createdAt,
        bookedByName: users.name,
        bookedByPhone: users.phone,
      }).from(bookings)
        .innerJoin(users, eq(bookings.userId, users.id))
        .where(sql`users.corporateAccountId = ${accountId}`)
        .orderBy(desc(bookings.createdAt));

      if (input.month) {
        return (await query).filter(b => {
          const d = new Date(b.pickupDate ?? b.createdAt);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === input.month;
        });
      }
      return query;
    }),

  // ── Monthly statement summary ──────────────────────────────────────────
  getMonthlyStatement: authedQuery
    .query(async ({ ctx }) => {
      const db = getDb();
      const [me] = await db.select({ corporateAccountId: sql<number | null>`corporateAccountId` })
        .from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (!me?.corporateAccountId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const accountId = me.corporateAccountId;

      const trips = await db.select({
        pickupDate: bookings.pickupDate,
        totalPrice: bookings.totalPrice,
        status: bookings.status,
      }).from(bookings)
        .innerJoin(users, eq(bookings.userId, users.id))
        .where(and(sql`users.corporateAccountId = ${accountId}`, sql`${bookings.status} != 'cancelled'`));

      const byMonth: Record<string, { month: string; trips: number; spend: number; label: string }> = {};
      for (const t of trips) {
        const d = new Date(t.pickupDate ?? Date.now());
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!byMonth[key]) byMonth[key] = { month: key, trips: 0, spend: 0, label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }) };
        byMonth[key].trips++;
        byMonth[key].spend += Number(t.totalPrice);
      }
      return Object.values(byMonth).sort((a, b) => b.month.localeCompare(a.month));
    }),

  // ── Remove a member (corp admin only) ─────────────────────────────────
  removeMember: authedQuery
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [me] = await db.select({ corporateAccountId: sql<number | null>`corporateAccountId`, corporateRole: sql<string | null>`corporateRole` })
        .from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (me?.corporateRole !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only corporate admins can remove members." });
      if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot remove yourself." });
      // Confirm target is in same account
      const [target] = await db.select({ corporateAccountId: sql<number | null>`corporateAccountId` })
        .from(users).where(eq(users.id, input.userId)).limit(1);
      if (target?.corporateAccountId !== me?.corporateAccountId) throw new TRPCError({ code: "FORBIDDEN" });
      await db.execute(sql.raw(`UPDATE users SET corporateAccountId = NULL, corporateRole = NULL WHERE id = ${input.userId}`));
      return { success: true };
    }),
});
