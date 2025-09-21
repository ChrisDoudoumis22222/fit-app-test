// FILE: src/pages/TrainerDashboard.js
"use client";

import React, {
  useEffect,
  useState,
  lazy,
  Suspense,
  useMemo,
  useCallback,
  memo,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  Trash2,
  Calendar,
  Settings,
  Shield,
  ImagePlus,
  ChevronRight,
  Activity,
  BarChart3,
  Clock,
  Trophy,
  MapPin,
  User,
  Target,
  Mail,
  Save,
  RotateCcw,
  KeyRound,
  Lock,
  Loader2,
  User as UserIcon, // alias
  Smartphone,
  AlertCircle,
  Wifi,
  WifiOff,
  XCircle,
  CheckCircle2,
  ArrowUpRight,
  GraduationCap,
  BookOpen,
  X, // tag remove
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";

// react-icons for categories
import {
  FaDumbbell,
  FaUsers,
  FaAppleAlt,
  FaLaptop,
  FaRunning,
  FaMusic,
  FaHeartbeat,
} from "react-icons/fa";
import {
  MdFitnessCenter,
  MdSelfImprovement,
  MdHealthAndSafety,
  MdPsychology,
} from "react-icons/md";
import {
  GiMuscleUp,
  GiSwordsPower,
  GiWeightLiftingUp,
  GiBoxingGlove,
} from "react-icons/gi";
import { TbYoga, TbStethoscope } from "react-icons/tb";

// Lazy-loaded chunks
const AvatarUpload = lazy(() => import("../components/AvatarUpload"));
const DiplomaUpload = lazy(() => import("../components/DiplomaUpload"));
const TrainerMenu = lazy(() => import("../components/TrainerMenu"));

/* -------------------------------- constants -------------------------------- */
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
};

