"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion, useInView, useScroll, useTransform, AnimatePresence } from "framer-motion"
import { Calendar, ChevronUp, Star, Wifi } from "lucide-react"

import { FaDumbbell, FaUsers, FaAppleAlt, FaLaptop, FaRunning, FaMusic, FaHeartbeat } from "react-icons/fa"
import { MdFitnessCenter, MdSelfImprovement, MdHealthAndSafety, MdPsychology } from "react-icons/md"
import { GiMuscleUp, GiSwordsPower, GiWeightLiftingUp, GiBoxingGlove } from "react-icons/gi"
import { TbYoga, TbStethoscope } from "react-icons/tb"

/* ------------------ Icons & categories ------------------ */
export const ICON_BY_KEY = {
  dumbbell: FaDumbbell,
  users: FaUsers,
  pilates: MdSelfImprovement,
  yoga: TbYoga,
  apple: FaAppleAlt,
  laptop: FaLaptop,
  strength: GiWeightLiftingUp,
  calisthenics: GiMuscleUp,
  crossfit: MdFitnessCenter,
  boxing: GiBoxingGlove,
  martial: GiSwordsPower,
  dance: FaMusic,
  running: FaRunning,
  physio: TbStethoscope,
  rehab: MdHealthAndSafety,
  wellness: FaHeartbeat,
  psychology: MdPsychology,
}

export const TRAINER_CATEGORIES = [
  { value: "personal_trainer", label: "Προσωπικός Εκπαιδευτής", iconKey: "dumbbell" },
  { value: "group_fitness_instructor", label: "Εκπαιδευτής Ομαδικών", iconKey: "users" },
  { value: "pilates_instructor", label: "Pilates", iconKey: "pilates" },
  { value: "yoga_instructor", label: "Yoga", iconKey: "yoga" },
  { value: "nutritionist", label: "Διατροφή", iconKey: "apple" },
  { value: "online_coach", label: "Online", iconKey: "laptop" },
  { value: "strength_conditioning", label: "Strength", iconKey: "strength" },
  { value: "calisthenics", label: "Calisthenics", iconKey: "calisthenics" },
  { value: "crossfit_coach", label: "CrossFit", iconKey: "crossfit" },
  { value: "boxing_kickboxing", label: "Boxing", iconKey: "boxing" },
  { value: "martial_arts", label: "Πολεμικές Τέχνες", iconKey: "martial" },
  { value: "dance_fitness", label: "Dance Fitness", iconKey: "dance" },
  { value: "running_coach", label: "Running", iconKey: "running" },
  { value: "physiotherapist", label: "Φυσικοθεραπευτής", iconKey: "physio" },
  { value: "rehab_prevention", label: "Αποκατάσταση", iconKey: "rehab" },
  { value: "wellness_life_coach", label: "Ευεξία", iconKey: "wellness" },
  { value: "performance_psych", label: "Αθλητική Ψυχ.", iconKey: "psychology" },
]

export const categoryByValue = (v) => TRAINER_CATEGORIES.find((c) => c.value === v) || null

/* ------------------------ Avatar & image helpers ------------------------ */
export const PUBLIC_PLACEHOLDER_PATH = "/trainer-avatar-placeholder.png"

export const DEFAULT_AVATAR_DATA_URI =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><rect width="100%" height="100%" fill="%2318181b"/><circle cx="200" cy="180" r="80" fill="%2327272a"/><rect x="80" y="290" width="240" height="130" rx="65" fill="%2327272a"/></svg>'

export const hasImage = (s) =>
  typeof s === "string" &&
  s.trim() !== "" &&
  s.trim().toLowerCase() !== "null" &&
  s.trim().toLowerCase() !== "undefined"

export const safeAvatar = (url) => (url ? url : "")

export const FALLBACK_PRIMARY = PUBLIC_PLACEHOLDER_PATH
export const FALLBACK_ULTIMATE = DEFAULT_AVATAR_DATA_URI

export function Avatar({ url, className = "h-10 w-10", alt = "avatar" }) {
  const src = hasImage(url) ? safeAvatar(url) : FALLBACK_PRIMARY

  return (
    <img
      src={src}
      alt={alt}
      onError={(e) => {
        e.currentTarget.onerror = null
        e.currentTarget.src = FALLBACK_ULTIMATE
      }}
      className={`${className} rounded-full object-cover bg-gradient-to-br from-zinc-800 to-zinc-900`}
    />
  )
}

