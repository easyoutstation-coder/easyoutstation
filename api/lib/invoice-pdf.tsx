import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";
import { readFileSync } from "fs";
import { resolve } from "path";

// ── Types ────────────────────────────────────────────────────────────────────
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
  notes?: string;
}

// ── Logo (cached) ─────────────────────────────────────────────────────────────
let _logoDataUrl = "";
function getLogoDataUrl(): string {
  if (_logoDataUrl) return _logoDataUrl;
  try {
    const buf = readFileSync(resolve(process.cwd(), "public", "logo.png"));
    _logoDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    _logoDataUrl = "";
  }
  return _logoDataUrl;
}

// ── Number to words ───────────────────────────────────────────────────────────
const ONES = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
const TENS = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
function chunk(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n/10)] + (n%10 ? " " + ONES[n%10] : "");
  return ONES[Math.floor(n/100)] + " Hundred" + (n%100 ? " " + chunk(n%100) : "");
}
function toWords(num: number): string {
  const r = Math.floor(num);
  if (r === 0) return "Indian Rupees Zero Only.";
  let rem = r;
  const parts: string[] = [];
  const cr = Math.floor(rem/10_000_000); rem %= 10_000_000;
  const lk = Math.floor(rem/100_000);   rem %= 100_000;
  const th = Math.floor(rem/1_000);     rem %= 1_000;
  if (cr) parts.push(chunk(cr) + " Crore");
  if (lk) parts.push(chunk(lk) + " Lakh");
  if (th) parts.push(chunk(th) + " Thousand");
  if (rem) parts.push(chunk(rem));
  return "Indian Rupees " + parts.join(" ") + " Only.";
}

// ── Colors ────────────────────────────────────────────────────────────────────
const NAVY   = "#1B3A5C";
const GOLD   = "#C9A84C";
const BLUE   = "#1D4ED8";
const ORANGE = "#C45217";
const LABEL  = "#5B7FA6";
const MUTED  = "#64748B";
const LIGHT  = "#CBD5E1";