const TRAINER_CATEGORIES = [
  { value: "personal_trainer", label: "Προσωπικός Εκπαιδευτής", iconKey: "dumbbell", specialties: ["Απώλεια λίπους","Μυϊκή ενδυνάμωση","Προπόνηση με βάρη","Σωματική μεταμόρφωση","Προετοιμασία αγώνων/διαγωνισμών","Προπόνηση αρχαρίων","Προπόνηση τρίτης ηλικίας","Προπόνηση εγκύων"] },
  { value: "group_fitness_instructor", label: "Εκπαιδευτής Ομαδικών Προγραμμάτων", iconKey: "users", specialties: ["HIIT υψηλής έντασης","Bootcamp","Λειτουργική προπόνηση (Functional)","TRX","Κυκλική προπόνηση (Circuit)","Αερόβια προπόνηση (Cardio)","Ομαδικά γυναικών"] },
  { value: "pilates_instructor", label: "Εκπαιδευτής Pilates", iconKey: "pilates", specialties: ["Mat Pilates","Reformer Pilates","Προγεννητικό & Μεταγεννητικό","Στάση σώματος / Ενδυνάμωση Core","Pilates για αποκατάσταση"] },
  { value: "yoga_instructor", label: "Εκπαιδευτής Yoga", iconKey: "yoga", specialties: ["Hatha Yoga","Vinyasa Flow","Power Yoga","Yin Yoga","Prenatal Yoga","Mindfulness & Αναπνοές"] },
  { value: "nutritionist", label: "Διατροφολόγος", iconKey: "apple", specialties: ["Απώλεια βάρους","Αύξηση μυϊκής μάζας","Vegan / Χορτοφαγική διατροφή","Διατροφική υποστήριξη αθλητών","Προγράμματα διατροφής με delivery","Εντερική υγεία & δυσανεξίες"] },
  { value: "online_coach", label: "Online Προπονητής", iconKey: "laptop", specialties: ["Απομακρυσμένο 1-on-1 coaching","Προγράμματα PDF / Video","Συνδυασμός Διατροφής + Προπόνησης","Ζωντανά μαθήματα μέσω Zoom","Coaching υπευθυνότητας (accountability)"] },
  { value: "strength_conditioning", label: "Προπονητής Δύναμης & Φυσικής Κατάστασης", iconKey: "strength", specialties: ["Ανάπτυξη αθλητών","Αθλητικές επιδόσεις","Ολυμπιακές άρσεις","Πλειομετρικές ασκήσεις","Ανθεκτικότητα σε τραυματισμούς"] },
  { value: "calisthenics", label: "Εκπαιδευτής Calisthenics", iconKey: "calisthenics", specialties: ["Στατική δύναμη","Δυναμικές δεξιότητες (Muscle-up, Planche)","Ευκινησία & Έλεγχος","Street workout","Προπόνηση σε κρίκους"] },
  { value: "crossfit_coach", label: "Προπονητής CrossFit", iconKey: "crossfit", specialties: ["Καθημερινός προγραμματισμός (WODs)","Ολυμπιακές άρσεις","Προετοιμασία για αγώνες","Γυμναστικές δεξιότητες","Metcons"] },
  { value: "boxing_kickboxing", label: "Προπονητής Πυγμαχίας / Kickboxing", iconKey: "boxing", specialties: ["Cardio boxing","Sparring","Ασκήσεις με σάκο","Βελτίωση τεχνικής","Παιδιά / Αρχάριοι"] },
  { value: "martial_arts", label: "Εκπαιδευτής Πολεμικών Τεχνών", iconKey: "martial", specialties: ["Brazilian Jiu-Jitsu (BJJ)","Muay Thai","Καράτε","Krav Maga","Αυτοάμυνα","Taekwondo","Προετοιμασία MMA"] },
  { value: "dance_fitness", label: "Εκπαιδευτής Χορευτικής Γυμναστικής", iconKey: "dance", specialties: ["Zumba","Latin dance fitness","Afrobeat / Hip hop cardio","Τόνωση γυναικών","Χορός για ηλικιωμένους"] },
  { value: "running_coach", label: "Προπονητής Τρεξίματος", iconKey: "running", specialties: ["Μαραθώνιος / Ημιμαραθώνιος","Προπόνηση sprint","Διόρθωση τεχνικής τρεξίματος","Προπόνηση αντοχής","Τρέξιμο για αρχάριους"] },
  { value: "physiotherapist", label: "Φυσικοθεραπευτής", iconKey: "physio", specialties: ["Αποκατάσταση τραυματισμών","Manual therapy","Κινησιοθεραπεία","Χρόνιοι πόνοι","Αθλητική αποκατάσταση"] },
  { value: "rehab_prevention", label: "Ειδικός Αποκατάστασης / Πρόληψης Τραυματισμών", iconKey: "rehab", specialties: ["Εργονομική ενδυνάμωση","Διόρθωση κινητικών προτύπων","Ισορροπία & σταθερότητα","Επανένταξη μετά από χειρουργείο"] },
  { value: "wellness_life_coach", label: "Προπονητής Ευεξίας & Ζωής", iconKey: "wellness", specialties: ["Διαχείριση άγχους","Coaching συνηθειών & χρόνου","Ψυχική ανθεκτικότητα","Αποκατάσταση από burnout","Ολιστικός καθορισμός στόχων"] },
  { value: "performance_psych", label: "Προπονητής Απόδοσης / Αθλητικός Ψυχολόγος", iconKey: "psychology", specialties: ["Εκπαίδευση συγκέντρωσης","Ψυχολογία ημέρας αγώνα","Τεχνικές οπτικοποίησης","Αγωνιστικό mindset","Κατάσταση ροής (flow state) coaching"] },
];

const SECTIONS = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3, color: "from-blue-600 to-blue-700" },
  { id: "profile", label: "Προφίλ", icon: Settings, color: "from-zinc-600 to-zinc-700" },
  { id: "avatar", label: "Avatar", icon: ImagePlus, color: "from-gray-600 to-gray-700" },
  { id: "credentials", label: "Πιστοποιήσεις", icon: GraduationCap, color: "from-green-600 to-green-700" },
  { id: "security", label: "Ασφάλεια", icon: Shield, color: "from-zinc-700 to-zinc-800" },
];

const SECTION_IDS = new Set(SECTIONS.map((s) => s.id));
const getHashSection = () => {
  const raw = (typeof window !== "undefined" ? window.location.hash : "") || "";
  const id = raw.replace("#", "").toLowerCase();
  return SECTION_IDS.has(id) ? id : "dashboard";
};

const PLACEHOLDER = "/images/defaults/trainer-avatar.png";

