// Landmark images for each destination
// objectPosition: controls which part of the image is shown in the cropped thumbnail
// "center top" = anchor to top (show sky/top of monument)
// "center 40%" = shift slightly upward from center
// Swap any image URL with a photo from unsplash.com if needed
export const routeLandmarks: Record<string, { image: string; landmark: string; objectPosition: string }> = {
  manali: {
    image: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=900&q=85&fit=crop",
    landmark: "Solang Valley, Manali",
    objectPosition: "center 35%",
  },
  shimla: {
    image: "https://images.unsplash.com/photo-1597055349213-6cab24b4b40e?w=900&q=85&fit=crop",
    landmark: "The Ridge, Shimla",
    objectPosition: "center 40%",
  },
  chandigarh: {
    image: "https://images.unsplash.com/photo-1568043961259-74a38f9a4ca5?w=900&q=85&fit=crop",
    landmark: "Rock Garden, Chandigarh",
    objectPosition: "center center",
  },
  jaipur: {
    image: "https://images.unsplash.com/photo-1477587458883-47145ed31acc?w=900&q=85&fit=crop",
    landmark: "Hawa Mahal, Jaipur",
    objectPosition: "center 30%",
  },
  agra: {
    // Wide shot with full Taj Mahal — focal point shifted up to show dome
    image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=900&q=85&fit=crop",
    landmark: "Taj Mahal, Agra",
    objectPosition: "center 25%",
  },
  rishikesh: {
    image: "https://images.unsplash.com/photo-1588083949404-c4f1ed1323b3?w=900&q=85&fit=crop",
    landmark: "Laxman Jhula, Rishikesh",
    objectPosition: "center 45%",
  },
  haridwar: {
    image: "https://images.unsplash.com/photo-1561361058-c24e01dc9e82?w=900&q=85&fit=crop",
    landmark: "Har Ki Pauri, Haridwar",
    objectPosition: "center 40%",
  },
  dehradun: {
    image: "https://images.unsplash.com/photo-1583623025817-d180a2221d0a?w=900&q=85&fit=crop",
    landmark: "Robber's Cave, Dehradun",
    objectPosition: "center center",
  },
  mussoorie: {
    image: "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=900&q=85&fit=crop",
    landmark: "Gun Hill, Mussoorie",
    objectPosition: "center 40%",
  },
  nainital: {
    image: "https://images.unsplash.com/photo-1580977251946-bcd34dc9ede5?w=900&q=85&fit=crop",
    landmark: "Naini Lake, Nainital",
    objectPosition: "center 50%",
  },
  mathura: {
    image: "https://images.unsplash.com/photo-1599662961645-09b4be7dc71a?w=900&q=85&fit=crop",
    landmark: "Dwarkadhish Temple, Mathura",
    objectPosition: "center 35%",
  },
};

export function getLandmark(city: string) {
  return routeLandmarks[city.toLowerCase()] ?? null;
}
