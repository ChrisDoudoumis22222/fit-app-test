// src/pages/TrainerDashboard.js
"use client"
import { useEffect, useState, lazy, Suspense, useMemo, useCallback, memo } from "react"
import {
  Camera,
  Trash2,
  Calendar,
  Settings,
  Shield,
  ImagePlus,
  ChevronRight,
  Activity,
  Award,
  BarChart3,
  Clock,
  Trophy,
  MapPin,
  User,
  Target,
  Users,
  BookOpen,
  GraduationCap,
  Mail,
  Save,
  RotateCcw,
  KeyRound,
  Lock,
  Loader2,
  User as UserIcon, // alias: lucide-react doesn't export "UserIcon"
  Smartphone,
  AlertCircle,
  Wifi,
  WifiOff,
  X,
} from "lucide-react"
import { motion } from "framer-motion"
import { supabase } from "../supabaseClient"
import { FaDumbbell, FaUsers, FaAppleAlt, FaLaptop, FaRunning, FaMusic, FaHeartbeat } from "react-icons/fa"
import { MdFitnessCenter, MdSelfImprovement, MdHealthAndSafety, MdPsychology } from "react-icons/md"
import { GiMuscleUp, GiSwordsPower, GiWeightLiftingUp, GiBoxingGlove } from "react-icons/gi"
import { TbYoga, TbStethoscope } from "react-icons/tb"

// Lazy-loaded components
const AvatarUpload = lazy(() => import("../components/AvatarUpload"))
const DiplomaUpload = lazy(() => import("../components/DiplomaUpload"))
const TrainerMenu = lazy(() => import("../components/TrainerMenu"))

// Constants moved outside to prevent recreation
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
  {
    value: "personal_trainer",
    label: "Προσωπικός Εκπαιδευτής",
    iconKey: "dumbbell",
    specialties: [
      "Απώλεια λίπους",
      "Μυϊκή ενδυνάμωση",
      "Προπόνηση με βάρη",
      "Σωματική μεταμόρφωση",
      "Προετοιμασία αγώνων/διαγωνισμών",
      "Προπόνηση αρχαρίων",
      "Προπόνηση τρίτης ηλικίας",
      "Προπόνηση εγκύων",
    ],
  },
  {
    value: "group_fitness_instructor",
    label: "Εκπαιδευτής Ομαδικών Προγραμμάτων",
    iconKey: "users",
    specialties: [
      "HIIT υψηλής έντασης",
      "Bootcamp",
      "Λειτουργική προπόνηση (Functional)",
      "TRX",
      "Κυκλική προπόνηση (Circuit)",
      "Αερόβια προπόνηση (Cardio)",
      "Ομαδικά γυναικών",
    ],
  },
  {
    value: "pilates_instructor",
    label: "Εκπαιδευτής Pilates",
    iconKey: "pilates",
    specialties: [
      "Mat Pilates",
      "Reformer Pilates",
      "Προγεννητικό & Μεταγεννητικό",
      "Στάση σώματος / Ενδυνάμωση Core",
      "Pilates για αποκατάσταση",
    ],
  },
  {
    value: "yoga_instructor",
    label: "Εκπαιδευτής Yoga",
    iconKey: "yoga",
    specialties: ["Hatha Yoga", "Vinyasa Flow", "Power Yoga", "Yin Yoga", "Prenatal Yoga", "Mindfulness & Αναπνοές"],
  },
  {
    value: "nutritionist",
    label: "Διατροφολόγος",
    iconKey: "apple",
    specialties: [
      "Απώλεια βάρους",
      "Αύξηση μυϊκής μάζας",
      "Vegan / Χορτοφαγική διατροφή",
      "Διατροφική υποστήριξη αθλητών",
      "Προγράμματα διατροφής με delivery",
      "Εντερική υγεία & δυσανεξίες",
    ],
  },
  {
    value: "online_coach",
    label: "Online Προπονητής",
    iconKey: "laptop",
    specialties: [
      "Απομακρυσμένο 1-on-1 coaching",
      "Προγράμματα PDF / Video",
      "Συνδυασμός Διατροφής + Προπόνησης",
      "Ζωντανά μαθήματα μέσω Zoom",
      "Coaching υπευθυνότητας (accountability)",
    ],
  },
  {
    value: "strength_conditioning",
    label: "Προπονητής Δύναμης & Φυσικής Κατάστασης",
    iconKey: "strength",
    specialties: [
      "Ανάπτυξη αθλητών",
      "Αθλητικές επιδόσεις",
      "Ολυμπιακές άρσεις",
      "Πλειομετρικές ασκήσεις",
      "Ανθεκτικότητα σε τραυματισμούς",
    ],
  },
  {
    value: "calisthenics",
    label: "Εκπαιδευτής Calisthenics",
    iconKey: "calisthenics",
    specialties: [
      "Στατική δύναμη",
      "Δυναμικές δεξιότητες (Muscle-up, Planche)",
      "Ευκινησία & Έλεγχος",
      "Street workout",
      "Προπόνηση σε κρίκους",
    ],
  },
  {
    value: "crossfit_coach",
    label: "Προπονητής CrossFit",
    iconKey: "crossfit",
    specialties: [
      "Καθημερινός προγραμματισμός (WODs)",
      "Ολυμπιακές άρσεις",
      "Προετοιμασία για αγώνες",
      "Γυμναστικές δεξιότητες",
      "Metcons",
    ],
  },
  {
    value: "boxing_kickboxing",
    label: "Προπονητής Πυγμαχίας / Kickboxing",
    iconKey: "boxing",
    specialties: ["Cardio boxing", "Sparring", "Ασκήσεις με σάκο", "Βελτίωση τεχνικής", "Παιδιά / Αρχάριοι"],
  },
  {
    value: "martial_arts",
    label: "Εκπαιδευτής Πολεμικών Τεχνών",
    iconKey: "martial",
    specialties: [
      "Brazilian Jiu-Jitsu (BJJ)",
      "Muay Thai",
      "Καράτε",
      "Krav Maga",
      "Αυτοάμυνα",
      "Taekwondo",
      "Προετοιμασία MMA",
    ],
  },
  {
    value: "dance_fitness",
    label: "Εκπαιδευτής Χορευτικής Γυμναστικής",
    iconKey: "dance",
    specialties: [
      "Zumba",
      "Latin dance fitness",
      "Afrobeat / Hip hop cardio",
      "Τόνωση γυναικών",
      "Χορός για ηλικιωμένους",
    ],
  },
  {
    value: "running_coach",
    label: "Προπονητής Τρεξίματος",
    iconKey: "running",
    specialties: [
      "Μαραθώνιος / Ημιμαραθώνιος",
      "Προπόνηση sprint",
      "Διόρθωση τεχνικής τρεξίματος",
      "Προπόνηση αντοχής",
      "Τρέξιμο για αρχάριους",
    ],
  },
  {
    value: "physiotherapist",
    label: "Φυσικοθεραπευτής",
    iconKey: "physio",
    specialties: [
      "Αποκατάσταση τραυματισμών",
      "Manual therapy",
      "Κινησιοθεραπεία",
      "Χρόνιοι πόνοι",
      "Αθλητική αποκατάσταση",
    ],
  },
  {
    value: "rehab_prevention",
    label: "Ειδικός Αποκατάστασης / Πρόληψης Τραυματισμών",
    iconKey: "rehab",
    specialties: [
      "Εργονομική ενδυνάμωση",
      "Διόρθωση κινητικών προτύπων",
      "Ισορροπία & σταθερότητα",
      "Επανένταξη μετά από χειρουργείο",
    ],
  },
  {
    value: "wellness_life_coach",
    label: "Προπονητής Ευεξίας & Ζωής",
    iconKey: "wellness",
    specialties: [
      "Διαχείριση άγχους",
      "Coaching συνηθειών & χρόνου",
      "Ψυχική ανθεκτικότητα",
      "Αποκατάσταση από burnout",
      "Ολιστικός καθορισμός στόχων",
    ],
  },
  {
    value: "performance_psych",
    label: "Προπονητής Απόδοσης / Αθλητικός Ψυχολόγος",
    iconKey: "psychology",
    specialties: [
      "Εκπαίδευση συγκέντρωσης",
      "Ψυχολογία ημέρας αγώνα",
      "Τεχνικές οπτικοποίησης",
      "Αγωνιστικό mindset",
      "Κατάσταση ροής (flow state) coaching",
    ],
  },
]

