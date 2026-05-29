import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { bookings, users, cars } from "@db/schema";
import { eq } from "drizzle-orm";
import { sendBookingEmails, sendBookingSms } from "./lib/notifications";
import { logBookingEvent } from "./lib/bookingEvents";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_SECRET || process.env.RAZORPAY_KEY_SECRET || "";

export const razorpayRouter = createRouter({
  createOrder: publicQuery
    .input(z.object({
      bookingId: z.number(),
      totalPrice: z.number(), // Total trip price in rupees
    }))
    .mutation(async ({ input }) => {
      if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        throw new Error("Razorpay not configured");
      }

      // 10% of trip value, minimum ₹100
      const advanceRupees = Math.max(100, Math.round(input.totalPrice * 0.1));
      const amountPaise = advanceRupees * 100;

      const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");

      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt: `booking_${input.bookingId}`,
          notes: { bookingId: input.bookingId.toString() },
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.description || "Failed to create payment order");
      }

      const order = await response.json();
      return {
        orderId: order.id,
        amount: order.amount,
        advanceRupees,
        currency: order.currency,
        keyId: RAZORPAY_KEY_ID,
      };
    }),

  verifyPayment: publicQuery
    .input(z.object({
      razorpayOrderId: z.string(),
      razorpayPaymentId: z.string(),
      razorpaySignature: z.string(),
      bookingId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const crypto = await import("crypto");
      const expectedSignature = crypto
        .createHmac("sha256", RAZORPAY_KEY_SECRET)
        .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
        .digest("hex");

      if (expectedSignature !== input.razorpaySignature) {
        throw new Error("Payment verification failed — signature mismatch");
      }

      const db = getDb();

      // Mark booking as paid + confirmed
      await db
        .update(bookings)
        .set({ paymentStatus: "paid", status: "confirmed", razorpayPaymentId: input.razorpayPaymentId })
        .where(eq(bookings.id, input.bookingId));
      logBookingEvent(input.bookingId, "payment_received", { paymentId: input.razorpayPaymentId }).catch(() => {});

      // Fetch booking + fall back to user account for missing phone/email
      const booking = await db.query.bookings.findFirst({ where: eq(bookings.id, input.bookingId) });
      if (booking && booking.userId) {
        const [u] = await db.select({ phone: users.phone, email: users.email }).from(users).where(eq(users.id, booking.userId)).limit(1);
        if (!booking.customerPhone && u?.phone) (booking as any).customerPhone = u.phone;
        if (!booking.customerEmail && u?.email) (booking as any).customerEmail = u.email;
      }

      if (booking) {
        const fmt = (d: Date | string | null) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : undefined;
        const pickupDateStr = fmt(booking.pickupDate) ?? String(booking.pickupDate);
        const returnDateStr = booking.returnDate ? fmt(booking.returnDate) : undefined;
        const price = parseFloat(booking.totalPrice);

        try {
          await sendBookingEmails({
            bookingId: booking.id,
            customerName: booking.customerName,
            customerEmail: booking.customerEmail ?? undefined,
            customerPhone: booking.customerPhone ?? undefined,
            fromCity: booking.fromCity,
            toCity: booking.toCity,
            pickupDate: pickupDateStr,
            returnDate: returnDateStr,
            returnTime: booking.returnTime ?? undefined,
            totalKm: booking.totalKm,
            totalPrice: price,
            tripType: booking.tripType,
            passengerCount: booking.passengerCount ?? 1,
            pickupAddress: booking.pickupAddress ?? undefined,
            specialRequests: booking.specialRequests ?? undefined,
          });
        } catch (e) {
          console.error("[verifyPayment] Email send failed:", e);
        }

        if (booking.customerPhone) {
          try {
            let carName = "Car";
            if (booking.carId) {
              const car = await db.select({ name: cars.name }).from(cars).where(eq(cars.id, booking.carId)).limit(1);
              if (car[0]) carName = car[0].name;
            }
            await sendBookingSms(booking.customerPhone, booking.id, booking.fromCity, booking.toCity, pickupDateStr, price, "confirmation", returnDateStr, booking.returnTime ?? undefined, booking.carId ?? undefined, booking.totalKm ?? undefined, booking.customerName, carName);
          } catch (e) {
            console.error("[verifyPayment] SMS send failed:", e);
          }
        }
      }

      return { verified: true, paymentId: input.razorpayPaymentId };
    }),
});
