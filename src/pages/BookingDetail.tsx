import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Car, MapPin, Calendar, Users, IndianRupee, Clock, Mail, Phone, Download, CalendarCheck } from "lucide-react";
import { format, differenceInHours } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
};

function calcRefund(totalPrice: number, pickupDate: string | Date): { pct: number; amount: number; label: string } {
  const hoursLeft = differenceInHours(new Date(pickupDate), new Date());
  if (hoursLeft > 24) return { pct: 100, amount: totalPrice, label: "Full refund (>24h before pickup)" };
  if (hoursLeft >= 12) return { pct: 50, amount: Math.round(totalPrice * 0.5), label: "50% refund (12–24h before pickup)" };
  return { pct: 0, amount: 0, label: "No refund (<12h before pickup)" };
}

function printInvoice(booking: any) {
  const price = Number(booking.totalPrice);
  const pickupDateStr = format(new Date(booking.pickupDate), "dd MMM yyyy");
  const invoiceDate = format(new Date(), "dd MMM yyyy");
  const tripLabel = booking.tripType.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice #${booking.id} — EasyOutstation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #1e293b; padding: 40px; font-size: 14px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
    .brand h1 { font-size: 22px; font-weight: 800; color: #2563eb; }
    .brand p { font-size: 11px; color: #64748b; margin-top: 2px; }
    .invoice-meta { text-align: right; }
    .invoice-meta h2 { font-size: 18px; color: #1e293b; font-weight: 700; }
    .invoice-meta p { font-size: 12px; color: #64748b; margin-top: 2px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
    .row:last-child { border-bottom: none; }
    .label { color: #64748b; }
    .value { font-weight: 600; color: #1e293b; }
    .total-row { display: flex; justify-content: space-between; padding: 14px 16px; background: #2563eb; color: white; border-radius: 8px; margin-top: 16px; }
    .total-row .label { color: #bfdbfe; font-size: 13px; }
    .total-row .amount { font-size: 20px; font-weight: 800; }
    .note { font-size: 11px; color: #64748b; margin-top: 4px; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <h1>EasyOutstation</h1>
      <p>Outstation Cab Service · Delhi NCR</p>
      <p>easyoutstation@gmail.com · +91 9958556011</p>
      <p>easyoutstation.com</p>
    </div>
    <div class="invoice-meta">
      <h2>BOOKING RECEIPT</h2>
      <p>Receipt #${booking.id}</p>
      <p>Date: ${invoiceDate}</p>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Customer Details</div>
    <div class="row"><span class="label">Name</span><span class="value">${booking.customerName}</span></div>
    ${booking.customerPhone ? `<div class="row"><span class="label">Phone</span><span class="value">+91-${booking.customerPhone}</span></div>` : ""}
    ${booking.customerEmail ? `<div class="row"><span class="label">Email</span><span class="value">${booking.customerEmail}</span></div>` : ""}
  </div>

  <div class="section">
    <div class="section-title">Trip Details</div>
    <div class="row"><span class="label">Route</span><span class="value">${booking.fromCity} → ${booking.toCity}</span></div>
    <div class="row"><span class="label">Pickup Date</span><span class="value">${pickupDateStr}</span></div>
    <div class="row"><span class="label">Trip Type</span><span class="value">${tripLabel}</span></div>
    <div class="row"><span class="label">Distance</span><span class="value">${booking.totalKm} km</span></div>
    <div class="row"><span class="label">Passengers</span><span class="value">${booking.passengerCount}</span></div>
    ${booking.car ? `<div class="row"><span class="label">Vehicle</span><span class="value">${booking.car.name} (${booking.car.brand})</span></div>` : ""}
    ${booking.pickupAddress ? `<div class="row"><span class="label">Pickup Address</span><span class="value">${booking.pickupAddress}</span></div>` : ""}
  </div>

  <div class="section">
    <div class="section-title">Fare Breakdown</div>
    <div class="row"><span class="label">Distance charges (${booking.totalKm} km)</span><span class="value">Included</span></div>
    <div class="row"><span class="label">Driver charges</span><span class="value">Included</span></div>
    <div class="row"><span class="label">Estimated toll</span><span class="value">Included</span></div>
    <div class="row"><span class="label">GST</span><span class="value">Not applicable</span></div>
    <div class="total-row">
      <span class="label">Total Fare</span>
      <span class="amount">₹${price.toLocaleString("en-IN")}</span>
    </div>
    <p class="note">* Parking charges payable at actuals. Payment due at time of pickup/drop.</p>
  </div>

  <div class="footer">
    <p>Thank you for choosing EasyOutstation! For support: easyoutstation@gmail.com or WhatsApp +91-9958556011</p>
    <p style="margin-top:4px">This is a computer-generated receipt and does not require a signature.</p>
  </div>

  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); }
}

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const bookingId = parseInt(id || "0");

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [changeDateOpen, setChangeDateOpen] = useState(false);
  const [newDate, setNewDate] = useState("");

  const { data: booking, isLoading, refetch } = trpc.booking.getById.useQuery(
    { id: bookingId },
    { enabled: bookingId > 0 }
  );

  const cancelMutation = trpc.booking.cancel.useMutation({
    onSuccess: () => { setCancelDialogOpen(false); navigate("/dashboard"); },
  });

  const updateDateMutation = trpc.booking.updateDate.useMutation({
    onSuccess: () => { setChangeDateOpen(false); refetch(); },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center pt-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Booking Not Found</h2>
            <p className="text-muted-foreground mb-4">This booking doesn't exist or you don't have access.</p>
            <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const refund = booking.status === "pending" ? calcRefund(Number(booking.totalPrice), booking.pickupDate) : null;
  const hoursToPickup = differenceInHours(new Date(booking.pickupDate), new Date());
  const canModify = booking.status === "pending" && hoursToPickup >= 24;
  const minDate = new Date(); minDate.setDate(minDate.getDate() + 1);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 pt-24 pb-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold font-['DM_Serif_Display']">Booking #{booking.id}</h1>
          <Badge className={statusColors[booking.status] || "bg-gray-100 text-gray-800"}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Badge>
        </div>

        {/* Driver Details (shown when confirmed + driver assigned) */}
        {booking.status === "confirmed" && (booking as any).driverName && (
          <Card className="mb-4 bg-green-50 border-green-200">
            <CardContent className="p-5">
              <h3 className="font-semibold text-green-800 text-sm mb-3 flex items-center gap-2">
                <span className="text-base">👨‍✈️</span> Your Driver
              </h3>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-bold text-green-900 text-lg">{(booking as any).driverName}</p>
                  {(booking as any).driverPhone && (
                    <a
                      href={`tel:+91${(booking as any).driverPhone}`}
                      className="flex items-center gap-1.5 text-green-700 font-medium mt-1 hover:underline"
                    >
                      <Phone className="w-4 h-4" />+91-{(booking as any).driverPhone}
                    </a>
                  )}
                </div>
                {(booking as any).driverPhone && (
                  <a
                    href={`https://wa.me/91${(booking as any).driverPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25D366] text-white text-sm font-semibold hover:bg-[#1ebe5d] transition-colors"
                  >
                    WhatsApp Driver
                  </a>
                )}
              </div>
              <p className="text-xs text-green-600 mt-2">Driver will call you 1 hour before pickup.</p>
            </CardContent>
          </Card>
        )}

        {/* Car Info */}
        <Card className="mb-4">
          <CardContent className="p-6">
            <div className="flex gap-4 items-center">
              {booking.car?.imageUrl && (
                <img src={booking.car.imageUrl} alt={booking.car.name} className="w-24 h-16 object-cover rounded-lg" />
              )}
              <div>
                <h2 className="text-lg font-semibold">{booking.car?.name}</h2>
                <p className="text-sm text-muted-foreground">{booking.car?.brand} · {booking.car?.seats} seats · {booking.car?.fuelType}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trip Details */}
        <Card className="mb-4">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-base">Trip Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-muted-foreground">Route</div>
                  <div className="font-medium">{booking.fromCity} → {booking.toCity}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-muted-foreground">Pickup Date</div>
                  <div className="font-medium">{format(new Date(booking.pickupDate), "dd MMM yyyy")}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-muted-foreground">Passengers</div>
                  <div className="font-medium">{booking.passengerCount}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-muted-foreground">Trip Type</div>
                  <div className="font-medium capitalize">{booking.tripType.replace("_", " ")}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-muted-foreground">Distance</div>
                  <div className="font-medium">{booking.totalKm} km</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-primary" />
                <div>
                  <div className="text-muted-foreground">Total Price</div>
                  <div className="font-medium text-primary">₹{Number(booking.totalPrice).toLocaleString()}</div>
                </div>
              </div>
            </div>
            {booking.pickupAddress && (
              <div className="text-sm">
                <span className="text-muted-foreground">Pickup Address: </span>
                <span className="font-medium">{booking.pickupAddress}</span>
              </div>
            )}
            {booking.specialRequests && (
              <div className="text-sm">
                <span className="text-muted-foreground">Special Requests: </span>
                <span className="font-medium">{booking.specialRequests}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card className="mb-4">
          <CardContent className="p-6 space-y-3">
            <h3 className="font-semibold text-base">Customer Details</h3>
            <div className="text-sm space-y-2">
              <div><span className="text-muted-foreground">Name: </span><span className="font-medium">{booking.customerName}</span></div>
              {booking.customerEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{booking.customerEmail}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notice */}
        {booking.status === "pending" && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <p className="text-sm text-blue-800">
                Driver details will be shared within <strong>60 minutes</strong> of booking. For queries, contact <strong>easyoutstation@gmail.com</strong>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Download Invoice */}
          <Button variant="outline" onClick={() => printInvoice(booking)} className="w-full gap-2">
            <Download className="w-4 h-4" /> Download Receipt
          </Button>

          {/* Locked notice when within 24h of pickup */}
          {booking.status === "pending" && !canModify && (
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <p className="text-sm text-amber-800">
                  Modifications are not allowed within 24 hours of pickup. Contact us at <strong>easyoutstation@gmail.com</strong> for urgent changes.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Change Date — pending only, more than 24h before pickup */}
          {canModify && (
            <Button variant="outline" onClick={() => { setNewDate(""); setChangeDateOpen(true); }} className="w-full gap-2">
              <CalendarCheck className="w-4 h-4" /> Change Pickup Date
            </Button>
          )}

          {/* Cancel — pending only, more than 24h before pickup */}
          {canModify && (
            <Button
              variant="destructive"
              onClick={() => setCancelDialogOpen(true)}
              className="w-full"
            >
              Cancel Booking
            </Button>
          )}
        </div>
      </div>
      <Footer />

      {/* Cancel Dialog with refund info */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Booking #{booking.id}?</DialogTitle>
          </DialogHeader>
          {refund && (
            <div className={`rounded-lg p-4 text-sm ${refund.pct === 100 ? "bg-green-50 border border-green-200" : refund.pct === 50 ? "bg-amber-50 border border-amber-200" : "bg-red-50 border border-red-200"}`}>
              <p className="font-semibold mb-1">
                {refund.pct === 100 ? "✅ Full refund eligible" : refund.pct === 50 ? "⚠️ Partial refund" : "❌ No refund"}
              </p>
              <p className={refund.pct === 100 ? "text-green-700" : refund.pct === 50 ? "text-amber-700" : "text-red-700"}>
                {refund.label}
              </p>
              {refund.amount > 0 && (
                <p className="mt-2 font-bold text-lg">Refund: ₹{refund.amount.toLocaleString("en-IN")}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">Refunds are processed to original payment method within 5–7 business days.</p>
            </div>
          )}
          <div className="flex gap-3 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setCancelDialogOpen(false)}>
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate({ id: booking.id })}
            >
              {cancelMutation.isPending ? "Cancelling…" : "Yes, Cancel"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Date Dialog */}
      <Dialog open={changeDateOpen} onOpenChange={setChangeDateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Pickup Date</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Current date: <strong>{format(new Date(booking.pickupDate), "dd MMM yyyy")}</strong>
              </p>
              <label className="text-sm font-medium mb-1 block">New Pickup Date</label>
              <input
                type="date"
                className="w-full border border-input rounded-md h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                min={format(minDate, "yyyy-MM-dd")}
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setChangeDateOpen(false)}>Cancel</Button>
              <Button
                className="flex-1"
                disabled={!newDate || updateDateMutation.isPending}
                onClick={() => updateDateMutation.mutate({ id: booking.id, newDate })}
              >
                {updateDateMutation.isPending ? "Updating…" : "Confirm Date"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
