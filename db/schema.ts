import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  int,
  decimal,
  boolean,
  bigint,
  date,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  phone: varchar("phone", { length: 20 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  role: mysqlEnum("role", ["user", "admin", "super_admin"]).default("user").notNull(),
  canManageContent: boolean("canManageContent").default(false).notNull(),
  isTestUser: boolean("isTestUser").default(false).notNull(),
  fcmToken: text("fcmToken"),
  referralCode: varchar("referralCode", { length: 20 }).unique(),
  referredBy: bigint("referredBy", { mode: "number", unsigned: true }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export const cars = mysqlTable("cars", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  brand: varchar("brand", { length: 100 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  category: mysqlEnum("category", ["sedan", "muv", "suv", "premium", "luxury", "tempo", "bus", "electric"]).notNull(),
  seats: int("seats").notNull(),
  pricePerKm: decimal("pricePerKm", { precision: 10, scale: 2 }).notNull(),
  driverCharges: decimal("driverCharges", { precision: 10, scale: 2 }).default("250.00").notNull(),
  minKmPerDay: int("minKmPerDay").default(250).notNull(),
  fuelType: mysqlEnum("fuelType", ["petrol", "diesel", "cng", "hybrid", "electric"]).default("diesel").notNull(),
  transmission: mysqlEnum("transmission", ["manual", "automatic"]).default("manual").notNull(),
  features: text("features"), // JSON array of features
  imageUrl: text("imageUrl"),
  galleryImages: text("galleryImages"), // JSON array of image URLs
  rating: decimal("rating", { precision: 3, scale: 2 }).default("4.50"),
  reviewCount: int("reviewCount").default(0),
  isAvailable: boolean("isAvailable").default(true),
  isPopular: boolean("isPopular").default(false),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const routes = mysqlTable("routes", {
  id: serial("id").primaryKey(),
  fromCity: varchar("fromCity", { length: 100 }).notNull(),
  toCity: varchar("toCity", { length: 100 }).notNull(),
  distanceKm: int("distanceKm").notNull(),
  durationHours: int("durationHours").notNull(),
  basePrice: decimal("basePrice", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("imageUrl"),
  isPopular: boolean("isPopular").default(false),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const bookings = mysqlTable("bookings", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  carId: bigint("carId", { mode: "number", unsigned: true }).notNull(),
  routeId: bigint("routeId", { mode: "number", unsigned: true }),
  fromCity: varchar("fromCity", { length: 100 }).notNull(),
  toCity: varchar("toCity", { length: 100 }).notNull(),
  pickupDate: date("pickupDate").notNull(),
  returnDate: date("returnDate"),
  returnTime: varchar("returnTime", { length: 5 }),
  tripType: mysqlEnum("tripType", ["one_way", "round_trip", "multi_day"]).default("one_way").notNull(),
  passengerCount: int("passengerCount").default(1),
  totalKm: int("totalKm").notNull(),
  totalPrice: decimal("totalPrice", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "completed", "cancelled"]).default("pending").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "refunded"]).default("pending").notNull(),
  customerName: varchar("customerName", { length: 255 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 20 }),
  customerEmail: varchar("customerEmail", { length: 320 }),
  pickupAddress: text("pickupAddress"),
  specialRequests: text("specialRequests"),
  driverName: varchar("driverName", { length: 255 }),
  driverPhone: varchar("driverPhone", { length: 20 }),
  adminNotes: text("adminNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const userSearches = mysqlTable("userSearches", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }),
  fromCity: varchar("fromCity", { length: 100 }),
  toCity: varchar("toCity", { length: 100 }),
  carCategory: varchar("carCategory", { length: 50 }),
  pickupDate: date("pickupDate"),
  passengerCount: int("passengerCount"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const carReviews = mysqlTable("carReviews", {
  id: serial("id").primaryKey(),
  carId: bigint("carId", { mode: "number", unsigned: true }).notNull(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  rating: int("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const expenses = mysqlTable("expenses", {
  id: serial("id").primaryKey(),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  date: date("date").notNull(),
  bookingId: bigint("bookingId", { mode: "number", unsigned: true }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const drivers = mysqlTable("drivers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  vehicleInfo: varchar("vehicleInfo", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const faqs = mysqlTable("faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  position: int("position").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const siteSettings = mysqlTable("siteSettings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const subscriptions = mysqlTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull().unique(),
  plan: mysqlEnum("plan", ["silver", "gold", "platinum"]).default("silver").notNull(),
  hoursPerMonth: int("hoursPerMonth").default(40),
  kmPerMonth: int("kmPerMonth").default(1000),
  pricePerMonth: decimal("pricePerMonth", { precision: 10, scale: 2 }).notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const referralEvents = mysqlTable("referralEvents", {
  id: serial("id").primaryKey(),
  referrerId: bigint("referrerId", { mode: "number", unsigned: true }).notNull(),
  referredUserId: bigint("referredUserId", { mode: "number", unsigned: true }).notNull().unique(),
  qualifyingBookingId: bigint("qualifyingBookingId", { mode: "number", unsigned: true }),
  status: mysqlEnum("status", ["pending", "ride_completed", "points_allocated", "cancelled"]).default("pending").notNull(),
  rideCompletedAt: timestamp("rideCompletedAt"),
  pointsAllocatedAt: timestamp("pointsAllocatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const referralPoints = mysqlTable("referralPoints", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  amount: int("amount").notNull(),
  referralEventId: bigint("referralEventId", { mode: "number", unsigned: true }),
  status: mysqlEnum("status", ["active", "redeemed", "expired"]).default("active").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const corporateAccounts = mysqlTable("corporateAccounts", {
  id: serial("id").primaryKey(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  gstin: varchar("gstin", { length: 15 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  joinCode: varchar("joinCode", { length: 10 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "active", "suspended"]).default("pending").notNull(),
  adminUserId: bigint("adminUserId", { mode: "number", unsigned: true }).notNull(),
  monthlyLimit: int("monthlyLimit"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const corporateEnquiries = mysqlTable("corporateEnquiries", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 10 }).notNull(),
  company: varchar("company", { length: 255 }).notNull(),
  designation: varchar("designation", { length: 255 }),
  teamSize: varchar("teamSize", { length: 50 }),
  requirement: varchar("requirement", { length: 255 }),
  message: text("message"),
  status: mysqlEnum("status", ["new", "called", "closed"]).default("new").notNull(),
  adminNotes: text("adminNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Car = typeof cars.$inferSelect;
export type InsertCar = typeof cars.$inferInsert;
export type Route = typeof routes.$inferSelect;
export type InsertRoute = typeof routes.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;
export type UserSearch = typeof userSearches.$inferSelect;
export type InsertUserSearch = typeof userSearches.$inferInsert;
export type CarReview = typeof carReviews.$inferSelect;
export type InsertCarReview = typeof carReviews.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;
export type Driver = typeof drivers.$inferSelect;
export type InsertDriver = typeof drivers.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
export type Faq = typeof faqs.$inferSelect;
export type InsertFaq = typeof faqs.$inferInsert;
export type ReferralEvent = typeof referralEvents.$inferSelect;
export type ReferralPoint = typeof referralPoints.$inferSelect;
export type CorporateEnquiry = typeof corporateEnquiries.$inferSelect;
export type CorporateAccount = typeof corporateAccounts.$inferSelect;
