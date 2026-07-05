const ALIASES: Record<string, string> = {
  "banaras": "varanasi",
  "benares": "varanasi",
  "srinagar": "kashmir",
  "katra": "vaishno devi",
  "mcleod ganj": "dharamshala",
  "mcleodganj": "dharamshala",
  "jim corbett": "corbett",
  "ramnagar": "corbett",
  "spiti valley": "spiti",
  "new delhi": "delhi",
  "delhi ncr": "delhi",
};

export const APPROVED_DESTINATIONS = [
  "Nainital", "Mussoorie", "Rishikesh", "Haridwar", "Dehradun", "Corbett", "Lansdowne", "Kedarnath", "Badrinath",
  "Shimla", "Manali", "Chandigarh", "Dharamshala", "Kasauli", "Dalhousie", "Kasol", "Spiti", "Leh",
  "Amritsar", "Ludhiana",
  "Jaipur", "Agra", "Mathura", "Vrindavan", "Jodhpur", "Udaipur", "Pushkar", "Mount Abu",
  "Lucknow", "Ayodhya", "Varanasi", "Prayagraj",
  "Kashmir", "Vaishno Devi",
];

// Delhi → destination (from our exact route data)
const DELHI_KM: Record<string, number> = {
  "nainital": 310, "mussoorie": 310, "rishikesh": 250, "haridwar": 220, "dehradun": 300,
  "shimla": 350, "manali": 540, "chandigarh": 260, "dharamshala": 475, "kasauli": 315,
  "dalhousie": 555, "kasol": 520, "amritsar": 460, "ludhiana": 310,
  "jaipur": 280, "agra": 230, "mathura": 175, "vrindavan": 155,
  "jodhpur": 600, "udaipur": 665, "pushkar": 395, "mount abu": 780,
  "corbett": 250, "lansdowne": 265, "kedarnath": 470, "badrinath": 500,
  "kashmir": 820, "vaishno devi": 650,
  "ayodhya": 640, "varanasi": 820, "lucknow": 555, "prayagraj": 645,
  "spiti": 785, "leh": 1020,
  "delhi": 0,
};

type Pair = [string, string, number];
const PAIRS: Pair[] = [
  // Uttarakhand cluster
  ["nainital", "corbett", 85],
  ["nainital", "rishikesh", 250],
  ["nainital", "haridwar", 270],
  ["nainital", "dehradun", 290],
  ["nainital", "mussoorie", 295],
  ["nainital", "lansdowne", 180],
  ["mussoorie", "dehradun", 35],
  ["mussoorie", "rishikesh", 80],
  ["mussoorie", "haridwar", 100],
  ["mussoorie", "lansdowne", 175],
  ["dehradun", "rishikesh", 45],
  ["dehradun", "haridwar", 55],
  ["dehradun", "lansdowne", 150],
  ["rishikesh", "haridwar", 25],
  ["rishikesh", "kedarnath", 220],
  ["rishikesh", "badrinath", 300],
  ["rishikesh", "lansdowne", 130],
  ["haridwar", "kedarnath", 240],
  ["haridwar", "badrinath", 320],
  ["lansdowne", "corbett", 110],
  ["kedarnath", "badrinath", 220],
  // Himachal cluster
  ["shimla", "kasauli", 80],
  ["shimla", "chandigarh", 115],
  ["shimla", "manali", 220],
  ["shimla", "dharamshala", 275],
  ["shimla", "dalhousie", 330],
  ["shimla", "kasol", 220],
  ["chandigarh", "kasauli", 65],
  ["chandigarh", "manali", 315],
  ["chandigarh", "dharamshala", 245],
  ["chandigarh", "amritsar", 230],
  ["chandigarh", "dalhousie", 325],
  ["chandigarh", "ludhiana", 100],
  ["chandigarh", "kasol", 220],
  ["manali", "dharamshala", 250],
  ["manali", "kasol", 80],
  ["manali", "spiti", 220],
  ["manali", "leh", 480],
  ["manali", "dalhousie", 350],
  ["dharamshala", "amritsar", 200],
  ["dharamshala", "dalhousie", 250],
  ["dharamshala", "kasol", 140],
  ["dharamshala", "ludhiana", 200],
  ["dalhousie", "amritsar", 200],
  ["dalhousie", "kasol", 200],
  ["ludhiana", "amritsar", 130],
  // Rajasthan cluster
  ["jaipur", "agra", 240],
  ["jaipur", "jodhpur", 335],
  ["jaipur", "udaipur", 395],
  ["jaipur", "pushkar", 145],
  ["jaipur", "mount abu", 490],
  ["jaipur", "mathura", 185],
  ["jaipur", "vrindavan", 195],
  ["jodhpur", "udaipur", 250],
  ["jodhpur", "mount abu", 165],
  ["jodhpur", "pushkar", 195],
  ["udaipur", "mount abu", 165],
  // UP / pilgrimage cluster
  ["agra", "mathura", 55],
  ["agra", "vrindavan", 65],
  ["mathura", "vrindavan", 12],
  ["agra", "lucknow", 330],
  ["lucknow", "ayodhya", 135],
  ["lucknow", "varanasi", 320],
  ["lucknow", "prayagraj", 210],
  ["ayodhya", "varanasi", 200],
  ["ayodhya", "prayagraj", 165],
  ["varanasi", "prayagraj", 125],
  // Kashmir / Punjab
  ["vaishno devi", "kashmir", 200],
  ["amritsar", "vaishno devi", 220],
];

const PAIR_MAP = new Map<string, number>();
for (const [a, b, d] of PAIRS) {
  PAIR_MAP.set(`${a}|${b}`, d);
  PAIR_MAP.set(`${b}|${a}`, d);
}

function normalize(city: string): string {
  const lower = city.toLowerCase().trim();
  return ALIASES[lower] ?? lower;
}

export function getSegmentKm(from: string, to: string): number {
  const a = normalize(from);
  const b = normalize(to);
  if (a === b) return 0;
  if (a === "delhi") return DELHI_KM[b] ?? 400;
  if (b === "delhi") return DELHI_KM[a] ?? 400;
  const direct = PAIR_MAP.get(`${a}|${b}`);
  if (direct !== undefined) return direct;
  // Unknown pair — conservative upper bound via Delhi
  return (DELHI_KM[a] ?? 400) + (DELHI_KM[b] ?? 400);
}

export function calcTourKm(stops: string[]): number {
  if (stops.length === 0) return 0;
  const circuit = ["Delhi", ...stops, "Delhi"];
  let total = 0;
  for (let i = 0; i < circuit.length - 1; i++) {
    total += getSegmentKm(circuit[i], circuit[i + 1]);
  }
  return total;
}

export function tourItinerary(stops: string[]): string {
  return ["Delhi", ...stops, "Delhi"].join(" → ");
}
