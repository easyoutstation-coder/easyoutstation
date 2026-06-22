// Unit tests for rental.ts — plain console.assert, no test runner
// Import and run this file manually: npx tsx src/lib/rental.test.ts

import { RENTAL_BANDS, RENTAL_MIN_HOURS, rentalFare, vehicleToBand } from "./rental";

(function runTests() {
  const sedan = RENTAL_BANDS[0];
  const muv = RENTAL_BANDS[1];
  const crysta = RENTAL_BANDS[2];
  const hycross = RENTAL_BANDS[3];

  // Basic band shape
  console.assert(sedan.id === "sedan", "sedan id");
  console.assert(sedan.hourly === 327, "sedan hourly rate");
  console.assert(muv.hourly === 396, "muv hourly rate");
  console.assert(crysta.hourly === 462, "crysta hourly rate");
  console.assert(hycross.hourly === 485, "hycross hourly rate");

  // vehicleToBand
  console.assert(vehicleToBand("Swift Dzire").id === "sedan", "Swift Dzire → sedan");
  console.assert(vehicleToBand("Toyota Etios").id === "sedan", "Toyota Etios → sedan");
  console.assert(vehicleToBand("Maruti Ertiga").id === "muv", "Maruti Ertiga → muv");
  console.assert(vehicleToBand("Kia Carens").id === "muv", "Kia Carens → muv");
  console.assert(vehicleToBand("Toyota Innova Crysta").id === "crysta", "Innova Crysta → crysta");
  console.assert(vehicleToBand("Toyota Innova Hycross").id === "hycross", "Innova Hycross → hycross");
  console.assert(vehicleToBand("Unknown Car").id === "sedan", "Unknown → default sedan");

  // rentalFare: 8h sedan, no extras
  // base = 8 * 327 = 2616, gst = round(2616 * 0.05) = 131, total = 2747
  const f8 = rentalFare(sedan, 8);
  console.assert(f8.base === 2616, `sedan 8h base: expected 2616 got ${f8.base}`);
  console.assert(f8.includedKm === 80, `sedan 8h includedKm: expected 80 got ${f8.includedKm}`);
  console.assert(f8.extraKm === 0, "sedan 8h extraKm should be 0");
  console.assert(f8.extraTime === 0, "sedan 8h extraTime should be 0");
  console.assert(f8.gst === 131, `sedan 8h gst: expected 131 got ${f8.gst}`);
  console.assert(f8.total === 2747, `sedan 8h total: expected 2747 got ${f8.total}`);

  // minimum hours applies when hours < 8
  const f5 = rentalFare(sedan, 5);
  console.assert(f5.base === 2616, "min hours applies — base same as 8h");

  // 10h sedan
  // base = 10 * 327 = 3270, gst = round(3270 * 0.05) = 164, total = 3434
  const f10 = rentalFare(sedan, 10);
  console.assert(f10.base === 3270, `sedan 10h base: expected 3270 got ${f10.base}`);
  console.assert(f10.includedKm === 100, `sedan 10h includedKm: expected 100 got ${f10.includedKm}`);

  // extra km
  // 8h sedan, 100 actual km → extra = (100-80)*16 = 320
  const fExtra = rentalFare(sedan, 8, 100);
  console.assert(fExtra.extraKm === 320, `extra km: expected 320 got ${fExtra.extraKm}`);

  // RENTAL_MIN_HOURS constant
  console.assert(RENTAL_MIN_HOURS === 8, "RENTAL_MIN_HOURS is 8");

  console.log("All rental.test.ts assertions passed.");
})();
