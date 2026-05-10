import { z } from "zod";
import { TRPCError } from "@trpc/server";
import Anthropic from "@anthropic-ai/sdk";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { bookings, drivers } from "@db/schema";
import { eq, and, like, desc } from "drizzle-orm";
import { differenceInHours } from "date-fns";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an AI admin assistant for EasyOutstation, a premium outstation cab service based in Delhi.

You help admins coordinate bookings by searching for bookings, assigning drivers, confirming and cancelling bookings.

Guidelines:
- Always confirm the key details before proposing an action (booking ID, customer name, driver name/phone)
- Be concise — admins are busy, keep responses short and to the point
- When assigning a driver, use the get_drivers tool first to suggest available drivers if the admin hasn't specified one
- Format booking details clearly with route, date, customer, and vehicle
- Today's date is ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_bookings",
    description: "Search bookings by status, pickup date, customer name, or phone number",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["pending", "confirmed", "completed", "cancelled"],
          description: "Filter by booking status",
        },
        date: { type: "string", description: "Filter by pickup date (YYYY-MM-DD)" },
        customerName: { type: "string", description: "Filter by customer name (partial match)" },
        limit: { type: "number", description: "Max results to return (default 10)" },
      },
    },
  },
  {
    name: "get_booking",
    description: "Get full details of a specific booking by ID",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "Booking ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "get_drivers",
    description: "List all active drivers available for assignment",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "confirm_booking",
    description: "Confirm a booking and assign a driver. Sends confirmation email and returns WhatsApp link for the customer.",
    input_schema: {
      type: "object" as const,
      properties: {
        bookingId: { type: "number", description: "Booking ID to confirm" },
        driverName: { type: "string", description: "Full name of the assigned driver" },
        driverPhone: { type: "string", description: "10-digit mobile number of the driver" },
      },
      required: ["bookingId", "driverName", "driverPhone"],
    },
  },
  {
    name: "cancel_booking",
    description: "Cancel a booking as admin (no 24h restriction for admin cancellations)",
    input_schema: {
      type: "object" as const,
      properties: {
        bookingId: { type: "number", description: "Booking ID to cancel" },
        reason: { type: "string", description: "Reason for cancellation" },
      },
      required: ["bookingId"],
    },
  },
  {
    name: "complete_booking",
    description: "Mark a booking as completed after the trip has finished",
    input_schema: {
      type: "object" as const,
      properties: {
        bookingId: { type: "number", description: "Booking ID to mark as completed" },
      },
      required: ["bookingId"],
    },
  },
];

