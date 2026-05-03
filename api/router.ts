import { authRouter } from "./auth-router";
import { carRouter } from "./car-router";
import { routeRouter, bookingRouter, searchRouter } from "./route-booking-router";
import { aiRouter } from "./ai-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  car: carRouter,
  route: routeRouter,
  booking: bookingRouter,
  search: searchRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
