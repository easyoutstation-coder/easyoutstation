import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Building2, Users, FileText, Headphones,
  ArrowRight, Check, Loader2, X,
} from "lucide-react";

const perks = [
  { icon: FileText, title: "GST Invoices", desc: "Clean invoices for every trip — hassle-free reimbursement." },
  { icon: Users, title: "Employee Transport", desc: "Daily office commutes, airport drops, outstation offsites." },
  { icon: Headphones, title: "Dedicated Manager", desc: "One point of contact for all your fleet requirements." },
  { icon: Building2, title: "Flexible Billing", desc: "Monthly credit accounts available for regular clients." },
];

export default function CorporateSection() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const enquiryMutation = trpc.admin.submitCorporateEnquiry.useMutation({
    onSuccess: () => setDone(true),
    onError: (e) => setError(e.message || "Something went wrong. Please try again."),
  });

  const handleSubmit = () => {
    setError("");
    if (!name.trim() || name.trim().length < 2) { setError("Please enter your full name."); return; }
    if (!phone || phone.length !== 10) { setError("Please enter a valid 10-digit mobile number."); return; }
    if (!company.trim() || company.trim().length < 2) { setError("Please enter your company name."); return; }
    enquiryMutation.mutate({ name: name.trim(), phone, company: company.trim(), teamSize, message: message.trim() || undefined });
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setDone(false); setError("");
      setName(""); setPhone(""); setCompany(""); setTeamSize(""); setMessage("");
    }, 300);
  };

  return (
    <>
      <section className="py-20 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 relative overflow-hidden">
        {/* subtle grid overlay */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "60px 60px" }} />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left — pitch */}
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-400 mb-4">
                <Building2 className="w-3.5 h-3.5" /> For Businesses
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 font-['Playfair_Display'] leading-tight">
                Corporate & Employee<br />
                <span className="text-blue-300">Transport Made Simple</span>
              </h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                From daily office commutes to outstation offsites — we handle your team's travel so you don't have to.
                Fixed pricing, GST invoices, and a dedicated account manager for every corporate client.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {perks.map((p) => (
                  <div key={p.title} className="flex gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center shrink-0">
                      <p.icon className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{p.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{p.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                size="lg"
                onClick={() => setOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 h-12 gap-2 shadow-lg shadow-blue-900/40"
              >
                Get a Corporate Quote <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Right — stats */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "₹250", label: "Driver charge/day", sub: "No hidden fees" },
                { value: "60 min", label: "Driver assigned", sub: "After booking confirmation" },
                { value: "100%", label: "GST invoices", sub: "On every trip" },
                { value: "24/7", label: "Support available", sub: "Dedicated account manager" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl bg-white/5 border border-white/10 p-5 text-center">
                  <div className="text-2xl font-bold text-blue-300 mb-1">{s.value}</div>
                  <div className="text-sm font-semibold text-white">{s.label}</div>
                  <div className="text-xs text-slate-500 mt-1">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Enquiry modal */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-['Playfair_Display'] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" /> Corporate Enquiry
            </DialogTitle>
          </DialogHeader>

          {done ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">Enquiry Received!</h3>
              <p className="text-sm text-slate-500">
                We'll call you on <strong>+91-{phone}</strong> within a few hours to discuss your requirements.
              </p>
              <Button onClick={handleClose} className="mt-2 bg-blue-600 hover:bg-blue-700 text-white w-full">
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-slate-500">
                Fill in your details and we'll get back to you within a few hours with a custom quote.
              </p>

              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>

              <div className="space-y-1.5">
                <Label>Mobile Number *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium">+91</span>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit mobile number"
                    className="pl-12"
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Company Name *</Label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Your company or organisation" />
              </div>

              <div className="space-y-1.5">
                <Label>Team Size <span className="text-xs text-slate-400 font-normal">(optional)</span></Label>
                <select
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-input bg-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  <option value="">Select team size</option>
                  <option value="1–10">1–10 employees</option>
                  <option value="11–50">11–50 employees</option>
                  <option value="51–200">51–200 employees</option>
                  <option value="200+">200+ employees</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Requirement <span className="text-xs text-slate-400 font-normal">(optional)</span></Label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. Daily office pickup from Noida, 10 employees, Mon–Fri..."
                  className="w-full px-3 py-2.5 rounded-xl border border-input bg-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none min-h-[80px] resize-none"
                />
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              <Button
                onClick={handleSubmit}
                disabled={enquiryMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 font-semibold gap-2"
              >
                {enquiryMutation.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                  : <>Submit Enquiry <ArrowRight className="w-4 h-4" /></>}
              </Button>

              <p className="text-xs text-center text-slate-400">
                We'll call you back within a few hours — no spam, ever.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
