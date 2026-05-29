import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, inArray, desc } from "drizzle-orm";
import { createRouter } from "./middleware";
import { initTRPC } from "@trpc/server";
import { getDb } from "./queries/connection";
import { bookings, drivers, vendors } from "@db/schema";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({ transformer: superjson });

// Vendor-authed procedure — user must be logged in + phone must be in vendors table
const vendorProc = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  const db = getDb();
  const phone10 = (ctx.user.phone ?? "").replace(/\D/g, "").slice(-10);
  const [vendor] = await db.select().from(vendors).where(eq(vendors.phone, phone10)).limit(1);
  if (!vendor || !vendor.isActive) throw new TRPCError({ code: "FORBIDDEN", message: "Vendor access only" });
  return next({ ctx: { ...ctx, vendor } });
});

export const vendorRouter = createRouter({
  getProfile: t.procedure.use(async ({ ctx, next }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
    return next({ ctx });
  }).query(async ({ ctx }) => {
    const db = getDb();
    const phone10 = (ctx.user.phone ?? "").replace(/\D/g, "").slice(-10);
    const [vendor] = await db.select().from(vendors).where(eq(vendors.phone, phone10)).limit(1);
    return vendor ?? null;
  }),

  // All drivers linked to this vendor
  getMyDrivers: vendorProc.query(async ({ ctx }) => {
    const db = getDb();
    return await db.select().from(drivers)
      .where(eq(drivers.vendorId, ctx.vendor.id));
  }),

  // All trips assigned to any of this vendor's drivers
  getMyTrips: vendorProc.query(async ({ ctx }) => {
    const db = getDb();
    const myDrivers = await db.select({ phone: drivers.phone }).from(drivers)
      .where(eq(drivers.vendorId, ctx.vendor.id));
    if (!myDrivers.length) return [];

    const phones = myDrivers.map(d => d.phone.replace(/\D/g, "").slice(-10));
    const all = await db.query.bookings.findMany({
      where: inArray(bookings.status, ["pending", "confirmed", "driver_assigned", "completed"]),
      orderBy: [desc(bookings.pickupDate)],
      with: { car: true },
    });
    return all.filter(b => {
      const bp = (b.driverPhone ?? "").replace(/\D/g, "").slice(-10);
      return phones.includes(bp);
    });
  }),

  // Vendor confirms they can service a pending booking (sets status to vendor_confirmed)
  confirmTrip: vendorProc
    .input(z.object({ bookingId: z.number(), driverPhone: z.string().min(10) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const phone10 = input.driverPhone.replace(/\D/g, "").slice(-10);

      // Verify driver belongs to this vendor
      const [driver] = await db.select().from(drivers)
        .where(eq(drivers.phone, phone10)).limit(1);
      if (!driver || driver.vendorId !== ctx.vendor.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Driver does not belong to your fleet" });
      }

      await db.update(bookings)
        .set({ driverName: driver.name, driverPhone: phone10, status: "driver_assigned" })
        .where(eq(bookings.id, input.bookingId));

      return { success: true, driverName: driver.name };
    }),

  // Vendor flags a trip they cannot service
  rejectTrip: vendorProc
    .input(z.object({ bookingId: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      // Just add a note — don't cancel the booking (admin should reassign)
      await db.update(bookings)
        .set({ adminNotes: `Vendor rejected: ${input.reason ?? "No reason given"}` } as any)
        .where(eq(bookings.id, input.bookingId));
      return { success: true };
    }),
});
