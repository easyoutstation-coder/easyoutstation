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
import { routes as routesTable } from "@db/schema";
import { runDailyReminders, runPostTripReviews, runAbandonedReminders } from "./workers/cronJobs";
import { startNotificationWorker } from "./workers/notificationWorker";
import { startCronWorker } from "./workers/cronWorker";
import { startWhatsAppWorker } from "./workers/whatsappWorker";
import { startWhatsAppInboundWorker } from "./workers/whatsappInboundWorker";
import { getWhatsAppInboundQueue } from "./workers/queues";

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
    // Driver charges default — only set on cars that still have the old hardcoded 0 value
    await db.execute(sql.raw(`UPDATE cars SET driverCharges = 250.00 WHERE driverCharges = 0 OR driverCharges IS NULL`));
    // Return pickup time column for round trips
    try { await db.execute(sql.raw(`ALTER TABLE bookings ADD COLUMN returnTime VARCHAR(5)`)); } catch { /* already exists */ }
    // FCM push notification token column
    try { await db.execute(sql.raw(`ALTER TABLE users ADD COLUMN fcmToken TEXT`)); } catch { /* already exists */ }
    // Content management permission column
    try { await db.execute(sql.raw(`ALTER TABLE users ADD COLUMN canManageContent BOOLEAN NOT NULL DEFAULT FALSE`)); } catch { /* already exists */ }
    try { await db.execute(sql.raw(`ALTER TABLE users ADD COLUMN isTestUser BOOLEAN NOT NULL DEFAULT FALSE`)); } catch { /* already exists */ }
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

    // Post-booking automation columns
    try { await db.execute(sql.raw(`ALTER TABLE bookings ADD COLUMN reminderSentAt TIMESTAMP NULL`)); } catch { /* already exists */ }
    try { await db.execute(sql.raw(`ALTER TABLE bookings ADD COLUMN reviewSentAt TIMESTAMP NULL`)); } catch { /* already exists */ }
    try { await db.execute(sql.raw(`ALTER TABLE bookings ADD COLUMN abandonmentReminderSentAt TIMESTAMP NULL`)); } catch { /* already exists */ }
    try { await db.execute(sql.raw(`ALTER TABLE bookings ADD COLUMN razorpayPaymentId VARCHAR(100)`)); } catch { /* already exists */ }
    // Notification audit log table
    try {
      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS notificationLogs (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          bookingId BIGINT UNSIGNED NULL,
          userId BIGINT UNSIGNED NULL,
          notificationType VARCHAR(50) NOT NULL,
          channel ENUM('sms','email','push') NOT NULL,
          recipient VARCHAR(320) NOT NULL,
          status ENUM('queued','sent','failed','dead') NOT NULL DEFAULT 'queued',
          attempts INT NOT NULL DEFAULT 0,
          errorMessage TEXT NULL,
          sentAt TIMESTAMP NULL,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `));
    } catch { /* already exists */ }
    // Corporate columns on users
    try { await db.execute(sql.raw(`ALTER TABLE users ADD COLUMN corporateAccountId BIGINT UNSIGNED NULL`)); } catch { /* already exists */ }
    try { await db.execute(sql.raw(`ALTER TABLE users ADD COLUMN corporateRole VARCHAR(20) NULL`)); } catch { /* already exists */ }
    // Corporate accounts table
    try {
      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS corporateAccounts (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          companyName VARCHAR(255) NOT NULL,
          gstin VARCHAR(15),
          email VARCHAR(320),
          phone VARCHAR(20),
          address TEXT,
          joinCode VARCHAR(10) NOT NULL UNIQUE,
          status ENUM('pending','active','suspended') NOT NULL DEFAULT 'pending',
          adminUserId BIGINT UNSIGNED NOT NULL,
          monthlyLimit INT,
          notes TEXT,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `));
    } catch { /* already exists */ }

    // Trip verification PIN column
    try { await db.execute(sql.raw(`ALTER TABLE bookings ADD COLUMN tripPin VARCHAR(6) NULL`)); } catch { /* already exists */ }
    // Escalation alert tracking
    try { await db.execute(sql.raw(`ALTER TABLE bookings ADD COLUMN escalationSentAt TIMESTAMP NULL`)); } catch { /* already exists */ }
    // Booking events audit trail
    try {
      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS bookingEvents (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          bookingId BIGINT UNSIGNED NOT NULL,
          event VARCHAR(50) NOT NULL,
          metaJson JSON NULL,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_bookingEvents_bookingId (bookingId)
        )
      `));
    } catch { /* already exists */ }
    // Extend bookings status enum to include driver_assigned
    try {
      await db.execute(sql.raw(
        `ALTER TABLE bookings MODIFY COLUMN status ENUM('pending','confirmed','driver_assigned','completed','cancelled') NOT NULL DEFAULT 'pending'`
      ));
    } catch { /* already updated */ }
    // Review bookingId column for dedup
    try { await db.execute(sql.raw(`ALTER TABLE carReviews ADD COLUMN bookingId BIGINT UNSIGNED NULL`)); } catch { /* already exists */ }
    // WhatsApp opt-in/out columns
    try { await db.execute(sql.raw(`ALTER TABLE users ADD COLUMN whatsappOptOut BOOLEAN NOT NULL DEFAULT FALSE`)); } catch { /* already exists */ }
    try { await db.execute(sql.raw(`ALTER TABLE users ADD COLUMN whatsappOptIn BOOLEAN NOT NULL DEFAULT FALSE`)); } catch { /* already exists */ }
    try { await db.execute(sql.raw(`ALTER TABLE users ADD COLUMN whatsappOptInAt TIMESTAMP NULL`)); } catch { /* already exists */ }
    // WhatsApp audit log table
    try {
      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS whatsappLogs (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          bookingId BIGINT UNSIGNED NULL,
          userId BIGINT UNSIGNED NULL,
          direction ENUM('outbound','inbound') NOT NULL,
          waMessageId VARCHAR(100) NULL,
          templateName VARCHAR(100) NULL,
          phone VARCHAR(20) NOT NULL,
          messageBody TEXT NULL,
          waStatus ENUM('sent','delivered','read','failed') DEFAULT 'sent',
          failureReason VARCHAR(255) NULL,
          sentAt TIMESTAMP NULL,
          deliveredAt TIMESTAMP NULL,
          readAt TIMESTAMP NULL,
          fallbackSent BOOLEAN NOT NULL DEFAULT FALSE,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `));
    } catch { /* already exists */ }
    // WhatsApp conversation state table
    try {
      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS whatsappConversations (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          phone VARCHAR(20) NOT NULL UNIQUE,
          state VARCHAR(50) NOT NULL DEFAULT 'idle',
          contextJson JSON NULL,
          expiresAt TIMESTAMP NOT NULL,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `));
    } catch { /* already exists */ }

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

// ── WhatsApp webhook — registered FIRST as explicit route handlers ────────────
app.get("/api/webhooks/whatsapp", async (c) => {
  const mode = c.req.query("hub.mode");
  const token = c.req.query("hub.verify_token");
  const challenge = c.req.query("hub.challenge");
  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    console.log("[WA Webhook] Meta verification successful");
    return c.text(challenge ?? "");
  }
  return c.json({ error: "Forbidden" }, 403);
});

app.post("/api/webhooks/whatsapp", async (c) => {
  const rawBody = await c.req.text();
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (appSecret) {
    const { createHmac } = await import("node:crypto");
    const sig = c.req.header("x-hub-signature-256") ?? "";
    const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
    if (sig !== expected) {
      console.warn("[WA Webhook] Invalid signature — rejected");
      return c.json({ error: "Forbidden" }, 403);
    }
  }
  const queue = getWhatsAppInboundQueue();
  if (queue) {
    queue.add(`wa-inbound-${Date.now()}`, { payload: JSON.parse(rawBody) })
      .catch(e => console.error("[WA Webhook] Enqueue failed:", e));
  }
  return c.json({ status: "ok" });
});

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// ── Security headers ──────────────────────────────────────────────────────────
app.use("*", async (c, next) => {
  await next();
  // Prevent clickjacking / iframing
  c.header("X-Frame-Options", "DENY");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  // HSTS — tell browsers to always use HTTPS (1 year)
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  // Content Security Policy — locks down what scripts/styles/frames can load
  c.header("Content-Security-Policy", [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://api.razorpay.com https://www.google-analytics.com https://www.clarity.ms https://www.fast2sms.com https://api.resend.com",
    "frame-src https://api.razorpay.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "));
});

// ── In-memory rate limiter ────────────────────────────────────────────────────
// Sliding window: tracks request timestamps per IP per bucket
const rateLimitStore = new Map<string, number[]>();
// Clean up old entries every 5 minutes to prevent memory growth
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [key, timestamps] of rateLimitStore) {
    const fresh = timestamps.filter(t => t > cutoff);
    if (fresh.length === 0) rateLimitStore.delete(key);
    else rateLimitStore.set(key, fresh);
  }
}, 5 * 60 * 1000);

function rateLimit(bucket: string, maxPerMinute: number) {
  return async (c: any, next: () => Promise<void>) => {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "unknown";
    const key = `${bucket}:${ip}`;
    const now = Date.now();
    const window = 60_000;
    const timestamps = (rateLimitStore.get(key) || []).filter(t => t > now - window);
    if (timestamps.length >= maxPerMinute) {
      return c.json({ error: "Too many requests. Please wait a moment and try again." }, 429);
    }
    timestamps.push(now);
    rateLimitStore.set(key, timestamps);
    await next();
  };
}

// Apply rate limits to sensitive endpoints
app.use("/api/trpc/auth.login", rateLimit("auth", 10));
app.use("/api/trpc/auth.signup", rateLimit("auth", 10));
app.use("/api/trpc/auth.loginWithPhone", rateLimit("auth", 10));
app.use("/api/trpc/auth.verifyOtp", rateLimit("otp", 10));
app.use("/api/trpc/payment.*", rateLimit("payment", 20));
// General API — 120 req/min per IP
app.use("/api/trpc/*", rateLimit("api", 120));

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
  const res = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
  // Prevent browsers from caching API responses — ensures image/data changes
  // show immediately without requiring a hard refresh
  const headers = new Headers(res.headers);
  headers.set("Cache-Control", "no-store");
  return new Response(res.body, { status: res.status, headers });
});

// SMS test — secured with env var key (not hardcoded "easytest")
app.use("/api/test-sms", async (c) => {
  const validKey = process.env.SMS_TEST_KEY || "";
  if (!validKey || c.req.query("key") !== validKey) return c.json({ error: "forbidden" }, 403);
  const phone = c.req.query("phone") || "9958556011";
  const apiKey = process.env.FAST2SMS_API_KEY?.trim();
  if (!apiKey) return c.json({ error: "FAST2SMS_API_KEY not set in Railway" });
  const number = phone.replace(/\D/g, "").slice(-10);
  const params = new URLSearchParams({ authorization: apiKey, route: "q", message: "EasyOutstation test SMS - ignore", language: "english", flash: "0", numbers: number });
  const res = await fetch(`https://www.fast2sms.com/dev/bulkV2?${params}`);
  const data = await res.json();
  return c.json(data);
});