/* ------------------------------ helpers ------------------------------ */
// Forgiving status normalizer (handles EN/GR variants + flag columns)
const normalizeStatus = (raw, b = {}) => {
  const v = String(raw ?? "").toLowerCase().trim();

  // flag/columns commonly used
  const flagDeclined =
    Boolean(b.declined || b.is_declined || b.rejected || b.canceled || b.cancelled) ||
    Boolean(b.declined_at || b.rejected_at || b.canceled_at || b.cancelled_at) ||
    ["rejected_by_trainer", "rejected_by_user", "cancelled_by_trainer", "cancelled_by_user"].includes(v);

  const flagAccepted =
    Boolean(b.accepted || b.is_accepted || b.approved || b.confirmed) ||
    Boolean(b.accepted_at || b.approved_at || b.confirmed_at) ||
    ["accepted_by_trainer", "approved", "confirmed"].includes(v);

  if (flagDeclined) return "declined";
  if (flagAccepted) return "accepted";

  // substring heuristics (English + Greek roots)
  if (/(declin|reject|cancell|cancel|ακυρ|άρνη|αρνή|απορρ)/.test(v)) return "declined";
  if (/(accept|confirm|approv|ok|εγκρ|ενέκρ|εγκεκρι|επιβεβ)/.test(v)) return "accepted";
  if (/(pend|await|αναμον|request|εκκρε)/.test(v)) return "pending";

  // explicit fallbacks
  if (["declined", "rejected", "cancelled", "canceled"].includes(v)) return "declined";
  if (["accepted", "approved", "confirmed"].includes(v)) return "accepted";
  if (["pending", "awaiting", "requested"].includes(v)) return "pending";

  return v || "pending";
};

const getBookingDate = (b) => {
  const v =
    b?.scheduled_at ||
    b?.start_time ||
    b?.start_at ||
    b?.session_at ||
    b?.booking_at ||
    b?.booking_date ||
    b?.date ||
    b?.created_at;

  if (!b?.date && b?.booking_date && b?.time) {
    try {
      const d = new Date(b.booking_date);
      const [h, m] = String(b.time).split(":");
      if (!Number.isNaN(Number.parseInt(h, 10))) d.setHours(Number.parseInt(h, 10), Number.parseInt(m || "0", 10), 0, 0);
      return d;
    } catch {}
  }
  try {
    return v ? new Date(v) : null;
  } catch {
    return null;
  }
};

/* ------------------------------ tiny UI bits ------------------------------ */
const Spinner = memo(function Spinner({ size = 24 }) {
  return <Loader2 style={{ width: size, height: size }} className="animate-spin text-zinc-400" />;
});

