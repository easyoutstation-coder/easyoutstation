import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, adminQuery, superAdminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users, bookings, drivers, vendors, expenses, siteSettings, faqs, routes, cars, userSearches, carReviews, referralEvents, referralPoints, corporateEnquiries, corporateAccounts, whatsappLogs, bookingEvents, bookingDrivers } from "@db/schema";
import { getRedis } from "./lib/redis";
import { eq, desc, sql, and, gte, lt, count, like } from "drizzle-orm";
import { defaultProgramConfig } from "./referral-router";
import { sendReferralPointsNotification, sendVendorTripAssignment, sendCorporateApprovalEmail, sendRefundNotification, sendBookingSms } from "./lib/notifications";
import { logBookingEvent } from "./lib/bookingEvents";
import { sendFcmNotification } from "./lib/fcm";
import { sendWhatsAppTextRaw, sendWhatsAppTemplateRaw, toWaPhone, dispatchWhatsApp } from "./lib/whatsapp";

// In-memory OTP store for data-clear verification (process-scoped, 10-min TTL)
const clearDataOtpStore = new Map<string, { otp: string; category: string; expiresAt: number }>();

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

async function sendSms(phone: string, message: string) {
  const apiKey = process.env.FAST2SMS_API_KEY?.trim();
  if (!apiKey) return;
  const number = phone.replace(/\D/g, "").slice(-10);
  if (number.length !== 10) return;
  const params = new URLSearchParams({ authorization: apiKey, route: "q", message, language: "english", flash: "0", numbers: number });
  await fetch(`https://www.fast2sms.com/dev/bulkV2?${params.toString()}`).catch(console.error);
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

  // Fall back to user account if contact info missing from booking; also fetch FCM token
  let fcmToken: string | null = null;
  if (booking.userId) {
    const userRows = await db.select({ phone: users.phone, email: users.email, fcmToken: users.fcmToken })
      .from(users).where(eq(users.id, booking.userId)).limit(1);
    const u = userRows[0];
    if (!phone && u?.phone) phone = normalizePhone(u.phone);
    if (!email && u?.email) email = u.email;
    fcmToken = u?.fcmToken ?? null;
  }

  return { ...booking, resolvedPhone: phone, resolvedEmail: email, fcmToken };
}

