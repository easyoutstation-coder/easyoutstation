import { useParams, useNavigate, Link } from "react-router";
import { useSeo } from "@/hooks/useSeo";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Shield, Star, Check, ArrowRight } from "lucide-react";
import { getLandmark } from "@/data/routeImages";
import { trpc } from "@/providers/trpc";

const ROUTES: Record<string, {
  from: string; to: string; distance: number; duration: string;
  fare: { min: number; max: number }; toll: number;
  highlights: string[]; faqs: { q: string; a: string }[];
  description: string;
}> = {
  "delhi-to-manali": {
    from: "Delhi", to: "Manali", distance: 540, duration: "12-14 hours",
    fare: { min: 6730, max: 12130 }, toll: 850,
    description: "Book Delhi to Manali cab at fixed fares. Experienced mountain drivers, comfortable cars, no hidden charges. One way and round trip available.",
    highlights: ["Experienced mountain drivers", "AC cars with comfortable seats", "Available 24/7", "Fixed price — no surge"],
    faqs: [
      { q: "How long is the Delhi to Manali cab journey?", a: "Delhi to Manali is approximately 540 km and takes 12-14 hours by road depending on traffic and road conditions." },
      { q: "What is the best car for Delhi to Manali trip?", a: "We recommend Toyota Innova Crysta or Innova Hycross for Manali trips due to mountain terrain. Sedans are also available at lower fares." },
      { q: "Is night travel safe on Delhi-Manali route?", a: "We advise daytime travel on this route due to mountain roads. Our drivers are experienced and will plan the best route for your safety." },
    ]
  },
  "delhi-to-shimla": {
    from: "Delhi", to: "Shimla", distance: 350, duration: "7-8 hours",
    fare: { min: 4450, max: 8000 }, toll: 650,
    description: "Book Delhi to Shimla cab at fixed fares. Professional drivers, AC cars, door-to-door pickup. One way and round trip available.",
    highlights: ["Hill station specialists", "AC cars", "Available 24/7", "No hidden charges"],
    faqs: [
      { q: "How far is Delhi to Shimla by cab?", a: "Delhi to Shimla is approximately 350 km and takes 7-8 hours by cab via NH44 and NH5." },
      { q: "Which is the best route from Delhi to Shimla?", a: "The best route is via Chandigarh on NH44, then NH5 to Shimla. Our drivers take the safest and fastest route." },
    ]
  },
  "delhi-to-chandigarh": {
    from: "Delhi", to: "Chandigarh", distance: 260, duration: "4-5 hours",
    fare: { min: 3370, max: 6070 }, toll: 380,
    description: "Book Delhi to Chandigarh cab at fixed fares. Fast, comfortable and reliable. One way and round trip available.",
    highlights: ["Fast highway route", "4-5 hours journey", "Fixed fares", "Verified drivers"],
    faqs: [
      { q: "How long is Delhi to Chandigarh by cab?", a: "Delhi to Chandigarh is 260 km and takes approximately 4-5 hours via NH44 (Ambala highway)." },
      { q: "Is there a direct cab from Delhi to Chandigarh?", a: "Yes. EasyOutstation offers direct door-to-door cab service from anywhere in Delhi to Chandigarh." },
    ]
  },
  "delhi-to-jaipur": {
    from: "Delhi", to: "Jaipur", distance: 280, duration: "4-5 hours",
    fare: { min: 3610, max: 6410 }, toll: 350,
    description: "Book Delhi to Jaipur cab at fixed fares. Comfortable AC cabs, experienced drivers, on-time pickup guaranteed.",
    highlights: ["Express highway route", "4-5 hours", "Fixed fares", "AC cars"],
    faqs: [
      { q: "How far is Delhi to Jaipur by cab?", a: "Delhi to Jaipur is 280 km via NH48 (Delhi-Mumbai Expressway) and takes 4-5 hours." },
      { q: "What is the cheapest cab from Delhi to Jaipur?", a: "Swift Dzire starts from ₹3,610 one way. Price includes driver charges. Toll is charged at actuals." },
    ]
  },
  "delhi-to-agra": {
    from: "Delhi", to: "Agra", distance: 230, duration: "3-4 hours",
    fare: { min: 3010, max: 5310 }, toll: 290,
    description: "Book Delhi to Agra cab at fixed fares. Visit the Taj Mahal comfortably. Same day return trips available.",
    highlights: ["Yamuna Expressway route", "3-4 hours", "Same day return available", "Taj Mahal specialists"],
    faqs: [
      { q: "How far is Delhi to Agra by cab?", a: "Delhi to Agra is 230 km via Yamuna Expressway and takes 3-4 hours." },
      { q: "Can I book a same-day return cab from Delhi to Agra?", a: "Yes. We offer round trip same day bookings. Visit Taj Mahal and return the same day." },
    ]
  },
  "delhi-to-rishikesh": {
    from: "Delhi", to: "Rishikesh", distance: 250, duration: "5-6 hours",
    fare: { min: 3250, max: 5750 }, toll: 450,
    description: "Book Delhi to Rishikesh cab at fixed fares. Adventure awaits! Comfortable journey to the yoga and rafting capital.",
    highlights: ["Scenic route", "5-6 hours", "Fixed fares", "Adventure ready"],
    faqs: [
      { q: "How far is Delhi to Rishikesh by cab?", a: "Delhi to Rishikesh is approximately 250 km and takes 5-6 hours via NH58." },
      { q: "Is cab the best way to travel from Delhi to Rishikesh?", a: "Yes, a cab is the most comfortable option as it offers door-to-door service and flexible timings." },
    ]
  },
  "delhi-to-dehradun": {
    from: "Delhi", to: "Dehradun", distance: 300, duration: "5-6 hours",
    fare: { min: 3850, max: 6850 }, toll: 420,
    description: "Book Delhi to Dehradun cab at fixed fares. Gateway to Uttarakhand. Comfortable, reliable and affordable.",
    highlights: ["NH58 highway route", "5-6 hours", "Fixed fares", "Uttarakhand specialists"],
    faqs: [
      { q: "How far is Delhi to Dehradun by cab?", a: "Delhi to Dehradun is approximately 300 km and takes 5-6 hours by cab." },
      { q: "What is the fare for Delhi to Dehradun cab?", a: "Fares start from ₹3,850 for a sedan to ₹6,850 for a premium SUV. Price includes driver charges. Toll is charged at actuals." },
    ]
  },
  "delhi-to-mussoorie": {
    from: "Delhi", to: "Mussoorie", distance: 310, duration: "6-7 hours",
    fare: { min: 3970, max: 7070 }, toll: 430,
    description: "Book Delhi to Mussoorie cab at fixed fares. The Queen of Hills awaits. Scenic mountain drive with experienced drivers.",
    highlights: ["Scenic mountain route", "6-7 hours", "Experienced hill drivers", "Fixed fares"],
    faqs: [
      { q: "How far is Delhi to Mussoorie by cab?", a: "Delhi to Mussoorie is approximately 310 km via Dehradun and takes 6-7 hours by road." },
      { q: "Which is the best route from Delhi to Mussoorie?", a: "The best route is via NH44 to Dehradun, then the mountain road to Mussoorie. Our drivers take the safest hill route." },
      { q: "What car is recommended for Delhi to Mussoorie?", a: "We recommend Innova Crysta or Innova Hycross for the mountain terrain. Sedans are also available at lower fares." },
    ]
  },
  "delhi-to-nainital": {
    from: "Delhi", to: "Nainital", distance: 310, duration: "6-7 hours",
    fare: { min: 3970, max: 7070 }, toll: 420,
    description: "Book Delhi to Nainital cab at fixed fares. Discover the lake city of Uttarakhand. Safe mountain driving with verified drivers.",
    highlights: ["Kumaon hills specialists", "6-7 hours", "Fixed fares", "Lake city destination"],
    faqs: [
      { q: "How far is Delhi to Nainital by cab?", a: "Delhi to Nainital is approximately 310 km and takes 6-7 hours via Moradabad and Kathgodam." },
      { q: "What is the cab fare from Delhi to Nainital?", a: "Fares start from ₹3,970 for a sedan to ₹7,070 for a premium SUV. Price includes driver charges. Toll is charged at actuals." },
      { q: "Is it safe to drive to Nainital?", a: "Yes. Our drivers are experienced on the Kumaon mountain roads. We recommend daytime travel for the mountain stretch." },
    ]
  },
  "delhi-to-mathura": {
    from: "Delhi", to: "Mathura", distance: 175, duration: "2-3 hours",
    fare: { min: 2350, max: 4100 }, toll: 250,
    description: "Book Delhi to Mathura cab at fixed fares. Visit the birthplace of Lord Krishna. Quick and comfortable same-day trip from Delhi.",
    highlights: ["Yamuna Expressway route", "2-3 hours", "Same day return popular", "Pilgrimage destination"],
    faqs: [
      { q: "How far is Delhi to Mathura by cab?", a: "Delhi to Mathura is approximately 175 km via Yamuna Expressway and takes just 2-3 hours." },
      { q: "Can I do Delhi to Mathura-Vrindavan in a day?", a: "Yes, absolutely. A day trip covering Mathura and Vrindavan (just 15 km apart) is very popular and comfortable by cab." },
      { q: "What is the cheapest Delhi to Mathura cab fare?", a: "A Swift Dzire starts from ₹2,350 one way. Price includes driver charges. Toll is charged at actuals." },
    ]
  },
  "delhi-to-amritsar": {
    from: "Delhi", to: "Amritsar", distance: 460, duration: "7-8 hours",
    fare: { min: 5770, max: 10370 }, toll: 600,
    description: "Book Delhi to Amritsar cab at fixed fares. Visit the Golden Temple and Wagah Border with comfort. Verified drivers, AC cars, no hidden charges. One way and round trip available.",
    highlights: ["NH44 highway route", "7-8 hours", "Golden Temple specialists", "Wagah Border visit"],
    faqs: [
      { q: "How far is Delhi to Amritsar by cab?", a: "Delhi to Amritsar is approximately 460 km via NH44 (Grand Trunk Road) and takes 7-8 hours depending on traffic." },
      { q: "What is the cab fare from Delhi to Amritsar?", a: "Fares start from ₹5,770 for a Swift Dzire to ₹10,370 for an Innova Hycross one way. Price includes driver charges. Toll is charged at actuals." },
      { q: "Can I visit Wagah Border from Delhi by cab?", a: "Yes. A popular itinerary is to leave Delhi early morning, visit Golden Temple, attend the Wagah Border ceremony at sunset, and return or stay overnight in Amritsar." },
      { q: "Is an overnight stay required for Delhi to Amritsar?", a: "For a comfortable trip with sightseeing, an overnight stay is recommended. However, a same-day return is possible if you leave Delhi by 4-5 AM." },
    ]
  },
  "delhi-to-dharamshala": {
    from: "Delhi", to: "Dharamshala", distance: 475, duration: "10-11 hours",
    fare: { min: 5950, max: 10700 }, toll: 700,
    description: "Book Delhi to Dharamshala cab at fixed fares. Explore McLeod Ganj, the Dalai Lama's abode, Kangra Valley and the Dhauladhar ranges. AC cars, verified drivers.",
    highlights: ["Home of the Dalai Lama", "McLeod Ganj access", "Kangra Valley views", "Mountain specialist drivers"],
    faqs: [
      { q: "How far is Delhi to Dharamshala by cab?", a: "Delhi to Dharamshala is approximately 475 km via NH44 and NH154 and takes 10-11 hours by cab." },
      { q: "What is the cab fare from Delhi to Dharamshala?", a: "Fares start from ₹5,950 for a Swift Dzire to ₹10,700 for an Innova Hycross one way. Price includes driver charges. Toll is charged at actuals." },
      { q: "Is Dharamshala and McLeod Ganj the same?", a: "McLeod Ganj is a suburb of Dharamshala, about 10 km uphill. Our cab drops you directly at McLeod Ganj or lower Dharamshala as preferred." },
      { q: "What is the best time to visit Dharamshala?", a: "March to June and September to November are ideal. Summers are pleasant while winters bring snowfall to McLeod Ganj — a unique experience." },
    ]
  },
  "delhi-to-kashmir": {
    from: "Delhi", to: "Kashmir", distance: 820, duration: "14-16 hours",
    fare: { min: 10090, max: 18290 }, toll: 1200,
    description: "Book Delhi to Kashmir cab at fixed fares. Experience Dal Lake, Mughal Gardens, Gulmarg and the paradise of India. Experienced drivers, AC cars, no hidden charges.",
    highlights: ["Dal Lake shikara rides", "Mughal Gardens visit", "Gulmarg day trip", "Pahalgam meadows"],
    faqs: [
      { q: "How far is Delhi to Kashmir (Srinagar) by cab?", a: "Delhi to Srinagar is approximately 820 km via Jammu and the Jammu-Srinagar National Highway. The journey takes 14-16 hours." },
      { q: "What is the fare for Delhi to Kashmir cab?", a: "Fares start from ₹10,090 for a sedan to ₹18,290 for an Innova Hycross. Price includes driver charges. Toll is charged at actuals." },
      { q: "Is it safe to drive Delhi to Kashmir by road?", a: "Yes. Our drivers are experienced on this route. We recommend daytime travel on the Jammu-Srinagar highway. The route is a well-maintained national highway." },
      { q: "Which is better — cab or flight to Kashmir from Delhi?", a: "A cab lets you stop at Jammu, Patnitop and enjoy the scenic Banihal Pass. A flight is faster but a cab gives the full Himalayan road experience." },
    ]
  },
  "delhi-to-vaishno-devi": {
    from: "Delhi", to: "Vaishno Devi", distance: 650, duration: "12-13 hours",
    fare: { min: 8050, max: 14550 }, toll: 900,
    description: "Book Delhi to Vaishno Devi cab at fixed fares. We drop you at Katra, the base camp for the holy shrine. Comfortable AC cabs, verified drivers, pilgrimage specialists.",
    highlights: ["Drop at Katra base camp", "Trikuta Mountain access", "Pilgrimage specialists", "Ample luggage space"],
    faqs: [
      { q: "How far is Delhi to Vaishno Devi by cab?", a: "Delhi to Katra (Vaishno Devi base camp) is approximately 650 km via NH44 and takes 12-13 hours by cab." },
      { q: "Does the cab go to the Vaishno Devi shrine?", a: "Cabs drop you at Katra, the base town. The 14 km trek to the shrine starts from Katra. Helicopter services are also available from Katra for darshan." },
      { q: "What is the fare for Delhi to Vaishno Devi cab?", a: "Fares start from ₹8,050 for a sedan to ₹14,550 for an Innova Hycross. Price includes driver charges. Toll is charged at actuals." },
      { q: "What is the best time to travel Delhi to Vaishno Devi?", a: "The shrine is open all year. Navratri season (March-April and October) sees peak pilgrims. November to February has fewer crowds and cool mountain weather." },
    ]
  },
  "delhi-to-ludhiana": {
    from: "Delhi", to: "Ludhiana", distance: 310, duration: "5-6 hours",
    fare: { min: 3970, max: 7070 }, toll: 450,
    description: "Book Delhi to Ludhiana cab at fixed fares. Fast NH44 highway drive to the industrial capital of Punjab. AC cars, verified drivers, door-to-door service.",
    highlights: ["NH44 express highway", "5-6 hours journey", "Fixed price, no surge", "Verified drivers"],
    faqs: [
      { q: "How far is Delhi to Ludhiana by cab?", a: "Delhi to Ludhiana is approximately 310 km via NH44 and takes 5-6 hours depending on traffic." },
      { q: "What is the fare for Delhi to Ludhiana cab?", a: "Fares start from ₹3,970 for a Swift Dzire to ₹7,070 for an Innova Hycross. Price includes driver charges. Toll is charged at actuals." },
      { q: "Is there a direct cab from Delhi to Ludhiana?", a: "Yes. EasyOutstation offers direct door-to-door cab service from anywhere in Delhi to Ludhiana." },
      { q: "Can I continue to Amritsar from Ludhiana?", a: "Yes. Ludhiana to Amritsar is around 120 km (2 hours). Many travellers book Delhi to Amritsar via Ludhiana as a single trip." },
    ]
  },
  "delhi-to-ayodhya": {
    from: "Delhi", to: "Ayodhya", distance: 640, duration: "10-12 hours",
    fare: { min: 7930, max: 14330 }, toll: 850,
    description: "Book Delhi to Ayodhya cab at fixed fares. Visit Ram Mandir, Saryu Ghats and the sacred city of Lord Ram. Comfortable AC cabs, pilgrimage specialists.",
    highlights: ["Ram Mandir darshan", "Saryu river ghats", "Kanak Bhawan temple", "Hanuman Garhi"],
    faqs: [
      { q: "How far is Delhi to Ayodhya by cab?", a: "Delhi to Ayodhya is approximately 640 km via the Agra-Lucknow Expressway and takes 10-12 hours by cab." },
      { q: "What is the fare for Delhi to Ayodhya cab?", a: "Fares start from ₹7,930 for a sedan to ₹14,330 for an Innova Hycross. Price includes driver charges. Toll is charged at actuals." },
      { q: "What is the best route from Delhi to Ayodhya?", a: "The fastest route is via Agra-Lucknow Expressway (NH19). Our drivers take the best highway route to ensure on-time arrival." },
      { q: "Can I visit Ram Mandir from Delhi in a day?", a: "Ayodhya is 640 km from Delhi. A same-day return is very demanding. We recommend an overnight stay to visit Ram Mandir, Saryu Ghats, and Kanak Bhawan comfortably." },
    ]
  },
  "delhi-to-banaras": {
    from: "Delhi", to: "Banaras", distance: 820, duration: "12-14 hours",
    fare: { min: 10090, max: 18290 }, toll: 1100,
    description: "Book Delhi to Banaras cab at fixed fares. Experience the Ganga Aarti, Kashi Vishwanath Temple and the ancient ghats of Varanasi. Experienced drivers, AC cars.",
    highlights: ["Ganga Aarti at Dashashwamedh Ghat", "Kashi Vishwanath Temple", "Sarnath Buddhist site", "Sunrise boat ride on Ganga"],
    faqs: [
      { q: "How far is Delhi to Banaras (Varanasi) by cab?", a: "Delhi to Banaras is approximately 820 km via the Agra-Lucknow Expressway and NH27, taking 12-14 hours by cab." },
      { q: "What is the fare for Delhi to Banaras cab?", a: "Fares start from ₹10,090 for a sedan to ₹18,290 for an Innova Hycross. Price includes driver charges. Toll is charged at actuals." },
      { q: "Which is the best route from Delhi to Varanasi by cab?", a: "The fastest route is via Agra-Lucknow Expressway (NH19), then NH27 to Varanasi. Our drivers take the safest and fastest highway route." },
      { q: "What is the best time to visit Banaras?", a: "October to March is ideal. The Ganga Aarti at Dashashwamedh Ghat at sunrise or sunset is a must-attend. Dev Deepawali in November is especially magical." },
    ]
  },

  // ── Additional Delhi routes ──────────────────────────────────────────
  "delhi-to-haridwar": {
    from: "Delhi", to: "Haridwar", distance: 220, duration: "4-5 hours",
    fare: { min: 2890, max: 5090 }, toll: 320,
    description: "Book Delhi to Haridwar cab at fixed fares. Attend the iconic Ganga Aarti at Har Ki Pauri. AC cabs, verified drivers, door-to-door pickup.",
    highlights: ["Har Ki Pauri Ganga Aarti", "Chandi Devi & Mansa Devi temples", "Gateway to Rishikesh", "Pilgrimage specialists"],
    faqs: [
      { q: "How far is Delhi to Haridwar by cab?", a: "Delhi to Haridwar is approximately 220 km via NH58 and takes 4-5 hours by cab depending on traffic." },
      { q: "What is the fare for Delhi to Haridwar cab?", a: "Fares start from ₹2,890 for a Swift Dzire to ₹5,090 for an Innova Hycross. Price includes driver charges. Toll & parking charged at actuals." },
      { q: "What is the best time to attend Ganga Aarti in Haridwar?", a: "The evening Ganga Aarti at Har Ki Pauri happens at sunset (6–7 PM in winter, 7–8 PM in summer). Arrive 30 minutes early for a good spot by the ghat." },
      { q: "Can I visit Haridwar and Rishikesh on the same day from Delhi?", a: "Yes. Leave Delhi by 5 AM, reach Haridwar by 9–10 AM. Rishikesh is just 25 km away. A combined day trip is very popular and comfortable." },
    ]
  },
  "delhi-to-jodhpur": {
    from: "Delhi", to: "Jodhpur", distance: 600, duration: "9-10 hours",
    fare: { min: 7450, max: 13450 }, toll: 850,
    description: "Book Delhi to Jodhpur cab at fixed fares. Explore the Blue City — Mehrangarh Fort, Jaswant Thada and vibrant bazaars. AC cabs, verified drivers, no hidden charges.",
    highlights: ["Mehrangarh Fort", "Blue City rooftops", "Jaswant Thada cenotaph", "Sardar Market bazaar"],
    faqs: [
      { q: "How far is Delhi to Jodhpur by cab?", a: "Delhi to Jodhpur is approximately 600 km via NH48 (Delhi–Jaipur Expressway) and takes 9-10 hours by road." },
      { q: "What is the cab fare from Delhi to Jodhpur?", a: "Fares start from ₹7,450 for a sedan to ₹13,450 for an Innova Hycross. Price includes driver charges. Toll & state tax charged at actuals." },
      { q: "Is a stopover in Jaipur recommended on Delhi to Jodhpur?", a: "Many travellers stop in Jaipur (280 km from Delhi) for lunch or sightseeing and continue to Jodhpur the same day. Our drivers plan the route accordingly." },
      { q: "What is the best time to visit Jodhpur?", a: "October to March is ideal. Winters (November–February) are cool and pleasant. The Mehrangarh Fort is impressive at all times of year, especially at sunset." },
    ]
  },
  "delhi-to-udaipur": {
    from: "Delhi", to: "Udaipur", distance: 665, duration: "10-11 hours",
    fare: { min: 8230, max: 14880 }, toll: 950,
    description: "Book Delhi to Udaipur cab at fixed fares. Explore the City of Lakes — Lake Pichola, City Palace and Fateh Sagar. AC cabs, experienced drivers, fixed fares.",
    highlights: ["Lake Pichola boat ride", "City Palace complex", "Jagdish Temple", "Saheliyon ki Bari"],
    faqs: [
      { q: "How far is Delhi to Udaipur by cab?", a: "Delhi to Udaipur is approximately 665 km via NH48 through Jaipur and Ajmer, taking 10-11 hours by cab." },
      { q: "What is the fare for Delhi to Udaipur cab?", a: "Fares start from ₹8,230 for a sedan to ₹14,880 for an Innova Hycross. Price includes driver charges. Toll & state tax charged at actuals." },
      { q: "Is Delhi to Udaipur driveable in one stretch?", a: "Yes. Leave Delhi by 4 AM and you reach Udaipur by 3–4 PM with a stop for lunch in Jaipur or Ajmer. Our drivers are experienced on this route." },
      { q: "What is the best time to visit Udaipur?", a: "September to March is the best time. The lakes are full after monsoon (September–October) and winters are cool and festive, especially around Diwali." },
    ]
  },
  "delhi-to-pushkar": {
    from: "Delhi", to: "Pushkar", distance: 395, duration: "6-7 hours",
    fare: { min: 4990, max: 8940 }, toll: 550,
    description: "Book Delhi to Pushkar cab at fixed fares. Visit the only Brahma Temple in the world and the sacred Pushkar Lake. AC cabs, fixed fares, no hidden charges.",
    highlights: ["Brahma Temple darshan", "Pushkar Lake ghats", "Camel Fair (November)", "Desert bazaar experience"],
    faqs: [
      { q: "How far is Delhi to Pushkar by cab?", a: "Delhi to Pushkar is approximately 395 km via NH48 through Jaipur and Ajmer, taking 6-7 hours by cab." },
      { q: "What is the fare for Delhi to Pushkar cab?", a: "Fares start from ₹4,990 for a sedan to ₹8,940 for an Innova Hycross. Price includes driver charges. Toll charged at actuals." },
      { q: "Can I visit Ajmer and Pushkar on the same day?", a: "Yes. Ajmer Dargah and Pushkar are just 14 km apart. Many travellers visit both on the same day trip or combine them with a Jaipur stopover." },
      { q: "When is the Pushkar Camel Fair?", a: "The Pushkar Camel Fair happens in November (Kartik Purnima). It's one of the world's largest camel fairs — book well in advance during this period." },
    ]
  },
  "delhi-to-corbett": {
    from: "Delhi", to: "Corbett", distance: 250, duration: "5-6 hours",
    fare: { min: 3250, max: 5750 }, toll: 380,
    description: "Book Delhi to Jim Corbett cab at fixed fares. India's oldest national park — tiger safaris, elephant rides and the Ramganga River. AC cabs, verified drivers.",
    highlights: ["Tiger safari zones", "Ramganga River views", "Elephant rides at Dhikala", "Birdwatching paradise"],
    faqs: [
      { q: "How far is Delhi to Jim Corbett National Park by cab?", a: "Delhi to Corbett (Ramnagar gate) is approximately 250 km via NH9 through Moradabad and takes 5-6 hours by cab." },
      { q: "What is the fare for Delhi to Jim Corbett cab?", a: "Fares start from ₹3,250 for a sedan to ₹5,750 for an Innova Hycross. Price includes driver charges. Toll charged at actuals." },
      { q: "Which zone is best for tiger sightings in Corbett?", a: "Dhikala zone is the most renowned for tiger and wildlife sightings. Bijrani and Jhirna zones are also excellent alternatives and easier to book." },
      { q: "Do I need permits for Corbett National Park?", a: "Yes. Safari permits must be booked online at the Uttarakhand forest department portal. Our driver will drop you at the park gate — permits are your responsibility." },
    ]
  },
  "delhi-to-kasauli": {
    from: "Delhi", to: "Kasauli", distance: 315, duration: "5-6 hours",
    fare: { min: 4030, max: 7180 }, toll: 480,
    description: "Book Delhi to Kasauli cab at fixed fares. This quiet Himachal hill station is known for its colonial charm, pine forests and stunning valley views. AC cabs, verified drivers.",
    highlights: ["Gilbert Trail pine forests", "Monkey Point summit views", "Christ Church colonial heritage", "Himachal's quietest hill station"],
    faqs: [
      { q: "How far is Delhi to Kasauli by cab?", a: "Delhi to Kasauli is approximately 315 km via NH44 through Chandigarh, taking 5-6 hours by cab." },
      { q: "What is the fare for Delhi to Kasauli cab?", a: "Fares start from ₹4,030 for a sedan to ₹7,180 for an Innova Hycross. Price includes driver charges. Toll & Himachal state tax charged at actuals." },
      { q: "What is Kasauli known for?", a: "Kasauli is a British-era cantonment hill station in Himachal Pradesh with well-preserved colonial architecture, pine-lined walks (Gilbert Trail), and spectacular views of the Shivalik Hills." },
      { q: "Is Kasauli better than Shimla for a weekend trip?", a: "Kasauli is much quieter and less commercialised than Shimla — ideal for a peaceful weekend. Shimla has more attractions and activities. The right choice depends on whether you prefer crowds or calm." },
    ]
  },
  "delhi-to-dalhousie": {
    from: "Delhi", to: "Dalhousie", distance: 555, duration: "10-11 hours",
    fare: { min: 6910, max: 12460 }, toll: 800,
    description: "Book Delhi to Dalhousie cab at fixed fares. This Victorian hill station in Himachal Pradesh offers pine-clad ridges, colonial churches and views of the Dhauladhar range. AC cabs, mountain-specialist drivers.",
    highlights: ["Khajjiar — 'Mini Switzerland'", "Dainkund Peak hike", "St. Francis Church colonial walk", "Kalatop Wildlife Sanctuary"],
    faqs: [
      { q: "How far is Delhi to Dalhousie by cab?", a: "Delhi to Dalhousie is approximately 555 km via NH44 and NH154 through Pathankot, taking 10-11 hours by cab." },
      { q: "What is the fare for Delhi to Dalhousie cab?", a: "Fares start from ₹6,910 for a sedan to ₹12,460 for an Innova Hycross. Price includes driver charges. Toll & Himachal state tax charged at actuals." },
      { q: "What is Khajjiar and how far is it from Dalhousie?", a: "Khajjiar is a high-altitude meadow 24 km from Dalhousie, often called 'Mini Switzerland' for its green lawns and snow-capped backdrop. Our driver can include it as a day trip." },
      { q: "What is the best time to visit Dalhousie?", a: "April to June for pleasant summer weather. December to February for snowfall. Monsoon (July–August) brings lush scenery but landslide risk on the roads." },
    ]
  },
  "delhi-to-lucknow": {
    from: "Delhi", to: "Lucknow", distance: 555, duration: "7-8 hours",
    fare: { min: 6910, max: 12460 }, toll: 750,
    description: "Book Delhi to Lucknow cab at fixed fares. Explore the City of Nawabs — Bara Imambara, Rumi Darwaza and iconic Tunday Kababi. AC cabs, verified drivers, door-to-door service.",
    highlights: ["Bara Imambara & Bhool Bhulaiya", "Rumi Darwaza", "Hazratganj market stroll", "Tunday Kababi kebabs"],
    faqs: [
      { q: "How far is Delhi to Lucknow by cab?", a: "Delhi to Lucknow is approximately 555 km via the Yamuna Expressway and Agra-Lucknow Expressway (NH19), taking 7-8 hours." },
      { q: "What is the fare for Delhi to Lucknow cab?", a: "Fares start from ₹6,910 for a sedan to ₹12,460 for an Innova Hycross. Price includes driver charges. Toll charged at actuals." },
      { q: "Is the Agra-Lucknow Expressway safe for night travel?", a: "The Agra-Lucknow Expressway is a well-lit 6-lane highway and is generally safe. Our verified drivers are experienced on this route round the clock." },
      { q: "Can I continue from Lucknow to Ayodhya?", a: "Yes. Lucknow to Ayodhya is 130 km (2.5 hours). Many travellers combine Lucknow and Ayodhya on a 2-night trip from Delhi — our drivers can handle the full multi-stop route." },
    ]
  },
  "delhi-to-prayagraj": {
    from: "Delhi", to: "Prayagraj", distance: 645, duration: "9-10 hours",
    fare: { min: 7990, max: 14440 }, toll: 900,
    description: "Book Delhi to Prayagraj cab at fixed fares. Visit the Sangam — confluence of Ganga, Yamuna and the mythical Saraswati. Kumbh Mela, Anand Bhavan and Triveni Ghat. AC cabs, verified drivers.",
    highlights: ["Sangam — holy confluence", "Triveni Ghat sunrise", "Anand Bhavan (Nehru memorial)", "Hanuman Mandir — 20 ft reclining Hanuman"],
    faqs: [
      { q: "How far is Delhi to Prayagraj by cab?", a: "Delhi to Prayagraj is approximately 645 km via the Yamuna Expressway and NH19, taking 9-10 hours by cab." },
      { q: "What is the fare for Delhi to Prayagraj cab?", a: "Fares start from ₹7,990 for a sedan to ₹14,440 for an Innova Hycross. Price includes driver charges. Toll charged at actuals." },
      { q: "When is the Kumbh Mela held in Prayagraj?", a: "The Maha Kumbh is held every 12 years (next: 2025). Ardh Kumbh every 6 years and Magh Mela every year. During Maha Kumbh, roads around Prayagraj can be heavily congested — plan extra travel time." },
      { q: "Can I combine Prayagraj and Banaras on one trip?", a: "Yes. Prayagraj to Banaras is 125 km (2.5 hours). A popular 3-day itinerary from Delhi covers Delhi → Prayagraj → Banaras and return." },
    ]
  },
  "delhi-to-vrindavan": {
    from: "Delhi", to: "Vrindavan", distance: 155, duration: "2.5-3 hours",
    fare: { min: 2110, max: 3660 }, toll: 220,
    description: "Book Delhi to Vrindavan cab at fixed fares. Visit the sacred land of Lord Krishna — Prem Mandir, ISKCON, Banke Bihari Mandir and Yamuna Ghats. Same-day return popular.",
    highlights: ["Prem Mandir light show", "Banke Bihari Mandir", "ISKCON Vrindavan", "Yamuna Ghats aarti"],
    faqs: [
      { q: "How far is Delhi to Vrindavan by cab?", a: "Delhi to Vrindavan is approximately 155 km via Yamuna Expressway and takes 2.5-3 hours by cab." },
      { q: "What is the fare for Delhi to Vrindavan cab?", a: "Fares start from ₹2,110 for a sedan to ₹3,660 for an Innova Hycross. Price includes driver charges. Toll charged at actuals." },
      { q: "Can I visit Mathura and Vrindavan on the same trip?", a: "Yes. Mathura and Vrindavan are just 12 km apart. A combined same-day trip from Delhi covering Krishna Janmabhoomi in Mathura and Prem Mandir in Vrindavan is very popular." },
      { q: "What is the Prem Mandir light show timing?", a: "The Prem Mandir illumination show runs from 7:30 PM to 8:30 PM daily. The marble temple is especially stunning at night — plan to reach Vrindavan by late afternoon for the temples and evening show." },
    ]
  },
  "delhi-to-spiti": {
    from: "Delhi", to: "Spiti", distance: 785, duration: "14-16 hours",
    fare: { min: 9670, max: 17520 }, toll: 950,
    description: "Book Delhi to Spiti Valley cab at fixed fares. The Cold Desert of Himachal Pradesh — Key Monastery, Pin Valley, Chandratal Lake and star-gazed nights at 4,000m. Mountain-specialist drivers essential.",
    highlights: ["Key Monastery at 4,166 m", "Chandratal Lake moonscape", "Pin Valley ibex trekking", "Kaza town base camp"],
    faqs: [
      { q: "How far is Delhi to Spiti Valley by cab?", a: "Delhi to Kaza (Spiti Valley) is approximately 785 km via Shimla and Kinnaur (NH5 → NH305), taking 14-16 hours over 2 days. Most travellers overnight in Shimla or Reckong Peo." },
      { q: "What is the fare for Delhi to Spiti cab?", a: "Fares start from ₹9,670 for a sedan to ₹17,520 for a premium SUV. Spiti roads require an SUV — we strongly recommend Innova Crysta or higher. Toll & HP state tax charged at actuals." },
      { q: "Is the Spiti route open all year?", a: "No. The Shimla-Kaza route is open approximately May to November. The Manali-Kaza route (Rohtang side) is open June to October. Both close with heavy snowfall in winter." },
      { q: "Why is an SUV recommended for Spiti?", a: "Spiti roads are high-altitude mountain tracks, often unpaved or poorly surfaced above Nako. Sedans have low ground clearance and are not suitable. We recommend Innova Crysta at minimum for this route." },
    ]
  },
  "delhi-to-mount-abu": {
    from: "Delhi", to: "Mount Abu", distance: 780, duration: "12-13 hours",
    fare: { min: 9610, max: 17410 }, toll: 1100,
    description: "Book Delhi to Mount Abu cab at fixed fares. Rajasthan's only hill station — Dilwara Jain Temples, Nakki Lake and Guru Shikhar Peak. AC cabs, experienced drivers, no hidden charges.",
    highlights: ["Dilwara Jain Temples", "Nakki Lake boating", "Guru Shikhar — Aravalli summit", "Sunset Point views"],
    faqs: [
      { q: "How far is Delhi to Mount Abu by cab?", a: "Delhi to Mount Abu is approximately 780 km via NH48 through Jaipur and Udaipur, taking 12-13 hours by cab." },
      { q: "What is the fare for Delhi to Mount Abu cab?", a: "Fares start from ₹9,610 for a sedan to ₹17,410 for an Innova Hycross. Price includes driver charges. Toll & state tax charged at actuals." },
      { q: "What are the Dilwara Temples known for?", a: "The Dilwara Temples are 11th–13th century Jain temples renowned for intricate white marble carvings — considered among the finest examples of marble craftsmanship in the world. Photography is not permitted inside." },
      { q: "Is Mount Abu worth visiting from Delhi?", a: "Yes — especially if you're combining it with Udaipur (4 hours away). Mount Abu is a pleasant contrast to the Rajasthani desert — green, cool and much quieter than the major tourist cities." },
    ]
  },
  "delhi-to-lansdowne": {
    from: "Delhi", to: "Lansdowne", distance: 265, duration: "5-6 hours",
    fare: { min: 3430, max: 6080 }, toll: 380,
    description: "Book Delhi to Lansdowne cab at fixed fares. Uttarakhand's most peaceful hill station — dense oak forests, colonial era Garhwal Rifles regimental centre and panoramic Himalayan views. AC cabs, verified drivers.",
    highlights: ["Tip'n'Top panoramic viewpoint", "Bhim Pakora rock formation", "Tarkeshwar Mahadev temple", "War Memorial — Garhwal Rifles"],
    faqs: [
      { q: "How far is Delhi to Lansdowne by cab?", a: "Delhi to Lansdowne is approximately 265 km via NH119 and takes 5-6 hours by cab." },
      { q: "What is the fare for Delhi to Lansdowne cab?", a: "Fares start from ₹3,430 for a sedan to ₹6,080 for an Innova Hycross. Price includes driver charges. Toll charged at actuals." },
      { q: "Why is Lansdowne different from other Uttarakhand hill stations?", a: "Lansdowne is a cantonment town with minimal commercial development — no loud markets or tourist crowds. It's one of India's most genuinely peaceful hill escapes, perfect for a quiet weekend." },
      { q: "Is Lansdowne accessible in winter?", a: "Yes. Lansdowne (1,706 m) is accessible year-round. It gets light snowfall in January–February. The oak and rhododendron forests are beautiful in monsoon and spring." },
    ]
  },

  // ── Himachal Pradesh — Intra-State Routes ───────────────────────────
  "chandigarh-to-manali": {
    from: "Chandigarh", to: "Manali", distance: 315, duration: "7-8 hours",
    fare: { min: 4030, max: 7180 }, toll: 400,
    description: "Book Chandigarh to Manali cab at fixed fares. The classic Himalayan highway — Beas gorge, Kullu valley and the snow-capped Rohtang in the distance. AC cabs, mountain-specialist drivers.",
    highlights: ["Pandoh Dam & Beas Gorge", "Kullu Valley apple orchards", "Solang Valley day trip", "Rohtang Pass access"],
    faqs: [
      { q: "How far is Chandigarh to Manali by cab?", a: "Chandigarh to Manali is approximately 315 km via NH21 and takes 7-8 hours depending on road conditions and traffic at Kullu." },
      { q: "What is the fare for Chandigarh to Manali cab?", a: "Fares start from ₹4,030 for a sedan to ₹7,180 for an Innova Hycross. Price includes driver charges. Toll & HP state tax charged at actuals." },
      { q: "Is the Chandigarh to Manali route safe?", a: "Yes. The route is a well-maintained national highway (NH21) through the Kullu-Manali valley. Mountain driving experience is essential — our drivers are trained on this specific route." },
      { q: "What are the best stops on Chandigarh to Manali road?", a: "Bilaspur reservoir, Pandoh Dam, Aut Tunnel (dramatic entry into Kullu valley), Kullu shawl market and Patlikuhl apple orchards are the classic stops on this highway." },
    ]
  },
  "chandigarh-to-shimla": {
    from: "Chandigarh", to: "Shimla", distance: 115, duration: "3-4 hours",
    fare: { min: 1630, max: 2780 }, toll: 200,
    description: "Book Chandigarh to Shimla cab at fixed fares. A scenic 3-hour drive through the Shivalik foothills to the colonial capital of Himachal Pradesh. AC cabs, verified drivers.",
    highlights: ["Himalayan Queen toy train view route", "Pinjore Gardens en route", "Mall Road & Ridge Maidan", "Kufri day trip from Shimla"],
    faqs: [
      { q: "How far is Chandigarh to Shimla by cab?", a: "Chandigarh to Shimla is approximately 115 km via NH5 (old Kalka-Shimla highway) or the new 4-lane highway through Parwanoo, taking 3-4 hours." },
      { q: "What is the fare for Chandigarh to Shimla cab?", a: "Fares start from ₹1,630 for a sedan to ₹2,780 for an Innova Hycross. Price includes driver charges. Toll & HP state tax charged at actuals." },
      { q: "Which route is better — Parwanoo highway or Kalka-Shimla old road?", a: "The new Parwanoo highway is faster and smoother (3 hours). The old Kalka-Shimla road via Kandaghat is more scenic but slower. Our drivers take the best route based on conditions." },
      { q: "Can I take the toy train from Chandigarh to Shimla?", a: "The Kalka-Shimla toy train starts at Kalka (30 km from Chandigarh). It's a UNESCO-listed heritage railway but takes 5-6 hours. Many travellers take a cab up and the toy train back for the best of both." },
    ]
  },
  "chandigarh-to-dharamshala": {
    from: "Chandigarh", to: "Dharamshala", distance: 245, duration: "5-6 hours",
    fare: { min: 3190, max: 5640 }, toll: 380,
    description: "Book Chandigarh to Dharamshala cab at fixed fares. Drive through the Kangra Valley to McLeod Ganj, home of the Dalai Lama. AC cabs, verified mountain drivers.",
    highlights: ["Kangra Valley views", "McLeod Ganj Tibetan quarter", "Namgyal Monastery", "Triund Trek base"],
    faqs: [
      { q: "How far is Chandigarh to Dharamshala by cab?", a: "Chandigarh to Dharamshala is approximately 245 km via NH44 and NH154 through Pathankot, taking 5-6 hours by cab." },
      { q: "What is the fare for Chandigarh to Dharamshala cab?", a: "Fares start from ₹3,190 for a sedan to ₹5,640 for an Innova Hycross. Price includes driver charges. Toll & HP state tax charged at actuals." },
      { q: "Is drop to McLeod Ganj (Upper Dharamshala) possible?", a: "Yes. We drop you directly at McLeod Ganj (10 km uphill from lower Dharamshala). Please specify at the time of booking — no extra charge for McLeod Ganj drop." },
      { q: "What is the best time to visit Dharamshala?", a: "March to June and September to November are ideal. The Dalai Lama's teaching schedule (usually March and November) draws visitors from around the world." },
    ]
  },
  "chandigarh-to-amritsar": {
    from: "Chandigarh", to: "Amritsar", distance: 230, duration: "3-4 hours",
    fare: { min: 3010, max: 5310 }, toll: 350,
    description: "Book Chandigarh to Amritsar cab at fixed fares. A smooth NH44 drive to the Golden Temple city. Perfect for pilgrimage trips, Wagah Border visits and Punjab cultural experiences.",
    highlights: ["Golden Temple darshan", "Wagah Border ceremony", "Jallianwala Bagh memorial", "Heritage Street food walk"],
    faqs: [
      { q: "How far is Chandigarh to Amritsar by cab?", a: "Chandigarh to Amritsar is approximately 230 km via NH44 and takes 3-4 hours by cab." },
      { q: "What is the fare for Chandigarh to Amritsar cab?", a: "Fares start from ₹3,010 for a sedan to ₹5,310 for an Innova Hycross. Price includes driver charges. Toll charged at actuals." },
      { q: "What time is the Wagah Border ceremony?", a: "The Beating Retreat ceremony at Wagah Border takes place at sunset — approximately 5:30 PM in winter and 6:30 PM in summer. Arrive 45 minutes early to secure a good seat in the gallery." },
      { q: "Can I do Chandigarh to Amritsar as a day trip?", a: "Yes, easily. Leave Chandigarh by 8 AM, visit Golden Temple and Wagah Border ceremony by evening, and return the same night. It's a comfortable 1-day round trip." },
    ]
  },
  "shimla-to-manali": {
    from: "Shimla", to: "Manali", distance: 220, duration: "6-7 hours",
    fare: { min: 2890, max: 5090 }, toll: 300,
    description: "Book Shimla to Manali cab at fixed fares. One of Himachal's most scenic mountain drives — Rampur, Kullu valley and the towering Beas gorge. AC cabs, experienced hill drivers.",
    highlights: ["Rampur Bushahr riverside", "Pandoh Dam viewpoint", "Kullu Valley orchards", "Solang Valley en route"],
    faqs: [
      { q: "How far is Shimla to Manali by cab?", a: "Shimla to Manali is approximately 220 km via NH5 and NH21 through Rampur and Kullu, taking 6-7 hours due to mountain road conditions." },
      { q: "What is the fare for Shimla to Manali cab?", a: "Fares start from ₹2,890 for a sedan to ₹5,090 for an Innova Hycross. Price includes driver charges. HP state tax charged at actuals." },
      { q: "Which is the best route from Shimla to Manali?", a: "The main route is via Rampur-Bhuntar-Kullu on NH21. There is no direct shortcut — the journey follows the river valleys. Our drivers know the seasonal road conditions well." },
      { q: "What are the best stops between Shimla and Manali?", a: "Narkanda (excellent apple orchards, ski slope in winter), Rampur Bushahr (historic town on Satluj), Pandoh Dam, and the Aut Tunnel into Kullu valley are the highlights." },
    ]
  },
  "shimla-to-dharamshala": {
    from: "Shimla", to: "Dharamshala", distance: 275, duration: "6-7 hours",
    fare: { min: 3550, max: 6300 }, toll: 350,
    description: "Book Shimla to Dharamshala cab at fixed fares. A scenic cross-Himachal drive connecting two of the state's most beloved hill towns. AC cabs, verified mountain drivers.",
    highlights: ["Cross-Himachal mountain drive", "Mandi town stopover", "Kangra Valley descent", "McLeod Ganj destination"],
    faqs: [
      { q: "How far is Shimla to Dharamshala by cab?", a: "Shimla to Dharamshala is approximately 275 km via Mandi and Palampur, taking 6-7 hours by cab through mountain roads." },
      { q: "What is the fare for Shimla to Dharamshala cab?", a: "Fares start from ₹3,550 for a sedan to ₹6,300 for an Innova Hycross. Price includes driver charges. HP state tax charged at actuals." },
      { q: "What is a good stopover between Shimla and Dharamshala?", a: "Mandi (130 km from Shimla) is a natural halfway point with numerous ancient temples. Palampur tea gardens (40 km before Dharamshala) are another highlight worth a brief stop." },
      { q: "Is this route scenic?", a: "Yes — the road crosses several river valleys and mountain ridges. The Beas River gorge near Mandi and the Kangra Valley as you approach Dharamshala are particularly beautiful." },
    ]
  },
  "manali-to-leh": {
    from: "Manali", to: "Leh", distance: 480, duration: "12-14 hours",
    fare: { min: 5810, max: 10810 }, toll: 450,
    description: "Book Manali to Leh cab at fixed fares. The world's highest motorable road — crossing Rohtang Pass, Baralacha La, Nakee La and Tanglang La (5,328 m). An unforgettable Himalayan odyssey. Experienced high-altitude drivers only.",
    highlights: ["Rohtang Pass & Baralacha La", "Sarchu plains camping", "Tanglang La — 5,328 m", "Moray Plains — straight road at 4,800 m"],
    faqs: [
      { q: "How far is Manali to Leh by road?", a: "Manali to Leh is approximately 480 km via the Leh-Manali Highway (NH3), crossing multiple high-altitude passes. The journey takes 12-14 hours and is typically done over 2 days with an overnight halt at Sarchu (4,253 m)." },
      { q: "What is the fare for Manali to Leh cab?", a: "Fares start from ₹5,810 for an SUV (sedans are not suitable). We strongly recommend Innova Crysta or Hycross. Price includes driver charges. Toll & Army check-post fees charged at actuals." },
      { q: "When is the Manali to Leh highway open?", a: "The Manali-Leh highway is open approximately late May to mid-October. BRO (Border Roads Organisation) clears the route after winter snow. Always confirm road status before travel." },
      { q: "Is altitude sickness a concern on Manali to Leh?", a: "Yes. The road crosses passes above 5,000 m. Acclimatise for 1-2 days in Manali before attempting this route. Carry Diamox (consult your doctor), stay hydrated, and avoid rushing. Our drivers are trained to recognise altitude symptoms." },
    ]
  },
  "manali-to-spiti": {
    from: "Manali", to: "Spiti", distance: 220, duration: "7-8 hours",
    fare: { min: 2890, max: 5090 }, toll: 250,
    description: "Book Manali to Spiti Valley cab at fixed fares. Cross Rohtang Pass and descend into the barren, otherworldly Spiti Valley — Key Monastery, Chandratal Lake and starlit skies at 4,000 m.",
    highlights: ["Rohtang Pass (3,978 m)", "Kunzum Pass (4,590 m)", "Chandratal Lake moonscape", "Key Monastery — 11th century"],
    faqs: [
      { q: "How far is Manali to Spiti (Kaza) by cab?", a: "Manali to Kaza is approximately 220 km via Rohtang Pass and Kunzum Pass, taking 7-8 hours. The road is open June to October only." },
      { q: "What is the fare for Manali to Spiti cab?", a: "Fares start from ₹2,890 for a suitable SUV (sedans not recommended). Price includes driver charges. Rohtang permit fee (₹550) and HP state tax charged at actuals." },
      { q: "Do I need a Rohtang Pass permit?", a: "Yes. All non-HP registered vehicles need a permit to cross Rohtang Pass. Book online at himachalservices.nic.in the evening before (permit window opens at 10 PM). We will remind you." },
      { q: "Is Chandratal Lake accessible from Kaza?", a: "Yes. Chandratal Lake is approximately 100 km from Kaza (3-4 hours). It's a high-altitude glacial lake at 4,300 m and one of the most surreal landscapes in India. An extra night in Spiti is needed." },
    ]
  },
  "manali-to-kasol": {
    from: "Manali", to: "Kasol", distance: 80, duration: "2.5-3 hours",
    fare: { min: 1210, max: 2010 }, toll: 100,
    description: "Book Manali to Kasol cab at fixed fares. The short drive through the Kullu valley to the Parvati Valley backpacker haven — riverside cafes, pine forests and the gateway to Kheerganga trek.",
    highlights: ["Parvati Valley riverside", "Kheerganga Trek base", "Malana village day trip", "Chalal village walk"],
    faqs: [
      { q: "How far is Manali to Kasol by cab?", a: "Manali to Kasol is approximately 80 km via NH21 through Kullu and Bhuntar, taking 2.5-3 hours by cab." },
      { q: "What is the fare for Manali to Kasol cab?", a: "Fares start from ₹1,210 for a sedan to ₹2,010 for an Innova Hycross. Price includes driver charges. HP state tax charged at actuals." },
      { q: "What is Kasol known for?", a: "Kasol sits on the Parvati River and is known for its Israeli cafe culture, backpacker community, and as the starting point for the Kheerganga hot spring trek (12 km one way) and the Malana village day trip." },
      { q: "Can I trek to Kheerganga from Kasol?", a: "Yes. The Kheerganga trek is 12 km each way from Barshaini (14 km from Kasol). It ends at a natural hot spring at 2,950 m — a 1-night camping experience that many consider the best in Himachal." },
    ]
  },

  // ── Punjab – Amritsar Routes ─────────────────────────────────────────
  "amritsar-to-dharamshala": {
    from: "Amritsar", to: "Dharamshala", distance: 200, duration: "4-5 hours",
    fare: { min: 2650, max: 4650 }, toll: 300,
    description: "Book Amritsar to Dharamshala cab at fixed fares. Drive from the Golden Temple city to McLeod Ganj through Pathankot and the Kangra Valley. AC cabs, verified drivers.",
    highlights: ["Pathankot scenic transit", "Kangra Fort en route", "McLeod Ganj Tibetan quarter", "Dharamshala Cricket Stadium"],
    faqs: [
      { q: "How far is Amritsar to Dharamshala by cab?", a: "Amritsar to Dharamshala is approximately 200 km via Pathankot and NH154, taking 4-5 hours by cab." },
      { q: "What is the fare for Amritsar to Dharamshala cab?", a: "Fares start from ₹2,650 for a sedan to ₹4,650 for an Innova Hycross. Price includes driver charges. Toll & HP state tax charged at actuals." },
      { q: "Is there a scenic stop between Amritsar and Dharamshala?", a: "Kangra Fort (45 km before Dharamshala) is a 4th-century citadel with excellent views and is worth a 30-minute stop. The entire drive through the Kangra Valley is very scenic." },
      { q: "Can I combine Golden Temple visit with a trip to Dharamshala?", a: "Yes. Leave Amritsar after morning Golden Temple darshan, visit Jallianwala Bagh, then head to Dharamshala. Arrive by evening for a McLeod Ganj sunset walk — very popular 2-day itinerary." },
    ]
  },
  "ludhiana-to-amritsar": {
    from: "Ludhiana", to: "Amritsar", distance: 130, duration: "2-2.5 hours",
    fare: { min: 1810, max: 3110 }, toll: 200,
    description: "Book Ludhiana to Amritsar cab at fixed fares. A straight NH44 drive to the Golden Temple. Fast, comfortable, door-to-door. Perfect for Golden Temple darshan and Wagah Border ceremony.",
    highlights: ["Golden Temple darshan", "Wagah Border ceremony at sunset", "Jallianwala Bagh", "Heritage Street food walk"],
    faqs: [
      { q: "How far is Ludhiana to Amritsar by cab?", a: "Ludhiana to Amritsar is approximately 130 km via NH44 and takes 2-2.5 hours by cab." },
      { q: "What is the fare for Ludhiana to Amritsar cab?", a: "Fares start from ₹1,810 for a sedan to ₹3,110 for an Innova Hycross. Price includes driver charges. Toll charged at actuals." },
      { q: "What is the best time to visit the Golden Temple?", a: "Early morning (4–6 AM) for the morning palki procession is the most spiritually significant time. The temple is also stunning at night — it remains open 24 hours." },
      { q: "How long does the Wagah Border ceremony take?", a: "The Beating Retreat ceremony lasts about 45 minutes. Add 30 minutes for security checks and finding a seat. We recommend arriving at least 1 hour before sunset." },
    ]
  },
};

