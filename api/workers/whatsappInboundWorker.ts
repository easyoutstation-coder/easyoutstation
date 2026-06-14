import { Worker, type Job } from "bullmq";
import { eq, sql, desc } from "drizzle-orm";
import { getRedis } from "../lib/redis";
import { getDb } from "../queries/connection";
import { whatsappLogs, whatsappConversations, bookings, drivers, cars, users } from "@db/schema";
import { logBookingEvent } from "../lib/bookingEvents";
import { QUEUE_WHATSAPP_INBOUND, type WhatsAppInboundJobData } from "./queues";
import { sendWhatsAppTextRaw, toWaPhone } from "../lib/whatsapp";
import { notifyCustomerDriverAssigned } from "../lib/notifications";
import Anthropic from "@anthropic-ai/sdk";

const ADMIN_PHONE = process.env.ADMIN_PHONE || "8796564111";

// ── AI booking agent ──────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Destination recognition ───────────────────────────────────────────────────

interface DestinationInfo {
  name: string;
  km: number;
  hours: string;
  highlights: string;
  bestCar: string;
  emoji: string;
}

const DESTINATIONS: Array<{ pattern: RegExp; info: DestinationInfo }> = [
  {
    pattern: /manali|rohtang|solang|kullu/i,
    info: { name: "Manali", km: 540, hours: "12-14", emoji: "🏔️",
      highlights: "Rohtang Pass, Solang Valley, Beas River & Old Manali's cafés",
      bestCar: "Innova Crysta (best for mountain roads)" },
  },
  {
    pattern: /shimla|simla|kufri|chail/i,
    info: { name: "Shimla", km: 350, hours: "8-9", emoji: "🏔️",
      highlights: "Mall Road, Jakhu Temple, Kufri & colonial architecture",
      bestCar: "Innova Crysta or Ertiga" },
  },
  {
    pattern: /chandigarh/i,
    info: { name: "Chandigarh", km: 260, hours: "4-5", emoji: "🏙️",
      highlights: "Rock Garden, Sukhna Lake, Sector 17 & gateway to Himachal",
      bestCar: "Swift Dzire or Ertiga" },
  },
  {
    pattern: /jaipur|pink city/i,
    info: { name: "Jaipur", km: 280, hours: "5-6", emoji: "🏰",
      highlights: "Amber Fort, Hawa Mahal, City Palace & vibrant bazaars",
      bestCar: "Swift Dzire or Ertiga" },
  },
  {
    pattern: /agra|taj mahal|fatehpur/i,
    info: { name: "Agra", km: 230, hours: "3-4", emoji: "🕌",
      highlights: "Taj Mahal, Agra Fort, Fatehpur Sikri & Mehtab Bagh",
      bestCar: "Swift Dzire or Etios" },
  },
  {
    pattern: /rishikesh|rafting|yoga.*retreat/i,
    info: { name: "Rishikesh", km: 250, hours: "5-6", emoji: "🧘",
      highlights: "Laxman Jhula, white-water rafting, yoga ashrams & Ram Jhula",
      bestCar: "Ertiga or Innova" },
  },
  {
    pattern: /haridwar|har ki pauri/i,
    info: { name: "Haridwar", km: 220, hours: "4-5", emoji: "🙏",
      highlights: "Har Ki Pauri Ganga Aarti, Mansa Devi Temple & Chandi Devi",
      bestCar: "Swift Dzire or Ertiga" },
  },
  {
    pattern: /mussoorie|lal tibba|kempty/i,
    info: { name: "Mussoorie", km: 310, hours: "6-7", emoji: "🌄",
      highlights: "Mall Road, Kempty Falls, Lal Tibba viewpoint & Camel's Back Road",
      bestCar: "Innova Crysta or Ertiga" },
  },
  {
    pattern: /nainital|naini lake|bhimtal/i,
    info: { name: "Nainital", km: 310, hours: "6-7", emoji: "🏔️",
      highlights: "Naini Lake, Snow View Point, Mall Road & Bhimtal",
      bestCar: "Innova Crysta (hills) or Ertiga" },
  },
  {
    pattern: /amritsar|golden temple|wagah/i,
    info: { name: "Amritsar", km: 460, hours: "8-9", emoji: "🪯",
      highlights: "Golden Temple, Wagah Border ceremony, Jallianwala Bagh & Punjabi food",
      bestCar: "Innova Crysta or Ertiga" },
  },
  {
    pattern: /dharamshala|dharamsala|mcleod|mcleodganj|triund/i,
    info: { name: "Dharamshala", km: 490, hours: "10-11", emoji: "🏔️",
      highlights: "McLeod Ganj, Triund Trek, Dalai Lama's monastery & Kangra Valley",
      bestCar: "Innova Crysta (best for hills)" },
  },
  {
    pattern: /kashmir|srinagar|gulmarg|pahalgam|dal lake/i,
    info: { name: "Kashmir", km: 820, hours: "14-16", emoji: "❄️",
      highlights: "Dal Lake shikaras, Gulmarg skiing, Pahalgam meadows & Mughal Gardens",
      bestCar: "Innova Crysta or Innova Hycross" },
  },
  {
    pattern: /vaishno|vaishnodevi|katra/i,
    info: { name: "Vaishno Devi", km: 650, hours: "12-13", emoji: "🙏",
      highlights: "Mata Vaishno Devi shrine trek (14 km from Katra), Bhairav temple & Ardhkuwari",
      bestCar: "Innova Crysta or Ertiga" },
  },
  {
    pattern: /mathura|vrindavan|vrindaban/i,
    info: { name: "Mathura & Vrindavan", km: 175, hours: "3-4", emoji: "🪔",
      highlights: "Krishna Janmabhoomi, Banke Bihari Temple, ISKCON & Govardhan Hill",
      bestCar: "Swift Dzire or Etios" },
  },
  {
    pattern: /ayodhya|ram mandir/i,
    info: { name: "Ayodhya", km: 640, hours: "10-12", emoji: "🛕",
      highlights: "Ram Mandir, Saryu Ghats, Kanak Bhawan & Hanuman Garhi",
      bestCar: "Innova Crysta or Ertiga" },
  },
  {
    pattern: /varanasi|banaras|kashi|dashashwamedh/i,
    info: { name: "Varanasi", km: 820, hours: "12-14", emoji: "🪔",
      highlights: "Ganga Aarti at Dashashwamedh Ghat, Kashi Vishwanath Temple & sunrise boat ride",
      bestCar: "Innova Crysta or Innova Hycross" },
  },
  {
    pattern: /ludhiana/i,
    info: { name: "Ludhiana", km: 310, hours: "5-6", emoji: "🏙️",
      highlights: "Industrial capital of Punjab, gateway to Amritsar & Chandigarh",
      bestCar: "Swift Dzire or Ertiga" },
  },
  {
    pattern: /udaipur|city of lakes|pichola/i,
    info: { name: "Udaipur", km: 670, hours: "11-12", emoji: "🏰",
      highlights: "Lake Pichola, City Palace, Jag Mandir & romantic lakeside sunsets",
      bestCar: "Innova Crysta or Ertiga" },
  },
  {
    pattern: /dalhousie|khajjiar|chamba/i,
    info: { name: "Dalhousie", km: 570, hours: "11-12", emoji: "🏔️",
      highlights: "Khajjiar (mini Switzerland), Kalatop Wildlife Sanctuary & colonial charm",
      bestCar: "Innova Crysta (mountain roads)" },
  },
  {
    pattern: /kasauli|subathu|dagshai/i,
    info: { name: "Kasauli", km: 310, hours: "5-6", emoji: "🌲",
      highlights: "Christ Church, Monkey Point, pine forests & peaceful colonial hill station",
      bestCar: "Ertiga or Swift Dzire" },
  },
];

