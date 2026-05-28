import { getDb } from "../queries/connection";
import { notificationLogs } from "@db/schema";
import { getNotificationQueue } from "../workers/queues";

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

// ── Notification meta type ────────────────────────────────────────────────────

type NotificationMeta = {
  bookingId?: number;
  notificationType: string;
};

// ── Core dispatch helpers (enqueue or fallback to direct send) ────────────────

async function dispatchSms(phone: string, message: string, meta: NotificationMeta): Promise<void> {
  const number = phone.replace(/\D/g, "").slice(-10);
  if (number.length !== 10) { console.warn("[Notify] Invalid phone:", phone); return; }

  const queue = getNotificationQueue();
  if (queue) {
    try {
      const db = getDb();
      const [result] = await db.insert(notificationLogs).values({
        bookingId: meta.bookingId,
        notificationType: meta.notificationType,
        channel: "sms",
        recipient: number,
        status: "queued",
        attempts: 0,
      });
      const logId = Number((result as any).insertId);
      await queue.add(`sms-${meta.notificationType}-${Date.now()}`, {
        channel: "sms",
        logId,
        phone: number,
        message,
        bookingId: meta.bookingId,
        notificationType: meta.notificationType,
      });
      return;
    } catch (e) {
      console.error("[Notify] Enqueue SMS failed, falling back to direct:", e);
    }
  }
  // Direct fallback
  await sendSmsDirectly(number, message);
}

async function dispatchEmail(
  to: string,
  subject: string,
  text: string,
  meta: NotificationMeta,
  from?: string
): Promise<void> {
  if (!to) return;

  const queue = getNotificationQueue();
  if (queue) {
    try {
      const db = getDb();
      const [result] = await db.insert(notificationLogs).values({
        bookingId: meta.bookingId,
        notificationType: meta.notificationType,
        channel: "email",
        recipient: to,
        status: "queued",
        attempts: 0,
      });
      const logId = Number((result as any).insertId);
      await queue.add(`email-${meta.notificationType}-${Date.now()}`, {
        channel: "email",
        logId,
        to,
        subject,
        text,
        from,
        bookingId: meta.bookingId,
        notificationType: meta.notificationType,
      });
      return;
    } catch (e) {
      console.error("[Notify] Enqueue email failed, falling back to direct:", e);
    }
  }
  // Direct fallback
  await sendEmailDirectly(to, subject, text, from);
}

// ── Direct send functions (used as fallback + by worker) ─────────────────────

async function sendSmsDirectly(number: string, message: string): Promise<void> {
  const apiKey = process.env.FAST2SMS_API_KEY?.trim();
  if (!apiKey) { console.warn("[Fast2SMS] FAST2SMS_API_KEY not set"); return; }
  const params = new URLSearchParams({
    authorization: apiKey, route: "q", message, language: "english", flash: "0", numbers: number,
  });
  try {
    const res = await fetch(`https://www.fast2sms.com/dev/bulkV2?${params.toString()}`);
    const data = await res.json() as any;
    if (data.return === true) {
      console.log(`[Fast2SMS] SMS sent to ${number}, request_id: ${data.request_id}`);
    } else {
      console.error("[Fast2SMS] Failed:", JSON.stringify(data));
    }
  } catch (e) { console.error("[Fast2SMS] Request error:", e); }
}

async function sendEmailDirectly(to: string, subject: string, text: string, from?: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: from ?? "EasyOutstation <bookings@easyoutstation.com>",
      to: [to],
      subject,
      text,
    }),
  }).catch(console.error);
}

// ── Public notification functions ─────────────────────────────────────────────

