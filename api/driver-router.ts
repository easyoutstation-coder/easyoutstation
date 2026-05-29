import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { initTRPC } from "@trpc/server";
import { getDb } from "./queries/connection";
import { bookings, drivers, users } from "@db/schema";
import { getRedis } from "./lib/redis";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({ transformer: superjson });

// Driver-authed procedure — user must be logged in + phone must be in drivers table
const driverProc = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  const db = getDb();
  const phone10 = (ctx.user.phone ?? "").replace(/\D/g, "").slice(-10);
  const [driver] = await db.select().from(drivers).where(eq(drivers.phone, phone10)).limit(1);
  if (!driver || !driver.isActive) throw new TRPCError({ code: "FORBIDDEN", message: "Driver access only" });
  return next({ ctx: { ...ctx, driver } });
});

const LOCATION_TTL = 7200; // 2 hours in seconds

export const driverRouter = createRouter({
  // Check if logged-in user is a driver
  getProfile: t.procedure.use(async ({ ctx, next }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
    return next({ ctx });
  }).query(async ({ ctx }) => {
    const db = getDb();
    const phone10 = (ctx.user.phone ?? "").replace(/\D/g, "").slice(-10);
    const [driver] = await db.select().from(drivers).where(eq(drivers.phone, phone10)).limit(1);
    return driver ?? null;
  }),

  // Get trips assigned to this driver
  getMyTrips: driverProc.query(async ({ ctx }) => {
    const db = getDb();
    const phone10 = (ctx.user.phone ?? "").replace(/\D/g, "").slice(-10);
    return await db.query.bookings.findMany({
      where: inArray(bookings.status, ["confirmed", "driver_assigned", "completed"]),
      with: { car: true },
    }).then(rows => rows.filter(b => {
      const bp = (b.driverPhone ?? "").replace(/\D/g, "").slice(-10);
      return bp === phone10;
    }));
  }),

  // Verify trip PIN entered by driver
  verifyPin: driverProc
    .input(z.object({ bookingId: z.number(), pin: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const phone10 = (ctx.user.phone ?? "").replace(/\D/g, "").slice(-10);
      const [booking] = await db.select().from(bookings).where(eq(bookings.id, input.bookingId)).limit(1);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND" });
      const bp = (booking.driverPhone ?? "").replace(/\D/g, "").slice(-10);
      if (bp !== phone10) throw new TRPCError({ code: "FORBIDDEN" });
      if ((booking.tripPin ?? "").toUpperCase() !== input.pin.toUpperCase()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Incorrect PIN. Please ask the customer for their 6-character trip PIN." });
      }
      return { verified: true };
    }),

  // Store driver GPS location in Redis
  updateLocation: driverProc
    .input(z.object({ bookingId: z.number(), lat: z.number(), lng: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const redis = getRedis();
      if (!redis) return;
      const key = `driver:loc:${input.bookingId}`;
      await redis.set(key, JSON.stringify({ lat: input.lat, lng: input.lng, ts: Date.now() }), "EX", LOCATION_TTL);
    }),

  // Stop sharing — delete Redis key
  stopSharing: driverProc
    .input(z.object({ bookingId: z.number() }))
    .mutation(async ({ input }) => {
      const redis = getRedis();
      if (!redis) return;
      await redis.del(`driver:loc:${input.bookingId}`);
    }),

  // Save FCM web push token
  registerFcmToken: driverProc
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.update(users).set({ fcmToken: input.token }).where(eq(users.id, ctx.user.id));
    }),
});
