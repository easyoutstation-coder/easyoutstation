import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useSeo } from "@/hooks/useSeo";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Car, ArrowLeft, Shield, Clock, Headphones, Eye, EyeOff } from "lucide-react";
import FirebaseOTP from "@/components/FirebaseOTP";

export default function Login() {
  useSeo({ title: "Sign In | EasyOutstation", description: "Sign in to EasyOutstation to manage your cab bookings.", noindex: true });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();

  const [phone, setPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailMode, setEmailMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");

  const redirectUrl = searchParams.get("redirect");

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate("/dashboard");
  }, [isAuthenticated, isLoading, navigate]);

  const loginWithPhoneMutation = trpc.auth.loginWithPhone.useMutation({
    onSuccess: (data) => {
      if (data.token) localStorage.setItem("authToken", data.token);
      window.location.href = redirectUrl || "/dashboard";
    },
    onError: (e) => setError(e.message),
  });

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      if (data.token) localStorage.setItem("authToken", data.token);
      window.location.href = redirectUrl || "/dashboard";
    },
    onError: (e) => setError(e.message),
  });

  const signupMutation = trpc.auth.signup.useMutation({
    onSuccess: (data) => {
      if (data.token) localStorage.setItem("authToken", data.token);
      window.location.href = redirectUrl || "/dashboard";
    },
    onError: (e) => setError(e.message),
  });

  useEffect(() => {
    if (phoneVerified) {
      loginWithPhoneMutation.mutate({ phone });
    }
  }, [phoneVerified]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  const handleEmailSubmit = () => {
    setError("");
    if (emailMode === "login") {
      loginMutation.mutate({ email, password });
    } else {
      if (!name.trim()) { setError("Please enter your name."); return; }
      signupMutation.mutate({ name, email, password });
    }
  };

  const isPending = loginWithPhoneMutation.isPending || loginMutation.isPending || signupMutation.isPending;

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
              <h1 className="text-2xl font-bold font-['DM_Serif_Display']">
                {showEmailForm ? (emailMode === "login" ? "Welcome Back" : "Create Account") : "Login / Sign Up"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {showEmailForm ? "Use your email and password" : "Enter your mobile number to get OTP"}
              </p>
            </div>

            {!showEmailForm ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Mobile Number</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium select-none">+91</span>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                        setPhoneVerified(false);
                      }}
                      placeholder="10-digit mobile number"
                      className="pl-12 h-12 text-base tracking-wide"
                      disabled={phoneVerified}
                      autoFocus
                    />
                  </div>
                </div>

                {phone.length === 10 ? (
                  <FirebaseOTP
                    phone={phone}
                    onVerified={() => setPhoneVerified(true)}
                    onError={(msg) => setError(msg)}
                  />
                ) : (
                  <p className="text-xs text-slate-400">Enter your 10-digit number above to receive OTP</p>
                )}

                {error && (
                  <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
                )}

                {isPending && (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-1">
                    <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                    Signing you in...
                  </div>
                )}

                <div className="relative flex items-center gap-3 py-1">
                  <div className="flex-1 border-t border-muted" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="flex-1 border-t border-muted" />
                </div>

                <button
                  onClick={() => { setShowEmailForm(true); setError(""); }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground text-center py-1 transition-colors"
                >
                  Sign in with email & password
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {emailMode === "signup" && (
                  <div className="space-y-1.5">
                    <Label>Full Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={emailMode === "signup" ? "Minimum 6 characters" : "Enter your password"}
                      className="pr-10"
                      onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
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
                  <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
                )}

                <Button onClick={handleEmailSubmit} disabled={isPending} className="w-full h-12 text-base">
                  {isPending ? "Please wait..." : emailMode === "login" ? "Sign In" : "Create Account"}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  {emailMode === "login" ? (
                    <>Don't have an account?{" "}
                      <button onClick={() => { setEmailMode("signup"); setError(""); }} className="text-primary font-medium hover:underline">Sign up</button>
                    </>
                  ) : (
                    <>Already have an account?{" "}
                      <button onClick={() => { setEmailMode("login"); setError(""); }} className="text-primary font-medium hover:underline">Sign in</button>
                    </>
                  )}
                </div>

                <button
                  onClick={() => { setShowEmailForm(false); setError(""); }}
                  className="w-full text-sm text-primary hover:underline text-center"
                >
                  ← Use mobile OTP instead
                </button>
              </div>
            )}

            <div className="mt-6 pt-6 border-t">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <Shield className="w-5 h-5 text-primary mx-auto mb-1" />
                  <div className="text-xs text-muted-foreground">Secure Login</div>
                </div>
                <div className="text-center">
                  <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
                  <div className="text-xs text-muted-foreground">30-sec OTP</div>
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
