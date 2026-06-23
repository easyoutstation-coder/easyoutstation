export const RENTAL_BANDS = [
  { id: "sedan",   label: "Sedan",          vehicles: ["Swift Dzire", "Toyota Etios", "Honda Amaze"],       hourly: 327, extraKm: 16, extraMin: 6 },
  { id: "muv",     label: "MUV",            vehicles: ["Maruti Ertiga", "Kia Carens"],        hourly: 396, extraKm: 17, extraMin: 6 },
  { id: "crysta",  label: "Innova Crysta",  vehicles: ["Toyota Innova Crysta"],               hourly: 462, extraKm: 18, extraMin: 6 },
  { id: "hycross", label: "Innova Hycross", vehicles: ["Toyota Innova Hycross"],              hourly: 485, extraKm: 19, extraMin: 7 },
] as const;

export const RENTAL_MIN_HOURS = 8;
export const RENTAL_MAX_HOURS = 12;
export const RENTAL_KM_PER_HOUR = 10;
export const RENTAL_ADVANCE_PCT = 0.25;
export const RENTAL_GST_PCT = 0.05;

export type RentalBandId = typeof RENTAL_BANDS[number]["id"];
export type RentalBand = typeof RENTAL_BANDS[number];

// Match a vehicle name to a band (case-insensitive partial match)
export function vehicleToBand(vehicleName: string): RentalBand {
  const lower = vehicleName.toLowerCase();
  for (const band of RENTAL_BANDS) {
    if (band.vehicles.some(v => lower.includes(v.toLowerCase()) || v.toLowerCase().includes(lower))) {
      return band;
    }
  }
  return RENTAL_BANDS[0]; // default to sedan
}

// Compute rental fare breakdown
export function rentalFare(
  band: RentalBand,
  hours: number,
  actualKm = 0,
  actualMinutes = 0
): { base: number; includedKm: number; extraKm: number; extraTime: number; gst: number; total: number } {
  const billedHours = Math.max(RENTAL_MIN_HOURS, hours);
  const base = billedHours * band.hourly;
  const includedKm = hours * RENTAL_KM_PER_HOUR;
  const extraKm = Math.max(0, actualKm - includedKm) * band.extraKm;
  const extraTime = actualMinutes > 0 ? Math.max(0, actualMinutes - billedHours * 60) * band.extraMin : 0;
  const gst = Math.round((base + extraKm + extraTime) * RENTAL_GST_PCT);
  const total = base + extraKm + extraTime + gst;
  return { base, includedKm, extraKm, extraTime, gst, total };
}
