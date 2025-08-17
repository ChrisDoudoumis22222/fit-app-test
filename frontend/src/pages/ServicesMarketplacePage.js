"use client"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  ListIcon,
  X,
  MapPin,
  Wifi,
  WifiOff,
  CalendarIcon,
  Sun,
  BadgeCheck,
  Tag,
  UserIcon,
  Heart,
  Star,
  Zap,
  Clock,
  HelpCircle,
  Sparkles,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "../supabaseClient"
import { useAuth } from "../AuthProvider"
import UserMenu from "../components/UserMenu"
import TrainerMenu from "../components/TrainerMenu"

/* Icons mapping */
import { FaDumbbell, FaUsers, FaAppleAlt, FaLaptop, FaRunning, FaMusic, FaHeartbeat } from "react-icons/fa"
import { MdFitnessCenter, MdSelfImprovement, MdHealthAndSafety, MdPsychology } from "react-icons/md"
import { GiMuscleUp, GiSwordsPower, GiWeightLiftingUp, GiBoxingGlove } from "react-icons/gi"
import { TbYoga, TbStethoscope } from "react-icons/tb"

/* --------------------------- Premium UI bits --------------------------- */
function PremiumCard({ title, subtitle, icon, action, children, className = "", gradient = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`panel group relative overflow-hidden rounded-3xl p-6 border border-white/10 shadow-2xl transition-all duration-300 hover:shadow-3xl hover:border-white/20 ${gradient ? "premium-gradient" : ""} ${className}`}
    >
      {(title || subtitle || icon || action) && (
        <div className="relative mb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            {icon && (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-white ring-1 ring-white/15">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {title && <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight break-words">{title}</h3>}
              {subtitle && <p className="text-xs sm:text-sm text-zinc-300 mt-1 break-words">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="relative z-10">{action}</div>}
        </div>
      )}
      <div className="relative">{children}</div>
    </motion.div>
  )
}

