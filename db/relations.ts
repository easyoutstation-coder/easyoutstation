import { relations } from "drizzle-orm";
import { users, cars, bookings, routes, carReviews, userSearches, subscriptions } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
  searches: many(userSearches),
  reviews: many(carReviews),
  subscription: many(subscriptions),
}));

export const carsRelations = relations(cars, ({ many }) => ({
  bookings: many(bookings),
  reviews: many(carReviews),
}));

export const routesRelations = relations(routes, ({ many }) => ({
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  car: one(cars, {
    fields: [bookings.carId],
    references: [cars.id],
  }),
  route: one(routes, {
    fields: [bookings.routeId],
    references: [routes.id],
  }),
}));

export const carReviewsRelations = relations(carReviews, ({ one }) => ({
  car: one(cars, {
    fields: [carReviews.carId],
    references: [cars.id],
  }),
  user: one(users, {
    fields: [carReviews.userId],
    references: [users.id],
  }),
}));

export const userSearchesRelations = relations(userSearches, ({ one }) => ({
  user: one(users, {
    fields: [userSearches.userId],
    references: [users.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));
