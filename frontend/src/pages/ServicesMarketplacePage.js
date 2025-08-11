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
  {
    value: "all",
    label: "Όλες οι πόλεις",
    aliases: [],
  },
  {
    value: "Αθήνα",
    label: "Αθήνα",
    aliases: ["athens", "athina", "αθηνα", "athena", "athen"],
  },
  {
    value: "Θεσσαλονίκη",
    label: "Θεσσαλονίκη",
    aliases: ["thessaloniki", "thessalonica", "salonica", "θεσσαλονικη", "saloniki", "thessalonika"],
  },
  {
    value: "Πάτρα",
    label: "Πάτρα",
    aliases: ["patras", "patra", "πατρα", "patrai"],
  },
  {
    value: "Ηράκλειο",
    label: "Ηράκλειο",
    aliases: ["heraklion", "iraklion", "ηρακλειο", "herakleion", "candia", "crete"],
  },
  {
    value: "Λάρισα",
    label: "Λάρισα",
    aliases: ["larissa", "larisa", "λαρισα", "larissa"],
  },
  {
    value: "Βόλος",
    label: "Βόλος",
    aliases: ["volos", "βολος", "volo"],
  },
  {
    value: "Ιωάννινα",
    label: "Ιωάννινα",
    aliases: ["ioannina", "ιωαννινα", "yannina", "janina", "giannina"],
  },
  {
    value: "Καβάλα",
    label: "Καβάλα",
    aliases: ["kavala", "καβαλα", "cavala"],
  },
  {
    value: "Σέρρες",
    label: "Σέρρες",
    aliases: ["serres", "σερρες", "serrai"],
  },
  {
    value: "Χανιά",
    label: "Χανιά",
    aliases: ["chania", "hania", "χανια", "canea", "khania"],
  },
  {
    value: "Αγρίνιο",
    label: "Αγρίνιο",
    aliases: ["agrinio", "αγρινιο", "agrinion"],
  },
  {
    value: "Καλαμάτα",
    label: "Καλαμάτα",
    aliases: ["kalamata", "καλαματα", "calamata"],
  },
  {
    value: "Κομοτηνή",
    label: "Κομοτηνή",
    aliases: ["komotini", "κομοτηνη", "comothini"],
  },
  {
    value: "Ρόδος",
    label: "Ρόδος",
    aliases: ["rhodes", "ροδος", "rhodos", "rodos"],
  },
  {
    value: "Τρίκαλα",
    label: "Τρίκαλα",
    aliases: ["trikala", "τρικαλα", "tricala"],
  },
  {
    value: "Κοζάνη",
    label: "Κοζάνη",
    aliases: ["kozani", "κοζανη", "cozani"],
  },
  {
    value: "Αλεξανδρούπολη",
    label: "Αλεξανδρούπολη",
    aliases: ["alexandroupoli", "αλεξανδρουπολη", "alexandroupolis", "dedeagach"],
  },
  {
    value: "Ξάνθη",
    label: "Ξάνθη",
    aliases: ["xanthi", "ξανθη", "xanthi", "iskeche"],
  },
  {
    value: "Κέρκυρα",
    label: "Κέρκυρα",
    aliases: ["corfu", "kerkyra", "κερκυρα", "corfou"],
  },
  {
    value: "Μυτιλήνη",
    label: "Μυτιλήνη",
    aliases: ["mytilene", "μυτιληνη", "lesbos", "lesvos", "mitilini"],
  },
  {
    value: "Χίος",
    label: "Χίος",
    aliases: ["chios", "χιος", "hios", "khios"],
  },
  {
    value: "Σάμος",
    label: "Σάμος",
    aliases: ["samos", "σαμος", "samo"],
  },
  {
    value: "Σύρος",
    label: "Σύρος",
    aliases: ["syros", "συρος", "siros", "ermoupoli"],
  },
  {
    value: "Νάξος",
    label: "Νάξος",
    aliases: ["naxos", "ναξος", "nasso"],
  },
  {
    value: "Πάρος",
    label: "Πάρος",
    aliases: ["paros", "παρος", "paro"],
  },
  {
    value: "Μύκονος",
    label: "Μύκονος",
    aliases: ["mykonos", "μυκονος", "mikonos"],
  },
  {
    value: "Σαντορίνη",
    label: "Σαντορίνη",
    aliases: ["santorini", "σαντορινη", "thira", "fira", "θηρα"],
  },
  {
    value: "Κως",
    label: "Κως",
    aliases: ["kos", "κως", "cos"],
  },
  {
    value: "Πειραιάς",
    label: "Πειραιάς",
    aliases: ["piraeus", "πειραιας", "pireaus", "pireas"],
  },
  {
    value: "Περιστέρι",
    label: "Περιστέρι",
    aliases: ["peristeri", "περιστερι", "peristeria"],
  },
  {
    value: "Καλλιθέα",
    label: "Καλλιθέα",
    aliases: ["kallithea", "καλλιθεα", "kalithea"],
  },
  {
    value: "Αχαρνές",
    label: "Αχαρνές",
    aliases: ["acharnes", "αχαρνες", "acharnai", "menidi", "μενιδι"],
  },
  {
    value: "Ίλιον",
    label: "Ίλιον",
    aliases: ["ilion", "ιλιον", "nea liosia", "νεα λιοσια"],
  },
  {
    value: "Νέα Ιωνία",
    label: "Νέα Ιωνία",
    aliases: ["nea ionia", "νεα ιωνια", "neaionia"],
  },
  {
    value: "Μαρούσι",
    label: "Μαρούσι",
    aliases: ["marousi", "μαρουσι", "amarousion", "αμαρουσιον"],
  },
  {
    value: "Γλυφάδα",
    label: "Γλυφάδα",
    aliases: ["glyfada", "γλυφαδα", "glifada"],
  },
  {
    value: "Νίκαια",
    label: "Νίκαια",
    aliases: ["nikaia", "νικαια", "nicaea"],
  },
  {
    value: "Κερατσίνι",
    label: "Κερατσίνι",
    aliases: ["keratsini", "κερατσινι", "keratsinion"],
  },
]