async function executeTool(name: string, input: Record<string, any>): Promise<any> {
  const db = getDb();

  if (name === "search_bookings") {
    const { status, date, customerName, limit = 10 } = input;
    let results = await db.query.bookings.findMany({
      where: status ? eq(bookings.status, status) : undefined,
      orderBy: [desc(bookings.createdAt)],
      limit: 50,
      with: { car: true },
    });
    if (date) {
      const d = new Date(date);
      results = results.filter(b => {
        const pd = new Date(b.pickupDate);
        return pd.toDateString() === d.toDateString();
      });
    }
    if (customerName) {
      const q = customerName.toLowerCase();
      results = results.filter(b =>
        b.customerName?.toLowerCase().includes(q) ||
        b.customerPhone?.includes(customerName)
      );
    }
    return results.slice(0, limit).map(b => ({
      id: b.id,
      status: b.status,
      customerName: b.customerName,
      customerPhone: b.customerPhone,
      route: `${b.fromCity} → ${b.toCity}`,
      pickupDate: new Date(b.pickupDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      car: b.car?.name,
      totalPrice: b.totalPrice,
      driverName: b.driverName,
      driverPhone: b.driverPhone,
    }));
  }

  if (name === "get_booking") {
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, input.id),
      with: { car: true },
    });
    if (!booking) return { error: "Booking not found" };
    const hoursToPickup = differenceInHours(new Date(booking.pickupDate), new Date());
    return {
      id: booking.id,
      status: booking.status,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      customerEmail: booking.customerEmail,
      route: `${booking.fromCity} → ${booking.toCity}`,
      pickupDate: new Date(booking.pickupDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      pickupAddress: booking.pickupAddress,
      tripType: booking.tripType,
      passengers: booking.passengerCount,
      totalKm: booking.totalKm,
      totalPrice: booking.totalPrice,
      car: booking.car?.name,
      driverName: booking.driverName,
      driverPhone: booking.driverPhone,
      specialRequests: booking.specialRequests,
      hoursToPickup,
      adminNotes: (booking as any).adminNotes,
    };
  }

  if (name === "get_drivers") {
    const driverList = await db.query.drivers.findMany({
      where: eq(drivers.isActive, true),
      orderBy: [drivers.name],
    });
    return driverList.map(d => ({
      id: d.id,
      name: d.name,
      phone: d.phone,
      vehicleInfo: d.vehicleInfo,
    }));
  }

  if (name === "confirm_booking") {
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, input.bookingId),
      with: { car: true },
    });
    if (!booking) return { error: "Booking not found" };
    await db.update(bookings).set({
      status: "confirmed",
      driverName: input.driverName,
      driverPhone: input.driverPhone,
    } as any).where(eq(bookings.id, input.bookingId));
    return {
      success: true,
      message: `Booking #${input.bookingId} confirmed. Driver ${input.driverName} (${input.driverPhone}) assigned.`,
      customerPhone: booking.customerPhone,
      customerName: booking.customerName,
      route: `${booking.fromCity} → ${booking.toCity}`,
    };
  }

  if (name === "cancel_booking") {
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, input.bookingId),
    });
    if (!booking) return { error: "Booking not found" };
    await db.update(bookings).set({ status: "cancelled" }).where(eq(bookings.id, input.bookingId));
    return {
      success: true,
      message: `Booking #${input.bookingId} (${booking.fromCity} → ${booking.toCity}) has been cancelled.`,
    };
  }

  if (name === "complete_booking") {
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, input.bookingId),
    });
    if (!booking) return { error: "Booking not found" };
    if (booking.status !== "confirmed") return { error: `Cannot complete a booking with status "${booking.status}"` };
    await db.update(bookings).set({ status: "completed" }).where(eq(bookings.id, input.bookingId));
    return {
      success: true,
      message: `Booking #${input.bookingId} marked as completed.`,
    };
  }

  return { error: `Unknown tool: ${name}` };
}

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.union([z.string(), z.array(z.any())]),
});

export const agentRouter = createRouter({
  chat: adminQuery
    .input(z.object({
      messages: z.array(messageSchema),
    }))
    .mutation(async ({ input }) => {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "ANTHROPIC_API_KEY not configured" });
      }

      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: input.messages as Anthropic.MessageParam[],
        tools: TOOLS,
      });

      if (response.stop_reason === "tool_use") {
        const toolUseBlock = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
        const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
        return {
          type: "tool_proposal" as const,
          text: textBlock?.text ?? "",
          toolName: toolUseBlock!.name,
          toolInput: toolUseBlock!.input as Record<string, any>,
          toolUseId: toolUseBlock!.id,
          rawContent: response.content,
        };
      }

      const text = (response.content.find((b): b is Anthropic.TextBlock => b.type === "text"))?.text ?? "";
      return { type: "text" as const, text };
    }),

  executeAndContinue: adminQuery
    .input(z.object({
      messages: z.array(z.any()),
      toolUseId: z.string(),
      toolName: z.string(),
      toolInput: z.record(z.any()),
    }))
    .mutation(async ({ input }) => {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "ANTHROPIC_API_KEY not configured" });
      }

      let toolResult: any;
      try {
        toolResult = await executeTool(input.toolName, input.toolInput);
      } catch (err: any) {
        toolResult = { error: err.message ?? "Tool execution failed" };
      }

      const followUpMessages: Anthropic.MessageParam[] = [
        ...input.messages,
        {
          role: "user",
          content: [{
            type: "tool_result",
            tool_use_id: input.toolUseId,
            content: JSON.stringify(toolResult),
          }],
        },
      ];

      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: followUpMessages,
        tools: TOOLS,
      });

      const text = (response.content.find((b): b is Anthropic.TextBlock => b.type === "text"))?.text ?? "Done.";
      return {
        type: "text" as const,
        text,
        toolResult,
        toolName: input.toolName,
      };
    }),
});
