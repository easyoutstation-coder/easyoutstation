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
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
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
  category: mysqlEnum("category", ["sedan", "muv", "suv", "premium", "luxury"]).notNull(),
  seats: int("seats").notNull(),
  pricePerKm: decimal("pricePerKm", { precision: 10, scale: 2 }).notNull(),
  driverCharges: decimal("driverCharges", { precision: 10, scale: 2 }).default("400.00").notNull(),
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
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
