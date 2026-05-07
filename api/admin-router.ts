import { z } from "zod";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users, bookings } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";

export const adminRouter = createRouter({
  getStats: adminQuery.query(async () => {
    const db = getDb();
    const [pending, confirmed, completed, cancelled, totalRevenue, paidRevenue] = await Promise.all([
      db.select({ n: sql<number>`COUNT(*)` }).from(bookings).where(eq(bookings.status, "pending")),
      db.select({ n: sql<number>`COUNT(*)` }).from(bookings).where(eq(bookings.status, "confirmed")),
      db.select({ n: sql<number>`COUNT(*)` }).from(bookings).where(eq(bookings.status, "completed")),
      db.select({ n: sql<number>`COUNT(*)` }).from(bookings).where(eq(bookings.status, "cancelled")),
      db.select({ v: sql<string>`COALESCE(SUM(totalPrice),0)` }).from(bookings),
      db.select({ v: sql<string>`COALESCE(SUM(totalPrice),0)` }).from(bookings).where(eq(bookings.paymentStatus, "paid")),
    ]);
    const customerCount = await db.select({ n: sql<number>`COUNT(*)` }).from(users);
    return {
      pending: Number(pending[0]?.n ?? 0),
      confirmed: Number(confirmed[0]?.n ?? 0),
      completed: Number(completed[0]?.n ?? 0),
      cancelled: Number(cancelled[0]?.n ?? 0),
      totalRevenue: parseFloat(totalRevenue[0]?.v ?? "0"),
      paidRevenue: parseFloat(paidRevenue[0]?.v ?? "0"),
      customers: Number(customerCount[0]?.n ?? 0),
    };
  }),

  getBookings: adminQuery
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const where = input?.status && input.status !== "all"
        ? eq(bookings.status, input.status as "pending" | "confirmed" | "completed" | "cancelled")
        : undefined;
      return await db.query.bookings.findMany({
        where,
        orderBy: [desc(bookings.createdAt)],
        with: { car: true },
      });
    }),

  updateStatus: adminQuery
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(bookings).set({ status: input.status }).where(eq(bookings.id, input.id));
      return { success: true };
    }),

  updatePayment: adminQuery
    .input(z.object({
      id: z.number(),
      paymentStatus: z.enum(["pending", "paid", "refunded"]),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(bookings).set({ paymentStatus: input.paymentStatus }).where(eq(bookings.id, input.id));
      return { success: true };
    }),

  assignDriver: adminQuery
    .input(z.object({
      id: z.number(),
      driverName: z.string().min(1),
      driverPhone: z.string().min(10),
      confirmBooking: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const updates: Record<string, unknown> = {
        driverName: input.driverName,
        driverPhone: input.driverPhone,
      };
      if (input.confirmBooking) updates.status = "confirmed";
      await db.update(bookings).set(updates as any).where(eq(bookings.id, input.id));
      return { success: true };
    }),

  addNote: adminQuery
    .input(z.object({ id: z.number(), note: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(bookings).set({ adminNotes: input.note } as any).where(eq(bookings.id, input.id));
      return { success: true };
    }),

  getCustomers: adminQuery.query(async () => {
    const db = getDb();
    return await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        createdAt: users.createdAt,
        lastSignInAt: users.lastSignInAt,
        bookingCount: sql<number>`COUNT(${bookings.id})`,
      })
      .from(users)
      .leftJoin(bookings, eq(bookings.userId, users.id))
      .groupBy(users.id)
      .orderBy(desc(users.createdAt));
  }),

  setUserRole: adminQuery
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      return { success: true };
    }),
});
