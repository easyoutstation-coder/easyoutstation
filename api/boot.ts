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
    // FCM push notification token column
    try { await db.execute(sql.raw(`ALTER TABLE users ADD COLUMN fcmToken TEXT`)); } catch { /* already exists */ }
    // Content management permission column
    try { await db.execute(sql.raw(`ALTER TABLE users ADD COLUMN canManageContent BOOLEAN NOT NULL DEFAULT FALSE`)); } catch { /* already exists */ }
    // FAQs table
    try {
      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS faqs (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          position INT NOT NULL DEFAULT 0,
          isActive BOOLEAN NOT NULL DEFAULT TRUE,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `));
    } catch { /* already exists */ }
    // Extend cars category enum to include tempo, bus, electric
    try {
      await db.execute(sql.raw(
        `ALTER TABLE cars MODIFY COLUMN category ENUM('sedan','muv','suv','premium','luxury','tempo','bus','electric') NOT NULL`
      ));
    } catch { /* already updated */ }

    // Insert new fleet (each wrapped individually — skips if name already exists)
    const newFleet = [
      { name: "Tempo Traveller Maharaja (12 Seater)", brand: "Force Motors", model: "1x1 Maharaja Seats", category: "tempo", seats: 12, pricePerKm: "28.00", driverCharges: "500.00", imageUrl: "/cars/tempo-traveller-maharaja.jpg", description: "Luxury 1x1 Maharaja recliner seats. Perfect for group outstation travel. Toll, parking & state taxes at actuals.", fuelType: "diesel", transmission: "manual", rating: "4.70", reviewCount: 45 },
      { name: "Tempo Traveller (16-19 Seater)", brand: "Force Motors", model: "2x1 Pushback Seats", category: "tempo", seats: 19, pricePerKm: "30.00", driverCharges: "500.00", imageUrl: "/cars/tempo-traveller-pushback.jpg", description: "Seats up to 19 passengers with 2x1 pushback recliner seats. Toll, parking & state taxes at actuals.", fuelType: "diesel", transmission: "manual", rating: "4.65", reviewCount: 38 },
      { name: "Force Urbania", brand: "Force Motors", model: "Urbania", category: "tempo", seats: 17, pricePerKm: "35.00", driverCharges: "500.00", imageUrl: "/cars/force-urbania.jpg", description: "Premium Force Urbania luxury van with plush seating. Toll, parking & state taxes at actuals.", fuelType: "diesel", transmission: "manual", rating: "4.80", reviewCount: 29 },
      { name: "Mini Luxury Bus (27 Seater)", brand: "Eicher / Tata / Bharat Benz", model: "27 Seater", category: "bus", seats: 27, pricePerKm: "45.00", driverCharges: "500.00", imageUrl: "/cars/mini-bus-27.jpg", description: "AC 27-seater luxury mini bus. Brand assigned on availability. Toll, parking & state taxes at actuals.", fuelType: "diesel", transmission: "manual", rating: "4.60", reviewCount: 22 },
      { name: "Luxury Bus (35-41 Seater)", brand: "Eicher / Tata / Bharat Benz", model: "35-41 Seater", category: "bus", seats: 41, pricePerKm: "50.00", driverCharges: "500.00", imageUrl: "/cars/luxury-bus-35.jpg", description: "AC 35 to 41-seater luxury bus. Brand assigned on availability. Toll, parking & state taxes at actuals.", fuelType: "diesel", transmission: "manual", rating: "4.62", reviewCount: 18 },
      { name: "Luxury Bus (45 Seater)", brand: "Eicher / Tata / Bharat Benz", model: "45 Seater", category: "bus", seats: 45, pricePerKm: "55.00", driverCharges: "500.00", imageUrl: "/cars/luxury-bus-45.jpg", description: "AC 45-seater luxury bus. Brand assigned on availability. Toll, parking & state taxes at actuals.", fuelType: "diesel", transmission: "manual", rating: "4.58", reviewCount: 15 },
      { name: "Luxury Bus (49 Seater)", brand: "Eicher / Tata / Bharat Benz", model: "49 Seater", category: "bus", seats: 49, pricePerKm: "60.00", driverCharges: "500.00", imageUrl: "/cars/luxury-bus-49.jpg", description: "AC 49-seater luxury bus. Brand assigned on availability. Toll, parking & state taxes at actuals.", fuelType: "diesel", transmission: "manual", rating: "4.55", reviewCount: 12 },
      { name: "BYD eMax 7", brand: "BYD", model: "eMax 7", category: "electric", seats: 7, pricePerKm: "15.00", driverCharges: "250.00", imageUrl: "/cars/byd-emax7.jpg", description: "Zero-emission 7-seater electric MPV. As per availability. Toll, parking & state taxes at actuals.", fuelType: "electric", transmission: "automatic", rating: "4.75", reviewCount: 18 },
      { name: "BYD Atto 3", brand: "BYD", model: "Atto 3", category: "electric", seats: 5, pricePerKm: "15.00", driverCharges: "250.00", imageUrl: "/cars/byd-atto3.jpg", description: "Zero-emission electric SUV with premium interiors. As per availability. Toll, parking & state taxes at actuals.", fuelType: "electric", transmission: "automatic", rating: "4.70", reviewCount: 14 },
    ];
    for (const v of newFleet) {
      try {
        await db.execute(sql.raw(
          `INSERT INTO cars (name, brand, model, category, seats, pricePerKm, driverCharges, imageUrl, description, fuelType, transmission, rating, reviewCount, isAvailable, isPopular)
           SELECT '${v.name}','${v.brand}','${v.model}','${v.category}',${v.seats},${v.pricePerKm},${v.driverCharges},'${v.imageUrl}','${v.description}','${v.fuelType}','${v.transmission}',${v.rating},${v.reviewCount},TRUE,FALSE
           WHERE NOT EXISTS (SELECT 1 FROM cars WHERE name = '${v.name}')`
        ));
      } catch (e) { console.error(`[startup] Failed to insert ${v.name}:`, e); }
    }

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
// SMS test — /api/test-sms?phone=9999999999&key=easytest
app.use("/api/test-sms", async (c) => {
  if (c.req.query("key") !== "easytest") return c.json({ error: "forbidden" }, 403);
  const phone = c.req.query("phone") || "9958556011";
  const apiKey = process.env.FAST2SMS_API_KEY?.trim();
  if (!apiKey) return c.json({ error: "FAST2SMS_API_KEY not set in Railway" });
  const number = phone.replace(/\D/g, "").slice(-10);
  const params = new URLSearchParams({ authorization: apiKey, route: "q", message: "EasyOutstation test SMS - ignore", language: "english", flash: "0", numbers: number });
  const res = await fetch(`https://www.fast2sms.com/dev/bulkV2?${params}`);
  const data = await res.json();
  return c.json(data);
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