export async function sendBookingSms(
  phone: string,
  bookingId: number,
  fromCity: string,
  toCity: string,
  pickupDate: string,
  totalPrice: number,
  type: "confirmation" | "abandonment" = "confirmation",
  returnDate?: string,
  returnTime?: string,
  carId?: number,
  totalKm?: number
) {
  const number = phone.replace(/\D/g, "").slice(-10);
  if (number.length !== 10) { console.warn("[Fast2SMS] Invalid phone:", phone); return; }

  let message: string;
  if (type === "abandonment") {
    const p = new URLSearchParams({ resume: String(bookingId), from: fromCity, to: toCity });
    if (carId) p.set("carId", String(carId));
    if (totalKm) p.set("distance", String(totalKm));
    const resumeUrl = `https://easyoutstation.com/booking?${p.toString()}`;
    message = `EasyOutstation: You left your booking incomplete! ${fromCity} to ${toCity} on ${pickupDate}. Fare: Rs ${totalPrice.toLocaleString("en-IN")}. Complete booking: ${resumeUrl} Help: 8796564111`;
  } else {
    message = `EasyOutstation: Booking #${bookingId} CONFIRMED! ${fromCity} to ${toCity}. Pickup: ${pickupDate}${returnDate ? `. Return: ${returnDate}${returnTime ? ` at ${formatTime(returnTime)}` : ""}` : ""}. Fare: Rs ${totalPrice.toLocaleString("en-IN")}. Driver details within 60 mins. Help: 8796564111`;
  }

  await dispatchSms(number, message, { bookingId, notificationType: type });
}