function detectDestination(text: string): DestinationInfo | null {
  for (const d of DESTINATIONS) {
    if (d.pattern.test(text)) return d.info;
  }
  return null;
}

const KNOWN_DISTANCES: Record<string, number> = {
  "delhi-manali": 540, "delhi-shimla": 350, "delhi-chandigarh": 260,
  "delhi-jaipur": 280, "delhi-agra": 230, "delhi-rishikesh": 250,
  "delhi-dehradun": 300, "delhi-haridwar": 220, "delhi-mussoorie": 310,
  "delhi-nainital": 310, "delhi-mathura": 175, "delhi-amritsar": 460,
  "delhi-vrindavan": 180, "delhi-dharamshala": 490, "delhi-kasauli": 310,
  "delhi-mcleod ganj": 500, "delhi-udaipur": 670, "delhi-dalhousie": 570,
};

function routeDistance(from: string, to: string): number {
  const key = `${from.toLowerCase()}-${to.toLowerCase()}`;
  return KNOWN_DISTANCES[key] ?? 300;
}

const AI_TOOLS: Anthropic.Tool[] = [
  {
    name: "list_cars",
    description: "Get all available cars with seat count and price per km",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_fare_estimate",
    description: "Calculate fare for a route and car. Always pass pickup_date. Pass return_date whenever the customer has given a return/drop-off date — the server calculates days from the actual dates so the 250 km/day minimum is applied correctly. For tempo travellers and buses, pass driver_charge_per_day=500. Minimum billing: round trip multi-day = 250 km/day; one-way tempo/bus = 250 km; one-way car (≤7 seats) = 80 km / 8 hrs.",
    input_schema: {
      type: "object" as const,
      properties: {
        from_city: { type: "string" },
        to_city: { type: "string" },
        price_per_km: { type: "number" },
        trip_type: { type: "string", enum: ["one_way", "round_trip"] },
        pickup_date: { type: "string", description: "YYYY-MM-DD pickup date" },
        return_date: { type: "string", description: "YYYY-MM-DD return date. Required for multi-day round trips. Server uses this to compute days and enforce 250 km/day minimum billing. For one-way trips, omit — minimum is 80 km/8 hrs for cars, 250 km for tempo/bus." },
        driver_charge_per_day: { type: "number", description: "Driver charge per day. Default 250 for cars; use 500 for tempo travellers and buses." },
      },
      required: ["from_city", "to_city", "price_per_km", "trip_type", "pickup_date"],
    },
  },
  {
    name: "check_my_booking",
    description: "Look up the customer's latest booking by their phone number",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "create_booking",
    description: "Create the booking once all details are confirmed. Returns a payment link.",
    input_schema: {
      type: "object" as const,
      properties: {
        customer_name: { type: "string" },
        from_city: { type: "string" },
        to_city: { type: "string" },
        pickup_date: { type: "string", description: "YYYY-MM-DD" },
        return_date: { type: "string", description: "YYYY-MM-DD return date for multi-day trips" },
        trip_type: { type: "string", enum: ["one_way", "round_trip"] },
        car_name: { type: "string", description: "Car name exactly as shown in the CARS & RATES section, e.g. 'Innova Crysta', 'Swift Dzire', 'Maruti Ertiga'" },
        total_km: { type: "number" },
        total_price: { type: "number" },
        passenger_count: { type: "number" },
        pickup_address: { type: "string", description: "Full pickup address — mandatory" },
      },
      required: ["customer_name", "from_city", "to_city", "pickup_date", "trip_type", "car_name", "total_km", "total_price", "passenger_count", "pickup_address"],
    },
  },
];

