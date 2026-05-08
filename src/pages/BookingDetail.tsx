import { useParams, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Car, MapPin, Calendar, Users, IndianRupee, Clock, Mail } from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const bookingId = parseInt(id || "0");

  const { data: booking, isLoading } = trpc.booking.getById.useQuery(
    { id: bookingId },
    { enabled: bookingId > 0 }
  );

  const cancelMutation = trpc.booking.cancel.useMutation({
    onSuccess: () => navigate("/dashboard"),
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
        <div className="flex-1 flex items-center justify-center">
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
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
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-800">
              📧 A confirmation email will be sent to you within <strong>60 minutes</strong> of booking. For queries, contact <strong>easyoutstation@gmail.com</strong>
            </p>
          </CardContent>
        </Card>

        {/* Cancel */}
        {booking.status === "pending" && (
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm("Are you sure you want to cancel this booking?")) {
                cancelMutation.mutate({ id: booking.id });
              }
            }}
            disabled={cancelMutation.isPending}
            className="w-full"
          >
            {cancelMutation.isPending ? "Cancelling..." : "Cancel Booking"}
          </Button>
        )}
      </div>
      <Footer />
    </div>
  );
}