// Removed the "availability" tab (schedule page)
const SECTIONS = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3, color: "from-blue-600 to-blue-700" },
  { id: "profile", label: "Προφίλ", icon: Settings, color: "from-zinc-600 to-zinc-700" },
  { id: "avatar", label: "Avatar", icon: ImagePlus, color: "from-gray-600 to-gray-700" },
  { id: "credentials", label: "Πιστοποιήσεις", icon: GraduationCap, color: "from-green-600 to-green-700" },
  { id: "security", label: "Ασφάλεια", icon: Shield, color: "from-zinc-700 to-zinc-800" },
]

/* ------------------ Hash routing helpers ------------------ */
const SECTION_IDS = new Set(SECTIONS.map((s) => s.id))
const getHashSection = () => {
  if (typeof window === "undefined") return "dashboard"
  const raw = (window.location.hash || "").replace("#", "").toLowerCase()
  return SECTION_IDS.has(raw) ? raw : "dashboard"
}

const PLACEHOLDER = "/placeholder.svg?height=120&width=120&text=Avatar"

/* ------------------ FIXED Auth Hook ------------------ */
const useAuth = () => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)

  // `loading` NOW ONLY tracks the session/auth check (global splash)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // separate flag for profile fetches (optional local spinners)
  const [profileLoading, setProfileLoading] = useState(false)

  const fetchProfile = useCallback(async (userId) => {
    try {
      setProfileLoading(true)
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .eq("role", "trainer")
        .single()

      if (error) {
        if (error.code === "PGRST116") {
          setError("Δεν βρέθηκε προφίλ προπονητή")
          setProfile(null)
        } else {
          throw error
        }
        return
      }

      setProfile(data)
      setError(null)
    } catch (e) {
      console.error("Error fetching profile:", e)
      setError(e.message || "Σφάλμα φόρτωσης προφίλ")
      setProfile(null)
    } finally {
      setProfileLoading(false) // don't touch `loading` here
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()
        if (!mounted) return

        if (error) {
          setError(error.message)
          setUser(null)
          setProfile(null)
          setLoading(false) // end splash even on error
          return
        }

        setUser(session?.user ?? null)
        setLoading(false) // end splash as soon as we know session
        if (session?.user) fetchProfile(session.user.id) // fire & forget
        else setProfile(null)
      } catch (e) {
        if (!mounted) return
        setError(e.message)
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
    })

    return () => {
      mounted = false
      subscription?.unsubscribe?.()
    }
  }, [fetchProfile])

  const updateProfile = useCallback(
    async (updates) => {
      if (!profile?.id) return { error: "Δεν υπάρχει προφίλ" }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("id", profile.id)
          .select()
          .single()

        if (error) throw error

        setProfile(data)
        return { data, error: null }
      } catch (e) {
        console.error("Error updating profile:", e)
        return { error: e.message }
      }
    },
    [profile?.id],
  )

  return {
    user,
    profile,
    loading, // global auth/session loading (splash)
    error,
    updateProfile,
    profileLoading, // optional local loading
    refetchProfile: useCallback(() => fetchProfile(user?.id), [fetchProfile, user?.id]),
  }
}

// helper for booking dates
const getBookingDate = (b) => {
  const v =
    b?.scheduled_at ||
    b?.start_time ||
    b?.start_at ||
    b?.session_at ||
    b?.booking_at ||
    b?.booking_date ||
    b?.date ||
    b?.created_at

  if (!b?.date && b?.booking_date && b?.time) {
    try {
      const d = new Date(b.booking_date)
      const [h, m] = String(b.time).split(":")
      if (!Number.isNaN(Number.parseInt(h))) d.setHours(Number.parseInt(h), Number.parseInt(m || "0"), 0, 0)
      return d
    } catch (_) {}
  }

  try {
    return v ? new Date(v) : null
  } catch (_) {
    return null
  }
}

// Spinner
const Spinner = memo(({ size = 6 }) => <Loader2 className={`h-${size} w-${size} animate-spin`} />)