async function executeTool(name: string, input: any, phone: string): Promise<string> {
  const db = getDb();
  const localPhone = phone.slice(-10);

  if (name === "list_cars") {
    const list = await db.select({
      id: cars.id, name: cars.name, seats: cars.seats, pricePerKm: cars.pricePerKm,
      driverCharges: cars.driverCharges, category: cars.category,
    }).from(cars).where(eq(cars.isAvailable, true));
    return JSON.stringify(
      list.map(c => ({
        id: c.id, name: c.name, seats: c.seats,
        pricePerKm: parseFloat(c.pricePerKm),
        driverChargePerDay: parseFloat(c.driverCharges),
      }))
    );
  }

  if (name === "get_fare_estimate") {
    const { from_city, to_city, price_per_km, trip_type, pickup_date, return_date, driver_charge_per_day } = input;
    const dist = routeDistance(from_city, to_city);

    // Mirror website logic exactly (Cars.tsx calcFare)
    // One-way is always 1 driver day. Round trip counts both departure + return day (ceil + 1).
    let days = 1;
    if (trip_type === "round_trip" && pickup_date && return_date) {
      const start = new Date(pickup_date);
      const end = new Date(return_date);
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      days = Math.max(1, diffDays);
    }

    const rawKm = trip_type === "round_trip" ? dist * 2 : dist;
    // Minimum billing rules (matches website Cars.tsx):
    // Round trip multi-day: 250 km/day. One-way heavy (driver ≥500): 250 km. One-way standard: 80 km / 8 hrs.
    const isHeavy = (driver_charge_per_day ?? 250) >= 500;
    let km: number;
    if (trip_type === "round_trip" && days > 1) km = Math.max(rawKm, days * 250);
    else if (isHeavy) km = Math.max(rawKm, 250);
    else km = Math.max(rawKm, 80);
    const driverCharge = (driver_charge_per_day ?? 250) * days;
    const fare = Math.round(km * price_per_km + driverCharge);
    return JSON.stringify({ distance_km: dist, km_billed: km, days, driver_charge: driverCharge, fare_inr: fare, toll_note: "Toll, parking & state taxes: additional at actuals (paid on road, no markup)" });
  }

  if (name === "check_my_booking") {
    const [b] = await db.select().from(bookings)
      .where(eq(bookings.customerPhone, localPhone))
      .orderBy(desc(bookings.id)).limit(1);
    if (!b) return JSON.stringify({ found: false });
    return JSON.stringify({
      found: true, bookingId: b.id, status: b.status, paymentStatus: b.paymentStatus,
      from: b.fromCity, to: b.toCity, pickupDate: b.pickupDate,
      driverName: b.driverName ?? "Not yet assigned", driverPhone: b.driverPhone ?? null,
    });
  }

  if (name === "create_booking") {
    const { customer_name, from_city, to_city, pickup_date, return_date, trip_type, car_name, total_km, total_price, passenger_count, pickup_address } = input;

    const parsedPickupDate = new Date(pickup_date);
    if (isNaN(parsedPickupDate.getTime())) throw new Error(`Invalid pickup_date: "${pickup_date}". Use YYYY-MM-DD format.`);
    const parsedReturnDate = return_date ? new Date(return_date) : null;

    // Fuzzy car name lookup — no numeric IDs needed from Claude
    const allCars = await db.select({ id: cars.id, name: cars.name, category: cars.category })
      .from(cars).where(eq(cars.isAvailable, true));
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const needle = normalize(car_name ?? "");
    const matched = allCars.find(c => {
      const hay = normalize(c.name);
      return hay === needle || hay.includes(needle) || needle.includes(hay);
    });
    if (!matched) {
      const names = bookableCars.map(c => c.name).join(", ");
      throw new Error(`No car matching "${car_name}" found. Available: ${names}`);
    }

    // Link to existing web account if this phone has one
    const [existingUser] = await db.select({ id: users.id })
      .from(users).where(eq(users.phone, localPhone)).limit(1);
    const userId = existingUser?.id ?? 0;

    const [{ insertId }] = await db.insert(bookings).values({
      userId, carId: matched.id,
      fromCity: from_city, toCity: to_city,
      pickupDate: parsedPickupDate,
      returnDate: parsedReturnDate,
      tripType: trip_type,
      passengerCount: Number(passenger_count),
      totalKm: Math.round(Number(total_km)),
      totalPrice: Number(total_price).toFixed(2),
      customerName: customer_name,
      customerPhone: localPhone,
      pickupAddress: pickup_address ?? null,
      paymentStatus: "pending", status: "pending",
    }) as any;

    const bookingId = Number(insertId);
    if (!bookingId) throw new Error("DB insert succeeded but returned no booking ID — please try again.");
    logBookingEvent(bookingId, "booking_created", { fromCity: from_city, toCity: to_city }).catch(() => {});
    return JSON.stringify({ success: true, bookingId, carId: matched.id, paymentUrl: `https://easyoutstation.com/booking?resume=${bookingId}&carId=${matched.id}` });
  }

  return JSON.stringify({ error: "Unknown tool" });
}

