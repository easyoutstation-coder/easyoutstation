import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useSeo } from '@/hooks/useSeo'
import { trpc } from '@/providers/trpc'
import { Phone, MessageCircle, Check, ChevronDown, ArrowRight, Star } from 'lucide-react'
import { ROUTES } from '@/data/routes'

// ── Types ──────────────────────────────────────────────────────────────────────

type Car = {
  id: number
  name: string
  category: string
  seats: number
  pricePerKm: string
  driverCharges?: string | null
  imageUrl: string
  rating?: string | null
  isAvailable?: boolean | null
}

// ── Constants ──────────────────────────────────────────────────────────────────

const FALLBACK_CARS: Car[] = [
  { id: 1, name: "Swift Dzire", category: "sedan", seats: 5, pricePerKm: "13.00", driverCharges: "250.00", imageUrl: "/cars/swift-dzire.jpg", rating: "4.5" },
  { id: 4, name: "Maruti Ertiga", category: "muv", seats: 6, pricePerKm: "15.00", driverCharges: "250.00", imageUrl: "/cars/maruti-ertiga.jpg", rating: "4.7" },
  { id: 5, name: "Toyota Innova", category: "muv", seats: 6, pricePerKm: "19.00", driverCharges: "250.00", imageUrl: "/cars/toyota-innova.jpg", rating: "4.8" },
  { id: 6, name: "Toyota Innova Crysta", category: "premium", seats: 6, pricePerKm: "20.00", driverCharges: "250.00", imageUrl: "/cars/toyota-innova-crysta.jpg", rating: "4.9" },
  { id: 8, name: "Toyota Innova Hycross", category: "luxury", seats: 6, pricePerKm: "22.00", driverCharges: "250.00", imageUrl: "/cars/toyota-innova-hycross.jpg", rating: "4.95" },
]

const WA_NUMBER = "918796564111"

// ── Helpers ────────────────────────────────────────────────────────────────────

function calcFare(pricePerKm: string, distance: number, isRoundTrip: boolean, driverCharges = "250"): number {
  const rate = parseFloat(pricePerKm)
  const dc = parseFloat(driverCharges || "250")
  const billedKm = Math.max(distance, 80)
  return isRoundTrip
    ? Math.round(rate * billedKm * 2 + dc * 2)
    : Math.round(rate * billedKm * 1.25 + dc)
}

function track(event: string, params?: Record<string, unknown>) {
  try {
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', event, params)
    }
    if (Array.isArray((window as any).dataLayer)) {
      (window as any).dataLayer.push({ event, ...params })
    }
  } catch {}
}

