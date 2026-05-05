import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_VERIFY_SID = process.env.TWILIO_VERIFY_SID || "";
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || "";

export const smsRouter = createRouter({
  sendOtp: publicQuery
    .input(z.object({ phone: z.string().min(10).max(10) }))
    .mutation(async ({ input }) => {
      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
        throw new Error("SMS service not configured.");
      }

      const to = `+91${input.phone}`;

      // Use Twilio Verify if service SID is available
      if (TWILIO_VERIFY_SID) {
        const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
        const response = await fetch(
          `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SID}/Verifications`,
          {
            method: "POST",
            headers: {
              "Authorization": `Basic ${auth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ To: to, Channel: "sms" }).toString(),
          }
        );
        const data = await response.json();
        console.log("[Twilio Verify Send]", JSON.stringify(data));
        if (data.status === "pending") {
          return { success: true };
        }
        throw new Error(data.message || "Failed to send OTP.");
      }

      // Fallback: use Twilio SMS directly
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: to,
            From: TWILIO_PHONE_NUMBER,
            Body: `Your EasyOutstation OTP is ${otp}. Valid for 10 minutes. Do not share with anyone.`,
          }).toString(),
        }
      );
      const data = await response.json();
      console.log("[Twilio SMS Send]", JSON.stringify(data));
      if (data.sid) {
        return { success: true };
      }
      throw new Error(data.message || "Failed to send OTP.");
    }),

  verifyOtp: publicQuery
    .input(z.object({
      phone: z.string().min(10).max(10),
      otp: z.string().length(6),
    }))
    .mutation(async ({ input }) => {
      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
        throw new Error("SMS service not configured.");
      }

      const to = `+91${input.phone}`;

      // Use Twilio Verify if service SID is available
      if (TWILIO_VERIFY_SID) {
        const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
        const response = await fetch(
          `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SID}/VerificationCheck`,
          {
            method: "POST",
            headers: {
              "Authorization": `Basic ${auth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ To: to, Code: input.otp }).toString(),
          }
        );
        const data = await response.json();
        console.log("[Twilio Verify Check]", JSON.stringify(data));
        if (data.status === "approved") {
          return { verified: true };
        }
        throw new Error("Invalid OTP. Please check and try again.");
      }

      throw new Error("OTP verification service not configured.");
    }),
});
