import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";

const EMAIL = "easyoutstation@gmail.com";
const WHATSAPP = "+91-87965 64111";
const PHONE = "+91-87965 64111";

function getRuleBasedResponse(msg: string): string {
  // Greetings
  if (msg.match(/^(hi|hello|hey|good morning|good afternoon|good evening|namaste|hii|helo)/)) {
    return `Hello! Welcome to EasyOutstation 🚗✨\n\nI'm your travel assistant. I can help you with:\n• Car recommendations & pricing\n• Popular routes from Delhi\n• Booking process\n• Cancellation & refund policy\n• Trip planning tips\n\nWhere would you like to travel today?`;
  }

  // Pricing
  if (msg.match(/price|rate|cost|how much|charge|fare|tariff|km rate/)) {
    return `Our per km rates (all-inclusive of AC & driver):\n\n🚗 Swift Dzire — ₹12/km\n🚗 Toyota Etios — ₹13/km\n🚙 Maruti Ertiga — ₹15/km\n🚙 Mahindra Xylo — ₹16/km\n🚐 Kia Carens — ₹17/km\n🚐 Toyota Innova — ₹19/km\n🚐 Innova Crysta — ₹20/km\n🚐 Innova Hycross — ₹22/km\n\n📌 Driver charges: ₹250/day\n📌 Minimum: 250 km/day\n📌 Extras: Toll, parking & state permits charged actuals`;
  }

  // Booking
  if (msg.match(/book|reserve|hire|rent|how to book|booking process|steps/)) {
    return `Booking with EasyOutstation is simple:\n\n1️⃣ Browse available cars\n2️⃣ Select your route & travel date\n3️⃣ Fill in your details\n4️⃣ Confirm your booking\n\nYou will receive a booking confirmation email within 60 minutes with your driver details. Pay just 10% advance to confirm your booking. Click **Book Now** on any car to get started! 🚀`;
  }

  // Manali
  if (msg.match(/manali|rohtang|solang|kullu/)) {
    return `Delhi to Manali 🏔️\n\n📍 Distance: ~540 km\n⏱️ Duration: 12-14 hours\n🗺️ Route: Delhi → Chandigarh → Bilaspur → Mandi → Kullu → Manali\n\nBest cars for this route:\n🥇 Innova Crysta (₹20/km) — Most comfortable for hills\n🥈 Innova Hycross (₹22/km) — Premium hybrid luxury\n🥉 Ertiga (₹15/km) — Great value for families\n\nOur drivers are experienced with mountain roads & weather conditions.`;
  }

  // Jaipur
  if (msg.match(/jaipur|pink city|rajasthan/)) {
    return `Delhi to Jaipur 🏰\n\n📍 Distance: ~280 km\n⏱️ Duration: 5-6 hours\n🗺️ Route: Delhi → NH48 → Jaipur\n\nBest cars:\n🥇 Swift Dzire (₹12/km) — Budget friendly\n🥈 Ertiga (₹15/km) — Family comfort\n🥉 Innova Crysta (₹20/km) — Premium experience\n\nPopular for weekend getaways & heritage tours!`;
  }

  // Agra
  if (msg.match(/agra|taj mahal|fatehpur/)) {
    return `Delhi to Agra 🕌\n\n📍 Distance: ~230 km\n⏱️ Duration: 3-4 hours\n🗺️ Route: Delhi → Yamuna Expressway → Agra\n\nBest cars:\n🥇 Swift Dzire (₹12/km) — Day trip special\n🥈 Etios (₹13/km) — Comfortable sedan\n🥉 Ertiga (₹15/km) — Family trip\n\nPerfect for same-day Taj Mahal visits!`;
  }

  // Rishikesh
  if (msg.match(/rishikesh|haridwar|uttarakhand|rafting|yoga/)) {
    return `Delhi to Rishikesh 🧘\n\n📍 Distance: ~240 km\n⏱️ Duration: 5-6 hours\n🗺️ Route: Delhi → Meerut → Roorkee → Haridwar → Rishikesh\n\nBest cars:\n🥇 Ertiga (₹15/km) — Group trips\n🥈 Innova (₹19/km) — Comfortable for long stays\n🥉 Swift Dzire (₹12/km) — Solo/couple trips\n\nIdeal for adventure, yoga retreats & spiritual tours!`;
  }

  // Chandigarh
  if (msg.match(/chandigarh|punjab|himachal/)) {
    return `Delhi to Chandigarh 🏙️\n\n📍 Distance: ~250 km\n⏱️ Duration: 4-5 hours\n🗺️ Route: Delhi → NH44 → Ambala → Chandigarh\n\nBest cars:\n🥇 Swift Dzire (₹12/km) — Economic\n🥈 Ertiga (₹15/km) — Family\n🥉 Innova Crysta (₹20/km) — Premium\n\nAlso a great stopover for Manali & Shimla trips!`;
  }

  // Dehradun / Mussoorie
  if (msg.match(/dehradun|mussoorie|doon|uttarakhand/)) {
    return `Delhi to Dehradun/Mussoorie 🌄\n\n📍 Distance: ~250-290 km\n⏱️ Duration: 5-6 hours\n\nBest cars:\n🥇 Ertiga (₹15/km) — Hill comfort\n🥈 Innova Crysta (₹20/km) — Premium hills\n🥉 Swift Dzire (₹12/km) — Budget option\n\nMussoorie is 30 km further from Dehradun via mountain roads.`;
  }

  // Dharamshala / McLeod Ganj
  if (msg.match(/dharamshala|dharamsala|mcleod|mcleodganj|dalai lama|kangra/)) {
    return `Delhi to Dharamshala 🏔️\n\n📍 Distance: ~475 km\n⏱️ Duration: 10-11 hours\n🗺️ Route: Delhi → NH44 → Jalandhar → NH154 → Dharamshala\n\nBest cars for this route:\n🥇 Innova Crysta (₹20/km) — Most comfortable for hills\n🥈 Innova Hycross (₹22/km) — Premium luxury\n🥉 Ertiga (₹15/km) — Great value for families\n\nDrops at McLeod Ganj or lower Dharamshala — Dalai Lama's abode, Triund Trek, Kangra Valley!`;
  }

  // Kashmir / Dal Lake / Srinagar
  if (msg.match(/kashmir|srinagar|dal lake|gulmarg|pahalgam|jammu kashmir|j&k|houseboats|shikara/)) {
    return `Delhi to Kashmir 🏔️\n\n📍 Distance: ~820 km\n⏱️ Duration: 14-16 hours\n🗺️ Route: Delhi → NH44 → Jammu → Jammu-Srinagar Highway → Srinagar\n\nBest cars for this route:\n🥇 Innova Crysta (₹20/km) — Ideal for long highway journey\n🥈 Innova Hycross (₹22/km) — Premium comfort\n🥉 Kia Carens (₹17/km) — Modern 6-seater\n\nExperience Dal Lake shikaras, Mughal Gardens, Gulmarg & Pahalgam — the paradise of India!`;
  }

  // Vaishno Devi / Katra
  if (msg.match(/vaishno|vaishnodevi|katra|mata rani|trikuta|jammu|shrine/)) {
    return `Delhi to Vaishno Devi 🙏\n\n📍 Distance: ~650 km (to Katra base camp)\n⏱️ Duration: 12-13 hours\n🗺️ Route: Delhi → NH44 → Jammu → Katra\n\nBest cars for this route:\n🥇 Innova Crysta (₹20/km) — Spacious for pilgrimage groups\n🥈 Ertiga (₹15/km) — Great for families\n🥉 Swift Dzire (₹12/km) — Budget for small groups\n\nWe drop at Katra — the 14 km trek to the holy shrine starts from there. Helicopter darshan also available from Katra!`;
  }

  // Ludhiana
  if (msg.match(/ludhiana/)) {
    return `Delhi to Ludhiana 🏙️\n\n📍 Distance: ~310 km\n⏱️ Duration: 5-6 hours\n🗺️ Route: Delhi → NH44 → Ambala → Ludhiana\n\nBest cars:\n🥇 Swift Dzire (₹12/km) — Quick & economical\n🥈 Ertiga (₹15/km) — Comfortable family ride\n🥉 Innova Crysta (₹20/km) — Premium option\n\nLudhiana is the industrial capital of Punjab — gateway to Amritsar (120 km further)!`;
  }

  // Ayodhya / Ram Mandir
  if (msg.match(/ayodhya|ram mandir|saryu|ramlala|hanuman garhi/)) {
    return `Delhi to Ayodhya 🛕\n\n📍 Distance: ~640 km\n⏱️ Duration: 10-12 hours\n🗺️ Route: Delhi → Agra-Lucknow Expressway (NH19) → Ayodhya\n\nBest cars:\n🥇 Innova Crysta (₹20/km) — Long highway comfort\n🥈 Ertiga (₹15/km) — Family pilgrimage trip\n🥉 Swift Dzire (₹12/km) — Budget option\n\nVisit Ram Mandir, Saryu Ghats, Kanak Bhawan & Hanuman Garhi. Overnight stay recommended for a comfortable darshan experience!`;
  }

  // Banaras / Varanasi / Kashi
  if (msg.match(/banaras|varanasi|kashi|ganga ghat|dashashwamedh|sarnath|kashi vishwanath/)) {
    return `Delhi to Banaras 🪔\n\n📍 Distance: ~820 km\n⏱️ Duration: 12-14 hours\n🗺️ Route: Delhi → Agra-Lucknow Expressway (NH19) → NH27 → Varanasi\n\nBest cars:\n🥇 Innova Crysta (₹20/km) — Most comfortable for long journey\n🥈 Innova Hycross (₹22/km) — Premium luxury\n🥉 Ertiga (₹15/km) — Family trip\n\nExperience Ganga Aarti at Dashashwamedh Ghat, Kashi Vishwanath Temple, Sarnath Buddhist site & sunrise boat ride on the Ganga!`;
  }

  // Routes / Destinations
  if (msg.match(/route|destination|where|city|places|travel|trip|tour/)) {
    return `All routes from Delhi 🗺️\n\n🏔️ Manali — 540 km · Shimla — 350 km · Dharamshala — 475 km\n🧘 Rishikesh — 240 km · Haridwar — 220 km · Dehradun — 300 km · Mussoorie — 310 km · Nainital — 310 km\n🏙️ Chandigarh — 260 km · Ludhiana — 310 km · Amritsar — 460 km\n🏰 Jaipur — 280 km · Agra — 230 km · Mathura — 175 km\n🛕 Ayodhya — 640 km · Banaras — 820 km\n🏔️ Vaishno Devi — 650 km · Kashmir — 820 km\n\nJust tell me your destination and I'll share the fare, route and best car for you!`;
  }

  // Car recommendations
  if (msg.match(/best car|recommend|which car|suggest|suitable|good car|perfect car|fleet|cars available|available cars/)) {
    return `Our full fleet — pick what suits you:\n\n💰 Swift Dzire (₹12/km) — Best for budget & solo/couple trips\n🚗 Toyota Etios (₹13/km) — Comfortable sedan, great value\n👨‍👩‍👧 Maruti Ertiga (₹15/km) — 6-seater, ideal for families\n👥 Mahindra Xylo (₹16/km) — Spacious MUV for large groups\n🚐 Kia Carens (₹17/km) — Premium 6-seater with modern features\n🏔️ Toyota Innova (₹19/km) — Reliable for long highway & hill trips\n⭐ Innova Crysta (₹20/km) — Most popular for hill stations\n🌟 Innova Hycross (₹22/km) — Top luxury, hybrid comfort\n\nTell me your destination & group size for a personalised pick!`;
  }

  // Driver
  if (msg.match(/driver|chauffeur|safe|experienced|pilot/)) {
    return `All our cars come with professional drivers ✅\n\n• Verified & background checked\n• Experienced in highway & mountain driving\n• Courteous and punctual\n• Driver charges: ₹250/day\n• Night allowance included for outstation trips\n\nYour safety and comfort is our top priority!`;
  }

  // Cancellation / Refund
  if (msg.match(/cancel|refund|reschedule|change booking|money back/)) {
    return `Our cancellation policy:\n\n✅ Free cancellation — up to 24 hrs before pickup\n🔶 50% refund — cancellation within 12-24 hrs\n❌ No refund — cancellation within 12 hrs\n\nTo cancel or reschedule, email us at:\n📧 ${EMAIL}`;
  }

  // Payment
  if (msg.match(/pay|payment|upi|gpay|card|cash|advance|online payment/)) {
    return `Payment options:\n\n💳 Credit/Debit Cards\n🏦 Net Banking\n📱 UPI (GPay, PhonePe, Paytm)\n💵 Cash to driver (advance required)\n\nA 10% advance confirms your booking via Razorpay (UPI, cards, netbanking). The balance amount is paid directly to the driver at pickup.`;
  }

  // Insurance / Safety
  if (msg.match(/insurance|safe|accident|emergency|breakdown/)) {
    return `Safety & Insurance 🛡️\n\n✅ All vehicles fully insured\n✅ Emergency support available 24/7\n✅ Well-maintained & regularly serviced cars\n✅ Police-verified professional drivers\n\nFor emergencies during your trip, email: ${EMAIL}`;
  }

  // Toll / Extra charges
  if (msg.match(/toll|extra charge|hidden|state permit|parking/)) {
    return `Additional charges (charged at actuals):\n\n🛣️ Toll taxes — charged as per route\n🅿️ Parking fees — at destination\n📋 State permits — for inter-state travel\n🌙 Night allowance — if applicable\n\nAll extra charges are transparent and shared upfront. No hidden fees!`;
  }

  // Contact / Support
  if (msg.match(/contact|support|help|email|reach|talk|connect|complaint|feedback/)) {
    return `We're here to help! 🙋\n\n📱 WhatsApp: ${WHATSAPP} (Fastest — usually replies in minutes)\n📧 Email: ${EMAIL}\n📞 Call: ${PHONE}\n\nOur support team is available 24/7. WhatsApp is the fastest way to reach us for urgent booking help.`;
  }

  // About EasyOutstation
  if (msg.match(/about|who are you|company|easyoutstation|service|what do you/)) {
    return `About EasyOutstation 🚗\n\nWe are a premium outstation cab service based in Delhi, specialising in comfortable, reliable and affordable cab rentals for intercity travel across North India.\n\n✅ Police-verified professional drivers\n✅ Well-maintained fleet (under 3 years old)\n✅ Transparent pricing — no hidden charges\n✅ 24/7 customer support\n✅ Driver details shared within 60 minutes of booking\n✅ Free cancellation up to 24 hours before pickup\n\nYour trusted travel partner for every journey!`;
  }

  // Thank you
  if (msg.match(/thank|thanks|great|awesome|helpful|good|nice/)) {
    return `You're welcome! 😊 Happy to help.\n\nIf you have any more questions or need help booking, feel free to ask. Have a wonderful trip! 🚗✨`;
  }

  // Default fallback
  return `I'm not sure I have the right answer for that, but I don't want to leave you stuck! 😊\n\nFor specific queries, our team can help you better:\n\n📱 WhatsApp: ${WHATSAPP} (fastest response)\n📧 Email: ${EMAIL}\n\nWe are available 24/7. You can also browse our cars and routes directly on the website!`;
}

