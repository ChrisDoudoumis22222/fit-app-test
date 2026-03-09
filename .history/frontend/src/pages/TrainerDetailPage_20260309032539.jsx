"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { motion, useScroll, useTransform } from "framer-motion"
import { ArrowLeft, Sun } from "lucide-react"

import { supabase } from "../supabaseClient"
import AllInOneBooking from "../components/all-in-one-booking"
import PoweredByPeakVelocityFooter from "../components/PoweredByPeakVelocityFooter.jsx"

import ProfileSideCard from "../components/trainer-detail/ProfileSideCard.jsx"
import {
  AvailabilitySection,
  CertificationsSection,
  PostsSection,
  ReviewsSection,
  StatsSection,
} from "../components/trainer-detail/TrainerDetailSections.jsx"

import {
  ALL_DAYS,
  FloatingElements,
  ICON_BY_KEY,
  MobileBookingButton,
  ScrollProgress,
  ScrollReveal,
  ScrollToTop,
  categoryByValue,
  fmtDate,
  localDateISO,
  median,
  mode,
  timeToMinutes,
  within,
} from "../components/trainer-detail/shared.jsx"

/* ---------------------- local auth helper ---------------------- */
function usePageSession() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return { session }
}

export default function TrainerDetailPage() {
  const { id, trainerId } = useParams()
  const trainerIdParam = id ?? trainerId

  const { session } = usePageSession()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [availability, setAvailability] = useState([])
  const [holidays, setHolidays] = useState([])
  const [error, setError] = useState("")
  const [initialLoading, setInitialLoading] = useState(true)
  const [stats, setStats] = useState({ bookingsCount: 0, avgRating: 0, reviewsCount: 0 })
  const [hasAvailableSlots, setHasAvailableSlots] = useState(true)
  const [isNewTrainer, setIsNewTrainer] = useState(false)
  const [accepts, setAccepts] = useState({ cash: false, card: false })
  const [priceInfo, setPriceInfo] = useState({
    typicalPrice: null,
    currencyCode: "EUR",
    typicalDurationMin: null,
  })

  const { scrollYProgress } = useScroll()
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -40])

  useEffect(() => {
    const styleId = "trainer-detail-global-style"

    let styleElement = document.getElementById(styleId)
    if (!styleElement) {
      styleElement = document.createElement("style")
      styleElement.id = styleId
      styleElement.textContent = `
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #000000 !important;
          min-height: 100vh !important;
        }
        * { box-sizing: border-box; }
        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background: linear-gradient(135deg, #000000 0%, #18181b 50%, #000000 100%) !important;
          z-index: -1000;
        }
        #root {
          background: transparent !important;
          min-height: 100vh !important;
        }
      `
      document.head.appendChild(styleElement)
    }

    document.body.style.margin = "0"
    document.body.style.padding = "0"
    document.body.style.backgroundColor = "#000000"
    document.documentElement.style.margin = "0"
    document.documentElement.style.padding = "0"
    document.documentElement.style.backgroundColor = "#000000"

    return () => {
      document.body.style.margin = ""
      document.body.style.padding = ""
      document.body.style.backgroundColor = ""
      document.documentElement.style.margin = ""
      document.documentElement.style.padding = ""
      document.documentElement.style.backgroundColor = ""
    }
  }, [])

  const loadStatsAndPricing = useCallback(async (profile, availabilityRows = []) => {
    if (!profile?.id) return

    try {
      const [bookingsRes, reviewsRes, pricingRes] = await Promise.all([
        supabase
          .from("trainer_bookings")
          .select("id, duration_min, status, created_at")
          .eq("trainer_id", profile.id)
          .in("status", ["accepted", "completed"])
          .order("created_at", { ascending: false }),
        supabase.from("trainer_reviews").select("rating").eq("trainer_id", profile.id),
        supabase
          .from("trainer_pricing")
          .select("base_price, online_discount, specialty_pricing, currency_code")
          .eq("trainer_id", profile.id)
          .maybeSingle(),
      ])

      const bookings = bookingsRes.data || []
      const reviews = reviewsRes.data || []

      const bookingsCount = bookings.filter((b) => b.status === "completed").length
      const reviewsCount = reviews.length
      const avgRating =
        reviewsCount > 0
          ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviewsCount
          : 0

      setStats({ bookingsCount, avgRating, reviewsCount })

      const durFromBookings = bookings
        .map((b) => Number(b.duration_min))
        .filter((n) => Number.isFinite(n) && n > 0)

      let typicalDurationMin = mode(durFromBookings) ?? median(durFromBookings) ?? null

      if (!typicalDurationMin && availabilityRows.length > 0) {
        const slotDurations = availabilityRows
          .map((slot) => {
            const start = timeToMinutes(slot.start_time)
            const end = timeToMinutes(slot.end_time)
            return start != null && end != null && end > start ? end - start : null
          })
          .filter((n) => Number.isFinite(n) && n > 0)

        typicalDurationMin = mode(slotDurations) ?? median(slotDurations) ?? null
      }

      const pricing = pricingRes.data || null

      const computeDisplayPrice = (prObj, specialty, isOnline) => {
        if (!prObj) return { price: null, currency: "EUR" }

        let base = Number(prObj.base_price ?? 0)
        const specMap =
          prObj.specialty_pricing && typeof prObj.specialty_pricing === "object"
            ? prObj.specialty_pricing
            : null

        const specOverride = specMap ? Number(specMap[specialty]) : Number.NaN
        if (Number.isFinite(specOverride) && specOverride > 0) base = specOverride

        const discountPct = Number(prObj.online_discount ?? 0)
        if (isOnline && discountPct > 0) base = base * (1 - discountPct / 100)

        return {
          price: base > 0 ? base : null,
          currency: prObj.currency_code || "EUR",
        }
      }

      const { price, currency } = computeDisplayPrice(pricing, profile.specialty, profile.is_online)

      setPriceInfo({
        typicalPrice: price,
        currencyCode: currency,
        typicalDurationMin,
      })

      const createdDate = new Date(profile.created_at)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      setIsNewTrainer(createdDate > thirtyDaysAgo)
    } catch (err) {
      console.error("Error fetching stats/pricing:", err)
    }
  }, [])

  useEffect(() => {
    let alive = true

    if (!trainerIdParam) {
      setError("Δεν βρέθηκε προπονητής.")
      setInitialLoading(false)
      return
    }

    const loadPage = async () => {
      try {
        setError("")
        setInitialLoading(true)

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, bio, specialty, roles, location, is_online, experience_years, certifications, diploma_url, created_at, email",
          )
          .eq("id", trainerIdParam)
          .single()

        if (!alive) return

        if (profileError) {
          setError(profileError.message || "Σφάλμα προφίλ.")
          setInitialLoading(false)
          return
        }

        if (!profile) {
          setError("Το προφίλ δεν βρέθηκε.")
          setInitialLoading(false)
          return
        }

        const [{ data: av, error: avError }, { data: hol, error: holError }, { data: pm, error: pmError }] =
          await Promise.all([
            supabase
              .from("trainer_availability")
              .select("weekday, start_time, end_time, is_online")
              .eq("trainer_id", trainerIdParam),
            supabase
              .from("trainer_holidays")
              .select("starts_on, ends_on, reason")
              .eq("trainer_id", trainerIdParam),
            supabase
              .from("trainer_payment_methods")
              .select("method, is_enabled")
              .eq("trainer_id", trainerIdParam),
          ])

        if (!alive) return

        if (avError) setError((prev) => prev || avError.message || "Σφάλμα διαθεσιμότητας.")
        if (holError) setError((prev) => prev || holError.message || "Σφάλμα αδειών.")
        if (pmError) setError((prev) => prev || pmError.message || "Σφάλμα τρόπων πληρωμής.")

        const sortedAvailability = (av || []).sort(
          (a, b) =>
            ALL_DAYS.findIndex((d) => d.key === a.weekday) -
            ALL_DAYS.findIndex((d) => d.key === b.weekday),
        )

        const sortedHolidays = (hol || []).sort(
          (a, b) => new Date(`${a.starts_on}T00:00:00`) - new Date(`${b.starts_on}T00:00:00`),
        )

        const acceptsCash = Boolean(pm?.find((r) => r.method === "cash" && r.is_enabled))
        const acceptsCard = Boolean(pm?.find((r) => r.method === "card" && r.is_enabled))

        setAccepts({ cash: acceptsCash, card: acceptsCard })
        setData(profile)
        setAvailability(sortedAvailability)
        setHolidays(sortedHolidays)

        await loadStatsAndPricing(profile, sortedAvailability)
      } catch (err) {
        console.error(err)
        if (alive) setError("Κάτι πήγε στραβά.")
      } finally {
        if (alive) setInitialLoading(false)
      }
    }

    loadPage()

    return () => {
      alive = false
    }
  }, [trainerIdParam, loadStatsAndPricing])

  const todayISO = useMemo(() => localDateISO(0), [])

  const currentVacation = useMemo(() => {
    return (holidays || []).find((h) => within(todayISO, h.starts_on, h.ends_on)) || null
  }, [holidays, todayISO])

  const scrollToBooking = () => {
    document.getElementById("booking-section")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }

  const scrollToReviews = () => {
    document.getElementById("reviews-section")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-zinc-200">
        <FloatingElements />

        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="w-14 h-14 sm:w-16 sm:h-16 border-4 border-zinc-700/30 border-t-zinc-500 rounded-full animate-spin" />
              <div
                className="absolute inset-2 border-2 border-zinc-800/30 border-t-zinc-600 rounded-full animate-spin"
                style={{ animationDirection: "reverse" }}
              />
            </div>

            <div className="text-center">
              <p className="text-zinc-300 text-lg font-semibold">Φόρτωση προφίλ</p>
              <p className="text-zinc-500 text-sm">Προετοιμασία των δεδομένων...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-zinc-200">
        <FloatingElements />

        <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24 space-y-4">
          <h1 className="text-2xl font-semibold text-zinc-200">Προβολή προπονητή</h1>

          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-200 px-4 py-3">
            {error || "Το προφίλ δεν βρέθηκε."}
          </div>

          <motion.button
            onClick={() => navigate(-1)}
            whileHover={{ x: -5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-600/50"
          >
            <ArrowLeft className="h-4 w-4" />
            Πίσω
          </motion.button>
        </div>
      </div>
    )
  }

  const cat = categoryByValue(data.specialty)
  const CatIcon = cat?.iconKey ? ICON_BY_KEY[cat.iconKey] : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-zinc-200 relative">
      <FloatingElements />
      <ScrollProgress />
      <ScrollToTop />

      <section className="relative pt-8 sm:pt-12 lg:pt-16 pb-32 lg:pb-16">
        <div className="w-full px-5 sm:px-8 lg:px-16 xl:px-20 2xl:px-24">
          <div className="mt-6 flex flex-col lg:grid lg:grid-cols-[400px_1fr] 2xl:grid-cols-[430px_1fr] gap-8 lg:gap-12 2xl:gap-16 items-start">
            <div className="order-1 lg:sticky lg:top-24 self-start w-full">
              <ProfileSideCard
                data={data}
                stats={{ avgRating: stats.avgRating, reviewsCount: stats.reviewsCount }}
                cat={cat}
                CatIcon={CatIcon}
                isNewTrainer={isNewTrainer}
                onBookClick={scrollToBooking}
                onReviewsClick={scrollToReviews}
                accepts={accepts}
                priceInfo={priceInfo}
              />
            </div>

            <motion.div
              className="order-2 space-y-8 lg:space-y-10 xl:space-y-12 w-full"
              style={{ y: heroY }}
            >
              <div className="hidden lg:block">
                <ScrollReveal delay={0.08}>
                  <div className="pt-1">
                    <h1 className="text-4xl sm:text-5xl xl:text-6xl 2xl:text-7xl font-bold tracking-tight text-zinc-100 leading-tight">
                      {data.full_name}
                    </h1>

                    <p className="mt-3 text-zinc-400 text-xl sm:text-2xl font-semibold">
                      {cat?.label || "Επαγγελματίας Προπονητής"}
                    </p>

                    {data.bio ? (
                      <p className="mt-4 text-base sm:text-lg xl:text-xl text-zinc-300 leading-relaxed max-w-4xl">
                        {data.bio}
                      </p>
                    ) : null}
                  </div>
                </ScrollReveal>
              </div>

              {currentVacation && (
                <ScrollReveal>
                  <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 text-amber-100 px-6 py-5 flex items-center gap-4">
                    <Sun className="h-6 w-6 flex-shrink-0" />

                    <div>
                      <p className="font-semibold text-lg">Σε διακοπές</p>
                      <p className="text-sm opacity-90">
                        {fmtDate(currentVacation.starts_on)} - {fmtDate(currentVacation.ends_on)}
                        {currentVacation.reason ? ` • ${currentVacation.reason}` : ""}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              )}

              <StatsSection
                data={data}
                bookingsCount={stats.bookingsCount}
                avgRating={stats.avgRating}
                reviewsCount={stats.reviewsCount}
              />

              <CertificationsSection
                diplomaUrl={data.diploma_url}
                certifications={data.certifications}
              />

              <AvailabilitySection rows={availability} />

              <section
                id="booking-section"
                className="relative left-1/2 right-1/2 w-screen max-w-none -translate-x-1/2"
              >
                <AllInOneBooking
                  trainerId={data.id}
                  trainerName={data.full_name}
                  holidays={holidays}
                  sessionUserId={session?.user?.id}
                  weeklyAvailability={availability}
                  onSlotsAvailable={setHasAvailableSlots}
                />
              </section>

              <PostsSection trainerId={data.id} />

              <ReviewsSection
                trainerId={data.id}
                session={session}
                onReviewMutated={() => loadStatsAndPricing(data, availability)}
              />
            </motion.div>
          </div>
        </div>
      </section>

      <MobileBookingButton onClick={scrollToBooking} hasAvailableSlots={hasAvailableSlots} />

      <div className="mt-10">
        <PoweredByPeakVelocityFooter />
      </div>
    </div>
  )
}