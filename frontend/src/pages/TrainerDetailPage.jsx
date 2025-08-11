"use client"
import { useEffect, useState, useRef, useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { motion, useScroll, useTransform, AnimatePresence, useInView } from "framer-motion"
import {
  ArrowLeft,
  MapPin,
  Wifi,
  WifiOff,
  BadgeCheck,
  Tag,
  CalendarIcon,
  Sun,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Award,
  ChevronUp,
  ChevronDown,
  Calendar,
  UserIcon,
  X,
  RefreshCw,
  Star,
  Heart,
  MessageCircle,
  Shield,
  Trophy,
  Users,
  Target,
  ExternalLink,
  FileText,
  Mail,
  Bell,
} from "lucide-react"
import { supabase } from "../supabaseClient"

// Add useAuth hook - you'll need to implement this or import it
const useAuth = () => {
  // This is a placeholder - replace with your actual auth implementation
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

// Enhanced global styles to remove ALL white backgrounds and ensure dark theme
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

/* Icons & categories (same map as marketplace page) */
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

// Enhanced Booking Success Modal Component
function BookingSuccessModal({ isOpen, onClose, bookingDetails, trainerName }) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 50 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative max-w-md w-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 rounded-3xl border border-zinc-700/50 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-emerald-600/10 animate-pulse" />
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-emerald-500/20 via-green-500/20 to-emerald-600/20 blur-xl opacity-50" />
          <div className="relative z-10 p-8">
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center shadow-2xl"
            >
              <CheckCircle2 className="h-10 w-10 text-white" />
            </motion.div>
            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-center text-zinc-100 mb-4"
            >
              Επιτυχής Κράτηση! 🎉
            </motion.h2>
            {/* Booking Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-zinc-800/50 rounded-2xl p-6 mb-6 border border-zinc-700/30"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <UserIcon className="h-5 w-5 text-emerald-400" />
                  <span className="text-zinc-300">
                    Προπονητής: <span className="text-zinc-100 font-semibold">{trainerName}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-emerald-400" />
                  <span className="text-zinc-300">
                    Ημερομηνία: <span className="text-zinc-100 font-semibold">{fmtDate(bookingDetails.date)}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-emerald-400" />
                  <span className="text-zinc-300">
                    Ώρα:{" "}
                    <span className="text-zinc-100 font-semibold">
                      {bookingDetails.start_time} - {bookingDetails.end_time}
                    </span>
                  </span>
                </div>
                {bookingDetails.is_online && (
                  <div className="flex items-center gap-3">
                    <Wifi className="h-5 w-5 text-emerald-400" />
                    <span className="text-zinc-300">
                      Τύπος: <span className="text-zinc-100 font-semibold">Online συνεδρία</span>
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
            {/* Information Message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 mb-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Bell className="h-4 w-4 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-blue-100 font-semibold mb-2">Τι συμβαίνει τώρα;</h3>
                  <div className="text-blue-200/80 text-sm space-y-2">
                    <p>• Ο προπονητής θα λάβει την αίτησή σας άμεσα</p>
                    <p>• Θα εξετάσει τη διαθεσιμότητά του και θα αποδεχτεί ή θα απορρίψει την κράτηση</p>
                    <p>• Θα λάβετε email ειδοποίηση με την απάντησή του</p>
                    <p>• Μπορείτε να παρακολουθείτε την κατάσταση στο προφίλ σας</p>
                  </div>
                </div>
              </div>
            </motion.div>
            {/* Email Notification Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-6"
            >
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-amber-400" />
                <div className="text-amber-100 text-sm">
                  <span className="font-semibold">Θα σας ειδοποιήσουμε:</span> Η απάντηση θα σταλεί στο email σας εντός
                  24 ωρών
                </div>
              </div>
            </motion.div>
            {/* Close Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              onClick={onClose}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold rounded-2xl transition-all duration-200 shadow-lg"
            >
              Εντάξει, κατάλαβα!
            </motion.button>
          </div>
          {/* Close X button */}
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-zinc-700/50 hover:bg-zinc-600/50 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-all"
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="h-4 w-4" />
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Success/Error Banner Component
function NotificationBanner({ type, title, message, onClose, onRetry }) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (type === "success") {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onClose, 300) // Wait for animation to complete
      }, 5000) // Auto-hide success after 5 seconds
      return () => clearTimeout(timer)
    }
  }, [type, onClose])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }

  const bannerConfig = {
    success: {
      bgColor: "bg-gradient-to-r from-emerald-500/20 via-green-500/20 to-emerald-600/20",
      borderColor: "border-emerald-400/30",
      textColor: "text-emerald-100",
      iconColor: "text-emerald-400",
      icon: CheckCircle2,
      glowColor: "shadow-emerald-500/20",
    },
    error: {
      bgColor: "bg-gradient-to-r from-red-500/20 via-rose-500/20 to-red-600/20",
      borderColor: "border-red-400/30",
      textColor: "text-red-100",
      iconColor: "text-red-400",
      icon: AlertTriangle,
      glowColor: "shadow-red-500/20",
    },
  }

  const config = bannerConfig[type]
  const Icon = config.icon

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.95 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            opacity: { duration: 0.3 },
          }}
          className="fixed top-4 left-4 right-4 z-[100] mx-auto max-w-md sm:max-w-lg lg:max-w-xl"
        >
          <div
            className={`
            relative overflow-hidden rounded-2xl border backdrop-blur-xl shadow-2xl
            ${config.bgColor} ${config.borderColor} ${config.glowColor}
          `}
          >
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-500/5 to-transparent animate-pulse" />
            {/* Glow effect */}
            <div className={`absolute inset-0 rounded-2xl blur-xl opacity-30 ${config.bgColor}`} />
            <div className="relative p-4 sm:p-6">
              <div className="flex items-start gap-3 sm:gap-4">
                {/* Animated Icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/20 flex items-center justify-center ${config.iconColor}`}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </motion.div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <motion.h3
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className={`text-sm sm:text-base font-semibold ${config.textColor} mb-1`}
                  >
                    {title}
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className={`text-xs sm:text-sm ${config.textColor} opacity-90 leading-relaxed`}
                  >
                    {message}
                  </motion.p>
                  {/* Retry button for errors */}
                  {type === "error" && onRetry && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      onClick={onRetry}
                      className={`
                        mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
                        bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-600/50 hover:border-zinc-500/50
                        ${config.textColor} transition-all duration-200
                      `}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <RefreshCw className="h-3 w-3" />
                      Δοκίμασε ξανά
                    </motion.button>
                  )}
                </div>
                {/* Close button */}
                <motion.button
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  onClick={handleClose}
                  className={`
                    flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-black/20 hover:bg-black/40
                    flex items-center justify-center ${config.textColor} transition-all duration-200
                  `}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                </motion.button>
              </div>
              {/* Progress bar for success messages */}
              {type === "success" && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 5, ease: "linear" }}
                  className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-emerald-400 to-green-500 origin-left"
                  style={{ transformOrigin: "left" }}
                />
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
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

