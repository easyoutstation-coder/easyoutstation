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
    message = `EasyOutstation: You left your booking incomplete! ${fromCity} to ${toCity} on ${pickupDate}. Fare: Rs ${totalPrice.toLocaleString("en-IN")}. Complete booking: https://easyoutstation.com/booking?resume=${bookingId} Help: 9958556011`;
  } else {
    message = `EasyOutstation: Booking #${bookingId} CONFIRMED! ${fromCity} to ${toCity}. Pickup: ${pickupDate}${returnDate ? `. Return: ${returnDate}${returnTime ? ` at ${formatTime(returnTime)}` : ""}` : ""}. Fare: Rs ${totalPrice.toLocaleString("en-IN")}. Driver details within 60 mins. Help: 9958556011`;
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

For any queries, call us: 9958556011
Or email: easyoutstation@gmail.com

Have a wonderful journey! 🌟

Warm regards,
Team EasyOutstation`,
      }),
    });
  }
}
