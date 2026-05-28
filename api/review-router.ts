import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { carReviews, bookings, cars } from "@db/schema";
import { eq, and, avg, count } from "drizzle-orm";

export const reviewRouter = createRouter({
  submit: authedQuery
    .input(z.object({
      bookingId: z.number(),
      rating: z.number().int().min(1).max(5),
      comment: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const userId = ctx.user.id;

      const booking = await db.query.bookings.findFirst({
        where: and(eq(bookings.id, input.bookingId), eq(bookings.userId, userId)),
      });
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      if (booking.status !== "completed") throw new TRPCError({ code: "BAD_REQUEST", message: "Can only review completed trips" });

      const existing = await db.select({ id: carReviews.id }).from(carReviews)
        .where(and(eq(carReviews.userId, userId), eq(carReviews.bookingId, booking.id)))
        .limit(1);
      if (existing.length > 0) throw new TRPCError({ code: "CONFLICT", message: "You have already reviewed this trip" });

      await db.insert(carReviews).values({
        carId: booking.carId,
        userId,
        bookingId: booking.id,
        rating: input.rating,
        comment: input.comment,
      });

      // Recalculate car average rating
      const [stats] = await db.select({
        avg: avg(carReviews.rating),
        total: count(carReviews.id),
      }).from(carReviews).where(eq(carReviews.carId, booking.carId));

      await db.update(cars).set({
        rating: String(parseFloat(stats.avg ?? "0").toFixed(2)),
        reviewCount: stats.total,
      }).where(eq(cars.id, booking.carId));

      return { success: true };
    }),
});