// Background
const AthleticBackground = memo(() => (
  <>
    <style>{`
      @keyframes pulse-performance {
         0%, 100% { opacity: 0.1; transform: scale(1); }
         50% { opacity: 0.3; transform: scale(1.05); }
       }
      @keyframes drift-metrics {
         0% { transform: translateX(-100px) translateY(0px); }
         50% { transform: translateX(50px) translateY(-30px); }
         100% { transform: translateX(100px) translateY(0px); }
       }
      @keyframes athletic-grid {
         0% { transform: translate(0, 0) rotate(0deg); }
         100% { transform: translate(60px, 60px) rotate(0.5deg); }
       }
      @keyframes performance-wave {
        0% { transform: translateY(0px) scaleY(1); }
        50% { transform: translateY(-10px) scaleY(1.1); }
        100% { transform: translateY(0px) scaleY(1); }
      }
      @keyframes data-flow {
         0% { transform: translateX(-100%) translateY(0px); opacity: 0; }
         50% { opacity: 0.3; }
         100% { transform: translateX(100vw) translateY(-20px); opacity: 0; }
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
      <div
        className="absolute top-1/5 left-1/5 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-zinc-600/8 rounded-full blur-3xl"
        style={{ animation: "pulse-performance 12s ease-in-out infinite" }}
      />
      <div
        className="absolute top-3/5 right-1/5 w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] bg-gray-700/8 rounded-full blur-3xl"
        style={{ animation: "pulse-performance 15s ease-in-out infinite reverse" }}
      />
      <div
        className="absolute top-1/2 left-1/2 w-[200px] h-[200px] sm:w-[300px] sm:h-[300px] bg-zinc-800/8 rounded-full blur-3xl"
        style={{ animation: "drift-metrics 20s ease-in-out infinite" }}
      />
    </div>
    <div className="fixed inset-0 z-0 pointer-events-none">
      <svg className="w-full h-full opacity-5" viewBox="0 0 1200 800">
        <path
          d="M0,400 Q300,350 600,400 T1200,400"
          stroke="rgba(113,113,122,0.3)"
          strokeWidth="2"
          fill="none"
          style={{ animation: "performance-wave 8s ease-in-out infinite" }}
        />
        <path
          d="M0,450 Q300,400 600,450 T1200,450"
          stroke="rgba(113,113,122,0.2)"
          strokeWidth="1"
          fill="none"
          style={{ animation: "performance-wave 10s ease-in-out infinite reverse" }}
        />
      </svg>
    </div>
    <div className="fixed inset-0 z-0 pointer-events-none">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-0.5 bg-gradient-to-r from-transparent via-zinc-500/20 to-transparent"
          style={{
            top: `${20 + i * 15}%`,
            animation: `data-flow ${8 + i * 2}s linear infinite`,
            animationDelay: `${i * 1.5}s`,
          }}
        />
      ))}
    </div>
  </>
))

// Navigation
const PremiumNavigation = memo(({ currentSection, onSectionChange }) => {
  return (
    <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 sm:mb-10">
      {SECTIONS.map(({ id, label, icon: Icon, color }, index) => (
        <motion.button
          key={id}
          onClick={() => onSectionChange(id)}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.5 }}
          className={`group relative flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-3 lg:px-6 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-500 overflow-hidden ${
            currentSection === id
              ? "bg-gradient-to-r from-zinc-700 to-zinc-800 text-zinc-100 shadow-2xl scale-105"
              : "bg-black/30 text-zinc-400 hover:bg-black/50 hover:text-zinc-300 hover:scale-102"
          }`}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <div
            className={`absolute inset-0 bg-gradient-to-r ${color} opacity-0 group-hover:opacity-20 transition-opacity duration-500`}
          />
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 relative z-10 flex-shrink-0" />
          <span className="relative z-10 hidden sm:inline lg:inline">{label}</span>
          {currentSection === id && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 bg-gradient-to-r from-zinc-600/20 to-zinc-700/20 rounded-xl sm:rounded-2xl"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
        </motion.button>
      ))}
    </div>
  )
})

// Data hook (NO caching)
const useTrainerData = (profile) => {
  const [performanceData, setPerformanceData] = useState({
    todayStats: { sessionsToday: 0, activeClients: 0, upcomingSessions: 0, monthlyProgress: 0 },
    recentSessions: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTrainerData = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select(`
          *,
          user:profiles!bookings_user_id_fkey(full_name, email)
        `)
        .eq("trainer_id", profile.id)
        .order("created_at", { ascending: false })

      if (bookingsError && bookingsError.code !== "PGRST116") throw bookingsError

      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const list = (bookings || []).map((b) => {
        const when = getBookingDate(b) || new Date(b.created_at)
        return { ...b, _when: when }
      })

      const sorted = [...list].sort((a, b) => (b._when?.getTime() || 0) - (a._when?.getTime() || 0))

      const todayBookings = sorted.filter((b) => b._when && b._when >= todayStart && b._when < todayEnd)
      const upcomingBookings = sorted.filter((b) => b._when && b._when > now && b.status !== "cancelled")
      const monthlyBookings = sorted.filter((b) => b._when && b._when >= monthStart && b.status === "confirmed")

      const activeClientIds = new Set(
        sorted.filter((b) => b._when && b._when >= thirtyDaysAgo && b.status !== "cancelled").map((b) => b.user_id),
      )

      const monthlyTarget = 20
      const monthlyProgress = Math.min((monthlyBookings.length / monthlyTarget) * 100, 100)

      const recentSessions = sorted.slice(0, 5).map((booking) => ({
        id: booking.id,
        client: booking.user?.full_name || booking.user?.email || "Άγνωστος πελάτης",
        type: booking.service_type || "Προπόνηση",
        time:
          booking.time ||
          booking.start_time ||
          booking.scheduled_time ||
          (booking._when ? booking._when.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" }) : "—"),
        date: booking._when ? booking._when.toLocaleDateString("el-GR") : "—",
        status: booking.status,
        duration: booking.duration || "60 λεπτά",
      }))

      const newData = {
        todayStats: {
          sessionsToday: todayBookings.filter((b) => b.status === "confirmed").length,
          activeClients: activeClientIds.size,
          upcomingSessions: upcomingBookings.length,
          monthlyProgress: Math.round(monthlyProgress),
        },
        recentSessions,
      }

      setPerformanceData(newData)
      setError(null)
    } catch (e) {
      console.error("Error fetching trainer data:", e)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false)
      return
    }
    fetchTrainerData()
  }, [profile?.id, fetchTrainerData])

  return {
    performanceData,
    loading,
    error,
    refetch: useCallback(() => fetchTrainerData(), [fetchTrainerData]),
  }
}

// Stats (mobile: 2×2, md+: 4 across)
const TrainerPerformanceStats = memo(({ performanceData, loading }) => {
  const stats = useMemo(
    () => [
      {
        label: "Σημερινές Συνεδρίες",
        value: loading ? "..." : performanceData.todayStats.sessionsToday,
        icon: Activity,
        trend: loading
          ? "..."
          : performanceData.todayStats.sessionsToday > 0
            ? `+${performanceData.todayStats.sessionsToday}`
            : "0",
        color: "from-blue-600/20 to-blue-700/20",
        borderColor: "border-blue-500/30",
      },
      {
        label: "Ενεργοί Πελάτες",
        value: loading ? "..." : performanceData.todayStats.activeClients,
        icon: Users,
        trend: loading ? "..." : `${performanceData.todayStats.activeClients} ενεργοί`,
        color: "from-green-600/20 to-green-700/20",
        borderColor: "border-green-500/30",
      },
      {
        label: "Επερχόμενες Συνεδρίες",
        value: loading ? "..." : performanceData.todayStats.upcomingSessions,
        icon: Clock,
        trend: loading ? "..." : performanceData.todayStats.upcomingSessions > 0 ? "Προγραμματισμένες" : "Καμία",
        color: "from-orange-600/20 to-orange-700/20",
        borderColor: "border-orange-500/30",
      },
      {
        label: "Μηνιαίος Στόχος",
        value: loading ? "..." : `${performanceData.todayStats.monthlyProgress}%`,
        icon: Target,
        trend: loading ? "..." : performanceData.todayStats.monthlyProgress >= 80 ? "Εξαιρετικά" : "Καλά",
        color: "from-purple-600/20 to-purple-700/20",
        borderColor: "border-purple-500/30",
      },
    ],
    [performanceData, loading],
  )

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.6 }}
          className={`relative overflow-hidden rounded-xl sm:rounded-2xl bg-black/40 backdrop-blur-xl border ${stat.borderColor} p-4 sm:p-6`}
          whileHover={{ y: -4, scale: 1.02 }}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${stat.color}`} />
          <div className="relative">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <stat.icon className="w-6 h-6 sm:w-8 sm:h-8 text-zinc-300" />
              <span className="text-xs font-semibold text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                {stat.trend}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-1">{stat.value}</div>
            <div className="text-xs sm:text-sm text-zinc-400">{stat.label}</div>
          </div>
        </motion.div>
      ))}
    </div>
  )
})

