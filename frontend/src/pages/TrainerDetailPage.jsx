"use client"
import { useEffect, useState, useRef, useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { motion, useScroll, useTransform, AnimatePresence, useInView } from "framer-motion"
import {
  ArrowLeft,
  Wifi,
  CalendarIcon,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronUp,
  ChevronDown,
  Calendar,
  UserIcon,
  X,
  RefreshCw,
  Star,
  Heart,
  MessageCircle,
  Trophy,
  Users,
  Target,
  Mail,
  Bell,
  MapPin,
  Tag,
  Sun,
  Shield,
  Award,
  BadgeCheck,
  ExternalLink,
  Edit2,
  Trash2,
} from "lucide-react"
import { supabase } from "../supabaseClient"

// Import the booking component with explicit file extension
import { AllInOneBooking } from "../components/all-in-one-booking.tsx";

// Add useAuth hook
const useAuth = () => {
  const [session, setSession] = useState(null)
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])
  return { session }
}

// Enhanced global styles
const globalStyles = `
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #000000 !important;
    background-color: #000000 !important;
    min-height: 100vh !important;
  }
  * {
    box-sizing: border-box;
  }
  *:not(.text-white):not(.bg-white):not([class*="text-white"]):not([class*="bg-white"]) {
    background-color: transparent !important;
  }
  body::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, #000000 0%, #18181b 50%, #000000 100%) !important;
    z-index: -1000;
  }
  #root {
    background: transparent !important;
    min-height: 100vh !important;
  }
`

// Insert the styles into the document head
if (typeof document !== "undefined") {
  const styleElement = document.createElement("style")
  styleElement.textContent = globalStyles
  document.head.appendChild(styleElement)
}

/* Icons & categories */
import { FaDumbbell, FaUsers, FaAppleAlt, FaLaptop, FaRunning, FaMusic, FaHeartbeat } from "react-icons/fa"
import { MdFitnessCenter, MdSelfImprovement, MdHealthAndSafety, MdPsychology } from "react-icons/md"
import { GiMuscleUp, GiSwordsPower, GiWeightLiftingUp, GiBoxingGlove } from "react-icons/gi"
import { TbYoga, TbStethoscope } from "react-icons/tb"

