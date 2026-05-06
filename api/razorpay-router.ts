import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";

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

      return { verified: true, paymentId: input.razorpayPaymentId };
    }),
});