function PremiumButton({ children, variant = "primary", size = "default", className = "", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/10 disabled:opacity-50 disabled:pointer-events-none rounded-2xl"
  const variants = {
    primary: "bg-white text-black hover:bg-zinc-100 shadow-lg hover:shadow-xl active:scale-95",
    secondary: "bg-zinc-800/80 text-white hover:bg-zinc-700/80 border border-white/10 shadow-lg active:scale-95",
    outline: "border border-white/15 bg-black/40 backdrop-blur text-white hover:bg-white/10 hover:border-white/25",
    ghost: "text-white hover:bg-white/10",
  }
  const sizes = {
    sm: "px-4 py-2 text-sm",
    default: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
  }
  return (
    <button {...props} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </button>
  )
}

/* ------------------------------ constants ------------------------------ */

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

// Greek cities list with aliases for matching
const GREEK_CITIES = [
  { value: "all", label: "Όλες οι πόλεις", aliases: [] },
  { value: "Αθήνα", label: "Αθήνα", aliases: ["athens", "athina", "αθηνα", "athena", "athen"] },
  {
    value: "Θεσσαλονίκη",
    label: "Θεσσαλονίκη",
    aliases: ["thessaloniki", "thessalonica", "salonica", "θεσσαλονικη", "saloniki", "thessalonika"],
  },
  { value: "Πάτρα", label: "Πάτρα", aliases: ["patras", "patra", "πατρα", "patrai"] },
  {
    value: "Ηράκλειο",
    label: "Ηράκλειο",
    aliases: ["heraklion", "iraklion", "ηρακλειο", "herakleion", "candia", "crete"],
  },
  { value: "Λάρισα", label: "Λάρισα", aliases: ["larissa", "larisa", "λαρισα", "larissa"] },
  { value: "Βόλος", label: "Βόλος", aliases: ["volos", "βολος", "volo"] },
  { value: "Ιωάννινα", label: "Ιωάννινα", aliases: ["ioannina", "ιωαννινα", "yannina", "janina", "giannina"] },
  { value: "Καβάλα", label: "Καβάλα", aliases: ["kavala", "καβαλα", "cavala"] },
  { value: "Σέρρες", label: "Σέρρες", aliases: ["serres", "σερρες", "serrai"] },
  { value: "Χανιά", label: "Χανιά", aliases: ["chania", "hania", "χανια", "canea", "khania"] },
  { value: "Αγρίνιο", label: "Αγρίνιο", aliases: ["agrinio", "αγρινιο", "agrinion"] },
  { value: "Καλαμάτα", label: "Καλαμάτα", aliases: ["kalamata", "καλαματα", "calamata"] },
  { value: "Κομοτηνή", label: "Κομοτηνή", aliases: ["komotini", "κομοτηνη", "comothini"] },
  { value: "Ρόδος", label: "Ρόδος", aliases: ["rhodes", "ροδος", "rhodos", "rodos"] },
  { value: "Τρίκαλα", label: "Τρίκαλα", aliases: ["trikala", "τρικαλα", "tricala"] },
  { value: "Κοζάνη", label: "Κοζάνη", aliases: ["kozani", "κοζανη", "cozani"] },
  {
    value: "Αλεξανδρούπολη",
    label: "Αλεξανδρούπολη",
    aliases: ["alexandroupoli", "αλεξανδρουπολη", "alexandroupolis", "dedeagach"],
  },
  { value: "Ξάνθη", label: "Ξάνθη", aliases: ["xanthi", "ξανθη", "xanthi", "iskeche"] },
  { value: "Κέρκυρα", label: "Κέρκυρα", aliases: ["corfu", "kerkyra", "κερκυρα", "corfou"] },
  { value: "Μυτιλήνη", label: "Μυτιλήνη", aliases: ["mytilene", "μυτιληνη", "lesbos", "lesvos", "mitilini"] },
  { value: "Χίος", label: "Χίος", aliases: ["chios", "χιος", "hios", "khios"] },
  { value: "Σάμος", label: "Σάμος", aliases: ["samos", "σαμος", "samo"] },
  { value: "Σύρος", label: "Σύρος", aliases: ["syros", "συρος", "siros", "ermoupoli"] },
  { value: "Νάξος", label: "Νάξος", aliases: ["naxos", "ναξος", "nasso"] },
  { value: "Πάρος", label: "Πάρος", aliases: ["paros", "παρος", "paro"] },
  { value: "Μύκονος", label: "Μύκονος", aliases: ["mykonos", "μυκονος", "mikonos"] },
  { value: "Σαντορίνη", label: "Σαντορίνη", aliases: ["santorini", "σαντορινη", "thira", "fira", "θηρα"] },
  { value: "Κως", label: "Κως", aliases: ["kos", "κως", "cos"] },
  { value: "Πειραιάς", label: "Πειραιάς", aliases: ["piraeus", "πειραιας", "pireaus", "pireas"] },
  { value: "Περιστέρι", label: "Περιστέρι", aliases: ["peristeri", "περιστερι", "peristeria"] },
  { value: "Καλλιθέα", label: "Καλλιθέα", aliases: ["kallithea", "καλλιθεα", "kalithea"] },
  { value: "Αχαρνές", label: "Αχαρνές", aliases: ["acharnes", "αχαρνες", "acharnai", "menidi", "μενιδι"] },
  { value: "Ίλιον", label: "Ίλιον", aliases: ["ilion", "ιλιον", "nea liosia", "νεα λιοσια"] },
  { value: "Νέα Ιωνία", label: "Νέα Ιωνία", aliases: ["nea ionia", "νεα ιωνια", "neaionia"] },
  { value: "Μαρούσι", label: "Μαρούσι", aliases: ["marousi", "μαρουσι", "amarousion", "αμαρουσιον"] },
  { value: "Γλυφάδα", label: "Γλυφάδα", aliases: ["glyfada", "γλυφαδα", "glifada"] },
  { value: "Νίκαια", label: "Νίκαια", aliases: ["nikaia", "νικαια", "nicaea"] },
  { value: "Κερατσίνι", label: "Κερατσίνι", aliases: ["keratsini", "κερατσινι", "keratsinion"] },
]

// Function to check if a location matches a city (including aliases)
const matchesCity = (trainerLocation, selectedCity) => {
  if (!trainerLocation || selectedCity === "all") return true
  const city = GREEK_CITIES.find((c) => c.value === selectedCity)
  if (!city) return false
  const locationLower = trainerLocation.toLowerCase().trim()
  if (locationLower.includes(city.value.toLowerCase())) return true
  return city.aliases.some(
    (alias) => locationLower.includes(alias.toLowerCase()) || alias.toLowerCase().includes(locationLower),
  )
}

const categoryByValue = (v) => TRAINER_CATEGORIES.find((c) => c.value === v) || null

/* Background particles component */
function AnimatedParticles() {
  const [particles, setParticles] = useState([])
  useEffect(() => {
    const newParticles = [...Array(12)].map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 3}s`,
      animationDuration: `${3 + Math.random() * 4}s`,
    }))
    setParticles(newParticles)
  }, [])
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-white/15 animate-float"
          style={{ left: p.left, top: p.top, animationDelay: p.animationDelay, animationDuration: p.animationDuration }}
        />
      ))}
    </div>
  )
}

/* Avatar helpers */
const AVATAR_PLACEHOLDER = "/placeholder.svg?height=120&width=120&text=Avatar"
const safeAvatar = (url) => (url ? `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}` : AVATAR_PLACEHOLDER)

function LargeAvatarCover({ url, alt }) {
  if (url) {
    return (
      <img
        src={safeAvatar(url) || "/placeholder.svg"}
        alt={alt || "trainer"}
        onError={(e) => {
          e.currentTarget.onerror = null
          e.currentTarget.src = AVATAR_PLACEHOLDER
        }}
        className="w-full h-full object-cover"
      />
    )
  }
  return (
    <div className="w-full h-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
      <div className="h-20 w-20 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
        <UserIcon className="h-10 w-10 text-white/60" />
      </div>
    </div>
  )
}

const ALL_DAYS = [
  { key: "monday", label: "Δευ" },
  { key: "tuesday", label: "Τρι" },
  { key: "wednesday", label: "Τετ" },
  { key: "thursday", label: "Πεμ" },
  { key: "friday", label: "Παρ" },
]

const within = (dateStr, fromStr, toStr) => {
  const d = new Date(dateStr),
    f = new Date(fromStr),
    t = new Date(toStr)
  return (
    d >= new Date(f.getFullYear(), f.getMonth(), f.getDate()) &&
    d <= new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59, 999)
  )
}

const formatDate = (d) => {
  try {
    return new Date(d).toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" })
  } catch {
    return d
  }
}

/* Filter Button */
function FilterButton({ active, onClick, Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center text-center gap-3 p-4 rounded-2xl font-medium border transition-all duration-300 hover:scale-[1.02] ${
        active
          ? "bg-white text-black border-white shadow-lg"
          : "bg-white/[0.04] text-zinc-200 border-white/10 hover:bg-white/[0.08] hover:border-white/20"
      }`}
      title={label}
    >
      <Icon className="h-8 w-8" />
      <span className="text-xs leading-tight">{label}</span>
    </button>
  )
}