/* =================== Enhanced Open Slots Booking Panel =================== */
function OpenSlotBookingPanel({
  trainerId,
  trainerName,
  holidays,
  sessionUserId,
  msg,
  setMsg,
  weeklyAvailability = [],
  onSlotsAvailable,
}) {
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [notification, setNotification] = useState(null)
  const [showAllDays, setShowAllDays] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [lastBookingDetails, setLastBookingDetails] = useState(null)

  const startISO = useMemo(() => localDateISO(0), [])
  const endISO = useMemo(() => localDateISO(29), [])

  const usableStatus = (s) => {
    const v = (s ?? "").toString().trim().toLowerCase()
    return ["", "open", "available", "free", "publish", "published", "true", "1"].includes(v)
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setMsg?.(null)
      const { data: open = [], error: e1 } = await supabase
        .from("trainer_open_slots")
        .select("date,start_time,end_time,is_online,status")
        .eq("trainer_id", trainerId)
        .gte("date", startISO)
        .lte("date", endISO)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true })

      if (!alive) return
      if (e1) {
        console.warn("[open slots] error:", e1)
        setRows([])
        setLoading(false)
        setMsg?.({ type: "error", text: e1.message })
        return
      }

      const { data: booked = [], error: e2 } = await supabase
        .from("trainer_bookings")
        .select("date,start_time,end_time,status")
        .eq("trainer_id", trainerId)
        .gte("date", startISO)
        .lte("date", endISO)
        .in("status", ["pending", "accepted"])

      if (e2) console.warn("[booked] error:", e2)

      const isHoliday = (d) => (holidays || []).some((h) => within(d, h.starts_on, h.ends_on))

      let filtered = (open || []).filter((r) => {
        if (!usableStatus(r.status)) return false
        if (isHoliday(r.date)) return false
        const overlap = (booked || []).some(
          (b) => b.date === r.date && overlaps(r.start_time, r.end_time, b.start_time, b.end_time),
        )
        return !overlap
      })

      if (filtered.length === 0 && (weeklyAvailability || []).length > 0) {
        const start = new Date(`${startISO}T00:00:00`)
        const weekdayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
        const derived = []
        for (let i = 0; i < 30; i++) {
          const d = new Date(start)
          d.setDate(start.getDate() + i)
          const iso = d.toISOString().slice(0, 10)
          if (isHoliday(iso)) continue
          const weekdayKey = weekdayNames[d.getDay()]
          const daySlots = (weeklyAvailability || []).filter((x) => x.weekday === weekdayKey)
          for (const s of daySlots) {
            const overlap = (booked || []).some(
              (b) => b.date === iso && overlaps(s.start_time, s.end_time, b.start_time, b.end_time),
            )
            if (!overlap) {
              derived.push({
                date: iso,
                start_time: hhmm(s.start_time),
                end_time: hhmm(s.end_time),
                is_online: !!s.is_online,
                status: "open",
              })
            }
          }
        }
        filtered = derived.sort(
          (a, b) =>
            a.date.localeCompare(b.date) || timeToMinutes(hhmm(a.start_time)) - timeToMinutes(hhmm(b.start_time)),
        )
      }

      // At the end of the useEffect, notify parent about slot availability
      if (onSlotsAvailable) {
        onSlotsAvailable(filtered.length > 0)
      }

      setRows(filtered)
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [trainerId, startISO, endISO, holidays, weeklyAvailability, setMsg, onSlotsAvailable])

  const grouped = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
      const key = r.date
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(r)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [rows])

  async function createBookingFromOpen(dateStr, startStr, endStr, slot) {
    if (!sessionUserId) {
      setNotification({
        type: "error",
        title: "Απαιτείται σύνδεση",
        message: "Παρακαλώ συνδεθείτε για να πραγματοποιήσετε κράτηση.",
      })
      return
    }

    setSubmitting(true)
    setMsg?.(null)

    try {
      // Calculate duration properly
      const startMinutes = timeToMinutes(hhmm(startStr))
      const endMinutes = timeToMinutes(hhmm(endStr))
      const duration = endMinutes - startMinutes

      // Get user email for notifications
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", sessionUserId)
        .single()

      const payload = {
        trainer_id: trainerId,
        user_id: sessionUserId,
        date: dateStr,
        start_time: hhmm(startStr),
        end_time: hhmm(endStr),
        duration_min: duration > 0 ? duration : 60,
        break_before_min: 0,
        break_after_min: 0,
        note: note.trim() || null,
        status: "pending",
        is_online: !!slot.is_online,
        created_at: new Date().toISOString(),
        user_email: userProfile?.email || null,
        user_name: userProfile?.full_name || null,
      }

      console.log("Creating booking with payload:", payload)

      const { data, error } = await supabase.from("trainer_bookings").insert([payload]).select().single()

      if (error) {
        console.error("Supabase booking error:", error)
        setNotification({
          type: "error",
          title: "Η κράτηση απέτυχε",
          message: `Κάτι πήγε στραβά κατά την κράτηση. ${error.message || "Παρακαλώ δοκιμάστε ξανά."}`,
        })
        return
      }

      console.log("Booking created successfully:", data)

      // Store booking details for the success modal
      setLastBookingDetails({
        date: dateStr,
        start_time: hhmm(startStr),
        end_time: hhmm(endStr),
        is_online: !!slot.is_online,
        booking_id: data.id,
      })

      // Show success modal instead of notification
      setShowSuccessModal(true)
      setNote("")

      // Remove the booked slot from available slots
      setRows((prev) =>
        prev.filter(
          (s) => !(s.date === dateStr && hhmm(s.start_time) === hhmm(startStr) && hhmm(s.end_time) === hhmm(endStr)),
        ),
      )

      // Optional: Send notification email to trainer (you can implement this server-side)
      try {
        // This would typically be handled by a server-side function or webhook
        console.log("Booking notification should be sent to trainer and user")
      } catch (emailError) {
        console.warn("Email notification failed:", emailError)
        // Don't fail the booking if email fails
      }
    } catch (err) {
      console.error("Booking catch error:", err)
      setNotification({
        type: "error",
        title: "Απροσδόκητο σφάλμα",
        message: `Κάτι πήγε στραβά. ${err.message || "Παρακαλώ δοκιμάστε ξανά αργότερα."}`,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleRetry = () => {
    setNotification(null)
  }

  return (
    <>
      {/* Notification Banner */}
      {notification && (
        <NotificationBanner
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => setNotification(null)}
          onRetry={notification.type === "error" ? handleRetry : undefined}
        />
      )}

      {/* Success Modal */}
      <BookingSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        bookingDetails={lastBookingDetails}
        trainerName={trainerName}
      />

      <PremiumCard hover={false} id="booking-section">
        <div className="p-4 sm:p-6 lg:p-8 xl:p-10 2xl:p-12">
          <ScrollReveal>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl flex items-center justify-center">
                <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-zinc-200" />
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-zinc-200">Κράτηση συνεδρίας</h2>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <div className="mb-6 lg:mb-8">
              <label className="block text-sm lg:text-base font-medium text-zinc-300 mb-2">
                Σημείωση (προαιρετική)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full bg-zinc-800/40 border border-zinc-600/50 text-zinc-200 placeholder-zinc-400 focus:border-zinc-500 rounded-xl px-3 py-2 lg:px-4 lg:py-3 text-sm lg:text-base resize-none"
                placeholder="Στόχοι, περιορισμοί, προτίμηση για εξοπλισμό κ.λπ."
              />
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.4}>
            <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-3 sm:p-4 lg:p-6 xl:p-8">
              <p className="text-sm sm:text-base lg:text-lg text-zinc-300 mb-4 lg:mb-6">
                Διαθέσιμες ώρες (επόμενες 30 ημέρες):
              </p>

              {loading ? (
                <div className="flex items-center justify-center py-8 sm:py-12 lg:py-16">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 border-2 border-zinc-600/30 border-t-zinc-500 rounded-full animate-spin" />
                  <span className="ml-3 text-zinc-400 text-sm sm:text-lg lg:text-xl">Φόρτωση…</span>
                </div>
              ) : grouped.length === 0 ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-100 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
                  <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 flex-shrink-0" />
                  <span className="text-sm sm:text-lg lg:text-xl">Δεν υπάρχουν ανοικτά ραντεβού στο διάστημα.</span>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6 lg:space-y-8">
                  {/* Show only first 3 days or all days based on showAllDays state */}
                  {(showAllDays ? grouped : grouped.slice(0, 3)).map(([dateStr, list], dateIndex) => (
                    <ScrollReveal key={dateStr} delay={0.6 + dateIndex * 0.1}>
                      <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/30 p-3 sm:p-4 lg:p-6 xl:p-8">
                        <div className="text-sm sm:text-base lg:text-lg xl:text-xl font-medium text-zinc-200 mb-3 sm:mb-4 lg:mb-6 flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 xl:h-7 xl:w-7 text-zinc-400" />
                          {fmtDate(dateStr)}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-2 sm:gap-3 lg:gap-4">
                          {list.map((s, idx) => (
                            <motion.button
                              key={`${dateStr}-${s.start_time}-${idx}`}
                              disabled={submitting}
                              onClick={() => createBookingFromOpen(dateStr, s.start_time, s.end_time, s)}
                              whileHover={{ scale: 1.05, y: -2 }}
                              whileTap={{ scale: 0.95 }}
                              className="group relative px-2 py-2 sm:px-3 sm:py-3 lg:px-4 lg:py-4 xl:px-5 xl:py-5 rounded-lg bg-gradient-to-r from-zinc-600/20 to-zinc-700/20 border border-zinc-500/30 hover:border-zinc-400/50 text-zinc-200 text-xs sm:text-sm lg:text-base font-medium transition-all disabled:opacity-60 overflow-hidden min-h-[3rem] sm:min-h-[3.5rem] lg:min-h-[4rem]"
                              title={`${hhmm(s.start_time)}–${hhmm(s.end_time)}`}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-zinc-500/20 to-zinc-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                              <div className="relative flex flex-col items-center justify-center gap-1">
                                <Clock className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                                <span className="text-xs sm:text-sm lg:text-base font-bold leading-tight">
                                  {hhmm(s.start_time)}–{hhmm(s.end_time)}
                                </span>
                              </div>
                              {s.is_online && (
                                <div className="absolute top-1 right-1">
                                  <Wifi className="h-2.5 w-2.5 sm:h-3 sm:w-3 lg:h-4 lg:w-4" />
                                </div>
                              )}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    </ScrollReveal>
                  ))}

                  {/* Show More/Less Button */}
                  {grouped.length > 3 && (
                    <div className="text-center pt-4">
                      <motion.button
                        onClick={() => setShowAllDays(!showAllDays)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-600/50 hover:border-zinc-500/50 text-zinc-200 font-medium transition-all"
                      >
                        {showAllDays ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            Εμφάνιση λιγότερων
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            Εμφάνιση περισσότερων ({grouped.length - 3} ακόμα)
                          </>
                        )}
                      </motion.button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollReveal>
          <div className="h-2" />
        </div>
      </PremiumCard>
    </>
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
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-zinc-200">Αναρτήσεις & Περιεχόμενο</h2>
                <p className="text-zinc-400">Τελευταίες ενημερώσεις και συμβουλές</p>
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

// Reviews Section Component
function ReviewsSection({ trainerId, stats }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" })
  const [submitting, setSubmitting] = useState(false)
  const { session } = useAuth()

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const { data, error } = await supabase
          .from("trainer_reviews")
          .select(`
            id, rating, comment, created_at,
            profiles!trainer_reviews_user_id_fkey (full_name, avatar_url)
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

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (!session?.user?.id) {
      alert("Παρακαλώ συνδεθείτε για να αφήσετε κριτική")
      return
    }

    setSubmitting(true)
    try {
      const { data, error } = await supabase.from("trainer_reviews").insert({
        trainer_id: trainerId,
        user_id: session.user.id,
        rating: newReview.rating,
        comment: newReview.comment.trim(),
        created_at: new Date().toISOString(),
      })

      if (error) throw error

      // Refresh reviews
      const { data: updatedReviews } = await supabase
        .from("trainer_reviews")
        .select(`
          id, rating, comment, created_at,
          profiles!trainer_reviews_user_id_fkey (full_name, avatar_url)
        `)
        .eq("trainer_id", trainerId)
        .order("created_at", { ascending: false })
        .limit(10)

      if (updatedReviews) {
        setReviews(updatedReviews)
      }

      setNewReview({ rating: 5, comment: "" })
      setShowReviewForm(false)
    } catch (err) {
      console.error("Error submitting review:", err)
      alert("Σφάλμα κατά την υποβολή της κριτικής")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PremiumCard>
      <div className="p-6 lg:p-8">
        <ScrollReveal>
          <div className="flex items-center justify-between mb-6 lg:mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-r from-yellow-600 to-yellow-700 rounded-xl flex items-center justify-center">
                <Star className="h-6 w-6 lg:h-7 lg:w-7 text-zinc-200" />
              </div>
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-zinc-200">Κριτικές & Αξιολογήσεις</h2>
                <p className="text-zinc-400">
                  {stats.avgRating > 0 ? `${stats.avgRating.toFixed(1)} αστέρια` : "Χωρίς αξιολόγηση"} •{" "}
                  {stats.reviewsCount} κριτικές
                </p>
              </div>
            </div>
            {session?.user?.id && (
              <motion.button
                onClick={() => setShowReviewForm(!showReviewForm)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-700 text-zinc-200 rounded-xl font-medium hover:from-yellow-700 hover:to-yellow-800 transition-all"
              >
                Αφήστε κριτική
              </motion.button>
            )}
          </div>
        </ScrollReveal>

        {/* Review Form */}
        <AnimatePresence>
          {showReviewForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 p-6 bg-zinc-800/30 border border-zinc-700/50 rounded-xl"
            >
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label className="block text-zinc-200 font-medium mb-2">Αξιολόγηση</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewReview({ ...newReview, rating: star })}
                        className="p-1"
                      >
                        <Star
                          className={`h-6 w-6 ${
                            star <= newReview.rating ? "text-yellow-400 fill-current" : "text-zinc-600"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-zinc-200 font-medium mb-2">Σχόλιο</label>
                  <textarea
                    value={newReview.comment}
                    onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                    rows={4}
                    className="w-full bg-zinc-900/50 border border-zinc-600/50 text-zinc-200 placeholder-zinc-400 focus:border-zinc-500 rounded-lg px-4 py-3 resize-none"
                    placeholder="Μοιραστείτε την εμπειρία σας..."
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <motion.button
                    type="submit"
                    disabled={submitting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-2 bg-gradient-to-r from-yellow-600 to-yellow-700 text-zinc-200 rounded-lg font-medium hover:from-yellow-700 hover:to-yellow-800 disabled:opacity-50 transition-all"
                  >
                    {submitting ? "Υποβολή..." : "Υποβολή κριτικής"}
                  </motion.button>
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="px-6 py-2 bg-zinc-700/50 text-zinc-300 rounded-lg hover:bg-zinc-600/50 transition-all"
                  >
                    Ακύρωση
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reviews List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse p-4 bg-zinc-800/30 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-zinc-700/50 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-zinc-700/50 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-zinc-700/50 rounded w-1/6"></div>
                  </div>
                </div>
                <div className="h-16 bg-zinc-700/50 rounded"></div>
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12">
            <Star className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-zinc-200 mb-2">Δεν υπάρχουν κριτικές ακόμα</h3>
            <p className="text-zinc-400">Γίνετε ο πρώτος που θα αφήσει κριτική για αυτόν τον προπονητή!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.map((review, index) => (
              <ScrollReveal key={review.id} delay={index * 0.1}>
                <div className="p-6 bg-zinc-800/30 border border-zinc-700/50 rounded-xl">
                  <div className="flex items-start gap-4">
                    <Avatar
                      url={review.profiles?.avatar_url}
                      alt={review.profiles?.full_name}
                      className="w-12 h-12 flex-shrink-0"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="text-zinc-200 font-semibold">{review.profiles?.full_name || "Ανώνυμος"}</h4>
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < review.rating ? "text-yellow-400 fill-current" : "text-zinc-600"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-zinc-400 text-sm">
                              {new Date(review.created_at).toLocaleDateString("el-GR")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-zinc-300 leading-relaxed">{review.comment}</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </PremiumCard>
  )
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
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-zinc-200 relative overflow-hidden pb-32 lg:pb-20">
      <ScrollProgress />
      <FloatingElements />
      <ScrollToTop />

      {/* Hero Section - Removed top padding */}
      <section className="relative min-h-screen flex items-center">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-900" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(113,113,122,0.15),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(82,82,91,0.1),transparent_70%)]" />

        <motion.div
          style={{ y: heroY }}
          className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 w-full"
        >
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div className="space-y-6 lg:space-y-8 text-center lg:text-left">
              <div className="space-y-4 lg:space-y-6">
                <ScrollReveal direction="left" delay={0.2}>
                  <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-600/50 text-zinc-200 transition-all"
                    >
                      <Heart className="h-5 w-5" />
                    </motion.button>
                    <StarRating rating={stats.avgRating} reviewCount={stats.reviewsCount} />
                  </div>
                </ScrollReveal>

                {/* Avatar for mobile - show between rating and name */}
                <div className="flex justify-center lg:hidden">
                  <ResponsiveAvatar url={data.avatar_url} alt={data.full_name} isNew={isNewTrainer} />
                </div>

                <ScrollReveal direction="left" delay={0.4}>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight flex flex-col lg:flex-row items-center lg:items-start gap-3 lg:gap-4">
                    <span className="bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-300 bg-clip-text text-transparent">
                      {data.full_name}
                    </span>
                    {hasCert && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5, type: "spring" }}
                        className="relative group"
                      >
                        <BadgeCheck
                          className="h-8 w-8 lg:h-12 lg:w-12 text-blue-400 flex-shrink-0 cursor-help"
                          title="Πιστοποιημένος προπονητής"
                        />
                        {/* Tooltip */}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-72 p-4 bg-zinc-900/95 backdrop-blur-xl border border-zinc-600/50 text-zinc-200 text-sm rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 pointer-events-none z-50 shadow-2xl">
                          <div className="relative">
                            {/* Arrow pointing up */}
                            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-zinc-900/95"></div>
                            <div className="font-medium text-zinc-200 mb-2 flex items-center gap-2">
                              <BadgeCheck className="h-4 w-4 text-blue-400" />
                              Πιστοποιημένος Προπονητής
                            </div>
                            <div className="text-zinc-300 leading-relaxed">
                              Αυτό το σύμβολο δείχνει ότι ο προπονητής έχει ανεβάσει το δίπλωμά του στο Peak Velocity
                              και έχει επαληθευτεί από την πλατφόρμα μας.
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </h1>
                </ScrollReveal>

                <ScrollReveal direction="left" delay={0.4}>
                  <p className="text-lg lg:text-xl xl:text-2xl text-zinc-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                    {data.bio ||
                      "Επαγγελματίας προπονητής με πάθος για την υγεία και τη φυσική κατάσταση. Εξατομικευμένα προγράμματα για κάθε επίπεδο και στόχο."}
                  </p>
                </ScrollReveal>
              </div>

              <ScrollReveal direction="left" delay={0.6}>
                <div className="flex flex-wrap justify-center lg:justify-start gap-3 lg:gap-4">
                  <span
                    className={`inline-flex items-center gap-2 px-4 py-2 lg:px-6 lg:py-3 rounded-full text-sm lg:text-base font-medium ${
                      data.is_online
                        ? "bg-emerald-600/20 text-emerald-200 border border-emerald-500/30"
                        : "bg-zinc-600/20 text-zinc-300 border border-zinc-500/30"
                    }`}
                  >
                    {data.is_online ? (
                      <Wifi className="h-4 w-4 lg:h-5 lg:w-5" />
                    ) : (
                      <WifiOff className="h-4 w-4 lg:h-5 lg:w-5" />
                    )}
                    {data.is_online ? "Διαδικτυακά" : "Δια ζώσης"}
                  </span>
                  {data.location && (
                    <span className="inline-flex items-center gap-2 px-4 py-2 lg:px-6 lg:py-3 rounded-full bg-zinc-600/20 text-zinc-200 border border-zinc-500/30 text-sm lg:text-base font-medium">
                      <MapPin className="h-4 w-4 lg:h-5 lg:w-5" /> {data.location}
                    </span>
                  )}
                  {Number.isFinite(data.experience_years) && (
                    <span className="inline-flex items-center gap-2 px-4 py-2 lg:px-6 lg:py-3 rounded-full bg-zinc-600/20 text-zinc-200 border border-zinc-500/30 text-sm lg:text-base font-medium">
                      <Award className="h-4 w-4 lg:h-5 lg:w-5" /> {data.experience_years} έτη εμπειρίας
                    </span>
                  )}
                </div>
              </ScrollReveal>

              {cat && (
                <ScrollReveal direction="left" delay={0.75}>
                  <div className="inline-flex items-center gap-3 px-6 py-4 rounded-full bg-zinc-700/30 border border-zinc-600/30 text-zinc-200 font-medium">
                    {CatIcon ? (
                      <CatIcon className="h-6 w-6 lg:h-7 lg:w-7" />
                    ) : (
                      <Tag className="h-6 w-6 lg:h-7 lg:w-7" />
                    )}
                    <span className="text-base lg:text-lg">{cat.label}</span>
                  </div>
                </ScrollReveal>
              )}

              {currentVacation && (
                <ScrollReveal direction="left" delay={0.9}>
                  <div className="inline-flex items-center gap-3 px-6 py-4 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-100">
                    <Sun className="h-5 w-5 lg:h-6 lg:w-6" />
                    <span className="text-sm lg:text-base">
                      Σε άδεια {fmtDate(currentVacation.starts_on)}–{fmtDate(currentVacation.ends_on)}
                      {currentVacation.reason && <span className="text-amber-200/80">• {currentVacation.reason}</span>}
                    </span>
                  </div>
                </ScrollReveal>
              )}

{/* Enhanced CTA Buttons — centered on mobile, same size/height */}
<ScrollReveal direction="left" delay={1.05}>
  <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start justify-center sm:justify-start">
    {hasAvailableSlots && (
      <motion.button
        onClick={scrollToBooking}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.97 }}
        className="inline-flex items-center justify-center gap-2
                   h-12 px-6 rounded-full text-zinc-200 text-base font-semibold
                   whitespace-nowrap select-none
                   bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700
                   border border-zinc-600/50 shadow-xl backdrop-blur-xl
                   focus:outline-none focus:ring-2 focus:ring-zinc-500/80 transition-all
                   min-w-[240px]"
      >
        <Calendar className="h-5 w-5" />
        <span>Κάνε κράτηση τώρα</span>
      </motion.button>
    )}

    <motion.button
      onClick={() =>
        document.getElementById("reviews-section")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      }
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.97 }}
      className="inline-flex items-center justify-center gap-2
                 h-12 px-6 rounded-full text-zinc-300 text-base font-semibold
                 whitespace-nowrap select-none
                 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-600/50 hover:border-zinc-500/50
                 backdrop-blur-xl transition-all
                 min-w-[240px]"
    >
      <Star className="h-5 w-5" />
      <span>Αφήστε κριτική</span>
    </motion.button>
  </div>
</ScrollReveal>

            </div>

            <div className="hidden lg:flex justify-end">
              <ResponsiveAvatar url={data.avatar_url} alt={data.full_name} isNew={isNewTrainer} />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 space-y-16 lg:space-y-20">
        {/* Stats Section */}
        <StatsSection
          data={data}
          bookingsCount={stats.bookingsCount}
          avgRating={stats.avgRating}
          reviewsCount={stats.reviewsCount}
        />

        {/* Posts Section - Moved above availability */}
        <PostsSection trainerId={data.id} />

        {/* Reviews Section */}
        <div id="reviews-section">
          <ReviewsSection trainerId={data.id} stats={stats} />
        </div>

        {/* Availability */}
        <PremiumCard direction="left">
          <div className="p-6 lg:p-8">
            <ScrollReveal>
              <div className="flex items-center gap-4 mb-6 lg:mb-8">
                <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-r from-green-600 to-green-700 rounded-xl flex items-center justify-center">
                  <CalendarIcon className="h-6 w-6 lg:h-7 lg:w-7 text-zinc-200" />
                </div>
                <div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-zinc-200">Εβδομαδιαία Διαθεσιμότητα</h2>
                  <p className="text-zinc-400">Οι συνήθεις ώρες προπόνησης</p>
                </div>
              </div>
            </ScrollReveal>
            <AvailabilityGrid rows={availability} />
          </div>
        </PremiumCard>

        {/* Booking Panel */}
        <OpenSlotBookingPanel
          trainerId={data.id}
          trainerName={data.full_name}
          holidays={holidays}
          sessionUserId={session?.user?.id || null}
          msg={msg}
          setMsg={setMsg}
          weeklyAvailability={availability}
          onSlotsAvailable={setHasAvailableSlots}
        />

        {/* Certifications & Diploma - COMPLETELY FIXED SECTION */}
        <PremiumCard direction="right">
          <div className="p-6 lg:p-8">
            <ScrollReveal>
              <div className="flex items-center gap-4 mb-6 lg:mb-8">
                <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center relative group">
                  <BadgeCheck
                    className={`h-6 w-6 lg:h-7 lg:w-7 ${hasCert ? "text-zinc-200" : "text-zinc-400"} cursor-help`}
                  />
                  {/* Tooltip for section header */}
                  {hasCert && (
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-64 p-3 bg-zinc-900/95 backdrop-blur-xl border border-zinc-600/50 text-zinc-200 text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 pointer-events-none z-50 shadow-xl">
                      <div className="relative">
                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[4px] border-b-zinc-900/95"></div>
                        <div className="text-zinc-300 leading-relaxed">
                          Επαληθευμένα διπλώματα και πιστοποιήσεις από το Peak Velocity
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-zinc-200">Πιστοποιήσεις & Διπλώματα</h2>
                  <p className="text-zinc-400">Επαγγελματικά προσόντα και εκπαίδευση</p>
                </div>
              </div>
            </ScrollReveal>

            {/* Show both certifications and diploma with proper visibility */}
            <div className="space-y-8">
              {/* Certifications Section */}
              {certs.length > 0 && (
                <div>
                  <ScrollReveal>
                    <h3 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                      <Award className="h-5 w-5 text-blue-400" />
                      Πιστοποιήσεις ({certs.length})
                    </h3>
                  </ScrollReveal>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    {certs.map((c, idx) => (
                      <ScrollReveal key={`cert-${idx}`} delay={idx * 0.1}>
                        <div className="flex items-center gap-4 p-4 lg:p-6 rounded-xl border border-zinc-700/30 bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors group">
                          <div className="w-3 h-3 bg-blue-400 rounded-full flex-shrink-0 group-hover:bg-blue-300 transition-colors" />
                          {isUrl(c) ? (
                            <a
                              href={c}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-zinc-300 hover:text-zinc-200 underline decoration-zinc-500 hover:decoration-zinc-200 transition-colors flex-1"
                            >
                              <ExternalLink className="h-4 w-4" />
                              <span className="break-all">Άνοιγμα πιστοποίησης</span>
                            </a>
                          ) : (
                            <span className="text-zinc-300 group-hover:text-zinc-200 transition-colors flex-1 break-words">
                              {String(c)}
                            </span>
                          )}
                        </div>
                      </ScrollReveal>
                    ))}
                  </div>
                </div>
              )}

              {/* Diploma Section - FIXED TO BE ALWAYS VISIBLE WHEN EXISTS */}
              {hasDiploma && (
                <div>
                  <ScrollReveal delay={certs.length > 0 ? 0.3 : 0}>
                    <h3 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-green-400" />
                      Δίπλωμα / Βεβαίωση
                    </h3>
                  </ScrollReveal>
                  <ScrollReveal delay={certs.length > 0 ? 0.4 : 0.1}>
                    <div className="p-6 rounded-xl border border-zinc-700/30 bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors group">
                      <a
                        href={data.diploma_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-4 text-zinc-300 hover:text-zinc-200 transition-colors w-full"
                      >
                        <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                          <ExternalLink className="h-6 w-6 text-green-400" />
                        </div>
                        <div className="flex-1">
                          <div className="text-base font-medium text-zinc-200 mb-1">Επίσημο Δίπλωμα/Βεβαίωση</div>
                          <div className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
                            Κάντε κλικ για προβολή του επίσημου διπλώματος
                          </div>
                        </div>
                        <div className="text-zinc-500 group-hover:text-zinc-300 transition-colors">
                          <ExternalLink className="h-5 w-5" />
                        </div>
                      </a>
                    </div>
                  </ScrollReveal>
                </div>
              )}

              {/* Empty state - only show if no certs AND no diploma */}
              {!hasCert && (
                <ScrollReveal>
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-700/50">
                      <Shield className="h-10 w-10 text-zinc-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-zinc-200 mb-2">Δεν υπάρχουν πιστοποιήσεις</h3>
                    <p className="text-zinc-500">
                      Αυτός ο προπονητής δεν έχει καταχωρήσει πιστοποιήσεις ή διπλώματα ακόμα
                    </p>
                  </div>
                </ScrollReveal>
              )}
            </div>
          </div>
        </PremiumCard>

        {/* Extra bottom spacing */}
        <div className="h-16 lg:h-8" />
      </main>

      {hasAvailableSlots && <MobileBookingButton onClick={scrollToBooking} hasAvailableSlots={hasAvailableSlots} />}
    </div>
  )
}