/* ------------------------------ background ------------------------------ */
const AthleticBackground = memo(function AthleticBackground() {
  return (
    <>
      <style>{`
        @keyframes pulse-performance { 0%,100% { opacity: .1; transform: scale(1);} 50% { opacity: .3; transform: scale(1.05);} }
        @keyframes drift-metrics { 0% { transform: translateX(-100px) translateY(0); } 50% { transform: translateX(50px) translateY(-30px);} 100% { transform: translateX(100px) translateY(0);} }
        @keyframes athletic-grid { 0% { transform: translate(0,0) rotate(0deg);} 100% { transform: translate(60px,60px) rotate(.5deg);} }
        @keyframes performance-wave { 0% { transform: translateY(0) scaleY(1);} 50% { transform: translateY(-10px) scaleY(1.1);} 100% { transform: translateY(0) scaleY(1);} }
        @keyframes data-flow { 0% { transform: translateX(-100%) translateY(0); opacity: 0; } 50% { opacity: .3; } 100% { transform: translateX(100vw) translateY(-20px); opacity: 0; } }
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
      <div className="fixed inset-0 pointer-events-none">
        <svg className="w-full h-full opacity-5" viewBox="0 0 1200 800" aria-hidden="true">
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
      <div className="fixed inset-0 pointer-events-none">
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
  );
});

/* ------------------------------ navigation ------------------------------ */
const PremiumNavigation = memo(function PremiumNavigation({ currentSection, onSectionChange }) {
  return (
    <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 sm:mb-10">
      {SECTIONS.map(({ id, label, icon: Icon, color }, index) => (
        <motion.button
          key={id}
          type="button"
          onClick={() => onSectionChange(id)}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.5 }}
          className={`group relative flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-3 lg:px-6 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-500 overflow-hidden ${
            currentSection === id
              ? "bg-gradient-to-r from-zinc-700 to-zinc-800 text-zinc-100 shadow-2xl scale-105"
              : "bg-black/30 text-zinc-400 hover:bg-black/50 hover:text-zinc-300 hover:scale-[1.02]"
          }`}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className={`absolute inset-0 bg-gradient-to-r ${color} opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />
          <span className="relative z-10 flex-shrink-0">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </span>
          <span className="relative z-10 hidden sm:inline">{label}</span>
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
  );
});

/* ------------------------------ data hook ------------------------------ */
const useTrainerData = (profile) => {
  const [performanceData, setPerformanceData] = useState({
    todayStats: {
      sessionsToday: 0,
      activeClients: 0,
      upcomingSessions: 0,
      monthlyProgress: 0,
      acceptedTotal: 0,
      declinedTotal: 0,
    },
    grouped: { upcoming: [], accepted: [], declined: [] },
    recentSessions: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTrainerData = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select(`
          *,
          user:profiles!bookings_user_id_fkey(full_name, email)
        `)
        .eq("trainer_id", profile.id)
        .order("created_at", { ascending: false });

      if (bookingsError && bookingsError.code !== "PGRST116") throw bookingsError;

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const list = (bookings || []).map((b) => {
        const when = getBookingDate(b) || new Date(b.created_at);
        const statusNorm = normalizeStatus(b.status, b); // ⬅ pass whole booking
        return { ...b, _when: when, _status: statusNorm };
      });

      const sorted = [...list].sort((a, b) => (b._when?.getTime() || 0) - (a._when?.getTime() || 0));

      const upcoming = sorted.filter((b) => b._when && b._when > now && b._status !== "declined");
      const accepted = sorted.filter((b) => b._status === "accepted");
      const declined = sorted.filter((b) => b._status === "declined");

      const todayAccepted = sorted.filter(
        (b) => b._status === "accepted" && b._when && b._when >= todayStart && b._when < todayEnd,
      );

      const monthlyAccepted = sorted.filter((b) => b._status === "accepted" && b._when && b._when >= monthStart);

      const activeClientIds = new Set(
        sorted.filter((b) => b._when && b._when >= thirtyDaysAgo && b._status !== "declined").map((b) => b.user_id),
      );

      const monthlyTarget = 20;
      const monthlyProgress = Math.min((monthlyAccepted.length / monthlyTarget) * 100, 100);

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
        status: booking._status,
        duration: booking.duration || "60 λεπτά",
      }));

      setPerformanceData({
        todayStats: {
          sessionsToday: todayAccepted.length,
          activeClients: activeClientIds.size,
          upcomingSessions: upcoming.length,
          monthlyProgress: Math.round(monthlyProgress),
          acceptedTotal: accepted.length,
          declinedTotal: declined.length,
        },
        grouped: {
          upcoming: upcoming.slice(0, 10),
          accepted: accepted.slice(0, 10),
          declined: declined.slice(0, 10),
        },
        recentSessions,
      });
      setError(null);
    } catch (e) {
      console.error("Error fetching trainer data:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchTrainerData();
  }, [fetchTrainerData]);

  useEffect(() => {
    if (!profile?.id) return undefined;
    const channel = supabase
      .channel(`rt-bookings-trainer-${profile.id}`)
      .on(
        "postgres_changes",
        { schema: "public", table: "bookings", event: "*", filter: `trainer_id=eq.${profile.id}` },
        () => fetchTrainerData(),
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [profile?.id, fetchTrainerData]);

  return {
    performanceData,
    loading,
    error,
    refetch: useCallback(() => fetchTrainerData(), [fetchTrainerData]),
  };
};

/* ------------------------------ stats ------------------------------ */
const TrainerPerformanceStats = memo(function TrainerPerformanceStats({
  performanceData,
  loading,
  onJumpToBookings,
}) {
  // Top tiles (2 only)
  const statsTop = useMemo(
    () => [
      {
        key: "today",
        label: "Σημερινές Συνεδρίες",
        value: loading ? "..." : performanceData.todayStats.sessionsToday,
        icon: Activity,
        trend: loading ? "..." : (performanceData.todayStats.sessionsToday > 0 ? `+${performanceData.todayStats.sessionsToday}` : "0"),
        color: "from-blue-600/20 to-blue-700/20",
        borderColor: "border-blue-500/30",
      },
      {
        key: "monthly",
        label: "Μηνιαίος Στόχος",
        value: loading ? "..." : `${performanceData.todayStats.monthlyProgress}%`,
        icon: Target,
        trend: loading ? "..." : (performanceData.todayStats.monthlyProgress >= 80 ? "Εξαιρετικά" : "Καλά"),
        color: "from-purple-600/20 to-purple-700/20",
        borderColor: "border-purple-500/30",
      },
    ],
    [performanceData, loading],
  );

  const statsBookings = useMemo(
    () => [
      {
        key: "accepted",
        label: "Αποδεκτές Κρατήσεις",
        value: loading ? "..." : performanceData.todayStats.acceptedTotal,
        icon: CheckCircle2,
        color: "from-emerald-600/20 to-emerald-700/20",
        borderColor: "border-emerald-500/30",
        rightTag: "Σύνολο",
      },
      {
        key: "declined",
        label: "Απορριφθείσες",
        value: loading ? "..." : performanceData.todayStats.declinedTotal,
        icon: XCircle,
        color: "from-rose-600/20 to-rose-700/20",
        borderColor: "border-rose-500/30",
        rightTag: "Σύνολο",
      },
      {
        key: "upcoming",
        label: "Επερχόμενες",
        value: loading ? "..." : performanceData.todayStats.upcomingSessions,
        icon: ArrowUpRight,
        color: "from-amber-600/20 to-amber-700/20",
        borderColor: "border-amber-500/30",
        rightTag: "Σύντομα",
      },
    ],
    [performanceData, loading],
  );

  return (
    <>
      {/* Top stats: 2 tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
        {statsTop.map((stat, index) => (
          <motion.button
            key={stat.key}
            type="button"
            onClick={() => onJumpToBookings(stat.key)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.4 }}
            className={`text-left relative overflow-hidden rounded-xl sm:rounded-2xl bg-black/40 backdrop-blur-xl border ${stat.borderColor} p-4 sm:p-6 w-full`}
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
          </motion.button>
        ))}
      </div>

      {/* Bookings summary row (3 tiles) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {statsBookings.map((stat, index) => (
          <motion.button
            key={stat.key}
            type="button"
            onClick={() => onJumpToBookings(stat.key)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.45 }}
            className={`text-left relative overflow-hidden rounded-xl sm:rounded-2xl bg-black/40 backdrop-blur-xl border ${stat.borderColor} p-4 sm:p-6 w-full`}
            whileHover={{ y: -4, scale: 1.02 }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color}`} />
            <div className="relative">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <stat.icon className="w-6 h-6 sm:w-8 sm:h-8 text-zinc-300" />
                <span className="text-[10px] font-semibold text-zinc-300 bg-white/10 px-2 py-1 rounded-full">
                  {stat.rightTag}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-1">{stat.value}</div>
              <div className="text-xs sm:text-sm text-zinc-400">{stat.label}</div>
            </div>
          </motion.button>
        ))}
      </div>
    </>
  );
});

/* ------------------------------ keep-mounted section ------------------------------ */
const DashSection = memo(function DashSection({ id, show, children }) {
  return (
    <section id={id} className={`scroll-mt-28 ${show ? "block" : "hidden"}`}>
      {children}
    </section>
  );
});

/* ------------------------------ Grouped Bookings card ------------------------------ */
const GroupedBookingsCard = memo(function GroupedBookingsCard({ data, loading }) {
  const section = (title, items, icon, badgeClass) => (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="text-zinc-100 font-semibold text-sm sm:text-base">{title}</h4>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${badgeClass}`}>{items?.length || 0}</span>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Spinner size={20} />
        </div>
      ) : items && items.length ? (
        <div className="space-y-2">
          {items.map((session) => (
            <div
              key={session.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/30"
            >
              <div className="w-9 h-9 rounded-lg bg-white/5 grid place-items-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-zinc-100 text-sm truncate">
                  {session.user?.full_name || session.user?.email || "Πελάτης"}
                </div>
                <div className="text-zinc-400 text-xs">
                  {(session._when && session._when.toLocaleDateString?.("el-GR")) || session.date} •{" "}
                  {(session._when &&
                    session._when.toLocaleTimeString?.("el-GR", { hour: "2-digit", minute: "2-digit" })) ||
                    session.time ||
                    "—"}
                </div>
              </div>
              <div className="text-[11px] text-zinc-300 bg-white/10 px-2 py-1 rounded-full capitalize">
                {session._status || session.status}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-sm text-zinc-400">Καμία εγγραφή</div>
      )}
    </div>
  );

  return (
    <div
      id="bookings-summary"
      className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-black/40 backdrop-blur-xl border border-zinc-700/50 p-4 sm:p-6 lg:p-8"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent" />
      <div className="relative space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-zinc-100">Σύνοψη Κρατήσεων</h3>
            <p className="text-zinc-400 text-sm">Επερχόμενες / Αποδεκτές / Απορριφθείσες</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {section(
            "Επερχόμενες",
            data.grouped.upcoming,
            <Clock className="w-4 h-4 text-amber-300" />,
            "bg-amber-500/10 text-amber-300 border border-amber-400/20",
          )}
          {section(
            "Αποδεκτές",
            data.grouped.accepted,
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />,
            "bg-emerald-500/10 text-emerald-300 border border-emerald-400/20",
          )}
          {section(
            "Απορριφθείσες",
            data.grouped.declined,
            <XCircle className="w-4 h-4 text-rose-300" />,
            "bg-rose-500/10 text-rose-300 border border-rose-400/20",
          )}
        </div>
      </div>
    </div>
  );
});

/* ------------------------------ premium card ------------------------------ */
const PremiumCard = memo(function PremiumCard({ title, icon: Icon, description, children }) {
  const cardGlass = useMemo(
    () => ({
      background: "rgba(0, 0, 0, 0.4)",
      backdropFilter: "blur(20px) saturate(160%)",
      WebkitBackdropFilter: "blur(20px) saturate(160%)",
      border: "1px solid rgba(113, 113, 122, 0.15)",
    }),
    [],
  );

  return (
    <motion.div whileHover={{ y: -6, scale: 1.01 }} transition={{ duration: 0.3 }} className="relative overflow-hidden rounded-2xl sm:rounded-3xl" style={cardGlass}>
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
  );
});

/* ------------------------------ main component ------------------------------ */
function TrainerDashboard() {
  useEffect(() => {
    document.documentElement.classList.add("bg-black");
    document.body.classList.add("bg-black");
    return () => {
      document.documentElement.classList.remove("bg-black");
      document.body.classList.remove("bg-black");
    };
  }, []);

  const navigate = useNavigate();

  const goToBookings = useCallback(
    (tab) => {
      const safe = tab ? String(tab).toLowerCase() : "";
      const map = {
        today: "today",
        monthly: "month",
        accepted: "accepted",
        declined: "declined",
        upcoming: "upcoming",
      };
      const q = map[safe] ? `?tab=${map[safe]}` : "";
      navigate(`/trainer/bookings${q}`);
    },
    [navigate],
  );

  const { session, profile, profileLoaded, authError } = useAuth() || {};
  const authLoading = !profileLoaded;

  const { performanceData, loading: dataLoading, error: dataError } = useTrainerData(profile || null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [avatar, setAvatar] = useState(PLACEHOLDER);

  const [section, setSection] = useState(getHashSection);

  useEffect(() => {
    const onHashChange = () => setSection(getHashSection());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    const current = (window.location.hash || "").replace("#", "").toLowerCase();
    if (current !== section) {
      window.history.replaceState(null, "", `#${section}`);
    }
  }, [section]);

  const navigateToSection = useCallback((id) => {
    if (!SECTION_IDS.has(id)) return;
    setSection(id);
    window.history.replaceState(null, "", `#${id}`);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const jumpToBookings = useCallback((which) => goToBookings(which), [goToBookings]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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
  });
  const [profileSaving, setProfileSaving] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    error: "",
    success: "",
    loading: false,
  });

  useEffect(() => {
    if (!profile) return;
    setProfileForm({
      fullName: profile.full_name || "",
      phone: profile.phone || "",
      email: profile.email || "",
      bio: profile.bio || "",
      specialty: profile.specialty || "",
      location: profile.location || "",
      experienceYears: typeof profile.experience_years === "number" ? String(profile.experience_years) : "",
      isOnline: !!profile.is_online,
      selectedSpecialties: Array.isArray(profile.roles) ? profile.roles : [],
    });
    setAvatar(profile.avatar_url || PLACEHOLDER);
  }, [profile]);

  const deleteAvatar = useCallback(async () => {
    if (!window.confirm("Είστε σίγουροι ότι θέλετε να διαγράψετε το avatar;")) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null, updated_at: new Date().toISOString() })
        .eq("id", profile.id);
      if (error) throw new Error(error.message);
      setAvatar(PLACEHOLDER);
    } catch (err) {
      alert(err.message || "Σφάλμα κατά τη διαγραφή");
    }
  }, [profile?.id]);

  const handleAvatarUpload = useCallback(
    async (url) => {
      try {
        const { error } = await supabase
          .from("profiles")
          .update({ avatar_url: url, updated_at: new Date().toISOString() })
          .eq("id", profile.id);
        if (error) throw new Error(error.message);
        setAvatar(url);
      } catch (err) {
        alert(err.message || "Σφάλμα κατά την ενημέρωση");
      }
    },
    [profile?.id],
  );

  const toggleSpecialty = useCallback((specialtyName) => {
    setProfileForm((prev) => ({
      ...prev,
      selectedSpecialties: prev.selectedSpecialties.includes(specialtyName)
        ? prev.selectedSpecialties.filter((s) => s !== specialtyName)
        : [...prev.selectedSpecialties, specialtyName],
    }));
  }, []);

  const handleSaveProfile = useCallback(
    async (e) => {
      e.preventDefault();
      if (!profile?.id) return;
      setProfileSaving(true);
      try {
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: profileForm.fullName.trim(),
            phone: profileForm.phone.trim(),
            bio: profileForm.bio.trim(),
            specialty: profileForm.specialty.trim(),
            location: profileForm.location.trim(),
            experience_years: profileForm.experienceYears ? Number.parseInt(profileForm.experienceYears, 10) : null,
            is_online: profileForm.isOnline,
            roles: profileForm.selectedSpecialties,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id);
        if (error) throw new Error(error.message);
        alert("Το προφίλ ενημερώθηκε επιτυχώς!");
      } catch (err) {
        alert(err.message || "Σφάλμα κατά την ενημέρωση του προφίλ");
      } finally {
        setProfileSaving(false);
      }
    },
    [profile?.id, profileForm],
  );

  const handleChangePassword = useCallback(
    async (e) => {
      e.preventDefault();
      setPasswordForm((prev) => ({ ...prev, error: "", success: "", loading: true }));

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setPasswordForm((prev) => ({ ...prev, error: "Οι κωδικοί πρόσβασης δεν ταιριώνουν", loading: false }));
        return;
      }
      if (passwordForm.newPassword.length < 6) {
        setPasswordForm((prev) => ({ ...prev, error: "Ελάχιστο μήκος 6 χαρακτήρες", loading: false }));
        return;
      }

      try {
        const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
        if (error) throw error;
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
          error: "",
          success: "Ο κωδικός άλλαξε επιτυχώς!",
          loading: false,
        });
      } catch (err) {
        setPasswordForm((prev) => ({
          ...prev,
          error: err.message || "Σφάλμα κατά την αλλαγή κωδικού",
          loading: false,
        }));
      }
    },
    [passwordForm.newPassword, passwordForm.confirmPassword],
  );

  const profileData = useMemo(
    () => ({
      fullName: profile?.full_name || "Προπονητή",
      location: profile?.location,
      isOnline: !!profile?.is_online,
    }),
    [profile?.full_name, profile?.location, profile?.is_online],
  );

  const currentCategory = useMemo(
    () => (profileForm.specialty ? TRAINER_CATEGORIES.find((cat) => cat.value === profileForm.specialty) : null),
    [profileForm.specialty],
  );

  /* ------------------------------ gates ------------------------------ */
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black">
        <AthleticBackground />
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-zinc-700/30 border-t-zinc-500 rounded-full animate-spin" />
              <div className="absolute inset-2 border-2 border-zinc-800/30 border-t-zinc-600 rounded-full animate-spin" style={{ animationDirection: "reverse" }} />
            </div>
            <div className="text-center">
              <p className="text-zinc-300 text-base sm:text-lg font-semibold">Φόρτωση Dashboard</p>
              <p className="text-zinc-500 text-sm">Προετοιμασία των δεδομένων σας...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              type="button"
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded-lg transition-colors"
            >
              Επανάληψη
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session || !profile) {
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
    );
  }

  /* ------------------------------ page ------------------------------ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-zinc-900 text-white relative overflow-hidden pb-[70px] sm:pb-8">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.1),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.08),transparent_50%),radial-gradient(circle_at_40%_60%,rgba(255,255,255,0.06),transparent_50%)] animate-pulse-slow" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(45deg,transparent_48%,rgba(255,255,255,0.02)_49%,rgba(255,255,255,0.02)_51%,transparent_52%)] bg-[length:20px_20px] animate-slide-diagonal" />
      <AthleticBackground />

      <div className="relative z-10">
        <Suspense fallback={<div className="p-4"><Spinner size={20} /></div>}>
          <TrainerMenu userProfile={profile} onLogout={() => supabase.auth.signOut()} />
        </Suspense>

        <main className="relative z-10 min-h-screen">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-10 space-y-4 sm:space-y-6 lg:space-y-10">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6">
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
                  {currentTime.toLocaleDateString("el-GR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} •{" "}
                  {currentTime.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}
                </p>
                {profile?.location && (
                  <p className="text-zinc-500 text-xs sm:text-sm flex items-center gap-2 mt-1">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">{profile.location}</span>
                  </p>
                )}
              </div>
              <div className="flex gap-2 sm:gap-4 w-full lg:w-auto">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => goToBookings()}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-zinc-100 font-semibold"
                >
                  <Calendar className="w-4 h-4" />
                  Προγραμματισμός
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigateToSection("profile")}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50 border border-zinc-700/50"
                >
                  <Settings className="w-4 h-4" />
                  Ρυθμίσεις
                </motion.button>
              </div>
            </motion.div>

            {/* Navigation */}
            <PremiumNavigation currentSection={section} onSectionChange={navigateToSection} />

            {/* Sections */}
            <div className="space-y-6 sm:space-y-8">
              {/* Dashboard */}
              <DashSection id="dashboard" show={section === "dashboard"}>
                <div className="space-y-6 sm:space-y-8">
                  <TrainerPerformanceStats
                    performanceData={performanceData}
                    loading={dataLoading}
                    onJumpToBookings={jumpToBookings}
                  />

                  {/* Bookings summary */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <GroupedBookingsCard data={performanceData} loading={dataLoading} />
                  </motion.div>

                  {dataError && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-center">
                      <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                      <p className="text-red-400 text-sm">Σφάλμα φόρτωσης δεδομένων: {dataError}</p>
                    </motion.div>
                  )}
                </div>
              </DashSection>

              {/* Profile */}
              <DashSection id="profile" show={section === "profile"}>
                <PremiumCard title="Επεξεργασία Προφίλ" icon={Settings} description="Διαχειρίσου τα προσωπικά σου στοιχεία">
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
                          disabled={profileSaving}
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
                          disabled={profileSaving}
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
                        disabled={profileSaving}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-100">
                          {(currentCategory?.iconKey ? ICON_BY_KEY[currentCategory.iconKey] : Trophy) &&
                            React.createElement(currentCategory?.iconKey ? ICON_BY_KEY[currentCategory.iconKey] : Trophy, {
                              className: "h-4 w-4",
                            })}{" "}
                          Κατηγορία
                        </label>
                        <select
                          className="block w-full rounded-lg border border-zinc-700/30 bg-black/30 px-4 py-3 text-sm focus:bg-black/50 focus:outline-none focus:ring-2 focus:ring-blue-400 sm:text-base text-zinc-100"
                          value={profileForm.specialty}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, specialty: e.target.value }))}
                          disabled={profileSaving}
                        >
                          <option value="" className="bg-zinc-800">— Επίλεξε κατηγορία —</option>
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
                          disabled={profileSaving}
                        />
                      </div>
                    </div>

                    {/* Years + Availability */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-100">
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
                          disabled={profileSaving}
                        />
                      </div>
                      <div>
                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-100">
                          {profileForm.isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />} Διαθεσιμότητα
                        </label>
                        <div className="flex items-center gap-4 p-3 rounded-lg border border-zinc-700/30 bg-black/30">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={profileForm.isOnline}
                              onChange={(e) => setProfileForm((prev) => ({ ...prev, isOnline: e.target.checked }))}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                              disabled={profileSaving}
                            />
                            <span className="text-sm text-zinc-100">Online διαθέσιμος</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Specialties for chosen category */}
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
                                disabled={profileSaving}
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
                                    disabled={profileSaving}
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
                      disabled={profileSaving}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-zinc-100 hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {profileSaving ? <Spinner size={18} /> : <Save className="h-4 w-4" />}
                      {profileSaving ? "Αποθήκευση..." : "Αποθήκευση αλλαγών"}
                    </button>
                  </form>
                </PremiumCard>
              </DashSection>

              {/* Avatar */}
              <DashSection id="avatar" show={section === "avatar"}>
                <PremiumCard title="Διαχείριση Avatar" icon={ImagePlus} description="Προσαρμόσε την εικόνα του προφίλ σου">
                  <div className="flex flex-col items-center gap-6 sm:gap-8">
                    <div className="relative group">
                      <img
                        src={avatar || PLACEHOLDER}
                        alt="Avatar"
                        className="relative w-32 h-32 lg:w-48 lg:h-48 rounded-3xl object-cover border-4 border-zinc-700/50 shadow-2xl"
                      />
                    </div>
                    <div className="flex flex-wrap gap-3 sm:gap-4 items-center justify-center">
                      <Suspense fallback={<Spinner size={18} />}>
                        <AvatarUpload url={avatar} onUpload={handleAvatarUpload} icon={<Camera size={18} />} />
                      </Suspense>
                      {avatar !== PLACEHOLDER && (
                        <button
                          type="button"
                          onClick={deleteAvatar}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 hover:border-red-500/50 px-6 py-3 rounded-xl font-semibold transition-all duration-300"
                        >
                          <Trash2 className="inline w-5 h-5 mr-2" />
                          Διαγραφή
                        </button>
                      )}
                    </div>
                  </div>
                </PremiumCard>
              </DashSection>

              {/* Credentials */}
              <DashSection id="credentials" show={section === "credentials"}>
                <PremiumCard title="Πιστοποιήσεις" icon={Shield} description="Διαχειρίσου τα επαγγελματικά σου Πιστοποιήσεις">
                  <Suspense fallback={<Spinner size={18} />}>
                    <DiplomaUpload profileId={profile?.id} currentUrl={profile?.diploma_url} onChange={() => {}} />
                  </Suspense>
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
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
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
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
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
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
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
                      {passwordForm.loading ? <Spinner size={18} /> : <RotateCcw className="h-4 w-4" />}
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
  );
}

export default memo(TrainerDashboard);
