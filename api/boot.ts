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
    // Extend role enum to include super_admin
    try {
      await db.execute(sql.raw(
        `ALTER TABLE users MODIFY COLUMN role ENUM('user','admin','super_admin') NOT NULL DEFAULT 'user'`
      ));
    } catch { /* already updated */ }
    try {
      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS drivers (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(20) NOT NULL,
          vehicleInfo VARCHAR(255),
          isActive BOOLEAN NOT NULL DEFAULT TRUE,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `));
    } catch { /* table already exists */ }
    try {
      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS expenses (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          category VARCHAR(100) NOT NULL,
          description TEXT,
          amount DECIMAL(12,2) NOT NULL,
          date DATE NOT NULL,
          bookingId BIGINT UNSIGNED,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `));
    } catch { /* table already exists */ }
    // Site settings table + default
    try {
      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS siteSettings (
          \`key\` VARCHAR(100) PRIMARY KEY,
          value TEXT NOT NULL,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `));
      await db.execute(sql.raw(`INSERT IGNORE INTO siteSettings (\`key\`, value) VALUES ('siteOnline', 'true')`));
    } catch { /* already exists */ }
    // Update driver charges to ₹250/day across all cars
    await db.execute(sql.raw(`UPDATE cars SET driverCharges = 250.00`));
    // Master accounts always get super_admin
    await db.execute(sql.raw(
      `UPDATE users SET role = 'super_admin' WHERE phone = '9958556011' OR email = 'parmindersinghtalwar@gmail.com'`
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
