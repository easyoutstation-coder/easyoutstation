import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, User, LogOut, Car, ChevronDown, History, LayoutDashboard, ShieldCheck } from "lucide-react";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Our Fleet", href: "/cars" },
  { label: "Routes", href: "/routes" },
  { label: "About", href: "/about" },
  { label: "For Business", href: "/#corporate" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-[#1e3a5f] border-b border-blue-900/40 ${
      scrolled ? "shadow-xl shadow-blue-950/40" : "shadow-md shadow-blue-950/20"
    }`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 lg:h-18 items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center transition-all group-hover:bg-blue-500 shadow-sm shadow-blue-900/50">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-none font-['DM_Serif_Display'] tracking-tight text-white">
                EasyOutstation
              </span>
              <span className="text-[10px] leading-none uppercase tracking-widest mt-0.5 text-blue-300">
                Premium Cab Service
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-7">
            {navLinks.map((link) => {
              const isCorporate = link.href === "/#corporate";
              const isActive = location.pathname === link.href;
              const cls = `text-sm font-medium transition-colors duration-200 text-blue-100 hover:text-white ${
                isActive ? "text-white font-semibold border-b-2 border-blue-400 pb-0.5" : ""
              }`;
              if (isCorporate) {
                return (
                  <a key={link.href} href={link.href} className={cls}
                    onClick={(e) => { e.preventDefault(); document.getElementById("corporate")?.scrollIntoView({ behavior: "smooth" }); }}>
                    {link.label}
                  </a>
                );
              }
              return <Link key={link.href} to={link.href} className={cls}>{link.label}</Link>;
            })}
          </nav>

          {/* Right */}
          <div className="hidden lg:flex items-center gap-3">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 text-white hover:bg-blue-800/60 hover:text-white border border-blue-700/50 hover:border-blue-600">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm">{user?.name?.split(" ")[0] || "Guest"}</span>
                    <ChevronDown className="w-4 h-4 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white border-slate-200">
                  <DropdownMenuItem onClick={() => navigate("/dashboard")} className="cursor-pointer text-slate-700 hover:text-blue-700">
                    <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard")} className="cursor-pointer text-slate-700 hover:text-blue-700">
                    <History className="w-4 h-4 mr-2" /> My Bookings
                  </DropdownMenuItem>
                  {(user?.role === "admin" || user?.role === "super_admin") && (
                    <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer text-purple-700 hover:text-purple-800">
                      <ShieldCheck className="w-4 h-4 mr-2" /> Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-slate-100" />
                  <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer hover:bg-red-50">
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => navigate("/login")}
                className="bg-blue-500 hover:bg-blue-400 text-white font-semibold px-5 shadow-sm shadow-blue-900/50 border border-blue-400/30">
                Sign In
              </Button>
            )}
          </div>

          {/* Mobile */}
          <div className="flex lg:hidden items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-blue-800/60">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-[#1e3a5f] border-blue-900 w-72 p-0">
                <div className="px-6 py-5 border-b border-blue-800/60 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
                    <Car className="w-4 h-4 text-white" />
                  </div>
                  <SheetTitle className="text-white font-['DM_Serif_Display'] text-lg m-0">EasyOutstation</SheetTitle>
                </div>
                <nav className="px-4 py-4 flex flex-col gap-1">
                  {navLinks.map((link) => {
                    const isCorporate = link.href === "/#corporate";
                    const isActive = location.pathname === link.href;
                    const cls = `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-blue-700/60 text-white"
                        : "text-blue-100 hover:bg-blue-800/60 hover:text-white"
                    }`;
                    if (isCorporate) {
                      return (
                        <a key={link.href} href={link.href} className={cls}
                          onClick={(e) => { e.preventDefault(); setMobileOpen(false); document.getElementById("corporate")?.scrollIntoView({ behavior: "smooth" }); }}>
                          {link.label}
                        </a>
                      );
                    }
                    return (
                      <Link key={link.href} to={link.href} onClick={() => setMobileOpen(false)} className={cls}>
                        {link.label}
                      </Link>
                    );
                  })}
                </nav>
                <div className="px-4 pt-2 pb-6 border-t border-blue-800/60 space-y-3 mt-2">
                  {isAuthenticated ? (
                    <>
                      <Button onClick={() => { navigate("/dashboard"); setMobileOpen(false); }}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold">
                        My Dashboard
                      </Button>
                      {(user?.role === "admin" || user?.role === "super_admin") && (
                        <Button variant="outline" onClick={() => { navigate("/admin"); setMobileOpen(false); }}
                          className="w-full border-purple-400/50 text-purple-200 hover:bg-purple-900/30 hover:text-purple-100">
                          Admin Panel
                        </Button>
                      )}
                      <Button variant="ghost" onClick={logout} className="w-full text-red-300 hover:bg-red-900/30 hover:text-red-200">
                        Logout
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => { navigate("/login"); setMobileOpen(false); }}
                      className="w-full bg-blue-500 hover:bg-blue-400 text-white font-semibold">
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
