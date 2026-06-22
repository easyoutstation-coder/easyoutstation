import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { invoices, bookings, users } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import React from "react";
import { InvoicePDF, type InvoiceData } from "./lib/invoice-pdf";
import { dispatchWhatsApp } from "./lib/whatsapp";

// ── Helpers ───────────────────────────────────────────────────────────────────
function getFinancialYear(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return m >= 4 ? `${y}-${String(y + 1).slice(2)}` : `${y - 1}-${String(y).slice(2)}`;
}

async function generatePdfBuffer(data: InvoiceData): Promise<Buffer> {
  const qrDataUrl = await QRCode.toDataURL("https://www.easyoutstation.com", {
    width: 120,
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });
  const element = React.createElement(InvoicePDF, { data, qrDataUrl });
  return renderToBuffer(element) as Promise<Buffer>;
}

async function sendInvoiceEmail(to: string, customerName: string, invoiceNumber: string, pdfBuffer: Buffer): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a">
      <div style="background:#1B3A5C;padding:20px 28px;display:flex;align-items:center;justify-content:space-between">
        <span style="color:#C9A84C;font-size:22px;font-weight:800;letter-spacing:2px">EasyOutstation</span>
        <span style="color:#CBD5E1;font-size:13px">Invoice ${invoiceNumber}</span>
      </div>
      <div style="padding:28px">
        <p style="font-size:15px">Dear <strong>${customerName}</strong>,</p>
        <p>Please find attached your invoice <strong>${invoiceNumber}</strong> from EasyOutstation.</p>
        <p>Thank you for choosing us. For any queries, please contact us at <a href="mailto:bookings@easyoutstation.com">bookings@easyoutstation.com</a> or call <strong>+91 87965 64111</strong>.</p>
        <p style="color:#64748b;font-size:12px;margin-top:24px">EasyOutstation | easyoutstation.com</p>
      </div>
    </div>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: "EasyOutstation <bookings@easyoutstation.com>",
      to: [to],
      subject: `Invoice ${invoiceNumber} — EasyOutstation`,
      html,
      attachments: [{
        filename: `${invoiceNumber.replace(/\//g, "-")}.pdf`,
        content: pdfBuffer.toString("base64"),
      }],
    }),
  }).catch(console.error);
}

// ── Input schemas ─────────────────────────────────────────────────────────────
const lineItemSchema = z.object({
  vehicle: z.string().min(1),
  description: z.string().default(""),
  amount: z.number().min(0),
});

const createSchema = z.object({
  bookingId: z.number().int().positive().optional(),
  customerName: z.string().min(1),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  serviceDate: z.string().min(1),
  duration: z.string().optional(),
  location: z.string().optional(),
  bookingType: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1),
  totalAmount: z.number().positive(),
  notes: z.string().optional(),
});

