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
    try { await db.execute(sql.raw(`ALTER TABLE bookings ADD COLUMN abandonmentReminder2SentAt TIMESTAMP NULL`)); } catch { /* already exists */ }
    try { await db.execute(sql.raw(`ALTER TABLE bookings ADD COLUMN abandonmentReminder3SentAt TIMESTAMP NULL`)); } catch { /* already exists */ }
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

    // Phase 7/8/10 migrations
    try { await db.execute(sql.raw(`ALTER TABLE users ADD COLUMN tag ENUM('normal','vip','blacklisted') NOT NULL DEFAULT 'normal'`)); } catch { /* already exists */ }
    try { await db.execute(sql.raw(`ALTER TABLE drivers ADD COLUMN vendorId BIGINT UNSIGNED NULL`)); } catch { /* already exists */ }
    try {
      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS vendors (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(20) NOT NULL UNIQUE,
          email VARCHAR(320) NULL,
          company VARCHAR(255) NULL,
          city VARCHAR(100) NULL,
          isActive BOOLEAN NOT NULL DEFAULT TRUE,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `));
    } catch { /* already exists */ }

    // Invoices table
    try {
      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS invoices (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          invoiceNumber VARCHAR(30) NOT NULL UNIQUE,
          bookingId BIGINT UNSIGNED NULL,
          customerName VARCHAR(255) NOT NULL,
          customerPhone VARCHAR(20) NULL,
          customerEmail VARCHAR(320) NULL,
          serviceDate VARCHAR(30) NOT NULL,
          duration VARCHAR(150) NULL,
          location TEXT NULL,
          bookingType VARCHAR(100) NULL,
          lineItemsJson JSON NOT NULL,
          totalAmount DECIMAL(12,2) NOT NULL,
          notes TEXT NULL,
          status ENUM('draft','sent') NOT NULL DEFAULT 'draft',
          emailSentAt TIMESTAMP NULL,
          waSentAt TIMESTAMP NULL,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `));
    } catch { /* already exists */ }

    // Driver vehicle fields
    try { await db.execute(sql.raw(`ALTER TABLE drivers ADD COLUMN vehicleNumber VARCHAR(30) NULL`)); } catch { /* already exists */ }
    try { await db.execute(sql.raw(`ALTER TABLE drivers ADD COLUMN vehicleModel VARCHAR(100) NULL`)); } catch { /* already exists */ }
    // Honda Amaze
    try {
      await db.execute(sql.raw(
        `INSERT INTO cars (name, brand, model, category, seats, pricePerKm, driverCharges, imageUrl, description, fuelType, transmission, rating, reviewCount, isAvailable, isPopular)
         SELECT 'Honda Amaze','Honda','Amaze','sedan',4,12.00,250.00,'/cars/honda-amaze.jpg','Compact sedan with comfortable interiors. Toll, parking & state taxes at actuals.','petrol','manual',4.50,20,TRUE,FALSE
         WHERE NOT EXISTS (SELECT 1 FROM cars WHERE name = 'Honda Amaze')`
      ));
    } catch { /* already exists */ }

    // Tata Hexa
    try {
      await db.execute(sql.raw(
        `INSERT INTO cars (name, brand, model, category, seats, pricePerKm, driverCharges, imageUrl, description, fuelType, transmission, rating, reviewCount, isAvailable, isPopular)
         SELECT 'Tata Hexa','Tata','Hexa','muv',7,19.00,250.00,'/cars/tata-hexa.jpg','Powerful 6+1 seater MUV with bold design and VARICOR diesel engine. Ideal for family outstation trips. Toll, parking & state taxes at actuals.','diesel','manual',4.65,28,TRUE,FALSE
         WHERE NOT EXISTS (SELECT 1 FROM cars WHERE name = 'Tata Hexa')`
      ));
    } catch { /* already exists */ }

    // Link hub cards for /go page
    try {
      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS linkHubCards (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          label VARCHAR(100) NOT NULL,
          subtitle VARCHAR(150) NULL,
          imageUrl TEXT NOT NULL,
          linkUrl VARCHAR(500) NOT NULL,
          category VARCHAR(50) NULL,
          isPinned BOOLEAN NOT NULL DEFAULT FALSE,
          displayOrder INT NOT NULL DEFAULT 0,
          isActive BOOLEAN NOT NULL DEFAULT TRUE,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `));
    } catch { /* already exists */ }
    try { await db.execute(sql.raw(`ALTER TABLE linkHubCards ADD COLUMN subtitle VARCHAR(150) NULL`)); } catch {}
    try { await db.execute(sql.raw(`ALTER TABLE linkHubCards ADD COLUMN category VARCHAR(50) NULL`)); } catch {}
    try { await db.execute(sql.raw(`ALTER TABLE linkHubCards ADD COLUMN isPinned BOOLEAN NOT NULL DEFAULT FALSE`)); } catch {}
    // Hide non-Delhi routes (only Delhi-originating routes show on /go)
    try { await db.execute(sql.raw(`UPDATE linkHubCards SET isActive=FALSE WHERE linkUrl NOT LIKE '/cab/delhi-to-%'`)); } catch {}
    // Force-update all card images to HD site images (correct destination photo for each route)
    try {
      await db.execute(sql.raw(`
        UPDATE linkHubCards SET imageUrl = CASE linkUrl
          WHEN '/cab/delhi-to-kedarnath'      THEN 'https://images.pexels.com/photos/13047013/pexels-photo-13047013.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop'
          WHEN '/cab/delhi-to-manali'         THEN 'https://images.unsplash.com/photo-1677821374212-8c3e88292b1b?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/delhi-to-shimla'         THEN 'https://images.unsplash.com/photo-1648830802584-ec070946e591?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/delhi-to-rishikesh'      THEN 'https://images.unsplash.com/photo-1642163168826-37f2233297ac?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/delhi-to-haridwar'       THEN 'https://images.unsplash.com/photo-1653392083932-d5e9e7d2ccd1?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/delhi-to-chandigarh'     THEN 'https://images.unsplash.com/photo-1731593597977-acde4913bd19?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/delhi-to-jaipur'         THEN 'https://images.unsplash.com/photo-1578999935853-4ec5fa6c1f60?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/delhi-to-agra'           THEN 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/delhi-to-dharamshala'    THEN 'https://images.unsplash.com/photo-1581321863389-ef7d7bfe4b75?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/delhi-to-nainital'       THEN 'https://images.unsplash.com/photo-1610715936287-6c2ad208cdbf?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/delhi-to-dehradun'       THEN 'https://images.unsplash.com/photo-1590351742170-8737ea2e8ce8?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/delhi-to-mussoorie'      THEN 'https://images.unsplash.com/photo-1637387568999-92c68bdee212?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/delhi-to-mathura'        THEN 'https://images.pexels.com/photos/31626024/pexels-photo-31626024.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop'
          WHEN '/cab/delhi-to-amritsar'       THEN 'https://images.unsplash.com/photo-1623059508779-2542c6e83753?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/delhi-to-kashmir'        THEN 'https://images.pexels.com/photos/12750077/pexels-photo-12750077.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop'
          WHEN '/cab/delhi-to-vaishno-devi'   THEN 'https://images.unsplash.com/photo-1717502713522-543a97e13dab?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/delhi-to-ludhiana'       THEN 'https://images.pexels.com/photos/33134859/pexels-photo-33134859.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop'
          WHEN '/cab/delhi-to-ayodhya'        THEN 'https://images.unsplash.com/photo-1672398760212-08ce34b88c62?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/delhi-to-banaras'        THEN 'https://images.pexels.com/photos/10461752/pexels-photo-10461752.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop'
          WHEN '/cab/delhi-to-jodhpur'        THEN 'https://images.unsplash.com/photo-1566873535350-a3f5d4a804b7?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/delhi-to-udaipur'        THEN 'https://images.unsplash.com/photo-1633702738734-443da2c18f3c?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/delhi-to-pushkar'        THEN 'https://images.unsplash.com/photo-1715168931029-2949161ee406?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/delhi-to-corbett'        THEN 'https://images.unsplash.com/photo-1771922365997-8e687eda46b0?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/delhi-to-kasauli'        THEN 'https://images.unsplash.com/photo-1720678599878-631001ea7bcc?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/delhi-to-dalhousie'      THEN 'https://images.unsplash.com/photo-1589702413183-ca141958b7c5?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/delhi-to-lucknow'        THEN 'https://images.unsplash.com/photo-1583504490792-3ceadbc5147c?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/delhi-to-prayagraj'      THEN 'https://images.pexels.com/photos/31022593/pexels-photo-31022593.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop'
          WHEN '/cab/delhi-to-vrindavan'      THEN 'https://images.unsplash.com/photo-1662376107358-21296a9234f1?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/delhi-to-spiti'          THEN 'https://images.unsplash.com/photo-1653844573020-71f77a0ccb8c?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/delhi-to-mount-abu'      THEN 'https://images.unsplash.com/photo-1652421027969-6df47aab314a?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/delhi-to-lansdowne'      THEN 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/chandigarh-to-manali'    THEN 'https://images.unsplash.com/photo-1677821374212-8c3e88292b1b?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/chandigarh-to-shimla'    THEN 'https://images.unsplash.com/photo-1648830802584-ec070946e591?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/chandigarh-to-dharamshala' THEN 'https://images.unsplash.com/photo-1581321863389-ef7d7bfe4b75?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/chandigarh-to-amritsar'  THEN 'https://images.unsplash.com/photo-1623059508779-2542c6e83753?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/shimla-to-manali'        THEN 'https://images.unsplash.com/photo-1677821374212-8c3e88292b1b?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/shimla-to-dharamshala'   THEN 'https://images.unsplash.com/photo-1581321863389-ef7d7bfe4b75?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/manali-to-leh'           THEN 'https://images.unsplash.com/photo-1591154669695-5f2a8d20c089?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/manali-to-spiti'         THEN 'https://images.unsplash.com/photo-1653844573020-71f77a0ccb8c?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/manali-to-kasol'         THEN 'https://images.pexels.com/photos/2087391/pexels-photo-2087391.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop'
          WHEN '/cab/amritsar-to-dharamshala' THEN 'https://images.unsplash.com/photo-1581321863389-ef7d7bfe4b75?w=800&h=500&q=90&fit=crop&auto=format'
          WHEN '/cab/ludhiana-to-amritsar'    THEN 'https://images.unsplash.com/photo-1623059508779-2542c6e83753?w=800&h=500&q=90&fit=crop&auto=format'
          ELSE imageUrl END
      `));
    } catch {}
    // Update existing rows with category + subtitle
    try {
      await db.execute(sql.raw(`
        UPDATE linkHubCards SET
          category = CASE label
            WHEN 'Delhi → Kedarnath' THEN 'pilgrimage'
            WHEN 'Delhi → Manali' THEN 'hills' WHEN 'Delhi → Shimla' THEN 'hills'
            WHEN 'Delhi → Rishikesh' THEN 'pilgrimage' WHEN 'Delhi → Haridwar' THEN 'pilgrimage'
            WHEN 'Delhi → Chandigarh' THEN 'quick' WHEN 'Delhi → Jaipur' THEN 'rajasthan'
            WHEN 'Delhi → Agra' THEN 'quick' WHEN 'Delhi → Dharamshala' THEN 'hills'
            WHEN 'Delhi → Nainital' THEN 'hills' ELSE category END,
          subtitle = CASE label
            WHEN 'Delhi → Kedarnath' THEN '470 km · 10-11 hrs · from ₹5,890'
            WHEN 'Delhi → Manali' THEN '540 km · 12-14 hrs · from ₹6,730'
            WHEN 'Delhi → Shimla' THEN '350 km · 7-8 hrs · from ₹4,450'
            WHEN 'Delhi → Rishikesh' THEN '250 km · 5-6 hrs · from ₹3,250'
            WHEN 'Delhi → Haridwar' THEN '220 km · 4-5 hrs · from ₹2,890'
            WHEN 'Delhi → Chandigarh' THEN '260 km · 4-5 hrs · from ₹3,370'
            WHEN 'Delhi → Jaipur' THEN '280 km · 4-5 hrs · from ₹3,610'
            WHEN 'Delhi → Agra' THEN '230 km · 3-4 hrs · from ₹3,010'
            WHEN 'Delhi → Dharamshala' THEN '475 km · 10-11 hrs · from ₹5,950'
            WHEN 'Delhi → Nainital' THEN '310 km · 6-7 hrs · from ₹3,970'
            ELSE subtitle END
        WHERE category IS NULL OR subtitle IS NULL
      `));
    } catch {}
    // Force-update subtitle fares for all Delhi routes to post-multiplier amounts
    try {
      await db.execute(sql.raw(`
        UPDATE linkHubCards SET subtitle = CASE linkUrl
          WHEN '/cab/delhi-to-kedarnath'    THEN '470 km · 10-11 hrs · from ₹7,300'
          WHEN '/cab/delhi-to-manali'       THEN '540 km · 12-14 hrs · from ₹8,350'
          WHEN '/cab/delhi-to-shimla'       THEN '350 km · 7-8 hrs · from ₹5,500'
          WHEN '/cab/delhi-to-rishikesh'    THEN '250 km · 5-6 hrs · from ₹4,000'
          WHEN '/cab/delhi-to-haridwar'     THEN '220 km · 4-5 hrs · from ₹3,550'
          WHEN '/cab/delhi-to-chandigarh'   THEN '260 km · 4-5 hrs · from ₹4,150'
          WHEN '/cab/delhi-to-jaipur'       THEN '280 km · 4-5 hrs · from ₹4,450'
          WHEN '/cab/delhi-to-agra'         THEN '230 km · 3-4 hrs · from ₹3,700'
          WHEN '/cab/delhi-to-dharamshala'  THEN '475 km · 10-11 hrs · from ₹7,380'
          WHEN '/cab/delhi-to-nainital'     THEN '310 km · 6-7 hrs · from ₹4,900'
          WHEN '/cab/delhi-to-dehradun'     THEN '300 km · 5-6 hrs · from ₹4,750'
          WHEN '/cab/delhi-to-mussoorie'    THEN '310 km · 6-7 hrs · from ₹4,900'
          WHEN '/cab/delhi-to-mathura'      THEN '175 km · 2-3 hrs · from ₹2,880'
          WHEN '/cab/delhi-to-amritsar'     THEN '460 km · 7-8 hrs · from ₹7,150'
          WHEN '/cab/delhi-to-kashmir'      THEN '820 km · 14-16 hrs · from ₹12,550'
          WHEN '/cab/delhi-to-vaishno-devi' THEN '650 km · 12-13 hrs · from ₹10,000'
          WHEN '/cab/delhi-to-ludhiana'     THEN '310 km · 5-6 hrs · from ₹4,900'
          WHEN '/cab/delhi-to-ayodhya'      THEN '640 km · 10-12 hrs · from ₹9,850'
          WHEN '/cab/delhi-to-banaras'      THEN '820 km · 12-14 hrs · from ₹12,550'
          WHEN '/cab/delhi-to-jodhpur'      THEN '600 km · 9-10 hrs · from ₹9,250'
          WHEN '/cab/delhi-to-udaipur'      THEN '665 km · 10-11 hrs · from ₹10,230'
          WHEN '/cab/delhi-to-pushkar'      THEN '395 km · 6-7 hrs · from ₹6,180'
          WHEN '/cab/delhi-to-corbett'      THEN '250 km · 5-6 hrs · from ₹4,000'
          WHEN '/cab/delhi-to-kasauli'      THEN '315 km · 5-6 hrs · from ₹4,980'
          WHEN '/cab/delhi-to-dalhousie'    THEN '555 km · 10-11 hrs · from ₹8,580'
          WHEN '/cab/delhi-to-lucknow'      THEN '555 km · 7-8 hrs · from ₹8,580'
          WHEN '/cab/delhi-to-prayagraj'    THEN '645 km · 9-10 hrs · from ₹9,930'
          WHEN '/cab/delhi-to-vrindavan'    THEN '155 km · 2.5-3 hrs · from ₹2,580'
          WHEN '/cab/delhi-to-spiti'        THEN '785 km · 14-16 hrs · from ₹12,030'
          WHEN '/cab/delhi-to-mount-abu'    THEN '780 km · 12-13 hrs · from ₹11,950'
          WHEN '/cab/delhi-to-lansdowne'    THEN '265 km · 5-6 hrs · from ₹4,230'
          ELSE subtitle END
        WHERE linkUrl LIKE '/cab/delhi-to-%'
      `));
    } catch {}

    // Insert all 42 routes (skip if linkUrl already exists)
    try {
      const allRoutes = [
        ['Delhi → Dehradun','https://images.unsplash.com/photo-1590351742170-8737ea2e8ce8?w=800&h=500&q=80&fit=crop&auto=format','/cab/delhi-to-dehradun','hills','300 km · 5-6 hrs · from ₹3,850',11],
        ['Delhi → Mussoorie','https://images.unsplash.com/photo-1637387568999-92c68bdee212?w=800&h=500&q=80&fit=crop&auto=format','/cab/delhi-to-mussoorie','hills','310 km · 6-7 hrs · from ₹3,970',12],
        ['Delhi → Mathura','https://images.pexels.com/photos/31626024/pexels-photo-31626024.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop','/cab/delhi-to-mathura','pilgrimage','175 km · 2-3 hrs · from ₹2,350',13],
        ['Delhi → Amritsar','https://images.unsplash.com/photo-1623059508779-2542c6e83753?w=800&h=500&q=80&fit=crop&auto=format','/cab/delhi-to-amritsar','quick','460 km · 7-8 hrs · from ₹5,770',14],
        ['Delhi → Kashmir','https://images.pexels.com/photos/12750077/pexels-photo-12750077.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop','/cab/delhi-to-kashmir','longhaul','820 km · 14-16 hrs · from ₹10,090',15],
        ['Delhi → Vaishno Devi','https://images.unsplash.com/photo-1717502713522-543a97e13dab?w=800&h=500&q=80&fit=crop&auto=format','/cab/delhi-to-vaishno-devi','pilgrimage','650 km · 12-13 hrs · from ₹8,050',16],
        ['Delhi → Ludhiana','https://images.pexels.com/photos/33134859/pexels-photo-33134859.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop','/cab/delhi-to-ludhiana','quick','310 km · 5-6 hrs · from ₹3,970',17],
        ['Delhi → Ayodhya','https://images.unsplash.com/photo-1672398760212-08ce34b88c62?w=800&h=500&q=80&fit=crop&auto=format','/cab/delhi-to-ayodhya','pilgrimage','640 km · 10-12 hrs · from ₹7,930',18],
        ['Delhi → Banaras','https://images.pexels.com/photos/10461752/pexels-photo-10461752.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop','/cab/delhi-to-banaras','pilgrimage','820 km · 12-14 hrs · from ₹10,090',19],
        ['Delhi → Jodhpur','https://images.unsplash.com/photo-1566873535350-a3f5d4a804b7?w=800&h=500&q=80&fit=crop&auto=format','/cab/delhi-to-jodhpur','rajasthan','600 km · 9-10 hrs · from ₹7,450',20],
        ['Delhi → Udaipur','https://images.unsplash.com/photo-1633702738734-443da2c18f3c?w=800&h=500&q=80&fit=crop&auto=format','/cab/delhi-to-udaipur','rajasthan','665 km · 10-11 hrs · from ₹8,230',21],
        ['Delhi → Pushkar','https://images.unsplash.com/photo-1715168931029-2949161ee406?w=800&h=500&q=80&fit=crop&auto=format','/cab/delhi-to-pushkar','rajasthan','395 km · 6-7 hrs · from ₹4,990',22],
        ['Delhi → Corbett','https://images.unsplash.com/photo-1771922365997-8e687eda46b0?w=800&h=500&q=80&fit=crop&auto=format','/cab/delhi-to-corbett','quick','250 km · 5-6 hrs · from ₹3,250',23],
        ['Delhi → Kasauli','https://images.unsplash.com/photo-1720678599878-631001ea7bcc?w=800&h=500&q=80&fit=crop&auto=format','/cab/delhi-to-kasauli','hills','315 km · 5-6 hrs · from ₹4,030',24],
        ['Delhi → Dalhousie','https://images.unsplash.com/photo-1589702413183-ca141958b7c5?w=800&h=500&q=80&fit=crop&auto=format','/cab/delhi-to-dalhousie','hills','555 km · 10-11 hrs · from ₹6,910',25],
        ['Delhi → Lucknow','https://images.unsplash.com/photo-1583504490792-3ceadbc5147c?w=800&h=500&q=80&fit=crop&auto=format','/cab/delhi-to-lucknow','quick','555 km · 7-8 hrs · from ₹6,910',26],
        ['Delhi → Prayagraj','https://images.pexels.com/photos/31022593/pexels-photo-31022593.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop','/cab/delhi-to-prayagraj','pilgrimage','645 km · 9-10 hrs · from ₹7,990',27],
        ['Delhi → Vrindavan','https://images.unsplash.com/photo-1662376107358-21296a9234f1?w=800&h=500&q=80&fit=crop&auto=format','/cab/delhi-to-vrindavan','pilgrimage','155 km · 2.5-3 hrs · from ₹2,110',28],
        ['Delhi → Spiti Valley','https://images.unsplash.com/photo-1653844573020-71f77a0ccb8c?w=800&h=500&q=80&fit=crop&auto=format','/cab/delhi-to-spiti','longhaul','785 km · 14-16 hrs · from ₹9,670',29],
        ['Delhi → Mount Abu','https://images.unsplash.com/photo-1652421027969-6df47aab314a?w=800&h=500&q=80&fit=crop&auto=format','/cab/delhi-to-mount-abu','rajasthan','780 km · 12-13 hrs · from ₹9,610',30],
        ['Delhi → Lansdowne','https://images.pexels.com/photos/10607034/pexels-photo-10607034.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop','/cab/delhi-to-lansdowne','hills','265 km · 5-6 hrs · from ₹3,430',31],
        ['Chandigarh → Manali','https://images.unsplash.com/photo-1677821374212-8c3e88292b1b?w=800&h=500&q=80&fit=crop&auto=format','/cab/chandigarh-to-manali','hills','315 km · 7-8 hrs · from ₹4,030',32],
        ['Chandigarh → Shimla','https://images.unsplash.com/photo-1648830802584-ec070946e591?w=800&h=500&q=80&fit=crop&auto=format','/cab/chandigarh-to-shimla','hills','115 km · 3-4 hrs · from ₹1,630',33],
        ['Chandigarh → Dharamshala','https://images.unsplash.com/photo-1581321863389-ef7d7bfe4b75?w=800&h=500&q=80&fit=crop&auto=format','/cab/chandigarh-to-dharamshala','hills','245 km · 5-6 hrs · from ₹3,190',34],
        ['Chandigarh → Amritsar','https://images.unsplash.com/photo-1623059508779-2542c6e83753?w=800&h=500&q=80&fit=crop&auto=format','/cab/chandigarh-to-amritsar','quick','230 km · 3-4 hrs · from ₹3,010',35],
        ['Shimla → Manali','https://images.unsplash.com/photo-1677821374212-8c3e88292b1b?w=800&h=500&q=80&fit=crop&auto=format','/cab/shimla-to-manali','hills','220 km · 6-7 hrs · from ₹2,890',36],
        ['Shimla → Dharamshala','https://images.unsplash.com/photo-1581321863389-ef7d7bfe4b75?w=800&h=500&q=80&fit=crop&auto=format','/cab/shimla-to-dharamshala','hills','275 km · 6-7 hrs · from ₹3,550',37],
        ['Manali → Leh','https://images.unsplash.com/photo-1591154669695-5f2a8d20c089?w=800&h=500&q=80&fit=crop&auto=format','/cab/manali-to-leh','longhaul','480 km · 12-14 hrs · from ₹5,810',38],
        ['Manali → Spiti','https://images.unsplash.com/photo-1653844573020-71f77a0ccb8c?w=800&h=500&q=80&fit=crop&auto=format','/cab/manali-to-spiti','longhaul','220 km · 7-8 hrs · from ₹2,890',39],
        ['Manali → Kasol','https://images.pexels.com/photos/2087391/pexels-photo-2087391.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&fit=crop','/cab/manali-to-kasol','hills','80 km · 2.5-3 hrs · from ₹1,210',40],
        ['Amritsar → Dharamshala','https://images.unsplash.com/photo-1581321863389-ef7d7bfe4b75?w=800&h=500&q=80&fit=crop&auto=format','/cab/amritsar-to-dharamshala','hills','200 km · 4-5 hrs · from ₹2,650',41],
        ['Ludhiana → Amritsar','https://images.unsplash.com/photo-1623059508779-2542c6e83753?w=800&h=500&q=80&fit=crop&auto=format','/cab/ludhiana-to-amritsar','quick','130 km · 2-2.5 hrs · from ₹1,810',42],
      ];
      for (const [label, imageUrl, linkUrl, category, subtitle, displayOrder] of allRoutes) {
        await db.execute(sql.raw(
          `INSERT INTO linkHubCards (label, imageUrl, linkUrl, category, subtitle, displayOrder, isActive)
           SELECT '${(label as string).replace(/'/g,"\\'")}','${imageUrl}','${linkUrl}','${category}','${(subtitle as string).replace(/'/g,"\\'")}',${displayOrder},TRUE
           WHERE NOT EXISTS (SELECT 1 FROM linkHubCards WHERE linkUrl='${linkUrl}')`
        ));
      }
      // Fix any rows that stored the literal escape ₹ instead of the ₹ symbol
      await db.execute(sql.raw(`UPDATE linkHubCards SET subtitle = REPLACE(subtitle, '\\\\u20B9', '₹') WHERE subtitle LIKE '%\\\\u20B9%'`));
    } catch {}

    // Per-vehicle driver assignments for multi-vehicle offline bookings
    try {
      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS bookingDrivers (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          bookingId BIGINT UNSIGNED NOT NULL,
          vehicleIndex INT NOT NULL DEFAULT 1,
          vehicleLabel VARCHAR(100) NULL,
          driverName VARCHAR(255) NOT NULL,
          driverPhone VARCHAR(20) NOT NULL,
          vehicleNumber VARCHAR(30) NULL,
          vehicleModel VARCHAR(100) NULL,
          notifiedAt TIMESTAMP NULL,
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_bookingDrivers_bookingId (bookingId)
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

app.post("/api/webhooks/razorpay", async (c) => {
  const rawBody = await c.req.text();
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (webhookSecret) {
    const { createHmac } = await import("node:crypto");
    const sig = c.req.header("x-razorpay-signature") ?? "";
    const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    if (sig !== expected) {
      console.warn("[RZP Webhook] Invalid signature — rejected");
      return c.json({ error: "Forbidden" }, 403);
    }
  }

  try {
    const payload = JSON.parse(rawBody);
    const event = payload.event as string;

    if (event === "payment.captured") {
      const payment = payload.payload?.payment?.entity;
      if (!payment) return c.json({ status: "ok" });

      const orderId = payment.order_id as string;
      const paymentId = payment.id as string;

      // Fetch the order to get the receipt (booking_X)
      const rpKeyId = process.env.RAZORPAY_KEY_ID || "";
      const rpSecret = process.env.RAZORPAY_SECRET || process.env.RAZORPAY_KEY_SECRET || "";
      const auth = Buffer.from(`${rpKeyId}:${rpSecret}`).toString("base64");

      const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (!orderRes.ok) return c.json({ status: "ok" });
      const order = await orderRes.json() as any;

      const receipt: string = order.receipt ?? order.notes?.bookingId ? `booking_${order.notes.bookingId}` : "";
      const bookingIdStr = receipt.replace("booking_", "");
      const bookingId = parseInt(bookingIdStr, 10);
      if (!bookingId || isNaN(bookingId)) return c.json({ status: "ok" });

      const { getDb } = await import("./queries/connection");
      const { bookings, users, cars } = await import("@db/schema");
      const { eq } = await import("drizzle-orm");
      const { sendBookingEmails, sendBookingSms } = await import("./lib/notifications");
      const { logBookingEvent } = await import("./lib/bookingEvents");

      const db = getDb();
      const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
      if (!booking) return c.json({ status: "ok" });

      // Skip if already confirmed (verifyPayment already ran)
      if (booking.paymentStatus === "paid") return c.json({ status: "ok" });

      await db.update(bookings)
        .set({ paymentStatus: "paid", status: "confirmed", razorpayPaymentId: paymentId })
        .where(eq(bookings.id, bookingId));
      logBookingEvent(bookingId, "payment_received", { paymentId, source: "webhook" }).catch(() => {});

      // Resolve contact from users table if missing
      let bk = { ...booking } as any;
      if ((!bk.customerPhone || !bk.customerEmail) && bk.userId) {
        const [u] = await db.select({ phone: users.phone, email: users.email }).from(users).where(eq(users.id, bk.userId)).limit(1);
        if (!bk.customerPhone) bk.customerPhone = u?.phone ?? null;
        if (!bk.customerEmail) bk.customerEmail = u?.email ?? null;
      }

      const fmt = (d: Date | string | null) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : undefined;
      const pickupDateStr = fmt(bk.pickupDate) ?? String(bk.pickupDate);
      const returnDateStr = bk.returnDate ? fmt(bk.returnDate) : undefined;
      const price = parseFloat(bk.totalPrice);

      try {
        await sendBookingEmails({
          bookingId: bk.id, customerName: bk.customerName, customerEmail: bk.customerEmail ?? undefined,
          customerPhone: bk.customerPhone ?? undefined, fromCity: bk.fromCity, toCity: bk.toCity,
          pickupDate: pickupDateStr, returnDate: returnDateStr, returnTime: bk.returnTime ?? undefined,
          totalKm: bk.totalKm, totalPrice: price, tripType: bk.tripType,
          passengerCount: bk.passengerCount ?? 1, pickupAddress: bk.pickupAddress ?? undefined,
          specialRequests: bk.specialRequests ?? undefined,
        });
      } catch (e) { console.error("[RZP Webhook] Email failed:", e); }

      if (bk.customerPhone) {
        try {
          let carName = "Car";
          if (bk.carId) {
            const [car] = await db.select({ name: cars.name }).from(cars).where(eq(cars.id, bk.carId)).limit(1);
            if (car) carName = car.name;
          }
          await sendBookingSms(bk.customerPhone, bk.id, bk.fromCity, bk.toCity, pickupDateStr, price, "confirmation", returnDateStr, bk.returnTime ?? undefined, bk.carId ?? undefined, bk.totalKm ?? undefined, bk.customerName, carName);
        } catch (e) { console.error("[RZP Webhook] SMS failed:", e); }
      }

      console.log(`[RZP Webhook] Booking #${bookingId} confirmed via webhook — payment ${paymentId}`);
    }
  } catch (e) {
    console.error("[RZP Webhook] Processing error:", e);
  }

  return c.json({ status: "ok" });
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
    // runAbandonedReminders is NOT called here — BullMQ handles it hourly.
    // Calling it directly on every boot caused duplicate messages on Railway restarts.
    console.log("[boot] Workers started, post-booking automation active.");
  });
}
