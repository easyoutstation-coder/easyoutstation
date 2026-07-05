import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useSeo } from "@/hooks/useSeo";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Car, ArrowLeft, Shield, Clock, Headphones, Eye, EyeOff, Phone, Mail } from "lucide-react";
import FirebaseOTP from "@/components/FirebaseOTP";

type AuthTab = "phone" | "email";

export default function Login() {
  useSeo({ title: "Sign In | EasyOutstation", description: "Sign in to EasyOutstation to manage your cab bookings.", noindex: true });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();

  const [tab, setTab] = useState<AuthTab>("phone");

  // Phone OTP state
  const [phone, setPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Email OTP state
  const [email, setEmail] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpInput, setEmailOtpInput] = useState("");
  const [emailOtpVerified, setEmailOtpVerified] = useState(false);
  const [emailName, setEmailName] = useState("");

  // Password fallback (hidden behind a link)
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordMode, setPasswordMode] = useState<"login" | "signup">("login");
  const [passwordName, setPasswordName] = useState("");
  const [passwordEmail, setPasswordEmail] = useState("");
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

  const loginWithEmailMutation = trpc.auth.loginWithEmail.useMutation({
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

  const sendEmailOtpMutation = trpc.sms.sendEmailOtp.useMutation({
    onSuccess: () => { setEmailOtpSent(true); setError(""); },
    onError: (e) => setError(e.message),
  });

  const verifyEmailOtpMutation = trpc.sms.verifyEmailOtp.useMutation({
    onSuccess: () => {
      setEmailOtpVerified(true);
      setError("");
      loginWithEmailMutation.mutate({ email: email.trim().toLowerCase(), name: emailName.trim() || undefined });
    },
    onError: (e) => setError(e.message),
  });

  useEffect(() => {
    if (phoneVerified) loginWithPhoneMutation.mutate({ phone });
  }, [phoneVerified]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  const handlePasswordSubmit = () => {
    setError("");
    if (passwordMode === "login") {
      loginMutation.mutate({ email: passwordEmail, password });
    } else {
      if (!passwordName.trim()) { setError("Please enter your name."); return; }
      signupMutation.mutate({ name: passwordName, email: passwordEmail, password });
    }
  };

  const isPending = loginWithPhoneMutation.isPending || loginWithEmailMutation.isPending ||
    loginMutation.isPending || signupMutation.isPending ||
    sendEmailOtpMutation.isPending || verifyEmailOtpMutation.isPending;

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
          <CardContent className="p-5 sm:p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Car className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold font-['DM_Serif_Display']">Login / Sign Up</h1>
              <p className="text-sm text-muted-foreground mt-1">Verify your identity to continue</p>
            </div>

            {showPasswordForm ? (
              <div className="space-y-4">
                {passwordMode === "signup" && (
                  <div className="space-y-1.5">
                    <Label>Full Name</Label>
                    <Input value={passwordName} onChange={(e) => setPasswordName(e.target.value)} placeholder="Enter your full name" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Email Address</Label>
                  <Input type="email" value={passwordEmail} onChange={(e) => setPasswordEmail(e.target.value)} placeholder="your@email.com" onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()} />
                </div>
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={passwordMode === "signup" ? "Minimum 6 characters" : "Enter your password"} className="pr-10" onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {error && <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
                <Button onClick={handlePasswordSubmit} disabled={isPending} className="w-full h-12 text-base">
                  {isPending ? "Please wait..." : passwordMode === "login" ? "Sign In" : "Create Account"}
                </Button>
                <div className="text-center text-sm text-muted-foreground">
                  {passwordMode === "login" ? (
                    <>Don't have an account?{" "}
                      <button onClick={() => { setPasswordMode("signup"); setError(""); }} className="text-primary font-medium hover:underline">Sign up</button>
                    </>
                  ) : (
                    <>Already have an account?{" "}
                      <button onClick={() => { setPasswordMode("login"); setError(""); }} className="text-primary font-medium hover:underline">Sign in</button>
                    </>
                  )}
                </div>
                <button onClick={() => { setShowPasswordForm(false); setError(""); }} className="w-full text-sm text-primary hover:underline text-center">
                  ← Back to OTP login
                </button>
              </div>
            ) : (
              <>
                {/* Tab switcher */}
                <div className="flex rounded-xl bg-slate-100 p-1 mb-5">
                  <button
                    onClick={() => { setTab("phone"); setError(""); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${tab === "phone" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    <Phone className="w-4 h-4" /> Phone OTP
                  </button>
                  <button
                    onClick={() => { setTab("email"); setError(""); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${tab === "email" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    <Mail className="w-4 h-4" /> Email OTP
                  </button>
                </div>

                {tab === "phone" ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Mobile Number</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium select-none">+91</span>
                        <Input type="tel" inputMode="numeric" value={phone}
                          onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setPhoneVerified(false); }}
                          placeholder="10-digit mobile number" className="pl-12 h-12 text-base tracking-wide"
                          disabled={phoneVerified} autoFocus />
                      </div>
                    </div>
                    {phone.length === 10 ? (
                      <FirebaseOTP phone={phone} onVerified={() => setPhoneVerified(true)} onError={(msg) => setError(msg)} />
                    ) : (
                      <p className="text-xs text-slate-400">Enter your 10-digit number above to receive OTP</p>
                    )}
                    {error && <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
                    {isPending && (
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-1">
                        <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                        Signing you in...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Your Name</Label>
                      <Input value={emailName} onChange={(e) => setEmailName(e.target.value)} placeholder="Full name (optional)" disabled={emailOtpVerified} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email Address</Label>
                      <Input type="email" value={email}
                        onChange={(e) => { setEmail(e.target.value); setEmailOtpSent(false); setEmailOtpInput(""); setEmailOtpVerified(false); }}
                        placeholder="your@email.com" disabled={emailOtpSent} autoFocus={tab === "email"} />
                    </div>
                    {!emailOtpSent ? (
                      <Button onClick={() => { setError(""); sendEmailOtpMutation.mutate({ email: email.trim() }); }}
                        disabled={isPending || !email.includes("@")} className="w-full h-12 text-base">
                        {isPending ? "Sending…" : "Send OTP to Email"}
                      </Button>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <Label>6-Digit OTP</Label>
                          <Input inputMode="numeric" maxLength={6} value={emailOtpInput}
                            onChange={(e) => setEmailOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            placeholder="Enter the code from your email"
                            disabled={emailOtpVerified} autoFocus />
                          <p className="text-xs text-slate-400">
                            OTP sent to {email}.{" "}
                            <button onClick={() => { setEmailOtpSent(false); setEmailOtpInput(""); setError(""); }} className="text-primary hover:underline">Resend</button>
                          </p>
                        </div>
                        <Button onClick={() => { setError(""); verifyEmailOtpMutation.mutate({ email: email.trim().toLowerCase(), otp: emailOtpInput }); }}
                          disabled={isPending || emailOtpInput.length !== 6 || emailOtpVerified} className="w-full h-12 text-base">
                          {isPending ? "Verifying…" : "Verify & Sign In"}
                        </Button>
                      </>
                    )}
                    {error && <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
                  </div>
                )}

                <div className="relative flex items-center gap-3 py-2 mt-2">
                  <div className="flex-1 border-t border-muted" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="flex-1 border-t border-muted" />
                </div>
                <button onClick={() => { setShowPasswordForm(true); setError(""); }} className="w-full text-sm text-muted-foreground hover:text-foreground text-center py-1 transition-colors">
                  Sign in with email &amp; password
                </button>
              </>
            )}

            <div className="mt-6 pt-6 border-t">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
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
