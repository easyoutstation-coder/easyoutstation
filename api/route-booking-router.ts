import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { routes, bookings, userSearches } from "@db/schema";
import { eq, and, like, desc, sql } from "drizzle-orm";
import { differenceInHours } from "date-fns";

async function sendBookingSms(phone: string, bookingId: number, fromCity: string, toCity: string, pickupDate: string, totalPrice: number) {
  const apiKey = process.env.FAST2SMS_API_KEY?.trim();
  if (!apiKey) { console.warn("[Fast2SMS] FAST2SMS_API_KEY not set"); return; }
  const number = phone.replace(/\D/g, "").slice(-10);
  if (number.length !== 10) { console.warn("[Fast2SMS] Invalid phone:", phone); return; }
  const message = `EasyOutstation: Booking #${bookingId} received! ${fromCity} to ${toCity} on ${pickupDate}. Total: Rs ${totalPrice.toLocaleString("en-IN")}. Driver details within 60 mins. Help: 9958556011`;
  const params = new URLSearchParams({
    authorization: apiKey,
    route: "q",
    message,
    language: "english",
    flash: "0",
    numbers: number,
  });
  try {
    const res = await fetch(`https://www.fast2sms.com/dev/bulkV2?${params.toString()}`);
    const data = await res.json() as any;
    if (data.return === true) {
      console.log(`[Fast2SMS] SMS sent to ${number}, request_id: ${data.request_id}`);
    } else {
      console.error("[Fast2SMS] Failed:", JSON.stringify(data));
    }
  } catch (e) {
    console.error("[Fast2SMS] Request error:", e);
  }
}

async function sendBookingEmails(input: {
  bookingId: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  fromCity: string;
  toCity: string;
  pickupDate: string;
  totalKm: number;
  totalPrice: number;
  tripType: string;
  passengerCount: number;
  pickupAddress?: string;
  specialRequests?: string;
}) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return;

  const bookingDetails = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BOOKING DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Booking ID   : #${input.bookingId}
Customer     : ${input.customerName}
Mobile       : ${input.customerPhone ? `+91-${input.customerPhone}` : "Not provided"}
Email        : ${input.customerEmail || "Not provided"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TRIP DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Route        : ${input.fromCity} → ${input.toCity}
Pickup Date  : ${input.pickupDate}
Distance     : ${input.totalKm} km
Trip Type    : ${input.tripType.replace(/_/g, " ").toUpperCase()}
Passengers   : ${input.passengerCount}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FARE BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Fare   : ₹${input.totalPrice.toLocaleString("en-IN")}
(Includes distance charges, driver charges & estimated toll)
Note: Parking charges paid at actuals
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PICKUP DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${input.pickupAddress || "Not provided"}
${input.specialRequests ? `\nNotes: ${input.specialRequests}` : ""}
  `.trim();

  // Email to EasyOutstation team
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "EasyOutstation Bookings <bookings@easyoutstation.com>",
      to: ["easyoutstation@gmail.com"],
      subject: `🚗 New Booking #${input.bookingId} — ${input.fromCity} → ${input.toCity} | ${input.pickupDate}`,
      text: `New booking received!\n\n${bookingDetails}`,
    }),
  });

  // Email to customer
  if (input.customerEmail) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "EasyOutstation <bookings@easyoutstation.com>",
        to: [input.customerEmail],
        subject: `Booking Received #${input.bookingId} — ${input.fromCity} → ${input.toCity} | EasyOutstation`,
        text: `Dear ${input.customerName},

Thank you for choosing EasyOutstation! 🚗

We have successfully received your booking request. Our team will review the details and send you a confirmation with your driver's information within 60 minutes.

${bookingDetails}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT HAPPENS NEXT?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ We will confirm your booking within 60 minutes
✅ You will receive your driver's name & contact details
✅ Driver will call you 1 hour before pickup

For any queries, email us at: easyoutstation@gmail.com

Have a wonderful journey! 🌟

Warm regards,
Team EasyOutstation`,
      }),
    });
  }
}

export const routeRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return await db.query.routes.findMany({
      orderBy: [desc(routes.isPopular), desc(routes.id)],
    });
  }),

  getPopular: publicQuery.query(async () => {
    const db = getDb();
    return await db.query.routes.findMany({
      where: eq(routes.isPopular, true),
      orderBy: [desc(routes.id)],
      limit: 6,
    });
  }),

  search: publicQuery
    .input(
      z.object({
        fromCity: z.string().optional(),
        toCity: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const filters = [];

      if (input?.fromCity) {
        filters.push(like(routes.fromCity, `%${input.fromCity}%`));
      }
      if (input?.toCity) {
        filters.push(like(routes.toCity, `%${input.toCity}%`));
      }

      const whereClause = filters.length > 0 ? and(...filters) : undefined;

      return await db.query.routes.findMany({
        where: whereClause,
        orderBy: [desc(routes.isPopular)],
      });
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const route = await db.query.routes.findFirst({
        where: eq(routes.id, input.id),
      });
      return route ?? null;
    }),
});

