import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Car, ArrowLeft, Shield, Clock, Headphones } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isAuthenticated) {
    navigate("/dashboard");
    return null;
  }

  const handleLogin = () => {
    const loginUrl = import.meta.env.VITE_KIMI_AUTH_URL;
    const appId = import.meta.env.VITE_APP_ID;
    const redirectUri = `${window.location.origin}/api/oauth/callback`;
    const state = btoa(redirectUri);

    const url = new URL(loginUrl);
    url.searchParams.set("client_id", appId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "profile");
    url.searchParams.set("state", state);

    window.location.href = url.toString();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        <Card className="shadow-xl border-0">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Car className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold font-['Playfair_Display']">Welcome Back</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Sign in to manage your bookings and preferences
              </p>
            </div>

            <Button
              onClick={handleLogin}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white text-base"
            >
              Sign In with EasyOutstation
            </Button>

            <div className="mt-6 space-y-4">
              <div className="text-center text-xs text-muted-foreground uppercase tracking-wider">
                Why Sign In?
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <Shield className="w-5 h-5 text-primary mx-auto mb-1" />
                  <div className="text-xs text-muted-foreground">Secure Bookings</div>
                </div>
                <div className="text-center">
                  <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
                  <div className="text-xs text-muted-foreground">Quick Checkout</div>
                </div>
                <div className="text-center">
                  <Headphones className="w-5 h-5 text-primary mx-auto mb-1" />
                  <div className="text-xs text-muted-foreground">24/7 Support</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
