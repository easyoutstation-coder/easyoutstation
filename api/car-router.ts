import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { cars, carReviews } from "@db/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

export const carRouter = createRouter({
  list: publicQuery
    .input(
      z.object({
        category: z.string().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        seats: z.number().optional(),
        fuelType: z.string().optional(),
        transmission: z.string().optional(),
        search: z.string().optional(),
        isPopular: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const filters = [];

      if (input?.category) {
        filters.push(eq(cars.category, input.category as any));
      }
      if (input?.minPrice) {
        filters.push(gte(cars.pricePerKm, input.minPrice.toString()));
      }
      if (input?.maxPrice) {
        filters.push(lte(cars.pricePerKm, input.maxPrice.toString()));
      }
      if (input?.seats) {
        filters.push(gte(cars.seats, input.seats));
      }
      if (input?.fuelType) {
        filters.push(eq(cars.fuelType, input.fuelType as any));
      }
      if (input?.transmission) {
        filters.push(eq(cars.transmission, input.transmission as any));
      }
      if (input?.search) {
        filters.push(
          sql`${cars.name} LIKE ${`%${input.search}%`} OR ${cars.brand} LIKE ${`%${input.search}%`}`
        );
      }
      if (input?.isPopular) {
        filters.push(eq(cars.isPopular, true));
      }

      const whereClause = filters.length > 0 ? and(...filters) : undefined;

      const results = await db.query.cars.findMany({
        where: whereClause,
        orderBy: [desc(cars.isPopular), desc(cars.rating)],
      });

      return results;
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const car = await db.query.cars.findFirst({
        where: eq(cars.id, input.id),
      });
      return car ?? null;
    }),

  getPopular: publicQuery.query(async () => {
    const db = getDb();
    return await db.query.cars.findMany({
      where: eq(cars.isPopular, true),
      orderBy: [desc(cars.rating)],
      limit: 6,
    });
  }),

  getReviews: publicQuery
    .input(z.object({ carId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return await db.query.carReviews.findMany({
        where: eq(carReviews.carId, input.carId),
        orderBy: [desc(carReviews.createdAt)],
        limit: 10,
      });
    }),

  addReview: authedQuery
    .input(
      z.object({
        carId: z.number(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const userId = ctx.user!.id;
      await db.insert(carReviews).values({
        carId: input.carId,
        userId,
        rating: input.rating,
        comment: input.comment,
      });
      return { success: true };
    }),
});
