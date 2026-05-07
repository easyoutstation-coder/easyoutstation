import { authRouter } from "./auth-router";
import { carRouter } from "./car-router";
import { routeRouter, bookingRouter, searchRouter } from "./route-booking-router";
import { aiRouter } from "./ai-router";
import { razorpayRouter } from "./razorpay-router";
import { smsRouter } from "./sms-router";
import { adminRouter } from "./admin-router";
import { createRouter, publicQuery } from "./middleware";

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
});

export type AppRouter = typeof appRouter;