// Keep-mounted section (no unmount on tab change)
const DashSection = memo(({ id, show, children }) => {
  return (
    <section id={id} className={`scroll-mt-28 ${show ? "block" : "hidden"}`}>
      {children}
    </section>
  )
})

// Profile card
const TrainerProfileCard = memo(({ profile }) => {
  const memberSince = useMemo(
    () =>
      profile.created_at
        ? new Date(profile.created_at).toLocaleDateString("el-GR", {
            month: "long",
            year: "numeric",
          })
        : "Άγνωστο",
    [profile.created_at],
  )

  const currentCategory = useMemo(
    () => TRAINER_CATEGORIES.find((cat) => cat.value === profile.specialty),
    [profile.specialty],
  )

  const CategoryIcon = currentCategory?.iconKey ? ICON_BY_KEY[currentCategory.iconKey] : Trophy

  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-black/40 backdrop-blur-xl border border-zinc-700/50 p-4 sm:p-6 lg:p-8">
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4 sm:mb-6 lg:mb-8">
          <div>
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-zinc-100 mb-2">Το Προφίλ μου</h3>
            <p className="text-zinc-400 text-sm sm:text-base">Επαγγελματικά στοιχεία</p>
          </div>
          <User className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
        </div>
        <div className="space-y-3 sm:space-y-4 lg:space-y-6">
          <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-zinc-800/30 border border-zinc-700/30">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-600/20 to-blue-700/20 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-zinc-100 font-semibold text-sm sm:text-base truncate">
                {profile?.full_name || "Προπονητής"}
              </h4>
              <p className="text-xs sm:text-sm text-zinc-400 capitalize">{profile?.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-zinc-800/30 border border-zinc-700/30">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-r from-green-600/20 to-green-700/20 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-zinc-100 font-semibold text-sm sm:text-base">Μέλος από</h4>
              <p className="text-xs sm:text-sm text-zinc-400">{memberSince}</p>
            </div>
          </div>
          {profile?.specialty && currentCategory && (
            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-zinc-800/30 border border-zinc-700/30">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-r from-purple-600/20 to-purple-700/20 flex items-center justify-center flex-shrink-0">
                <CategoryIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-zinc-100 font-semibold text-sm sm:text-base">Κατηγορία</h4>
                <p className="text-xs sm:text-sm text-zinc-400 truncate">{currentCategory.label}</p>
              </div>
            </div>
          )}
          {profile?.experience_years && (
            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-zinc-800/30 border border-zinc-700/30">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-r from-orange-600/20 to-orange-700/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-zinc-100 font-semibold text-sm sm:text-base">Εμπειρία</h4>
                <p className="text-xs sm:text-sm text-zinc-400">{profile.experience_years} χρόνια</p>
              </div>
            </div>
          )}
          {profile?.is_online !== undefined && (
            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-zinc-800/30 border border-zinc-700/30">
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-r ${profile.is_online ? "from-green-600/20 to-green-700/20" : "from-zinc-600/20 to-zinc-700/20"} flex items-center justify-center flex-shrink-0`}
              >
                {profile.is_online ? (
                  <Wifi className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                ) : (
                  <WifiOff className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-zinc-100 font-semibold text-sm sm:text-base">Διαθεσιμότητα</h4>
                <p className={`text-xs sm:text-sm ${profile.is_online ? "text-green-400" : "text-zinc-400"}`}>
                  {profile.is_online ? "Online διαθέσιμος" : "Offline"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

// Credentials card
const TrainerCredentialsCard = memo(({ profile }) => {
  const trainerId = useMemo(() => {
    if (!profile?.id) return "ΠΡ-2024-ΠΙΣΤ-0000"
    const shortId = profile.id.slice(-4).toUpperCase()
    return `ΠΡ-2024-ΠΙΣΤ-${shortId}`
  }, [profile?.id])

  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-black/40 backdrop-blur-xl border border-zinc-700/50 p-4 sm:p-6 lg:p-8">
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4 sm:mb-6 lg:mb-8">
          <div>
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-zinc-100 mb-2">Πιστοποιήσεις</h3>
            <p className="text-zinc-400 text-sm sm:text-base">Επαγγελματικός κωδικός</p>
          </div>
          <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400" />
        </div>
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center gap-3 rounded-lg sm:rounded-xl bg-black/30 p-3 sm:p-4 ring-1 ring-zinc-700/30">
            <Shield className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-yellow-400" />
            <p className="truncate text-xs sm:text-sm text-zinc-200 font-mono">{trainerId}</p>
          </div>
          {profile?.roles && profile.roles.length > 0 && (
            <div>
              <h4 className="text-zinc-100 font-semibold mb-3 text-sm sm:text-base">Ειδικότητες</h4>
              <div className="space-y-2">
                {profile.roles.slice(0, 3).map((role, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs sm:text-sm text-zinc-300">
                    <Award className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400 flex-shrink-0" />
                    <span className="truncate">{role}</span>
                  </div>
                ))}
                {profile.roles.length > 3 && (
                  <p className="text-xs text-zinc-500 mt-2">+{profile.roles.length - 3} περισσότερες</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

// Recent sessions card
const RecentSessionsCard = memo(({ sessions, loading }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-black/40 backdrop-blur-xl border border-zinc-700/50 p-4 sm:p-6 lg:p-8">
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4 sm:mb-6 lg:mb-8">
          <div>
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-zinc-100 mb-2">Πρόσφατες Συνεδρίες</h3>
            <p className="text-zinc-400 text-sm sm:text-base">Από τον πίνακα bookings</p>
          </div>
        </div>
        <div className="space-y-3 sm:space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size={6} />
            </div>
          ) : sessions.length > 0 ? (
            sessions.map((session, index) => (
              <motion.div
                key={session.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-zinc-800/30 border border-zinc-700/30"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-r from-purple-600/20 to-purple-700/20 flex items-center justify-center flex-shrink-0">
                  <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-zinc-100 font-semibold truncate text-sm sm:text-base">{session.client}</h4>
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-zinc-400 mt-1">
                    <span className="truncate">{session.type}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{session.date}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{session.time}</span>
                  </div>
                </div>
                <div
                  className={`text-xs px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${
                    session.status === "confirmed"
                      ? "bg-green-400/10 text-green-400"
                      : session.status === "pending"
                        ? "bg-yellow-400/10 text-yellow-400"
                        : "bg-red-400/10 text-red-400"
                  }`}
                >
                  {session.status === "confirmed"
                    ? "Ολοκληρώθηκε"
                    : session.status === "pending"
                      ? "Εκκρεμής"
                      : "Ακυρωμένη"}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 sm:w-16 sm:h-16 text-zinc-600 mx-auto mb-4 sm:mb-6" />
              <h4 className="text-lg sm:text-xl font-bold text-zinc-100 mb-3">Δεν υπάρχουν συνεδρίες</h4>
              <p className="text-zinc-400 text-sm sm:text-base">Οι κρατήσεις σας θα εμφανιστούν εδώ</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

// Quick actions
const QuickActionsCard = memo(() => {
  const actions = useMemo(
    () => [
      {
        icon: Calendar,
        label: "Κρατήσεις",
        color: "from-blue-600/20 to-blue-700/20",
        path: "/trainer/bookings",
      },
      {
        icon: Users,
        label: "Πληρωμές",
        color: "from-green-600/20 to-green-700/20",
        path: "/trainer/payments",
      },
      {
        icon: BarChart3,
        label: "Avatar",
        color: "from-purple-600/20 to-purple-700/20",
        path: "#avatar",
      },
      {
        icon: Settings,
        label: "Ασφάλεια",
        color: "from-zinc-600/20 to-zinc-700/20",
        path: "#security",
      },
    ],
    [],
  )

  const handleActionClick = (path) => {
    if (path.startsWith("#")) {
      // use hash assignment for deep link; the app listens for hashchange and updates state
      window.location.hash = path
    } else {
      window.location.href = path
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-black/40 backdrop-blur-xl border border-zinc-700/50 p-4 sm:p-6 lg:p-8">
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4 sm:mb-6 lg:mb-8">
          <div>
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-zinc-100 mb-2">Γρήγορες Ενέργειες</h3>
            <p className="text-zinc-400 text-sm sm:text-base">Συχνά χρησιμοποιούμενα</p>
          </div>
          <Target className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {actions.map((action, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleActionClick(action.path)}
              className="flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-zinc-800/30 border border-zinc-700/30 hover:bg-zinc-800/50 transition-all"
            >
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-r ${action.color} flex items-center justify-center`}
              >
                <action.icon className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-100" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-zinc-100 text-center leading-tight">
                {action.label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
})

// Avatar area
const AvatarArea = memo(({ avatar, placeholder, onUpload, onDelete }) => {
  return (
    <div className="flex flex-col items-center gap-6 sm:gap-8">
      <div className="relative group">
        <div className="absolute -inset-4 sm:-inset-6 bg-gradient-to-r from-zinc-600/20 to-gray-700/20 rounded-2xl sm:rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500" />
        <img
          src={avatar || placeholder}
          alt="Avatar"
          className="relative w-24 h-24 sm:w-32 sm:h-32 lg:w-48 lg:h-48 rounded-2xl sm:rounded-3xl object-cover border-4 border-zinc-700/50 shadow-2xl transition-all duration-500 group-hover:scale-105 group-hover:border-zinc-600/70"
        />
        <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
      <div className="flex flex-wrap gap-3 sm:gap-4 items-center justify-center">
        <Suspense fallback={<Spinner size={4} />}>
          <AvatarUpload url={avatar} onUpload={onUpload} icon={<Camera size={18} />} />
        </Suspense>
        {avatar !== placeholder && (
          <button
            onClick={onDelete}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 hover:border-red-500/50 px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-300 text-sm sm:text-base"
          >
            <Trash2 className="inline w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Διαγραφή
          </button>
        )}
      </div>
    </div>
  )
})

// Quick action button
const QuickActionButton = memo(({ icon: Icon, label, primary = false, onClick }) => {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-semibold transition-all duration-300 text-sm sm:text-base flex-1 sm:flex-initial justify-center sm:justify-start ${
        primary
          ? "bg-gradient-to-r from-blue-600 to-blue-700 text-zinc-100 shadow-lg hover:from-blue-500 hover:to-blue-600"
          : "bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50 hover:text-zinc-100 border border-zinc-700/50"
      }`}
    >
      <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
      <span className="hidden sm:inline truncate">{label}</span>
    </motion.button>
  )
})

// Premium card
const PremiumCard = memo(({ title, icon: Icon, description, children }) => {
  const cardGlass = useMemo(
    () => ({
      background: "rgba(0, 0, 0, 0.4)",
      backdropFilter: "blur(20px) saturate(160%)",
      WebkitBackdropFilter: "blur(20px) saturate(160%)",
      border: "1px solid rgba(113, 113, 122, 0.15)",
    }),
    [],
  )

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-2xl sm:rounded-3xl"
      style={cardGlass}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zinc-600 via-zinc-500 to-zinc-600" />
      <div className="relative bg-transparent border-none shadow-none">
        <div className="pb-4 sm:pb-6 p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4 text-zinc-100">
            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-zinc-700/50 to-zinc-800/50 border border-zinc-600/30 flex-shrink-0">
              <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-300" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-lg sm:text-xl font-bold block truncate">{title}</span>
              <p className="text-xs sm:text-sm text-zinc-400 font-normal mt-1">{description}</p>
            </div>
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-500 flex-shrink-0" />
          </div>
        </div>
        <div className="space-y-6 sm:space-y-8 pb-6 sm:pb-8 px-4 sm:px-6">{children}</div>
      </div>
    </motion.div>
  )
})

// Main optimized dashboard component
function TrainerDashboard() {
  // Add document-level black background classes
  useEffect(() => {
    document.documentElement.classList.add("bg-black")
    document.body.classList.add("bg-black")
    return () => {
      document.documentElement.classList.remove("bg-black")
      document.body.classList.remove("bg-black")
    }
  }, [])

  const { user, profile, loading: authLoading, error: authError, updateProfile } = useAuth()
  const { performanceData, loading: dataLoading, error: dataError } = useTrainerData(profile)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [avatar, setAvatar] = useState(PLACEHOLDER)

  // --- hash-based section state
  const [section, setSection] = useState(getHashSection)

  // reflect URL → UI on back/forward & external links
  useEffect(() => {
    const onHashChange = () => setSection(getHashSection())
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  // reflect UI → URL (avoid extra history entries)
  useEffect(() => {
    const current = (window.location.hash || "").replace("#", "").toLowerCase()
    if (current !== section) {
      history.replaceState(null, "", `#${section}`)
    }
  }, [section])

  // navigate helper for buttons / nav
  const navigateToSection = useCallback((id) => {
    if (!SECTION_IDS.has(id)) return
    setSection(id)
    history.replaceState(null, "", `#${id}`)
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  // Profile form states
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    bio: "",
    specialty: "",
    location: "",
    experienceYears: "",
    isOnline: false,
    selectedSpecialties: [],
  })
  const [profileLoading, setProfileLoading] = useState(false)

  // Password states
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    error: "",
    success: "",
    loading: false,
  })

  // live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // sync profile once when it arrives/changes
  useEffect(() => {
    if (!profile) return
    setProfileForm({
      fullName: profile.full_name || "",
      phone: profile.phone || "",
      email: profile.email || "",
      bio: profile.bio || "",
      specialty: profile.specialty || "",
      location: profile.location || "",
      experienceYears: profile.experience_years?.toString() || "",
      isOnline: profile.is_online || false,
      selectedSpecialties: profile.roles || [],
    })
    setAvatar(profile.avatar_url || PLACEHOLDER)
  }, [profile])

  const deleteAvatar = useCallback(async () => {
    if (!window.confirm("Είστε σίγουροι ότι θέλετε να διαγράψετε το avatar;")) return

    try {
      const { error } = await updateProfile({ avatar_url: null })
      if (error) throw new Error(error)
      setAvatar(PLACEHOLDER)
    } catch (err) {
      alert(err.message || "Σφάλμα κατά τη διαγραφή")
    }
  }, [updateProfile])

  const handleAvatarUpload = useCallback(
    async (url) => {
      try {
        const { error } = await updateProfile({ avatar_url: url })
        if (error) throw new Error(error)
        setAvatar(url)
      } catch (err) {
        alert(err.message || "Σφάλμα κατά την ενημέρωση")
      }
    },
    [updateProfile],
  )

  const toggleSpecialty = useCallback((specialtyName) => {
    setProfileForm((prev) => ({
      ...prev,
      selectedSpecialties: prev.selectedSpecialties.includes(specialtyName)
        ? prev.selectedSpecialties.filter((s) => s !== specialtyName)
        : [...prev.selectedSpecialties, specialtyName],
    }))
  }, [])

  const handleSaveProfile = useCallback(
    async (e) => {
      e.preventDefault()
      setProfileLoading(true)

      try {
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: profileForm.fullName.trim(),
            phone: profileForm.phone.trim(),
            bio: profileForm.bio.trim(),
            specialty: profileForm.specialty.trim(),
            location: profileForm.location.trim(),
            experience_years: profileForm.experienceYears ? Number.parseInt(profileForm.experienceYears) : null,
            is_online: profileForm.isOnline,
            roles: profileForm.selectedSpecialties,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id)

        if (error) throw new Error(error.message)
        alert("Το προφίλ ενημερώθηκε επιτυχώς!")
      } catch (err) {
        alert(err.message || "Σφάλμα κατά την ενημέρωση του προφίλ")
      } finally {
        setProfileLoading(false)
      }
    },
    [profile?.id, profileForm],
  )

  const handleChangePassword = useCallback(
    async (e) => {
      e.preventDefault()
      setPasswordForm((prev) => ({ ...prev, error: "", success: "", loading: true }))

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setPasswordForm((prev) => ({ ...prev, error: "Οι κωδικοί πρόσβασης δεν ταιριάζουν", loading: false }))
        return
      }

      if (passwordForm.newPassword.length < 6) {
        setPasswordForm((prev) => ({ ...prev, error: "Ελάχιστο μήκος 6 χαρακτήρες", loading: false }))
        return
      }

      try {
        const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword })
        if (error) throw error

        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
          error: "",
          success: "Ο κωδικός άλλαξε επιτυχώς!",
          loading: false,
        })
      } catch (err) {
        setPasswordForm((prev) => ({
          ...prev,
          error: err.message || "Σφάλμα κατά την αλλαγή κωδικού",
          loading: false,
        }))
      }
    },
    [passwordForm.newPassword, passwordForm.confirmPassword],
  )

  const profileData = useMemo(
    () => ({
      fullName: profile?.full_name || "Προπονητή",
      location: profile?.location,
      isOnline: profile?.is_online,
    }),
    [profile?.full_name, profile?.location, profile?.is_online],
  )

  const currentCategory = useMemo(
    () => TRAINER_CATEGORIES.find((cat) => cat.value === profileForm.specialty),
    [profileForm.specialty],
  )
  const CategoryIcon = currentCategory?.iconKey ? ICON_BY_KEY[currentCategory.iconKey] : Trophy

  // Loading state (only while checking session)
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black">
        <AthleticBackground />
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-zinc-700/30 border-t-zinc-500 rounded-full animate-spin" />
              <div className="absolute inset-2 border-2 border-zinc-800/30 border-t-zinc-600 rounded-full animate-spin animate-reverse" />
            </div>
            <div className="text-center">
              <p className="text-zinc-300 text-base sm:text-lg font-semibold">Φόρτωση Dashboard</p>
              <p className="text-zinc-500 text-sm">Προετοιμασία των δεδομένων σας...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (authError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black">
        <AthleticBackground />
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="flex flex-col items-center gap-6 max-w-md text-center">
            <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 text-red-400" />
            <div>
              <p className="text-red-400 text-base sm:text-lg font-semibold mb-2">Σφάλμα Φόρτωσης</p>
              <p className="text-zinc-400 text-sm">{authError}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded-lg transition-colors"
            >
              Επανάληψη
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black">
        <AthleticBackground />
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="flex flex-col items-center gap-6 max-w-md text-center">
            <User className="w-12 h-12 sm:w-16 sm:h-16 text-zinc-400" />
            <div>
              <p className="text-zinc-300 text-base sm:text-lg font-semibold mb-2">Δεν βρέθηκε προφίλ προπονητή</p>
              <p className="text-zinc-400 text-sm">Παρακαλώ επικοινωνήστε με τον διαχειριστή</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-zinc-900 text-white relative overflow-hidden pb-[70px] sm:pb-8">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.1),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.08),transparent_50%),radial-gradient(circle_at_40%_60%,rgba(255,255,255,0.06),transparent_50%)] animate-pulse-slow" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(45deg,transparent_48%,rgba(255,255,255,0.02)_49%,rgba(255,255,255,0.02)_51%,transparent_52%)] bg-[length:20px_20px] animate-slide-diagonal" />

      <AthleticBackground />

      <div className="relative z-10">
        {/* Sidebar Menu */}
        <Suspense fallback={<Spinner />}>
          <TrainerMenu userProfile={profile} onLogout={() => supabase.auth.signOut()} />
        </Suspense>

        {/* Main Content */}
        <main className="relative z-10 min-h-screen">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-10 space-y-4 sm:space-y-6 lg:space-y-10">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-zinc-100 truncate">
                    Καλώς ήρθες, {profileData.fullName}
                  </h1>
                  {profileData.isOnline ? (
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
                      <Wifi className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 text-sm font-medium">Online</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1 bg-zinc-500/20 border border-zinc-500/30 rounded-full">
                      <WifiOff className="w-4 h-4 text-zinc-400" />
                      <span className="text-zinc-400 text-sm font-medium">Offline</span>
                    </div>
                  )}
                </div>
                <p className="text-zinc-400 text-sm sm:text-base lg:text-lg">
                  {currentTime.toLocaleDateString("el-GR", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  •{" "}
                  {currentTime.toLocaleTimeString("el-GR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {profileData.location && (
                  <p className="text-zinc-500 text-xs sm:text-sm flex items-center gap-2 mt-1">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">{profileData.location}</span>
                  </p>
                )}
              </div>
              <div className="flex gap-2 sm:gap-4 w-full lg:w-auto">
                <QuickActionButton
                  icon={Calendar}
                  label="Προγραμματισμός"
                  primary
                  onClick={() => {
                    window.location.href = "/trainer/bookings"
                  }}
                />
                <QuickActionButton icon={Settings} label="Ρυθμίσεις" onClick={() => navigateToSection("profile")} />
              </div>
            </motion.div>

            {/* Navigation */}
            <PremiumNavigation currentSection={section} onSectionChange={navigateToSection} />

            {/* Sections (kept mounted to avoid reset on tab change) */}
            <div className="space-y-6 sm:space-y-8">
              {/* Dashboard */}
              <DashSection id="dashboard" show={section === "dashboard"}>
                <div className="space-y-6 sm:space-y-8">
                  <TrainerPerformanceStats performanceData={performanceData} loading={dataLoading} />

                  {/* Profile Summary & Trainer ID */}
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="xl:col-span-2"
                    >
                      <TrainerProfileCard profile={profile} />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <TrainerCredentialsCard profile={profile} />
                    </motion.div>
                  </div>

                  {/* Recent Sessions & Quick Actions */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <RecentSessionsCard sessions={performanceData.recentSessions} loading={dataLoading} />
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <QuickActionsCard />
                    </motion.div>
                  </div>

                  {/* Data Error Display */}
                  {dataError && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-center"
                    >
                      <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                      <p className="text-red-400 text-sm">Σφάλμα φόρτωσης δεδομένων: {dataError}</p>
                    </motion.div>
                  )}
                </div>
              </DashSection>

              {/* Profile */}
              <DashSection id="profile" show={section === "profile"}>
                <PremiumCard
                  title="Επεξεργασία Προφίλ"
                  icon={Settings}
                  description="Διαχειρίσου τα προσωπικά σου στοιχεία"
                >
                  <form onSubmit={handleSaveProfile} className="space-y-4 sm:space-y-6 max-w-4xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-100">
                          <UserIcon className="h-4 w-4" /> Πλήρες Όνομα
                        </label>
                        <input
                          className="block w-full rounded-lg border border-zinc-700/30 bg-black/30 px-4 py-3 text-sm placeholder-zinc-500 focus:bg-black/50 focus:outline-none focus:ring-2 focus:ring-blue-400 sm:text-base text-zinc-100"
                          value={profileForm.fullName}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, fullName: e.target.value }))}
                          placeholder="Εισάγετε πλήρες όνομα"
                          disabled={profileLoading}
                        />
                      </div>
                      <div>
                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-100">
                          <Smartphone className="h-4 w-4" /> Τηλέφωνο
                        </label>
                        <input
                          className="block w-full rounded-lg border border-zinc-700/30 bg-black/30 px-4 py-3 text-sm placeholder-zinc-500 focus:bg-black/50 focus:outline-none focus:ring-2 focus:ring-blue-400 sm:text-base text-zinc-100"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                          placeholder="Εισάγετε τηλέφωνο"
                          disabled={profileLoading}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-100">
                        <Mail className="h-4 w-4" /> Email
                      </label>
                      <input
                        type="email"
                        disabled
                        value={profileForm.email}
                        className="block w-full cursor-not-allowed rounded-lg border border-zinc-700/30 bg-zinc-800/30 px-4 py-3 text-sm text-zinc-400 sm:text-base"
                      />
                    </div>
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-100">
                        <BookOpen className="h-4 w-4" /> Βιογραφικό
                      </label>
                      <textarea
                        className="block w-full rounded-lg border border-zinc-700/30 bg-black/30 px-4 py-3 text-sm placeholder-zinc-500 focus:bg-black/50 focus:outline-none focus:ring-2 focus:ring-blue-400 sm:text-base min-h-[100px] resize-y text-zinc-100"
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
                        placeholder="Περιγράψτε την εμπειρία και τις ειδικότητές σας"
                        disabled={profileLoading}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-100">
                          <CategoryIcon className="h-4 w-4" /> Κατηγορία
                        </label>
                        <select
                          className="block w-full rounded-lg border border-zinc-700/30 bg-black/30 px-4 py-3 text-sm focus:bg-black/50 focus:outline-none focus:ring-2 focus:ring-blue-400 sm:text-base text-zinc-100"
                          value={profileForm.specialty}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, specialty: e.target.value }))}
                          disabled={profileLoading}
                        >
                          <option value="" className="bg-zinc-800">
                            — Επίλεξε κατηγορία —
                          </option>
                          {TRAINER_CATEGORIES.map((category) => (
                            <option key={category.value} value={category.value} className="bg-zinc-800">
                              {category.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-100">
                          <MapPin className="h-4 w-4" /> Τοποθεσία
                        </label>
                        <input
                          className="block w-full rounded-lg border border-zinc-700/30 bg-black/30 px-4 py-3 text-sm placeholder-zinc-500 focus:bg-black/50 focus:outline-none focus:ring-2 focus:ring-blue-400 sm:text-base text-zinc-100"
                          value={profileForm.location}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, location: e.target.value }))}
                          placeholder="Εισάγετε τοποθεσία"
                          disabled={profileLoading}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <label className="mb-2 flex items:center gap-2 text-sm font-medium text-zinc-100">
                          <Clock className="h-4 w-4" /> Χρόνια Εμπειρίας
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="50"
                          className="block w-full rounded-lg border border-zinc-700/30 bg-black/30 px-4 py-3 text-sm placeholder-zinc-500 focus:bg-black/50 focus:outline-none focus:ring-2 focus:ring-blue-400 sm:text-base text-zinc-100"
                          value={profileForm.experienceYears}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, experienceYears: e.target.value }))}
                          placeholder="Εισάγετε χρόνια εμπειρίας"
                          disabled={profileLoading}
                        />
                      </div>
                      <div>
                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-100">
                          {profileForm.isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}{" "}
                          Διαθεσιμότητα
                        </label>
                        <div className="flex items-center gap-4 p-3 rounded-lg border border-zinc-700/30 bg-black/30">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={profileForm.isOnline}
                              onChange={(e) => setProfileForm((prev) => ({ ...prev, isOnline: e.target.checked }))}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                              disabled={profileLoading}
                            />
                            <span className="text-sm text-zinc-100">Online διαθέσιμος</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Specialties Selection */}
                    {profileForm.specialty && currentCategory && (
                      <div>
                        <label className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-100">
                          <Trophy className="h-4 w-4" /> Ειδικότητες ({currentCategory.label})
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-4 rounded-lg border border-zinc-700/30 bg-black/20">
                          {currentCategory.specialties.map((spec) => (
                            <label
                              key={spec}
                              className="flex items-center gap-2 text-sm text-zinc-300 hover:text-zinc-100 transition-colors cursor-pointer p-2 rounded hover:bg-zinc-800/30"
                            >
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                checked={profileForm.selectedSpecialties.includes(spec)}
                                onChange={() => toggleSpecialty(spec)}
                                disabled={profileLoading}
                              />
                              <span className="truncate">{spec}</span>
                            </label>
                          ))}
                        </div>
                        {profileForm.selectedSpecialties.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-zinc-400 mb-2">Επιλεγμένες ειδικότητες:</p>
                            <div className="flex flex-wrap gap-2">
                              {profileForm.selectedSpecialties.map((spec) => (
                                <span
                                  key={spec}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full"
                                >
                                  {spec}
                                  <button
                                    type="button"
                                    onClick={() => toggleSpecialty(spec)}
                                    className="hover:text-blue-100"
                                    disabled={profileLoading}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={profileLoading}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-zinc-100 hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {profileLoading ? <Spinner size={4} /> : <Save className="h-4 w-4" />}
                      {profileLoading ? "Αποθήκευση..." : "Αποθήκευση αλλαγών"}
                    </button>
                  </form>
                </PremiumCard>
              </DashSection>

              {/* Avatar */}
              <DashSection id="avatar" show={section === "avatar"}>
                <PremiumCard
                  title="Διαχείριση Avatar"
                  icon={ImagePlus}
                  description="Προσαρμόσε την εικόνα του προφίλ σου"
                >
                  <AvatarArea
                    avatar={avatar}
                    placeholder={PLACEHOLDER}
                    onUpload={handleAvatarUpload}
                    onDelete={deleteAvatar}
                  />
                </PremiumCard>
              </DashSection>

              {/* Credentials */}
              <DashSection id="credentials" show={section === "credentials"}>
                <PremiumCard
                  title="Πιστοποιήσεις & Πιστοποιήσεις"
                  icon={GraduationCap}
                  description="Διαχειρίσου τα επαγγελματικά σου Πιστοποιήσεις"
                >
                  <div className="space-y-6 sm:space-y-8">
                    <div>
                      <h4 className="text-base sm:text-lg font-semibold text-zinc-100 mb-4">Ειδικότητες</h4>
                      <div className="space-y-3">
                        {profile?.roles && profile.roles.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {profile.roles.map((role, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/30"
                              >
                                <Award className="w-5 h-5 text-blue-400 flex-shrink-0" />
                                <span className="text-zinc-100 text-sm sm:text-base truncate">{role}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Award className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                            <p className="text-zinc-400 text-sm">Δεν έχετε προσθέσει ειδικότητες ακόμα</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-base sm:text-lg font-semibold text-zinc-100 mb-4">Δίπλωμα</h4>
                      <Suspense fallback={<Spinner />}>
                        <DiplomaUpload
                          profileId={profile?.id}
                          currentUrl={profile?.diploma_url}
                          onChange={(url) => console.log("Diploma updated:", url)}
                        />
                      </Suspense>
                    </div>
                  </div>
                </PremiumCard>
              </DashSection>

              {/* Security */}
              <DashSection id="security" show={section === "security"}>
                <PremiumCard title="Ρυθμίσεις Ασφαλείας" icon={Shield} description="Προστάτευσε τον λογαριασμό σου">
                  <form onSubmit={handleChangePassword} className="space-y-4 sm:space-y-6 max-w-lg">
                    {passwordForm.error && (
                      <div className="rounded-lg bg-red-600/20 p-4 text-sm text-red-300 border border-red-500/30">
                        {passwordForm.error}
                      </div>
                    )}
                    {passwordForm.success && (
                      <div className="rounded-lg bg-green-600/20 p-4 text-sm text-green-300 border border-green-500/30">
                        {passwordForm.success}
                      </div>
                    )}
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-100">
                        <Lock className="h-4 w-4" /> Τρέχων Κωδικός
                      </label>
                      <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) =>
                          setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                        }
                        className="block w-full rounded-lg border border-zinc-700/30 bg-black/30 px-4 py-3 text-sm placeholder-zinc-500 focus:bg-black/50 focus:outline-none focus:ring-2 focus:ring-blue-400 sm:text-base text-zinc-100"
                        placeholder="Εισάγετε τον τρέχοντα κωδικό"
                        disabled={passwordForm.loading}
                      />
                    </div>
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-100">
                        <KeyRound className="h-4 w-4" /> Νέος Κωδικός
                      </label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) =>
                          setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                        }
                        className="block w-full rounded-lg border border-zinc-700/30 bg-black/30 px-4 py-3 text-sm placeholder-zinc-500 focus:bg-black/50 focus:outline-none focus:ring-2 focus:ring-blue-400 sm:text-base text-zinc-100"
                        placeholder="Εισάγετε νέο κωδικό"
                        required
                        disabled={passwordForm.loading}
                      />
                    </div>
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-100">
                        <KeyRound className="h-4 w-4" /> Επιβεβαίωση Κωδικού
                      </label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) =>
                          setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                        }
                        className="block w-full rounded-lg border border-zinc-700/30 bg-black/30 px-4 py-3 text-sm placeholder-zinc-500 focus:bg-black/50 focus:outline-none focus:ring-2 focus:ring-blue-400 sm:text-base text-zinc-100"
                        placeholder="Επιβεβαιώστε τον νέο κωδικό"
                        required
                        disabled={passwordForm.loading}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={passwordForm.loading}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-zinc-100 hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {passwordForm.loading ? <Spinner size={4} /> : <RotateCcw className="h-4 w-4" />}
                      {passwordForm.loading ? "Αλλαγή..." : "Αλλαγή Κωδικού"}
                    </button>
                  </form>
                </PremiumCard>
              </DashSection>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

// Main export
export default memo(TrainerDashboard)