/* --------------------------- Helpers --------------------------- */
export const ALL_DAYS = [
  { key: "monday", label: "Δευτέρα", idx: 1 },
  { key: "tuesday", label: "Τρίτη", idx: 2 },
  { key: "wednesday", label: "Τετάρτη", idx: 3 },
  { key: "thursday", label: "Πέμπτη", idx: 4 },
  { key: "friday", label: "Παρασκευή", idx: 5 },
]

export const within = (d, f, t) => {
  const D = new Date(`${d}T00:00:00`)
  const F = new Date(`${f}T00:00:00`)
  const T = new Date(`${t}T00:00:00`)
  return D >= F && D <= new Date(T.getTime() + 86399999)
}

export const fmtDate = (d) => {
  try {
    return new Date(`${d}T00:00:00`).toLocaleDateString("el-GR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    })
  } catch {
    return d
  }
}

export const hhmm = (t) => (typeof t === "string" ? t.match(/^(\d{1,2}:\d{2})/)?.[1] || t : t)

export const isUrl = (s) => typeof s === "string" && /^https?:\/\//i.test(s)

export function normalizeCerts(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)

  if (typeof raw === "string") {
    const trimmed = raw.trim()

    if (
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith("{") && trimmed.endsWith("}"))
    ) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) return parsed.filter(Boolean)
        if (parsed && typeof parsed === "object") return Object.values(parsed).filter(Boolean)
      } catch {}
    }

    return trimmed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  }

  if (typeof raw === "object") return Object.values(raw).filter(Boolean)
  return []
}

export function localDateISO(offsetDays = 0) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offsetDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/* -------- pricing / duration helpers -------- */
export const timeToMinutes = (t) => {
  if (!t) return null
  const [hh = "0", mm = "0"] = String(t).split(":")
  const h = Number(hh)
  const m = Number(mm)

  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

export const median = (arr) => {
  if (!arr || arr.length === 0) return null
  const a = [...arr].sort((x, y) => x - y)
  const mid = Math.floor(a.length / 2)
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2
}

export const mode = (arr) => {
  if (!arr || arr.length === 0) return null
  const map = new Map()
  let best = null
  let bestCount = 0

  for (const v of arr) {
    const c = (map.get(v) || 0) + 1
    map.set(v, c)
    if (c > bestCount) {
      best = v
      bestCount = c
    }
  }

  return best
}

export const formatCurrency = (amount, code = "EUR") => {
  try {
    const opts = {
      style: "currency",
      currency: code,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }
    return new Intl.NumberFormat("el-GR", opts).format(amount)
  } catch {
    return `${amount} ${code}`
  }
}

export const formatDuration = (min) => {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h && m) return `${h}ω ${m}’`
  if (h) return `${h}ω`
  return `${m}’`
}

