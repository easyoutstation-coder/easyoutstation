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
      scrolled
        ? "bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm"
        : "bg-transparent"
    }`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 lg:h-20 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center transition-all group-hover:bg-blue-800">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className={`font-bold text-lg leading-none font-['Playfair_Display'] tracking-tight transition-colors ${scrolled ? "text-slate-900" : "text-white"}`}>
                EasyOutstation
              </span>
              <span className={`text-[10px] leading-none uppercase tracking-widest mt-0.5 transition-colors ${scrolled ? "text-blue-700" : "text-blue-200"}`}>
                Premium Cab Service
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link key={link.href} to={link.href}
                className={`text-sm font-medium transition-colors duration-200 hover:text-blue-700 ${scrolled ? "text-slate-600" : "text-white/90"}`}>
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right */}
          <div className="hidden lg:flex items-center gap-3">
            <a href="https://wa.me/919958556011?text=Hi%2C%20I%20want%20to%20book%20a%20cab"
              target="_blank" rel="noopener noreferrer"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                scrolled
                  ? "text-green-700 hover:bg-green-50 border border-green-200"
                  : "text-white/90 hover:text-white border border-white/20 hover:border-white/40"
              }`}>
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>

            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className={`flex items-center gap-2 ${scrolled ? "text-slate-700 hover:bg-slate-100" : "text-white hover:bg-white/10"}`}>
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-700" />
                    </div>
                    <span className="text-sm">{user?.name?.split(" ")[0]}</span>
                    <ChevronDown className="w-4 h-4 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate("/dashboard")} className="cursor-pointer">
                    <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard")} className="cursor-pointer">
                    <History className="w-4 h-4 mr-2" /> My Bookings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => navigate("/login")}
                className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-5 shadow-sm">
                Sign In
              </Button>
            )}
          </div>

          {/* Mobile */}
          <div className="flex lg:hidden items-center gap-2">
            <a href="https://wa.me/919958556011" target="_blank" rel="noopener noreferrer"
              className="w-9 h-9 rounded-lg bg-green-50 border border-green-200 flex items-center justify-center text-green-700">
              <MessageCircle className="w-4 h-4" />
            </a>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className={scrolled ? "text-slate-700" : "text-white hover:bg-white/10"}>
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-white border-slate-200 w-72">
                <SheetTitle className="text-slate-900 font-['Playfair_Display']">EasyOutstation</SheetTitle>
                <nav className="mt-8 flex flex-col gap-1">
                  {navLinks.map((link) => (
                    <Link key={link.href} to={link.href} onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-all text-sm font-medium">
                      {link.label}
                    </Link>
                  ))}
                </nav>
                <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                  {isAuthenticated ? (
                    <>
                      <Button onClick={() => { navigate("/dashboard"); setMobileOpen(false); }}
                        className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold">
                        My Dashboard
                      </Button>
                      <Button variant="ghost" onClick={logout} className="w-full text-red-600 hover:bg-red-50">
                        Logout
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => { navigate("/login"); setMobileOpen(false); }}
                      className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold">
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
