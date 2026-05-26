import { Routes, Route, useLocation } from 'react-router'
import { useEffect } from 'react'
import Home from './pages/Home'
import Cars from './pages/Cars'
import CarDetail from './pages/CarDetail'
import Booking from './pages/Booking'
import BookingDetail from './pages/BookingDetail'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import About from './pages/About'
import FAQ from './pages/FAQ'
import CancellationPolicy from './pages/CancellationPolicy'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import RoutesPage from './pages/Routes'
import RouteLanding from './pages/RouteLanding'
import NotFound from './pages/NotFound'
import Admin from './pages/Admin'
import ExecutiveTeam from './pages/ExecutiveTeam'
import ReferralProgram from './pages/ReferralProgram'
import { trpc } from './providers/trpc'
import { useAuth } from './hooks/useAuth'
import { usePushNotifications } from './hooks/usePushNotifications'
import NotificationBanner from './components/NotificationBanner'
import { Phone, Mail, Clock, WifiOff } from 'lucide-react'

function MaintenancePage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-900/40">
          <span className="text-3xl">🚗</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-3 font-['DM_Serif_Display']">
          We'll be back soon
        </h1>
        <p className="text-slate-400 text-lg mb-8 leading-relaxed">
          EasyOutstation is undergoing a quick update. We'll be live again shortly — thank you for your patience!
        </p>
        <div className="bg-slate-800 rounded-2xl p-6 space-y-3 text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Need immediate help?</p>
          <a href="tel:+918796564111" className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors">
            <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <Phone className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-sm">+91 87965 64111</span>
          </a>
          <a href="https://wa.me/918796564111" className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors">
            <div className="w-8 h-8 bg-green-600/20 rounded-lg flex items-center justify-center">
              <span className="text-sm">💬</span>
            </div>
            <span className="text-sm">WhatsApp us</span>
          </a>
          <a href="mailto:parmindersinghtalwar@gmail.com" className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors">
            <div className="w-8 h-8 bg-slate-600/40 rounded-lg flex items-center justify-center">
              <Mail className="w-4 h-4 text-slate-400" />
            </div>
            <span className="text-sm">parmindersinghtalwar@gmail.com</span>
          </a>
        </div>
        <div className="flex items-center justify-center gap-2 mt-6 text-slate-600 text-xs">
          <Clock className="w-3 h-3" />
          <span>Usually back within a few minutes</span>
        </div>
        <a href="/login?redirect=/admin" className="block mt-6 text-slate-700 text-xs hover:text-slate-400 transition-colors">
          Admin login →
        </a>
      </div>
    </div>
  )
}

function SiteGate({ children }: { children: React.ReactNode }) {
  const { data, isLoading: statusLoading } = trpc.admin.getSiteStatus.useQuery(undefined, {
    staleTime: 0,
    refetchInterval: 15_000,
    retry: false,
  })
  const { user, isLoading: authLoading } = useAuth()
  const { state: notifState, enable: enableNotif, dismiss: dismissNotif } = usePushNotifications(!!user)
  const { pathname } = useLocation()

  // Scroll to top on every page navigation
  useEffect(() => { window.scrollTo(0, 0); }, [pathname])

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const isOffline = data?.online === false
  // Always let /login and /admin through so admins can log in and toggle the switch
  const isAdminPath = pathname === '/login' || pathname.startsWith('/admin')

  // Wait for BOTH status AND auth to finish loading before deciding — avoids
  // race where getSiteStatus resolves first, user is null, and admin gets bounced
  const bothLoaded = !statusLoading && !authLoading
  if (bothLoaded && !isAdmin && isOffline && !isAdminPath) return <MaintenancePage />

  // Admins always see the site, but get a warning banner when offline
  return (
    <>
      {isAdmin && isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white text-center py-2 px-4 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg">
          <WifiOff className="w-4 h-4 shrink-0" />
          Site is OFFLINE — visitors see the maintenance page. Go to{' '}
          <a href="/admin" className="underline font-bold">Admin Panel</a>{' '}
          to bring it back live.
        </div>
      )}
      <div className={isAdmin && isOffline ? 'pt-9' : ''}>
        {children}
      </div>
      <NotificationBanner state={notifState} onEnable={enableNotif} onDismiss={dismissNotif} />
    </>
  )
}

export default function App() {
  return (
    <SiteGate>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cars" element={<Cars />} />
        <Route path="/cars/:id" element={<CarDetail />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/booking/:id" element={<BookingDetail />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/about" element={<About />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/cancellation" element={<CancellationPolicy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/routes" element={<RoutesPage />} />
        <Route path="/cab/:route" element={<RouteLanding />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/executive-team" element={<ExecutiveTeam />} />
        <Route path="/referral" element={<ReferralProgram />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </SiteGate>
  )
}
