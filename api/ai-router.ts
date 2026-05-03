import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";

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

      // Simple rule-based AI responses for car rental queries
      const msg = message.toLowerCase();
      let response = "";

      if (msg.includes("price") || msg.includes("rate") || msg.includes("cost") || msg.includes("how much")) {
        response = "Our car rental rates are very competitive:\n\n🚗 Swift Dzire: Rs. 12/km\n🚗 Toyota Etios: Rs. 13/km\n🚙 Maruti Ertiga: Rs. 15/km\n🚙 Mahindra Xylo: Rs. 16/km\n🚐 Kia Carens: Rs. 17/km\n🚐 Toyota Innova: Rs. 19/km\n🚐 Innova Crysta: Rs. 20/km\n🚐 Innova Hycross: Rs. 22/km\n\nAll rates include AC, driver, and 250 km/day minimum. Driver charges are Rs. 400/day. Extra charges apply for toll tax, parking, and state permits.";
      } else if (msg.includes("book") || msg.includes("reserve") || msg.includes("hire")) {
        response = "I'd be happy to help you book a car! To proceed, I'll need a few details:\n\n1. Pickup location and destination\n2. Travel date(s)\n3. Number of passengers\n4. Preferred car type\n5. Your name and contact number\n\nYou can also click the 'Book Now' button on any car card to start the booking process directly. Our booking takes just 3 simple steps!";
      } else if (msg.includes("delhi to manali") || msg.includes("manali")) {
        response = "Delhi to Manali is one of our most popular routes! Here's what you need to know:\n\n📍 Distance: ~540 km\n⏱️ Duration: 12-14 hours\n🗺️ Route: Delhi → Chandigarh → Bilaspur → Mandi → Kullu → Manali\n\nRecommended cars for this route:\n- **Innova Crysta** (Rs. 20/km) - Best for hills, most comfortable\n- **Innova Hycross** (Rs. 22/km) - Premium luxury option\n- **Ertiga** (Rs. 15/km) - Great value for families\n\nOur experienced drivers are well-versed with mountain routes and ensure a safe journey. Would you like to book now?";
      } else if (msg.includes("driver") || msg.includes("chauffeur")) {
        response = "Yes, all our car rentals come with professional drivers included! Here's what's included:\n\n✅ Experienced, verified drivers\n✅ Familiar with all routes including hill stations\n✅ Driver charges: Rs. 400/day\n✅ Night driving allowance if applicable\n✅ Professional, courteous service\n\nOur drivers are trained for mountain terrain, long-distance travel, and ensuring your safety and comfort throughout the journey.";
      } else if (msg.includes("cancel") || msg.includes("refund")) {
        response = "Our cancellation policy is customer-friendly:\n\n✅ Free cancellation up to 24 hours before pickup\n✅ 50% refund for cancellations within 12-24 hours\n✅ No refund for cancellations within 12 hours\n\nTo cancel a booking, please go to your account dashboard or contact our support team at +91-7011911252.";
      } else if (msg.includes("payment") || msg.includes("pay")) {
        response = "We offer multiple secure payment options:\n\n💳 Credit/Debit Cards (Visa, Mastercard, RuPay)\n🏦 Net Banking\n📱 UPI (Google Pay, PhonePe, Paytm)\n💵 Cash payment to driver (partial advance required)\n\nAll online payments are secured with SSL encryption. You can pay a 20% advance to confirm your booking and the balance to the driver at pickup.";
      } else if (msg.includes("contact") || msg.includes("phone") || msg.includes("call") || msg.includes("support")) {
        response = "You can reach us through:\n\n📞 Phone: +91-7011911252\n📧 Email: easyoutstation@gmail.com\n💬 WhatsApp: +91-7011911252\n\nOur customer support team is available 24/7 to assist you with bookings, queries, or any travel assistance you may need.";
      } else if (msg.includes("hi") || msg.includes("hello") || msg.includes("hey")) {
        response = "Hello! Welcome to EasyOutstation 🚗✨\n\nI'm your AI travel assistant. I can help you with:\n• Finding the perfect car for your journey\n• Checking prices and availability\n• Route recommendations\n• Booking assistance\n• Answering any travel questions\n\nWhere would you like to travel today?";
      } else if (msg.includes("route") || msg.includes("destination") || msg.includes("where")) {
        response = "We serve numerous popular routes from Delhi:\n\n🏔️ Delhi → Manali (540 km)\n🏰 Delhi → Jaipur (280 km)\n🕌 Delhi → Agra (230 km)\n🧘 Delhi → Rishikesh (240 km)\n🏙️ Delhi → Chandigarh (250 km)\n🌄 Delhi → Dehradun (250 km)\n\nWe also offer custom routes to any destination in North India. Just let us know your travel plans!";
      } else if (msg.includes("best car") || msg.includes("recommend") || msg.includes("which car")) {
        response = "Here are my recommendations based on different needs:\n\n💰 **Budget Travel**: Swift Dzire (Rs. 12/km) - Fuel efficient, comfortable for 2-4 people\n\n👨‍👩‍👧‍👦 **Family Trip**: Maruti Ertiga (Rs. 15/km) - Spacious, good luggage space\n\n🏔️ **Hill Station**: Innova Crysta (Rs. 20/km) - Best for mountains, powerful engine\n\n🌟 **Luxury Experience**: Innova Hycross (Rs. 22/km) - Premium features, hybrid efficiency\n\n🚙 **Group Travel**: Mahindra Xylo (Rs. 16/km) - 6+1 seating, rugged build\n\nTell me your destination and group size for a more personalized recommendation!";
      } else {
        response = "Thank you for your message! I'm here to help with any questions about our car rental services.\n\nI can assist you with:\n• Car recommendations and comparisons\n• Pricing and package details\n• Route information and travel tips\n• Booking process guidance\n• Support with existing bookings\n\nIs there anything specific about your upcoming trip you'd like to know?";
      }

      return {
        response,
        suggestions: [
          "Show me cars for Delhi to Manali",
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
      // AI recommendation logic based on inputs
      const recommendations = [];
      
      if (!input) {
        recommendations.push(
          { carId: 6, reason: "Most popular for hill stations", confidence: 0.95 },
          { carId: 8, reason: "Premium luxury experience", confidence: 0.88 },
          { carId: 5, reason: "Best value for families", confidence: 0.92 }
        );
      } else {
        const passengers = input.passengers || 4;
        const isHill = input.toCity?.toLowerCase().includes("manali") || 
                      input.toCity?.toLowerCase().includes("shimla") ||
                      input.toCity?.toLowerCase().includes("nainital");
        
        if (passengers <= 4) {
          recommendations.push({ carId: 1, reason: "Perfect for small groups, fuel efficient", confidence: 0.90 });
          recommendations.push({ carId: 2, reason: "Reliable sedan with extra comfort", confidence: 0.85 });
        } else if (passengers <= 6) {
          recommendations.push({ carId: 5, reason: "Spacious MUV ideal for families", confidence: 0.92 });
          recommendations.push({ carId: 4, reason: "Popular choice with great value", confidence: 0.88 });
        }
        
        if (isHill) {
          recommendations.unshift({ carId: 6, reason: "Best for mountain terrain and comfort", confidence: 0.95 });
          recommendations.push({ carId: 8, reason: "Premium option for hilly roads", confidence: 0.90 });
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
