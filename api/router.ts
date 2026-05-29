import { authRouter } from "./auth-router";
import { carRouter } from "./car-router";
import { routeRouter, bookingRouter, searchRouter } from "./route-booking-router";
import { aiRouter } from "./ai-router";
import { razorpayRouter } from "./razorpay-router";
import { smsRouter } from "./sms-router";
import { adminRouter } from "./admin-router";
import { agentRouter } from "./agent-router";
import { executiveRouter } from "./executive-router";
import { referralRouter } from "./referral-router";
import { corporateRouter } from "./corporate-router";
import { reviewRouter } from "./review-router";
import { driverRouter } from "./driver-router";
import { vendorRouter } from "./vendor-router";
import { createRouter, publicQuery, superAdminQuery } from "./middleware";
import { z } from "zod";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  car: carRouter,
  route: routeRouter,
  booking: bookingRouter,
  search: searchRouter,
  ai: aiRouter,
  payment: razorpayRouter,
  sms: smsRouter,
  admin: adminRouter,
  agent: agentRouter,
  executive: executiveRouter,
  referral: referralRouter,
  corporate: corporateRouter,
  review: reviewRouter,
  driver: driverRouter,
  vendor: vendorRouter,
  testSms: superAdminQuery
    .input(z.object({ phone: z.string() }))
    .mutation(async ({ input }) => {
      const apiKey = process.env.FAST2SMS_API_KEY?.trim();
      if (!apiKey) return { ok: false, error: "FAST2SMS_API_KEY not set in Railway" };
      const number = input.phone.replace(/\D/g, "").slice(-10);
      const params = new URLSearchParams({
        authorization: apiKey,
        route: "q",
        message: "EasyOutstation test SMS. If you received this, SMS is working!",
        language: "english",
        flash: "0",
        numbers: number,
      });
      const res = await fetch(`https://www.fast2sms.com/dev/bulkV2?${params.toString()}`);
      const data = await res.json();
      return { ok: (data as any).return === true, raw: data };
    }),
});

export type AppRouter = typeof appRouter;
