import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Car, ArrowLeft, Shield, Clock, Headphones, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading, refresh } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, isLoading, navigate]);

  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get("redirect");

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await refresh();
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        navigate("/dashboard");
      }
    },
    onError: (e) => setError(e.message),
  });

  const signupMutation = trpc.auth.signup.useMutation({
    onSuccess: async () => {
      await refresh();
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        navigate("/dashboard");
      }
    },
    onError: (e) => setError(e.message),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  const handleSubmit = () => {
    setError("");
    if (mode === "login") {
      loginMutation.mutate({ email, password });
    } else {
      if (!name.trim()) { setError("Please enter your name."); return; }
      signupMutation.mutate({ name, email, password });
    }
  };

  const isPending = loginMutation.isPending || signupMutation.isPending;

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
              <h1 className="text-2xl font-bold font-['Playfair_Display']">
                {mode === "login" ? "Welcome Back" : "Create Account"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {mode === "login" ? "Sign in to manage your bookings" : "Join EasyOutstation today"}
              </p>
            </div>

            <div className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? "Minimum 6 characters" : "Enter your password"}
                    className="pr-10"
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={isPending}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-white text-base"
              >
                {isPending ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                {mode === "login" ? (
                  <>Don't have an account?{" "}
                    <button onClick={() => { setMode("signup"); setError(""); }} className="text-primary font-medium hover:underline">
                      Sign up
                    </button>
                  </>
                ) : (
                  <>Already have an account?{" "}
                    <button onClick={() => { setMode("login"); setError(""); }} className="text-primary font-medium hover:underline">
                      Sign in
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
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
