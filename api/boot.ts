import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { getDb } from "./queries/connection";
import { sql } from "drizzle-orm";

async function runStartupMigrations() {
  try {
    const db = getDb();
    for (const col of [
      "ALTER TABLE bookings ADD COLUMN driverName VARCHAR(255)",
      "ALTER TABLE bookings ADD COLUMN driverPhone VARCHAR(20)",
      "ALTER TABLE bookings ADD COLUMN adminNotes TEXT",
    ]) {
      try { await db.execute(sql.raw(col)); } catch { /* column already exists */ }
    }
    await db.execute(sql.raw(
      `UPDATE users SET role = 'admin' WHERE phone = '9958556011' OR email = 'parmindersinghtalwar@gmail.com'`
    ));
    console.log("[startup] Migrations applied, admin role set.");
  } catch (e) {
    console.error("[startup] Migration error:", e);
  }
}

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// Allow requests from your Vercel frontend
app.use("*", cors({
  origin: [
    "https://www.easyoutstation.com",
    "https://easyoutstation.com",
    "http://localhost:5173",
  ],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, async () => {
    console.log(`Server running on http://localhost:${port}/`);
    await runStartupMigrations();
  });
}