/* Empty State */
function Empty({ search }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20 lg:py-28">
      <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-white/5 border border-white/10 grid place-items-center">
        <Search className="h-12 w-12 text-zinc-600" />
      </div>
      <h3 className="text-3xl font-bold text-white mb-4">
        {search ? `Δεν βρέθηκαν αποτελέσματα για "${search}"` : "Δεν βρέθηκαν εκπαιδευτές"}
      </h3>
      <p className="text-zinc-400 mb-8 max-w-md mx-auto">
        {search
          ? "Δοκιμάστε διαφορετικούς όρους αναζήτησης ή αλλάξτε τα φίλτρα σας."
          : "Δοκιμάστε να αλλάξετε τα κριτήρια αναζήτησης ή τα φίλτρα σας."}
      </p>
      <PremiumButton onClick={() => window.location.reload()}>Επαναφόρτωση</PremiumButton>
    </motion.div>
  )
}

/* Availability Grid */
function AvailabilityGrid({ availability }) {
  const avByDay = useMemo(() => {
    const map = {}
    ;(availability || []).forEach((slot) => {
      ;(map[slot.weekday] ||= []).push({
        start: slot.start_time,
        end: slot.end_time,
        online: !!slot.is_online,
      })
    })
    return map
  }, [availability])

  if (Object.keys(avByDay).length === 0) {
    return (
      <div className="text-center py-4 px-6 rounded-xl bg-white/5 border border-white/10">
        <Clock className="h-6 w-6 text-zinc-500 mx-auto mb-2" />
        <p className="text-sm text-zinc-500">Δεν έχει οριστεί διαθεσιμότητα</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {ALL_DAYS.map((day) => {
        const slots = avByDay[day.key] || []
        if (slots.length === 0) return null
        return (
          <div key={day.key} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-medium text-white mb-2">{day.label}</div>
            <div className="space-y-2">
              {slots.map((slot, idx) => (
                <div
                  key={`${day.key}-${idx}`}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm"
                >
                  <span className="text-zinc-200">
                    {slot.start}–{slot.end}
                  </span>
                  {slot.online && <Wifi className="h-4 w-4 text-emerald-400" />}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* Trainer Card */
function TrainerCard({ list = false, trainer, onNavigate, liked = false, onToggleLike }) {
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const currentVacation = useMemo(
    () => (trainer.holidays || []).find((h) => within(todayISO, h.starts_on, h.ends_on)) || null,
    [trainer.holidays, todayISO],
  )
  const nextVacation = useMemo(() => {
    const future = (trainer.holidays || []).filter((h) => new Date(h.starts_on) >= new Date(todayISO))
    return future.sort((a, b) => new Date(a.starts_on) - new Date(b.starts_on))[0] || null
  }, [trainer.holidays, todayISO])

  const cat = categoryByValue(trainer.specialty)
  const CatIcon = cat?.iconKey ? ICON_BY_KEY[cat.iconKey] : null
  const go = () => onNavigate(`/trainer/${trainer.id}`)

  return (
    <motion.article
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === "Enter") go()
      }}
      tabIndex={0}
      className={`panel group relative overflow-hidden rounded-3xl border border-white/10 transition-all duration-500 cursor-pointer hover:scale-[1.02] ${
        list ? "flex flex-col lg:flex-row min-h-[16rem]" : "flex flex-col h-full"
      }`}
      role="button"
      aria-label={`Προβολή ${trainer.full_name}`}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.28 }}
    >
      {/* Hero Image */}
      <div className={list ? "relative h-64 lg:h-auto lg:w-80 shrink-0" : "relative h-72"}>
        <LargeAvatarCover url={trainer.avatar_url} alt={trainer.full_name} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        {/* Favorite */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleLike?.()
          }}
          className={`absolute top-4 left-4 h-11 w-11 grid place-items-center rounded-full backdrop-blur-sm border border-white/15 transition-all duration-300 hover:scale-110 ${
            liked ? "bg-red-500/90 text-white" : "bg-black/60 text-white hover:bg-black/80"
          }`}
          title={liked ? "Αφαίρεση από αγαπημένα" : "Αγαπημένο"}
          aria-label={liked ? "Αφαίρεση από αγαπημένα" : "Προσθήκη στα αγαπημένα"}
        >
          <Heart className={`h-5 w-5 ${liked ? "fill-current" : ""}`} />
        </button>
        {/* Status Badges */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <div className="relative group">
            <span
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl backdrop-blur-sm text-xs font-semibold border ${
                trainer.is_online
                  ? "bg-emerald-500/90 text-white border-emerald-300/40"
                  : "bg-zinc-800/90 text-zinc-300 border-white/10"
              }`}
            >
              {trainer.is_online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              {trainer.is_online ? "Διαδικτυακά" : "Δια ζώσης"}
              <HelpCircle className="h-3 w-3" />
            </span>
            <div className="absolute top-full right-0 mt-2 w-72 p-4 panel text-white text-sm rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 pointer-events-none z-[60]">
              <div className="relative">
                <div className="absolute -top-6 right-4 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-zinc-900/95"></div>
                <div className="font-medium text-white mb-2">
                  {trainer.is_online ? "Διαδικτυακά Μαθήματα" : "Μαθήματα Δια Ζώσης"}
                </div>
                <div className="text-zinc-300 leading-relaxed">
                  {trainer.is_online
                    ? "Αυτός ο εκπαιδευτής προσφέρει μόνο διαδικτυακά μαθήματα."
                    : "Αυτός ο εκπαιδευτής προσφέρει μόνο μαθήματα δια ζώσης."}
                </div>
              </div>
            </div>
          </div>
          {currentVacation && (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/90 backdrop-blur-sm text-black text-xs font-semibold border border-amber-300/50">
              <Sun className="h-4 w-4" />
              Σε άδεια
            </span>
          )}
        </div>
      </div>
      {/* Content */}
      <div className={`${list ? "flex flex-col flex-1 p-8" : "flex flex-col flex-1 p-6"}`}>
        <div className="flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className={`${list ? "text-2xl" : "text-xl"} font-bold text-white`}>{trainer.full_name}</h3>
                {trainer.diploma_url && trainer.diploma_url.trim() && (
                  <div className="relative group">
                    <BadgeCheck
                      className="h-5 w-5 text-blue-400 flex-shrink-0 cursor-help"
                      title="Πιστοποιημένος προπονητής"
                    />
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 p-4 panel text-white text-sm rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 pointer-events-none z-[60]">
                      <div className="font-medium text-white mb-2 flex items-center gap-2">
                        <BadgeCheck className="h-4 w-4 text-blue-400" />
                        Πιστοποιημένος Προπονητής
                      </div>
                      <div className="text-zinc-300 leading-relaxed">
                        Ο προπονητής έχει ανεβάσει δίπλωμα και έχει επαληθευτεί.
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {trainer.location || "N/A"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <BadgeCheck className="h-4 w-4" />
                  {trainer.experience_years || "<1"} έτη
                </span>
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium mb-4">
            {cat ? (
              CatIcon ? (
                <CatIcon className="h-5 w-5" />
              ) : (
                <Tag className="h-5 w-5" />
              )
            ) : (
              <Tag className="h-5 w-5" />
            )}
            {cat ? cat.label : "Γενικός Εκπαιδευτής"}
          </div>

          {/* Rating */}
          <div className="mb-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => {
                  const isFilled = i < Math.floor(trainer.rating || 0)
                  const isHalf = i === Math.floor(trainer.rating || 0) && (trainer.rating || 0) % 1 >= 0.5
                  if (isHalf) {
                    return (
                      <div key={i} className="relative h-4 w-4">
                        <Star className="h-4 w-4 text-zinc-600 fill-current absolute" />
                        <div className="overflow-hidden w-1/2">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        </div>
                      </div>
                    )
                  }
                  return (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${isFilled ? "text-yellow-400 fill-current" : "text-zinc-600 fill-current"}`}
                    />
                  )
                })}
              </div>
              <span className="text-sm">
                {trainer.rating > 0 ? (
                  <>
                    {trainer.rating.toFixed(1)} ({trainer.reviewCount || 0}{" "}
                    {(trainer.reviewCount || 0) === 1 ? "κριτική" : "κριτικές"})
                  </>
                ) : (
                  "Δεν υπάρχουν κριτικές ακόμα"
                )}
              </span>
            </div>
          </div>

          {Array.isArray(trainer.tags) && trainer.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {trainer.tags.slice(0, 6).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300 text-xs"
                >
                  {tag}
                </span>
              ))}
              {trainer.tags.length > 6 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-xs">
                  +{trainer.tags.length - 6}
                </span>
              )}
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-center gap-2 text-white mb-3">
              <CalendarIcon className="h-5 w-5" />
              <span className="font-medium">Διαθεσιμότητα</span>
            </div>
            <AvailabilityGrid availability={trainer.availability} />
          </div>

          {!currentVacation && nextVacation && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm mb-4">
              <Sun className="h-4 w-4" />
              Προσεχής άδεια: {formatDate(nextVacation.starts_on)}–{formatDate(nextVacation.ends_on)}
            </div>
          )}
        </div>

        <PremiumButton
          onClick={(e) => {
            e.stopPropagation()
            onNavigate(`/trainer/${trainer.id}`)
          }}
          className="w-full"
        >
          Προβολή Προφίλ
        </PremiumButton>
      </div>
    </motion.article>
  )
}