// WhatsApp test endpoint — same key as SMS test
app.use("/api/test-whatsapp", async (c) => {
  const validKey = process.env.SMS_TEST_KEY || "";
  if (!validKey || c.req.query("key") !== validKey) return c.json({ error: "forbidden" }, 403);
  const phone = c.req.query("phone") || "9958556011";
  const { dispatchWhatsApp } = await import("./lib/whatsapp");
  await dispatchWhatsApp(phone, "hello_world", "en_US", [], { notificationType: "test" });
  return c.json({ message: "WhatsApp test dispatched", phone });
});

// Dynamic sitemap — combines static pages + all routes from DB
app.get("/sitemap.xml", async (c) => {
  const today = new Date().toISOString().split("T")[0];
  const base = "https://www.easyoutstation.com";

  const staticPages = [
    { path: "/",            priority: "1.0", changefreq: "daily"   },
    { path: "/cars",        priority: "0.9", changefreq: "daily"   },
    { path: "/routes",      priority: "0.9", changefreq: "weekly"  },
    { path: "/faq",         priority: "0.8", changefreq: "monthly" },
    { path: "/referral",    priority: "0.7", changefreq: "monthly" },
    { path: "/about",       priority: "0.7", changefreq: "monthly" },
    { path: "/cancellation",priority: "0.5", changefreq: "monthly" },
    { path: "/terms",       priority: "0.4", changefreq: "monthly" },
    { path: "/privacy",     priority: "0.4", changefreq: "monthly" },
  ];

  const toUrl = (loc: string, priority: string, changefreq: string) =>
    `  <url><loc>${loc}</loc><lastmod>${today}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;

  const staticXml = staticPages.map(p => toUrl(`${base}${p.path}`, p.priority, p.changefreq));

  let routeXml: string[] = [];
  try {
    const db = getDb();
    const allRoutes = await db.select({ fromCity: routesTable.fromCity, toCity: routesTable.toCity }).from(routesTable);
    routeXml = allRoutes.map(r => {
      const slug = `${r.fromCity.toLowerCase().replace(/\s+/g, "-")}-to-${r.toCity.toLowerCase().replace(/\s+/g, "-")}`;
      return toUrl(`${base}/cab/${slug}`, "0.9", "weekly");
    });
  } catch (e) {
    console.error("[sitemap] DB error:", e);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...staticXml, ...routeXml].join("\n")}\n</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
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
    startNotificationWorker();
    startWhatsAppWorker();
    startWhatsAppInboundWorker();
    await startCronWorker();
    // Run cron jobs immediately on boot, then BullMQ handles hourly repeats
    await runDailyReminders();
    await runPostTripReviews();
    await runAbandonedReminders();
    console.log("[boot] Workers started, post-booking automation active.");
  });
}