/* ------------------- Minor UI utilities ------------------- */
export function ScrollReveal({ children, direction = "up", delay = 0, className = "" }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  const directionOffset = {
    up: { y: 50 },
    down: { y: -50 },
    left: { x: 50 },
    right: { x: -50 },
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...directionOffset[direction] }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function FloatingElements() {
  const { scrollYProgress } = useScroll()
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -100])
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -200])
  const y3 = useTransform(scrollYProgress, [0, 1], [0, -150])

  return (
    <>
      <style>{`
        @keyframes athletic-grid {
          0% { transform: translate(0, 0) rotate(0deg); }
          100% { transform: translate(60px, 60px) rotate(0.5deg); }
        }
      `}</style>

      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-15"
        style={{
          backgroundImage: `
            linear-gradient(rgba(113,113,122,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(113,113,122,0.08) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          animation: "athletic-grid 25s linear infinite",
          maskImage: "radial-gradient(circle at 50% 50%, black 0%, transparent 75%)",
        }}
      />

      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div
          style={{ y: y1 }}
          className="absolute top-1/5 left-1/5 w-[320px] h-[320px] lg:w-[520px] lg:h-[520px] bg-zinc-600/8 rounded-full blur-3xl"
          animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.25, 0.1] }}
          transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
        <motion.div
          style={{ y: y2 }}
          className="absolute top-3/5 right-1/5 w-[260px] h-[260px] lg:w-[420px] lg:h-[420px] bg-gray-700/8 rounded-full blur-3xl"
          animate={{ scale: [1, 0.8, 1], opacity: [0.1, 0.25, 0.1] }}
          transition={{
            duration: 15,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: 2,
          }}
        />
        <motion.div
          style={{ y: y3 }}
          className="absolute top-1/2 left-1/2 w-[220px] h-[220px] lg:w-[320px] lg:h-[320px] bg-zinc-800/8 rounded-full blur-3xl"
          animate={{ x: [-100, 50, 100], y: [0, -30, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
      </div>
    </>
  )
}

export function ScrollProgress() {
  const { scrollYProgress } = useScroll()

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-zinc-600 via-zinc-500 to-zinc-600 transform-gpu z-50"
      style={{ scaleX: scrollYProgress, transformOrigin: "0%" }}
    />
  )
}

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => setIsVisible(window.pageYOffset > 300)
    window.addEventListener("scroll", toggleVisibility)
    return () => window.removeEventListener("scroll", toggleVisibility)
  }, [])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-20 sm:bottom-24 right-4 sm:right-8 z-50 w-11 h-11 sm:w-14 sm:h-14 bg-gradient-to-r from-zinc-600 to-zinc-700 hover:from-zinc-700 hover:to-zinc-800 text-zinc-200 rounded-full shadow-lg backdrop-blur-sm border border-zinc-500/30 flex items-center justify-center transition-all duration-300"
          whileHover={{ scale: 1.1, y: -2 }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}

export function PremiumCard({ children, className = "", delay = 0, hover = true, direction = "up", id }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })
  const directionOffset = { up: { y: 60 }, left: { x: -60 }, right: { x: 60 } }

  return (
    <motion.div
      id={id}
      ref={ref}
      initial={{ opacity: 0, scale: 0.96, ...directionOffset[direction] }}
      animate={isInView ? { opacity: 1, scale: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={hover ? { y: -6, scale: 1.005, transition: { duration: 0.25 } } : undefined}
      className={
        "relative group bg-black/40 backdrop-blur-xl border border-zinc-700/50 rounded-3xl shadow-2xl shadow-black/20 overflow-hidden " +
        className
      }
    >
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-zinc-600/20 via-zinc-500/20 to-zinc-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}

/* ---------------- Availability grid ---------------- */
export function AvailabilityGrid({ rows }) {
  const byDay = useMemo(() => {
    const m = {}
    ;(rows || []).forEach((r) => {
      ;(m[r.weekday] ||= []).push({
        start: r.start_time,
        end: r.end_time,
        online: !!r.is_online,
      })
    })
    return m
  }, [rows])

  if (Object.keys(byDay).length === 0) {
    return <p className="text-sm text-zinc-500">— Δεν έχει οριστεί —</p>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 xl:gap-5">
      {ALL_DAYS.map((d) => {
        const slots = byDay[d.key] || []
        if (slots.length === 0) return null

        return (
          <ScrollReveal key={d.key} delay={d.idx * 0.08}>
            <div className="rounded-2xl border border-zinc-700/50 bg-zinc-800/25 px-4 py-4 xl:px-5 xl:py-5 min-h-[116px]">
              <div className="text-sm text-zinc-400 mb-2">{d.label}</div>

              <div className="flex flex-col gap-2">
                {slots.map((s, idx) => (
                  <span
                    key={`${d.key}-${idx}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-700/40 text-zinc-200 text-sm"
                  >
                    {hhmm(s.start)}–{hhmm(s.end)}
                    {s.online && <Wifi className="h-3.5 w-3.5 opacity-80" />}
                  </span>
                ))}
              </div>
            </div>
          </ScrollReveal>
        )
      })}
    </div>
  )
}

/* ------------- Small star rating ------------- */
export function StarRating({ rating = 0, reviewCount = 0 }) {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full-${i}`} className="h-4 w-4 text-yellow-400 fill-current" />
      ))}

      {hasHalfStar && (
        <span className="relative inline-flex h-4 w-4">
          <Star className="h-4 w-4 text-zinc-600 fill-current absolute inset-0" />
          <span className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
          </span>
        </span>
      )}

      {[...Array(emptyStars)].map((_, i) => (
        <Star key={`empty-${i}`} className="h-4 w-4 text-zinc-600 fill-current" />
      ))}

      <span className="text-zinc-400 text-sm ml-1">
        ({reviewCount} {reviewCount === 1 ? "κριτική" : "κριτικές"})
      </span>
    </div>
  )
}

/* ------------------ Mobile Sticky Booking Button ------------------ */
export function MobileBookingButton({ onClick, hasAvailableSlots }) {
  if (!hasAvailableSlots) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[999] lg:hidden bg-black/80 backdrop-blur-xl border-t border-zinc-700/50 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pointer-events-none">
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="pointer-events-auto w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-zinc-200 bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 border border-zinc-600/50 shadow-xl backdrop-blur-xl"
      >
        <Calendar className="h-5 w-5" />
        <span className="text-base font-semibold">Κάνε κράτηση τώρα</span>
      </motion.button>
    </div>
  )
}