/* Controls */
function Controls({
  search,
  setSearch,
  showFilters,
  setShowFilters,
  view,
  setView,
  sort,
  setSort,
  cat,
  setCat,
  onlyOnline,
  setOnlyOnline,
  excludeVacation,
  setExcludeVacation,
  selectedDate,
  setSelectedDate,
  selectedCity,
  setSelectedCity,
  results,
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.8 }}
      className="mb-16"
    >
      <PremiumCard
        gradient
        title="Αναζήτηση Εκπαιδευτών"
        subtitle="Φιλτράρισε και βρες τον καλύτερο για σένα"
        icon={<Sparkles className="h-6 w-6" />}
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-200 text-xs sm:text-sm font-medium">Ζωντανά αποτελέσματα</span>
            </div>
          </div>
        }
      >
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Αναζήτηση προπονητών, ειδικοτήτων, τοποθεσίας..."
              className="control-input w-full pl-16 pr-12 py-5"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white transition-colors"
                aria-label="Καθαρισμός"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4 flex-wrap lg:flex-nowrap">
            <PremiumButton variant={showFilters ? "primary" : "outline"} onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-5 w-5" />
              Φίλτρα
              {showFilters ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </PremiumButton>

            <div className="flex rounded-2xl overflow-hidden border border-white/10 bg-white/5">
              <button
                onClick={() => setView("grid")}
                className={`px-5 py-5 transition-all duration-300 ${view === "grid" ? "bg-white text-black" : "text-zinc-300 hover:text-white"}`}
                aria-label="Πλέγμα"
              >
                <LayoutGrid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setView("list")}
                className={`px-5 py-5 border-l border-white/10 transition-all duration-300 ${view === "list" ? "bg-white text-black" : "text-zinc-300 hover:text-white"}`}
                aria-label="Λίστα"
              >
                <ListIcon className="h-5 w-5" />
              </button>
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="control-select min-w-[200px]"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e\")",
                backgroundPosition: "right 1rem center",
                backgroundSize: "1.5em 1.5em",
                backgroundRepeat: "no-repeat",
              }}
            >
              <option value="newest" className="bg-zinc-900 text-white">
                Νεότεροι
              </option>
              <option value="name" className="bg-zinc-900 text-white">
                Όνομα A-Z
              </option>
              <option value="experience" className="bg-zinc-900 text-white">
                Εμπειρία (έτη)
              </option>
              <option value="rating" className="bg-zinc-900 text-white">
                Καλύτερη αξιολόγηση
              </option>
            </select>
          </div>
        </div>

        <div className="text-zinc-300 mb-6">
          <span className="text-white font-bold">{results}</span> {results === 1 ? "εκπαιδευτής" : "εκπαιδευτές"}{" "}
          βρέθηκαν — <span className="opacity-80">Επιλέξτε τον κατάλληλο για εσάς</span>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4 }}
              className="border-t border-white/10 pt-8 space-y-8"
            >
              {/* Category */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Tag className="h-5 w-5" /> Τύπος Προπόνησης
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <FilterButton active={cat === "all"} onClick={() => setCat("all")} Icon={Tag} label="Όλες" />
                  {TRAINER_CATEGORIES.map(({ value, label, iconKey }) => {
                    const Icon = ICON_BY_KEY[iconKey]
                    const active = cat === value
                    return (
                      <FilterButton
                        key={value}
                        active={active}
                        onClick={() => setCat(active ? "all" : value)}
                        Icon={Icon || Tag}
                        label={label}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Date quick filters */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" /> Ημερομηνία Διαθεσιμότητας
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[
                    { key: "", label: "Οποιαδήποτε", Icon: CalendarIcon },
                    { key: "today", label: "Σήμερα", Icon: Clock },
                    { key: "tomorrow", label: "Αύριο", Icon: Sun },
                    { key: "week", label: "Αυτή την εβδομάδα", Icon: CalendarIcon },
                  ].map(({ key, label, Icon }) => (
                    <button
                      key={key || "any"}
                      onClick={() => setSelectedDate(key)}
                      className={`flex items-center justify-center gap-2 p-4 rounded-2xl font-medium border transition-all duration-300 ${
                        selectedDate === key
                          ? "bg-white text-black border-white shadow-lg"
                          : "bg-white/5 text-zinc-200 border-white/10 hover:bg-white/10 hover:border-white/20"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-sm">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* City */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5" /> Πόλη
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {GREEK_CITIES.slice(0, 12).map((city) => (
                    <button
                      key={city.value}
                      onClick={() => setSelectedCity(city.value)}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl font-medium border transition-all duration-300 text-sm ${
                        selectedCity === city.value
                          ? "bg-white text-black border-white shadow-lg"
                          : "bg-white/5 text-zinc-200 border-white/10 hover:bg-white/10 hover:border-white/20"
                      }`}
                    >
                      <MapPin className="h-4 w-4" />
                      <span>{city.label}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-4">
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="control-select min-w-[250px]"
                    style={{
                      backgroundImage:
                        "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e\")",
                      backgroundPosition: "right 1rem center",
                      backgroundSize: "1.5em 1.5em",
                      backgroundRepeat: "no-repeat",
                    }}
                  >
                    {GREEK_CITIES.map((city) => (
                      <option key={city.value} value={city.value} className="bg-zinc-900 text-white">
                        {city.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setOnlyOnline((v) => !v)}
                  className={`p-4 rounded-2xl border transition-all duration-300 text-left ${
                    onlyOnline
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200"
                      : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {onlyOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
                    <div>
                      <div className="font-semibold">
                        {onlyOnline ? "Μόνο online διαθέσιμοι" : "Περιλαμβάνει & offline"}
                      </div>
                      <div className="text-sm opacity-80">
                        {onlyOnline ? "Εμφάνιση μόνο online εκπαιδευτών" : "Εμφάνιση όλων των εκπαιδευτών"}
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setExcludeVacation((v) => !v)}
                  className={`p-4 rounded-2xl border transition-all duration-300 text-left ${
                    excludeVacation
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-200"
                      : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Sun className="h-5 w-5" />
                    <div>
                      <div className="font-semibold">Εξαίρεση όσων είναι σε άδεια</div>
                      <div className="text-sm opacity-80">Απόκρυψη εκπαιδευτών σε διακοπές</div>
                    </div>
                  </div>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </PremiumCard>
    </motion.section>
  )
}

export default function ServicesMarketplacePage() {
  useEffect(() => {
    document.documentElement.classList.add("bg-black")
    document.body.classList.add("bg-black")
    return () => {
      document.documentElement.classList.remove("bg-black")
      document.body.classList.remove("bg-black")
    }
  }, [])

  const { profile, loading } = useAuth()
  const navigate = useNavigate()
  const MenuComponent = profile?.role === "trainer" ? TrainerMenu : UserMenu

  const [trainers, setTrainers] = useState([])
  const [filtered, setFiltered] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState("grid")
  const [sortBy, setSortBy] = useState("newest")
  const [showFilters, setShowFilters] = useState(false)
  const [catFilter, setCatFilter] = useState("all")
  const [onlyOnline, setOnlyOnline] = useState(false)
  const [excludeVacation, setExcludeVacation] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedCity, setSelectedCity] = useState("all")

  // likes
  const [likedTrainerIds, setLikedTrainerIds] = useState([])

  /* fetch trainers + availability + holidays + ratings */
  useEffect(() => {
    ;(async () => {
      setErrorMsg("")
      const { data: profs, error: pErr } = await supabase
        .from("profiles")
        .select(
          "id, full_name, avatar_url, specialty, roles, location, is_online, experience_years, created_at, diploma_url",
        )
        .eq("role", "trainer")
        .order("created_at", { ascending: false })

      if (pErr) {
        setErrorMsg(pErr.message || "Σφάλμα φόρτωσης εκπαιδευτών.")
        return
      }

      const ids = (profs ?? []).map((p) => p.id)
      if (ids.length === 0) {
        setTrainers([])
        setFiltered([])
        return
      }

      const { data: avs } = await supabase
        .from("trainer_availability")
        .select("trainer_id, weekday, start_time, end_time, is_online")
        .in("trainer_id", ids)

      const { data: hols } = await supabase
        .from("trainer_holidays")
        .select("trainer_id, starts_on, ends_on, reason")
        .in("trainer_id", ids)

      const { data: reviews, error: rErr } = await supabase
        .from("trainer_reviews")
        .select("trainer_id, rating")
        .in("trainer_id", ids)
      const reviewsData = rErr ? [] : (reviews ?? [])

      const avByTrainer = (avs ?? []).reduce((m, r) => {
        ;(m[r.trainer_id] ||= []).push(r)
        return m
      }, {})

      const holByTrainer = (hols ?? []).reduce((m, r) => {
        ;(m[r.trainer_id] ||= []).push(r)
        return m
      }, {})

      const ratingsByTrainer = reviewsData.reduce((m, r) => {
        ;(m[r.trainer_id] ||= []).push(r.rating)
        return m
      }, {})

      const merged = (profs ?? []).map((t) => {
        const trainerReviews = ratingsByTrainer[t.id] || []
        const avgRating =
          trainerReviews.length > 0
            ? trainerReviews.reduce((sum, rating) => sum + rating, 0) / trainerReviews.length
            : 0

        return {
          ...t,
          tags: Array.isArray(t.roles) ? t.roles : [],
          availability: (avByTrainer[t.id] ?? []).sort(
            (a, b) => ALL_DAYS.findIndex((d) => d.key === a.weekday) - ALL_DAYS.findIndex((d) => d.key === b.weekday),
          ),
          holidays: (holByTrainer[t.id] ?? []).sort((a, b) => new Date(b.starts_on) - new Date(a.starts_on)),
          rating: avgRating,
          reviewCount: trainerReviews.length,
        }
      })

      setTrainers(merged)
      setFiltered(merged)
    })()
  }, [])

  // fetch current user's likes
  useEffect(() => {
    ;(async () => {
      if (!profile?.id) {
        setLikedTrainerIds([])
        return
      }
      const { data, error } = await supabase.from("trainer_likes").select("trainer_id").eq("user_id", profile.id)
      if (!error) setLikedTrainerIds((data || []).map((r) => r.trainer_id))
    })()
  }, [profile?.id])

  const toggleLikeTrainer = async (trainerId) => {
    if (!profile?.id) return
    const already = likedTrainerIds.includes(trainerId)
    if (already) {
      const { error } = await supabase
        .from("trainer_likes")
        .delete()
        .eq("user_id", profile.id)
        .eq("trainer_id", trainerId)
      if (!error) setLikedTrainerIds((prev) => prev.filter((id) => id !== trainerId))
    } else {
      const { error } = await supabase.from("trainer_likes").insert([{ user_id: profile.id, trainer_id: trainerId }])
      if (!error) setLikedTrainerIds((prev) => [...prev, trainerId])
    }
  }

  /* search + filters + sort */
  useEffect(() => {
    let out = [...trainers]
    const q = searchTerm.trim().toLowerCase()
    if (q) {
      out = out.filter((t) => {
        const cat = (t.specialty || "").toLowerCase()
        const tags = (t.tags || []).map((x) => String(x).toLowerCase())
        return (
          (t.full_name || "").toLowerCase().includes(q) ||
          (t.location || "").toLowerCase().includes(q) ||
          cat.includes(q) ||
          tags.some((x) => x.includes(q))
        )
      })
    }

    if (catFilter !== "all") out = out.filter((t) => (t.specialty || "") === catFilter)
    if (onlyOnline) out = out.filter((t) => t.is_online === true)
    if (excludeVacation) {
      const today = new Date().toISOString().slice(0, 10)
      out = out.filter((t) => !(t.holidays || []).some((h) => within(today, h.starts_on, h.ends_on)))
    }

    if (selectedCity !== "all") {
      out = out.filter((t) => matchesCity(t.location, selectedCity))
    }

    out.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.full_name || "").localeCompare(b.full_name || "")
        case "experience":
          return (Number(b.experience_years) || 0) - (Number(a.experience_years) || 0)
        case "rating":
          return (b.rating || 0) - (a.rating || 0)
        default:
          return new Date(b.created_at || 0) - new Date(a.created_at || 0)
      }
    })

    setFiltered(out)
  }, [searchTerm, trainers, sortBy, catFilter, onlyOnline, excludeVacation, selectedDate, selectedCity])

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-white text-lg">Φόρτωση εκπαιδευτών...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background: dark grid + radial glow + sheen */}
      <div className="fixed inset-0 -z-50 bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.08),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.08),transparent_45%),radial-gradient(circle_at_85%_80%,rgba(255,255,255,0.06),transparent_45%)] animate-pulse-slow" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(45deg,transparent_48%,rgba(255,255,255,0.02)_49%,rgba(255,255,255,0.02)_51%,transparent_52%)] bg-[length:20px_20px] animate-slide-diagonal" />
      <AnimatedParticles />

      {/* same spacing system as other page + 80px bottom padding */}
      <style>{`
        :root { --side-w: 0px; --nav-h: 64px; }
        @media (min-width: 640px){ :root { --nav-h: 72px; } }
        @media (min-width: 1024px){ :root { --side-w: 280px; --nav-h: 0px; } }
        @media (min-width: 1280px){ :root { --side-w: 320px; } }
      `}</style>

      <div className="relative min-h-screen overflow-x-hidden">
        <div className="lg:pl-[calc(var(--side-w)+8px)] pl-0 lg:pt-0 pt-[var(--nav-h)] transition-[padding]">
          <div className="relative z-10">
            {MenuComponent ? <MenuComponent /> : null}

            <main className="mx-auto w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-12 lg:py-20 pb-[80px]">
              {/* Hero */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center mb-16"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/80 text-sm mb-6 animate-bounce-subtle">
                  <Zap className="h-4 w-4 animate-pulse" />
                  Βρες τον ιδανικό προπονητή
                </div>
                <h1 className="text-5xl lg:text-7xl font-black tracking-tight text-white mb-6 leading-tight">
                  Επαγγελματίες{" "}
                  <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-300 bg-clip-text text-transparent">
                    Εκπαιδευτές
                  </span>
                </h1>
                <p className="text-xl text-zinc-300 max-w-2xl mx-auto leading-relaxed">
                  Ανακάλυψε πιστοποιημένους προπονητές και ξεκίνα το ταξίδι σου προς την καλύτερη φυσική κατάσταση
                </p>
              </motion.div>

              <Controls
                search={searchTerm}
                setSearch={setSearchTerm}
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                view={viewMode}
                setView={setViewMode}
                sort={sortBy}
                setSort={setSortBy}
                cat={catFilter}
                setCat={setCatFilter}
                onlyOnline={onlyOnline}
                setOnlyOnline={setOnlyOnline}
                excludeVacation={excludeVacation}
                setExcludeVacation={setExcludeVacation}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                selectedCity={selectedCity}
                setSelectedCity={setSelectedCity}
                results={filtered.length}
              />

              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-200 px-6 py-4 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3">
                    <X className="h-5 w-5 text-red-400" />
                    <span>{errorMsg}</span>
                  </div>
                </motion.div>
              )}

              {/* Results */}
              {filtered.length === 0 ? (
                <Empty search={searchTerm} />
              ) : viewMode === "grid" ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8 auto-rows-fr"
                >
                  {filtered.map((t, i) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 28 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.45 }}
                    >
                      <TrainerCard
                        trainer={t}
                        onNavigate={navigate}
                        liked={likedTrainerIds.includes(t.id)}
                        onToggleLike={() => toggleLikeTrainer(t.id)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
                  {filtered.map((t, i) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, x: -28 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.45 }}
                      className="mb-8"
                    >
                      <TrainerCard
                        trainer={t}
                        list
                        onNavigate={navigate}
                        liked={likedTrainerIds.includes(t.id)}
                        onToggleLike={() => toggleLikeTrainer(t.id)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </main>
          </div>
        </div>
      </div>

      {/* Global styles */}
      <style jsx global>{`
        .panel {
          background:
            radial-gradient(120% 120% at 50% 0%, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.6) 40%) ,
            linear-gradient(to bottom, rgba(255,255,255,0.02), rgba(0,0,0,0.5));
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.06),
            0 10px 30px rgba(0,0,0,0.6);
        }
        .control-input {
          border-radius: 1rem;
          background: rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.12);
          color: #fff;
          outline: none;
          transition: border .2s, box-shadow .2s, background .2s;
        }
        .control-input::placeholder { color: rgba(255,255,255,0.5); }
        .control-input:focus {
          border-color: rgba(255,255,255,0.35);
          box-shadow: 0 0 0 6px rgba(255,255,255,0.06);
          background: rgba(0,0,0,0.55);
        }
        .control-select {
          padding: 1.1rem 3rem 1.1rem 1.25rem;
          border-radius: 1rem;
          background: rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.12);
          color: #fff;
          appearance: none;
          outline: none;
          transition: border .2s, box-shadow .2s, background .2s;
        }
        .control-select:focus {
          border-color: rgba(255,255,255,0.35);
          box-shadow: 0 0 0 6px rgba(255,255,255,0.06);
          background: rgba(0,0,0,0.55);
        }

        @keyframes float { 0%,100%{transform:translateY(0) rotate(0)} 33%{transform:translateY(-10px) rotate(120deg)} 66%{transform:translateY(5px) rotate(240deg)} }
        @keyframes pulse-slow { 0%,100%{opacity:1} 50%{opacity:.85} }
        @keyframes slide-diagonal { 0%{transform:translateX(-100px) translateY(-100px)} 100%{transform:translateX(100px) translateY(100px)} }
        @keyframes bounce-subtle { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        .animate-float{animation:float 6s ease-in-out infinite}
        .animate-pulse-slow{animation:pulse-slow 4s ease-in-out infinite}
        .animate-slide-diagonal{animation:slide-diagonal 20s linear infinite}
        .animate-bounce-subtle{animation:bounce-subtle 2s ease-in-out infinite}

        .premium-gradient:before {
          content: "";
          position: absolute;
          inset: -2px;
          background: conic-gradient(from 180deg at 50% 50%, rgba(255,255,255,0.12), rgba(255,255,255,0.02), rgba(255,255,255,0.12));
          filter: blur(16px);
          opacity: .22;
          z-index: -1;
        }
      `}</style>
    </div>
  )
}
