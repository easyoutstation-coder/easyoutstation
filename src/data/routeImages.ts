// All CDN URLs verified by fetching actual Unsplash photo pages
export const routeLandmarks: Record<string, { image: string; landmark: string; objectPosition: string }> = {
  manali: {
    image: "https://images.unsplash.com/photo-1677821374212-8c3e88292b1b?w=900&q=85&fit=crop&auto=format",
    landmark: "Rohtang Pass, Manali",
    objectPosition: "center 30%",
  },
  shimla: {
    image: "https://images.unsplash.com/photo-1648830802584-ec070946e591?w=900&q=85&fit=crop&auto=format",
    landmark: "Christ Church, Shimla",
    objectPosition: "center 35%",
  },
  chandigarh: {
    image: "https://images.unsplash.com/photo-1697306323210-5972e68c622d?w=900&q=85&fit=crop&auto=format",
    landmark: "Sukhna Lake, Chandigarh",
    objectPosition: "center 40%",
  },
  jaipur: {
    image: "https://images.unsplash.com/photo-1578999935853-4ec5fa6c1f60?w=900&q=85&fit=crop&auto=format",
    landmark: "Hawa Mahal, Jaipur",
    objectPosition: "center 25%",
  },
  agra: {
    image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=900&q=85&fit=crop&auto=format",
    landmark: "Taj Mahal, Agra",
    objectPosition: "center 30%",
  },
  rishikesh: {
    image: "https://images.unsplash.com/photo-1642163168826-37f2233297ac?w=900&q=85&fit=crop&auto=format",
    landmark: "Ganges Valley, Rishikesh",
    objectPosition: "center 40%",
  },
  haridwar: {
    image: "https://images.unsplash.com/photo-1653392083932-d5e9e7d2ccd1?w=900&q=85&fit=crop&auto=format",
    landmark: "Har Ki Pauri, Haridwar",
    objectPosition: "center 40%",
  },
  dehradun: {
    image: "https://images.unsplash.com/photo-1590351742170-8737ea2e8ce8?w=900&q=85&fit=crop&auto=format",
    landmark: "Himalayan Highway, Dehradun",
    objectPosition: "center 40%",
  },
  mussoorie: {
    image: "https://images.unsplash.com/photo-1637387568999-92c68bdee212?w=900&q=85&fit=crop&auto=format",
    landmark: "Queen of Hills, Mussoorie",
    objectPosition: "center 35%",
  },
  nainital: {
    image: "https://images.unsplash.com/photo-1610715936287-6c2ad208cdbf?w=900&q=85&fit=crop&auto=format",
    landmark: "Naini Lake, Nainital",
    objectPosition: "center 45%",
  },
  mathura: {
    image: "https://images.unsplash.com/photo-1756454487537-1fa7ad135349?w=900&q=85&fit=crop&auto=format",
    landmark: "Holi Festival, Vrindavan",
    objectPosition: "center 40%",
  },
};

export function getLandmark(city: string) {
  return routeLandmarks[city.toLowerCase()] ?? null;
}
