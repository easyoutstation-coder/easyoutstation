import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users, bookings, drivers } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";

const MASTER_PHONES = ["9958556011"];
const MASTER_EMAILS = ["parmindersinghtalwar@gmail.com"];

function isMaster(user: { phone?: string | null; email?: string | null }) {
  return MASTER_PHONES.includes(user.phone ?? "") || MASTER_EMAILS.includes(user.email ?? "");
}

async function sendEmail(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ from: "EasyOutstation <bookings@easyoutstation.com>", to: [to], subject, text }),
  });
}

function waLink(phone: string, message: string) {
  return `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
}

function formatDate(d: Date | string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export const adminRouter = createRouter({
  // ── Stats ─────────────────────────────────────────────────────────────
  getStats: adminQuery.query(async () => {
    const db = getDb();
    const [pending, confirmed, completed, cancelled, totalRevenue, paidRevenue, customerCount] = await Promise.all([
      db.select({ n: sql<number>`COUNT(*)` }).from(bookings).where(eq(bookings.status, "pending")),
      db.select({ n: sql<number>`COUNT(*)` }).from(bookings).where(eq(bookings.status, "confirmed")),
      db.select({ n: sql<number>`COUNT(*)` }).from(bookings).where(eq(bookings.status, "completed")),
      db.select({ n: sql<number>`COUNT(*)` }).from(bookings).where(eq(bookings.status, "cancelled")),
      db.select({ v: sql<string>`COALESCE(SUM(totalPrice),0)` }).from(bookings),
      db.select({ v: sql<string>`COALESCE(SUM(totalPrice),0)` }).from(bookings).where(eq(bookings.paymentStatus, "paid")),
      db.select({ n: sql<number>`COUNT(*)` }).from(users),
    ]);
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

  // ── Bookings ──────────────────────────────────────────────────────────
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

  // Confirm booking with driver → sends email → returns WhatsApp link
  confirmBooking: adminQuery
    .input(z.object({
      id: z.number(),
      driverName: z.string().min(1),
      driverPhone: z.string().min(10),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(bookings).set({
        status: "confirmed",
        driverName: input.driverName,
        driverPhone: input.driverPhone,
      } as any).where(eq(bookings.id, input.id));

      const booking = await db.query.bookings.findFirst({
        where: eq(bookings.id, input.id),
        with: { car: true },
      });

      const date = formatDate(booking?.pickupDate ?? null);
      const route = `${booking?.fromCity} → ${booking?.toCity}`;
      const car = booking?.car?.name ?? "your booked car";

      const emailBody = `Dear ${booking?.customerName},

Your EasyOutstation booking is CONFIRMED! 🎉

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BOOKING CONFIRMED — #${input.id}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Route        : ${route}
Pickup Date  : ${date}
Car          : ${car}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR DRIVER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name         : ${input.driverName}
Mobile       : +91-${input.driverPhone}
(Driver will call you 1 hour before pickup)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${booking?.pickupAddress ? `Pickup Address: ${booking.pickupAddress}\n` : ""}
Need help? Call: +91-9958556011
Email: easyoutstation@gmail.com

Have a safe and comfortable journey!
Team EasyOutstation`;

      if (booking?.customerEmail) {
        try { await sendEmail(booking.customerEmail, `Booking Confirmed #${input.id} — ${route} | EasyOutstation`, emailBody); }
        catch (e) { console.error("Email failed:", e); }
      }

      const waMsg = `Hello ${booking?.customerName}! 👋

Your EasyOutstation booking is *CONFIRMED* ✅

📍 Route: *${route}*
📅 Date: *${date}*
🚗 Car: ${car}
👨‍✈️ Driver: *${input.driverName}*
📱 Driver Mobile: *+91-${input.driverPhone}*

Your driver will call you 1 hour before pickup.

Questions? Call us: +91-9958556011

Have a wonderful journey! 🌟`;

      return {
        success: true,
        whatsappLink: booking?.customerPhone ? waLink(booking.customerPhone, waMsg) : null,
        customerPhone: booking?.customerPhone ?? null,
        emailSent: !!booking?.customerEmail,
      };
    }),

  // Cancel booking → sends email → returns WhatsApp link
  cancelBooking: adminQuery
    .input(z.object({
      id: z.number(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(bookings).set({ status: "cancelled" }).where(eq(bookings.id, input.id));

      const booking = await db.query.bookings.findFirst({ where: eq(bookings.id, input.id) });
      const date = formatDate(booking?.pickupDate ?? null);
      const route = `${booking?.fromCity} → ${booking?.toCity}`;

      const emailBody = `Dear ${booking?.customerName},

We're sorry to inform you that your booking has been cancelled.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BOOKING CANCELLED — #${input.id}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Route        : ${route}
Date         : ${date}
${input.reason ? `Reason       : ${input.reason}` : ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

We apologize for the inconvenience. To rebook or for any queries:
📞 Call/WhatsApp: +91-9958556011
✉ Email: easyoutstation@gmail.com
🌐 Website: easyoutstation.com

Thank you for choosing EasyOutstation.
Team EasyOutstation`;

      if (booking?.customerEmail) {
        try { await sendEmail(booking.customerEmail, `Booking Cancelled #${input.id} — EasyOutstation`, emailBody); }
        catch (e) { console.error("Email failed:", e); }
      }

      const waMsg = `Hello ${booking?.customerName},

We regret to inform you that your EasyOutstation booking *#${input.id}* (${route} on ${date}) has been *cancelled*.${input.reason ? `\n\nReason: ${input.reason}` : ""}

We apologize for the inconvenience. Please contact us:
📞 +91-9958556011

Thank you for choosing EasyOutstation.`;

      return {
        success: true,
        whatsappLink: booking?.customerPhone ? waLink(booking.customerPhone, waMsg) : null,
        customerPhone: booking?.customerPhone ?? null,
        emailSent: !!booking?.customerEmail,
      };
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

  addNote: adminQuery
    .input(z.object({ id: z.number(), note: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(bookings).set({ adminNotes: input.note } as any).where(eq(bookings.id, input.id));
      return { success: true };
    }),

  // ── Drivers ───────────────────────────────────────────────────────────
  getDrivers: adminQuery.query(async () => {
    const db = getDb();
    return await db.query.drivers.findMany({
      where: eq(drivers.isActive, true),
      orderBy: [drivers.name],
    });
  }),

  addDriver: adminQuery
    .input(z.object({
      name: z.string().min(1),
      phone: z.string().min(10),
      vehicleInfo: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(drivers).values({
        name: input.name,
        phone: input.phone,
        vehicleInfo: input.vehicleInfo,
        isActive: true,
      });
      return { success: true };
    }),

  updateDriver: adminQuery
    .input(z.object({
      id: z.number(),
      name: z.string().min(1),
      phone: z.string().min(10),
      vehicleInfo: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(drivers).set({
        name: input.name,
        phone: input.phone,
        vehicleInfo: input.vehicleInfo ?? null,
      }).where(eq(drivers.id, input.id));
      return { success: true };
    }),

  removeDriver: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(drivers).set({ isActive: false }).where(eq(drivers.id, input.id));
      return { success: true };
    }),

  // ── Customers ─────────────────────────────────────────────────────────
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

  // Only master admin can change roles
  setUserRole: adminQuery
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
    .mutation(async ({ input, ctx }) => {
      if (!isMaster(ctx.user)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the master admin can manage admin access." });
      }
      const db = getDb();
      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      return { success: true };
    }),
});
