import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useSeo } from '@/hooks/useSeo'
import { trpc } from '@/providers/trpc'
import { Phone, MessageCircle, Check, ChevronDown, ArrowRight, Star, Shield, Clock, MapPin } from 'lucide-react'
import { ROUTES } from '@/data/routes'
import { FALLBACK_CARS as ALL_FALLBACK_CARS } from '@/data/carRates'

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

const FALLBACK_CARS: Car[] = ALL_FALLBACK_CARS
  .filter(c => ["sedan", "muv", "premium", "luxury"].includes(c.category))
  .slice(0, 6)

const WA_NUMBER = "918796564111"

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

export default function GoLanding() {
  const { route } = useParams<{ route: string }>()
  const navigate = useNavigate()
  const data = ROUTES[route ?? '']

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
  const quoteViewedRef = useRef(false)
  const bookingStartedRef = useRef(false)

  const { data: liveCars } = trpc.car.list.useQuery(undefined, { staleTime: 5 * 60 * 1000 })

  useSeo({
    title: data
      ? `${data.from} to ${data.to} Cab — Book Direct from ₹${data.fare.min.toLocaleString('en-IN')} | EasyOutstation`
      : 'EasyOutstation — Outstation Cabs',
    description: data?.description ?? 'Book outstation cabs from Delhi at fixed fares.',
    noindex: true,
    canonical: data ? `https://www.easyoutstation.com/cab/${route}` : undefined,
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
  const cheapestFareRaw = cheapestCar
    ? calcFare(cheapestCar.pricePerKm, data.distance, isRoundTrip, cheapestCar.driverCharges ?? '250')
    : data.fare.min
  // Guard against corrupted DB pricePerKm — minimum possible fare is ₹1,550 (80km × ₹13 × 1.25 + ₹250)
  const cheapestFare = cheapestFareRaw >= 500 ? cheapestFareRaw : data.fare.min

  const waText = encodeURIComponent(`Hi, I want to book a ${data.from} to ${data.to} cab. Can you help me?`)
  const waUrl = `https://wa.me/${WA_NUMBER}?text=${waText}`

  // Fix 2a: quote_viewed — fire once after fare resolves, never on toggle
  useEffect(() => {
    if (quoteViewedRef.current || !cheapestCar) return
    quoteViewedRef.current = true
    const dl = (window as any).dataLayer = (window as any).dataLayer || []
    dl.push({
      event: 'quote_viewed',
      origin: data.from,
      destination: data.to,
      travel_date: null,
      return_date: null,
      trip_type: isRoundTrip ? 'round_trip' : 'one_way',
      quoted_fare: cheapestFare,
      cab_type_shown: cheapestCar.category === 'sedan' ? 'Sedan' : cheapestCar.category === 'muv' ? 'MUV' : cheapestCar.category === 'premium' ? 'Premium' : 'Luxury',
      distance_km: data.distance,
      page_variant: 'paid_lp',
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cheapestCar])

  // Fix 2b: booking_started — once per session across both LP and main wizard
  function fireBookingStarted(car: Car) {
    const sessionKey = 'eo_bs_fired'
    try { if (sessionStorage.getItem(sessionKey)) return } catch {}
    if (bookingStartedRef.current) return
    bookingStartedRef.current = true
    try { sessionStorage.setItem(sessionKey, '1') } catch {}
    const dl = (window as any).dataLayer = (window as any).dataLayer || []
    dl.push({
      event: 'booking_started',
      route: `${data.from}-${data.to}`,
      cab_type: car.category === 'sedan' ? 'Sedan' : car.category === 'muv' ? 'MUV' : car.category === 'premium' ? 'Premium' : 'Luxury',
      trip_type: isRoundTrip ? 'round_trip' : 'one_way',
      vehicle_name: car.name,
      page_variant: 'paid_lp',
    })
  }

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
    <div className="min-h-screen bg-white">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-100 h-14 flex items-center justify-between px-4">
        <a href="/" className="flex items-center gap-2.5" aria-label="EasyOutstation home">
          <img src="/logo-icon.png" alt="EasyOutstation" className="h-9 w-9 rounded-lg object-contain" />
          <span className="font-bold text-slate-900 text-base">EasyOutstation</span>
        </a>
        <a
          href="tel:+918796564111"
          onClick={() => track('lp_call_click', { route })}
          className="flex items-center gap-2 bg-blue-600 text-white text-sm font-bold px-4 py-2.5 rounded-full shadow-sm"
        >
          <Phone className="w-3.5 h-3.5" />
          Call to Book
        </a>
      </header>

      <main className="pt-14">

        {/* ── Hero (white) ─────────────────────────────────────────────── */}
        <section className="bg-white px-4 pt-5 pb-4">

          {/* Route pills */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1.5 bg-blue-50 rounded-full px-3 py-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-sm text-slate-700 font-medium">{data.from}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <div className="flex items-center gap-1.5 bg-blue-50 rounded-full px-3 py-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-sm text-slate-700 font-medium">{data.to}</span>
            </div>
          </div>

          {/* H1 */}
          <h1 className="text-[28px] font-extrabold text-slate-900 leading-tight mb-3">
            {data.from} to {data.to} Cab
          </h1>

          {/* Fare */}
          <div className="flex items-baseline gap-2.5 mb-5">
            <span className="text-slate-400 text-base font-medium">from</span>
            <span className="text-slate-900 font-black text-4xl tracking-tight">
              ₹{cheapestFare.toLocaleString('en-IN')}
            </span>
          </div>

          {/* 3 stat cards */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="border border-slate-200 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-bold text-slate-900">{data.duration}</span>
              </div>
              <span className="text-[11px] text-slate-400">Duration</span>
            </div>
            <div className="border border-slate-200 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <MapPin className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-bold text-slate-900">{data.distance} km</span>
              </div>
              <span className="text-[11px] text-slate-400">Distance</span>
            </div>
            <div className="border border-slate-200 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Shield className="w-4 h-4 text-green-500" />
                <span className="text-sm font-bold text-slate-900">Fixed fare</span>
              </div>
              <span className="text-[11px] text-slate-400">No hidden charges</span>
            </div>
          </div>
        </section>

        {/* ── Trip type selector ───────────────────────────────────────── */}
        <div className="bg-white border-y border-slate-100 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400 font-medium shrink-0">Trip type</span>
            <div className="flex gap-2">
              <button
                onClick={() => setIsRoundTrip(false)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  !isRoundTrip
                    ? 'border-blue-500 text-blue-600 bg-white shadow-sm'
                    : 'border-slate-200 text-slate-400 bg-white'
                }`}
              >
                One Way
              </button>
              <button
                onClick={() => setIsRoundTrip(true)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  isRoundTrip
                    ? 'border-blue-500 text-blue-600 bg-white shadow-sm'
                    : 'border-slate-200 text-slate-400 bg-white'
                }`}
              >
                Round Trip
              </button>
            </div>
          </div>
        </div>

        {/* ── Trust strip ──────────────────────────────────────────────── */}
        <div className="bg-white border-b border-slate-100 px-4 py-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <div className="flex items-center gap-4 flex-nowrap min-w-max">
            {[
              { icon: <Check className="w-3.5 h-3.5 text-green-500" />, label: 'Verified drivers' },
              { icon: <Check className="w-3.5 h-3.5 text-green-500" />, label: 'Fixed price' },
              { icon: <Check className="w-3.5 h-3.5 text-green-500" />, label: '10% advance only' },
              { icon: <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />, label: '4.9 rating' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 shrink-0">
                {item.icon}
                <span className="text-xs text-slate-600 font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Fleet cards ─────────────────────────────────────────────── */}
        <section id="fleet-section" className="bg-white px-4 pt-5 pb-3">
          <h2 className="text-base font-bold text-slate-900 mb-3">Choose your car</h2>
          <div className="space-y-3">
            {displayCars.map((car, idx) => {
              const fare = calcFare(car.pricePerKm, data.distance, isRoundTrip, car.driverCharges ?? '250')
              const isExpanded = expandedCar === car.id
              const isBest = idx === 0
              return (
                <div
                  key={car.id}
                  className={`rounded-2xl border overflow-hidden transition-all ${
                    isExpanded ? 'border-blue-400 shadow-md shadow-blue-50' : 'border-slate-200'
                  }`}
                >
                  {/* Best value header */}
                  {isBest && (
                    <div className="flex items-center gap-2.5 px-4 py-2 bg-white border-b border-slate-100">
                      <span className="bg-green-500 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg">
                        Best Value
                      </span>
                      <span className="text-green-600 text-xs font-medium">Lowest fare for this route</span>
                    </div>
                  )}

                  {/* Card row */}
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left bg-white"
                    onClick={() => handleSelectCar(car.id)}
                  >
                    {/* Car image */}
                    <div className="w-24 h-16 shrink-0 flex items-center justify-center">
                      <img
                        src={car.imageUrl}
                        alt={car.name}
                        className="w-full h-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/cars/swift-dzire.jpg' }}
                        loading="lazy"
                      />
                    </div>

                    {/* Car info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 text-sm mb-0.5">{car.name}</div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs text-slate-500">{car.seats} seater</span>
                        {car.rating && (
                          <span className="flex items-center gap-0.5 text-xs text-amber-500 font-semibold">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {car.rating}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">₹{parseFloat(car.pricePerKm)}/km</div>
                    </div>

                    {/* Fare + select */}
                    <div className="shrink-0 text-right flex flex-col items-end gap-1.5">
                      <div>
                        <div className="font-black text-slate-900 text-lg leading-tight">
                          ₹{fare.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {isRoundTrip ? 'round trip' : 'one way'}
                        </div>
                      </div>
                      <div className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all ${
                        isExpanded
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-blue-600 border-blue-300'
                      }`}>
                        {isExpanded ? 'Close' : 'Select'}
                      </div>
                    </div>
                  </button>

                  {/* Inline booking form */}
                  {isExpanded && (
                    <div ref={expandRef} className="border-t border-slate-100 bg-slate-50 px-4 pt-4 pb-5">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                        Complete your booking
                      </p>
                      <div className="space-y-2.5">
                        <div>
                          <label className="text-[11px] text-slate-500 font-medium mb-1 block">Travel date</label>
                          <input
                            type="date"
                            value={formDate}
                            min={getTomorrow()}
                            onChange={e => { fireBookingStarted(car); setFormDate(e.target.value) }}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 font-medium mb-1 block">Your name</label>
                          <input
                            type="text"
                            placeholder="Enter your name"
                            value={formName}
                            onChange={e => { fireBookingStarted(car); setFormName(e.target.value) }}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 font-medium mb-1 block">Mobile number</label>
                          <input
                            type="tel"
                            inputMode="numeric"
                            placeholder="10-digit number"
                            value={formPhone}
                            maxLength={10}
                            onChange={e => { fireBookingStarted(car); setFormPhone(e.target.value.replace(/\D/g, '')) }}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <button
                          onClick={() => handleBookingSubmit(car)}
                          disabled={!formDate || formPhone.length < 10}
                          className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                          Book {car.name} — ₹{calcFare(car.pricePerKm, data.distance, isRoundTrip, car.driverCharges ?? '250').toLocaleString('en-IN')}
                          <ArrowRight className="w-4 h-4" />
                        </button>
                        <p className="text-center text-[10px] text-slate-400">
                          Pay ₹{Math.round(calcFare(car.pricePerKm, data.distance, isRoundTrip, car.driverCharges ?? '250') * 0.1).toLocaleString('en-IN')} now · Balance on trip day · Free cancellation
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* ── WhatsApp CTA ─────────────────────────────────────────────── */}
        <section className="px-4 py-4" data-wa-cta-section>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('lp_whatsapp_click', { route })}
            className="flex items-center justify-center gap-2.5 w-full text-white font-bold py-4 rounded-2xl text-sm active:scale-[0.98] transition-transform"
            style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}
          >
            <MessageCircle className="w-5 h-5" />
            Book on WhatsApp
          </a>
          <p className="text-center text-[11px] text-slate-400 mt-2">Prefer to chat? We reply in under 5 minutes.</p>
        </section>

        {/* ── Micro FAQ ────────────────────────────────────────────────── */}
        <section className="px-4 pb-4">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Quick answers</p>
          <div className="space-y-2">
            {data.faqs.slice(0, 3).map((faq, i) => (
              <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
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

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <footer className="px-4 py-5 pb-32 flex items-center justify-between border-t border-slate-100">
          <p className="text-[11px] text-slate-400">© EasyOutstation · easyoutstation.com</p>
          <div className="flex gap-3">
            <a href="/terms" className="text-[11px] text-slate-400">Terms</a>
            <a href="/privacy" className="text-[11px] text-slate-400">Privacy</a>
          </div>
        </footer>
      </main>

      {/* ── Sticky bottom bar ────────────────────────────────────────── */}
      {cheapestCar && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_24px_rgba(0,0,0,0.10)]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            {/* Car thumbnail */}
            <div className="w-12 h-9 shrink-0 flex items-center justify-center">
              <img
                src={cheapestCar.imageUrl}
                alt={cheapestCar.name}
                className="w-full h-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = '/cars/swift-dzire.jpg' }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-slate-400 leading-tight truncate">
                {cheapestCar.name} · {isRoundTrip ? 'Round trip' : 'One way'}
              </div>
              <div className="font-black text-slate-900 text-xl leading-tight">
                ₹{cheapestFare.toLocaleString('en-IN')}
              </div>
            </div>
            <button
              onClick={() => {
                handleSelectCar(cheapestCar.id)
                document.getElementById('fleet-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className="shrink-0 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-2xl px-5 transition-colors"
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