const BOOKING_TEMPLATE = `*Name:*
*From:* (Delhi / Noida / Gurgaon / Faridabad / Ghaziabad)
*To:*
*Pickup Date (DD/MM/YYYY):*
*Return Date (DD/MM/YYYY):*
*Passengers:*
*Car:* Sedan / Ertiga / Innova / Crysta / Hycross
*Pickup Address:*`;

function buildSystemPrompt(): string {
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

  return `You are Disha, EasyOutstation's WhatsApp booking assistant. Be warm, concise — no walls of text.
Today's date is ${today}. Always use the correct year when converting dates customers give you (e.g. "next Monday", "June 5").

━━ TEMPLATE REPLIES ━━
When a customer's message contains filled fields like "Name:", "From:", "To:", "Pickup Date:" (they replied to the booking template), extract ALL fields in one pass and immediately call get_fare_estimate — no follow-up questions unless a field is missing or pickup city is outside Delhi NCR.

━━ PICKUP RESTRICTION ━━
Pickups ONLY from Delhi NCR: Delhi, Gurgaon, Noida, Faridabad, Ghaziabad, Rohtak, Sonipat (within 40 km of Delhi). If customer wants pickup from elsewhere, explain and ask if they can be in NCR instead.

━━ AVAILABLE ROUTES (from Delhi NCR) ━━
Manali 540km | Shimla 350km | Chandigarh 260km | Jaipur 280km | Agra 230km
Rishikesh 250km | Dehradun 300km | Haridwar 220km | Mussoorie 310km
Nainital 310km | Mathura 175km | Amritsar 460km
Custom routes also available — use get_fare_estimate with a reasonable distance estimate.

━━ CARS & RATES ━━
CARS (driver ₹250/day):
Swift Dzire ₹12/km 4 seats | Toyota Etios ₹13/km 4 seats
Maruti Ertiga ₹15/km 6 seats | Kia Carens ₹17/km 6 seats
Toyota Innova ₹19/km 6 seats | Innova Crysta ₹20/km 6 seats (best for hills)
Innova Hycross ₹22/km 6 seats (luxury)

TEMPO TRAVELLERS & BUSES (driver ₹500/day — pass driver_charge_per_day=500 to get_fare_estimate):
Tempo Traveller Maharaja ₹28/km 12 seats | Tempo Traveller 16-19 ₹30/km 19 seats
Force Urbania ₹35/km 17 seats (premium)
Mini Luxury Bus ₹45/km 27 seats | Luxury Bus 35 ₹50/km 41 seats
Luxury Bus 45 ₹55/km 45 seats | Luxury Bus 49 ₹60/km 49 seats

When calling create_booking, pass car_name exactly as written above. No numeric car IDs needed.

━━ FARE RULES ━━
- Driver charge: ₹250/day for cars; ₹500/day for tempo travellers & buses. One-way = 1 day. Round trip = ceil(days between dates) + 1 (e.g. Jun 2→Jun 9 = 8 days)
- Toll & parking & state taxes: paid at actuals by customer on road — no markup
- Round trip multi-day: minimum 250 km/day billed.
- One-way cars (≤7 seats): minimum 80 km / 8 hrs billed (e.g. a 50 km trip is still billed as 80 km).
- One-way tempo travellers & buses (>7 seats): minimum 250 km billed.
- Round trip km = distance × 2
- 10% advance online confirms booking; 90% cash/UPI to driver at pickup
- Recommend Crysta or Hycross for hill routes (Manali, Shimla, Mussoorie, Nainital)
- For groups 7–12: Tempo Traveller Maharaja. Groups 13–17: Force Urbania. Groups 18–19: Tempo Traveller 16-19. Groups 20–27: Mini Luxury Bus. Groups 28+: suggest appropriate bus size.

━━ CANCELLATION POLICY ━━
>24 hrs before pickup → 100% refund
12–24 hrs before pickup → 50% refund of advance
<12 hrs before pickup → no refund

━━ BOOKING CHECKLIST (all mandatory) ━━
1. Customer name  2. Pickup city/area (Delhi NCR only)  3. Destination
4. Pickup date → YYYY-MM-DD  5. Return date → YYYY-MM-DD (same as pickup for same-day round trip)
6. Trip type: one_way or round_trip  7. Passenger count
8. Car choice (suggest by group size & route)
9. Full pickup address — ALWAYS ask, NEVER skip

FLOW: Collect details → call get_fare_estimate with BOTH pickup_date AND return_date → quote → confirm → create_booking (pass car_name string, not a number) → send link.
IMPORTANT: Always pass pickup_date + return_date to get_fare_estimate. Never calculate fare manually.

━━ AFTER create_booking SUCCEEDS — MANDATORY ━━
The tool returns { bookingId, paymentUrl }. You MUST send ALL of these in your reply:
1. Booking number (e.g. "Booking #1234")
2. The advance amount = total_price × 10% (e.g. "Pay ₹2,260 advance")
3. The FULL paymentUrl exactly as returned by the tool — never shorten or omit it
Example reply: "Booking #1234 reserved! 🎉 Pay ₹2,260 advance to confirm your slot:\nhttps://easyoutstation.com/booking?resume=1234\nOnce paid: driver details shared within 60 mins."
If you do not include the payment URL, the customer cannot pay and the booking is lost.

━━ GROUPS > 6 PASSENGERS ━━
For 7+ passengers, recommend tempo travellers or buses — they're fully bookable the same way as cars.
Suggest based on group size:
- 7–12 pax → Tempo Traveller Maharaja (12 seats, ₹28/km) — luxury recliner seats
- 13–17 pax → Force Urbania (17 seats, ₹35/km) — premium van
- 18–19 pax → Tempo Traveller 16-19 (19 seats, ₹30/km)
- 20–27 pax → Mini Luxury Bus (27 seats, ₹45/km)
- 28–41 pax → Luxury Bus 35 (41 seats, ₹50/km)
- 42–45 pax → Luxury Bus 45 (45 seats, ₹55/km)
- 46–49 pax → Luxury Bus 49 (49 seats, ₹60/km)
- 50+ pax → suggest multiple vehicles
For hill routes with a group, Tempo Traveller or Force Urbania preferred over bus.

━━ DESTINATION INTRO (when customer mentions a place first) ━━
If the customer's message mentions a destination without booking details, respond warmly with:
1. 2-3 highlight attractions of that destination (what makes it special/worth visiting)
2. Distance from Delhi + approximate drive time
3. Best car recommendation for that route
4. Then ask exactly these 3 questions in one message (numbered list):
   1. When are you planning to travel? (date)
   2. One-way or round trip? (and return date if round trip)
   3. How many passengers?

Keep the intro short and exciting — 4-5 lines max. No walls of text.

━━ OTHER RULES ━━
- NEVER calculate or estimate fares manually — ALWAYS use get_fare_estimate, even for rough quotes. If dates or car aren't confirmed yet, ask for them before calling the tool. Manual fare guesses will always be wrong.
- MANDATORY: Every fare quote MUST end with: "⚠️ Toll, parking & state taxes: additional at actuals (paid on road, no markup)"
- Never ask for phone number — you already have it
- Booking status → use check_my_booking
- Driver details sent within 60 min of confirmation
- Day-before reminder SMS auto-sent with driver name & number
- Support: +91-8796564111 | easyoutstation@gmail.com
- Corporate accounts: easyoutstation.com/corporate
- Referral program: ₹100 credit each when friend completes first ride (valid 90 days)
- Redirect non-cab queries politely`;
}