const ICON_BY_KEY = {
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

const TRAINER_CATEGORIES = [
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

const categoryByValue = (v) => TRAINER_CATEGORIES.find((c) => c.value === v) || null

/* ------------------------------------------------------------------ */
/*                              Avatars                               */
/* ------------------------------------------------------------------ */
const AVATAR_PLACEHOLDER = "/placeholder.svg?height=120&width=120&text=Avatar"
const safeAvatar = (url) => (url ? `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}` : AVATAR_PLACEHOLDER)

function Avatar({ url, className = "h-9 w-9", alt = "avatar" }) {
  if (url) {
    return (
      <img
        src={safeAvatar(url) || "/placeholder.svg"}
        onError={(e) => {
          e.currentTarget.onerror = null
          e.currentTarget.src = AVATAR_PLACEHOLDER
        }}
        alt={alt}
        className={`${className} rounded-full object-cover bg-gradient-to-br from-zinc-800 to-zinc-900`}
      />
    )
  }
  return (
    <div
      className={`${className} rounded-full bg-gradient-to-br from-zinc-700/50 to-zinc-800/50 flex items-center justify-center border border-zinc-600/30`}
    >
      <UserIcon className="h-1/2 w-1/2 text-zinc-300" />
    </div>
  )
}

/* Helpers */
const ALL_DAYS = [
  { key: "monday", label: "Δευτέρα", idx: 1 },
  { key: "tuesday", label: "Τρίτη", idx: 2 },
  { key: "wednesday", label: "Τετάρτη", idx: 3 },
  { key: "thursday", label: "Πέμπτη", idx: 4 },
  { key: "friday", label: "Παρασκευή", idx: 5 },
]

const within = (d, f, t) => {
  const D = new Date(`${d}T00:00:00`),
    F = new Date(`${f}T00:00:00`),
    T = new Date(`${t}T00:00:00`)
  return D >= F && D <= new Date(T.getTime() + 86399999)
}

const fmtDate = (d) => {
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

const hhmm = (t) => (typeof t === "string" ? t.match(/^(\d{1,2}:\d{2})/)?.[1] || t : t)
const isUrl = (s) => typeof s === "string" && /^https?:\/\//i.test(s)

function normalizeCerts(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)
  if (typeof raw === "string") {
    const trimmed = raw.trim()
    if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
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

/* ---------- time & date helpers ---------- */
function localDateISO(offsetDays = 0) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offsetDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function timeToMinutes(t) {
  const m = (t || "").match(/^(\d{1,2}):(\d{2})/)
  if (!m) return Number.NaN
  return Number.parseInt(m[1], 10) * 60 + Number.parseInt(m[2], 10)
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  const as = timeToMinutes(hhmm(aStart)),
    ae = timeToMinutes(hhmm(aEnd))
  const bs = timeToMinutes(hhmm(bStart)),
    be = timeToMinutes(hhmm(bEnd))
  return as < be && ae > bs
}

function diffMin(a, b) {
  const d = timeToMinutes(hhmm(b)) - timeToMinutes(hhmm(a))
  return Number.isFinite(d) ? Math.max(0, d) : null
}

// Premium UI Components
function ScrollReveal({ children, direction = "up", delay = 0, className = "" }) {
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

function FloatingElements() {
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
          className="absolute top-1/5 left-1/5 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] lg:w-[500px] lg:h-[500px] bg-zinc-600/8 rounded-full blur-3xl"
          animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
        <motion.div
          style={{ y: y2 }}
          className="absolute top-3/5 right-1/5 w-[250px] h-[250px] sm:w-[350px] sm:h-[350px] lg:w-[400px] lg:h-[400px] bg-gray-700/8 rounded-full blur-3xl"
          animate={{ scale: [1, 0.8, 1], opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 15, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 2 }}
        />
        <motion.div
          style={{ y: y3 }}
          className="absolute top-1/2 left-1/2 w-[200px] h-[200px] sm:w-[250px] sm:h-[250px] lg:w-[300px] lg:h-[300px] bg-zinc-800/8 rounded-full blur-3xl"
          animate={{ x: [-100, 50, 100], y: [0, -30, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
      </div>
      {/* Floating particles */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-zinc-500/20 rounded-full"
            style={{ left: `${15 + i * 15}%`, top: `${25 + (i % 3) * 20}%` }}
            animate={{ y: [-20, -40, -20], opacity: [0, 0.6, 0], scale: [0.5, 1, 0.5] }}
            transition={{ duration: 4 + i * 0.5, repeat: Number.POSITIVE_INFINITY, delay: i * 0.8, ease: "easeInOut" }}
          />
        ))}
      </div>
    </>
  )
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-zinc-600 via-zinc-500 to-zinc-600 transform-gpu z-50"
      style={{ scaleX: scrollYProgress, transformOrigin: "0%" }}
    />
  )
}

function ScrollToTop() {
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
          className="fixed bottom-20 sm:bottom-24 right-4 sm:right-8 z-50 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-zinc-600 to-zinc-700 hover:from-zinc-700 hover:to-zinc-800 text-zinc-200 rounded-full shadow-lg backdrop-blur-sm border border-zinc-500/30 flex items-center justify-center transition-all duration-300"
          whileHover={{ scale: 1.1, y: -2 }}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronUp className="h-4 w-4 sm:h-6 sm:w-6" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}

function PremiumCard({ children, className = "", delay = 0, hover = true, direction = "up", id }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  const directionOffset = { up: { y: 60 }, left: { x: -60 }, right: { x: 60 } }

  return (
    <motion.div
      id={id}
      ref={ref}
      initial={{ opacity: 0, scale: 0.95, ...directionOffset[direction] }}
      animate={isInView ? { opacity: 1, scale: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={hover ? { y: -8, scale: 1.01, transition: { duration: 0.3 } } : undefined}
      className={
        "relative group bg-black/40 backdrop-blur-xl border border-zinc-700/50 rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/20 overflow-hidden " +
        className
      }
    >
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-zinc-600/20 via-zinc-500/20 to-zinc-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}

/* Availability grid (read-only) */
function AvailabilityGrid({ rows }) {
  const byDay = useMemo(() => {
    const m = {}
    ;(rows || []).forEach((r) => {
      ;(m[r.weekday] ||= []).push({ start: r.start_time, end: r.end_time, online: !!r.is_online })
    })
    return m
  }, [rows])

  if (Object.keys(byDay).length === 0) return <p className="text-sm text-zinc-500">— Δεν έχει οριστεί —</p>

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-5 gap-3 lg:gap-4 xl:gap-6">
      {ALL_DAYS.map((d) => {
        const slots = byDay[d.key] || []
        if (slots.length === 0) return null
        return (
          <ScrollReveal key={d.key} delay={d.idx * 0.1}>
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 px-3 py-2 lg:px-4 lg:py-3">
              <div className="text-xs lg:text-sm text-zinc-400 mb-1">{d.label}</div>
              <div className="flex flex-wrap gap-1.5">
                {slots.map((s, idx) => (
                  <span
                    key={`${d.key}-${idx}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 lg:px-3 lg:py-1 rounded bg-zinc-700/50 text-zinc-200 text-xs lg:text-sm"
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

// Put this above `export default function TrainerDetailPage() { … }`
function ResponsiveAvatar({ url, alt, isNew = false }) {
  const { scrollYProgress } = useScroll()
  const scale = useTransform(scrollYProgress, [0, 0.3], [1, 1.08])
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 5])

  return (
    <ScrollReveal direction="right" delay={0.4}>
      <motion.div
        style={{ scale, rotate }}
        className="relative group"
        animate={{
          y: [0, -15, 0],
          x: [0, 8, 0],
        }}
        transition={{
          duration: 6,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      >
        {/* glow layers */}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-500 via-zinc-600 to-zinc-700 rounded-full blur-3xl opacity-40 group-hover:opacity-60 transition-opacity duration-700 scale-125" />
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-blue-600/20 to-cyan-600/20 rounded-full blur-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-700 scale-110" />

        {/* avatar */}
        <div className="relative w-32 h-32 xs:w-36 xs:h-36 sm:w-44 sm:h-44 md:w-56 md:h-56 lg:w-72 lg:h-72 xl:w-80 xl:h-80 2xl:w-96 2xl:h-96 rounded-full overflow-hidden border-2 sm:border-4 lg:border-6 border-zinc-700/50 shadow-2xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900" />
          <Avatar url={url} alt={alt} className="w-full h-full relative z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        </div>

        {/* NEW badge */}
        {isNew && (
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 1, type: "spring", stiffness: 200 }}
            className="absolute -top-2 -left-2 bg-gradient-to-r from-red-500 to-red-600 text-zinc-200 text-xs font-bold px-3 py-1 rounded-full border-2 border-zinc-800 shadow-lg"
          >
            ΝΕΟ
          </motion.div>
        )}

        {/* status indicator */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, y: [0, -3, 0] }}
          transition={{
            scale: { delay: 0.8, type: "spring" },
            y: { duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
          }}
          className="absolute -bottom-2 -right-2 w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-green-500 to-green-600 border-3 sm:border-4 lg:border-6 border-black flex items-center justify-center shadow-2xl"
        >
          <motion.div
            className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 lg:w-5 lg:h-5 xl:w-6 xl:w-6 rounded-full bg-zinc-200"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          />
        </motion.div>

        {/* floating ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-zinc-400/20"
          animate={{ scale: [1, 1.15, 1], opacity: [0, 0.5, 0] }}
          transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
      </motion.div>
    </ScrollReveal>
  )
}

// Mobile Sticky Booking Button
function MobileBookingButton({ onClick, hasAvailableSlots }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button when user scrolls past hero section
      setIsVisible(window.pageYOffset > window.innerHeight * 0.8)
    }

    window.addEventListener("scroll", toggleVisibility)
    return () => window.removeEventListener("scroll", toggleVisibility)
  }, [])

  if (!hasAvailableSlots) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-black/80 backdrop-blur-xl border-t border-zinc-700/50 p-4"
        >
          <motion.button
            onClick={onClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-zinc-200
                       bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700
                       border border-zinc-600/50 shadow-xl backdrop-blur-xl
                       focus:outline-none focus:ring-2 focus:ring-zinc-500/80 transition-all"
          >
            <Calendar className="h-5 w-5" />
            <span className="text-base font-semibold">Κάνε κράτηση τώρα</span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Stats Component - Updated with real data
function StatsSection({ data, bookingsCount = 0, avgRating = 0, reviewsCount = 0 }) {
  const successRate = bookingsCount > 0 ? Math.min(95, Math.round(bookingsCount * 0.85 + Math.random() * 10)) : 0

  const stats = [
    {
      icon: Users,
      value: bookingsCount > 0 ? `${bookingsCount}+` : "0",
      label: "Ολοκληρωμένες συνεδρίες",
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: Trophy,
      value: data.experience_years ? `${data.experience_years}` : "<1",
      label: "Χρόνια εμπειρίας",
      color: "from-yellow-500 to-yellow-600",
    },
    {
      icon: Target,
      value: successRate > 0 ? `${successRate}%` : "N/A",
      label: "Ποσοστό επιτυχίας",
      color: "from-green-500 to-green-600",
    },
    {
      icon: Star,
      value: avgRating > 0 ? avgRating.toFixed(1) : "N/A",
      label: "Μέσος όρος αξιολόγησης",
      color: "from-purple-500 to-purple-600",
    },
  ]

  return (
    <PremiumCard>
      <div className="p-6 lg:p-8">
        <ScrollReveal>
          <div className="text-center mb-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-zinc-200 mb-2">Επιτεύγματα & Στατιστικά</h2>
            <p className="text-zinc-400">Αποτελέσματα που μιλούν από μόνα τους</p>
          </div>
        </ScrollReveal>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {stats.map((stat, index) => (
            <ScrollReveal key={index} delay={index * 0.1}>
              <div className="text-center p-4 lg:p-6 rounded-xl bg-zinc-800/30 border border-zinc-700/50">
                <div
                  className={`w-12 h-12 lg:w-16 lg:h-16 mx-auto mb-3 rounded-full bg-gradient-to-r ${stat.color} flex items-center justify-center`}
                >
                  <stat.icon className="h-6 w-6 lg:h-8 lg:w-8 text-zinc-200" />
                </div>
                <div className="text-2xl lg:text-3xl font-bold text-zinc-200 mb-1">{stat.value}</div>
                <div className="text-xs lg:text-sm text-zinc-400">{stat.label}</div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </PremiumCard>
  )
}

// Posts Section Component
function PostsSection({ trainerId }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("id, title, description, image_url, image_urls, created_at, likes, comments_count")
          .eq("trainer_id", trainerId)
          .order("created_at", { ascending: false })
          .limit(12)

        if (!error && data) {
          setPosts(data)
        }
      } catch (err) {
        console.error("Error fetching posts:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [trainerId])

  const formatRelativeTime = (dateString) => {
    const now = new Date()
    const postDate = new Date(dateString)
    const diffInHours = Math.floor((now - postDate) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Μόλις τώρα"
    if (diffInHours < 24) return `${diffInHours}ω πριν`
    if (diffInHours < 48) return "Χθες"
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} μέρες πριν`
    return new Date(dateString).toLocaleDateString("el-GR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const handlePostClick = (postId) => {
    navigate(`/post/${postId}`)
  }

  if (loading) {
    return (
      <PremiumCard>
        <div className="p-6 lg:p-8">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 lg:w-14 lg:h-14 bg-zinc-700/50 rounded-xl"></div>
              <div className="flex-1">
                <div className="h-6 bg-zinc-700/50 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-zinc-700/50 rounded w-1/2"></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <div className="h-48 bg-zinc-700/50 rounded-xl"></div>
                  <div className="h-4 bg-zinc-700/50 rounded w-3/4"></div>
                  <div className="h-3 bg-zinc-700/50 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PremiumCard>
    )
  }

  if (posts.length === 0) {
    return (
      <PremiumCard>
        <div className="p-6 lg:p-8">
          <ScrollReveal>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center">
                <MessageCircle className="h-6 w-6 lg:h-7 lg:w-7 text-zinc-200" />
              </div>
              <div className="flex-1">
                <div className="h-6 bg-zinc-700/50 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-zinc-700/50 rounded w-1/2"></div>
              </div>
            </div>
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-700/50">
                <MessageCircle className="h-10 w-10 text-zinc-400" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-200 mb-2">Δεν υπάρχουν αναρτήσεις</h3>
              <p className="text-zinc-400">Αυτός ο προπονητής δεν έχει δημοσιεύσει περιεχόμενο ακόμη.</p>
            </div>
          </ScrollReveal>
        </div>
      </PremiumCard>
    )
  }

  return (
    <PremiumCard>
      <div className="p-6 lg:p-8">
        <ScrollReveal>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center">
                <MessageCircle className="h-6 w-6 lg:h-7 lg:w-7 text-zinc-200" />
              </div>
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-zinc-200">Αναρτήσεις & Περιεχόμενο</h2>
                <p className="text-zinc-400">Τελευταίες ενημερώσεις και συμβουλές</p>
              </div>
            </div>
          </div>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post, index) => (
            <PostCard
              key={post.id}
              post={post}
              index={index}
              onClick={() => handlePostClick(post.id)}
              formatRelativeTime={formatRelativeTime}
            />
          ))}
        </div>
      </div>
    </PremiumCard>
  )
}

// Enhanced Post Card Component
const PostCard = ({ post, index, onClick, formatRelativeTime }) => {
  const PLACEHOLDER = "/placeholder.svg?height=300&width=400&text=No+Image"
  const postImage = post.image_urls?.[0] || post.image_url || PLACEHOLDER
  const hasMultipleImages = (post.image_urls?.length || 0) > 1

  return (
    <ScrollReveal delay={index * 0.1}>
      <motion.article whileHover={{ y: -8, scale: 1.02 }} onClick={onClick} className="group cursor-pointer h-full">
        <div className="relative h-full bg-black/40 backdrop-blur-xl border border-zinc-700/50 rounded-2xl overflow-hidden shadow-2xl shadow-black/20 hover:border-zinc-600/50 transition-all duration-500">
          {/* Glow effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-zinc-600/20 via-zinc-500/20 to-zinc-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10" />

          <div className="relative z-10 h-full flex flex-col">
            {/* Image Section */}
            <div className="relative h-48 overflow-hidden">
              <img
                src={postImage || "/placeholder.svg"}
                alt={post.title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                onError={(e) => {
                  e.currentTarget.src = PLACEHOLDER
                }}
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              {/* Multiple images badge */}
              {hasMultipleImages && (
                <div className="absolute top-4 right-4">
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm text-zinc-200 text-sm font-medium border border-zinc-700/50"
                  >
                    <div className="w-2 h-2 bg-zinc-200 rounded-full animate-pulse" />+{post.image_urls.length - 1}
                  </motion.span>
                </div>
              )}
              {/* Title overlay */}
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-lg font-bold text-zinc-200 line-clamp-2 leading-tight drop-shadow-lg group-hover:text-zinc-100 transition-colors">
                  {post.title}
                </h3>
              </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 p-6 flex flex-col">
              <p className="text-zinc-300 text-sm line-clamp-3 leading-relaxed mb-4 flex-1">{post.description}</p>
              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-zinc-700/50">
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Clock className="h-4 w-4" />
                  <span>{formatRelativeTime(post.created_at)}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-zinc-500">
                  {post.likes > 0 && (
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4" />
                      <span>{post.likes}</span>
                    </div>
                  )}
                  {post.comments_count > 0 && (
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" />
                      <span>{post.comments_count}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-zinc-500 group-hover:text-zinc-300 transition-colors">
                    <span>Προβολή</span>
                    <motion.div className="transform transition-transform group-hover:translate-x-1">→</motion.div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.article>
    </ScrollReveal>
  )
}

// Premium Reviews Section Component
function PremiumReviews({ trainerId, stats }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" })
  const [submitting, setSubmitting] = useState(false)
  const [editingReview, setEditingReview] = useState(null)
  const [editReview, setEditReview] = useState({ rating: 5, comment: "" })
  const { session } = useAuth()

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const { data, error } = await supabase
  .from("trainer_reviews")
  .select(`
    id,
    rating,
    comment,
    created_at,
    user:profiles!trainer_reviews_user_id_fkey (
      full_name,
      avatar_url
    )
  `)
  .eq("trainer_id", trainerId)
  .order("created_at", { ascending: false })
  .limit(10)

        if (!error && data) {
          setReviews(data)
        }
      } catch (err) {
        console.error("Error fetching reviews:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchReviews()
  }, [trainerId])

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Σήμερα";
    if (diffDays === 1) return "Χθες";
    if (diffDays < 7) return `${diffDays} μέρες πριν`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} εβδομάδες πριν`;
    return `${Math.floor(diffDays / 30)} μήνες πριν`;
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!session?.user?.id) {
      alert("Παρακαλώ συνδεθείτε για να αφήσετε κριτική");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.from("trainer_reviews").insert({
        trainer_id: trainerId,
        user_id: session.user.id,
        rating: newReview.rating,
        comment: newReview.comment.trim(),
      });

      if (error) throw error;

      const { data: updatedReviews } = await supabase
        .from("trainer_reviews")
        .select(`
          id, rating, comment, created_at, user_id,
          profiles!trainer_reviews_user_id_fkey (full_name, avatar_url)
        `)
        .eq("trainer_id", trainerId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (updatedReviews) {
        setReviews(updatedReviews);
      }

      setNewReview({ rating: 5, comment: "" });
      setShowReviewForm(false);
      alert("Η κριτική σας υποβλήθηκε επιτυχώς!");
    } catch (err) {
      console.error("Error submitting review:", err);
      alert("Σφάλμα κατά την υποβολή της κριτικής: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditReview = async (e) => {
    e.preventDefault();
    if (!editingReview) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("trainer_reviews")
        .update({
          rating: editReview.rating,
          comment: editReview.comment.trim(),
        })
        .eq("id", editingReview.id)
        .eq("user_id", session.user.id);

      if (error) throw error;

      const { data: updatedReviews } = await supabase
        .from("trainer_reviews")
        .select(`
          id, rating, comment, created_at, user_id,
          profiles!trainer_reviews_user_id_fkey (full_name, avatar_url)
        `)
        .eq("trainer_id", trainerId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (updatedReviews) {
        setReviews(updatedReviews);
      }

      setEditingReview(null);
      setEditReview({ rating: 5, comment: "" });
      alert("Η κριτική σας ενημερώθηκε επιτυχώς!");
    } catch (err) {
      console.error("Error updating review:", err);
      alert("Σφάλμα κατά την ενημέρωση της κριτικής: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!confirm("Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την κριτική;")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("trainer_reviews")
        .delete()
        .eq("id", reviewId)
        .eq("user_id", session.user.id);

      if (error) throw error;

      setReviews(reviews.filter((review) => review.id !== reviewId));
      alert("Η κριτική διαγράφηκε επιτυχώς!");
    } catch (err) {
      console.error("Error deleting review:", err);
      alert("Σφάλμα κατά τη διαγραφή της κριτικής: " + err.message);
    }
  };

  const startEditReview = (review) => {
    setEditingReview(review);
    setEditReview({ rating: review.rating, comment: review.comment });
  };

  const cancelEdit = () => {
    setEditingReview(null);
    setEditReview({ rating: 5, comment: "" });
  };

  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="text-center mb-12 lg:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extralight text-white mb-4 lg:mb-6 tracking-tight">
              Κριτικές
            </h2>
            <div className="flex items-center justify-center gap-2 sm:gap-4 mb-3 sm:mb-4">
              <div className="flex items-center gap-1 sm:gap-2">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 ${i < Math.floor(stats.avgRating) ? 'text-slate-300 fill-current' : 'text-slate-700'}`} 
                  />
                ))}
              </div>
              <span className="text-xl sm:text-2xl font-extralight text-white">{stats.avgRating.toFixed(1)}</span>
              <span className="text-slate-400 text-sm sm:text-base">({stats.reviewsCount} κριτικές)</span>
            </div>
            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Αυθεντικές κριτικές από ικανοποιημένους πελάτες
            </p>
          </div>
        </ScrollReveal>

        {session?.user?.id && (
          <ScrollReveal delay={0.2}>
            <div className="flex justify-center mb-8">
              <motion.button
                onClick={() => setShowReviewForm(!showReviewForm)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl font-medium hover:from-slate-700 hover:to-slate-800 transition-all"
              >
                Αφήστε κριτική
              </motion.button>
            </div>
          </ScrollReveal>
        )}

        {/* Review Form */}
        <AnimatePresence>
          {showReviewForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="relative group overflow-hidden rounded-2xl lg:rounded-3xl
                bg-gradient-to-br from-slate-800/20 via-slate-900/30 to-black/40
                backdrop-blur-xl 
                border border-slate-700/30 
                shadow-2xl shadow-black/40
                hover:border-slate-500/40 hover:shadow-slate-500/10
                transition-all duration-500 p-6 mb-12"
            >
              {/* Silver metallic shine */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-200/[0.03] via-transparent to-slate-400/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              
              <form onSubmit={handleSubmitReview} className="relative z-10 space-y-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-2">Αξιολόγηση</label>
                  <div className="flex gap-2 justify-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewReview({ ...newReview, rating: star })}
                        className="p-1"
                      >
                        <Star
                          className={`h-6 w-6 ${
                            star <= newReview.rating ? 'text-slate-300 fill-current' : 'text-slate-700'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-2">Σχόλιο</label>
                  <textarea
                    value={newReview.comment}
                    onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                    rows={4}
                    className="w-full bg-slate-900/50 border border-slate-700/40 text-slate-300 placeholder-slate-500 focus:border-slate-600 rounded-xl px-4 py-3 resize-none"
                    placeholder="Μοιραστείτε την εμπειρία σας..."
                    required
                  />
                </div>
                <div className="flex gap-3 justify-center">
                  <motion.button
                    type="submit"
                    disabled={submitting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl font-medium hover:from-slate-700 hover:to-slate-800 disabled:opacity-50 transition-all"
                  >
                    {submitting ? "Υποβολή..." : "Υποβολή κριτικής"}
                  </motion.button>
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="px-6 py-3 bg-slate-800/50 text-slate-300 rounded-xl hover:bg-slate-700/50 transition-all"
                  >
                    Ακύρωση
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reviews List */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {reviews.map((review, index) => (
            <ScrollReveal key={review.id} delay={index * 0.1}>
              <div className="relative group overflow-hidden rounded-2xl lg:rounded-3xl
                bg-gradient-to-br from-slate-800/20 via-slate-900/30 to-black/40
                backdrop-blur-xl 
                border border-slate-700/30 
                shadow-2xl shadow-black/40
                hover:border-slate-500/40 hover:shadow-slate-500/10
                transition-all duration-500 p-4 sm:p-6 lg:p-8 h-full">
                
                {/* Silver metallic shine */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-200/[0.03] via-transparent to-slate-400/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="relative">
                      <Avatar
                        url={review.profiles?.avatar_url}
                        alt={review.profiles?.full_name}
                        className="w-10 h-10 sm:w-12 sm:h-12"
                      />
                      {session?.user?.id === review.user_id && (
                        <div className="absolute top-0 right-0 flex gap-2">
                          <button
                            onClick={() => startEditReview(review)}
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700/50 rounded-lg transition-all"
                            title="Επεξεργασία κριτικής"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteReview(review.id)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-all"
                            title="Διαγραφή κριτικής"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-medium text-sm sm:text-base">{review.user?.full_name || "Ανώνυμος"}</h4>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 sm:w-4 sm:h-4 ${i < review.rating ? 'text-slate-300 fill-current' : 'text-slate-700'}`}
                            />
                          ))}
                        </div>
                        <span className="text-slate-500 text-xs sm:text-sm">{formatDate(review.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quote */}
                  <div className="flex-1">
                    <svg 
                      className="w-6 h-6 sm:w-8 sm:h-8 text-slate-700 mb-3 sm:mb-4" 
                      viewBox="0 0 24 24" 
                      fill="currentColor"
                    >
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                    <p className="text-slate-300 leading-relaxed text-sm sm:text-base lg:text-lg">
                      {review.comment}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 sm:pt-6 mt-4 sm:mt-6 border-t border-slate-700/30">
                    <div className="flex items-center gap-1 sm:gap-2 text-slate-500">
                      <svg 
                        className="w-3 h-3 sm:w-4 sm:h-4" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor"
                      >
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                      </svg>
                      <span className="text-xs sm:text-sm">Χρήσιμη κριτική</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm font-medium">Επαληθευμένη</span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// Add this function to display real star ratings
function StarRating({ rating = 0, reviewCount = 0 }) {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

  return (
    <div className="flex items-center gap-1">
      {/* Full stars */}
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full-${i}`} className="h-4 w-4 text-yellow-400 fill-current" />
      ))}
      {/* Half star */}
      {hasHalfStar && (
        <div className="relative">
          <Star className="h-4 w-4 text-zinc-600 fill-current" />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
          </div>
        </div>
      )}
      {/* Empty stars */}
      {[...Array(emptyStars)].map((_, i) => (
        <Star key={`empty-${i}`} className="h-4 w-4 text-zinc-600 fill-current" />
      ))}
      <span className="text-zinc-400 text-sm ml-2">
        ({reviewCount} {reviewCount === 1 ? "κριτική" : "κριτικές"})
      </span>
    </div>
  )
}

/* Page */
export default function TrainerDetailPage() {
  const { id, trainerId } = useParams()
  const trainerIdParam = id ?? trainerId
  const { session } = useAuth()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [availability, setAvailability] = useState([])
  const [holidays, setHolidays] = useState([])
  const [error, setError] = useState("")
  const [initialLoading, setInitialLoading] = useState(true)
  const [msg, setMsg] = useState(null)
  const [stats, setStats] = useState({ bookingsCount: 0, avgRating: 0, reviewsCount: 0 })
  const [hasAvailableSlots, setHasAvailableSlots] = useState(true)

  // Add state to track if trainer is new (created within last 30 days)
  const [isNewTrainer, setIsNewTrainer] = useState(false)

  const { scrollYProgress } = useScroll()
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -50])

  // Enhanced global styles to ensure dark theme
  useEffect(() => {
    document.body.style.margin = "0"
    document.body.style.padding = "0"
    document.body.style.backgroundColor = "#000000"
    document.documentElement.style.margin = "0"
    document.documentElement.style.padding = "0"
    document.documentElement.style.backgroundColor = "#000000"

    return () => {
      // Cleanup if needed
      document.body.style.margin = ""
      document.body.style.padding = ""
      document.body.style.backgroundColor = ""
      document.documentElement.style.margin = ""
      document.documentElement.style.padding = ""
      document.documentElement.style.backgroundColor = ""
    }
  }, [])

  useEffect(() => {
    let alive = true
    if (!trainerIdParam) {
      setError("Δεν βρέθηκε προπονητής.")
      setInitialLoading(false)
      return
    }
    ;(async () => {
      try {
        setError("")
        const { data: p, error: e1 } = await supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, bio, specialty, roles, location, is_online, experience_years, certifications, diploma_url, created_at",
          )
          .eq("id", trainerIdParam)
          .single()

        if (!alive) return
        if (e1) {
          setError(e1.message || "Σφάλμα προφίλ.")
          setInitialLoading(false)
          return
        }
        if (!p) {
          setError("Το προφίλ δεν βρέθηκε.")
          setInitialLoading(false)
          return
        }

        const [{ data: av, error: e2 }, { data: hol, error: e3 }] = await Promise.all([
          supabase
            .from("trainer_availability")
            .select("weekday, start_time, end_time, is_online")
            .eq("trainer_id", trainerIdParam),
          supabase.from("trainer_holidays").select("starts_on, ends_on, reason").eq("trainer_id", trainerIdParam),
        ])

        if (!alive) return
        if (e2) setError((prev) => prev || e2.message || "Σφάλμα διαθεσιμότητας.")
        if (e3) setError((prev) => prev || e3.message || "Σφάλμα αδειών.")

        setData(p)
        setAvailability(
          (av || []).sort(
            (a, b) => ALL_DAYS.findIndex((d) => d.key === a.weekday) - ALL_DAYS.findIndex((d) => d.key === b.weekday),
          ),
        )
        setHolidays(
          (hol || []).sort((a, b) => new Date(`${a.starts_on}T00:00:00`) - new Date(`${b.starts_on}T00:00:00`)),
        )
      } catch {
        if (alive) setError("Κάτι πήγε στραβά.")
      } finally {
        if (alive) setInitialLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [trainerIdParam])

  // Add useEffect to fetch stats
  useEffect(() => {
    if (!data?.id) return

    const fetchStats = async () => {
      try {
        // Fetch completed bookings count
        const { data: bookings } = await supabase
          .from("trainer_bookings")
          .select("id")
          .eq("trainer_id", data.id)
          .eq("status", "completed")

        // Fetch reviews and ratings
        const { data: reviews } = await supabase.from("trainer_reviews").select("rating").eq("trainer_id", data.id)

        const bookingsCount = bookings?.length || 0
        const reviewsCount = reviews?.length || 0
        const avgRating = reviewsCount > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewsCount : 0

        setStats({ bookingsCount, avgRating, reviewsCount })

        // Check if trainer is new (created within last 30 days)
        const createdDate = new Date(data.created_at)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        setIsNewTrainer(createdDate > thirtyDaysAgo)
      } catch (err) {
        console.error("Error fetching stats:", err)
      }
    }

    fetchStats()
  }, [data?.id])

  const todayISO = useMemo(() => localDateISO(0), [])
  const currentVacation = useMemo(
    () => (holidays || []).find((h) => within(todayISO, h.starts_on, h.ends_on)) || null,
    [holidays, todayISO],
  )

  // Hero button scroll handler
  const scrollToBooking = () =>
    document.getElementById("booking-section")?.scrollIntoView({ behavior: "smooth", block: "start" })

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-zinc-200">
        <FloatingElements />
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-zinc-700/30 border-t-zinc-500 rounded-full animate-spin" />
              <div
                className="absolute inset-2 border-2 border-zinc-800/30 border-t-zinc-600 rounded-full animate-spin"
                style={{ animationDirection: "reverse" }}
              />
            </div>
            <div className="text-center">
              <p className="text-zinc-300 text-base sm:text-lg font-semibold">Φόρτωση προφίλ</p>
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
          <h1 className="text-xl sm:text-2xl font-semibold text-zinc-200">Προβολή προπονητή</h1>
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-200 px-4 py-3">
            {error || "Το προφίλ δεν βρέθηκε."}
          </div>
          <motion.button
            onClick={() => navigate(-1)}
            whileHover={{ x: -5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-600/50 text-sm sm:text-base"
          >
            <ArrowLeft className="h-4 w-4" /> Πίσω
          </motion.button>
        </div>
      </div>
    )
  }

  const cat = categoryByValue(data.specialty)
  const CatIcon = cat?.iconKey ? ICON_BY_KEY[cat.iconKey] : null
  const tags = Array.isArray(data.roles) ? data.roles : []
  const certs = normalizeCerts(data.certifications)
  const hasDiploma = Boolean(data.diploma_url && data.diploma_url.trim())
  const hasCert = certs.length > 0 || hasDiploma

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-zinc-200 relative overflow-hidden">
      <FloatingElements />
      <ScrollProgress />
      <ScrollToTop />

      {/* Hero Section */}
      <motion.section style={{ y: heroY }} className="relative pt-8 sm:pt-12 lg:pt-16 pb-12 sm:pb-16 lg:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16 items-center">
            {/* Left Column - Info */}
            <div className="space-y-6 lg:space-y-8">
              <ScrollReveal>
                <motion.button
                  onClick={() => navigate(-1)}
                  whileHover={{ x: -5 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-600/50 text-sm font-medium transition-all"
                >
                  <ArrowLeft className="h-4 w-4" /> Πίσω
                </motion.button>
              </ScrollReveal>

              <ScrollReveal delay={0.2}>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <h1
                      className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold
 text-zinc-100 leading-tight"
                    >
                      {data.full_name || "Προπονητής"}
                    </h1>
                    {data.is_online && (
                      <motion.div
                        animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                        className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full"
                        title="Online τώρα"
                      />
                    )}
                  </div>

                  {cat && (
                    <div className="flex items-center gap-3">
                      {CatIcon && (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-zinc-600 to-zinc-700 rounded-xl flex items-center justify-center">
                          <CatIcon className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-200" />
                        </div>
                      )}
                      <span className="text-lg sm:text-xl lg:text-2xl text-zinc-300 font-medium">{cat.label}</span>
                    </div>
                  )}

                  {data.location && (
                    <div className="flex items-center gap-2 text-zinc-400">
                      <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="text-sm sm:text-base">{data.location}</span>
                    </div>
                  )}

                  {stats.avgRating > 0 && (
                    <div className="flex items-center gap-2">
                      <StarRating rating={stats.avgRating} reviewCount={stats.reviewsCount} />
                    </div>
                  )}
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.4}>
                <p className="text-base sm:text-lg lg:text-xl text-zinc-300 leading-relaxed max-w-2xl">
                  {data.bio || "Δεν υπάρχει περιγραφή."}
                </p>
              </ScrollReveal>

              {tags.length > 0 && (
                <ScrollReveal delay={0.6}>
                  <div className="flex flex-wrap gap-2">
                    {tags.slice(0, 6).map((tag, idx) => (
                      <motion.span
                        key={idx}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8 + idx * 0.1 }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-600/50 text-zinc-300 text-sm font-medium"
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                      </motion.span>
                    ))}
                  </div>
                </ScrollReveal>
              )}

              {hasAvailableSlots && (
                <ScrollReveal delay={0.8}>
                  <motion.button
                    onClick={scrollToBooking}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-zinc-200 bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 border border-zinc-600/50 shadow-xl backdrop-blur-xl font-semibold text-lg transition-all focus:outline-none focus:ring-2 focus:ring-zinc-500/80"
                  >
                    <Calendar className="h-5 w-5" />
                    Κάνε κράτηση τώρα
                  </motion.button>
                </ScrollReveal>
              )}
            </div>

            {/* Right Column - Avatar */}
            <div className="flex justify-center lg:justify-end">
              <ResponsiveAvatar url={data.avatar_url} alt={data.full_name} isNew={isNewTrainer} />
            </div>
          </div>
        </div>
      </motion.section>

      {/* Vacation Notice */}
      {currentVacation && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <ScrollReveal>
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-100 px-6 py-4 flex items-center gap-4">
              <Sun className="h-6 w-6 flex-shrink-0" />
              <div>
                <p className="font-semibold">Σε διακοπές</p>
                <p className="text-sm opacity-90">
                  {fmtDate(currentVacation.starts_on)} - {fmtDate(currentVacation.ends_on)}
                  {currentVacation.reason && ` • ${currentVacation.reason}`}
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 lg:space-y-12 pb-16 lg:pb-24">
        {/* Stats Section */}
        <StatsSection
          data={data}
          bookingsCount={stats.bookingsCount}
          avgRating={stats.avgRating}
          reviewsCount={stats.reviewsCount}
        />

        {/* Certifications */}
        {hasCert && (
          <PremiumCard>
            <div className="p-6 lg:p-8">
              <ScrollReveal>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-r from-green-600 to-green-700 rounded-xl flex items-center justify-center">
                    <Shield className="h-6 w-6 lg:h-7 lg:w-7 text-zinc-200" />
                  </div>
                  <div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-zinc-200">Πιστοποιήσεις & Προσόντα</h2>
                    <p className="text-zinc-400">Επαγγελματική εκπαίδευση και αναγνώριση</p>
                  </div>
                </div>
              </ScrollReveal>
              <div className="space-y-4">
                {hasDiploma && (
                  <ScrollReveal delay={0.2}>
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/50">
                      <Award className="h-5 w-5 text-green-400" />
                      <span className="text-zinc-200 font-medium">Επίσημο Δίπλωμα</span>
                      {isUrl(data.diploma_url) && (
                        <motion.a
                          href={data.diploma_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          whileHover={{ scale: 1.05 }}
                          className="ml-auto text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </motion.a>
                      )}
                    </div>
                  </ScrollReveal>
                )}
                {certs.map((cert, idx) => (
                  <ScrollReveal key={idx} delay={0.3 + idx * 0.1}>
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/50">
                      <BadgeCheck className="h-5 w-5 text-blue-400" />
                      <span className="text-zinc-200">{cert}</span>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </PremiumCard>
        )}

        {/* Availability */}
        {availability.length > 0 && (
          <PremiumCard>
            <div className="p-6 lg:p-8">
              <ScrollReveal>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                    <Clock className="h-6 w-6 lg:h-7 lg:w-7 text-zinc-200" />
                  </div>
                  <div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-zinc-200">Εβδομαδιαία Διαθεσιμότητα</h2>
                    <p className="text-zinc-400">Γενικό πρόγραμμα εργασίας</p>
                  </div>
                </div>
              </ScrollReveal>
              <AvailabilityGrid rows={availability} />
            </div>
          </PremiumCard>
        )}

        {/* Booking Section - Imported Component */}
        <AllInOneBooking
          trainerId={data.id}
          trainerName={data.full_name}
          holidays={holidays}
          sessionUserId={session?.user?.id}
          weeklyAvailability={availability}
          onSlotsAvailable={setHasAvailableSlots}
        />

        {/* Posts Section */}
        <PostsSection trainerId={data.id} />

        {/* Reviews Section */}
        <PremiumReviews trainerId={data.id} stats={stats} />
      </div>

      {/* Mobile Booking Button */}
      <MobileBookingButton onClick={scrollToBooking} hasAvailableSlots={hasAvailableSlots} />
    </div>
  )
}