export async function sendBookingEmails(
  input: {
    bookingId: number;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    carId?: number;
    fromCity: string;
    toCity: string;
    pickupDate: string;
    returnDate?: string;
    returnTime?: string;
    totalKm: number;
    totalPrice: number;
    tripType: string;
    passengerCount: number;
    pickupAddress?: string;
    specialRequests?: string;
  },
  type: "confirmation" | "abandonment" = "confirmation"
) {
  const bookingDetails = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BOOKING DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Booking ID   : #${input.bookingId}
Customer     : ${input.customerName}
Mobile       : ${input.customerPhone ? `+91-${input.customerPhone}` : "Not provided"}
Email        : ${input.customerEmail || "Not provided"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TRIP DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Route        : ${input.fromCity} → ${input.toCity}
Pickup Date  : ${input.pickupDate}${input.returnDate ? `\nReturn Date  : ${input.returnDate}${input.returnTime ? ` at ${formatTime(input.returnTime)}` : ""}` : ""}
Distance     : ${input.totalKm} km
Trip Type    : ${input.tripType.replace(/_/g, " ").toUpperCase()}
Passengers   : ${input.passengerCount}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FARE BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Fare   : ₹${input.totalPrice.toLocaleString("en-IN")}
(Includes distance charges, driver charges & estimated toll)
Note: Parking charges paid at actuals
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PICKUP DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${input.pickupAddress || "Not provided"}
${input.specialRequests ? `\nNotes: ${input.specialRequests}` : ""}
  `.trim();

  const rp = new URLSearchParams({ resume: String(input.bookingId), from: input.fromCity, to: input.toCity, distance: String(input.totalKm), tripType: input.tripType });
  if (input.carId) rp.set("carId", String(input.carId));
  const resumeLink = `https://easyoutstation.com/booking?${rp.toString()}`;

  const meta: NotificationMeta = { bookingId: input.bookingId, notificationType: type };

  if (type === "abandonment") {
    const teamBody = `Abandoned booking alert!\n\nCustomer started but did not complete payment.\nResume link: ${resumeLink}\n\n${bookingDetails}`;
    await dispatchEmail("easyoutstation@gmail.com",
      `⚠️ Abandoned Booking #${input.bookingId} — ${input.fromCity} → ${input.toCity}`,
      teamBody,
      { ...meta, notificationType: "abandonment-team" },
      "EasyOutstation Bookings <bookings@easyoutstation.com>"
    );

    if (input.customerEmail) {
      await dispatchEmail(input.customerEmail,
        `Complete Your Booking — ${input.fromCity} → ${input.toCity} | EasyOutstation`,
        `Dear ${input.customerName},

We noticed you started a booking but didn't complete the payment.

Your trip details are saved — click the link below to pick up right where you left off:

👉 ${resumeLink}

${bookingDetails}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHY BOOK WITH US?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Fixed fare — no surprise charges
✅ Verified, experienced drivers
✅ 24/7 support: 9958556011

If you have questions or need help, email us at: easyoutstation@gmail.com

Team EasyOutstation`,
        meta
      );
    }
    return;
  }

  // Confirmation
  await dispatchEmail("easyoutstation@gmail.com",
    `✅ Booking Confirmed #${input.bookingId} — ${input.fromCity} → ${input.toCity} | ${input.pickupDate}`,
    `Payment received! Booking confirmed.\n\n${bookingDetails}`,
    { ...meta, notificationType: "confirmation-team" },
    "EasyOutstation Bookings <bookings@easyoutstation.com>"
  );

  if (input.customerEmail) {
    await dispatchEmail(input.customerEmail,
      `Booking Confirmed #${input.bookingId} — ${input.fromCity} → ${input.toCity} | EasyOutstation`,
      `Dear ${input.customerName},

Your booking is CONFIRMED! 🎉 We've received your advance payment.

${bookingDetails}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT HAPPENS NEXT?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Your driver will be assigned within 60 minutes
✅ You will receive your driver's name & contact details
✅ Driver will call you 1 hour before pickup

For any queries, call us: 8796564111
Or email: easyoutstation@gmail.com

Have a wonderful journey! 🌟

Warm regards,
Team EasyOutstation`,
      meta
    );
  }
}

export async function sendReferralJoinNotification(input: {
  referrerName: string;
  referrerEmail?: string;
  referrerPhone?: string;
  referredName: string;
}) {
  const subject = `Your friend joined EasyOutstation using your referral!`;
  const text = `Dear ${input.referrerName},

Great news! ${input.referredName} has joined EasyOutstation using your referral link.

You will earn ₹100 travel credit automatically within 24 hours of their first completed ride. No action needed from your side.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT HAPPENS NEXT?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ ${input.referredName} books and completes their first ride
✅ ₹100 is credited to both your accounts within 24 hours
✅ Credit valid for 90 days — use it on any future booking

Keep sharing your referral link to earn more! There's no limit on referrals.

Track your referrals and points at: https://easyoutstation.com/dashboard

Warm regards,
Team EasyOutstation`;

  const meta: NotificationMeta = { notificationType: "referral-join" };
  if (input.referrerEmail) await dispatchEmail(input.referrerEmail, subject, text, meta);
  if (input.referrerPhone) await dispatchSms(input.referrerPhone, `EasyOutstation: ${input.referredName} joined using your referral! Earn ₹100 after their first completed ride. Track: easyoutstation.com/dashboard`, meta);
}

export async function sendReferralPointsNotification(input: {
  referrerName: string;
  referrerEmail?: string;
  referrerPhone?: string;
  referredName: string;
  referredEmail?: string;
  referredPhone?: string;
  amount: number;
  expiresAt: Date;
  terms: string;
}) {
  const expiryStr = input.expiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const meta: NotificationMeta = { notificationType: "referral-points" };

  const referrerText = `Dear ${input.referrerName},

Your ₹${input.amount} referral credit has been added to your EasyOutstation account! 🎉

${input.referredName} completed their first ride with us, and as promised, you've earned your reward.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREDIT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Amount        : ₹${input.amount}
Valid Until   : ${expiryStr}
How to use    : Credit will be applied automatically on your next booking

Keep referring friends to earn more! Visit: https://easyoutstation.com/dashboard

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TERMS & CONDITIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${input.terms}

Warm regards,
Team EasyOutstation`;

  const referredText = `Dear ${input.referredName},

Welcome to the EasyOutstation family! 🎉

Thank you for completing your first ride with us. As a token of appreciation, ₹${input.amount} travel credit has been added to your account.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREDIT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Amount        : ₹${input.amount}
Valid Until   : ${expiryStr}
How to use    : Credit will be applied automatically on your next booking

You can also earn more by referring your friends! Share your unique link from: https://easyoutstation.com/dashboard

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TERMS & CONDITIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${input.terms}

Warm regards,
Team EasyOutstation`;

  const creditSubject = `₹${input.amount} referral credit added to your account!`;
  if (input.referrerEmail) await dispatchEmail(input.referrerEmail, creditSubject, referrerText, meta);
  if (input.referredEmail) await dispatchEmail(input.referredEmail, creditSubject, referredText, meta);
  if (input.referrerPhone) await dispatchSms(input.referrerPhone, `EasyOutstation: ₹${input.amount} referral credit added! Valid till ${expiryStr}. Use on your next booking at easyoutstation.com`, meta);
  if (input.referredPhone) await dispatchSms(input.referredPhone, `EasyOutstation: ₹${input.amount} welcome credit added! Valid till ${expiryStr}. Book at easyoutstation.com`, meta);
}

export async function sendDriverAssignmentSms(input: {
  driverPhone: string;
  driverName: string;
  customerName: string;
  customerPhone: string;
  fromCity: string;
  toCity: string;
  pickupDate: string;
  pickupAddress?: string | null;
  bookingId: number;
}) {
  const msg = `EasyOutstation: Trip #${input.bookingId} assigned to you. Customer: ${input.customerName} (+91-${input.customerPhone}). Route: ${input.fromCity} to ${input.toCity}. Date: ${input.pickupDate}.${input.pickupAddress ? ` Pickup: ${input.pickupAddress}.` : ""} Help: 9958556011`;
  await dispatchSms(input.driverPhone, msg, { bookingId: input.bookingId, notificationType: "driver-assignment" });
}

export async function sendTripReminder(input: {
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  driverName: string;
  driverPhone: string;
  fromCity: string;
  toCity: string;
  pickupDate: string;
  pickupAddress?: string | null;
  bookingId: number;
}) {
  const route = `${input.fromCity} to ${input.toCity}`;
  const meta: NotificationMeta = { bookingId: input.bookingId, notificationType: "trip-reminder" };

  if (input.customerPhone) {
    await dispatchSms(input.customerPhone,
      `EasyOutstation: Reminder! Your trip ${route} is TOMORROW (${input.pickupDate}). Driver: ${input.driverName}, call +91-${input.driverPhone}.${input.pickupAddress ? ` Pickup: ${input.pickupAddress}.` : ""} Help: 9958556011`,
      meta
    );
  }

  if (input.customerEmail) {
    await dispatchEmail(input.customerEmail,
      `Trip Reminder — Tomorrow: ${route} | EasyOutstation`,
      `Dear ${input.customerName},

Your trip is TOMORROW! Here's everything you need.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TRIP DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Booking ID   : #${input.bookingId}
Route        : ${route}
Date         : ${input.pickupDate}
${input.pickupAddress ? `Pickup       : ${input.pickupAddress}\n` : ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR DRIVER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name         : ${input.driverName}
Mobile       : +91-${input.driverPhone}
(Your driver will call you 1 hour before pickup)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPORTANT REMINDERS
• Keep your pickup address handy
• Toll & parking are paid at actuals during the trip
• For any issues, call us: +91-9958556011

Have a safe and wonderful journey!
Team EasyOutstation`,
      meta
    );
  }

  // SMS to driver
  await dispatchSms(input.driverPhone,
    `EasyOutstation: Reminder! Trip #${input.bookingId} tomorrow (${input.pickupDate}). Customer: ${input.customerName}${input.customerPhone ? `, +91-${input.customerPhone}` : ""}. Route: ${route}.${input.pickupAddress ? ` Pickup: ${input.pickupAddress}.` : ""} Help: 9958556011`,
    { bookingId: input.bookingId, notificationType: "driver-reminder" }
  );
}

export async function sendReviewRequest(input: {
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  fromCity: string;
  toCity: string;
  bookingId: number;
}) {
  const route = `${input.fromCity} to ${input.toCity}`;
  const meta: NotificationMeta = { bookingId: input.bookingId, notificationType: "review-request" };

  if (input.customerPhone) {
    await dispatchSms(input.customerPhone,
      `EasyOutstation: Hope your trip ${route} was great! Rate your experience at easyoutstation.com/dashboard — takes 30 seconds & helps future travelers. Thank you!`,
      meta
    );
  }

  if (input.customerEmail) {
    await dispatchEmail(input.customerEmail,
      `How was your trip ${route}? Leave a quick review | EasyOutstation`,
      `Dear ${input.customerName},

We hope you had a wonderful journey from ${input.fromCity} to ${input.toCity}! 🌟

Your experience matters — a quick 30-second review helps future travelers choose confidently, and helps us keep improving.

Leave your review here: https://easyoutstation.com/dashboard
(Log in → Bookings → Rate your trip)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Booking ID: #${input.bookingId}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thank you for choosing EasyOutstation. We look forward to your next journey!

Warm regards,
Team EasyOutstation
+91-9958556011 | easyoutstation@gmail.com`,
      meta
    );
  }
}

export async function sendCorporateApprovalEmail(input: {
  companyName: string;
  contactName: string;
  email?: string | null;
  phone?: string | null;
  joinCode: string;
}) {
  const text = `Dear ${input.contactName},

Congratulations! Your corporate account for ${input.companyName} has been approved on EasyOutstation. 🎉

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR CORPORATE ACCOUNT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Company      : ${input.companyName}
Join Code    : ${input.joinCode}
Portal       : https://easyoutstation.com/corporate-portal
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT'S NEXT?
1. Log in to your corporate portal at easyoutstation.com/corporate-portal
2. Share your Join Code (${input.joinCode}) with team members so they can link their accounts
3. Book trips — all company bookings will be tracked together with GST invoices

For any help, contact your dedicated account manager:
📞 +91-9958556011
📧 easyoutstation@gmail.com

Welcome aboard!
Team EasyOutstation`;

  const meta: NotificationMeta = { notificationType: "corporate-approval" };
  if (input.email) await dispatchEmail(input.email, `Corporate Account Approved — ${input.companyName} | EasyOutstation`, text, meta);
  if (input.phone) await dispatchSms(input.phone, `EasyOutstation: Corporate account for ${input.companyName} APPROVED! Login at easyoutstation.com/corporate-portal with join code: ${input.joinCode}. Help: 9958556011`, meta);
}

export async function sendRefundNotification(input: {
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  bookingId: number;
  fromCity: string;
  toCity: string;
  amount: number;
}) {
  const text = `Hi ${input.customerName},

Your refund for Booking #${input.bookingId} (${input.fromCity} → ${input.toCity}) has been processed.

Refund Amount: ₹${input.amount.toLocaleString("en-IN")}

The amount will reflect in your original payment method within 5-7 business days.

If you have any questions, contact us:
📞 +91-9958556011
📧 easyoutstation@gmail.com

Thank you for choosing EasyOutstation.`;

  const meta: NotificationMeta = { bookingId: input.bookingId, notificationType: "refund" };
  if (input.customerEmail) await dispatchEmail(input.customerEmail, `Refund Processed — Booking #${input.bookingId} | EasyOutstation`, text, meta);
  if (input.customerPhone) await dispatchSms(input.customerPhone, `EasyOutstation: Refund of Rs.${input.amount} for Booking #${input.bookingId} (${input.fromCity} to ${input.toCity}) processed. Reflects in 5-7 days. Help: 9958556011`, meta);
}
