import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Menu, User, LogOut, ChevronDown, History, LayoutDashboard, ShieldCheck } from "lucide-react";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Our Fleet", href: "/cars" },
  { label: "Routes", href: "/routes" },
  { label: "About", href: "/about" },
  { label: "Corporate Enquiries", href: "/corporate" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed top-0 inset-x-0 z-50 flex justify-center px-4 pointer-events-none" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
      <div className={`pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-full w-full max-w-5xl transition-all duration-300 bg-[#1e3a5f] ${
        scrolled
          ? "shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.13),inset_0_-1px_0_rgba(0,0,0,0.15)]"
          : "shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-1px_0_rgba(0,0,0,0.08)]"
      }`}>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0 pl-1 group">
          <img
            src="/logo-icon.png"
            alt="EasyOutstation"
            className="h-10 w-auto object-contain"
            style={{ mixBlendMode: "screen" }}
            loading="eager"
          />
          <span className="font-bold text-[15px] leading-none font-['Montserrat'] text-white whitespace-nowrap" style={{ marginTop: '4px' }}>
            EasyOutstation
          </span>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Desktop Nav links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.href;
            const cls = `text-sm font-medium px-3.5 py-1.5 rounded-full transition-all duration-200 ${
              isActive
                ? "bg-white/15 text-white"
                : "text-blue-100/90 hover:bg-white/10 hover:text-white"
            }`;
            return <Link key={link.href} to={link.href} className={cls}>{link.label}</Link>;
          })}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden lg:flex items-center gap-2 pl-1 pr-1">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white hover:bg-white/10 transition-all text-sm font-medium">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span>{user?.name?.split(" ")[0] || "Account"}</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white border-slate-200 mt-2">
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
            <Button
              onClick={() => navigate("/login")}
              className="rounded-full bg-white text-[#1e3a5f] hover:bg-blue-50 font-semibold px-5 h-8 text-sm shadow-none border-0"
            >
              Sign In
            </Button>
          )}
        </div>

        {/* Mobile: hamburger */}
        <div className="flex lg:hidden items-center pr-1">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-all">
                <Menu className="w-4 h-4" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-[#1e3a5f] border-blue-900/60 w-72 p-0">
              <div className="px-6 py-5 border-b border-blue-800/50 flex items-center gap-2.5">
                <img
                  src="/logo-icon.png"
                  alt="EasyOutstation"
                  className="h-12 w-auto object-contain"
                  style={{ mixBlendMode: "screen" }}
                  loading="eager"
                />
                <SheetTitle className="text-white font-['Montserrat'] font-bold text-lg m-0" style={{ marginTop: '4px' }}>EasyOutstation</SheetTitle>
              </div>
              <nav className="px-4 py-4 flex flex-col gap-1">
                {navLinks.map((link) => {
                  const isActive = location.pathname === link.href;
                  const cls = `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive ? "bg-white/15 text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"
                  }`;
                  return (
                    <Link key={link.href} to={link.href} onClick={() => setMobileOpen(false)} className={cls}>
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="px-4 pb-6 border-t border-blue-800/50 pt-4 space-y-2.5">
                {isAuthenticated ? (
                  <>
                    <Button onClick={() => { navigate("/dashboard"); setMobileOpen(false); }}
                      className="w-full rounded-full bg-white text-[#1e3a5f] hover:bg-blue-50 font-semibold">
                      My Dashboard
                    </Button>
                    {(user?.role === "admin" || user?.role === "super_admin") && (
                      <Button variant="outline" onClick={() => { navigate("/admin"); setMobileOpen(false); }}
                        className="w-full rounded-full border-purple-400/50 text-purple-200 hover:bg-purple-900/30">
                        Admin Panel
                      </Button>
                    )}
                    <Button variant="ghost" onClick={logout}
                      className="w-full rounded-full text-red-300 hover:bg-red-900/30 hover:text-red-200">
                      Logout
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => { navigate("/login"); setMobileOpen(false); }}
                    className="w-full rounded-full bg-white text-[#1e3a5f] hover:bg-blue-50 font-semibold">
                    Sign In
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

      </div>
    </header>
  );
}
