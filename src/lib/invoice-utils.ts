export interface InvoiceLineItem {
  vehicle: string;
  description: string;
  amount: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  customerName: string;
  serviceDate: string;
  duration?: string;
  location?: string;
  bookingType?: string;
  lineItems: InvoiceLineItem[];
  totalAmount: number;
  advancePaid?: number;
  notes?: string;
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function convertChunk(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
  return ONES[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convertChunk(n % 100) : "");
}

export function toIndianWords(num: number): string {
  const rupees = Math.floor(num);
  if (rupees === 0) return "Indian Rupees Zero Only.";
  let remaining = rupees;
  const parts: string[] = [];

  const crore = Math.floor(remaining / 10_000_000);
  remaining %= 10_000_000;
  const lakh = Math.floor(remaining / 100_000);
  remaining %= 100_000;
  const thousand = Math.floor(remaining / 1_000);
  remaining %= 1_000;

  if (crore) parts.push(convertChunk(crore) + " Crore");
  if (lakh) parts.push(convertChunk(lakh) + " Lakh");
  if (thousand) parts.push(convertChunk(thousand) + " Thousand");
  if (remaining) parts.push(convertChunk(remaining));

  return "Indian Rupees " + parts.join(" ") + " Only.";
}

export function getFinancialYear(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return m >= 4 ? `${y}-${String(y + 1).slice(2)}` : `${y - 1}-${String(y).slice(2)}`;
}

export function buildInvoiceNumber(id: number, date?: Date): string {
  return `EOS/${getFinancialYear(date)}/${String(id).padStart(4, "0")}`;
}

export function formatInvoiceDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}
