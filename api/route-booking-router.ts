import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { routes, bookings, userSearches, users, carReviews } from "@db/schema";
import { eq, and, like, desc, sql, lt, isNull, ne } from "drizzle-orm";
import { getRedis } from "./lib/redis";
import { logBookingEvent } from "./lib/bookingEvents";

const LOCATION_TTL = 7200;
import { differenceInHours, subMinutes } from "date-fns";
import { sendBookingEmails, sendBookingSms } from "./lib/notifications";

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
        returnTime: z.string().optional(),
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
        returnTime: input.returnTime ?? null,
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
      logBookingEvent(bookingId, "booking_created", { fromCity: input.fromCity, toCity: input.toCity }).catch(() => {});
      return { success: true, bookingId };
    }),

  sendAbandonedReminders: publicQuery
    .input(z.object({ minutesOld: z.number().default(30) }).optional())
    .mutation(async ({ input }) => {
      const db = getDb();
      const cutoff = subMinutes(new Date(), input?.minutesOld ?? 30);

      const abandoned = await db.query.bookings.findMany({
        where: and(
          eq(bookings.paymentStatus, "pending"),
          ne(bookings.status, "cancelled"),
          lt(bookings.createdAt, cutoff)
        ),
      });

      const fmt = (d: Date | string | null) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : undefined;
      // Resolve missing phone/email from user accounts in one batch query
      const userIds = [...new Set(abandoned.map(b => b.userId).filter(Boolean))];
      const userMap: Record<number, { phone: string | null; email: string | null }> = {};
      if (userIds.length > 0) {
        const rows = await db.select({ id: users.id, phone: users.phone, email: users.email }).from(users).where(sql`id IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);
        rows.forEach(u => { userMap[u.id] = { phone: u.phone, email: u.email }; });
      }

      let sent = 0;
      for (const booking of abandoned) {
        const resolvedPhone = booking.customerPhone || userMap[booking.userId]?.phone || null;
        const resolvedEmail = booking.customerEmail || userMap[booking.userId]?.email || null;
        const pickupDateStr = fmt(booking.pickupDate) ?? String(booking.pickupDate);
        const returnDateStr = booking.returnDate ? fmt(booking.returnDate) : undefined;
        const price = parseFloat(booking.totalPrice);

        try {
          await sendBookingEmails(
            {
              bookingId: booking.id,
              customerName: booking.customerName,
              customerEmail: resolvedEmail ?? undefined,
              customerPhone: resolvedPhone ?? undefined,
              carId: booking.carId ?? undefined,
              fromCity: booking.fromCity,
              toCity: booking.toCity,
              pickupDate: pickupDateStr,
              returnDate: returnDateStr,
              returnTime: booking.returnTime ?? undefined,
              totalKm: booking.totalKm,
              totalPrice: price,
              tripType: booking.tripType,
              passengerCount: booking.passengerCount ?? 1,
              pickupAddress: booking.pickupAddress ?? undefined,
              specialRequests: booking.specialRequests ?? undefined,
            },
            "abandonment"
          );
        } catch (e) {
          console.error(`[Abandoned] Email failed for booking #${booking.id}:`, e);
        }

        if (resolvedPhone) {
          try {
            await sendBookingSms(resolvedPhone, booking.id, booking.fromCity, booking.toCity, pickupDateStr, price, "abandonment", undefined, undefined, booking.carId ?? undefined, booking.totalKm ?? undefined);
          } catch (e) {
            console.error(`[Abandoned] SMS failed for booking #${booking.id}:`, e);
          }
        }
        sent++;
      }

      return { success: true, total: abandoned.length, sent };
    }),

  notifyAbandoned: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const booking = await db.query.bookings.findFirst({ where: eq(bookings.id, input.id) });
      if (!booking || booking.paymentStatus === "paid") return { success: false };

      // Resolve phone/email from user account if missing from booking
      let resolvedPhone = booking.customerPhone ?? null;
      let resolvedEmail = booking.customerEmail ?? null;
      if ((!resolvedPhone || !resolvedEmail) && booking.userId) {
        const [u] = await db.select({ phone: users.phone, email: users.email }).from(users).where(eq(users.id, booking.userId)).limit(1);
        if (!resolvedPhone) resolvedPhone = u?.phone ?? null;
        if (!resolvedEmail) resolvedEmail = u?.email ?? null;
      }

      const fmt = (d: Date | string | null) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : undefined;
      const pickupDateStr = fmt(booking.pickupDate) ?? String(booking.pickupDate);
      const returnDateStr = booking.returnDate ? fmt(booking.returnDate) : undefined;
      const price = parseFloat(booking.totalPrice);

      try {
        await sendBookingEmails(
          {
            bookingId: booking.id,
            customerName: booking.customerName,
            customerEmail: resolvedEmail ?? undefined,
            customerPhone: resolvedPhone ?? undefined,
            carId: booking.carId ?? undefined,
            fromCity: booking.fromCity,
            toCity: booking.toCity,
            pickupDate: pickupDateStr,
            returnDate: returnDateStr,
            totalKm: booking.totalKm,
            totalPrice: price,
            tripType: booking.tripType,
            passengerCount: booking.passengerCount ?? 1,
            pickupAddress: booking.pickupAddress ?? undefined,
            specialRequests: booking.specialRequests ?? undefined,
          },
          "abandonment"
        );
      } catch (e) {
        console.error(`[notifyAbandoned] Email failed for booking #${booking.id}:`, e);
      }

      if (resolvedPhone) {
        try {
          await sendBookingSms(resolvedPhone, booking.id, booking.fromCity, booking.toCity, pickupDateStr, price, "abandonment", undefined, undefined, booking.carId ?? undefined, booking.totalKm ?? undefined);
        } catch (e) {
          console.error(`[notifyAbandoned] SMS failed for booking #${booking.id}:`, e);
        }
      }

      return { success: true };
    }),

  getMyBookings: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id;
    const myBookings = await db.query.bookings.findMany({
      where: eq(bookings.userId, userId),
      orderBy: [desc(bookings.createdAt)],
      with: { car: true },
    });
    const reviews = await db.select({ bookingId: carReviews.bookingId })
      .from(carReviews)
      .where(eq(carReviews.userId, userId));
    const reviewedIds = new Set(reviews.map(r => r.bookingId).filter(Boolean));
    return myBookings.map(b => ({ ...b, hasReview: reviewedIds.has(b.id) }));
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

      logBookingEvent(input.id, "cancelled", { by: "customer" }).catch(() => {});
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

  // Test users (flagged by super admin) can confirm bookings without payment
  confirmTestBooking: authedQuery
    .input(z.object({ bookingId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!(ctx.user as any).isTestUser) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a test account" });
      }
      const db = getDb();
      await db.update(bookings)
        .set({ paymentStatus: "paid", status: "confirmed" })
        .where(and(eq(bookings.id, input.bookingId), eq(bookings.userId, ctx.user.id)));
      return { success: true };
    }),

  // Save WhatsApp opt-out preference at time of booking
  setWhatsappOptOut: authedQuery
    .input(z.object({ optOut: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(users).set({ whatsappOptOut: input.optOut }).where(eq(users.id, ctx.user.id));
    }),

  // Read driver's live location from Redis (customer polls this)
  getDriverLocation: authedQuery
    .input(z.object({ bookingId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const [booking] = await db.select({ userId: bookings.userId })
        .from(bookings).where(eq(bookings.id, input.bookingId)).limit(1);
      if (!booking || booking.userId !== ctx.user.id) return null;
      const redis = getRedis();
      if (!redis) return null;
      const raw = await redis.get(`driver:loc:${input.bookingId}`);
      if (!raw) return null;
      return JSON.parse(raw) as { lat: number; lng: number; ts: number };
    }),

  // Customer shares their location (driver sees it)
  updateCustomerLocation: authedQuery
    .input(z.object({ bookingId: z.number(), lat: z.number(), lng: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [booking] = await db.select({ userId: bookings.userId })
        .from(bookings).where(eq(bookings.id, input.bookingId)).limit(1);
      if (!booking || booking.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const redis = getRedis();
      if (!redis) return;
      await redis.set(`customer:loc:${input.bookingId}`, JSON.stringify({ lat: input.lat, lng: input.lng, ts: Date.now() }), "EX", LOCATION_TTL);
    }),

  // Stop customer location sharing
  stopCustomerSharing: authedQuery
    .input(z.object({ bookingId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [booking] = await db.select({ userId: bookings.userId })
        .from(bookings).where(eq(bookings.id, input.bookingId)).limit(1);
      if (!booking || booking.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const redis = getRedis();
      if (!redis) return;
      await redis.del(`customer:loc:${input.bookingId}`);
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
