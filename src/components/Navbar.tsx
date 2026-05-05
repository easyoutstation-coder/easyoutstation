import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, User, LogOut, Car, ChevronDown, History, LayoutDashboard } from "lucide-react";

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
  const location = useLocation();

  // Only use transparent navbar on homepage
  const isHome = location.pathname === "/";
  // Navbar is "light" (white bg, dark text) when scrolled OR not on homepage
  const isLight = scrolled || !isHome;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isLight
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
              <span className={`font-bold text-lg leading-none font-['Playfair_Display'] tracking-tight transition-colors ${isLight ? "text-slate-900" : "text-white"}`}>
                EasyOutstation
              </span>
              <span className={`text-[10px] leading-none uppercase tracking-widest mt-0.5 transition-colors ${isLight ? "text-blue-700" : "text-blue-200"}`}>
                Premium Cab Service
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link key={link.href} to={link.href}
                className={`text-sm font-medium transition-colors duration-200 hover:text-blue-600 ${
                  isLight ? "text-slate-600" : "text-white/90"
                } ${location.pathname === link.href ? (isLight ? "text-blue-700 font-semibold" : "text-white font-semibold") : ""}`}>
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right */}
          <div className="hidden lg:flex items-center gap-3">

            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className={`flex items-center gap-2 ${isLight ? "text-slate-700 hover:bg-slate-100" : "text-white hover:bg-white/10"}`}>
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-700" />
                    </div>
                    <span className="text-sm">{user?.name?.split(" ")[0]}</span>
                    <ChevronDown className="w-4 h-4 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white border-slate-200">
                  <DropdownMenuItem onClick={() => navigate("/dashboard")} className="cursor-pointer text-slate-700 hover:text-blue-700">
                    <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard")} className="cursor-pointer text-slate-700 hover:text-blue-700">
                    <History className="w-4 h-4 mr-2" /> My Bookings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-100" />
                  <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer hover:bg-red-50">
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
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon"
                  className={isLight ? "text-slate-700 hover:bg-slate-100" : "text-white hover:bg-white/10"}>
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-white border-slate-200 w-72">
                <SheetTitle className="text-slate-900 font-['Playfair_Display']">EasyOutstation</SheetTitle>
                <nav className="mt-8 flex flex-col gap-1">
                  {navLinks.map((link) => (
                    <Link key={link.href} to={link.href} onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all hover:bg-blue-50 hover:text-blue-700 ${
                        location.pathname === link.href ? "bg-blue-50 text-blue-700" : "text-slate-600"
                      }`}>
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
