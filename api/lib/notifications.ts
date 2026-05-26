function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export async function sendBookingSms(
  phone: string,
  bookingId: number,
  fromCity: string,
  toCity: string,
  pickupDate: string,
  totalPrice: number,
  type: "confirmation" | "abandonment" = "confirmation",
  returnDate?: string,
  returnTime?: string
) {
  const apiKey = process.env.FAST2SMS_API_KEY?.trim();
  if (!apiKey) { console.warn("[Fast2SMS] FAST2SMS_API_KEY not set"); return; }
  const number = phone.replace(/\D/g, "").slice(-10);
  if (number.length !== 10) { console.warn("[Fast2SMS] Invalid phone:", phone); return; }

  let message: string;
  if (type === "abandonment") {
    message = `EasyOutstation: You left your booking incomplete! ${fromCity} to ${toCity} on ${pickupDate}. Fare: Rs ${totalPrice.toLocaleString("en-IN")}. Complete booking: https://easyoutstation.com/booking?resume=${bookingId} Help: 8796564111`;
  } else {
    message = `EasyOutstation: Booking #${bookingId} CONFIRMED! ${fromCity} to ${toCity}. Pickup: ${pickupDate}${returnDate ? `. Return: ${returnDate}${returnTime ? ` at ${formatTime(returnTime)}` : ""}` : ""}. Fare: Rs ${totalPrice.toLocaleString("en-IN")}. Driver details within 60 mins. Help: 8796564111`;
  }

  const params = new URLSearchParams({
    authorization: apiKey,
    route: "q",
    message,
    language: "english",
    flash: "0",
    numbers: number,
  });
  try {
    const res = await fetch(`https://www.fast2sms.com/dev/bulkV2?${params.toString()}`);
    const data = await res.json() as any;
    if (data.return === true) {
      console.log(`[Fast2SMS] SMS (${type}) sent to ${number}, request_id: ${data.request_id}`);
    } else {
      console.error("[Fast2SMS] Failed:", JSON.stringify(data));
    }
  } catch (e) {
    console.error("[Fast2SMS] Request error:", e);
  }
}

export async function sendBookingEmails(
  input: {
    bookingId: number;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
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
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return;

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

  const resumeLink = `https://easyoutstation.com/booking?resume=${input.bookingId}`;

  if (type === "abandonment") {
    // Only send to team — they can follow up — and to customer if email available
    const teamBody = `Abandoned booking alert!\n\nCustomer started but did not complete payment.\nResume link: ${resumeLink}\n\n${bookingDetails}`;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "EasyOutstation Bookings <bookings@easyoutstation.com>",
        to: ["easyoutstation@gmail.com"],
        subject: `⚠️ Abandoned Booking #${input.bookingId} — ${input.fromCity} → ${input.toCity}`,
        text: teamBody,
      }),
    });

    if (input.customerEmail) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "EasyOutstation <bookings@easyoutstation.com>",
          to: [input.customerEmail],
          subject: `Complete Your Booking — ${input.fromCity} → ${input.toCity} | EasyOutstation`,
          text: `Dear ${input.customerName},

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
        }),
      });
    }
    return;
  }

  // Confirmation emails
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from: "EasyOutstation Bookings <bookings@easyoutstation.com>",
      to: ["easyoutstation@gmail.com"],
      subject: `✅ Booking Confirmed #${input.bookingId} — ${input.fromCity} → ${input.toCity} | ${input.pickupDate}`,
      text: `Payment received! Booking confirmed.\n\n${bookingDetails}`,
    }),
  });

  if (input.customerEmail) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "EasyOutstation <bookings@easyoutstation.com>",
        to: [input.customerEmail],
        subject: `Booking Confirmed #${input.bookingId} — ${input.fromCity} → ${input.toCity} | EasyOutstation`,
        text: `Dear ${input.customerName},

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
      }),
    });
  }
}

async function sendResend(to: string, subject: string, text: string) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY || !to) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: "EasyOutstation <bookings@easyoutstation.com>", to: [to], subject, text }),
  }).catch(console.error);
}

async function sendSms(phone: string, message: string) {
  const apiKey = process.env.FAST2SMS_API_KEY?.trim();
  if (!apiKey) return;
  const number = phone.replace(/\D/g, "").slice(-10);
  if (number.length !== 10) return;
  const params = new URLSearchParams({ authorization: apiKey, route: "q", message, language: "english", flash: "0", numbers: number });
  await fetch(`https://www.fast2sms.com/dev/bulkV2?${params.toString()}`).catch(console.error);
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

  if (input.referrerEmail) await sendResend(input.referrerEmail, subject, text);
  if (input.referrerPhone) await sendSms(input.referrerPhone, `EasyOutstation: ${input.referredName} joined using your referral! Earn ₹100 after their first completed ride. Track: easyoutstation.com/dashboard`);
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

  // Email to referrer
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

  // Email to referred user
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
  if (input.referrerEmail) await sendResend(input.referrerEmail, creditSubject, referrerText);
  if (input.referredEmail) await sendResend(input.referredEmail, creditSubject, referredText);
  if (input.referrerPhone) await sendSms(input.referrerPhone, `EasyOutstation: ₹${input.amount} referral credit added! Valid till ${expiryStr}. Use on your next booking at easyoutstation.com`);
  if (input.referredPhone) await sendSms(input.referredPhone, `EasyOutstation: ₹${input.amount} welcome credit added! Valid till ${expiryStr}. Book at easyoutstation.com`);
}
