import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, adminQuery, superAdminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users, bookings, drivers, expenses } from "@db/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";

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

// Strip country code, keep only 10-digit mobile number
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  if (digits.length === 10) return digits;
  return digits.length > 0 ? digits : null;
}

function waLink(phone: string, message: string) {
  const clean = normalizePhone(phone) ?? phone;
  return `https://wa.me/91${clean}?text=${encodeURIComponent(message)}`;
}

function formatDate(d: Date | string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// Fetch booking + fall back to user account for missing phone/email
async function getBookingWithContact(bookingId: number) {
  const db = getDb();
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: { car: true },
  });
  if (!booking) return null;

  let phone = normalizePhone(booking.customerPhone);
  let email = booking.customerEmail ?? null;

  // Fall back to user account if contact info missing from booking
  if ((!phone || !email) && booking.userId) {
    const userRows = await db.select({ phone: users.phone, email: users.email })
      .from(users).where(eq(users.id, booking.userId)).limit(1);
    const u = userRows[0];
    if (!phone && u?.phone) phone = normalizePhone(u.phone);
    if (!email && u?.email) email = u.email;
  }

  return { ...booking, resolvedPhone: phone, resolvedEmail: email };
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

      const booking = await getBookingWithContact(input.id);
      const date = formatDate(booking?.pickupDate ?? null);
      const route = `${booking?.fromCity} → ${booking?.toCity}`;
      const car = booking?.car?.name ?? "your booked car";
      const name = booking?.customerName ?? "Customer";

      const emailBody = `Dear ${name},

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

      let emailSent = false;
      if (booking?.resolvedEmail) {
        try {
          await sendEmail(booking.resolvedEmail, `Booking Confirmed #${input.id} — ${route} | EasyOutstation`, emailBody);
          emailSent = true;
        } catch (e) { console.error("Confirm email failed:", e); }
      }

      const waMsg = `Hello ${name}! 👋

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
        whatsappLink: booking?.resolvedPhone ? waLink(booking.resolvedPhone, waMsg) : null,
        customerPhone: booking?.resolvedPhone ?? null,
        emailSent,
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

      const booking = await getBookingWithContact(input.id);
      const date = formatDate(booking?.pickupDate ?? null);
      const route = `${booking?.fromCity} → ${booking?.toCity}`;
      const name = booking?.customerName ?? "Customer";

      const emailBody = `Dear ${name},

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

      let emailSent = false;
      if (booking?.resolvedEmail) {
        try {
          await sendEmail(booking.resolvedEmail, `Booking Cancelled #${input.id} — EasyOutstation`, emailBody);
          emailSent = true;
        } catch (e) { console.error("Cancel email failed:", e); }
      }

      const waMsg = `Hello ${name},

We regret to inform you that your EasyOutstation booking *#${input.id}* (${route} on ${date}) has been *cancelled*.${input.reason ? `\n\nReason: ${input.reason}` : ""}

We apologize for the inconvenience. Please contact us:
📞 +91-9958556011

Thank you for choosing EasyOutstation.`;

      return {
        success: true,
        whatsappLink: booking?.resolvedPhone ? waLink(booking.resolvedPhone, waMsg) : null,
        customerPhone: booking?.resolvedPhone ?? null,
        emailSent,
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

  // Only super_admin can change roles
  setUserRole: superAdminQuery
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin", "super_admin"]) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(users).set({ role: input.role as any }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  // ── Financial Analytics (super_admin only) ────────────────────────────
  getFinancials: superAdminQuery.query(async () => {
    const db = getDb();

    // Overall revenue totals
    const [totalsRow] = await db.select({
      grossRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${bookings.status} != 'cancelled' THEN ${bookings.totalPrice} ELSE 0 END),0)`,
      collected: sql<string>`COALESCE(SUM(CASE WHEN ${bookings.paymentStatus} = 'paid' THEN ${bookings.totalPrice} ELSE 0 END),0)`,
      outstanding: sql<string>`COALESCE(SUM(CASE WHEN ${bookings.status} IN ('pending','confirmed') AND ${bookings.paymentStatus} != 'paid' THEN ${bookings.totalPrice} ELSE 0 END),0)`,
      lostRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${bookings.status} = 'cancelled' THEN ${bookings.totalPrice} ELSE 0 END),0)`,
      totalBookings: sql<number>`COUNT(CASE WHEN ${bookings.status} != 'cancelled' THEN 1 END)`,
    }).from(bookings);

    // Monthly trend — last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthly = await db.select({
      month: sql<string>`DATE_FORMAT(${bookings.createdAt}, '%Y-%m')`,
      label: sql<string>`DATE_FORMAT(${bookings.createdAt}, '%b %Y')`,
      bookingCount: sql<number>`COUNT(*)`,
      revenue: sql<string>`COALESCE(SUM(${bookings.totalPrice}),0)`,
      collected: sql<string>`COALESCE(SUM(CASE WHEN ${bookings.paymentStatus}='paid' THEN ${bookings.totalPrice} ELSE 0 END),0)`,
    }).from(bookings)
      .where(and(sql`${bookings.status} != 'cancelled'`, gte(bookings.createdAt, sixMonthsAgo)))
      .groupBy(sql`DATE_FORMAT(${bookings.createdAt}, '%Y-%m')`, sql`DATE_FORMAT(${bookings.createdAt}, '%b %Y')`)
      .orderBy(sql`DATE_FORMAT(${bookings.createdAt}, '%Y-%m') ASC`);

    // Revenue by route
    const byRoute = await db.select({
      fromCity: bookings.fromCity,
      toCity: bookings.toCity,
      trips: sql<number>`COUNT(*)`,
      revenue: sql<string>`COALESCE(SUM(${bookings.totalPrice}),0)`,
      avgFare: sql<string>`COALESCE(AVG(${bookings.totalPrice}),0)`,
    }).from(bookings)
      .where(sql`${bookings.status} != 'cancelled'`)
      .groupBy(bookings.fromCity, bookings.toCity)
      .orderBy(sql`SUM(${bookings.totalPrice}) DESC`)
      .limit(15);

    // Driver performance
    const byDriver = await db.select({
      driverName: sql<string>`${bookings.driverName}`,
      trips: sql<number>`COUNT(*)`,
      revenue: sql<string>`COALESCE(SUM(${bookings.totalPrice}),0)`,
    }).from(bookings)
      .where(sql`${bookings.status} IN ('confirmed','completed') AND ${bookings.driverName} IS NOT NULL AND ${bookings.driverName} != ''`)
      .groupBy(sql`${bookings.driverName}`)
      .orderBy(sql`SUM(${bookings.totalPrice}) DESC`);

    // Top customers
    const topCustomers = await db.select({
      customerName: bookings.customerName,
      customerPhone: bookings.customerPhone,
      trips: sql<number>`COUNT(*)`,
      totalSpend: sql<string>`COALESCE(SUM(${bookings.totalPrice}),0)`,
    }).from(bookings)
      .where(sql`${bookings.status} != 'cancelled'`)
      .groupBy(bookings.customerName, bookings.customerPhone)
      .orderBy(sql`SUM(${bookings.totalPrice}) DESC`)
      .limit(10);

    // Expenses
    const [expTotals] = await db.select({
      total: sql<string>`COALESCE(SUM(${expenses.amount}),0)`,
    }).from(expenses);

    const byExpenseCategory = await db.select({
      category: expenses.category,
      total: sql<string>`COALESCE(SUM(${expenses.amount}),0)`,
      count: sql<number>`COUNT(*)`,
    }).from(expenses)
      .groupBy(expenses.category)
      .orderBy(sql`SUM(${expenses.amount}) DESC`);

    const collected = parseFloat(totalsRow?.collected ?? "0");
    const totalExpenses = parseFloat(expTotals?.total ?? "0");

    return {
      totals: {
        grossRevenue: parseFloat(totalsRow?.grossRevenue ?? "0"),
        collected,
        outstanding: parseFloat(totalsRow?.outstanding ?? "0"),
        lostRevenue: parseFloat(totalsRow?.lostRevenue ?? "0"),
        totalBookings: Number(totalsRow?.totalBookings ?? 0),
        totalExpenses,
        profit: collected - totalExpenses,
      },
      monthly,
      byRoute,
      byDriver,
      topCustomers,
      byExpenseCategory,
    };
  }),

  // ── Expenses CRUD (super_admin only) ──────────────────────────────────
  getExpenses: superAdminQuery.query(async () => {
    const db = getDb();
    return await db.select().from(expenses).orderBy(desc(expenses.date), desc(expenses.createdAt)).limit(100);
  }),

  addExpense: superAdminQuery
    .input(z.object({
      category: z.string().min(1),
      description: z.string().optional(),
      amount: z.number().positive(),
      date: z.string(), // ISO date string
      bookingId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(expenses).values({
        category: input.category,
        description: input.description,
        amount: input.amount.toString(),
        date: new Date(input.date),
        bookingId: input.bookingId,
      });
      return { success: true };
    }),

  deleteExpense: superAdminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(expenses).where(eq(expenses.id, input.id));
      return { success: true };
    }),
});