function getTomorrow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function GoLanding() {
  const { route } = useParams<{ route: string }>()
  const navigate = useNavigate()
  const data = ROUTES[route ?? '']

  // gclid + UTM capture on mount
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search)
      const gclid = p.get('gclid')
      if (gclid) sessionStorage.setItem('eo_gclid', gclid)
      ;(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const).forEach(k => {
        const v = p.get(k); if (v) sessionStorage.setItem(k, v)
      })
    } catch {}
  }, [])

  // Trip type from ?tt= URL param (roundtrip | oneway)
  const [isRoundTrip, setIsRoundTrip] = useState(() => {
    try { return new URLSearchParams(window.location.search).get('tt') === 'roundtrip' }
    catch { return false }
  })

  const [expandedCar, setExpandedCar] = useState<number | null>(null)
  const [formDate, setFormDate] = useState(getTomorrow)
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [faqOpen, setFaqOpen] = useState<number | null>(null)
  const expandRef = useRef<HTMLDivElement>(null)

  const { data: liveCars } = trpc.car.list.useQuery(undefined, { staleTime: 5 * 60 * 1000 })

  useSeo({
    title: data
      ? `${data.from} to ${data.to} Cab — Book Direct from ₹${data.fare.min.toLocaleString('en-IN')} | EasyOutstation`
      : 'EasyOutstation — Outstation Cabs',
    description: data?.description ?? 'Book outstation cabs from Delhi at fixed fares.',
    noindex: true,
  })

  // lp_view on mount
  useEffect(() => {
    if (data) track('lp_view', { route, from: data.from, to: data.to })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!data) {
    navigate('/routes')
    return null
  }

  const displayCars: Car[] = ((liveCars as Car[] | undefined) ?? FALLBACK_CARS)
    .filter(c => c.isAvailable !== false && !['tempo', 'bus'].includes(c.category))
    .sort((a, b) => parseFloat(a.pricePerKm) - parseFloat(b.pricePerKm))

  const cheapestCar = displayCars[0]
  const cheapestFare = cheapestCar
    ? calcFare(cheapestCar.pricePerKm, data.distance, isRoundTrip, cheapestCar.driverCharges ?? '250')
    : data.fare.min

  const waText = encodeURIComponent(`Hi, I want to book a ${data.from} to ${data.to} cab. Can you help me?`)
  const waUrl = `https://wa.me/${WA_NUMBER}?text=${waText}`

  function handleSelectCar(carId: number) {
    const car = displayCars.find(c => c.id === carId)
    if (!car) return
    track('lp_select_car', { car_id: carId, car_name: car.name, route, trip_type: isRoundTrip ? 'round_trip' : 'one_way' })
    setExpandedCar(prev => prev === carId ? null : carId)
    setFormName('')
    setFormPhone('')
    setFormDate(getTomorrow())
    setTimeout(() => expandRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80)
  }

  function handleBookingSubmit(car: Car) {
    if (!formDate || formPhone.length < 10) return
    const fare = calcFare(car.pricePerKm, data.distance, isRoundTrip, car.driverCharges ?? '250')
    track('lp_booking_submit', {
      car_id: car.id, car_name: car.name, route,
      trip_type: isRoundTrip ? 'round_trip' : 'one_way',
      fare,
    })
    const params = new URLSearchParams({
      carId: String(car.id),
      from: data.from,
      to: data.to,
      distance: String(data.distance),
      tripType: isRoundTrip ? 'round_trip' : 'one_way',
      date: formDate,
    })
    navigate(`/booking?${params}`)
  }

  const microFaqs = data.faqs.slice(0, 3)

  return (
    <div className="min-h-screen bg-white">
      {/* ── Slim header ────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-100 h-12 flex items-center justify-between px-4">
        <a href="/" className="flex items-center gap-2" aria-label="EasyOutstation home">
          <img src="/logo-icon.png" alt="EasyOutstation" className="h-7 w-auto" />
          <span className="font-bold text-slate-900 text-sm hidden sm:inline">EasyOutstation</span>
        </a>
        <a
          href="tel:+918796564111"
          onClick={() => track('lp_call_click', { route })}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full"
        >
          <Phone className="w-3 h-3" />
          Call to Book
        </a>
      </header>

      <main className="pt-12">
        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="bg-slate-900 px-4 pt-8 pb-6">
          <p className="text-slate-400 text-xs mb-2 font-medium">
            {data.from} → {data.to} · {data.distance} km · {data.duration}
          </p>
          <h1 className="font-['DM_Serif_Display'] text-2xl sm:text-3xl mb-2 leading-tight" style={{ color: 'white' }}>
            {data.from} to {data.to} Cab
          </h1>
          <p className="text-blue-300 text-sm mb-4">
            From{' '}
            <span className="text-white font-bold text-xl">
              ₹{cheapestFare.toLocaleString('en-IN')}
            </span>
            {' '}· Fixed fare · No hidden charges
          </p>

          {/* Trip type toggle */}
          <div className="inline-flex bg-slate-800 rounded-xl p-1 gap-1">
            <button
              onClick={() => setIsRoundTrip(false)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                !isRoundTrip
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              One Way
            </button>
            <button
              onClick={() => setIsRoundTrip(true)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                isRoundTrip
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Round Trip
            </button>
          </div>
        </section>

        {/* ── Fleet cards ─────────────────────────────────────────────────── */}
        <section id="fleet-section" className="px-4 py-5 space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Select your car
          </h2>
          {displayCars.map(car => {
            const fare = calcFare(car.pricePerKm, data.distance, isRoundTrip, car.driverCharges ?? '250')
            const isExpanded = expandedCar === car.id
            return (
              <div
                key={car.id}
                className={`rounded-2xl border transition-all ${
                  isExpanded
                    ? 'border-blue-400 shadow-md shadow-blue-100'
                    : 'border-slate-200'
                }`}
              >
                {/* Card header */}
                <button
                  className="w-full flex items-center gap-3 p-4 text-left"
                  onClick={() => handleSelectCar(car.id)}
                >
                  <img
                    src={car.imageUrl}
                    alt={car.name}
                    className="w-20 h-14 object-contain rounded-lg bg-slate-50 shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/cars/swift-dzire.jpg' }}
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 text-sm">{car.name}</span>
                      {car.rating && (
                        <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-medium">
                          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                          {car.rating}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {car.seats} seater · ₹{parseFloat(car.pricePerKm)}/km
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-bold text-blue-700 text-base leading-tight">
                      ₹{fare.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {isRoundTrip ? 'round trip' : 'one way'}
                    </div>
                    <div className={`text-[10px] font-semibold mt-1 transition-colors ${isExpanded ? 'text-blue-600' : 'text-slate-400'}`}>
                      {isExpanded ? 'Close ✕' : 'Select →'}
                    </div>
                  </div>
                </button>

                {/* Inline booking panel */}
                {isExpanded && (
                  <div ref={expandRef} className="border-t border-slate-100 p-4 bg-blue-50/50">
                    <p className="text-xs font-semibold text-slate-700 mb-3">
                      Confirm details to continue booking
                    </p>
                    <div className="space-y-2.5">
                      <input
                        type="date"
                        value={formDate}
                        min={getTomorrow()}
                        onChange={e => setFormDate(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Your name"
                        value={formName}
                        onChange={e => setFormName(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="tel"
                        inputMode="numeric"
                        placeholder="10-digit mobile number"
                        value={formPhone}
                        maxLength={10}
                        onChange={e => setFormPhone(e.target.value.replace(/\D/g, ''))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={() => handleBookingSubmit(car)}
                        disabled={!formDate || formPhone.length < 10}
                        className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                      >
                        Continue to book {car.name}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <p className="text-[10px] text-slate-400 text-center">
                        Pay just 10% (₹{Math.round(fare * 0.1).toLocaleString('en-IN')}) to confirm · Balance on trip day
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </section>

        {/* ── Trust row ───────────────────────────────────────────────────── */}
        <section className="bg-green-50 border-y border-green-100 px-4 py-4">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              'Verified drivers',
              'Fixed fare guarantee',
              'Pay only 10% advance',
              '★ 4.9 · 500+ trips',
            ].map(item => (
              <div key={item} className="flex items-center gap-2 text-green-800 text-xs font-medium">
                <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </section>

        {/* ── Micro FAQ ───────────────────────────────────────────────────── */}
        <section className="px-4 py-6">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Quick answers</h2>
          <div className="space-y-2">
            {microFaqs.map((faq, i) => (
              <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                  onClick={() => setFaqOpen(prev => prev === i ? null : i)}
                >
                  <span className="text-sm font-medium text-slate-900 leading-snug">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      faqOpen === i ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {faqOpen === i && (
                  <div className="px-4 pb-3 pt-2 text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── WhatsApp CTA ────────────────────────────────────────────────── */}
        <section className="px-4 pb-8" data-wa-cta-section>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('lp_whatsapp_click', { route })}
            className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white font-semibold py-4 rounded-2xl text-sm shadow-lg shadow-green-200 active:scale-[0.98] transition-transform"
          >
            <MessageCircle className="w-5 h-5" />
            Book on WhatsApp
          </a>
          <p className="text-center text-xs text-slate-400 mt-2">Our team responds in &lt; 5 minutes</p>
        </section>

        {/* ── Slim footer ─────────────────────────────────────────────────── */}
        <footer className="border-t border-slate-100 px-4 py-4 pb-28">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">© EasyOutstation · easyoutstation.com</p>
            <div className="flex gap-3">
              <a href="/terms" className="text-xs text-slate-400 hover:text-slate-600">Terms</a>
              <a href="/privacy" className="text-xs text-slate-400 hover:text-slate-600">Privacy</a>
            </div>
          </div>
        </footer>
      </main>

      {/* ── Sticky bottom bar ───────────────────────────────────────────── */}
      {cheapestCar && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.10)]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-500 leading-tight truncate">
                Best price · {cheapestCar.name}
              </div>
              <div className="font-bold text-slate-900 text-base leading-tight">
                ₹{cheapestFare.toLocaleString('en-IN')}
              </div>
            </div>
            <button
              onClick={() => {
                handleSelectCar(cheapestCar.id)
                const el = document.getElementById('fleet-section')
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className="shrink-0 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-xl px-5 transition-colors"
              style={{ minHeight: 48, whiteSpace: 'nowrap' }}
            >
              Book Now <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
