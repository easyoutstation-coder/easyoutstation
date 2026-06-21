import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";

const EMAIL = "easyoutstation@gmail.com";
const WHATSAPP = "+91-87965 64111";
const PHONE = "+91-87965 64111";

// Fare formula: sedan = km×12+250, crysta = km×20+250, hycross = km×22+250
function fare(km: number) {
  const s = (km * 12 + 250).toLocaleString("en-IN");
  const c = (km * 20 + 250).toLocaleString("en-IN");
  const h = (km * 22 + 250).toLocaleString("en-IN");
  return { sedan: s, crysta: c, hycross: h };
}

const HP_TAX = "• HP state entry tax: ~₹350–500/vehicle (charged at actuals)";
const RAJ_TAX = "• Rajasthan state permit: ~₹250–450/vehicle (charged at actuals)";
const TOLL_NOTE = "• Toll charged at actuals on all national highways";

function routeReply(
  emoji: string,
  destination: string,
  km: number,
  duration: string,
  route: string,
  extras: string[] = [],
  highlights: string,
  bestCar = "Innova Crysta"
): string {
  const f = fare(km);
  const extraLines = [TOLL_NOTE, ...extras].map(l => l).join("\n");
  return `Delhi to ${destination} ${emoji}\n\n` +
    `📍 Distance: ~${km} km\n` +
    `⏱️ Duration: ${duration}\n` +
    `🗺️ Route: ${route}\n\n` +
    `💰 Estimated fare (all-inclusive, driver included):\n` +
    `🚗 Sedan — from ₹${f.sedan}\n` +
    `🚐 Innova Crysta — from ₹${f.crysta}\n` +
    `🌟 Innova Hycross — from ₹${f.hycross}\n\n` +
    `📌 Additional charges (charged at actuals):\n${extraLines}\n• Parking charged at actuals\n\n` +
    `🏆 Best car: ${bestCar}\n\n${highlights}`;
}

