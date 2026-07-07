const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_SECRET || process.env.RAZORPAY_KEY_SECRET || "";

export async function createRazorpayPaymentLink({
  bookingId,
  customerName,
  customerPhone,
  amountRupees,
  description,
}: {
  bookingId: number;
  customerName: string;
  customerPhone: string;
  amountRupees: number;
  description: string;
}): Promise<string> {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay not configured");
  }

  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
  const expireBy = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours

  const res = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
    body: JSON.stringify({
      amount: Math.round(amountRupees) * 100,
      currency: "INR",
      description,
      customer: {
        name: customerName,
        contact: `+91${customerPhone.slice(-10)}`,
      },
      notify: { sms: false, email: false },
      reminder_enable: false,
      expire_by: expireBy,
      notes: { bookingId: String(bookingId) },
      callback_url: `https://easyoutstation.com/booking?resume=${bookingId}`,
      callback_method: "get",
    }),
  });

  if (!res.ok) {
    const err = await res.json() as any;
    throw new Error(err.error?.description || "Failed to create Razorpay payment link");
  }

  const data = await res.json() as any;
  return data.short_url as string;
}
