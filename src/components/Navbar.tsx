import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, User, LogOut, Car, ChevronDown, History, LayoutDashboard, MessageCircle } from "lucide-react";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Our Fleet", href: "/cars" },
  { label: "Routes", href: "/routes" },
  { label: "About", href: "/about" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? "bg-[#0B0B0B]/95 backdrop-blur-md border-b border-[#2A2A2A] shadow-xl" : "bg-transparent"
    }`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 lg:h-20 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37] flex items-center justify-center transition-all group-hover:bg-[#E8CA5A]">
              <Car className="w-5 h-5 text-[#0B0B0B]" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-none text-white font-['Playfair_Display'] tracking-tight">
                EasyOutstation
              </span>
              <span className="text-[10px] leading-none uppercase tracking-widest text-[#D4AF37] mt-0.5">
                Premium Cab Service
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="text-sm font-medium text-[#BFBFBF] hover:text-[#D4AF37] transition-colors duration-200 relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#D4AF37] group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
          </nav>

          {/* Right */}
          <div className="hidden lg:flex items-center gap-3">
            <a
              href="https://wa.me/917011911252?text=Hi%2C%20I%20want%20to%20book%20a%20cab"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#25D366]/40 text-[#25D366] text-sm font-medium hover:bg-[#25D366]/10 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>

            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 text-white hover:text-[#D4AF37] hover:bg-white/5">
                    <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-[#D4AF37]" />
                    </div>
                    <span className="text-sm">{user?.name?.split(" ")[0]}</span>
                    <ChevronDown className="w-4 h-4 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-[#1C1C1C] border-[#2A2A2A]">
                  <DropdownMenuItem onClick={() => navigate("/dashboard")} className="text-white hover:text-[#D4AF37] hover:bg-white/5 cursor-pointer">
                    <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard")} className="text-white hover:text-[#D4AF37] hover:bg-white/5 cursor-pointer">
                    <History className="w-4 h-4 mr-2" /> My Bookings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#2A2A2A]" />
                  <DropdownMenuItem onClick={logout} className="text-red-400 hover:text-red-300 hover:bg-red-500/5 cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => navigate("/login")} className="bg-[#D4AF37] hover:bg-[#E8CA5A] text-[#0B0B0B] font-semibold px-5 transition-all hover:shadow-[0_4px_15px_rgba(212,175,55,0.3)]">
                Sign In
              </Button>
            )}
          </div>

          {/* Mobile */}
          <div className="flex lg:hidden items-center gap-2">
            <a href="https://wa.me/917011911252?text=Hi%2C%20I%20want%20to%20book%20a%20cab" target="_blank" rel="noopener noreferrer"
              className="w-9 h-9 rounded-lg bg-[#25D366]/10 flex items-center justify-center text-[#25D366]">
              <MessageCircle className="w-4 h-4" />
            </a>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-[#0B0B0B] border-[#2A2A2A] w-72">
                <SheetTitle className="text-white font-['Playfair_Display']">EasyOutstation</SheetTitle>
                <nav className="mt-8 flex flex-col gap-1">
                  {navLinks.map((link) => (
                    <Link key={link.href} to={link.href} onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#BFBFBF] hover:text-[#D4AF37] hover:bg-white/5 transition-all text-sm font-medium">
                      {link.label}
                    </Link>
                  ))}
                </nav>
                <div className="mt-6 pt-6 border-t border-[#2A2A2A] space-y-3">
                  {isAuthenticated ? (
                    <>
                      <Button onClick={() => { navigate("/dashboard"); setMobileOpen(false); }}
                        className="w-full bg-[#D4AF37] hover:bg-[#E8CA5A] text-[#0B0B0B] font-semibold">
                        My Dashboard
                      </Button>
                      <Button variant="ghost" onClick={logout} className="w-full text-red-400 hover:bg-red-500/10">
                        Logout
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => { navigate("/login"); setMobileOpen(false); }}
                      className="w-full bg-[#D4AF37] hover:bg-[#E8CA5A] text-[#0B0B0B] font-semibold">
                      Sign In
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
