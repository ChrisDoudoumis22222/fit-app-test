"use client"

/* # PART 1 — IMPORTS */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
  ScrollProgress,
  ScrollReveal,
  categoryByValue,
  fmtDate,
  localDateISO,
  median,
  mode,
  timeToMinutes,
  within,
} from "../components/trainer-detail/shared.jsx"

/* # PART 2 — LOCAL AUTH HELPER */
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

/* # PART 3 — PAGE COMPONENT */
export default function TrainerDetailPage() {
  /* # PART 3.1 — ROUTER / SESSION / SCROLL */
  const { id, trainerId } = useParams()
  const trainerIdParam = id ?? trainerId

  const { session } = usePageSession()
  const navigate = useNavigate()

  const { scrollYProgress } = useScroll()
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -40])

  const desktopBookingRef = useRef(null)
  const mobileBookingRef = useRef(null)
  const desktopReviewsRef = useRef(null)
  const mobileReviewsRef = useRef(null)

  /* # PART 3.2 — STATE */
  const [data, setData] = useState(null)
  const [availability, setAvailability] = useState([])
  const [holidays, setHolidays] = useState([])
  const [error, setError] = useState("")
  const [initialLoading, setInitialLoading] = useState(true)

  const [stats, setStats] = useState({
    bookingsCount: 0,
    avgRating: 0,
    reviewsCount: 0,
  })

  const [hasAvailableSlots, setHasAvailableSlots] = useState(true)
  const [isNewTrainer, setIsNewTrainer] = useState(false)

  const [accepts, setAccepts] = useState({
    cash: false,
    card: false,
  })

  const [priceInfo, setPriceInfo] = useState({
    typicalPrice: null,
    currencyCode: "EUR",
    typicalDurationMin: null,
  })

  /* # PART 3.3 — GLOBAL PAGE STYLE */
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

  /* # PART 3.4 — LOAD STATS / PRICING */
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

        supabase
          .from("trainer_reviews")
          .select("rating")
          .eq("trainer_id", profile.id),

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
        if (isOnline && discountPct > 0) {
          base = base * (1 - discountPct / 100)
        }

        return {
          price: base > 0 ? base : null,
          currency: prObj.currency_code || "EUR",
        }
      }

      const { price, currency } = computeDisplayPrice(
        pricing,
        profile.specialty,
        profile.is_online,
      )

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

  /* # PART 3.5 — LOAD PAGE DATA */
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

        const [
          { data: av, error: avError },
          { data: hol, error: holError },
          { data: pm, error: pmError },
        ] = await Promise.all([
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

        if (avError) {
          setError((prev) => prev || avError.message || "Σφάλμα διαθεσιμότητας.")
        }
        if (holError) {
          setError((prev) => prev || holError.message || "Σφάλμα αδειών.")
        }
        if (pmError) {
          setError((prev) => prev || pmError.message || "Σφάλμα τρόπων πληρωμής.")
        }

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

  /* # PART 3.6 — DERIVED VALUES */
  const todayISO = useMemo(() => localDateISO(0), [])

  const currentVacation = useMemo(() => {
    return (holidays || []).find((h) => within(todayISO, h.starts_on, h.ends_on)) || null
  }, [holidays, todayISO])

  const cat = categoryByValue(data?.specialty)
  const CatIcon = cat?.iconKey ? ICON_BY_KEY[cat.iconKey] : null

  /* # PART 3.7 — PAGE ACTIONS */
  const isElementVisible = useCallback((el) => {
    if (!el) return false
    if (!(el instanceof HTMLElement)) return false

    const style = window.getComputedStyle(el)
    if (style.display === "none" || style.visibility === "hidden") return false
    if (el.getClientRects().length === 0) return false

    return true
  }, [])

  const scrollToElement = useCallback(
    (refs = [], desktopOffset = 96, mobileOffset = 112) => {
      const isDesktop =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(min-width: 1024px)").matches

      const offset = isDesktop ? desktopOffset : mobileOffset
      const visibleTarget = refs.find((ref) => isElementVisible(ref?.current))?.current

      if (!visibleTarget) return false

      const top = visibleTarget.getBoundingClientRect().top + window.scrollY - offset

      window.scrollTo({
        top: Math.max(0, top),
        behavior: "smooth",
      })

      return true
    },
    [isElementVisible],
  )

  const scrollToBooking = useCallback(() => {
    requestAnimationFrame(() => {
      scrollToElement([desktopBookingRef, mobileBookingRef], 96, 118)
    })
  }, [scrollToElement])

  const scrollToReviews = useCallback(() => {
    requestAnimationFrame(() => {
      scrollToElement([desktopReviewsRef, mobileReviewsRef], 96, 118)
    })
  }, [scrollToElement])

  /* # PART 4 — LOADING STATE */
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-zinc-200">
        <FloatingElements />
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="h-14 w-14 animate-spin rounded-full border-4 border-zinc-700/30 border-t-zinc-500 sm:h-16 sm:w-16" />
              <div
                className="absolute inset-2 animate-spin rounded-full border-2 border-zinc-800/30 border-t-zinc-600"
                style={{ animationDirection: "reverse" }}
              />
            </div>

            <div className="text-center">
              <p className="text-lg font-semibold text-zinc-300">Φόρτωση προφίλ</p>
              <p className="text-sm text-zinc-500">Προετοιμασία των δεδομένων...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* # PART 5 — ERROR STATE */
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-zinc-200">
        <FloatingElements />
        <div className="mx-auto max-w-4xl space-y-4 px-4 py-16 sm:py-24">
          <h1 className="text-2xl font-semibold text-zinc-200">Προβολή προπονητή</h1>

          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-200">
            {error || "Το προφίλ δεν βρέθηκε."}
          </div>

          <motion.button
            onClick={() => navigate(-1)}
            whileHover={{ x: -5 }}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-600/50 bg-zinc-800/50 px-4 py-2 hover:bg-zinc-700/50"
          >
            <ArrowLeft className="h-4 w-4" />
            Πίσω
          </motion.button>
        </div>
      </div>
    )
  }

  /* # PART 6 — MAIN RENDER */
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-zinc-200">
      <FloatingElements />
      <ScrollProgress />
      

      {/* # PART 6.1 — DESKTOP LAYOUT */}
      <section className="relative hidden pb-10 pt-8 sm:pt-12 lg:block lg:pb-16 lg:pt-16">
        <div className="w-full px-5 sm:px-8 lg:px-16 xl:px-20 2xl:px-24">
          <div className="mt-6 grid items-start gap-12 lg:grid-cols-[400px_1fr] 2xl:grid-cols-[430px_1fr] 2xl:gap-16">
            <div className="order-1 w-full self-start lg:sticky lg:top-24">
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
              className="order-2 w-full space-y-8 lg:space-y-10 xl:space-y-12"
              style={{ y: heroY }}
            >
              {/* # PART 6.1.1 — HERO */}
              <ScrollReveal delay={0.08}>
                <div className="pt-1">
                  <h1 className="text-4xl font-bold leading-tight tracking-tight text-zinc-100 sm:text-5xl xl:text-6xl 2xl:text-7xl">
                    {data.full_name}
                  </h1>

                  <p className="mt-3 text-xl font-semibold text-zinc-400 sm:text-2xl">
                    {cat?.label || "Επαγγελματίας Προπονητής"}
                  </p>

                  {data.bio ? (
                    <p className="mt-4 max-w-4xl text-base leading-relaxed text-zinc-300 sm:text-lg xl:text-xl">
                      {data.bio}
                    </p>
                  ) : null}
                </div>
              </ScrollReveal>

              {/* # PART 6.1.2 — VACATION NOTICE */}
              {currentVacation && (
                <ScrollReveal>
                  <div className="flex items-center gap-4 rounded-3xl border border-amber-500/30 bg-amber-500/10 px-6 py-5 text-amber-100">
                    <Sun className="h-6 w-6 flex-shrink-0" />
                    <div>
                      <p className="text-lg font-semibold">Σε διακοπές</p>
                      <p className="text-sm opacity-90">
                        {fmtDate(currentVacation.starts_on)} - {fmtDate(currentVacation.ends_on)}
                        {currentVacation.reason ? ` • ${currentVacation.reason}` : ""}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              )}

              {/* # PART 6.1.3 — STATS */}
              <StatsSection
                data={data}
                bookingsCount={stats.bookingsCount}
                avgRating={stats.avgRating}
                reviewsCount={stats.reviewsCount}
              />

              {/* # PART 6.1.4 — CERTIFICATIONS */}
              <CertificationsSection
                diplomaUrl={data.diploma_url}
                certifications={data.certifications}
              />

              {/* # PART 6.1.5 — AVAILABILITY */}
              <AvailabilitySection rows={availability} />

              {/* # PART 6.1.6 — BOOKING */}
              <div ref={desktopBookingRef} id="desktop-booking-section" className="w-full scroll-mt-28">
                <AllInOneBooking
                  trainerId={data.id}
                  trainerName={data.full_name}
                  holidays={holidays}
                  sessionUserId={session?.user?.id}
                  weeklyAvailability={availability}
                  onSlotsAvailable={setHasAvailableSlots}
                />
              </div>

              {/* # PART 6.1.7 — POSTS */}
              <PostsSection trainerId={data.id} />

              {/* # PART 6.1.8 — REVIEWS */}
              <div
                ref={desktopReviewsRef}
                id="desktop-reviews-section"
                className="scroll-mt-28"
              >
                <ReviewsSection
                  trainerId={data.id}
                  session={session}
                  onReviewMutated={() => loadStatsAndPricing(data, availability)}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* # PART 6.2 — MOBILE TOP SECTION */}
      <section className="relative pb-10 pt-6 lg:hidden">
        <div className="w-full px-4 sm:px-6">
          <div className="mt-4 flex flex-col items-start gap-6">
            <div className="order-1 w-full">
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

            <div className="order-2 w-full space-y-6 sm:space-y-8">
              {/* # PART 6.2.1 — MOBILE VACATION NOTICE */}
              {currentVacation && (
                <ScrollReveal>
                  <div className="flex items-center gap-4 rounded-3xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-amber-100 sm:px-6 sm:py-5">
                    <Sun className="h-5 w-5 flex-shrink-0 sm:h-6 sm:w-6" />
                    <div>
                      <p className="text-base font-semibold sm:text-lg">Σε διακοπές</p>
                      <p className="text-sm opacity-90">
                        {fmtDate(currentVacation.starts_on)} - {fmtDate(currentVacation.ends_on)}
                        {currentVacation.reason ? ` • ${currentVacation.reason}` : ""}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              )}

              {/* # PART 6.2.2 — MOBILE STATS */}
              <StatsSection
                data={data}
                bookingsCount={stats.bookingsCount}
                avgRating={stats.avgRating}
                reviewsCount={stats.reviewsCount}
              />

              {/* # PART 6.2.3 — MOBILE CERTIFICATIONS */}
              <CertificationsSection
                diplomaUrl={data.diploma_url}
                certifications={data.certifications}
              />

              {/* # PART 6.2.4 — MOBILE AVAILABILITY */}
              <AvailabilitySection rows={availability} />
            </div>
          </div>
        </div>
      </section>

      {/* # PART 6.3 — MOBILE FULL BLEED BOOKING */}
      <section
        ref={mobileBookingRef}
        id="mobile-booking-section"
        className="relative left-1/2 w-screen max-w-none -translate-x-1/2 overflow-x-hidden px-0 py-2 scroll-mt-32 sm:py-4 lg:hidden"
      >
        <div className="w-full max-w-none px-0">
          <AllInOneBooking
            trainerId={data.id}
            trainerName={data.full_name}
            holidays={holidays}
            sessionUserId={session?.user?.id}
            weeklyAvailability={availability}
            onSlotsAvailable={setHasAvailableSlots}
          />
        </div>
      </section>

      {/* # PART 6.4 — MOBILE POSTS + REVIEWS */}
      <section className="relative pb-6 pt-6 sm:pt-8 lg:hidden">
        <div className="w-full px-4 sm:px-6">
          <div className="w-full space-y-8">
            <PostsSection trainerId={data.id} />

            <div
              ref={mobileReviewsRef}
              id="mobile-reviews-section"
              className="scroll-mt-32"
            >
              <ReviewsSection
                trainerId={data.id}
                session={session}
                onReviewMutated={() => loadStatsAndPricing(data, availability)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* # PART 6.5 — MOBILE CTA */}
      <MobileBookingButton />

      {/* # PART 6.6 — FOOTER */}
      <div className="mt-10">
        <PoweredByPeakVelocityFooter />
      </div>
    </div>
  )
}