"use client";

import {
  useEffect,
  useState,
  lazy,
  Suspense,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Camera,
  Trash2,
  Calendar,
  CalendarCheck,
  Settings,
  Shield,
  ImagePlus,
  ChevronRight,
  Activity,
  Award,
  Star,
  BarChart3,
  Clock,
  Trophy,
  MapPin,
  Play,
  User,
  Plus,
  ArrowRight,
  Target,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import UserMenu from "../components/UserMenu";
import AvatarUpload from "../components/AvatarUpload";
import EditProfileForm from "../components/EditProfileForm";
import ChangePasswordForm from "../components/ChangePasswordForm";
import { PLACEHOLDER } from "../utils/avatar";

/* shadcn/ui (yours) */
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";

/* lazy: bookings component (already built) */
const UserBookings = lazy(() => import("../components/UserBookings"));

/* ---------- Styling helpers ---------- */
const cardGlass = {
  background: "rgba(0, 0, 0, 0.4)",
  backdropFilter: "blur(20px) saturate(160%)",
  WebkitBackdropFilter: "blur(20px) saturate(160%)",
  border: "1px solid rgba(113, 113, 122, 0.15)",
};

/* ---------- Animated background (left intact) ---------- */
const AthleticBackground = () => (
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
        maskImage:
          "radial-gradient(circle at 50% 50%, black 0%, transparent 75%)",
      }}
    />

    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div
        className="absolute top-1/5 left-1/5 w-[500px] h-[500px] bg-zinc-600/8 rounded-full blur-3xl"
        style={{ animation: "pulse-performance 12s ease-in-out infinite" }}
      />
      <div
        className="absolute top-3/5 right-1/5 w-[400px] h-[400px] bg-gray-700/8 rounded-full blur-3xl"
        style={{ animation: "pulse-performance 15s ease-in-out infinite reverse" }}
      />
      <div
        className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-zinc-800/8 rounded-full blur-3xl"
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
);

/* ---------- Premium nav ---------- */
const SECTIONS = ["dashboard", "profile", "avatar", "security", "bookings"];
const fromHash = (h = "") =>
  SECTIONS.includes(h.replace("#", "")) ? h.replace("#", "") : "dashboard";

