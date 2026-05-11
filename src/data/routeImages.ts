// Landmark images for each destination — swap any URL with a photo from unsplash.com
export const routeLandmarks: Record<string, { image: string; landmark: string }> = {
  manali: {
    image: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&q=80&fit=crop",
    landmark: "Solang Valley, Manali",
  },
  shimla: {
    image: "https://images.unsplash.com/photo-1597055349213-6cab24b4b40e?w=800&q=80&fit=crop",
    landmark: "The Ridge, Shimla",
  },
  chandigarh: {
    image: "https://images.unsplash.com/photo-1568043961259-74a38f9a4ca5?w=800&q=80&fit=crop",
    landmark: "Rock Garden, Chandigarh",
  },
  jaipur: {
    image: "https://images.unsplash.com/photo-1477587458883-47145ed31acc?w=800&q=80&fit=crop",
    landmark: "Hawa Mahal, Jaipur",
  },
  agra: {
    image: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&q=80&fit=crop",
    landmark: "Taj Mahal, Agra",
  },
  rishikesh: {
    image: "https://images.unsplash.com/photo-1588083949404-c4f1ed1323b3?w=800&q=80&fit=crop",
    landmark: "Laxman Jhula, Rishikesh",
  },
  haridwar: {
    image: "https://images.unsplash.com/photo-1561361058-c24e01dc9e82?w=800&q=80&fit=crop",
    landmark: "Har Ki Pauri, Haridwar",
  },
  dehradun: {
    image: "https://images.unsplash.com/photo-1583623025817-d180a2221d0a?w=800&q=80&fit=crop",
    landmark: "Robber's Cave, Dehradun",
  },
  mussoorie: {
    image: "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=800&q=80&fit=crop",
    landmark: "Gun Hill, Mussoorie",
  },
  nainital: {
    image: "https://images.unsplash.com/photo-1580977251946-bcd34dc9ede5?w=800&q=80&fit=crop",
    landmark: "Naini Lake, Nainital",
  },
  mathura: {
    image: "https://images.unsplash.com/photo-1599662961645-09b4be7dc71a?w=800&q=80&fit=crop",
    landmark: "Dwarkadhish Temple, Mathura",
  },
};

export function getLandmark(city: string) {
  return routeLandmarks[city.toLowerCase()] ?? null;
}