export const bookingRouter = createRouter({
  create: publicQuery
    .input(
      z.object({
        carId: z.number(),
        routeId: z.number().optional(),
        fromCity: z.string(),
        toCity: z.string(),
        pickupDate: z.string(),
        returnDate: z.string().optional(),
        tripType: z.enum(["one_way", "round_trip", "multi_day"]),
        passengerCount: z.number().default(1),
        totalKm: z.number(),
        totalPrice: z.number(),
        customerName: z.string(),
        customerPhone: z.string().optional(),
        customerEmail: z.string().optional(),
        pickupAddress: z.string().optional(),
        specialRequests: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const userId = ctx.user?.id ?? 0;

      const result = await db.insert(bookings).values({
        userId,
        carId: input.carId,
        routeId: input.routeId,
        fromCity: input.fromCity,
        toCity: input.toCity,
        pickupDate: new Date(input.pickupDate),
        returnDate: input.returnDate ? new Date(input.returnDate) : null,
        tripType: input.tripType,
        passengerCount: input.passengerCount,
        totalKm: input.totalKm,
        totalPrice: input.totalPrice.toString(),
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail,
        pickupAddress: input.pickupAddress,
        specialRequests: input.specialRequests,
      });

      const bookingId = Number((result as any).insertId) || Math.floor(Math.random() * 90000 + 10000);

      // Send email + SMS notifications
      try {
        await sendBookingEmails({ ...input, bookingId });
      } catch (e) {
        console.error("Email send failed:", e);
      }
      if (input.customerPhone) {
        try {
          await sendBookingSms(input.customerPhone, bookingId, input.fromCity, input.toCity, input.pickupDate, input.totalPrice);
        } catch (e) {
          console.error("SMS send failed:", e);
        }
      }

      return { success: true, bookingId };
    }),

  getMyBookings: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id;
    return await db.query.bookings.findMany({
      where: eq(bookings.userId, userId),
      orderBy: [desc(bookings.createdAt)],
      with: {
        car: true,
      },
    });
  }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const booking = await db.query.bookings.findFirst({
        where: eq(bookings.id, input.id),
        with: {
          car: true,
          route: true,
        },
      });
      return booking ?? null;
    }),

  cancel: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const userId = ctx.user.id;

      const booking = await db.query.bookings.findFirst({
        where: and(eq(bookings.id, input.id), eq(bookings.userId, userId)),
      });
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
      if (booking.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending bookings can be cancelled" });
      const hoursLeft = differenceInHours(new Date(booking.pickupDate), new Date());
      if (hoursLeft < 24) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot cancel within 24 hours of pickup" });

      await db
        .update(bookings)
        .set({ status: "cancelled" as const })
        .where(and(eq(bookings.id, input.id), eq(bookings.userId, userId)));

      return { success: true };
    }),

  updateDate: authedQuery
    .input(z.object({ id: z.number(), newDate: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const userId = ctx.user.id;
      const booking = await db.query.bookings.findFirst({
        where: and(eq(bookings.id, input.id), eq(bookings.userId, userId)),
      });
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
      if (booking.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending bookings can be rescheduled" });
      const hoursLeft = differenceInHours(new Date(booking.pickupDate), new Date());
      if (hoursLeft < 24) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot reschedule within 24 hours of pickup" });
      await db.update(bookings).set({ pickupDate: new Date(input.newDate) }).where(eq(bookings.id, input.id));
      return { success: true };
    }),
});

export const searchRouter = createRouter({
  log: publicQuery
    .input(
      z.object({
        fromCity: z.string().optional(),
        toCity: z.string().optional(),
        carCategory: z.string().optional(),
        pickupDate: z.string().optional(),
        passengerCount: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const userId = ctx.user?.id ?? null;

      await db.insert(userSearches).values({
        userId,
        fromCity: input.fromCity,
        toCity: input.toCity,
        carCategory: input.carCategory,
        pickupDate: input.pickupDate ? new Date(input.pickupDate) : null,
        passengerCount: input.passengerCount,
      });

      return { success: true };
    }),

  getRecent: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id;
    return await db.query.userSearches.findMany({
      where: eq(userSearches.userId, userId),
      orderBy: [desc(userSearches.createdAt)],
      limit: 5,
    });
  }),

  getTrending: publicQuery.query(async () => {
    const db = getDb();
    const results = await db
      .select({
        fromCity: userSearches.fromCity,
        toCity: userSearches.toCity,
        count: sql<number>`COUNT(*)`,
      })
      .from(userSearches)
      .groupBy(userSearches.fromCity, userSearches.toCity)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(5);

    return results;
  }),
});