const T_AND_C = [
  "The charges above are for the booking detailed and cover the included kilometres/hours of the package. Usage beyond the included hours or kilometres is chargeable at the applicable extra rates.",
  "Usage beyond 12 hours will be charged at ₹ 250 per hour, subject to prior approval.",
  "Toll taxes, parking charges, state permits and inter-state taxes (where applicable) are billed at actuals and are not included unless expressly stated.",
  "The vehicle is provided with a professional chauffeur; fuel is included unless otherwise specified.",
  "Free cancellation up to 12 hours before the scheduled reporting time. Cancellations thereafter, or no-shows, may attract charges as per company policy.",
  "Waiting beyond the agreed schedule, route changes and additional stops may revise the final payable amount.",
  "EasyOutstation shall not be liable for delays arising from traffic, weather, road conditions or other circumstances beyond its reasonable control.",
  "All bookings are subject to EasyOutstation's standard terms of service. Disputes, if any, are subject to the jurisdiction of Delhi NCR.",
];

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page:      { fontFamily: "Helvetica", fontSize: 10, color: "#1a1a1a", backgroundColor: "#ffffff" },
  header:    { backgroundColor: NAVY, padding: "16 24", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  logo:      { height: 36 },
  invoiceLabel: { color: GOLD, fontSize: 26, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  headerRight: { alignItems: "flex-end" },
  headerSub: { color: LIGHT, fontSize: 9, marginTop: 2 },
  goldBar:   { height: 3, backgroundColor: GOLD },
  infoBar:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F8FAFC", padding: "5 24", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  infoBarText: { fontSize: 8.5, color: MUTED },
  infoBarBrand: { fontSize: 9, fontFamily: "Helvetica-Bold", color: NAVY },
  body:      { padding: "0 24" },
  sectionRow: { flexDirection: "row", marginTop: 18, marginBottom: 14, gap: 28 },
  billTo:    { flex: 1 },
  serviceDetails: { flex: 1.4 },
  labelSmall: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: LABEL, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 },
  customerName: { fontSize: 15, fontFamily: "Helvetica-Bold", color: NAVY },
  sdRow:     { flexDirection: "row", marginBottom: 3 },
  sdLabel:   { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: LABEL, letterSpacing: 1, textTransform: "uppercase", width: 72 },
  sdValue:   { fontSize: 10, color: "#1E293B", flex: 1 },
  tableHeader: { flexDirection: "row", backgroundColor: NAVY, padding: "8 8" },
  thNum:     { color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 9, width: 22 },
  thDesc:    { color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 9, flex: 1 },
  thAmt:     { color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 9, width: 72, textAlign: "right" },
  tableRow:  { flexDirection: "row", padding: "9 8", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  tdNum:     { fontSize: 9.5, color: MUTED, width: 22, paddingTop: 1 },
  tdDesc:    { flex: 1 },
  tdVehicle: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: NAVY },
  tdSub:     { fontSize: 9, color: MUTED, marginTop: 2 },
  tdAmt:     { fontSize: 11, fontFamily: "Helvetica-Bold", color: NAVY, width: 72, textAlign: "right" },
  totalRow:  { flexDirection: "row", backgroundColor: BLUE, padding: "8 8", alignItems: "center", marginTop: 0 },
  totalLabel: { flex: 1, color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 11 },
  totalAmt:  { color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 13 },
  words:     { fontSize: 9.5, marginTop: 12 },
  wordsBold: { fontFamily: "Helvetica-Bold" },
  disclaimer: { fontSize: 8.5, color: MUTED, marginTop: 4, lineHeight: 1.5 },
  divider:   { borderBottomWidth: 1, borderBottomColor: "#E2E8F0", marginTop: 12, marginBottom: 10 },
  tcTitle:   { fontSize: 10, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 6 },
  tcRow:     { flexDirection: "row", marginBottom: 4, gap: 4 },
  tcNum:     { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: ORANGE, width: 12 },
  tcText:    { fontSize: 8.5, color: "#334155", flex: 1, lineHeight: 1.5 },
  footer2:   { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 12, marginBottom: 16 },
  qrSection: { alignItems: "flex-start", gap: 3 },
  qrImg:     { width: 72, height: 72 },
  qrCaption: { fontSize: 7.5, color: MUTED },
  sigSection: { alignItems: "flex-end" },
  sigFor:    { fontSize: 9, color: "#334155", marginBottom: 22 },
  sigLine:   { borderTopWidth: 1, borderTopColor: MUTED, paddingTop: 3, alignItems: "flex-end" },
  sigName:   { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#1E293B" },
  sigRole:   { fontSize: 8.5, color: MUTED },
  footerBar: { backgroundColor: NAVY, padding: "8 24", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerBrand: { fontSize: 8, fontFamily: "Helvetica-Bold", color: LIGHT },
  footerContact: { fontSize: 7.5, color: "#94A3B8" },
  footerNote: { fontSize: 7.5, color: "#94A3B8", fontStyle: "italic" },
});

// ── Component ─────────────────────────────────────────────────────────────────
export function InvoicePDF({ data, qrDataUrl }: { data: InvoiceData; qrDataUrl: string }) {
  const logo = getLogoDataUrl();
  const fmtAmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2 });

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          {logo ? <Image src={logo} style={s.logo} /> : <Text style={{ color: "#fff", fontSize: 14, fontFamily: "Helvetica-Bold" }}>EasyOutstation</Text>}
          <View style={s.headerRight}>
            <Text style={s.invoiceLabel}>INVOICE</Text>
            <Text style={s.headerSub}>Invoice No: {data.invoiceNumber}</Text>
            <Text style={s.headerSub}>Date:  {data.date}</Text>
          </View>
        </View>

        {/* Gold separator */}
        <View style={s.goldBar} />

        {/* Info bar */}
        <View style={s.infoBar}>
          <Text style={s.infoBarBrand}>EasyOutstation</Text>
          <Text style={s.infoBarText}>easyoutstation.com | +91 87965 64111 | bookings@easyoutstation.com</Text>
          <Text style={[s.infoBarText, { fontStyle: "italic" }]}>This is a computer-generated invoice.</Text>
        </View>

        <View style={s.body}>
          {/* Bill To + Service Details */}
          <View style={s.sectionRow}>
            <View style={s.billTo}>
              <Text style={s.labelSmall}>Bill To</Text>
              <Text style={s.customerName}>{data.customerName}</Text>
            </View>
            <View style={s.serviceDetails}>
              {[
                ["SERVICE DATE", data.serviceDate],
                ["DURATION", data.duration],
                ["LOCATION", data.location],
                ["BOOKING TYPE", data.bookingType],
              ].filter(([, v]) => v).map(([label, value]) => (
                <View key={label} style={s.sdRow}>
                  <Text style={s.sdLabel}>{label}</Text>
                  <Text style={s.sdValue}>{value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Table header */}
          <View style={s.tableHeader}>
            <Text style={s.thNum}>#</Text>
            <Text style={s.thDesc}>Vehicle &amp; Description</Text>
            <Text style={s.thAmt}>Amount (₹)</Text>
          </View>

          {/* Line items */}
          {data.lineItems.map((item, i) => (
            <View key={i} style={s.tableRow}>
              <Text style={s.tdNum}>{i + 1}</Text>
              <View style={s.tdDesc}>
                <Text style={s.tdVehicle}>{item.vehicle}</Text>
                {item.description ? <Text style={s.tdSub}>{item.description}</Text> : null}
              </View>
              <Text style={s.tdAmt}>{fmtAmt(Number(item.amount))}</Text>
            </View>
          ))}

          {/* Total */}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total Amount</Text>
            <Text style={s.totalAmt}>₹ {fmtAmt(data.totalAmount)}</Text>
          </View>

          {/* Words + disclaimer */}
          <Text style={s.words}>
            <Text style={s.wordsBold}>Amount in words: </Text>
            {toWords(data.totalAmount)}
          </Text>
          <Text style={s.disclaimer}>
            Total is inclusive of applicable taxes. Toll, parking and state permits, where applicable, are charged at actuals. Usage beyond 12 hours is charged at ₹ 250/hour, subject to approval.
          </Text>
          {data.notes ? <Text style={[s.disclaimer, { marginTop: 5, fontStyle: "italic", color: "#334155" }]}>{data.notes}</Text> : null}

          {/* Divider */}
          <View style={s.divider} />

          {/* T&C */}
          <Text style={s.tcTitle}>Terms &amp; Conditions</Text>
          {T_AND_C.map((tc, i) => (
            <View key={i} style={s.tcRow}>
              <Text style={s.tcNum}>{i + 1}.</Text>
              <Text style={s.tcText}>{tc}</Text>
            </View>
          ))}

          {/* QR + Signature */}
          <View style={s.footer2}>
            <View style={s.qrSection}>
              {qrDataUrl ? <Image src={qrDataUrl} style={s.qrImg} /> : null}
              <Text style={s.qrCaption}>Scan to visit</Text>
              <Text style={s.qrCaption}>easyoutstation.com</Text>
            </View>
            <View style={s.sigSection}>
              <Text style={s.sigFor}>For EasyOutstation</Text>
              <View style={s.sigLine}>
                <Text style={s.sigName}>Parminder Singh</Text>
                <Text style={s.sigRole}>Authorised Signatory</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer bar */}
        <View style={s.footerBar}>
          <Text style={s.footerBrand}>EasyOutstation</Text>
          <Text style={s.footerContact}>easyoutstation.com  |  +91 87965 64111  |  bookings@easyoutstation.com</Text>
          <Text style={s.footerNote}>This is a computer-generated invoice.</Text>
        </View>

      </Page>
    </Document>
  );
}