export const aiRouter = createRouter({
  chat: publicQuery
    .input(
      z.object({
        message: z.string(),
        history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { message } = input;
      const response = getRuleBasedResponse(message.toLowerCase().trim());

      return {
        response,
        suggestions: [
          "Cars for Delhi to Manali",
          "What are your prices?",
          "How do I book a car?",
          "Which car is best for hills?",
        ],
      };
    }),

  recommend: publicQuery
    .input(
      z.object({
        fromCity: z.string().optional(),
        toCity: z.string().optional(),
        passengers: z.number().optional(),
        budget: z.string().optional(),
        purpose: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const recommendations = [];
      if (!input) {
        recommendations.push(
          { carId: 6, reason: "Most popular for hill stations", confidence: 0.95 },
          { carId: 8, reason: "Premium luxury experience", confidence: 0.88 },
          { carId: 5, reason: "Best value for families", confidence: 0.92 }
        );
      } else {
        const passengers = input.passengers || 4;
        const isHill = ["manali", "shimla", "nainital", "mussoorie", "rishikesh", "dehradun"].some(
          d => input.toCity?.toLowerCase().includes(d)
        );
        if (passengers <= 4) {
          recommendations.push({ carId: 1, reason: "Perfect for small groups, fuel efficient", confidence: 0.90 });
          recommendations.push({ carId: 2, reason: "Reliable sedan with extra comfort", confidence: 0.85 });
        } else {
          recommendations.push({ carId: 5, reason: "Spacious MUV ideal for families", confidence: 0.92 });
          recommendations.push({ carId: 4, reason: "Popular choice with great value", confidence: 0.88 });
        }
        if (isHill) {
          recommendations.unshift({ carId: 6, reason: "Best for mountain terrain", confidence: 0.95 });
        }
        if (input.budget === "premium") {
          recommendations.unshift({ carId: 8, reason: "Luxury features and superior comfort", confidence: 0.93 });
        } else if (input.budget === "budget") {
          recommendations.unshift({ carId: 1, reason: "Most economical option", confidence: 0.94 });
        }
      }
      return recommendations.slice(0, 4);
    }),
});
