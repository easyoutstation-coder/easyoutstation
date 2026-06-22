import { useEffect, useState } from "react";
import { InvoiceData, toIndianWords } from "@/lib/invoice-utils";
import QRCode from "qrcode";

const NAVY = "#1B3A5C";
const GOLD = "#C9A84C";
const BLUE_TOTAL = "#1D4ED8";
const ORANGE = "#C45217";
const LABEL_COLOR = "#5B7FA6";

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

export default function InvoicePreview({ data }: { data: InvoiceData }) {
  const [qrUrl, setQrUrl] = useState("");

  useEffect(() => {
    QRCode.toDataURL("https://www.easyoutstation.com", { width: 90, margin: 1, color: { dark: "#000000", light: "#ffffff" } })
      .then(setQrUrl)
      .catch(() => {});
  }, []);

  const amountInWords = toIndianWords(data.totalAmount);

  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif", background: "#fff", maxWidth: 794, margin: "0 auto", border: "1px solid #ddd", fontSize: 12, color: "#1a1a1a" }}>

      {/* ── Header ── */}
      <div style={{ background: NAVY, padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <img src="/logo.png" alt="EasyOutstation" style={{ height: 48, filter: "brightness(0) invert(1)" }} />
        <div style={{ textAlign: "right" }}>
          <div style={{ color: GOLD, fontSize: 28, fontWeight: 800, letterSpacing: 2 }}>INVOICE</div>
          <div style={{ color: "#cbd5e1", fontSize: 11, marginTop: 2 }}>Invoice No: {data.invoiceNumber}</div>
          <div style={{ color: "#cbd5e1", fontSize: 11 }}>Date: {data.date}</div>
        </div>
      </div>

      {/* ── Gold separator ── */}
      <div style={{ height: 3, background: `linear-gradient(to right, ${GOLD}, #f5d78e, ${GOLD})` }} />

      {/* ── Company info bar ── */}
      <div style={{ background: "#f8fafc", padding: "8px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0" }}>
        <span style={{ fontWeight: 700, color: NAVY, fontSize: 11 }}>EasyOutstation</span>
        <span style={{ color: "#64748b", fontSize: 10 }}>easyoutstation.com | +91 87965 64111 | bookings@easyoutstation.com</span>
        <span style={{ color: "#94a3b8", fontSize: 10, fontStyle: "italic" }}>This is a computer-generated invoice.</span>
      </div>

      {/* ── Bill To + Service Details ── */}
      <div style={{ display: "flex", padding: "24px 28px 20px", gap: 40 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: LABEL_COLOR, textTransform: "uppercase", marginBottom: 8 }}>Bill To</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>{data.customerName || "—"}</div>
          {data.location && <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{data.location}</div>}
        </div>
        <div style={{ flex: 1.4 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {[
                ["SERVICE DATE", data.serviceDate],
                ["DURATION", data.duration],
                ["LOCATION", data.location],
                ["BOOKING TYPE", data.bookingType],
              ].filter(([, v]) => v).map(([label, value]) => (
                <tr key={label}>
                  <td style={{ padding: "3px 0", paddingRight: 12, fontSize: 9, fontWeight: 700, letterSpacing: 1.2, color: LABEL_COLOR, textTransform: "uppercase", whiteSpace: "nowrap", verticalAlign: "top" }}>{label}</td>
                  <td style={{ padding: "3px 0", fontSize: 12, color: "#1e293b", fontWeight: 500 }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Line Items Table ── */}
      <div style={{ margin: "0 28px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: NAVY }}>
              <th style={{ color: "#fff", padding: "9px 10px", textAlign: "left", fontSize: 11, fontWeight: 700, width: 30 }}>#</th>
              <th style={{ color: "#fff", padding: "9px 10px", textAlign: "left", fontSize: 11, fontWeight: 700 }}>Vehicle &amp; Description</th>
              <th style={{ color: "#fff", padding: "9px 10px", textAlign: "right", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {data.lineItems.map((item, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "11px 10px", verticalAlign: "top", color: "#64748b", fontSize: 11 }}>{i + 1}</td>
                <td style={{ padding: "11px 10px", verticalAlign: "top" }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: NAVY }}>{item.vehicle}</div>
                  {item.description && <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 2 }}>{item.description}</div>}
                </td>
                <td style={{ padding: "11px 10px", textAlign: "right", fontWeight: 700, fontSize: 12, verticalAlign: "top", color: NAVY }}>{Number(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
            {data.lineItems.length === 0 && (
              <tr><td colSpan={3} style={{ padding: "20px 10px", textAlign: "center", color: "#94a3b8", fontStyle: "italic" }}>No line items added</td></tr>
            )}
          </tbody>
        </table>

        {/* Total row */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 0 }}>
          <div style={{ background: BLUE_TOTAL, padding: "10px 16px", display: "flex", gap: 60, alignItems: "center", minWidth: 280 }}>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>Total Amount</span>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 15, marginLeft: "auto" }}>₹ {Number(data.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* ── Amount in words + disclaimer ── */}
      <div style={{ margin: "16px 28px 0" }}>
        <p style={{ fontSize: 11, fontWeight: 700, margin: 0 }}>Amount in words: <span style={{ fontWeight: 400 }}>{amountInWords}</span></p>
        <p style={{ fontSize: 10, color: "#64748b", margin: "4px 0 0" }}>Total is inclusive of applicable taxes. Toll, parking and state permits, where applicable, are charged at actuals. Usage beyond 12 hours is charged at ₹ 250/hour, subject to approval.</p>
        {data.notes && <p style={{ fontSize: 10.5, color: "#334155", margin: "6px 0 0", fontStyle: "italic" }}>{data.notes}</p>}
      </div>

      <hr style={{ margin: "16px 28px", borderTop: "1px solid #e2e8f0", border: "none", borderBottom: "1px solid #e2e8f0" }} />

      {/* ── T&C ── */}
      <div style={{ margin: "0 28px 20px" }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: NAVY, marginBottom: 8 }}>Terms &amp; Conditions</div>
        <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {T_AND_C.map((t, i) => (
            <li key={i} style={{ display: "flex", gap: 8, marginBottom: 5, fontSize: 10.5, color: "#334155", lineHeight: 1.5 }}>
              <span style={{ color: ORANGE, fontWeight: 700, minWidth: 14, flexShrink: 0 }}>{i + 1}.</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* ── QR + Signature ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "8px 28px 20px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
          {qrUrl && <img src={qrUrl} alt="QR Code" style={{ width: 80, height: 80 }} />}
          <span style={{ fontSize: 9, color: "#64748b" }}>Scan to visit</span>
          <span style={{ fontSize: 9, color: "#64748b" }}>easyoutstation.com</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#334155", marginBottom: 30 }}>For EasyOutstation</div>
          <div style={{ borderTop: "1px solid #64748b", paddingTop: 4, width: 180, marginLeft: "auto" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#1e293b" }}>Parminder Singh</div>
            <div style={{ fontSize: 10, color: "#64748b" }}>Authorised Signatory</div>
          </div>
        </div>
      </div>

      {/* ── Footer bar ── */}
      <div style={{ background: NAVY, padding: "10px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#cbd5e1", fontSize: 10, fontWeight: 700 }}>EasyOutstation</span>
        <span style={{ color: "#94a3b8", fontSize: 9 }}>easyoutstation.com | +91 87965 64111 | bookings@easyoutstation.com</span>
        <span style={{ color: "#94a3b8", fontSize: 9, fontStyle: "italic" }}>This is a computer-generated invoice.</span>
      </div>
    </div>
  );
}