// Function to check if a location matches a city (including aliases)
const matchesCity = (trainerLocation, selectedCity) => {
  if (!trainerLocation || selectedCity === "all") return true

  const city = GREEK_CITIES.find((c) => c.value === selectedCity)
  if (!city) return false

  const locationLower = trainerLocation.toLowerCase().trim()

  // Check exact match with city value
  if (locationLower.includes(city.value.toLowerCase())) return true

  // Check aliases
  return city.aliases.some(
    (alias) => locationLower.includes(alias.toLowerCase()) || alias.toLowerCase().includes(locationLower),
  )
}

const categoryByValue = (v) => TRAINER_CATEGORIES.find((c) => c.value === v) || null

/* Background particles component */
function AnimatedParticles() {
  const [particles, setParticles] = useState([])

  useEffect(() => {
    const newParticles = [...Array(15)].map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 3}s`,
      animationDuration: `${3 + Math.random() * 4}s`,
    }))
    setParticles(newParticles)
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((particle, i) => (
        <div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-white/20 animate-float"
          style={{
            left: particle.left,
            top: particle.top,
            animationDelay: particle.animationDelay,
            animationDuration: particle.animationDuration,
          }}
        >
          <div className="h-full w-full animate-pulse rounded-full bg-white/40" />
        </div>
      ))}
    </div>
  )
}

/* Avatar component */
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

/* Star Rating Component - Updated to match reference code */
function StarRating({ rating, reviewCount, size = "sm" }) {
  const stars = []
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

  const starSize = size === "lg" ? "h-5 w-5" : "h-4 w-4"

  // Full stars
  for (let i = 0; i < fullStars; i++) {
    stars.push(<Star key={`full-${i}`} className={`${starSize} fill-yellow-400 text-yellow-400`} />)
  }

  // Half star
  if (hasHalfStar) {
    stars.push(
      <div key="half" className={`relative ${starSize}`}>
        <Star className={`${starSize} text-zinc-600 absolute`} />
        <div className="overflow-hidden w-1/2">
          <Star className={`${starSize} fill-yellow-400 text-yellow-400`} />
        </div>
      </div>,
    )
  }

  // Empty stars
  for (let i = 0; i < emptyStars; i++) {
    stars.push(<Star key={`empty-${i}`} className={`${starSize} text-zinc-600`} />)
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">{stars}</div>
      <span className={`${size === "lg" ? "text-base" : "text-sm"} text-zinc-400`}>
        {rating > 0 ? (
          <>
            {rating.toFixed(1)} ({reviewCount} {reviewCount === 1 ? "κριτική" : "κριτικές"})
          </>
        ) : (
          "Χωρίς κριτικές"
        )}
      </span>
    </div>
  )
}

/* Filter Button Component */
function FilterButton({ active, onClick, Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center text-center gap-3 p-4 rounded-2xl font-medium border transition-all duration-300 hover:scale-105 ${
        active
          ? "bg-white text-black border-white shadow-lg shadow-white/20"
          : "bg-white/5 text-zinc-200 border-white/10 hover:bg-white/10 hover:border-white/20"
      }`}
      title={label}
    >
      <Icon className="h-8 w-8" />
      <span className="text-xs leading-tight">{label}</span>
    </button>
  )
}

