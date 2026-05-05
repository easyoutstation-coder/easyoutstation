import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || "";
const MSG91_WIDGET_ID = process.env.MSG91_WIDGET_ID || "";

export const smsRouter = createRouter({
  sendOtp: publicQuery
    .input(z.object({ phone: z.string().min(10).max(10) }))
    .mutation(async ({ input }) => {
      if (!MSG91_AUTH_KEY || !MSG91_WIDGET_ID) {
        throw new Error("SMS service not configured. Please contact support.");
      }

      const response = await fetch(
        `https://control.msg91.com/api/v5/widget/initiate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authkey: MSG91_AUTH_KEY,
          },
          body: JSON.stringify({
            identifier: `91${input.phone}`,
            widget_id: MSG91_WIDGET_ID,
          }),
        }
      );

      const data = await response.json();

      if (data.type === "error") {
        throw new Error(data.message || "Failed to send OTP. Please try again.");
      }

      return { success: true, reqId: data.request_id || "" };
    }),

  verifyOtp: publicQuery
    .input(z.object({
      phone: z.string().min(10).max(10),
      otp: z.string().length(6),
    }))
    .mutation(async ({ input }) => {
      if (!MSG91_AUTH_KEY || !MSG91_WIDGET_ID) {
        throw new Error("SMS service not configured.");
      }

      const response = await fetch(
        `https://control.msg91.com/api/v5/widget/verifyAccessToken`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            authkey: MSG91_AUTH_KEY,
            access_token: input.otp,
          }),
        }
      );

      const data = await response.json();

      if (data.type === "error" || !data.message?.includes("success")) {
        throw new Error("Invalid OTP. Please try again.");
      }

      return { verified: true };
    }),
});
