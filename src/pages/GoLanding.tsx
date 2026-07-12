import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useSeo } from '@/hooks/useSeo'
import { trpc } from '@/providers/trpc'
import { Phone, MessageCircle, Check, ChevronDown, ArrowRight, Star, Shield, Clock, MapPin } from 'lucide-react'
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

  // gclid + UTM capture
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
    track('lp_booking_submit', { car_id: car.id, car_name: car.name, route, trip_type: isRoundTrip ? 'round_trip' : 'one_way', fare })
    const params = new URLSearchParams({
      carId: String(car.id), from: data.from, to: data.to,
      distance: String(data.distance), tripType: isRoundTrip ? 'round_trip' : 'one_way', date: formDate,
    })
    navigate(`/booking?${params}`)
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Slim header ────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100 h-12 flex items-center justify-between px-4">
        <a href="/" className="flex items-center gap-2" aria-label="EasyOutstation home">
          <img src="/logo-icon.png" alt="EasyOutstation" className="h-7 w-auto" />
          <span className="font-bold text-slate-900 text-sm">EasyOutstation</span>
        </a>
        <a
          href="tel:+918796564111"
          onClick={() => track('lp_call_click', { route })}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-3.5 py-2 rounded-full shadow-sm shadow-blue-200"
        >
          <Phone className="w-3 h-3" />
          Call to Book
        </a>
      </header>

      <main className="pt-12">

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section style={{ background: 'linear-gradient(145deg, #0f172a 0%, #1e3a5f 60%, #0f172a 100%)' }} className="px-4 pt-7 pb-6">

          {/* Route breadcrumb */}
          <div className="flex items-center gap-1.5 mb-4">
            <div className="flex items-center gap-1 bg-white/10 rounded-full px-2.5 py-1">
              <MapPin className="w-3 h-3 text-blue-300" />
              <span className="text-[11px] text-blue-200 font-medium">{data.from}</span>
            </div>
            <ArrowRight className="w-3 h-3 text-slate-500" />
            <div className="flex items-center gap-1 bg-white/10 rounded-full px-2.5 py-1">
              <MapPin className="w-3 h-3 text-blue-300" />
              <span className="text-[11px] text-blue-200 font-medium">{data.to}</span>
            </div>
          </div>

          {/* H1 */}
          <h1 className="font-['DM_Serif_Display'] text-[26px] leading-tight mb-1" style={{ color: 'white' }}>
            {data.from} to {data.to} Cab
          </h1>

          {/* Fare hero */}
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-slate-400 text-sm">from</span>
            <span className="text-white font-black text-4xl tracking-tight">
              ₹{cheapestFare.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Route meta pills */}
          <div className="flex gap-2 mb-5 flex-wrap">
            <span className="flex items-center gap-1 bg-white/8 border border-white/10 rounded-full px-2.5 py-1 text-[11px] text-slate-300">
              <Clock className="w-3 h-3 text-slate-400" />
              {data.duration}
            </span>
            <span className="flex items-center gap-1 bg-white/8 border border-white/10 rounded-full px-2.5 py-1 text-[11px] text-slate-300">
              <MapPin className="w-3 h-3 text-slate-400" />
              {data.distance} km
            </span>
            <span className="flex items-center gap-1 bg-white/8 border border-white/10 rounded-full px-2.5 py-1 text-[11px] text-slate-300">
              <Shield className="w-3 h-3 text-green-400" />
              Fixed fare
            </span>
          </div>

          {/* Trip type toggle */}
          <div className="inline-flex bg-white/8 border border-white/10 rounded-2xl p-1 gap-1">
            <button
              onClick={() => setIsRoundTrip(false)}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                !isRoundTrip ? 'bg-blue-600 text-white shadow-lg shadow-blue-900' : 'text-slate-400'
              }`}
            >
              One Way
            </button>
            <button
              onClick={() => setIsRoundTrip(true)}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                isRoundTrip ? 'bg-blue-600 text-white shadow-lg shadow-blue-900' : 'text-slate-400'
              }`}
            >
              Round Trip
            </button>
          </div>
        </section>

        {/* ── Trust strip ─────────────────────────────────────────────────── */}
        <div className="bg-green-600 px-4 py-2.5 flex items-center justify-center gap-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {['Verified drivers', 'Fixed price', '10% advance only', '★ 4.9 rated'].map((t, i) => (
            <span key={i} className="flex items-center gap-1.5 text-white text-[11px] font-semibold whitespace-nowrap shrink-0">
              <Check className="w-3 h-3" />
              {t}
            </span>
          ))}
        </div>

        {/* ── Fleet cards ─────────────────────────────────────────────────── */}
        <section id="fleet-section" className="px-4 pt-5 pb-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Choose your car</p>
          <div className="space-y-3">
            {displayCars.map((car, idx) => {
              const fare = calcFare(car.pricePerKm, data.distance, isRoundTrip, car.driverCharges ?? '250')
              const isExpanded = expandedCar === car.id
              const isBest = idx === 0
              return (
                <div
                  key={car.id}
                  className={`rounded-2xl overflow-hidden transition-all duration-200 ${
                    isExpanded
                      ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-100'
                      : 'shadow-sm shadow-slate-200'
                  } bg-white`}
                >
                  {/* Best value ribbon */}
                  {isBest && (
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-1.5 flex items-center gap-2">
                      <span className="text-white text-[10px] font-black uppercase tracking-widest">Best Value</span>
                      <span className="text-green-100 text-[10px]">— lowest fare for this route</span>
                    </div>
                  )}

                  {/* Card body */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                    onClick={() => handleSelectCar(car.id)}
                  >
                    <div className="w-[88px] h-16 rounded-xl bg-slate-50 shrink-0 flex items-center justify-center overflow-hidden border border-slate-100">
                      <img
                        src={car.imageUrl}
                        alt={car.name}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/cars/swift-dzire.jpg' }}
                        loading="lazy"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 text-sm leading-tight">{car.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">{car.seats} seater</span>
                        {car.rating && (
                          <span className="flex items-center gap-0.5 text-[11px] text-amber-500 font-semibold">
                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                            {car.rating}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">₹{parseFloat(car.pricePerKm)}/km</div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="font-black text-blue-700 text-lg leading-tight">
                        ₹{fare.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400 mb-2">
                        {isRoundTrip ? 'round trip' : 'one way'}
                      </div>
                      <div className={`text-[11px] font-bold px-3 py-1 rounded-full border transition-all ${
                        isExpanded
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-blue-600 border-blue-200'
                      }`}>
                        {isExpanded ? 'Close' : 'Select'}
                      </div>
                    </div>
                  </button>

                  {/* Inline booking panel */}
                  {isExpanded && (
                    <div ref={expandRef} className="border-t border-slate-100 bg-slate-50">
                      <div className="px-4 pt-4 pb-5 space-y-3">
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                          Complete your booking
                        </p>

                        {/* Date */}
                        <div>
                          <label className="text-[11px] text-slate-500 font-medium mb-1 block">Travel date</label>
                          <input
                            type="date"
                            value={formDate}
                            min={getTomorrow()}
                            onChange={e => setFormDate(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                          />
                        </div>

                        {/* Name */}
                        <div>
                          <label className="text-[11px] text-slate-500 font-medium mb-1 block">Your name</label>
                          <input
                            type="text"
                            placeholder="Enter your name"
                            value={formName}
                            onChange={e => setFormName(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Phone */}
                        <div>
                          <label className="text-[11px] text-slate-500 font-medium mb-1 block">Mobile number</label>
                          <input
                            type="tel"
                            inputMode="numeric"
                            placeholder="10-digit number"
                            value={formPhone}
                            maxLength={10}
                            onChange={e => setFormPhone(e.target.value.replace(/\D/g, ''))}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Submit */}
                        <button
                          onClick={() => handleBookingSubmit(car)}
                          disabled={!formDate || formPhone.length < 10}
                          className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors shadow-md shadow-blue-200"
                        >
                          Book {car.name} — ₹{fare.toLocaleString('en-IN')}
                          <ArrowRight className="w-4 h-4" />
                        </button>

                        <div className="flex items-center justify-center gap-3 text-[10px] text-slate-400">
                          <span className="flex items-center gap-1"><Check className="w-2.5 h-2.5 text-green-500" />Pay ₹{Math.round(fare * 0.1).toLocaleString('en-IN')} now</span>
                          <span>·</span>
                          <span className="flex items-center gap-1"><Check className="w-2.5 h-2.5 text-green-500" />Balance on trip day</span>
                          <span>·</span>
                          <span className="flex items-center gap-1"><Check className="w-2.5 h-2.5 text-green-500" />Free cancellation</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* ── WhatsApp CTA ────────────────────────────────────────────────── */}
        <section className="px-4 py-4" data-wa-cta-section>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('lp_whatsapp_click', { route })}
            className="flex items-center justify-center gap-2.5 w-full text-white font-bold py-4 rounded-2xl text-sm active:scale-[0.98] transition-transform shadow-lg shadow-green-200"
            style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}
          >
            <MessageCircle className="w-5 h-5" />
            Book on WhatsApp instead
          </a>
          <p className="text-center text-[11px] text-slate-400 mt-2">Prefer to chat? We reply in under 5 minutes.</p>
        </section>

        {/* ── Micro FAQ ───────────────────────────────────────────────────── */}
        <section className="px-4 py-4">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Quick answers</p>
          <div className="space-y-2">
            {data.faqs.slice(0, 3).map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm shadow-slate-100">
                <button
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
                  onClick={() => setFaqOpen(prev => prev === i ? null : i)}
                >
                  <span className="text-sm font-medium text-slate-900 leading-snug">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${faqOpen === i ? 'rotate-180' : ''}`} />
                </button>
                {faqOpen === i && (
                  <div className="px-4 pb-4 text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Slim footer ─────────────────────────────────────────────────── */}
        <footer className="px-4 py-5 pb-32 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">© EasyOutstation · easyoutstation.com</p>
          <div className="flex gap-3">
            <a href="/terms" className="text-[11px] text-slate-400">Terms</a>
            <a href="/privacy" className="text-[11px] text-slate-400">Privacy</a>
          </div>
        </footer>
      </main>

      {/* ── Sticky bottom bar ───────────────────────────────────────────── */}
      {cheapestCar && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-8px_32px_rgba(0,0,0,0.12)]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-slate-400 leading-tight">
                {cheapestCar.name} · {isRoundTrip ? 'Round trip' : 'One way'}
              </div>
              <div className="font-black text-slate-900 text-xl leading-tight">
                ₹{cheapestFare.toLocaleString('en-IN')}
              </div>
            </div>
            <button
              onClick={() => {
                handleSelectCar(cheapestCar.id)
                const el = document.getElementById('fleet-section')
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className="shrink-0 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-xl px-6 shadow-md shadow-blue-200 transition-colors"
              style={{ minHeight: 48 }}
            >
              Book Now
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