export const adminRouter = createRouter({
  // ── Stats ─────────────────────────────────────────────────────────────
  getStats: adminQuery.query(async () => {
    const db = getDb();
    const [pending, confirmed, driverAssigned, completed, cancelled, totalRevenue, paidRevenue, customerCount] = await Promise.all([
      db.select({ n: sql<number>`COUNT(*)` }).from(bookings).where(eq(bookings.status, "pending")),
      db.select({ n: sql<number>`COUNT(*)` }).from(bookings).where(eq(bookings.status, "confirmed")),
      db.select({ n: sql<number>`COUNT(*)` }).from(bookings).where(eq(bookings.status, "driver_assigned")),
      db.select({ n: sql<number>`COUNT(*)` }).from(bookings).where(eq(bookings.status, "completed")),
      db.select({ n: sql<number>`COUNT(*)` }).from(bookings).where(eq(bookings.status, "cancelled")),
      db.select({ v: sql<string>`COALESCE(SUM(totalPrice),0)` }).from(bookings),
      db.select({ v: sql<string>`COALESCE(SUM(totalPrice),0)` }).from(bookings).where(eq(bookings.paymentStatus, "paid")),
      db.select({ n: sql<number>`COUNT(*)` }).from(users),
    ]);
    return {
      pending: Number(pending[0]?.n ?? 0),
      confirmed: Number(confirmed[0]?.n ?? 0),
      driverAssigned: Number(driverAssigned[0]?.n ?? 0),
      completed: Number(completed[0]?.n ?? 0),
      cancelled: Number(cancelled[0]?.n ?? 0),
      totalRevenue: parseFloat(totalRevenue[0]?.v ?? "0"),
      paidRevenue: parseFloat(paidRevenue[0]?.v ?? "0"),
      customers: Number(customerCount[0]?.n ?? 0),
    };
  }),

  // ── Bookings ──────────────────────────────────────────────────────────
  getBookings: adminQuery
    .input(z.object({
      status: z.string().optional(),
      dateFilter: z.enum(["today", "tomorrow", "week"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions: any[] = [];
      if (input?.status && input.status !== "all") {
        conditions.push(eq(bookings.status, input.status as "pending" | "confirmed" | "driver_assigned" | "completed" | "cancelled"));
      }
      if (input?.dateFilter) {
        const now = new Date();
        const pad = (d: Date) => d.toISOString().slice(0, 10);
        const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
        const weekEnd = new Date(now); weekEnd.setDate(now.getDate() + 7);
        if (input.dateFilter === "today") conditions.push(sql`DATE(${bookings.pickupDate}) = ${pad(now)}`);
        else if (input.dateFilter === "tomorrow") conditions.push(sql`DATE(${bookings.pickupDate}) = ${pad(tomorrow)}`);
        else if (input.dateFilter === "week") conditions.push(sql`DATE(${bookings.pickupDate}) BETWEEN ${pad(now)} AND ${pad(weekEnd)}`);
      }
      const orderBy = input?.dateFilter ? [bookings.pickupDate] : [desc(bookings.createdAt)];
      return await db.query.bookings.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy,
        with: { car: true },
      });
    }),

  markComplete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(bookings).set({ status: "completed" }).where(eq(bookings.id, input.id));
      return { ok: true };
    }),

  // Confirm booking with driver → sends email → returns WhatsApp link
  confirmBooking: adminQuery
    .input(z.object({
      id: z.number(),
      vendorPhone: z.string().min(10),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // Check current status before update — if still pending (not Razorpay-paid),
      // we need to send the booking confirmation WhatsApp template ourselves.
      const [pre] = await db.select({ paymentStatus: bookings.paymentStatus, status: bookings.status })
        .from(bookings).where(eq(bookings.id, input.id)).limit(1);
      const needsConfirmationMsg = pre?.paymentStatus !== "paid";

      const PIN_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const tripPin = Array.from({ length: 6 }, () => PIN_CHARS[Math.floor(Math.random() * PIN_CHARS.length)]).join("");
      await db.update(bookings).set({
        status: "confirmed",
        tripPin,
      } as any).where(eq(bookings.id, input.id));

      const booking = await getBookingWithContact(input.id);
      const date = formatDate(booking?.pickupDate ?? null);
      const route = `${booking?.fromCity} → ${booking?.toCity}`;
      const car = booking?.car?.name ?? "your booked car";
      const name = booking?.customerName ?? "Customer";

      const emailBody = `Dear ${name},

Your EasyOutstation booking is CONFIRMED!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BOOKING CONFIRMED — #${input.id}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Route        : ${route}
Pickup Date  : ${date}
Car          : ${car}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${booking?.pickupAddress ? `Pickup Address: ${booking.pickupAddress}\n\n` : ""}We are assigning your driver and will send you their details shortly.

Need help? Call: +91-8796564111
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

      if (booking?.fcmToken) {
        sendFcmNotification(
          booking.fcmToken,
          "Booking Confirmed!",
          `Your ${route} trip on ${date} is confirmed. Driver details coming soon.`,
          { url: "/dashboard" }
        ).catch(() => {});
      }

      logBookingEvent(input.id, "booking_confirmed", { vendorPhone: input.vendorPhone, tripPin }).catch(() => {});

      // Notify vendor via WhatsApp to confirm driver — vendor's reply auto-updates DB and notifies customer
      if (booking) {
        sendVendorTripAssignment({
          vendorPhone: input.vendorPhone,
          bookingId: input.id,
          customerName: name,
          fromCity: booking.fromCity ?? "",
          toCity: booking.toCity ?? "",
          pickupDate: date,
          carName: booking.car?.name,
          totalKm: booking.totalKm,
          passengerCount: booking.passengerCount ?? undefined,
          pickupAddress: booking.pickupAddress ?? undefined,
          tripType: booking.tripType,
        }).catch(console.error);
      }

      // For non-Razorpay bookings (test / cash / manual), fire the eo_booking_confirmed
      // WhatsApp template since Razorpay webhook won't have done it.
      if (needsConfirmationMsg && booking?.resolvedPhone) {
        sendBookingSms(
          booking.resolvedPhone,
          input.id,
          booking.fromCity ?? "",
          booking.toCity ?? "",
          date,
          parseFloat(booking.totalPrice ?? "0"),
          "confirmation",
          undefined,
          undefined,
          booking.carId ?? undefined,
          booking.totalKm ?? undefined,
          name,
          booking.car?.name ?? undefined,
        ).catch(console.error);
      }

      return {
        success: true,
        vendorNotified: true,
        whatsappAutoSent: true,
        emailSent,
      };
    }),

  // Cancel booking → sends email + SMS + WhatsApp via API
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
📞 Call/WhatsApp: +91-8796564111
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

      if (booking?.fcmToken) {
        sendFcmNotification(
          booking.fcmToken,
          "Booking Cancelled",
          `Your booking from ${booking.fromCity} to ${booking.toCity} on ${date} has been cancelled.${input.reason ? ` Reason: ${input.reason}` : ""}`,
          { url: "/dashboard" }
        ).catch(() => {});
      }

      const waMsg = `Hello ${name},

We regret to inform you that your EasyOutstation booking *#${input.id}* (${route} on ${date}) has been *cancelled*.${input.reason ? `\n\nReason: ${input.reason}` : ""}

We apologize for the inconvenience. Please contact us:
📞 +91-8796564111

Thank you for choosing EasyOutstation.`;

      if (booking?.resolvedPhone) {
        // WhatsApp free-form (24hr window); SMS as unconditional fallback for cancellations
        sendWhatsAppTextRaw(toWaPhone(booking.resolvedPhone), waMsg).catch(() => {});
        sendSms(booking.resolvedPhone,
          `EasyOutstation: Booking #${input.id} (${route} on ${date}) cancelled.${input.reason ? ` Reason: ${input.reason}.` : ""} Help: 8796564111`
        ).catch(console.error);
      }

      logBookingEvent(input.id, "cancelled", { by: "admin", reason: input.reason }).catch(() => {});
      return {
        success: true,
        whatsappLink: null,
        whatsappAutoSent: !!booking?.resolvedPhone,
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

  assignDriverToVendor: adminQuery
    .input(z.object({ driverId: z.number(), vendorId: z.number().nullable() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(drivers).set({ vendorId: input.vendorId } as any).where(eq(drivers.id, input.driverId));
      return { success: true };
    }),

  // ── Vendors ───────────────────────────────────────────────────────────
  getVendors: adminQuery.query(async () => {
    const db = getDb();
    const vendorList = await db.select().from(vendors).where(eq(vendors.isActive, true)).orderBy(vendors.name);
    const driverList = await db.select({ id: drivers.id, name: drivers.name, phone: drivers.phone, vendorId: drivers.vendorId })
      .from(drivers).where(eq(drivers.isActive, true));
    return vendorList.map(v => ({
      ...v,
      drivers: driverList.filter(d => d.vendorId === v.id),
    }));
  }),

  addVendor: adminQuery
    .input(z.object({
      name: z.string().min(1),
      phone: z.string().min(10),
      email: z.string().optional(),
      company: z.string().optional(),
      city: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(vendors).values({ name: input.name, phone: input.phone, email: input.email, company: input.company, city: input.city, isActive: true });
      return { success: true };
    }),

  updateVendor: adminQuery
    .input(z.object({
      id: z.number(),
      name: z.string().min(1),
      phone: z.string().min(10),
      email: z.string().optional(),
      company: z.string().optional(),
      city: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(vendors).set({ name: input.name, phone: input.phone, email: input.email ?? null, company: input.company ?? null, city: input.city ?? null }).where(eq(vendors.id, input.id));
      return { success: true };
    }),

  removeVendor: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(vendors).set({ isActive: false }).where(eq(vendors.id, input.id));
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
        tag: users.tag,
        canManageContent: users.canManageContent,
        createdAt: users.createdAt,
        lastSignInAt: users.lastSignInAt,
        bookingCount: sql<number>`COUNT(${bookings.id})`,
      })
      .from(users)
      .leftJoin(bookings, eq(bookings.userId, users.id))
      .groupBy(users.id)
      .orderBy(desc(users.createdAt));
  }),

  getCustomerProfile: adminQuery
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!user) return null;
      const userBookings = await db.query.bookings.findMany({
        where: eq(bookings.userId, input.userId),
        orderBy: [desc(bookings.createdAt)],
        with: { car: true },
      });
      const totalSpend = userBookings
        .filter(b => b.paymentStatus === "paid")
        .reduce((sum, b) => sum + parseFloat(b.totalPrice.toString()), 0);
      const lastTrip = userBookings.find(b => b.status === "completed") ?? userBookings[0] ?? null;
      return { user, bookings: userBookings, totalSpend, lastTrip };
    }),

  setCustomerTag: adminQuery
    .input(z.object({ userId: z.number(), tag: z.enum(["normal", "vip", "blacklisted"]) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(users).set({ tag: input.tag } as any).where(eq(users.id, input.userId));
      return { success: true };
    }),

  // Only super_admin can change roles
  setUserRole: superAdminQuery
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin", "super_admin"]) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(users).set({ role: input.role as any }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  // Only super_admin can grant/revoke content management permission
  setContentPermission: superAdminQuery
    .input(z.object({ userId: z.number(), canManage: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(users).set({ canManageContent: input.canManage }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  setTestUser: superAdminQuery
    .input(z.object({ userId: z.number(), isTestUser: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(users).set({ isTestUser: input.isTestUser }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  // Grant or revoke role by email or phone (super admin only)
  grantAccessByContact: superAdminQuery
    .input(z.object({ contact: z.string().min(1), role: z.enum(["user", "admin", "super_admin"]) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const contact = input.contact.trim();
      const [u] = await db.select({ id: users.id, name: users.name })
        .from(users)
        .where(sql`${users.email} = ${contact} OR ${users.phone} = ${contact}`)
        .limit(1);
      if (!u) throw new TRPCError({ code: "NOT_FOUND", message: "No account found with that email or phone" });
      await db.update(users).set({ role: input.role as any }).where(eq(users.id, u.id));
      return { success: true, name: u.name };
    }),

  // Payments list — all paid bookings
  getPayments: superAdminQuery.query(async () => {
    const db = getDb();
    const rows = await db.select({
      id: bookings.id,
      customerName: bookings.customerName,
      customerEmail: bookings.customerEmail,
      customerPhone: bookings.customerPhone,
      fromCity: bookings.fromCity,
      toCity: bookings.toCity,
      totalPrice: bookings.totalPrice,
      paymentStatus: bookings.paymentStatus,
      razorpayPaymentId: bookings.razorpayPaymentId,
      createdAt: bookings.createdAt,
      userId: bookings.userId,
    })
      .from(bookings)
      .where(sql`${bookings.paymentStatus} IN ('paid','refunded')`)
      .orderBy(desc(bookings.createdAt));
    // Resolve email/phone from users for bookings missing contact info
    const userIds = [...new Set(rows.map(r => r.userId).filter(Boolean))];
    const userMap: Record<number, { phone: string | null; email: string | null }> = {};
    if (userIds.length > 0) {
      const uRows = await db.select({ id: users.id, phone: users.phone, email: users.email }).from(users).where(sql`id IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);
      uRows.forEach(u => { userMap[u.id] = { phone: u.phone, email: u.email }; });
    }
    return rows.map(r => ({
      ...r,
      totalPrice: r.totalPrice,
      resolvedEmail: r.customerEmail || userMap[r.userId]?.email || null,
      resolvedPhone: r.customerPhone || userMap[r.userId]?.phone || null,
    }));
  }),

  // Process refund — issue Razorpay refund, mark as refunded + send notifications
  processRefund: superAdminQuery
    .input(z.object({ bookingId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const booking = await db.query.bookings.findFirst({ where: eq(bookings.id, input.bookingId) });
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
      if (booking.paymentStatus !== "paid") throw new TRPCError({ code: "BAD_REQUEST", message: "Booking is not in paid status" });

      // Advance = 10% of total, minimum ₹100
      const totalPrice = parseFloat(booking.totalPrice);
      const refundRupees = Math.max(100, Math.round(totalPrice * 0.1));
      const refundPaise = refundRupees * 100;

      // Issue refund via Razorpay API (only when a payment ID exists)
      if (booking.razorpayPaymentId) {
        const rpKeyId = process.env.RAZORPAY_KEY_ID || "";
        const rpSecret = process.env.RAZORPAY_SECRET || process.env.RAZORPAY_KEY_SECRET || "";
        if (!rpKeyId || !rpSecret) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Razorpay not configured" });

        const auth = Buffer.from(`${rpKeyId}:${rpSecret}`).toString("base64");
        const refundRes = await fetch(`https://api.razorpay.com/v1/payments/${booking.razorpayPaymentId}/refund`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
          body: JSON.stringify({ amount: refundPaise }),
        });
        if (!refundRes.ok) {
          const err = await refundRes.json() as any;
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.error?.description || "Razorpay refund API failed" });
        }
        logBookingEvent(booking.id, "razorpay_refund_issued", { refundRupees }).catch(() => {});
      }

      await db.update(bookings).set({ paymentStatus: "refunded", status: "cancelled" }).where(eq(bookings.id, input.bookingId));

      // Resolve contact
      let phone = booking.customerPhone ?? null;
      let email = booking.customerEmail ?? null;
      if ((!phone || !email) && booking.userId) {
        const [u] = await db.select({ phone: users.phone, email: users.email }).from(users).where(eq(users.id, booking.userId)).limit(1);
        if (!phone) phone = u?.phone ?? null;
        if (!email) email = u?.email ?? null;
      }

      try {
        await sendRefundNotification({
          customerName: booking.customerName,
          customerPhone: phone ?? undefined,
          customerEmail: email ?? undefined,
          bookingId: booking.id,
          fromCity: booking.fromCity,
          toCity: booking.toCity,
          amount: refundRupees,
        });
      } catch (e) { console.error("[processRefund] Notification failed:", e); }

      return { success: true, refundRupees, razorpayPaymentId: booking.razorpayPaymentId ?? null };
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

  // ── Discount / Promotions ─────────────────────────────────────────────
  getDiscount: publicQuery.query(async () => {
    try {
      const db = getDb();
      const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, "discount")).limit(1);
      if (!rows[0]) return { enabled: false, type: "percentage" as const, value: 10, maxDiscount: null as number | null, verbiage: "10% off on your first ride!" };
      return JSON.parse(rows[0].value) as { enabled: boolean; type: "percentage" | "fixed"; value: number; maxDiscount: number | null; verbiage: string };
    } catch {
      return { enabled: false, type: "percentage" as const, value: 10, maxDiscount: null as number | null, verbiage: "10% off on your first ride!" };
    }
  }),

  setDiscount: superAdminQuery
    .input(z.object({
      enabled: z.boolean(),
      type: z.enum(["percentage", "fixed"]),
      value: z.number().min(0),
      maxDiscount: z.number().nullable(),
      verbiage: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.execute(sql`
        INSERT INTO siteSettings (\`key\`, value) VALUES ('discount', ${JSON.stringify(input)})
        ON DUPLICATE KEY UPDATE value = ${JSON.stringify(input)}
      `);
      return input;
    }),

  // ── Site on/off ────────────────────────────────────────────────────────
  getSiteStatus: publicQuery.query(async () => {
    try {
      const db = getDb();
      const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, "siteOnline")).limit(1);
      return { online: rows[0]?.value !== "false" };
    } catch {
      return { online: true }; // fail open — never accidentally take site down
    }
  }),

  setSiteStatus: superAdminQuery
    .input(z.object({ online: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.execute(sql`
        INSERT INTO siteSettings (\`key\`, value) VALUES ('siteOnline', ${input.online ? "true" : "false"})
        ON DUPLICATE KEY UPDATE value = ${input.online ? "true" : "false"}
      `);
      return { online: input.online };
    }),

  // ── FAQs ──────────────────────────────────────────────────────────────
  getPublicFaqs: publicQuery.query(async () => {
    const db = getDb();
    return await db.query.faqs.findMany({
      where: eq(faqs.isActive, true),
      orderBy: [faqs.position, faqs.id],
    });
  }),

  getFaqs: adminQuery.query(async () => {
    const db = getDb();
    return await db.query.faqs.findMany({ orderBy: [faqs.position, faqs.id] });
  }),

  addFaq: adminQuery
    .input(z.object({ question: z.string().min(1), answer: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(faqs).values({ question: input.question, answer: input.answer, isActive: true, position: 0 });
      return { success: true };
    }),

  updateFaq: adminQuery
    .input(z.object({ id: z.number(), question: z.string().min(1), answer: z.string().min(1), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(faqs).set({ question: input.question, answer: input.answer, isActive: input.isActive }).where(eq(faqs.id, input.id));
      return { success: true };
    }),

  deleteFaq: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(faqs).where(eq(faqs.id, input.id));
      return { success: true };
    }),

  // ── Routes CRUD ────────────────────────────────────────────────────────
  getAdminRoutes: adminQuery.query(async () => {
    const db = getDb();
    return await db.query.routes.findMany({ orderBy: [desc(routes.isPopular), routes.id] });
  }),

  addRoute: adminQuery
    .input(z.object({
      fromCity: z.string().min(1), toCity: z.string().min(1),
      distanceKm: z.number().positive(), durationHours: z.number().positive(),
      basePrice: z.number().positive(), isPopular: z.boolean().optional(), description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(routes).values({
        fromCity: input.fromCity, toCity: input.toCity,
        distanceKm: input.distanceKm, durationHours: input.durationHours,
        basePrice: input.basePrice.toString(), isPopular: input.isPopular ?? false,
        description: input.description,
      });
      return { success: true };
    }),

  updateRoute: adminQuery
    .input(z.object({
      id: z.number(), fromCity: z.string().min(1), toCity: z.string().min(1),
      distanceKm: z.number().positive(), durationHours: z.number().positive(),
      basePrice: z.number().positive(), isPopular: z.boolean().optional(), description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(routes).set({
        fromCity: input.fromCity, toCity: input.toCity,
        distanceKm: input.distanceKm, durationHours: input.durationHours,
        basePrice: input.basePrice.toString(), isPopular: input.isPopular ?? false,
        description: input.description ?? null,
      }).where(eq(routes.id, input.id));
      return { success: true };
    }),

  deleteRoute: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(routes).where(eq(routes.id, input.id));
      return { success: true };
    }),

  // ── Fleet CRUD ────────────────────────────────────────────────────────
  addCar: superAdminQuery
    .input(z.object({
      name: z.string().min(1),
      brand: z.string().min(1),
      model: z.string().min(1),
      category: z.enum(["sedan","muv","suv","premium","luxury","tempo","bus","electric"]),
      seats: z.number().int().positive(),
      pricePerKm: z.number().positive(),
      driverCharges: z.number().min(0),
      fuelType: z.enum(["petrol","diesel","cng","hybrid","electric"]),
      transmission: z.enum(["manual","automatic"]),
      description: z.string().optional(),
      imageUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(cars).values({
        name: input.name,
        brand: input.brand,
        model: input.model,
        category: input.category,
        seats: input.seats,
        pricePerKm: input.pricePerKm.toFixed(2),
        driverCharges: input.driverCharges.toFixed(2),
        fuelType: input.fuelType,
        transmission: input.transmission,
        description: input.description ?? null,
        imageUrl: input.imageUrl ?? null,
        isAvailable: true,
        isPopular: false,
      });
      return { success: true };
    }),

  deleteCar: superAdminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(cars).where(eq(cars.id, input.id));
      return { success: true };
    }),

  // ── Fleet pricing ─────────────────────────────────────────────────────
  getFleetPricing: superAdminQuery.query(async () => {
    const db = getDb();
    return await db
      .select({ id: cars.id, name: cars.name, category: cars.category, pricePerKm: cars.pricePerKm, driverCharges: cars.driverCharges })
      .from(cars)
      .orderBy(cars.id);
  }),

  updateCarPricing: superAdminQuery
    .input(z.object({
      id: z.number(),
      pricePerKm: z.number().positive(),
      driverCharges: z.number().min(0),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(cars)
        .set({ pricePerKm: input.pricePerKm.toFixed(2), driverCharges: input.driverCharges.toFixed(2) })
        .where(eq(cars.id, input.id));
      return { success: true };
    }),

  // ── Danger Zone: Send OTP for data-clear verification ──────────────────
  sendClearOtp: superAdminQuery
    .input(z.object({
      category: z.enum(["bookings", "expenses", "searches", "reviews", "all"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userRow = await db.select({ phone: users.phone }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
      const phone = normalizePhone(userRow[0]?.phone);
      if (!phone) throw new TRPCError({ code: "BAD_REQUEST", message: "No mobile number on your account." });

      const otp = String(Math.floor(100000 + Math.random() * 900000));
      clearDataOtpStore.set(ctx.user.id, { otp, category: input.category, expiresAt: Date.now() + 10 * 60 * 1000 });

      const categoryLabel: Record<string, string> = {
        bookings: "ALL BOOKINGS & revenue data",
        expenses: "ALL EXPENSE records",
        searches: "ALL search analytics",
        reviews: "ALL car reviews",
        all: "ALL data (bookings, expenses, analytics, reviews)",
      };
      const message = `EasyOutstation DANGER: Your OTP to permanently delete ${categoryLabel[input.category]} is ${otp}. Valid 10 mins. If you did NOT request this, call 9958556011 immediately.`;

      const apiKey = process.env.FAST2SMS_API_KEY?.trim();
      if (apiKey) {
        const params = new URLSearchParams({ authorization: apiKey, route: "q", message, language: "english", flash: "0", numbers: phone });
        await fetch(`https://www.fast2sms.com/dev/bulkV2?${params.toString()}`).catch(() => {});
      }

      const masked = `XXXXX${phone.slice(-3)}`;
      return { maskedPhone: masked };
    }),

  // ── Danger Zone: Verify OTP and delete selected data ───────────────────
  clearData: superAdminQuery
    .input(z.object({
      category: z.enum(["bookings", "expenses", "searches", "reviews", "all"]),
      otp: z.string().length(6),
    }))
    .mutation(async ({ ctx, input }) => {
      const entry = clearDataOtpStore.get(ctx.user.id);
      if (!entry) throw new TRPCError({ code: "BAD_REQUEST", message: "No OTP requested. Please request a new OTP first." });
      if (Date.now() > entry.expiresAt) {
        clearDataOtpStore.delete(ctx.user.id);
        throw new TRPCError({ code: "BAD_REQUEST", message: "OTP expired. Please request a new one." });
      }
      if (entry.otp !== input.otp) throw new TRPCError({ code: "BAD_REQUEST", message: "Incorrect OTP." });
      if (entry.category !== input.category) throw new TRPCError({ code: "BAD_REQUEST", message: "OTP was issued for a different category." });

      clearDataOtpStore.delete(ctx.user.id);
      const db = getDb();
      const deleted: string[] = [];

      if (input.category === "bookings" || input.category === "all") {
        await db.delete(bookings);
        deleted.push("bookings");
      }
      if (input.category === "expenses" || input.category === "all") {
        await db.delete(expenses);
        deleted.push("expenses");
      }
      if (input.category === "searches" || input.category === "all") {
        await db.delete(userSearches);
        deleted.push("searches");
      }
      if (input.category === "reviews" || input.category === "all") {
        await db.delete(carReviews);
        deleted.push("reviews");
      }

      return { success: true, deleted };
    }),

  // ── Referral Program Admin ──────────────────────────────────────────────
  getReferralProgram: adminQuery.query(async () => {
    const db = getDb();
    // reuse the same migration-aware config reader from referral-router
    const { getProgramConfigForAdmin } = await import("./referral-router");
    return getProgramConfigForAdmin(db);
  }),

  setReferralProgram: superAdminQuery
    .input(z.object({
      enabled: z.boolean(),
      referrerAmount: z.number().int().min(0).max(10000),
      referredAmount: z.number().int().min(0).max(10000),
      pointsExpireDays: z.number().int().min(1).max(365),
      headline: z.string().min(1).max(200),
      subheadline: z.string().min(1).max(500),
      description: z.string().min(1).max(2000),
      terms: z.string().min(1).max(5000),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const value = JSON.stringify(input);
      await db.execute(sql`
        INSERT INTO siteSettings (\`key\`, value) VALUES ('referralProgram', ${value})
        ON DUPLICATE KEY UPDATE value = ${value}, updatedAt = NOW()
      `);
      return { success: true };
    }),

  getReferralStats: adminQuery.query(async () => {
    const db = getDb();
    const [total] = await db.select({ count: sql<number>`count(*)` }).from(referralEvents);
    const [pending] = await db.select({ count: sql<number>`count(*)` }).from(referralEvents).where(eq(referralEvents.status, "pending"));
    const [rideCompleted] = await db.select({ count: sql<number>`count(*)` }).from(referralEvents).where(eq(referralEvents.status, "ride_completed"));
    const [allocated] = await db.select({ count: sql<number>`count(*)` }).from(referralEvents).where(eq(referralEvents.status, "points_allocated"));
    const [totalPointsRow] = await db.select({ sum: sql<number>`coalesce(sum(amount),0)` }).from(referralPoints).where(eq(referralPoints.status, "active"));

    const topReferrers = await db
      .select({ userId: referralEvents.referrerId, name: users.name, phone: users.phone, referrals: sql<number>`count(*)` })
      .from(referralEvents)
      .leftJoin(users, eq(referralEvents.referrerId, users.id))
      .groupBy(referralEvents.referrerId, users.name, users.phone)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    const recentEvents = await db
      .select({
        id: referralEvents.id,
        status: referralEvents.status,
        createdAt: referralEvents.createdAt,
        rideCompletedAt: referralEvents.rideCompletedAt,
        referrerName: users.name,
      })
      .from(referralEvents)
      .leftJoin(users, eq(referralEvents.referrerId, users.id))
      .orderBy(desc(referralEvents.createdAt))
      .limit(20);

    return {
      total: total.count,
      pending: pending.count,
      rideCompleted: rideCompleted.count,
      allocated: allocated.count,
      totalActivePoints: totalPointsRow.sum,
      topReferrers,
      recentEvents,
    };
  }),

  allocateDuePoints: superAdminQuery.mutation(async () => {
    const db = getDb();
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const config = (() => {
      return defaultProgramConfig();
    })();

    const dueEvents = await db.select().from(referralEvents)
      .where(and(eq(referralEvents.status, "ride_completed"), lt(referralEvents.rideCompletedAt, cutoff)));

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
      const [milestoneCheck] = await db.select({ count: sql<number>`count(*)` }).from(referralEvents)
        .where(and(eq(referralEvents.referrerId, event.referrerId), eq(referralEvents.status, "points_allocated")));
      const totalAllocated = milestoneCheck?.count ?? 0;
      if (totalAllocated % 10 === 0 && totalAllocated > 0) {
        await db.insert(referralPoints).values({
          userId: event.referrerId, amount: 200, referralEventId: event.id, status: "active", expiresAt,
        });
      }

      const [referrer] = await db.select({ name: users.name, email: users.email, phone: users.phone }).from(users).where(eq(users.id, event.referrerId)).limit(1);
      const [referred] = await db.select({ name: users.name, email: users.email, phone: users.phone }).from(users).where(eq(users.id, event.referredUserId)).limit(1);
      if (referrer && referred) {
        sendReferralPointsNotification({
          referrerName: referrer.name ?? "there", referrerEmail: referrer.email ?? undefined, referrerPhone: referrer.phone ?? undefined,
          referredName: referred.name ?? "your friend", referredEmail: referred.email ?? undefined, referredPhone: referred.phone ?? undefined,
          amount: config.referrerAmount, expiresAt, terms: config.terms,
        }).catch(console.error);
      }
      allocated++;
    }
    return { allocated };
  }),

  // ── Corporate enquiry lead capture ─────────────────────────────────────
  submitCorporateEnquiry: publicQuery
    .input(z.object({
      name: z.string().min(2),
      phone: z.string().length(10),
      company: z.string().min(2),
      designation: z.string().optional(),
      teamSize: z.string().optional(),
      requirement: z.string().optional(),
      message: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [row] = await db.insert(corporateEnquiries).values({
        name: input.name,
        phone: input.phone,
        company: input.company,
        designation: input.designation ?? null,
        teamSize: input.teamSize ?? null,
        requirement: input.requirement ?? null,
        message: input.message ?? null,
        status: "new",
      }).$returningId();

      await Promise.all([
        sendEmail(
          "easyoutstation@gmail.com",
          `🏢 Corporate Enquiry — ${input.company} | EasyOutstation`,
          `New corporate/B2B enquiry received!\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `LEAD DETAILS\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Name        : ${input.name}\n` +
          `Mobile      : +91-${input.phone}\n` +
          `Company     : ${input.company}\n` +
          `Designation : ${input.designation || "Not specified"}\n` +
          `Team Size   : ${input.teamSize || "Not specified"}\n` +
          `Requirement : ${input.requirement || "Not specified"}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `NOTES\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `${input.message || "No additional details provided."}\n\n` +
          `Lead ID: #${row.id} — Reply or call +91-${input.phone} to follow up.`
        ),
        sendSms(input.phone,
          `EasyOutstation: Thanks ${input.name}! We received your corporate enquiry for ${input.company}. Our account manager will call you within 24 hours. Help: 8796564111`
        ),
      ]);

      return { success: true };
    }),

  // ── Corporate enquiry admin queries ────────────────────────────────────
  getCorporateEnquiries: adminQuery
    .query(async () => {
      const db = getDb();
      return db.select().from(corporateEnquiries).orderBy(desc(corporateEnquiries.createdAt));
    }),

  updateCorporateEnquiryStatus: adminQuery
    .input(z.object({
      id: z.number(),
      status: z.enum(["new", "called", "closed"]),
      adminNotes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(corporateEnquiries)
        .set({ status: input.status, ...(input.adminNotes !== undefined ? { adminNotes: input.adminNotes } : {}) })
        .where(eq(corporateEnquiries.id, input.id));
      return { success: true };
    }),

  // ── Corporate account management ───────────────────────────────────────
  getCorporateAccounts: adminQuery
    .query(async () => {
      const db = getDb();
      const accounts = await db.select().from(corporateAccounts).orderBy(desc(corporateAccounts.createdAt));
      // Count members for each account
      const memberCounts = await db.select({
        corporateAccountId: sql<number>`corporateAccountId`,
        count: count(),
      }).from(users).where(sql`corporateAccountId IS NOT NULL`).groupBy(sql`corporateAccountId`);
      const countMap = Object.fromEntries(memberCounts.map(r => [r.corporateAccountId, r.count]));
      return accounts.map(a => ({ ...a, memberCount: countMap[a.id] ?? 0 }));
    }),

  updateCorporateAccountStatus: adminQuery
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "active", "suspended"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [account] = await db.select().from(corporateAccounts).where(eq(corporateAccounts.id, input.id)).limit(1);
      if (!account) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(corporateAccounts)
        .set({ status: input.status, ...(input.notes !== undefined ? { notes: input.notes } : {}) })
        .where(eq(corporateAccounts.id, input.id));
      // Send approval notification
      if (input.status === "active" && account.status !== "active") {
        const adminUser = await db.select().from(users).where(eq(users.id, account.adminUserId)).limit(1);
        sendCorporateApprovalEmail({
          companyName: account.companyName,
          contactName: adminUser[0]?.name ?? account.companyName,
          email: account.email ?? adminUser[0]?.email,
          phone: account.phone ?? adminUser[0]?.phone,
          joinCode: account.joinCode,
        }).catch(console.error);
      }
      return { success: true };
    }),

  getWhatsappLogs: adminQuery
    .input(z.object({ page: z.number().min(1).default(1), phone: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const page = input?.page ?? 1;
      const pageSize = 50;
      const offset = (page - 1) * pageSize;
      const phoneFilter = input?.phone ? like(whatsappLogs.phone, `%${input.phone.replace(/\D/g, "").slice(-10)}%`) : undefined;
      const where = phoneFilter ? phoneFilter : undefined;
      const [logs, [{ total }]] = await Promise.all([
        db.select().from(whatsappLogs).where(where).orderBy(desc(whatsappLogs.createdAt)).limit(pageSize).offset(offset),
        db.select({ total: sql<number>`COUNT(*)` }).from(whatsappLogs).where(where),
      ]);
      return { logs, total: Number(total), page, pageSize };
    }),

  backfillWaMessageBodies: adminQuery
    .input(z.object({ limit: z.number().min(1).max(200).default(10), force: z.boolean().optional() }).optional())
    .mutation(async ({ input }) => {
      const db = getDb();
      const n = input?.limit ?? 10;
      const force = input?.force ?? false;

      // Find recent logs missing messageBody (or force-reprocess already-backfilled entries)
      const rows = await db.select().from(whatsappLogs)
        .where(
          force
            ? sql`templateName IS NOT NULL`
            : sql`messageBody IS NULL AND templateName IS NOT NULL`
        )
        .orderBy(desc(whatsappLogs.createdAt))
        .limit(n);

      let updated = 0;
      for (const row of rows) {
        let body: string | null = null;

        if (row.bookingId) {
          const [b] = await db.select({
            customerName: bookings.customerName,
            customerPhone: bookings.customerPhone,
            fromCity: bookings.fromCity,
            toCity: bookings.toCity,
            pickupDate: bookings.pickupDate,
            totalPrice: bookings.totalPrice,
            driverName: bookings.driverName,
            driverPhone: bookings.driverPhone,
            specialRequests: bookings.specialRequests,
            pickupAddress: bookings.pickupAddress,
          }).from(bookings).where(eq(bookings.id, row.bookingId)).limit(1);

          if (b) {
            const date = b.pickupDate
              ? new Date(b.pickupDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
              : "N/A";
            const fare = b.totalPrice ? `₹${Number(b.totalPrice).toLocaleString("en-IN")}` : "";
            const hoursMatch = (b.specialRequests ?? "").match(/Offline Rental: (\d+)h/);
            const hours = hoursMatch ? `${hoursMatch[1]}h` : "";
            const pickupTime = b.pickupAddress?.split(" · ")[1] ?? "";
            const pickupLoc = b.pickupAddress?.split(" · ")[0] ?? b.fromCity ?? "";
            const custPhone = (b.customerPhone ?? "").replace(/\D/g, "").slice(-10);

            if (row.templateName === "eo_booking_confirmed_v2") {
              body = `Booking confirmed: ${b.customerName ?? "Customer"} · ${b.fromCity} → ${b.toCity} · ${date}${fare ? ` · ${fare}` : ""}`;
            } else if (row.templateName === "eo_vendor_trip_assigned_v2") {
              body = `[To Driver] Trip #${row.bookingId} · Pickup: ${pickupLoc}${pickupTime ? ` at ${pickupTime}` : ""} · ${date}${hours ? ` · ${hours}` : ""} · Customer: ${b.customerName ?? "Customer"}${custPhone ? ` +91-${custPhone}` : ""}`;
            } else if (row.templateName?.startsWith("eo_driver_assigned")) {
              // For multi-vehicle bookings, the booking row only stores Vehicle 1's driver.
              // Find the driver WA log sent immediately before this customer WA (same booking)
              // — its phone column holds the driver's number, which we can match in bookingDrivers.
              let driverName = b.driverName ?? "TBD";
              let driverPhone = b.driverPhone ?? "";
              let vehicleLabel = "";
              try {
                const [precedingDriverLog] = await db.select()
                  .from(whatsappLogs)
                  .where(
                    and(
                      eq(whatsappLogs.bookingId, row.bookingId),
                      sql`${whatsappLogs.templateName} = 'eo_vendor_trip_assigned_v2'`,
                      sql`${whatsappLogs.id} < ${row.id}`
                    )
                  )
                  .orderBy(desc(whatsappLogs.id))
                  .limit(1);
                if (precedingDriverLog) {
                  const driverPhoneFromLog = precedingDriverLog.phone.replace(/\D/g, "").slice(-10);
                  const [bd] = await db.select().from(bookingDrivers)
                    .where(
                      and(
                        eq(bookingDrivers.bookingId, row.bookingId),
                        eq(bookingDrivers.driverPhone, driverPhoneFromLog)
                      )
                    )
                    .limit(1);
                  if (bd) {
                    driverName = bd.driverName;
                    driverPhone = bd.driverPhone;
                    vehicleLabel = bd.vehicleLabel ?? "";
                  }
                }
              } catch { /* non-fatal — fall through to booking defaults */ }
              body = `[To Customer] Driver: ${driverName}${driverPhone ? ` +91-${driverPhone}` : ""} · ${b.fromCity} → ${vehicleLabel ? `Local Rental (${vehicleLabel})` : b.toCity} · ${date}`;
            } else if (row.templateName?.startsWith("eo_booking")) {
              body = `Booking #${row.bookingId}: ${b.customerName ?? "Customer"} · ${b.fromCity} → ${b.toCity} · ${date}${fare ? ` · ${fare}` : ""}`;
            }
          }
        }

        if (!body) {
          // Generic fallback — at least show the template name clearly
          body = `[${row.templateName}] — booking #${row.bookingId ?? "unknown"}`;
        }

        await db.update(whatsappLogs).set({ messageBody: body } as any).where(eq(whatsappLogs.id, row.id));
        updated++;
      }

      return { updated, total: rows.length };
    }),

  getWhatsAppThread: adminQuery
    .input(z.object({ phone: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const phone = input.phone.replace(/\D/g, "").slice(-10);
      const logs = await db.select().from(whatsappLogs)
        .where(like(whatsappLogs.phone, `%${phone}%`))
        .orderBy(whatsappLogs.createdAt);
      return logs;
    }),

  getLiveTrips: adminQuery.query(async () => {
    const db = getDb();
    const redis = getRedis();
    const today = new Date().toISOString().slice(0, 10);
    const active = await db.select({
      id: bookings.id,
      customerName: bookings.customerName,
      customerPhone: bookings.customerPhone,
      fromCity: bookings.fromCity,
      toCity: bookings.toCity,
      pickupDate: bookings.pickupDate,
      pickupAddress: bookings.pickupAddress,
      driverName: bookings.driverName,
      driverPhone: bookings.driverPhone,
      status: bookings.status,
      tripPin: bookings.tripPin,
    }).from(bookings).where(
      and(
        sql`${bookings.status} IN ('confirmed', 'driver_assigned')`,
        sql`DATE(${bookings.pickupDate}) = ${today}`
      )
    );

    const trips = await Promise.all(active.map(async (b) => {
      let driverLoc: { lat: number; lng: number } | null = null;
      if (redis) {
        try {
          const raw = await redis.get(`driver:loc:${b.id}`);
          if (raw) driverLoc = JSON.parse(raw);
        } catch {}
      }
      return { ...b, driverLoc };
    }));

    return trips;
  }),

  getBookingTimeline: adminQuery
    .input(z.object({ bookingId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const events = await db.select().from(bookingEvents)
        .where(eq(bookingEvents.bookingId, input.bookingId))
        .orderBy(bookingEvents.createdAt);
      return events;
    }),

  // ── Offline Booking ────────────────────────────────────────────────────
  createOfflineBooking: adminQuery
    .input(z.object({
      customerName: z.string().min(1),
      customerPhone: z.string().length(10),
      customerEmail: z.string().email().optional(),
      pickupArea: z.string().min(1),
      pickupDate: z.string(), // YYYY-MM-DD
      pickupTime: z.string(), // HH:MM
      vehicles: z.array(z.object({
        carId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(5),
      })).min(1),
      rentalHours: z.number().min(8).max(12),
      totalFare: z.number().positive(),
      advanceCollected: z.number().min(0),
      notes: z.string().optional(),
      customSmsText: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();

      const phone = input.customerPhone.replace(/\D/g, "").slice(-10);

      // Find or create shadow user by phone
      const [existingUser] = await db.select({ id: users.id })
        .from(users).where(sql`${users.phone} = ${phone}`).limit(1);

      let userId: number;
      if (existingUser) {
        userId = existingUser.id;
      } else {
        const [newUser] = await db.insert(users).values({
          unionId: `offline_${phone}_${Date.now()}`,
          name: input.customerName,
          phone,
          email: input.customerEmail ?? null,
          role: "user",
        } as any).$returningId();
        userId = newUser.id;
      }

      const primaryCarId = input.vehicles[0].carId;
      const carRows = await db.select({ id: cars.id, name: cars.name })
        .from(cars).where(sql`id IN (${sql.join(input.vehicles.map(v => sql`${v.carId}`), sql`, `)})`);
      const carMap = Object.fromEntries(carRows.map(c => [c.id, c.name]));
      if (!carMap[primaryCarId]) throw new TRPCError({ code: "NOT_FOUND", message: "Car not found" });

      const vehicleSummary = input.vehicles
        .map(v => `${carMap[v.carId] ?? v.carId}${v.quantity > 1 ? ` ×${v.quantity}` : ""}`)
        .join(" + ");

      const includedKm = input.rentalHours * 10;
      const specialRequests = [
        `[Offline Rental: ${input.rentalHours}h, Vehicles: ${vehicleSummary}, Advance paid: ₹${input.advanceCollected}]`,
        input.notes,
      ].filter(Boolean).join(" ");

      const [result] = await db.insert(bookings).values({
        userId,
        carId: primaryCarId,
        fromCity: input.pickupArea,
        toCity: "Local Rental",
        pickupDate: new Date(input.pickupDate) as any,
        tripType: "one_way",
        totalKm: includedKm,
        totalPrice: input.totalFare.toFixed(2),
        status: "confirmed",
        paymentStatus: "paid",
        customerName: input.customerName,
        customerPhone: phone,
        customerEmail: input.customerEmail ?? null,
        pickupAddress: `${input.pickupArea} · ${input.pickupTime}`,
        specialRequests,
        adminNotes: "Offline booking created by admin",
      } as any).$returningId();

      const bookingId = result.id;
      const date = new Date(input.pickupDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      const defaultSms = `EasyOutstation: Booking #${bookingId} CONFIRMED! ${input.pickupArea} to Local Rental. Pickup: ${date} at ${input.pickupTime}. Vehicles: ${vehicleSummary}. Fare: Rs ${input.totalFare.toLocaleString("en-IN")}. Driver details within 60 mins. Help: 8796564111`;
      const smsText = input.customSmsText?.trim() || defaultSms;

      const waPhone = `91${phone}`;
      let waSent = false;
      let waError: string | undefined;
      let smsSent = false;
      let smsError: string | undefined;

      // Send WhatsApp directly so admin gets immediate feedback on success/failure
      try {
        await sendWhatsAppTemplateRaw(waPhone, "eo_booking_confirmed_v2", "en", [{
          type: "body",
          parameters: [
            { type: "text", text: input.customerName },
            { type: "text", text: input.pickupArea },
            { type: "text", text: "Local Rental" },
            { type: "text", text: date },
            { type: "text", text: vehicleSummary },
            { type: "text", text: input.totalFare.toLocaleString("en-IN") },
          ],
        }]);
        waSent = true;
        const db2 = getDb();
        await db2.insert(whatsappLogs).values({
          bookingId,
          direction: "outbound",
          templateName: "eo_booking_confirmed_v2",
          messageBody: `Booking confirmed: ${input.customerName} · ${input.pickupArea} → Local Rental · ${date} · ${vehicleSummary} · ₹${input.totalFare.toLocaleString("en-IN")}`,
          phone: waPhone,
          waStatus: "sent",
          fallbackSent: false,
        } as any).catch(() => {});
      } catch (e) {
        waError = e instanceof Error ? e.message : String(e);
        console.error("[createOfflineBooking] WA failed:", waError);
      }

      // If WhatsApp failed, send SMS fallback directly
      if (!waSent) {
        try {
          const apiKey = process.env.FAST2SMS_API_KEY?.trim();
          if (apiKey) {
            const params = new URLSearchParams({
              authorization: apiKey,
              route: "q",
              message: smsText,
              language: "english",
              flash: "0",
              numbers: phone,
            });
            const smsRes = await fetch(`https://www.fast2sms.com/dev/bulkV2?${params.toString()}`);
            const smsData = await smsRes.json() as any;
            if (smsData.return === true) {
              smsSent = true;
            } else {
              smsError = smsData.message ?? "SMS failed";
            }
          } else {
            smsError = "FAST2SMS_API_KEY not configured";
          }
        } catch (e) {
          smsError = e instanceof Error ? e.message : String(e);
        }
      }

      logBookingEvent(bookingId, "booking_confirmed", { source: "offline_admin" }).catch(() => {});

      return { success: true, bookingId, waSent, waError, smsSent, smsError };
    }),

  assignOfflineDriver: adminQuery
    .input(z.object({
      bookingId: z.number().int().positive(),
      driverName: z.string().min(1),
      driverPhone: z.string().length(10),
      vehicleNumber: z.string().optional(),
      vehicleModel: z.string().optional(),
      saveAsNewDriver: z.boolean().default(false),
      vehicleIndex: z.number().int().min(1).optional(),
      vehicleLabel: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // 1. Fetch the booking for customer contact + trip details
      const [booking] = await db.select({
        customerName: bookings.customerName,
        customerPhone: bookings.customerPhone,
        fromCity: bookings.fromCity,
        pickupDate: bookings.pickupDate,
        pickupAddress: bookings.pickupAddress,
        specialRequests: bookings.specialRequests,
      }).from(bookings).where(eq(bookings.id, input.bookingId)).limit(1);

      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });

      // 2. Update booking status; update driverName/driverPhone only for first/sole vehicle
      if (!input.vehicleIndex || input.vehicleIndex === 1) {
        await db.update(bookings).set({
          status: "driver_assigned",
          driverName: input.driverName,
          driverPhone: input.driverPhone,
        } as any).where(eq(bookings.id, input.bookingId));
      } else {
        await db.update(bookings).set({ status: "driver_assigned" } as any)
          .where(eq(bookings.id, input.bookingId));
      }

      // 3. Optionally save/update driver record
      if (input.saveAsNewDriver) {
        const existingDriver = await db.select({ id: drivers.id })
          .from(drivers).where(eq(drivers.phone, input.driverPhone)).limit(1);
        if (existingDriver.length > 0) {
          await db.update(drivers).set({
            name: input.driverName,
            vehicleNumber: input.vehicleNumber ?? null,
            vehicleModel: input.vehicleModel ?? null,
          } as any).where(eq(drivers.id, existingDriver[0].id));
        } else {
          await db.insert(drivers).values({
            name: input.driverName,
            phone: input.driverPhone,
            vehicleNumber: input.vehicleNumber ?? null,
            vehicleModel: input.vehicleModel ?? null,
            vehicleInfo: [input.vehicleModel, input.vehicleNumber].filter(Boolean).join(" · ") || null,
            isActive: true,
          } as any);
        }
      }

      const pickupDate = booking.pickupDate
        ? new Date(booking.pickupDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        : "N/A";
      const customerPhone = (booking.customerPhone ?? "").replace(/\D/g, "").slice(-10);
      const waPhone = `91${customerPhone}`;
      const vehicleDesc = [input.vehicleModel, input.vehicleNumber].filter(Boolean).join(", ");

      // Extract rental hours and pickup time from booking fields
      const hoursMatch = (booking.specialRequests ?? "").match(/Offline Rental: (\d+)h/);
      const rentalHoursStr = hoursMatch ? `${hoursMatch[1]}h` : "";
      const pickupTime = booking.pickupAddress?.split(" · ")[1] ?? "";
      const pickupLocation = booking.pickupAddress?.split(" · ")[0] ?? booking.fromCity ?? "Pickup";

      // Record in bookingDrivers table for multi-vehicle tracking
      await db.insert(bookingDrivers).values({
        bookingId: input.bookingId,
        vehicleIndex: input.vehicleIndex ?? 1,
        vehicleLabel: input.vehicleLabel ?? null,
        driverName: input.driverName,
        driverPhone: input.driverPhone,
        vehicleNumber: input.vehicleNumber ?? null,
        vehicleModel: input.vehicleModel ?? null,
        notifiedAt: new Date(),
      } as any).catch(() => {});

      // Informational driver message: hours, location, customer name+number (no fare, no confirmation needed)
      const driverWaPhone = `91${input.driverPhone}`;
      const driverTripText = `EasyOutstation: Trip #${input.bookingId} for you. Customer: ${booking.customerName ?? "Customer"} +91-${customerPhone}. Pickup: ${pickupLocation}${pickupTime ? ` at ${pickupTime}` : ""}. Date: ${pickupDate}.${rentalHoursStr ? ` Duration: ${rentalHoursStr}.` : ""}${vehicleDesc ? ` Vehicle: ${vehicleDesc}.` : ""} Help: 8796564111`;

      let driverWaSent = false;

      // 4. Send WhatsApp to driver FIRST — informational, includes hours/location/customer name+number
      try {
        await sendWhatsAppTemplateRaw(driverWaPhone, "eo_vendor_trip_assigned_v2", "en", [{
          type: "body",
          parameters: [
            { type: "text", text: String(input.bookingId) },
            { type: "text", text: pickupLocation },
            { type: "text", text: rentalHoursStr ? `Local Rental (${rentalHoursStr})` : "Local Rental" },
            { type: "text", text: pickupTime ? `${pickupDate} at ${pickupTime}` : pickupDate },
            { type: "text", text: `${booking.customerName ?? "Customer"} +91-${customerPhone}` },
          ],
        }]);
        driverWaSent = true;
        await db.insert(whatsappLogs).values({
          bookingId: input.bookingId,
          direction: "outbound",
          templateName: "eo_vendor_trip_assigned_v2",
          messageBody: `[To Driver] Trip #${input.bookingId} · Pickup: ${pickupLocation}${pickupTime ? ` at ${pickupTime}` : ""} · ${pickupDate}${rentalHoursStr ? ` · ${rentalHoursStr}` : ""} · Customer: ${booking.customerName ?? "Customer"} +91-${customerPhone}${vehicleDesc ? ` · ${vehicleDesc}` : ""}`,
          phone: driverWaPhone,
          waStatus: "sent",
          fallbackSent: false,
        } as any).catch(() => {});
      } catch (e) {
        console.error("[assignOfflineDriver] WA to driver failed:", e instanceof Error ? e.message : e);
      }

      // 5. SMS to driver as fallback if WhatsApp failed (no fare)
      if (!driverWaSent) {
        try {
          const apiKey = process.env.FAST2SMS_API_KEY?.trim();
          if (apiKey) {
            const params = new URLSearchParams({ authorization: apiKey, route: "q", message: driverTripText, language: "english", flash: "0", numbers: input.driverPhone });
            await fetch(`https://www.fast2sms.com/dev/bulkV2?${params}`);
          }
        } catch { /* non-fatal */ }
      }

      let waSent = false;
      let waError: string | undefined;
      let smsSent = false;
      let smsError: string | undefined;

      // 6. Send WhatsApp to customer with driver details (include vehicle label for multi-vehicle)
      const toDestLabel = input.vehicleLabel ? `Local Rental (${input.vehicleLabel})` : "Local Rental";
      try {
        await sendWhatsAppTemplateRaw(waPhone, "eo_driver_assigned_v2_", "en", [{
          type: "body",
          parameters: [
            { type: "text", text: booking.customerName ?? "Customer" },
            { type: "text", text: booking.fromCity ?? "pickup location" },
            { type: "text", text: toDestLabel },
            { type: "text", text: pickupDate },
            { type: "text", text: vehicleDesc ? `${input.driverName} (${vehicleDesc})` : input.driverName },
            { type: "text", text: input.driverPhone },
          ],
        }]);
        waSent = true;
        await db.insert(whatsappLogs).values({
          bookingId: input.bookingId,
          direction: "outbound",
          templateName: "eo_driver_assigned_v2_",
          messageBody: `[To Customer] Driver: ${vehicleDesc ? `${input.driverName} (${vehicleDesc})` : input.driverName} +91-${input.driverPhone} · ${booking.fromCity ?? "pickup"} → ${toDestLabel} · ${pickupDate}`,
          phone: waPhone,
          waStatus: "sent",
          fallbackSent: false,
        } as any).catch(() => {});
      } catch (e) {
        waError = e instanceof Error ? e.message : String(e);
        console.error("[assignOfflineDriver] WA to customer failed:", waError);
      }

      // 7. SMS fallback to customer if WhatsApp failed
      if (!waSent && customerPhone) {
        const customerSms = `EasyOutstation: Your driver for Booking #${input.bookingId} on ${pickupDate} is ${input.driverName}, +91-${input.driverPhone}.${vehicleDesc ? ` Vehicle: ${vehicleDesc}.` : ""} Help: 8796564111`;
        try {
          const apiKey = process.env.FAST2SMS_API_KEY?.trim();
          if (apiKey) {
            const params = new URLSearchParams({ authorization: apiKey, route: "q", message: customerSms, language: "english", flash: "0", numbers: customerPhone });
            const r = await fetch(`https://www.fast2sms.com/dev/bulkV2?${params}`);
            const d = await r.json() as any;
            if (d.return === true) smsSent = true;
            else smsError = d.message ?? "SMS failed";
          }
        } catch (e) { smsError = e instanceof Error ? e.message : String(e); }
      }

      logBookingEvent(input.bookingId, "driver_assigned", { driverName: input.driverName, driverPhone: input.driverPhone, vehicleNumber: input.vehicleNumber }).catch(() => {});

      return { success: true, waSent, waError, smsSent, smsError, driverWaSent };
    }),

  getAnalytics: adminQuery
    .input(z.object({ days: z.number().min(7).max(90).default(30) }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const days = input?.days ?? 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const sinceStr = since.toISOString().slice(0, 10);

      const [dailyRows, routeRows, funnelRows, tripTypeRows] = await Promise.all([
        // Daily revenue + booking count for the period
        db.execute(sql.raw(`
          SELECT DATE(createdAt) as day,
                 COUNT(*) as bookings,
                 COALESCE(SUM(CASE WHEN paymentStatus='paid' THEN totalPrice ELSE 0 END), 0) as revenue
          FROM bookings
          WHERE DATE(createdAt) >= '${sinceStr}'
          GROUP BY DATE(createdAt)
          ORDER BY day ASC
        `)),
        // Top 10 routes by booking count
        db.execute(sql.raw(`
          SELECT fromCity, toCity,
                 COUNT(*) as bookings,
                 COALESCE(SUM(CASE WHEN paymentStatus='paid' THEN totalPrice ELSE 0 END), 0) as revenue
          FROM bookings
          WHERE DATE(createdAt) >= '${sinceStr}'
          GROUP BY fromCity, toCity
          ORDER BY bookings DESC
          LIMIT 10
        `)),
        // Conversion funnel (all time for context)
        db.execute(sql.raw(`
          SELECT
            COUNT(*) as total,
            SUM(CASE WHEN paymentStatus='paid' THEN 1 ELSE 0 END) as paid,
            SUM(CASE WHEN status IN ('confirmed','driver_assigned','completed') THEN 1 ELSE 0 END) as confirmed,
            SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) as cancelled
          FROM bookings
          WHERE DATE(createdAt) >= '${sinceStr}'
        `)),
        // Trip type breakdown
        db.execute(sql.raw(`
          SELECT tripType, COUNT(*) as bookings,
                 COALESCE(SUM(CASE WHEN paymentStatus='paid' THEN totalPrice ELSE 0 END), 0) as revenue
          FROM bookings
          WHERE DATE(createdAt) >= '${sinceStr}'
          GROUP BY tripType
        `)),
      ]);

      const daily = (dailyRows as any[]).map((r: any) => ({
        day: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day),
        bookings: Number(r.bookings),
        revenue: parseFloat(r.revenue),
      }));

      const routes = (routeRows as any[]).map((r: any) => ({
        route: `${r.fromCity} → ${r.toCity}`,
        bookings: Number(r.bookings),
        revenue: parseFloat(r.revenue),
      }));

      const funnel = (funnelRows as any[])[0] ?? {};

      const tripTypes = (tripTypeRows as any[]).map((r: any) => ({
        type: String(r.tripType).replace("_", " "),
        bookings: Number(r.bookings),
        revenue: parseFloat(r.revenue),
      }));

      return {
        daily,
        routes,
        tripTypes,
        funnel: {
          total: Number(funnel.total ?? 0),
          paid: Number(funnel.paid ?? 0),
          confirmed: Number(funnel.confirmed ?? 0),
          completed: Number(funnel.completed ?? 0),
          cancelled: Number(funnel.cancelled ?? 0),
        },
        days,
      };
    }),
});