type MsgParam = { role: "user" | "assistant"; content: string };

async function handleAiConversation(phone: string, userText: string): Promise<void> {
  const db = getDb();
  const localPhone = phone.slice(-10);

  // Load history
  const [conv] = await db.select().from(whatsappConversations).where(eq(whatsappConversations.phone, phone));
  const ctx = (conv?.contextJson ?? {}) as { messages?: MsgParam[]; aiState?: string };
  const history: MsgParam[] = ctx.messages ?? [];

  // Log inbound message
  await db.insert(whatsappLogs).values({
    direction: "inbound", phone: localPhone, messageBody: userText, waStatus: "delivered", fallbackSent: false,
  }).catch(() => {});

  // New conversation — detect destination first; if found let Claude handle it, else send template.
  if (history.length === 0) {
    const destInfo = detectDestination(userText);

    if (!destInfo) {
      // No destination mentioned — send booking template as default
      const greeting = `Hi! I'm Disha from EasyOutstation 👋 Fill this in and I'll quote your fare instantly:\n\n${BOOKING_TEMPLATE}\n\nOr just tell me where you're heading and I'll guide you! 😊`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await db.insert(whatsappConversations).values({
        phone, state: "ai_conversation",
        contextJson: { messages: [{ role: "user", content: userText }, { role: "assistant", content: greeting }] },
        expiresAt,
      }).catch(() =>
        db.update(whatsappConversations)
          .set({ contextJson: { messages: [{ role: "user", content: userText }, { role: "assistant", content: greeting }] }, state: "ai_conversation", expiresAt })
          .where(eq(whatsappConversations.phone, phone))
      );
      await db.insert(whatsappLogs).values({
        direction: "outbound", phone: localPhone, messageBody: greeting, waStatus: "sent", fallbackSent: false,
      }).catch(() => {});
      await sendWhatsAppTextRaw(phone, greeting);
      console.log(`[WA AI] New conversation template sent to ${phone}`);
      return;
    }

    // Destination detected — inject context hint so Claude gives a rich intro + questions
    console.log(`[WA AI] Destination detected in first message: ${destInfo.name} for ${phone}`);
    const contextHint = `[CONTEXT: Customer mentioned ${destInfo.name} in their first message. Key info: ${destInfo.km} km from Delhi, ~${destInfo.hours} hrs drive, highlights: ${destInfo.highlights}, recommended car: ${destInfo.bestCar}. Give a warm destination intro then ask the 3 clarifying questions per the DESTINATION INTRO rules.]`;
    history.push({ role: "user", content: `${userText}\n\n${contextHint}` });
    // Fall through to Claude AI — do NOT push again below
  } else {
    // Ongoing conversation — append user message, keep rolling window of 20
    history.push({ role: "user", content: userText });
    if (history.length > 20) history.splice(0, history.length - 20);
  }

  const systemPrompt = buildSystemPrompt();

  // Agentic loop — let Claude use tools until it sends a final reply
  const messages: Anthropic.MessageParam[] = history.map(m => ({ role: m.role, content: m.content }));
  let reply = "";
  let createdBookingId: number | undefined;

  for (let i = 0; i < 8; i++) {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system: systemPrompt,
      tools: AI_TOOLS,
      messages,
    });

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    const toolBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");

    if (response.stop_reason === "end_turn" || toolBlocks.length === 0) {
      reply = textBlock?.text ?? "";
      break;
    }

    // Execute ALL tool calls in this response (Claude may call multiple in one turn)
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const tb of toolBlocks) {
      let toolResult: string;
      try {
        toolResult = await executeTool(tb.name, tb.input as any, phone);
        if (tb.name === "create_booking") {
          try { const r = JSON.parse(toolResult); if (r.bookingId) createdBookingId = r.bookingId; } catch {}
        }
      } catch (e: any) {
        console.error(`[WA AI] Tool ${tb.name} failed:`, e?.message ?? e);
        toolResult = JSON.stringify({ error: e?.message ?? "Tool execution failed" });
      }
      toolResults.push({ type: "tool_result", tool_use_id: tb.id, content: toolResult });
    }
    messages.push({ role: "assistant", content: response.content as any });
    messages.push({ role: "user", content: toolResults } as any);
  }

  // Fallback — loop exhausted or empty reply
  if (!reply) {
    reply = "Sorry, I ran into an issue. Please call us at 8796564111 or visit easyoutstation.com to complete your booking.";
    console.error(`[WA AI] Empty reply for ${phone} — loop exhausted or Claude returned no text`);
  }

  // Save updated history
  history.push({ role: "assistant", content: reply });
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  if (conv) {
    await db.update(whatsappConversations)
      .set({ contextJson: { ...ctx, messages: history }, state: "ai_conversation", expiresAt })
      .where(eq(whatsappConversations.phone, phone));
  } else {
    await db.insert(whatsappConversations)
      .values({ phone, state: "ai_conversation", contextJson: { messages: history }, expiresAt });
  }

  await db.insert(whatsappLogs).values({
    direction: "outbound", phone: localPhone, messageBody: reply,
    bookingId: createdBookingId ?? undefined,
    waStatus: "sent", fallbackSent: false,
  }).catch(() => {});

  await sendWhatsAppTextRaw(phone, reply);
  console.log(`[WA AI] Replied to ${phone}: ${reply.slice(0, 80)}...`);
}