const PremiumNavigation = ({ currentSection, onSectionChange }) => {
  const sections = useMemo(
    () => [
      { id: "dashboard", label: "Dashboard", icon: BarChart3, color: "from-blue-600 to-blue-700" },
      { id: "profile",   label: "Προφίλ",    icon: Settings,  color: "from-zinc-600 to-zinc-700" },
      { id: "avatar",    label: "Avatar",    icon: ImagePlus, color: "from-gray-600 to-gray-700" },
      { id: "security",  label: "Ασφάλεια",  icon: Shield,    color: "from-zinc-700 to-zinc-800" },
      { id: "bookings",  label: "Κρατήσεις", icon: CalendarCheck, color: "from-gray-700 to-gray-800" },
    ],
    []
  );

  return (
    <div className="flex flex-wrap gap-3 mb-10">
      {sections.map(({ id, label, icon: Icon, color }, index) => (
        <motion.button
          key={id}
          onClick={() => onSectionChange(id)}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.5 }}
          className={`group relative flex items-center gap-3 px-4 py-3 sm:px-6 rounded-2xl text-sm font-semibold transition-all duration-500 overflow-hidden ${
            currentSection === id
              ? "bg-gradient-to-r from-zinc-700 to-zinc-800 text-white shadow-2xl scale-105"
              : "bg-black/30 text-zinc-400 hover:bg-black/50 hover:text-zinc-300 hover:scale-102"
          }`}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className={`absolute inset-0 bg-gradient-to-r ${color} opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />
          <Icon className="w-5 h-5 relative z-10" />
          <span className="relative z-10 hidden sm:inline">{label}</span>
          {currentSection === id && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 bg-gradient-to-r from-zinc-600/20 to-zinc-700/20 rounded-2xl"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
        </motion.button>
      ))}
    </div>
  );
};

/* ---------- Stats cards ---------- */
const PerformanceStats = ({ performanceData }) => {
  const stats = useMemo(
    () => [
      {
        label: "Σημερινές Προπονήσεις",
        value: performanceData.todayStats.workoutsCompleted,
        icon: Activity,
        trend: performanceData.todayStats.workoutsCompleted > 0 ? "+1" : "0",
        color: "from-blue-600/20 to-blue-700/20",
        borderColor: "border-blue-500/30",
      },
      {
        label: "Συνολικές Κρατήσεις",
        value: performanceData.todayStats.totalBookings,
        icon: Calendar,
        trend: `+${performanceData.todayStats.totalBookings}`,
        color: "from-green-600/20 to-green-700/20",
        borderColor: "border-green-500/30",
      },
      {
        label: "Επερχόμενες",
        value: performanceData.todayStats.upcomingBookings,
        icon: Clock,
        trend: performanceData.todayStats.upcomingBookings > 0 ? "Ενεργός" : "—",
        color: "from-orange-600/20 to-orange-700/20",
        borderColor: "border-orange-500/30",
      },
      {
        label: "Ολοκληρωμένες",
        value: performanceData.todayStats.completedBookings,
        icon: Trophy,
        trend: `${performanceData.todayStats.completedBookings}`,
        color: "from-purple-600/20 to-purple-700/20",
        borderColor: "border-purple-500/30",
      },
    ],
    [performanceData]
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.6 }}
          className={`relative overflow-hidden rounded-2xl bg-black/40 backdrop-blur-xl border ${stat.borderColor} p-6`}
          whileHover={{ y: -4, scale: 1.02 }}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${stat.color}`} />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <stat.icon className="w-8 h-8 text-zinc-300" />
              <span className="text-xs font-semibold text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                {stat.trend}
              </span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-sm text-zinc-400">{stat.label}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

/* ================================================================= */
export default function EnhancedDashboard() {
  const { profile, profileLoaded } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [avatar, setAvatar] = useState(PLACEHOLDER);
  const [section, setSection] = useState(fromHash(location.hash));

  const [initialLoading, setInitialLoading] = useState(true);

  const [performanceData, setPerformanceData] = useState({
    todayStats: {
      workoutsCompleted: 0,
      totalBookings: 0,
      upcomingBookings: 0,
      completedBookings: 0,
    },
    recentBookings: [],
  });

  const [goals, setGoals] = useState([]); // from DB
  const [achievements, setAchievements] = useState([]); // from DB if exists

  const hasFetchedRef = useRef(false);

  // pass-through element; hover behavior is handled inside the component file
  const UserBookingsEl = useMemo(() => <UserBookings />, []);

  /* time tick */
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /* avatar */
  useEffect(() => {
    setAvatar(profile?.avatar_url || PLACEHOLDER);
  }, [profile]);

  /* hash section */
  useEffect(() => {
    const handleHashChange = () => {
      setSection(fromHash(window.location.hash));
    };
    setSection(fromHash(location.hash));
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [location.hash]);

  /* data fetch - only once */
  useEffect(() => {
    if (!profileLoaded || !profile) return;
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchUserData();
  }, [profileLoaded, profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUserData = useCallback(async (opts = { silent: false }) => {
    try {
      if (!opts.silent) setInitialLoading(true);

      const [bookingsRes, goalsRes, achievementsRes] = await Promise.allSettled([
        // ⬇️ switch to trainer_bookings (RLS: user_id = auth.uid())
        supabase
          .from("trainer_bookings")
          .select("*")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("goals")
          .select("*")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("user_achievements")
          .select("*")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false }),
      ]);

      // BOOKINGS
      let bookingsData = [];
      if (bookingsRes.status === "fulfilled" && !bookingsRes.value.error) {
        bookingsData = bookingsRes.value.data || [];
      }

      // derive stats from trainer_bookings
      const now = new Date();
      const toDateObj = (isoDate) =>
        isoDate ? new Date(`${isoDate}T00:00:00`) : null;

      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 86400000);

      const isPast = (d) => d && d < now;
      const isToday = (d) => d && d >= todayStart && d < todayEnd;

      // normalize date for comparisons
      const withDateObj = bookingsData.map((b) => ({
        ...b,
        _dateObj: toDateObj(b.date),
      }));

      const todayBookings = withDateObj.filter((b) => isToday(b._dateObj));
      const upcomingBookings = withDateObj.filter(
        (b) => b._dateObj && b._dateObj > now && b.status !== "cancelled"
      );
      const completedBookings = withDateObj.filter(
        (b) => isPast(b._dateObj) && ["completed", "confirmed", "accepted"].includes((b.status || "").toLowerCase())
      );

      setPerformanceData({
        todayStats: {
          workoutsCompleted: todayBookings.filter(
            (b) => ["completed", "confirmed", "accepted"].includes((b.status || "").toLowerCase())
          ).length,
          totalBookings: bookingsData.length,
          upcomingBookings: upcomingBookings.length,
          completedBookings: completedBookings.length,
        },
        // show a short list; this is just a dashboard preview
        recentBookings: bookingsData.slice(0, 5).map((b) => ({
          name: "Συνεδρία", // no join here; details will show inside <UserBookings />
          trainer: b.trainer_name || (b.trainer_id ? `Προπονητής #${String(b.trainer_id).slice(0, 6)}` : "Προπονητής"),
          date: b.date
            ? new Date(`${b.date}T00:00:00`).toLocaleDateString("el-GR")
            : "—",
          time: [b.start_time, b.end_time].filter(Boolean).join("–"),
          status: b.status || "pending",
          duration: b.duration_min ? `${b.duration_min} λεπτά` : "60 λεπτά",
        })),
      });

      // GOALS
      if (goalsRes.status === "fulfilled" && !goalsRes.value.error) {
        const rawGoals = goalsRes.value.data || [];
        const normalized = rawGoals.map((g) => {
          const progressPct =
            g.target_value
              ? Math.min(((g.progress_value || 0) / g.target_value) * 100, 100)
              : 0;

          return {
            id: g.id,
            title: g.title,
            description: g.description,
            category: g.category,
            progressPct,
            target_value: g.target_value,
            unit: g.unit,
            status: g.status,
            due_date: g.due_date,
            created_at: g.created_at,
            updated_at: g.updated_at,
          };
        });
        setGoals(normalized);
      } else {
        setGoals([]);
      }

      // ACHIEVEMENTS
      if (achievementsRes.status === "fulfilled" && !achievementsRes.value.error) {
        const raw = achievementsRes.value.data || [];
        const normalized = raw.map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          icon: a.icon || Award,
          earned: a.earned,
          created_at: a.created_at,
        }));
        setAchievements(normalized);
      } else {
        setAchievements([]);
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
    } finally {
      if (!opts.silent) setInitialLoading(false);
    }
  }, [profile]);

  const deleteAvatar = useCallback(async () => {
    if (!window.confirm("Διαγραφή avatar;")) return;
    await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", profile.id);
    setAvatar(PLACEHOLDER);
  }, [profile]);

  const handleSectionChange = useCallback((newSection) => {
    setSection(newSection);
    window.location.hash = newSection;
  }, []);

  const handleBookTraining = useCallback(() => {
    window.location.href = "/services";
  }, []);

  /* ---------- Loading ---------- */
  if (!profileLoaded || initialLoading) {
    return (
      <>
        <UserMenu />
        <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black">
          <AthleticBackground />
          <div className="flex items-center justify-center min-h-screen">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-zinc-700/30 border-t-zinc-500 rounded-full animate-spin" />
                <div className="absolute inset-2 border-2 border-zinc-800/30 border-t-zinc-600 rounded-full animate-spin animate-reverse" />
              </div>
              <div className="text-center">
                <p className="text-zinc-300 text-lg font-semibold">
                  Φόρτωση Dashboard
                </p>
                <p className="text-zinc-500 text-sm">
                  Προετοιμασία των δεδομένων σας...
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ---------- Main UI ---------- */
  return (
    <div className="relative bg-gradient-to-br from-black via-zinc-900 to-black min-h-screen text-gray-100">
      <AthleticBackground />
      <UserMenu />

      <main className="pl-[var(--side-w)] relative z-10">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6 lg:space-y-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6"
          >
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">
                Καλώς ήρθες, {profile.full_name || "Αθλητή"}
              </h1>
              <p className="text-zinc-400 text-base lg:text-lg">
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
              {profile.location && (
                <p className="text-zinc-500 text-sm flex items-center gap-2 mt-1">
                  <MapPin className="w-4 h-4" />
                  {profile.location}
                </p>
              )}
            </div>
            <div className="flex gap-4">
              <QuickActionButton
                icon={Play}
                label="Νέα Κράτηση"
                primary
                onClick={handleBookTraining}
              />
              <QuickActionButton
                icon={Settings}
                label="Ρυθμίσεις"
                onClick={() => handleSectionChange("profile")}
              />
            </div>
          </motion.div>

          {/* Navigation */}
          <PremiumNavigation
            currentSection={section}
            onSectionChange={handleSectionChange}
          />

          {/* Sections */}
          <div className="space-y-8">
            {/* Dashboard */}
            <DashSection id="dashboard" show={section === "dashboard"}>
              <div className="space-y-8">
                <PerformanceStats performanceData={performanceData} />

                {/* Goals & Profile */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="xl:col-span-2"
                  >
                    <GoalsCard goals={goals} />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <ProfileSummaryCard profile={profile} />
                  </motion.div>
                </div>

                {/* Recent & Achievements */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <RecentBookingsCard
                      bookings={performanceData.recentBookings}
                      totalBookings={performanceData.todayStats.totalBookings}
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <AchievementsCard achievements={achievements} />
                  </motion.div>
                </div>
              </div>
            </DashSection>

            {/* Profile */}
            <DashSection id="profile" show={section === "profile"}>
              <PremiumCard
                title="Επεξεργασία Προφίλ"
                icon={Settings}
                description="Διαχειρίσου τα προσωπικά σου στοιχεία"
              >
                <EditProfileForm />
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
                  onUpload={setAvatar}
                  onDelete={deleteAvatar}
                />
              </PremiumCard>
            </DashSection>

            {/* Security */}
            <DashSection id="security" show={section === "security"}>
              <PremiumCard
                title="Ρυθμίσεις Ασφαλείας"
                icon={Shield}
                description="Προστάτευσε τον λογαριασμό σου"
              >
                <ChangePasswordForm />
              </PremiumCard>
            </DashSection>

            {/* Bookings */}
            <DashSection id="bookings" show={section === "bookings"}>
              {/* ⛔ No hover effects on this card */}
              <PremiumCard
                title="Οι Κρατήσεις μου"
                icon={CalendarCheck}
                description="Διαχειρίσου τις προπονήσεις σου"
                hoverless
              >
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-12">
                      <div className="flex items-center gap-4 text-zinc-400">
                        <div className="w-6 h-6 border-2 border-zinc-600/30 border-t-zinc-500 rounded-full animate-spin" />
                        <span className="text-lg">Φόρτωση κρατήσεων...</span>
                      </div>
                    </div>
                  }
                >
                  {UserBookingsEl}
                </Suspense>
              </PremiumCard>
            </DashSection>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ---------- Components ---------- */

const AvatarArea = ({ avatar, placeholder, onUpload, onDelete }) => {
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative group">
        <div className="absolute -inset-6 bg-gradient-to-r from-zinc-600/20 to-gray-700/20 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500" />
        <img
          src={avatar || "/placeholder.svg"}
          alt="Avatar"
          className="relative w-32 h-32 sm:w-48 sm:h-48 rounded-3xl object-cover border-4 border-zinc-700/50 shadow-2xl transition-all duration-500 group-hover:scale-105 group-hover:border-zinc-600/70"
        />
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-center">
        <AvatarUpload url={avatar} onUpload={onUpload} icon={<Camera size={18} />} />
        {avatar !== placeholder && (
          <button
            onClick={onDelete}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 hover:border-red-500/50 px-6 py-3 rounded-xl font-semibold transition-all duration-300"
          >
            <Trash2 className="inline w-5 h-5 mr-2" />
            Διαγραφή
          </button>
        )}
      </div>
    </div>
  );
};

// persistent (no unmount → no re-fetch)
const DashSection = ({ id, show, children }) => {
  return (
    <section id={id} className={`scroll-mt-28 ${show ? "" : "hidden"}`}>
      {children}
    </section>
  );
};

const ProfileSummaryCard = ({ profile }) => {
  const memberSince = useMemo(
    () =>
      profile.created_at
        ? new Date(profile.created_at).toLocaleDateString("el-GR", {
            month: "long",
            year: "numeric",
          })
        : "Άγνωστο",
    [profile.created_at]
  );

  return (
    <div className="relative overflow-hidden rounded-3xl bg-black/40 backdrop-blur-xl border border-zinc-700/50 p-6 lg:p-8">
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent" />
      <div className="relative">
        <div className="flex items-center justify-between mb-6 lg:mb-8">
          <div>
            <h3 className="text-xl lg:text-2xl font-bold text-white mb-2">
              Το Προφίλ μου
            </h3>
            <p className="text-zinc-400">Τα στοιχεία σου</p>
          </div>
          <User className="w-8 h-8 text-blue-400" />
        </div>

        <div className="space-y-4 lg:space-y-6">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-800/30 border border-zinc-700/30">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-600/20 to-blue-700/20 flex items-center justify-center">
              <User className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h4 className="text-white font-semibold">
                {profile.full_name || "Χρήστης"}
              </h4>
              <p className="text-sm text-zinc-400 capitalize">{profile.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-800/30 border border-zinc-700/30">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-600/20 to-green-700/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h4 className="text-white font-semibold">Μέλος από</h4>
              <p className="text-sm text-zinc-400">{memberSince}</p>
            </div>
          </div>

          {profile.location && (
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-800/30 border border-zinc-700/30">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-600/20 to-purple-700/20 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h4 className="text-white font-semibold">Τοποθεσία</h4>
                <p className="text-sm text-zinc-400">{profile.location}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * UPDATED: Each goal row is clickable when there are goals.
 */
const GoalsCard = ({ goals }) => {
  const navigate = useNavigate();
  const goToGoals = () => navigate("/goals");

  const onKeyToGoals = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goToGoals();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-black/40 backdrop-blur-xl border border-zinc-700/50 p-6 lg:p-8">
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent" />
      <div className="relative">
        <div className="flex items-center justify-between mb-6 lg:mb-8">
          <div>
            <h3 className="text-xl lg:text-2xl font-bold text-white mb-2">
              Οι Στόχοι μου
            </h3>
            <p className="text-zinc-400">(Από τον πίνακα `goals`)</p>
          </div>
          <Target className="w-8 h-8 text-blue-400" />
        </div>

        <div className="space-y-4 lg:space-y-6">
          {goals.length > 0 ? (
            goals.map((goal) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-800/30 border border-zinc-700/30 hover:bg-zinc-800/50 transition-all cursor-pointer"
                onClick={goToGoals}
                role="button"
                tabIndex={0}
                onKeyDown={onKeyToGoals}
              >
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-white font-semibold">{goal.title}</h4>
                    <GoalStatusBadge status={goal.status} />
                  </div>
                  <div className="w-full bg-zinc-700 rounded-full h-2 mb-2">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${Math.min(goal.progressPct, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-zinc-400">
                    {goal.progressPct.toFixed(0)}% &nbsp;
                    {goal.target_value
                      ? `(${goal.progressPct.toFixed(1)}% από ${goal.target_value}${goal.unit || ""})`
                      : null}
                  </p>
                  {goal.description && (
                    <p className="text-xs text-zinc-500 mt-1">
                      {goal.description}
                    </p>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-8">
              <Target className="w-16 h-16 text-zinc-600 mx-auto mb-6" />
              <h4 className="text-xl font-bold text-white mb-3">
                Δεν έχεις στόχους ακόμα
              </h4>
              <p className="text-zinc-400 mb-6">
                Δημιούργησε πραγματικούς στόχους από τη σελίδα Goals.
              </p>
              <motion.button
                onClick={goToGoals}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-2xl shadow-lg transition-all duration-300"
              >
                <Target className="w-5 h-5" />
                Δημιούργησε Στόχους
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const GoalStatusBadge = ({ status }) => {
  const map = {
    not_started: { color: "text-zinc-300 bg-zinc-300/10", label: "Δεν ξεκίνησε" },
    in_progress: { color: "text-blue-400 bg-blue-400/10", label: "Σε εξέλιξη" },
    completed: { color: "text-green-400 bg-green-400/10", label: "Ολοκληρώθηκε" },
    archived:   { color: "text-zinc-500 bg-zinc-500/10", label: "Αρχειοθετήθηκε" },
  };

  const cfg = map[status] || map.in_progress;
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${cfg.color}`}>
      {cfg.label}
    </span>
  );
};

/**
 * Dashboard preview list — still fine to keep hover here since it's the dashboard,
 * not the dedicated bookings page. (If you also want zero hover here, shout.)
 */
const RecentBookingsCard = ({ bookings, totalBookings }) => {
  const navigate = useNavigate();

  const goToBookings = () => {
    navigate("/user#bookings");
    window.location.hash = "bookings";
  };

  const handleCTA = () => {
    if (totalBookings > 0) {
      goToBookings();
    } else {
      navigate("/services");
    }
  };

  const onKeyToBookings = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goToBookings();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-black/40 backdrop-blur-xl border border-zinc-700/50 p-6 lg:px-8 lg:py-8">
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent" />
      <div className="relative">
        <div className="flex items-center justify-between mb-6 lg:mb-8">
          <div>
            <h3 className="text-xl lg:text-2xl font-bold text-white mb-2">
              Πρόσφατες Κρατήσεις
            </h3>
            <p className="text-zinc-400">(από τον πίνακα `trainer_bookings`)</p>
          </div>
          <Activity className="w-8 h-8 text-purple-400" />
        </div>

        <div className="space-y-4">
          {bookings.length > 0 ? (
            <>
              {bookings.map((booking, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-800/30 border border-zinc-700/30 hover:bg-zinc-800/50 transition-all cursor-pointer"
                  onClick={goToBookings}
                  role="button"
                  tabIndex={0}
                  onKeyDown={onKeyToBookings}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-600/20 to-purple-700/20 flex items-center justify-center">
                    <Activity className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-semibold truncate">
                      {booking.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-400 mt-1">
                      <span className="truncate">με {booking.trainer}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{booking.date}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{booking.time}</span>
                    </div>
                  </div>
                  <div
                    className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                      (booking.status || "").toLowerCase() === "confirmed" ||
                      (booking.status || "").toLowerCase() === "accepted"
                        ? "bg-green-400/10 text-green-400"
                        : (booking.status || "").toLowerCase() === "pending"
                        ? "bg-yellow-400/10 text-yellow-400"
                        : (booking.status || "").toLowerCase() === "completed"
                        ? "bg-sky-400/10 text-sky-400"
                        : "bg-red-400/10 text-red-400"
                    }`}
                  >
                    {(booking.status || "").toLowerCase() === "confirmed" ||
                    (booking.status || "").toLowerCase() === "accepted"
                      ? "Επιβεβαιωμένη"
                      : (booking.status || "").toLowerCase() === "pending"
                      ? "Εκκρεμής"
                      : (booking.status || "").toLowerCase() === "completed"
                      ? "Ολοκληρώθηκε"
                      : "Ακυρωμένη"}
                  </div>
                </motion.div>
              ))}

              <div className="pt-6 text-center">
                <motion.button
                  onClick={handleCTA}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-semibold rounded-2xl shadow-lg transition-all duration-300"
                >
                  Διαχείριση Κρατήσεων
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-16 h-16 text-zinc-600 mx-auto mb-6" />
              <h4 className="text-xl font-bold text-white mb-3">
                Κλείσε την Πρώτη σου Προπόνηση
              </h4>
              <p className="text-zinc-400 mb-6">
                Ό,τι βλέπεις εδώ έρχεται από την πραγματική σου δραστηριότητα.
              </p>
              <motion.button
                onClick={handleCTA}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-semibold rounded-2xl shadow-lg transition-all duration-300"
              >
                <Plus className="w-5 h-5" />
                Κλείσε Προπόνηση
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AchievementsCard = ({ achievements }) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-black/40 backdrop-blur-xl border border-zinc-700/50 p-6 lg:p-8">
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent" />
      <div className="relative">
        <div className="flex items-center justify-between mb-6 lg:mb-8">
          <div>
            <h3 className="text-xl lg:text-2xl font-bold text-white mb-2">
              Επιτεύγματα
            </h3>
            <p className="text-zinc-400">
              {(achievements?.length ?? 0) > 0
                ? "Από τον πίνακα `user_achievements`"
                : "Δεν έχεις αποθηκευμένα επιτεύγματα στον DB πίνακα"}
            </p>
          </div>
          <Award className="w-8 h-8 text-yellow-400" />
        </div>

        <div className="space-y-4">
          {achievements.length > 0 ? (
            achievements.map((achievement) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  achievement.earned
                    ? "bg-yellow-400/10 border-yellow-400/30"
                    : "bg-zinc-800/30 border-zinc-700/30 opacity-60"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    achievement.earned
                      ? "bg-gradient-to-r from-yellow-600/20 to-yellow-700/20"
                      : "bg-zinc-700/30"
                  }`}
                >
                  <Star
                    className={`w-6 h-6 ${
                      achievement.earned ? "text-yellow-400" : "text-zinc-500"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4
                    className={`font-semibold truncate ${
                      achievement.earned ? "text-white" : "text-zinc-400"
                    }`}
                  >
                    {achievement.title}
                  </h4>
                  <p className="text-sm text-zinc-500 mt-1 truncate">
                    {achievement.description}
                  </p>
                </div>
                {achievement.earned && (
                  <Star className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                )}
              </motion.div>
            ))
          ) : (
            <div className="text-center py-8">
              <Award className="w-16 h-16 text-zinc-600 mx-auto mb-6" />
              <h4 className="text-xl font-bold text-white mb-3">
                Δεν βρέθηκαν επιτεύγματα
              </h4>
              <p className="text-zinc-400 mb-6">
                Αν θέλεις achievements, δημιούργησε πίνακα `user_achievements`
                και κάνε insert πραγματικά δεδομένα.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const QuickActionButton = ({ icon: Icon, label, primary = false, onClick }) => {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      className={`flex items-center gap-3 px-4 sm:px-6 py-3 rounded-2xl font-semibold transition-all duration-300 ${
        primary
          ? "bg-gradient-to-r from-zinc-600 to-zinc-700 text-white shadow-lg hover:from-zinc-500 hover:to-zinc-600"
          : "bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700/50 hover:text-white border border-zinc-700/50"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="hidden sm:inline">{label}</span>
    </motion.button>
  );
};

/* ⛔ PremiumCard supports a 'hoverless' prop used in the Bookings section */
const PremiumCard = ({ title, icon: Icon, description, children, hoverless = false }) => {
  return (
    <motion.div
      {...(!hoverless ? { whileHover: { y: -6, scale: 1.01 } } : {})}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-3xl"
      style={cardGlass}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zinc-600 via-zinc-500 to-zinc-600" />

      <Card className="relative bg-transparent border-none shadow-none">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center gap-4 text-white">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-zinc-700/50 to-zinc-800/50 border border-zinc-600/30">
              <Icon className="w-6 h-6 text-zinc-300" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xl font-bold">{title}</span>
              <p className="text-sm text-zinc-400 font-normal mt-1">
                {description}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-500 flex-shrink-0" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8 pb-8">{children}</CardContent>
      </Card>
    </motion.div>
  );
};