function getRuleBasedResponse(msg: string): string {
  // ── Greetings ──────────────────────────────────────────────────────────
  if (msg.match(/^(hi|hello|hey|good morning|good afternoon|good evening|namaste|hii|helo)/)) {
    return `Hello! Welcome to EasyOutstation 🚗✨\n\nI'm Disha, your travel assistant. I can help you with:\n• Cab fares & route info for 30+ destinations\n• Car recommendations for your trip\n• Booking process & cancellation policy\n• State taxes, tolls & extra charge info\n\nWhere would you like to travel from Delhi today?`;
  }

  // ── Pricing ────────────────────────────────────────────────────────────
  if (msg.match(/price|rate|cost|how much|charge|fare|tariff|km rate/)) {
    return `Our per-km rates — all inclusive of AC & professional driver:\n\n🚗 Swift Dzire — ₹12/km\n🚗 Toyota Etios — ₹13/km\n🚙 Maruti Ertiga — ₹15/km\n🚙 Mahindra Xylo — ₹16/km\n🚐 Kia Carens — ₹17/km\n🚐 Toyota Innova — ₹19/km\n🚐 Innova Crysta — ₹20/km\n🌟 Innova Hycross — ₹22/km\n\n📌 Driver charges: ₹250/day (included in all estimates)\n📌 Minimum billing: 250 km/day\n📌 Toll, parking & state permits: charged at actuals — no markup\n\nShare your destination for an exact fare estimate!`;
  }

  // ── Manali ────────────────────────────────────────────────────────────
  if (msg.match(/manali|rohtang|solang|kullu/)) {
    return routeReply("🏔️", "Manali", 540, "12–14 hours",
      "Delhi → Chandigarh → Bilaspur → Mandi → Kullu → Manali",
      [HP_TAX],
      "Rohtang Pass, Solang Valley, Old Manali cafés & Hidimba Temple. SUV strongly recommended for Rohtang.",
      "Innova Crysta or Hycross");
  }

  // ── Shimla ────────────────────────────────────────────────────────────
  if (msg.match(/shimla|mall road|jakhu|summer hill|christ church shimla/)) {
    return routeReply("🏔️", "Shimla", 350, "6–7 hours",
      "Delhi → NH44 → Chandigarh → NH5 → Shimla",
      [HP_TAX],
      "Mall Road, Christ Church on The Ridge, Jakhu Temple, Kufri & Chadwick Falls. Himachal Pradesh's colonial capital.",
      "Innova Crysta");
  }

  // ── Dharamshala / McLeod Ganj ─────────────────────────────────────────
  if (msg.match(/dharamshala|dharamsala|mcleod|mcleodganj|dalai lama|kangra/)) {
    return routeReply("🏔️", "Dharamshala (McLeod Ganj)", 475, "10–11 hours",
      "Delhi → NH44 → Jalandhar → NH154 → Dharamshala",
      [HP_TAX],
      "Namgyal Monastery, Dalai Lama's abode, Triund Trek, Kangra Fort & Bhagsu Waterfall.",
      "Innova Crysta");
  }

  // ── Dalhousie / Khajjiar ──────────────────────────────────────────────
  if (msg.match(/dalhousie|khajjiar|dainkund|kalatop/)) {
    return routeReply("🏔️", "Dalhousie", 555, "10–11 hours",
      "Delhi → NH44 → Pathankot → NH154A → Dalhousie",
      [HP_TAX],
      "Khajjiar (Mini Switzerland of India), Dainkund Peak, Kalatop Wildlife Sanctuary & Subhash Baoli.",
      "Innova Crysta");
  }

  // ── Kasauli ───────────────────────────────────────────────────────────
  if (msg.match(/kasauli|gilbert trail|monkey point|kasauli brewery/)) {
    return routeReply("🌲", "Kasauli", 315, "5–6 hours",
      "Delhi → NH44 → Chandigarh → Kasauli",
      [HP_TAX],
      "Monkey Point (highest point in Kasauli), Gilbert Trail pine forest, Christ Church & Mohan Meakins Brewery (Asia's oldest, est. 1820).",
      "Ertiga or Innova Crysta");
  }

  // ── Spiti Valley ──────────────────────────────────────────────────────
  if (msg.match(/spiti|kaza|key monastery|chandratal|pin valley|kunzum/)) {
    return `Delhi to Spiti Valley 🏔️\n\n` +
      `📍 Distance: ~785 km (to Kaza)\n` +
      `⏱️ Duration: 2 days recommended\n` +
      `🗺️ Route: Delhi → Shimla → Kinnaur → Nako → Kaza\n\n` +
      `💰 Estimated fare:\n🚐 Innova Crysta — from ₹15,950\n🌟 Innova Hycross — from ₹17,520\n\n` +
      `⚠️ SUV mandatory — sedans cannot handle the rocky Spiti road above Nako.\n\n` +
      `📌 Additional charges (at actuals):\n${HP_TAX}\n${TOLL_NOTE}\n• Parking at actuals\n\n` +
      `🏆 Key Monastery (4,166 m), Chandratal Lake, Kibber Village & Tabo Monastery (996 AD). Altitude sickness prep essential — Kaza is at 3,800 m.\n\n` +
      `⚡ Route open: Mid-May to November only. Call us to confirm BRO road status.`;
  }

  // ── Chandigarh ────────────────────────────────────────────────────────
  if (msg.match(/chandigarh|sukhna lake|rock garden/)) {
    return routeReply("🏙️", "Chandigarh", 250, "4–5 hours",
      "Delhi → NH44 → Ambala → Chandigarh",
      [],
      "Sukhna Lake, Rock Garden, Rose Garden & Sector 17 plaza. Also a gateway to Manali, Shimla & Dharamshala.",
      "Swift Dzire or Ertiga");
  }

  // ── Jaipur ────────────────────────────────────────────────────────────
  if (msg.match(/jaipur|pink city|hawa mahal|amber fort/)) {
    return routeReply("🏰", "Jaipur", 280, "5–6 hours",
      "Delhi → NH48 (Delhi–Jaipur Expressway) → Jaipur",
      [RAJ_TAX],
      "Hawa Mahal, Amber Fort, City Palace, Jantar Mantar & Nahargarh Fort sunset.",
      "Swift Dzire or Ertiga");
  }

  // ── Agra ─────────────────────────────────────────────────────────────
  if (msg.match(/agra|taj mahal|fatehpur|agra fort/)) {
    return routeReply("🕌", "Agra", 230, "3.5–4 hours",
      "Delhi → Yamuna Expressway → Agra",
      [],
      "Taj Mahal (best at sunrise), Agra Fort, Fatehpur Sikri & Mehtab Bagh for Taj sunset view.",
      "Swift Dzire or Etios");
  }

  // ── Jodhpur ───────────────────────────────────────────────────────────
  if (msg.match(/jodhpur|blue city|mehrangarh|jaswant thada/)) {
    return routeReply("🏯", "Jodhpur", 600, "9–10 hours",
      "Delhi → NH48 → Jaipur bypass → Ajmer bypass → Jodhpur",
      [RAJ_TAX],
      "Mehrangarh Fort (one of India's largest), Blue City rooftop views, Jaswant Thada & Sardar Market.",
      "Innova Crysta");
  }

  // ── Udaipur ───────────────────────────────────────────────────────────
  if (msg.match(/udaipur|lake pichola|city palace udaipur|fateh sagar|lake city/)) {
    return routeReply("🏰", "Udaipur", 665, "10–11 hours",
      "Delhi → NH48 → Jaipur → Ajmer → Udaipur",
      [RAJ_TAX],
      "Lake Pichola boat ride, City Palace complex, Jagdish Temple, Sajjangarh Palace & Saheliyon ki Bari.",
      "Innova Crysta or Hycross");
  }

  // ── Pushkar ───────────────────────────────────────────────────────────
  if (msg.match(/pushkar|brahma temple|pushkar lake|camel fair/)) {
    return routeReply("🐪", "Pushkar", 395, "6–7 hours",
      "Delhi → NH48 → Jaipur → Ajmer → Pushkar (15 km from Ajmer)",
      [RAJ_TAX],
      "The only Brahma Temple in the world, sacred Pushkar Lake ghats & the world-famous Camel Fair (November).",
      "Ertiga or Innova Crysta");
  }

  // ── Mount Abu ─────────────────────────────────────────────────────────
  if (msg.match(/mount abu|dilwara|nakki lake|guru shikhar/)) {
    return routeReply("⛰️", "Mount Abu", 780, "12–13 hours",
      "Delhi → NH48 → Jaipur → Udaipur → Abu Road → Mount Abu (ghat road)",
      [RAJ_TAX],
      "Dilwara Jain Temples (finest marble carvings in India, 1031 AD), Guru Shikhar (highest Aravalli peak, 1,722 m) & Nakki Lake. Rajasthan's only hill station.",
      "Innova Crysta");
  }

  // ── Rishikesh ────────────────────────────────────────────────────────
  if (msg.match(/rishikesh|ram jhula|laxman jhula|rafting|yoga capital/)) {
    return routeReply("🧘", "Rishikesh", 240, "4.5–5.5 hours",
      "Delhi → Meerut → Roorkee → Haridwar → Rishikesh",
      [],
      "Ram Jhula & Laxman Jhula suspension bridges, Ganga rafting, Beatles Ashram & Parmarth Niketan evening aarti.",
      "Ertiga or Innova Crysta");
  }

  // ── Haridwar ─────────────────────────────────────────────────────────
  if (msg.match(/haridwar|har ki pauri|ganga aarti haridwar|mansa devi/)) {
    return routeReply("🙏", "Haridwar", 220, "4–5 hours",
      "Delhi → NH58 → Meerut → Roorkee → Haridwar",
      [],
      "Har Ki Pauri Ganga Aarti (6:30 PM daily — unmissable), Mansa Devi Temple ropeway & Chandi Devi Temple.",
      "Swift Dzire or Ertiga");
  }

  // ── Dehradun / Mussoorie ─────────────────────────────────────────────
  if (msg.match(/dehradun|mussoorie|doon|queen of hills/)) {
    const isDoon = msg.includes("dehradun") || msg.includes("doon");
    const dest = isDoon ? "Dehradun" : "Mussoorie";
    const km = isDoon ? 250 : 295;
    const dur = isDoon ? "4.5–5.5 hours" : "5.5–6.5 hours";
    return routeReply("🌄", dest, km, dur,
      `Delhi → NH58 → Meerut → Roorkee → Haridwar → ${dest}`,
      [],
      isDoon
        ? "Robber's Cave (Guchhupani), Sahastradhara, FRI campus & Mindrolling Monastery."
        : "Mall Road, Kempty Falls, Camel's Back Road & Lal Tibba viewpoint (highest point in Mussoorie).",
      "Ertiga or Innova Crysta");
  }

  // ── Nainital ─────────────────────────────────────────────────────────
  if (msg.match(/nainital|naini lake|naini peak|nainital zoo/)) {
    return routeReply("🏔️", "Nainital", 320, "6–7 hours",
      "Delhi → NH9 → Moradabad → Ramnagar → Nainital",
      [],
      "Naini Lake boating, Naina Devi Temple, Snow View Point (cable car) & Tiffin Top sunset.",
      "Innova Crysta");
  }

  // ── Jim Corbett ──────────────────────────────────────────────────────
  if (msg.match(/corbett|jim corbett|ramnagar|tiger safari|dhikala/)) {
    return routeReply("🐯", "Jim Corbett", 250, "5–6 hours",
      "Delhi → NH9 → Moradabad → Ramnagar (Corbett gate)",
      [],
      "Tiger safaris in Dhikala, Bijrani & Jhirna zones. India's oldest national park (1936). Ramganga River, bird-watching & leopard sightings.",
      "Innova Crysta");
  }

  // ── Lansdowne ─────────────────────────────────────────────────────────
  if (msg.match(/lansdowne|tip.?n.?top|bhim pakora|garhwal rifles/)) {
    return routeReply("🌿", "Lansdowne", 265, "5–6 hours",
      "Delhi → NH119 → Hapur → Kotdwar → Lansdowne",
      [],
      "Tip'n'Top viewpoint, Bhim Pakora balanced boulders, Garhwal Rifles War Memorial & Tarkeshwar Mahadev Temple (38 km, ancient cedar forest). Uttarakhand's most peaceful hill station.",
      "Ertiga or Swift Dzire");
  }

  // ── Kashmir / Srinagar ───────────────────────────────────────────────
  if (msg.match(/kashmir|srinagar|dal lake|gulmarg|pahalgam|houseboats|shikara/)) {
    return routeReply("🏔️", "Kashmir (Srinagar)", 820, "14–16 hours",
      "Delhi → NH44 → Jammu → Jammu-Srinagar Highway → Srinagar",
      ["• Jammu & Kashmir e-permit required in certain areas (check before travel)"],
      "Dal Lake shikaras, Mughal Gardens (Nishat, Shalimar), Gulmarg gondola & Pahalgam valley.",
      "Innova Crysta or Hycross");
  }

  // ── Vaishno Devi / Katra ─────────────────────────────────────────────
  if (msg.match(/vaishno|vaishnodevi|katra|mata rani|trikuta/)) {
    return routeReply("🙏", "Vaishno Devi (Katra)", 650, "12–13 hours",
      "Delhi → NH44 → Jammu → Katra base camp",
      [],
      "We drop you at Katra — the 14 km trek to Mata Vaishno Devi shrine starts here. Helicopter darshan available from Katra (book separately).",
      "Innova Crysta or Ertiga");
  }

  // ── Amritsar ─────────────────────────────────────────────────────────
  if (msg.match(/amritsar|golden temple|harmandir sahib|wagah border|jallianwala/)) {
    return routeReply("🙏", "Amritsar", 460, "7–8 hours",
      "Delhi → NH44 → Ambala → Ludhiana → Amritsar",
      [],
      "Golden Temple (24/7, entry free), Wagah Border Retreat Ceremony (5 PM), Jallianwala Bagh & Durgiana Temple.",
      "Innova Crysta or Ertiga");
  }

  // ── Ludhiana ─────────────────────────────────────────────────────────
  if (msg.match(/ludhiana/)) {
    return routeReply("🏙️", "Ludhiana", 310, "5–6 hours",
      "Delhi → NH44 → Ambala → Ludhiana",
      [],
      "Punjab Agricultural University campus, Ranjit Singh War Memorial, Gurudwara Dukhniwaran Sahib & the Punjab War Heroes Memorial.",
      "Swift Dzire or Ertiga");
  }

  // ── Chandigarh (Punjab gate) ── already covered above

  // ── Mathura ───────────────────────────────────────────────────────────
  if (msg.match(/mathura|krishna janmabhoomi|dwarkadhish|govardhan/)) {
    return routeReply("🦚", "Mathura", 165, "2.5–3 hours",
      "Delhi → Yamuna Expressway → Mathura",
      [],
      "Krishna Janmabhoomi (birthplace of Lord Krishna), Dwarkadhish Temple ghats, Govardhan Hill (26 km from Mathura) & the colourful Holi celebrations (March).",
      "Swift Dzire or Ertiga");
  }

  // ── Vrindavan ─────────────────────────────────────────────────────────
  if (msg.match(/vrindavan|prem mandir|iskcon vrindavan|banke bihari|nidhivan/)) {
    return routeReply("🦚", "Vrindavan", 155, "2.5–3 hours",
      "Delhi → Yamuna Expressway → Vrindavan (12 km from Mathura)",
      [],
      "Prem Mandir light show (7:30–8:30 PM daily, free), Banke Bihari Mandir (unique parda darshan), ISKCON Vrindavan & sacred Nidhivan grove.",
      "Swift Dzire");
  }

  // ── Ayodhya ───────────────────────────────────────────────────────────
  if (msg.match(/ayodhya|ram mandir|saryu|ramlala|hanuman garhi/)) {
    return routeReply("🛕", "Ayodhya", 640, "9–10 hours",
      "Delhi → Yamuna Expressway → Agra-Lucknow Expressway (NH19) → Ayodhya",
      [],
      "Ram Mandir (newly built, 2024 inauguration), Kanak Bhawan, Hanuman Garhi, Saryu Ghats & Ram Ki Paidi for sunset.",
      "Innova Crysta or Ertiga");
  }

  // ── Prayagraj / Sangam ───────────────────────────────────────────────
  if (msg.match(/prayagraj|allahabad|sangam|triveni|kumbh|anand bhawan/)) {
    return routeReply("🕉️", "Prayagraj", 645, "9–10 hours",
      "Delhi → Yamuna Expressway → Agra-Lucknow Expressway (NH19) → Prayagraj",
      [],
      "Triveni Sangam (confluence of Ganga, Yamuna & mythical Saraswati), Anand Bhawan, Allahabad Fort & Khusro Bagh. Kumbh Mela venue.",
      "Innova Crysta or Ertiga");
  }

  // ── Lucknow ───────────────────────────────────────────────────────────
  if (msg.match(/lucknow|nawab|bara imambara|rumi darwaza|hazratganj|tunday/)) {
    return routeReply("🏛️", "Lucknow", 555, "7–8 hours",
      "Delhi → Yamuna Expressway → Agra-Lucknow Expressway (NH19) → Lucknow",
      [],
      "Bara Imambara (Bhul Bhulaiya labyrinth), Rumi Darwaza, Chota Imambara & Hazratganj for Tunday Kababi (iconic seekh kebab since 1905).",
      "Innova Crysta or Ertiga");
  }

  // ── Banaras / Varanasi ───────────────────────────────────────────────
  if (msg.match(/banaras|varanasi|kashi|ganga ghat|dashashwamedh|sarnath|kashi vishwanath/)) {
    return routeReply("🪔", "Banaras (Varanasi)", 820, "12–14 hours",
      "Delhi → Yamuna Expressway → Agra-Lucknow Expressway → NH27 → Varanasi",
      [],
      "Ganga Aarti at Dashashwamedh Ghat (7 PM, unmissable), Kashi Vishwanath Temple (Jyotirlinga), Sarnath Buddhist site & sunrise boat ride on the Ganga.",
      "Innova Crysta");
  }

  // ── Booking ───────────────────────────────────────────────────────────
  if (msg.match(/book|reserve|hire|rent|how to book|booking process|steps/)) {
    return `Booking with EasyOutstation is simple:\n\n1️⃣ Go to easyoutstation.com\n2️⃣ Enter From (Delhi / Gurgaon / Noida) and To (your destination)\n3️⃣ Select travel date & car\n4️⃣ Pay 10% advance online (Razorpay — UPI, card, netbanking)\n5️⃣ Receive booking confirmation + driver details within 60 minutes\n\nBalance 90% is paid directly to your driver at pickup. No hidden charges — toll & parking are charged at actuals.\n\nNeed help? WhatsApp us at ${WHATSAPP} — we respond in minutes.`;
  }

  // ── Car recommendations ───────────────────────────────────────────────
  if (msg.match(/best car|recommend|which car|suggest|suitable|good car|fleet|cars available/)) {
    return `Our full fleet — all include professional driver & AC:\n\n💰 Swift Dzire (₹12/km) — Best for budget & couple/solo trips (max 4 pax)\n🚗 Toyota Etios (₹13/km) — Comfortable sedan, great value\n👨‍👩‍👧 Maruti Ertiga (₹15/km) — 6-seater, ideal for families\n👥 Mahindra Xylo (₹16/km) — Spacious MUV for large groups\n🚐 Kia Carens (₹17/km) — Premium 6-seater with modern features\n🏔️ Toyota Innova (₹19/km) — Reliable for long highway & hills\n⭐ Innova Crysta (₹20/km) — Most popular choice for all routes\n🌟 Innova Hycross (₹22/km) — Top luxury, hybrid, quietest ride\n\n📌 For Spiti Valley: Innova Crysta/Hycross mandatory (sedan not suitable).\n📌 For Manali/Shimla/Dharamshala: Crysta or Hycross strongly recommended.\n\nShare your destination & group size for a personalised recommendation!`;
  }

  // ── Driver ────────────────────────────────────────────────────────────
  if (msg.match(/driver|chauffeur|safe|experienced|pilot/)) {
    return `All our cars come with professional drivers ✅\n\n• Police-verified & background checked\n• Experienced in both highway & mountain driving\n• Driver details shared within 60 minutes of booking\n• Driver allowance: ₹250/day (included in fare estimate)\n• Night allowance included for outstation trips\n\nYour driver will call you 1 hour before pickup.`;
  }

  // ── Cancellation ─────────────────────────────────────────────────────
  if (msg.match(/cancel|refund|reschedule|change booking|money back/)) {
    return `Cancellation policy:\n\n✅ Free cancellation — up to 24 hours before pickup (full refund)\n🔶 50% refund — cancellation within 12–24 hours of pickup\n❌ No refund — cancellation within 12 hours of pickup\n\nTo cancel or reschedule, email: 📧 ${EMAIL}\nOr WhatsApp: 📱 ${WHATSAPP}`;
  }

  // ── Payment ───────────────────────────────────────────────────────────
  if (msg.match(/pay|payment|upi|gpay|card|cash|advance|online payment/)) {
    return `Payment options:\n\n📱 UPI (GPay, PhonePe, Paytm)\n💳 Credit/Debit Cards\n🏦 Net Banking\n💵 Cash to driver at pickup\n\nA 10% advance via Razorpay confirms your booking. The remaining 90% is paid directly to your driver at pickup — in cash, UPI, or card.`;
  }

  // ── Toll / State taxes ────────────────────────────────────────────────
  if (msg.match(/toll|extra charge|hidden|state permit|state tax|himachal tax|rajasthan permit|parking/)) {
    return `Additional charges — always charged at actuals, never marked up:\n\n🛣️ Toll: charged as per route (shown as estimate on our route pages)\n📋 Himachal Pradesh entry tax: ~₹350–500/vehicle (for Shimla, Manali, Dharamshala, Kasauli, Dalhousie, Spiti)\n📋 Rajasthan state permit: ~₹250–450/vehicle (for Jaipur, Jodhpur, Udaipur, Pushkar, Mount Abu)\n🅿️ Parking: charged at actuals at all stops\n\nAll these are estimates shown as a guide on our website. You pay exactly what is charged on the road — we do not add any markup.`;
  }

  // ── Routes / Destinations ─────────────────────────────────────────────
  if (msg.match(/route|destination|where|city|places|travel|trip|tour|all destination/)) {
    return `All 30+ routes from Delhi 🗺️\n\n🏔️ Hills & Mountains\nManali (540 km) · Shimla (350 km) · Dharamshala (475 km) · Dalhousie (555 km) · Kasauli (315 km) · Spiti Valley (785 km) · Lansdowne (265 km) · Jim Corbett (250 km) · Mussoorie (295 km) · Dehradun (250 km) · Nainital (320 km)\n\n🧘 Uttarakhand Pilgrimage\nRishikesh (240 km) · Haridwar (220 km)\n\n🏰 Rajasthan\nJaipur (280 km) · Jodhpur (600 km) · Udaipur (665 km) · Pushkar (395 km) · Mount Abu (780 km) · Agra (230 km)\n\n🛕 UP & East\nMathura (165 km) · Vrindavan (155 km) · Lucknow (555 km) · Prayagraj (645 km) · Ayodhya (640 km) · Banaras (820 km)\n\n🏙️ Punjab & North\nChandigarh (250 km) · Ludhiana (310 km) · Amritsar (460 km) · Vaishno Devi (650 km) · Kashmir (820 km)\n\nJust tell me your destination for fare estimate, route & best car recommendation!`;
  }

  // ── Contact ───────────────────────────────────────────────────────────
  if (msg.match(/contact|support|help|email|reach|talk|connect|complaint|feedback/)) {
    return `We're here to help! 🙋\n\n📱 WhatsApp: ${WHATSAPP} (Fastest — usually replies in minutes)\n📧 Email: ${EMAIL}\n📞 Call: ${PHONE}\n\nAvailable 24/7. WhatsApp is the fastest way for urgent booking help.`;
  }

  // ── About EasyOutstation ──────────────────────────────────────────────
  if (msg.match(/about|who are you|company|easyoutstation|what do you/)) {
    return `About EasyOutstation 🚗\n\nWe are Delhi's premium outstation cab service — covering 30+ destinations across North India.\n\n✅ Police-verified, experienced drivers\n✅ Well-maintained fleet (under 3 years old)\n✅ Transparent pricing — no hidden charges\n✅ Toll & parking at actuals, no markup\n✅ Driver details within 60 minutes of booking\n✅ Free cancellation up to 24 hours before pickup\n✅ 24/7 customer support\n\nPickup from anywhere in Delhi NCR (New Delhi, Gurgaon, Noida, Faridabad, Ghaziabad, Rohtak, Sonipat).`;
  }

  // ── Round trip ────────────────────────────────────────────────────────
  if (msg.match(/round trip|return|both way|two way/)) {
    return `Round Trip Pricing:\n\nRound trips are calculated as 2× the one-way distance.\n\nExample — Delhi to Manali round trip (1,080 km total):\n🚗 Sedan: ₹13,210\n🚐 Innova Crysta: ₹21,850\n\nSelect "Round Trip" when booking on the website and the fare is shown transparently. Driver stay allowance (₹250/day) covers the full trip duration. No surprises.`;
  }

  // ── Referral / Corporate ──────────────────────────────────────────────
  if (msg.match(/referral|refer|earn|₹100|credit/)) {
    return `Refer & Earn ₹100 🎁\n\nRefer a friend to EasyOutstation and you both get ₹100 travel credit when they complete their first ride.\n\n1️⃣ Log in to your EasyOutstation account\n2️⃣ Go to Dashboard → Refer & Earn tab\n3️⃣ Copy your unique referral link\n4️⃣ Share with friends\n\nCredits are added within 24 hours of their first completed trip. Valid for 90 days. No limit on referrals!`;
  }

  if (msg.match(/corporate|company|business|gst invoice|team booking/)) {
    return `Corporate Account 🏢\n\nEasyOutstation offers dedicated corporate accounts for businesses.\n\n✅ Team dashboard — track all company trips\n✅ Monthly spend reports\n✅ GST invoice support\n✅ Multiple employees under one account (join code system)\n\nRegister at: easyoutstation.com/corporate-portal\nApproval within 24 hours.\n\nFor details, email: ${EMAIL}`;
  }

  // ── Thank you ─────────────────────────────────────────────────────────
  if (msg.match(/thank|thanks|great|awesome|helpful|good|nice/)) {
    return `You're welcome! 😊 Happy to help.\n\nIf you have any more questions or need help booking, just ask. Have a wonderful trip! 🚗✨`;
  }

  // ── Default fallback ──────────────────────────────────────────────────
  return `I'm not sure I have the right answer for that — but I don't want to leave you stuck! 😊\n\nFor specific queries, our team can help you better:\n\n📱 WhatsApp: ${WHATSAPP} (fastest — usually replies in minutes)\n📧 Email: ${EMAIL}\n\nOr browse all routes and book directly at easyoutstation.com!`;
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
          "All routes from Delhi",
          "What are your prices?",
          "Best car for Manali?",
          "Toll & state tax info",
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
          { carId: 6, reason: "Most popular for all routes", confidence: 0.95 },
          { carId: 8, reason: "Premium luxury experience", confidence: 0.88 },
          { carId: 5, reason: "Best value for families", confidence: 0.92 }
        );
      } else {
        const passengers = input.passengers || 4;
        const toCity = input.toCity?.toLowerCase() ?? "";
        const isHill = ["manali", "shimla", "nainital", "mussoorie", "rishikesh", "dehradun",
          "dharamshala", "dalhousie", "kasauli", "spiti", "lansdowne", "corbett",
          "kashmir", "vaishno", "nainital", "mussoorie"].some(d => toCity.includes(d));
        const isSpiti = toCity.includes("spiti") || toCity.includes("kaza");

        if (isSpiti) {
          recommendations.push({ carId: 6, reason: "Mandatory SUV for Spiti roads", confidence: 0.99 });
          recommendations.push({ carId: 8, reason: "Most comfortable for 2-day Spiti journey", confidence: 0.95 });
        } else if (passengers <= 4) {
          recommendations.push({ carId: 1, reason: "Perfect for small groups, fuel efficient", confidence: 0.90 });
          recommendations.push({ carId: 2, reason: "Reliable sedan with extra comfort", confidence: 0.85 });
        } else {
          recommendations.push({ carId: 5, reason: "Spacious MUV ideal for families", confidence: 0.92 });
          recommendations.push({ carId: 4, reason: "Popular choice with great value", confidence: 0.88 });
        }
        if (isHill) {
          recommendations.unshift({ carId: 6, reason: "Best for mountain terrain & hill roads", confidence: 0.95 });
        }
        if (input.budget === "premium") {
          recommendations.unshift({ carId: 8, reason: "Luxury hybrid — quietest & smoothest", confidence: 0.93 });
        } else if (input.budget === "budget") {
          recommendations.unshift({ carId: 1, reason: "Most economical option", confidence: 0.94 });
        }
      }
      return recommendations.slice(0, 4);
    }),
});
