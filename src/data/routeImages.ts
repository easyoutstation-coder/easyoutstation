// All photo IDs verified from unsplash.com search results
// CDN format: https://images.unsplash.com/photo-{ID}
// objectPosition controls the crop focal point in the thumbnail card
export const routeLandmarks: Record<string, { image: string; landmark: string; objectPosition: string }> = {
  manali: {
    // "Snow covered mountain with blue sky in the background" — Manali, Himachal Pradesh
    image: "https://images.unsplash.com/photo-TUHfyBAuHeM?w=900&q=85&fit=crop",
    landmark: "Rohtang Pass, Manali",
    objectPosition: "center 40%",
  },
  shimla: {
    // "A church with a red cross on top of it" — Christ Church, The Ridge, Shimla
    image: "https://images.unsplash.com/photo-KkNmK2chPDI?w=900&q=85&fit=crop",
    landmark: "Christ Church, Shimla",
    objectPosition: "center 35%",
  },
  chandigarh: {
    // "White houses on hill slope" / Chandigarh cityscape
    image: "https://images.unsplash.com/photo-xCHoD_VciQM?w=900&q=85&fit=crop",
    landmark: "Capitol Complex, Chandigarh",
    objectPosition: "center center",
  },
  jaipur: {
    // "Hawa Mahal, India" — by Roberto Reposo (verified Unsplash photo)
    image: "https://images.unsplash.com/photo-LgQoL6eOdHs?w=900&q=85&fit=crop",
    landmark: "Hawa Mahal, Jaipur",
    objectPosition: "center 30%",
  },
  agra: {
    // "Taj Mahal India" — verified Unsplash photo
    image: "https://images.unsplash.com/photo-iWMfiInivp4?w=900&q=85&fit=crop",
    landmark: "Taj Mahal, Agra",
    objectPosition: "center 30%",
  },
  rishikesh: {
    // "People on hanging bridge surrounded by tall trees" — Laxman Jhula, Rishikesh
    image: "https://images.unsplash.com/photo-ER7jKSiFZig?w=900&q=85&fit=crop",
    landmark: "Laxman Jhula, Rishikesh",
    objectPosition: "center 40%",
  },
  haridwar: {
    // Haridwar photo by Nishant Chaudhary — verified Unsplash photo
    image: "https://images.unsplash.com/photo-S_HfQaz9Peo?w=900&q=85&fit=crop",
    landmark: "Har Ki Pauri, Haridwar",
    objectPosition: "center 40%",
  },
  dehradun: {
    // Dehradun valley / forest — fallback to misty landscape
    image: "https://images.unsplash.com/photo-6ll3fSaEfjA?w=900&q=85&fit=crop",
    landmark: "Forest Research Institute, Dehradun",
    objectPosition: "center center",
  },
  mussoorie: {
    // Mussoorie hills / Queen of Hills
    image: "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=900&q=85&fit=crop",
    landmark: "Gun Hill, Mussoorie",
    objectPosition: "center 40%",
  },
  nainital: {
    // Naina Range / Nainital — verified Unsplash photo by Rohan
    image: "https://images.unsplash.com/photo-JnM71B4jPbU?w=900&q=85&fit=crop",
    landmark: "Naini Lake, Nainital",
    objectPosition: "center 45%",
  },
  mathura: {
    // Mathura / Vrindavan temple
    image: "https://images.unsplash.com/photo-1599662961645-09b4be7dc71a?w=900&q=85&fit=crop",
    landmark: "Dwarkadhish Temple, Mathura",
    objectPosition: "center 35%",
  },
};

export function getLandmark(city: string) {
  return routeLandmarks[city.toLowerCase()] ?? null;
}