export default function RouteLanding() {
  const { route } = useParams<{ route: string }>();
  const navigate = useNavigate();
  const data = ROUTES[route || ""];

  const { data: liveCars } = trpc.car.list.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const fareTableCars = liveCars
    ? liveCars
        .filter(c => !["tempo", "bus"].includes(c.category))
        .sort((a, b) => parseFloat(a.pricePerKm) - parseFloat(b.pricePerKm))
    : null;

  const lm = getLandmark(data?.to ?? "");

  const canonicalUrl = `https://www.easyoutstation.com/cab/${route ?? ""}`;
  const pageTitle = data
    ? `${data.from} to ${data.to} Cab | ₹${data.fare.min.toLocaleString("en-IN")} Fixed Fare | EasyOutstation`
    : "Cab Routes | EasyOutstation";

  const schema = data ? [
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.easyoutstation.com/" },
        { "@type": "ListItem", "position": 2, "name": "Routes", "item": "https://www.easyoutstation.com/routes" },
        { "@type": "ListItem", "position": 3, "name": `${data.from} to ${data.to} Cab`, "item": canonicalUrl },
      ],
    },
    {
      "@type": "LocalBusiness",
      "name": "EasyOutstation",
      "url": "https://www.easyoutstation.com",
      "telephone": "+91-8796564111",
      "description": data.description,
      "areaServed": [data.from, data.to],
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "bestRating": "5",
        "worstRating": "1",
        "ratingCount": "500",
      },
      "offers": {
        "@type": "Offer",
        "priceCurrency": "INR",
        "price": data.fare.min,
        "priceSpecification": {
          "@type": "PriceSpecification",
          "minPrice": data.fare.min,
          "maxPrice": data.fare.max,
          "priceCurrency": "INR",
        },
      },
    },
    {
      "@type": "FAQPage",
      "mainEntity": data.faqs.map(faq => ({
        "@type": "Question",
        "name": faq.q,
        "acceptedAnswer": { "@type": "Answer", "text": faq.a },
      })),
    },
  ] : undefined;

  useSeo({
    title: pageTitle,
    description: data?.description ?? "Book outstation cabs from Delhi at fixed fares.",
    canonical: canonicalUrl,
    ogImage: lm?.image,
    schema,
  });

  if (!data) {
    navigate("/routes");
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-20">
        {/* Hero — landmark photo background */}
        <div className="relative overflow-hidden bg-slate-900">
          {/* Image in normal flow — same pattern as homepage cards (works with Unsplash CDN) */}
          {lm && (
            <img
              src={lm.image}
              alt={lm.landmark}
              className="w-full object-cover"
              style={{ height: "clamp(260px, 55vw, 480px)", objectPosition: lm.objectPosition }}
              onError={(e) => { (e.target as HTMLImageElement).src = "/hero-bg.jpg"; }}
            />
          )}
          {!lm && <div style={{ height: "clamp(260px, 55vw, 480px)" }} />}
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/55 via-slate-900/50 to-slate-900/80" />
          {/* Text centered over image */}
          <div className="absolute inset-0 flex items-center justify-center px-4 py-10">
            <div className="text-white text-center max-w-4xl w-full">
              <div className="flex items-center justify-center gap-2 text-blue-300 text-sm font-medium mb-4">
                <MapPin className="w-4 h-4" />
                {lm ? lm.landmark : "Outstation Cab Service"}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold font-['DM_Serif_Display'] mb-4">
                {data.from} to {data.to} Cab
              </h1>
              <p className="text-slate-200 text-lg mb-6 max-w-2xl mx-auto">{data.description}</p>
              <div className="flex flex-wrap justify-center gap-6 text-sm mb-8">
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-400" />{data.distance} km</div>
                <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-blue-400" />{data.duration}</div>
                <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-green-400" />Verified Drivers</div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" onClick={() => navigate(`/cars?from=${data.from}&to=${data.to}&distance=${data.distance}`)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 text-base gap-2">
                  Book Now — From ₹{data.fare.min.toLocaleString("en-IN")} <ArrowRight className="w-4 h-4" />
                </Button>
                <a href="https://wa.me/918796564111?text=Hi%2C%20I%20want%20to%20book%20a%20cab%20from%20Delhi" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 h-12 px-8 text-base w-full sm:w-auto">
                    WhatsApp Us
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Fare table */}
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-slate-900 font-['DM_Serif_Display'] mb-6 text-center">
            {data.from} to {data.to} Cab Fare
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-4 font-semibold text-slate-700">Car Type</th>
                  <th className="text-left px-6 py-4 font-semibold text-slate-700">Seats</th>
                  <th className="text-left px-6 py-4 font-semibold text-slate-700">Rate/km</th>
                  <th className="text-left px-6 py-4 font-semibold text-slate-700">One Way Fare</th>
                  <th className="text-left px-6 py-4 font-semibold text-slate-700">Round Trip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(fareTableCars ?? [
                  { id: 0, name: "Swift Dzire", seats: 4, pricePerKm: "12.00", driverCharges: "250.00" },
                  { id: 1, name: "Maruti Ertiga", seats: 6, pricePerKm: "15.00", driverCharges: "250.00" },
                  { id: 2, name: "Toyota Innova", seats: 6, pricePerKm: "19.00", driverCharges: "250.00" },
                  { id: 3, name: "Innova Crysta", seats: 6, pricePerKm: "20.00", driverCharges: "250.00" },
                  { id: 4, name: "Innova Hycross", seats: 6, pricePerKm: "22.00", driverCharges: "250.00" },
                ] as any[]).map((car) => {
                  const rate = parseFloat(car.pricePerKm);
                  const driverCharge = parseFloat(car.driverCharges ?? "250");
                  const oneway = Math.round(rate * data.distance + driverCharge);
                  const roundtrip = Math.round(rate * data.distance * 2 + driverCharge * 2);
                  return (
                    <tr key={car.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{car.name}</td>
                      <td className="px-6 py-4 text-slate-600">{car.seats} seater</td>
                      <td className="px-6 py-4 text-slate-600">₹{rate}/km</td>
                      <td className="px-6 py-4 font-semibold text-blue-700">₹{oneway.toLocaleString("en-IN")}</td>
                      <td className="px-6 py-4 text-slate-600">₹{roundtrip.toLocaleString("en-IN")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3 text-center">* Fares include driver charges (₹250). Toll & parking charged at actuals — whatever is paid on the road, no markup.</p>

          {/* Additional charges guide */}
          {(() => {
            const dest = data.to.toLowerCase();
            const isHP = ["shimla","manali","dharamshala","kasauli","dalhousie","spiti","kasol"].includes(dest);
            const isRaj = ["jaipur","jodhpur","udaipur","pushkar","mount abu"].includes(dest);
            return (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold mb-2">Estimated Additional Charges <span className="font-normal text-amber-700">(guide only — charged at actuals)</span></p>
                <ul className="space-y-1 text-amber-800 text-xs">
                  <li>• <span className="font-medium">Toll:</span> ~₹{data.toll.toLocaleString("en-IN")} estimated on major plaza(s) on this route</li>
                  {isHP && <li>• <span className="font-medium">Himachal Pradesh state entry tax:</span> ~₹350–500 per vehicle (varies by vehicle type)</li>}
                  {isRaj && <li>• <span className="font-medium">Rajasthan state permit:</span> ~₹250–450 per vehicle (varies by vehicle type)</li>}
                  <li>• <span className="font-medium">Parking:</span> charged at actuals at all stops</li>
                </ul>
                <p className="mt-2 text-[11px] text-amber-700">All amounts are estimates based on standard routes. Actual charges depend on the exact toll plazas used and are passed on to you at cost with zero markup.</p>
              </div>
            );
          })()}
        </div>

        {/* Why choose us */}
        <div className="bg-slate-50 py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center font-['DM_Serif_Display'] mb-8">Why Book {data.from} to {data.to} Cab with EasyOutstation?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...data.highlights,
                "Driver details shared within 60 minutes",
                "Free cancellation 24 hours before pickup",
                "Pay just 10% advance to confirm booking",
                "24/7 customer support on WhatsApp"
              ].map((h, i) => (
                <div key={i} className="flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <span className="text-slate-700 text-sm">{h}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold font-['DM_Serif_Display'] mb-8 text-center">
            Frequently Asked Questions — {data.from} to {data.to} Cab
          </h2>
          <div className="space-y-4">
            {data.faqs.map((faq, i) => (
              <div key={i} className="border border-slate-200 rounded-xl p-6">
                <h3 className="font-semibold text-slate-900 mb-2">{faq.q}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Other Popular Routes — internal links for SEO */}
        <div className="max-w-4xl mx-auto px-4 pb-12">
          <h2 className="text-xl font-bold font-['DM_Serif_Display'] mb-5 text-slate-900">Other Popular Routes from Delhi</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ROUTES)
              .filter(([slug]) => slug !== route)
              .map(([slug, r]) => (
                <Link
                  key={slug}
                  to={`/cab/${slug}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 text-sm text-slate-700 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-colors no-underline"
                >
                  {r.from} → {r.to}
                  <span className="text-slate-400 text-xs">₹{r.fare.min.toLocaleString("en-IN")}</span>
                </Link>
              ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-blue-600 py-12 px-4 text-center text-white">
          <h2 className="text-2xl font-bold font-['DM_Serif_Display'] mb-3">Ready to Book Your {data.from} to {data.to} Cab?</h2>
          <p className="text-blue-100 mb-6">Confirm with just 10% advance. Driver details within 60 minutes.</p>
          <Button size="lg" onClick={() => navigate(`/cars?from=${data.from}&to=${data.to}&distance=${data.distance}`)}
            className="bg-white text-blue-700 hover:bg-blue-50 px-8 h-12 text-base gap-2 font-semibold">
            Book Now — From ₹{data.fare.min.toLocaleString("en-IN")} <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
