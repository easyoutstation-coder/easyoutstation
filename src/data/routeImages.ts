// All images: 1600×900 (16:9) HD — Unsplash w=1600&h=900&q=90, Pexels w=1600&h=900
export const routeLandmarks: Record<string, { image: string; landmark: string; objectPosition: string }> = {
  manali: {
    image: "https://images.unsplash.com/photo-1677821374212-8c3e88292b1b?w=1600&h=900&q=90&fit=crop&auto=format",
    landmark: "Rohtang Pass, Manali",
    objectPosition: "center 30%",
  },
  shimla: {
    image: "https://images.pexels.com/photos/19294061/pexels-photo-19294061.jpeg?auto=compress&cs=tinysrgb&w=1600&h=900&fit=crop",
    landmark: "Clock Tower, Shimla",
    objectPosition: "center center",
  },
  chandigarh: {
    image: "https://images.unsplash.com/photo-1731593597977-acde4913bd19?w=1600&h=900&q=90&fit=crop&auto=format",
    landmark: "Sukhna Lake, Chandigarh",
    objectPosition: "center 50%",
  },
  jaipur: {
    image: "https://images.unsplash.com/photo-1578999935853-4ec5fa6c1f60?w=1600&h=900&q=90&fit=crop&auto=format",
    landmark: "Hawa Mahal, Jaipur",
    objectPosition: "center 25%",
  },
  agra: {
    image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1600&h=900&q=90&fit=crop&auto=format",
    landmark: "Taj Mahal, Agra",
    objectPosition: "center 30%",
  },
  rishikesh: {
    image: "https://images.unsplash.com/photo-1642163168826-37f2233297ac?w=1600&h=900&q=90&fit=crop&auto=format",
    landmark: "Ganges Valley, Rishikesh",
    objectPosition: "center 40%",
  },
  haridwar: {
    image: "https://images.unsplash.com/photo-1653392083932-d5e9e7d2ccd1?w=1600&h=900&q=90&fit=crop&auto=format",
    landmark: "Har Ki Pauri, Haridwar",
    objectPosition: "center 40%",
  },
  dehradun: {
    image: "https://images.unsplash.com/photo-1590351742170-8737ea2e8ce8?w=1600&h=900&q=90&fit=crop&auto=format",
    landmark: "Himalayan Highway, Dehradun",
    objectPosition: "center 40%",
  },
  mussoorie: {
    image: "https://images.unsplash.com/photo-1637387568999-92c68bdee212?w=1600&h=900&q=90&fit=crop&auto=format",
    landmark: "Queen of Hills, Mussoorie",
    objectPosition: "center 35%",
  },
  nainital: {
    image: "https://images.unsplash.com/photo-1610715936287-6c2ad208cdbf?w=1600&h=900&q=90&fit=crop&auto=format",
    landmark: "Naini Lake, Nainital",
    objectPosition: "center 45%",
  },
  mathura: {
    image: "https://images.unsplash.com/photo-1756454487537-1fa7ad135349?w=1600&h=900&q=90&fit=crop&auto=format",
    landmark: "Holi Festival, Vrindavan",
    objectPosition: "center 40%",
  },
  amritsar: {
    image: "https://images.unsplash.com/photo-1623059508779-2542c6e83753?w=1600&h=900&q=90&fit=crop&auto=format",
    landmark: "Golden Temple, Amritsar",
    objectPosition: "center 40%",
  },
  // New routes — HD 1600×900
  dharamshala: {
    image: "https://images.unsplash.com/photo-1600522012987-98dbb0d1c4a7?w=1600&h=900&q=90&fit=crop&auto=format",
    landmark: "McLeod Ganj, Dharamshala",
    objectPosition: "center 40%",
  },
  kashmir: {
    image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1600&h=900&q=90&fit=crop&auto=format",
    landmark: "Dal Lake, Srinagar",
    objectPosition: "center 45%",
  },
  "vaishno devi": {
    image: "https://images.pexels.com/photos/3889866/pexels-photo-3889866.jpeg?auto=compress&cs=tinysrgb&w=1600&h=900&fit=crop",
    landmark: "Trikuta Mountains, Vaishno Devi",
    objectPosition: "center 30%",
  },
  ludhiana: {
    image: "https://images.pexels.com/photos/4254555/pexels-photo-4254555.jpeg?auto=compress&cs=tinysrgb&w=1600&h=900&fit=crop",
    landmark: "Punjab Heartland, Ludhiana",
    objectPosition: "center 50%",
  },
  ayodhya: {
    image: "https://images.pexels.com/photos/16186330/pexels-photo-16186330.jpeg?auto=compress&cs=tinysrgb&w=1600&h=900&fit=crop",
    landmark: "Ram Mandir, Ayodhya",
    objectPosition: "center 45%",
  },
  banaras: {
    image: "https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=1600&h=900&q=90&fit=crop&auto=format",
    landmark: "Dashashwamedh Ghat, Banaras",
    objectPosition: "center 40%",
  },
};

export function getLandmark(city: string) {
  return routeLandmarks[city.toLowerCase()] ?? null;
}