/* Empty State Component */
function Empty({ search }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20 lg:py-32">
      <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-white/5 flex items-center justify-center">
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
      <button
        onClick={() => window.location.reload()}
        className="px-8 py-4 bg-white text-black rounded-2xl font-semibold hover:bg-zinc-200 transition-all duration-300"
      >
        Επαναφόρτωση
      </button>
    </motion.div>
  )
}

/* Availability Grid Component */
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
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/10 text-sm"
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

/* Trainer Card Component */
function TrainerCard({ list = false, trainer, onNavigate }) {
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
      className={`group relative overflow-hidden rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-500 cursor-pointer hover:scale-[1.02] hover:shadow-2xl hover:shadow-white/10 ${
        list ? "flex flex-col lg:flex-row min-h-[16rem]" : "flex flex-col h-full"
      }`}
      role="button"
      aria-label={`Προβολή ${trainer.full_name}`}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
    >
      {/* Hero Image */}
      <div className={list ? "relative h-64 lg:h-auto lg:w-80 shrink-0" : "relative h-72"}>
        <LargeAvatarCover url={trainer.avatar_url} alt={trainer.full_name} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {/* Favorite Button */}
        <button
          onClick={(e) => e.stopPropagation()}
          className="absolute top-4 left-4 h-12 w-12 grid place-items-center rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-all duration-300 hover:scale-110"
          title="Αγαπημένο"
        >
          <Heart className="h-5 w-5" />
        </button>
        {/* Status Badges */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <div className="relative group">
            <span
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl backdrop-blur-sm text-xs font-semibold cursor-help ${
                trainer.is_online ? "bg-emerald-500/90 text-white" : "bg-zinc-800/90 text-zinc-300"
              }`}
            >
              {trainer.is_online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              {trainer.is_online ? "Διαδικτυακά" : "Δια ζώσης"}
              <HelpCircle className="h-3 w-3" />
            </span>
            {/* Tooltip - Fixed positioning and z-index */}
            <div className="absolute top-full right-0 mt-2 w-72 p-4 bg-zinc-900/95 backdrop-blur-xl border border-white/20 text-white text-sm rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 pointer-events-none z-[60] shadow-2xl">
              <div className="relative">
                {/* Arrow pointing up */}
                <div className="absolute -top-6 right-4 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-zinc-900/95"></div>
                <div className="font-medium text-white mb-2">
                  {trainer.is_online ? "Διαδικτυακά Μαθήματα" : "Μαθήματα Δια Ζώσης"}
                </div>
                <div className="text-zinc-300 leading-relaxed">
                  {trainer.is_online
                    ? "Αυτός ο εκπαιδευτής προσφέρει μόνο διαδικτυακά μαθήματα. Επικοινωνήστε μαζί του αν θέλετε να μάθετε αν μπορεί να κάνει και μαθήματα δια ζώσης."
                    : "Αυτός ο εκπαιδευτής προσφέρει μόνο μαθήματα δια ζώσης. Επικοινωνήστε μαζί του αν θέλετε να μάθετε αν μπορεί να κάνει και διαδικτυακά μαθήματα."}
                </div>
              </div>
            </div>
          </div>
          {currentVacation && (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/90 backdrop-blur-sm text-black text-xs font-semibold">
              <Sun className="h-4 w-4" />
              Σε άδεια
            </span>
          )}
        </div>
      </div>
      {/* Content */}
      <div className={`${list ? "flex flex-col flex-1 p-8" : "flex flex-col flex-1 p-6"}`}>
        <div className="flex-1">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3
                  className={`${list ? "text-2xl" : "text-xl"} font-bold text-white group-hover:text-zinc-200 transition-colors`}
                >
                  {trainer.full_name}
                </h3>
                {trainer.diploma_url && trainer.diploma_url.trim() && (
                  <div className="relative group">
                    <BadgeCheck
                      className="h-5 w-5 text-blue-400 flex-shrink-0 cursor-help"
                      title="Πιστοποιημένος προπονητής"
                    />
                    {/* Tooltip */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-72 p-4 bg-zinc-900/95 backdrop-blur-xl border border-white/20 text-white text-sm rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 pointer-events-none z-[60] shadow-2xl">
                      <div className="relative">
                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-zinc-900/95"></div>
                        <div className="font-medium text-white mb-2 flex items-center gap-2">
                          <BadgeCheck className="h-4 w-4 text-blue-400" />
                          Πιστοποιημένος Προπονητής
                        </div>
                        <div className="text-zinc-300 leading-relaxed">
                          Αυτός ο προπονητής έχει ανεβάσει το δίπλωμά του στο Peak Velocity και έχει επαληθευτεί από την
                          πλατφόρμα μας.
                        </div>
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
          {/* Category */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-medium mb-4">
            {CatIcon ? <CatIcon className="h-5 w-5" /> : <Tag className="h-5 w-5" />}
            {cat ? cat.label : "Γενικός Εκπαιδευτής"}
          </div>
          {/* Star Rating Section - Fixed to match reference code exactly */}
          <div className="mb-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => {
                  const isFilled = i < Math.floor(trainer.rating || 0)
                  const isHalfFilled = i === Math.floor(trainer.rating || 0) && (trainer.rating || 0) % 1 >= 0.5
                  if (isHalfFilled) {
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
          {/* Tags */}
          {Array.isArray(trainer.tags) && trainer.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {trainer.tags.slice(0, 6).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300 text-xs hover:bg-white/10 transition-colors"
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
          {/* Availability */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-white mb-3">
              <CalendarIcon className="h-5 w-5" />
              <span className="font-medium">Διαθεσιμότητα</span>
            </div>
            <AvailabilityGrid availability={trainer.availability} />
          </div>
          {/* Next Vacation */}
          {!currentVacation && nextVacation && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm mb-4">
              <Sun className="h-4 w-4" />
              Προσεχής άδεια: {formatDate(nextVacation.starts_on)}–{formatDate(nextVacation.ends_on)}
            </div>
          )}
        </div>
        {/* Action Button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onNavigate(`/trainer/${trainer.id}`)
          }}
          className="w-full px-6 py-4 rounded-2xl font-semibold bg-white text-black hover:bg-zinc-200 transition-all duration-300 hover:scale-105"
        >
          Προβολή Προφίλ
        </button>
      </div>
    </motion.article>
  )
}

/* Controls Component - Updated with 3 specific filters */
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
      <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="p-8">
          {/* Stats Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {results} {results === 1 ? "εκπαιδευτής" : "εκπαιδευτές"} βρέθηκαν
              </h2>
              <p className="text-zinc-400">Επιλέξτε τον κατάλληλο για εσάς</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-emerald-200 text-sm font-medium">Ζωντανά αποτελέσματα</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            {/* Enhanced Search */}
            <div className="relative flex-1">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Αναζήτηση προπονητών, ειδικοτήτων, τοποθεσίας..."
                className="w-full pl-16 pr-12 py-5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-zinc-400 focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all duration-300"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 flex-wrap lg:flex-nowrap">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-3 px-6 py-5 rounded-2xl font-semibold transition-all duration-300 ${
                  showFilters
                    ? "bg-white text-black shadow-lg shadow-white/20"
                    : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                }`}
              >
                <Filter className="h-5 w-5" />
                Φίλτρα
                {showFilters ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>

              <div className="flex rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                <button
                  onClick={() => setView("grid")}
                  className={`px-5 py-5 transition-all duration-300 ${
                    view === "grid" ? "bg-white text-black" : "text-zinc-300 hover:text-white"
                  }`}
                >
                  <LayoutGrid className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`px-5 py-5 border-l border-white/10 transition-all duration-300 ${
                    view === "list" ? "bg-white text-black" : "text-zinc-300 hover:text-white"
                  }`}
                >
                  <ListIcon className="h-5 w-5" />
                </button>
              </div>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="px-6 py-5 bg-white/5 border border-white/10 rounded-2xl text-white min-w-[200px] appearance-none cursor-pointer transition-all duration-300 hover:bg-white/10"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' strokeLinecap='round' strokeLinejoin='round' strokeWidth='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e\")",
                  backgroundPosition: "right 1rem center",
                  backgroundSize: "1.5em 1.5em",
                  backgroundRepeat: "no-repeat",
                }}
              >
                <option value="newest" className="bg-zinc-900 text-white">
                  Νεότεροι
                </option>
                <option value="name" className="bg-zinc-900 text-white">
                  Όνομα A‑Z
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

          {/* NEW 3 Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4 }}
                className="border-t border-white/10 pt-8 space-y-8"
              >
                {/* Filter 1: Training Categories */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Τύπος Προπόνησης
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

                {/* Filter 2: Date */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Ημερομηνία Διαθεσιμότητας
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <button
                      onClick={() => setSelectedDate("")}
                      className={`flex items-center justify-center gap-2 p-4 rounded-2xl font-medium border transition-all duration-300 ${
                        selectedDate === ""
                          ? "bg-white text-black border-white shadow-lg shadow-white/20"
                          : "bg-white/5 text-zinc-200 border-white/10 hover:bg-white/10 hover:border-white/20"
                      }`}
                    >
                      <CalendarIcon className="h-5 w-5" />
                      <span className="text-sm">Οποιαδήποτε</span>
                    </button>
                    <button
                      onClick={() => setSelectedDate("today")}
                      className={`flex items-center justify-center gap-2 p-4 rounded-2xl font-medium border transition-all duration-300 ${
                        selectedDate === "today"
                          ? "bg-white text-black border-white shadow-lg shadow-white/20"
                          : "bg-white/5 text-zinc-200 border-white/10 hover:bg-white/10 hover:border-white/20"
                      }`}
                    >
                      <Clock className="h-5 w-5" />
                      <span className="text-sm">Σήμερα</span>
                    </button>
                    <button
                      onClick={() => setSelectedDate("tomorrow")}
                      className={`flex items-center justify-center gap-2 p-4 rounded-2xl font-medium border transition-all duration-300 ${
                        selectedDate === "tomorrow"
                          ? "bg-white text-black border-white shadow-lg shadow-white/20"
                          : "bg-white/5 text-zinc-200 border-white/10 hover:bg-white/10 hover:border-white/20"
                      }`}
                    >
                      <Sun className="h-5 w-5" />
                      <span className="text-sm">Αύριο</span>
                    </button>
                    <button
                      onClick={() => setSelectedDate("week")}
                      className={`flex items-center justify-center gap-2 p-4 rounded-2xl font-medium border transition-all duration-300 ${
                        selectedDate === "week"
                          ? "bg-white text-black border-white shadow-lg shadow-white/20"
                          : "bg-white/5 text-zinc-200 border-white/10 hover:bg-white/10 hover:border-white/20"
                      }`}
                    >
                      <CalendarIcon className="h-5 w-5" />
                      <span className="text-sm">Αυτή την εβδομάδα</span>
                    </button>
                  </div>
                </div>

                {/* Filter 3: City */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Πόλη
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {GREEK_CITIES.slice(0, 12).map((city) => (
                      <button
                        key={city.value}
                        onClick={() => setSelectedCity(city.value)}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl font-medium border transition-all duration-300 text-sm ${
                          selectedCity === city.value
                            ? "bg-white text-black border-white shadow-lg shadow-white/20"
                            : "bg-white/5 text-zinc-200 border-white/10 hover:bg-white/10 hover:border-white/20"
                        }`}
                      >
                        <MapPin className="h-4 w-4" />
                        <span>{city.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Dropdown for more cities */}
                  <div className="mt-4">
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white min-w-[250px] appearance-none cursor-pointer transition-all duration-300 hover:bg-white/10"
                      style={{
                        backgroundImage:
                          "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' strokeLinecap='round' strokeLinejoin='round' strokeWidth='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e\")",
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

                {/* Legacy Toggle Filters - Keep for backward compatibility */}
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
        </div>
      </div>
    </motion.section>
  )
}

export default function TrainersMarketplacePage() {
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

  // Add new state for the 3 filters
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedCity, setSelectedCity] = useState("all")

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

      // Fetch availability
      const { data: avs, error: aErr } = await supabase
        .from("trainer_availability")
        .select("trainer_id, weekday, start_time, end_time, is_online")
        .in("trainer_id", ids)

      if (aErr) {
        setErrorMsg(aErr.message || "Σφάλμα φόρτωσης διαθεσιμότητας.")
        return
      }

      // Fetch holidays
      const { data: hols, error: hErr } = await supabase
        .from("trainer_holidays")
        .select("trainer_id, starts_on, ends_on, reason")
        .in("trainer_id", ids)

      if (hErr) {
        setErrorMsg(hErr.message || "Σφάλμα φόρτωσης αδειών.")
        return
      }

      // Fetch ratings - using trainer_reviews table like in reference code
      const { data: reviews, error: rErr } = await supabase
        .from("trainer_reviews")
        .select("trainer_id, rating")
        .in("trainer_id", ids)

      // Don't fail if reviews table doesn't exist or has error
      const reviewsData = rErr ? [] : (reviews ?? [])

      const avByTrainer = (avs ?? []).reduce((m, r) => {
        ;(m[r.trainer_id] ||= []).push(r)
        return m
      }, {})

      const holByTrainer = (hols ?? []).reduce((m, r) => {
        ;(m[r.trainer_id] ||= []).push(r)
        return m
      }, {})

      // Calculate ratings by trainer
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

    // Updated city filtering with alias support
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-zinc-950 to-zinc-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-white text-lg">Φόρτωση εκπαιδευτών...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-zinc-900 text-white relative overflow-hidden">
      {/* Enhanced background with animations */}
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.1),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.08),transparent_50%),radial-gradient(circle_at_40%_60%,rgba(255,255,255,0.06),transparent_50%)] animate-pulse-slow" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(45deg,transparent_48%,rgba(255,255,255,0.02)_49%,rgba(255,255,255,0.02)_51%,transparent_52%)] bg-[length:20px_20px] animate-slide-diagonal" />
      <AnimatedParticles />

      <div className="relative z-10">
        {MenuComponent ? <MenuComponent /> : null}

        <main className="mx-auto max-w-none w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-12 lg:py-20">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm mb-6 animate-bounce-subtle">
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
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-8 auto-rows-fr"
            >
              {filtered.map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                >
                  <TrainerCard trainer={t} onNavigate={navigate} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
              {filtered.map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                  className="mb-8"
                >
                  <TrainerCard trainer={t} list onNavigate={navigate} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </main>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(120deg); }
          66% { transform: translateY(5px) rotate(240deg); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes slide-diagonal {
          0% { transform: translateX(-100px) translateY(-100px); }
          100% { transform: translateX(100px) translateY(100px); }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
        .animate-slide-diagonal { animation: slide-diagonal 20s linear infinite; }
        .animate-bounce-subtle { animation: bounce-subtle 2s ease-in-out infinite; }
        /* Tooltip styles */
        .group:hover .group-hover\\:visible {
          visibility: visible;
        }
        .group:hover .group-hover\\:opacity-100 {
          opacity: 1;
        }
      `}</style>
    </div>
  )
}
