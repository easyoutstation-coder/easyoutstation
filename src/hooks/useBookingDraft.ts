// Hook to save/restore booking progress in sessionStorage
// Prevents data loss on accidental refresh

export interface BookingDraft {
  tripType?: string;
  pickupDate?: string;
  pickupTime?: string;
  passengerCount?: string;
  pickupAddress?: string;
  pickupPincode?: string;
  dropAddress?: string;
  dropPincode?: string;
  specialRequests?: string;
  currentStep?: number;
}

const KEY = "easyoutstation_booking_draft";

export function saveBookingDraft(draft: BookingDraft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {}
}

export function loadBookingDraft(): BookingDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearBookingDraft() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}
