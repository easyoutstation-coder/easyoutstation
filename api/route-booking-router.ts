import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { routes, bookings, userSearches } from "@db/schema";
import { eq, and, like, desc, sql } from "drizzle-orm";

async function sendBookingEmails(input: {
  bookingId: number;
  customerName: string;
  customerEmail?: string;
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
Booking ID: #${input.bookingId}
Customer: ${input.customerName}
Route: ${input.fromCity} → ${input.toCity}
Date: ${input.pickupDate}
Distance: ${input.totalKm} km
Trip Type: ${input.tripType.replace("_", " ")}
Passengers: ${input.passengerCount}
Total Price: ₹${input.totalPrice.toLocaleString()}
${input.pickupAddress ? `Pickup Address: ${input.pickupAddress}` : ""}
${input.specialRequests ? `Special Requests: ${input.specialRequests}` : ""}
  `.trim();

  // Email to EasyOutstation
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "EasyOutstation <bookings@easyoutstation.com>",
      to: ["easyoutstation@gmail.com"],
      subject: `New Booking #${input.bookingId} — ${input.fromCity} to ${input.toCity}`,
      text: `New booking received!\n\n${bookingDetails}\n\nCustomer Email: ${input.customerEmail || "Not provided"}`,
    }),
  });

  // Email to customer if they provided email
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
        subject: `Booking Received — ${input.fromCity} to ${input.toCity} | EasyOutstation`,
        text: `Dear ${input.customerName},\n\nThank you for choosing EasyOutstation! We have received your booking.\n\n${bookingDetails}\n\nWe will send you a confirmation with driver details within 4 hours.\n\nFor any queries, please contact us at easyoutstation@gmail.com\n\nWarm regards,\nTeam EasyOutstation`,
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

      const bookingId = Number((result as any).insertId);

      // Send email notifications
      try {
        await sendBookingEmails({ ...input, bookingId });
      } catch (e) {
        console.error("Email send failed:", e);
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

      await db
        .update(bookings)
        .set({ status: "cancelled" as const })
        .where(and(eq(bookings.id, input.id), eq(bookings.userId, userId)));

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