async function handleStatusUpdate(status: any): Promise<void> {
  const { id: wamid, status: waStatus, timestamp } = status;
  if (!wamid || !waStatus) return;

  const db = getDb();
  const ts = new Date(parseInt(timestamp) * 1000);
  const update: Record<string, unknown> = { waStatus };
  if (waStatus === "delivered") update.deliveredAt = ts;
  if (waStatus === "read") update.readAt = ts;

  await db.update(whatsappLogs)
    .set(update)
    .where(eq(whatsappLogs.waMessageId, wamid));
}

async function handleIncomingMessage(message: any, waPhone: string): Promise<void> {
  const rawText = (message.text?.body ?? "").trim();
  const text = rawText.toUpperCase();
  const db = getDb();
  const localPhone = waPhone.slice(-10);

  if (text === "STOP") {
    await db.execute(sql`UPDATE users SET whatsappOptOut = TRUE WHERE phone = ${localPhone}`);
    await sendWhatsAppTextRaw(waPhone,
      "You've been unsubscribed from EasyOutstation WhatsApp notifications. Reply START to re-subscribe."
    );
    console.log(`[WA Inbound] Opt-out: ${waPhone}`);
    return;
  }

  if (text === "START") {
    await db.execute(sql`UPDATE users SET whatsappOptOut = FALSE, whatsappOptIn = TRUE, whatsappOptInAt = NOW() WHERE phone = ${localPhone}`);
    await sendWhatsAppTextRaw(waPhone,
      "You're subscribed to EasyOutstation WhatsApp notifications. We'll keep you updated on your bookings!"
    );
    return;
  }

  if (text === "HELP") {
    await sendWhatsAppTextRaw(waPhone,
      "EasyOutstation Help\n\n📞 Call/WhatsApp: +91-8796564111\n📧 Email: easyoutstation@gmail.com\n🌐 Web: easyoutstation.com\n\nReply STOP to unsubscribe."
    );
    return;
  }

  if (text === "RESET") {
    await db.delete(whatsappConversations).where(eq(whatsappConversations.phone, waPhone));
    // Treat as a fresh first message — Disha will greet with the booking template
    if (process.env.ANTHROPIC_API_KEY) {
      await handleAiConversation(waPhone, "Hi");
    }
    return;
  }

  // Check for active conversation state
  const [conv] = await db.select().from(whatsappConversations)
    .where(eq(whatsappConversations.phone, waPhone));

  // Operational states handled by state machine; everything else goes to AI
  const operationalStates = ["awaiting_review_rating", "awaiting_driver_confirm", "awaiting_corporate_approval"];
  if (!conv || new Date() > conv.expiresAt || conv.state === "idle" || !operationalStates.includes(conv.state)) {
    if (process.env.ANTHROPIC_API_KEY) {
      await handleAiConversation(waPhone, rawText);
    }
    return;
  }

  switch (conv.state) {
    case "awaiting_review_rating": {
      if (["1", "2", "3", "4", "5"].includes(text)) {
        await sendWhatsAppTextRaw(waPhone,
          `Thank you for rating your experience ${text}/5! 🙏 Your feedback helps us improve.\n\nBook again: easyoutstation.com`
        );
        await db.update(whatsappConversations)
          .set({ state: "idle" })
          .where(eq(whatsappConversations.phone, waPhone));
      } else {
        await sendWhatsAppTextRaw(waPhone, "Please reply with a number from 1 to 5 to rate your trip.");
      }
      break;
    }

    case "awaiting_driver_confirm": {
      const ctx = conv.contextJson as { bookingId?: number } | null;
      const bookingId = ctx?.bookingId;

      if (text === "ISSUE") {
        await sendWhatsAppTextRaw(waPhone, "Noted. Our operations team has been alerted and will contact you shortly.");
        if (bookingId) {
          await sendWhatsAppTextRaw(toWaPhone(ADMIN_PHONE),
            `⚠️ Vendor reported ISSUE on Booking #${bookingId}. Call vendor: +91-${waPhone.slice(-10)}`
          );
        }
        await db.update(whatsappConversations).set({ state: "idle" }).where(eq(whatsappConversations.phone, waPhone));
        break;
      }

      // Parse "Driver Name, 9876543210" — name is everything before the last comma/space before number
      const mobileMatch = rawText.match(/(\d{10})/);
      if (!mobileMatch) {
        await sendWhatsAppTextRaw(waPhone,
          "Please reply with your driver's name and mobile number.\nExample: Suresh Kumar, 9876543210"
        );
        break;
      }
      const mobile = mobileMatch[1];
      const driverName = rawText.replace(mobile, "").replace(/[,\s]+$/, "").trim();
      if (!driverName) {
        await sendWhatsAppTextRaw(waPhone,
          "Please include the driver's name too.\nExample: Suresh Kumar, 9876543210"
        );
        break;
      }

      if (bookingId) {
        const [booking] = await db.select({
          customerName: bookings.customerName,
          customerPhone: bookings.customerPhone,
          customerEmail: bookings.customerEmail,
          fromCity: bookings.fromCity,
          toCity: bookings.toCity,
          pickupDate: bookings.pickupDate,
        }).from(bookings).where(eq(bookings.id, bookingId)).limit(1);

        await db.update(bookings)
          .set({ driverName, driverPhone: mobile, status: "driver_assigned" })
          .where(eq(bookings.id, bookingId));

        // Auto-register driver in drivers table if not already there
        const existing = await db.select({ id: drivers.id }).from(drivers).where(eq(drivers.phone, mobile)).limit(1);
        if (!existing[0]) {
          await db.insert(drivers).values({ name: driverName, phone: mobile, isActive: true });
          console.log(`[WA Inbound] Auto-registered driver: ${driverName} (${mobile})`);
        }

        await sendWhatsAppTextRaw(toWaPhone(ADMIN_PHONE),
          `✅ Vendor confirmed driver for Booking #${bookingId}: ${driverName}, +91-${mobile}`
        );
        logBookingEvent(bookingId, "vendor_confirmed", { driverName, driverPhone: mobile }).catch(() => {});

        if (booking?.customerPhone) {
          notifyCustomerDriverAssigned({
            bookingId,
            customerName: booking.customerName,
            customerPhone: booking.customerPhone,
            customerEmail: booking.customerEmail,
            fromCity: booking.fromCity ?? "",
            toCity: booking.toCity ?? "",
            pickupDate: booking.pickupDate ?? "",
            driverName,
            driverPhone: mobile,
          }).catch((e) => console.error("[WA Inbound] Failed to notify customer of driver:", e));
        }
      }
      await sendWhatsAppTextRaw(waPhone,
        `✅ Confirmed! ${driverName} (+91-${mobile}) has been registered as driver${bookingId ? ` for Trip #${bookingId}` : ""}. Safe driving! 🚗`
      );
      await db.update(whatsappConversations).set({ state: "idle" }).where(eq(whatsappConversations.phone, waPhone));
      break;
    }

    case "awaiting_corporate_approval": {
      if (text === "YES" || text === "NO") {
        // Approval handling wired in Phase 2 via context bookingId
        await sendWhatsAppTextRaw(waPhone, text === "YES"
          ? "Booking approved! ✅ The employee will be notified."
          : "Booking rejected. The employee has been notified."
        );
        await db.update(whatsappConversations)
          .set({ state: "idle" })
          .where(eq(whatsappConversations.phone, waPhone));
      }
      break;
    }
  }
}

export function startWhatsAppInboundWorker() {
  const redis = getRedis();
  if (!redis) {
    console.log("[WA Inbound] Redis unavailable — inbound worker not started");
    return null;
  }

  const worker = new Worker<WhatsAppInboundJobData>(
    QUEUE_WHATSAPP_INBOUND,
    async (job: Job<WhatsAppInboundJobData>) => {
      const entries = (job.data.payload as any)?.entry ?? [];

      for (const entry of entries) {
        for (const change of entry.changes ?? []) {
          const value = change.value;
          if (!value) continue;

          for (const status of value.statuses ?? []) {
            await handleStatusUpdate(status).catch(e =>
              console.error("[WA Inbound] Status update error:", e)
            );
          }

          for (const message of value.messages ?? []) {
            await handleIncomingMessage(message, message.from).catch(e =>
              console.error("[WA Inbound] Message handler error:", e)
            );
          }
        }
      }
    },
    { connection: redis, concurrency: 3 }
  );

  worker.on("error", (err) => console.error("[WA Inbound] Worker error:", err.message));
  console.log("[WA Inbound] WhatsApp inbound worker started (concurrency: 3)");
  return worker;
}