// ── Router ────────────────────────────────────────────────────────────────────
export const invoiceRouter = createRouter({

  list: adminQuery.query(async () => {
    const db = getDb();
    return db.select().from(invoices).orderBy(desc(invoices.createdAt)).limit(200);
  }),

  get: adminQuery
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [inv] = await db.select().from(invoices).where(eq(invoices.id, input.id)).limit(1);
      if (!inv) throw new TRPCError({ code: "NOT_FOUND" });
      return inv;
    }),

  create: adminQuery
    .input(createSchema)
    .mutation(async ({ input }) => {
      const db = getDb();
      const [result] = await db.insert(invoices).values({
        invoiceNumber: "PENDING",
        bookingId: input.bookingId ?? null,
        customerName: input.customerName,
        customerPhone: input.customerPhone || null,
        customerEmail: input.customerEmail || null,
        serviceDate: input.serviceDate,
        duration: input.duration || null,
        location: input.location || null,
        bookingType: input.bookingType || null,
        lineItemsJson: input.lineItems as any,
        totalAmount: String(input.totalAmount),
        notes: input.notes || null,
      } as any).$returningId();

      const id = result.id;
      const fy = getFinancialYear();
      const invoiceNumber = `EOS/${fy}/${String(id).padStart(4, "0")}`;

      await db.update(invoices).set({ invoiceNumber } as any).where(eq(invoices.id, id));
      return { id, invoiceNumber };
    }),

  update: adminQuery
    .input(createSchema.extend({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...rest } = input;
      await db.update(invoices).set({
        bookingId: rest.bookingId ?? null,
        customerName: rest.customerName,
        customerPhone: rest.customerPhone || null,
        customerEmail: rest.customerEmail || null,
        serviceDate: rest.serviceDate,
        duration: rest.duration || null,
        location: rest.location || null,
        bookingType: rest.bookingType || null,
        lineItemsJson: rest.lineItems as any,
        totalAmount: String(rest.totalAmount),
        notes: rest.notes || null,
      } as any).where(eq(invoices.id, id));
      return { ok: true };
    }),

  generatePdf: adminQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [inv] = await db.select().from(invoices).where(eq(invoices.id, input.id)).limit(1);
      if (!inv) throw new TRPCError({ code: "NOT_FOUND" });

      const data: InvoiceData = {
        invoiceNumber: inv.invoiceNumber,
        date: new Date(inv.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
        customerName: inv.customerName,
        serviceDate: inv.serviceDate,
        duration: inv.duration ?? undefined,
        location: inv.location ?? undefined,
        bookingType: inv.bookingType ?? undefined,
        lineItems: (inv.lineItemsJson as any[]) ?? [],
        totalAmount: Number(inv.totalAmount),
        notes: inv.notes ?? undefined,
      };

      const pdfBuffer = await generatePdfBuffer(data);
      return { pdfBase64: pdfBuffer.toString("base64"), invoiceNumber: inv.invoiceNumber };
    }),

  sendEmail: adminQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [inv] = await db.select().from(invoices).where(eq(invoices.id, input.id)).limit(1);
      if (!inv) throw new TRPCError({ code: "NOT_FOUND" });
      if (!inv.customerEmail) throw new TRPCError({ code: "BAD_REQUEST", message: "No email address on this invoice." });

      const data: InvoiceData = {
        invoiceNumber: inv.invoiceNumber,
        date: new Date(inv.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
        customerName: inv.customerName,
        serviceDate: inv.serviceDate,
        duration: inv.duration ?? undefined,
        location: inv.location ?? undefined,
        bookingType: inv.bookingType ?? undefined,
        lineItems: (inv.lineItemsJson as any[]) ?? [],
        totalAmount: Number(inv.totalAmount),
        notes: inv.notes ?? undefined,
      };

      const pdfBuffer = await generatePdfBuffer(data);
      await sendInvoiceEmail(inv.customerEmail, inv.customerName, inv.invoiceNumber, pdfBuffer);
      await db.update(invoices).set({ emailSentAt: new Date(), status: "sent" } as any).where(eq(invoices.id, input.id));
      return { ok: true };
    }),

  sendWhatsApp: adminQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [inv] = await db.select().from(invoices).where(eq(invoices.id, input.id)).limit(1);
      if (!inv) throw new TRPCError({ code: "NOT_FOUND" });
      if (!inv.customerPhone) throw new TRPCError({ code: "BAD_REQUEST", message: "No phone number on this invoice." });

      const items = (inv.lineItemsJson as any[]) ?? [];
      const itemLines = items.map((it: any, i: number) => `${i + 1}. ${it.vehicle} — ₹${Number(it.amount).toLocaleString("en-IN")}`).join("\n");

      const message = `*Invoice ${inv.invoiceNumber}*\n` +
        `EasyOutstation\n\n` +
        `Dear ${inv.customerName},\n\n` +
        `Please find your invoice details below:\n\n` +
        `*Service Date:* ${inv.serviceDate}\n` +
        (inv.duration ? `*Duration:* ${inv.duration}\n` : "") +
        (inv.location ? `*Location:* ${inv.location}\n` : "") +
        (inv.bookingType ? `*Booking Type:* ${inv.bookingType}\n` : "") +
        `\n*Services:*\n${itemLines}\n\n` +
        `*Total Amount: ₹${Number(inv.totalAmount).toLocaleString("en-IN")}*\n\n` +
        `For queries: bookings@easyoutstation.com | +91 87965 64111\nwww.easyoutstation.com`;

      const phone = inv.customerPhone.replace(/\D/g, "").slice(-10);
      await dispatchWhatsApp(
        phone,
        "eo_booking_confirmed_v2",
        "en",
        [{ type: "body", parameters: [
          { type: "text", text: inv.customerName },
          { type: "text", text: inv.serviceDate },
          { type: "text", text: inv.location || "Local" },
          { type: "text", text: inv.serviceDate },
          { type: "text", text: items.map((it: any) => it.vehicle).join(", ") || "Service" },
          { type: "text", text: String(Number(inv.totalAmount).toLocaleString("en-IN")) },
        ]}],
        { notificationType: "invoice" },
        message,
      ).catch(console.error);

      await db.update(invoices).set({ waSentAt: new Date(), status: "sent" } as any).where(eq(invoices.id, input.id));
      return { ok: true };
    }),

  // Quick lookup of recent bookings for the booking picker
  getRecentBookingsForInvoice: adminQuery.query(async () => {
    const db = getDb();
    return db
      .select({
        id: bookings.id,
        customerName: bookings.customerName,
        customerPhone: bookings.customerPhone,
        customerEmail: bookings.customerEmail,
        fromCity: bookings.fromCity,
        toCity: bookings.toCity,
        pickupDate: bookings.pickupDate,
        tripType: bookings.tripType,
        totalPrice: bookings.totalPrice,
        pickupAddress: bookings.pickupAddress,
      })
      .from(bookings)
      .orderBy(desc(bookings.createdAt))
      .limit(100);
  }),
});
