"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import UserMenu from "../components/UserMenu";
import EditProfileForm from "../components/EditProfileForm";
import ChangePasswordForm from "../components/ChangePasswordForm";

import AthleticBackground from "../components/user/AthleticBackground";
import UserDashboardTabs from "../components/user/UserDashboardTabs";
import UserPerformanceStats from "../components/user/UserPerformanceStats";
import AvatarArea from "../components/user/AvatarArea";
import DashSection from "../components/user/DashSection";
import GoalsCard from "../components/user/GoalsCard";
import RecentBookingsCard from "../components/user/RecentBookingsCard";
import ProfileSettingsSection from "../components/user/ProfileSettingsSection";
import SecuritySettingsSection from "../components/user/SecuritySettingsSection";

function fromHash(hash) {
  const value = String(hash || "")
    .replace("#", "")
    .trim()
    .toLowerCase();

  if (value === "profile") return "profile";
  if (value === "avatar") return "avatar";
  if (value === "security" || value === "password") return "security";
  return "dashboard";
}

function DashboardDateTime({ location }) {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <p className="text-base text-zinc-400 lg:text-lg">
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

      {location && (
        <p className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
          <MapPin className="h-4 w-4" />
          {location}
        </p>
      )}
    </>
  );
}

export default function EnhancedDashboard() {
  const { profile, profileLoaded } = useAuth();
  const location = useLocation();

  const [avatar, setAvatar] = useState("");
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

  const [goals, setGoals] = useState([]);
  const hasFetchedRef = useRef(false);

  const hasProfileImage = useMemo(() => {
    return Boolean(String(avatar || profile?.avatar_url || "").trim());
  }, [avatar, profile?.avatar_url]);

  useEffect(() => {
    setAvatar(profile?.avatar_url || "");
  }, [profile?.avatar_url]);

  useEffect(() => {
    const handleHashChange = () => {
      setSection(fromHash(window.location.hash));
    };

    setSection(fromHash(location.hash));
    window.addEventListener("hashchange", handleHashChange);

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [location.hash]);

  const fetchUserData = useCallback(
    async (opts = { silent: false }) => {
      try {
        if (!opts.silent) setInitialLoading(true);
        if (!profile?.id) return;

        const [bookingsRes, goalsRes] = await Promise.allSettled([
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
        ]);

        let bookingsData = [];
        if (bookingsRes.status === "fulfilled" && !bookingsRes.value.error) {
          bookingsData = bookingsRes.value.data || [];
        }

        const now = new Date();
        const toDateObj = (isoDate) =>
          isoDate ? new Date(`${isoDate}T00:00:00`) : null;

        const todayStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        const todayEnd = new Date(todayStart.getTime() + 86400000);

        const isPast = (d) => d && d < now;
        const isToday = (d) => d && d >= todayStart && d < todayEnd;

        const withDateObj = bookingsData.map((b) => ({
          ...b,
          _dateObj: toDateObj(b.date),
        }));

        const todayBookings = withDateObj.filter((b) => isToday(b._dateObj));
        const upcomingBookings = withDateObj.filter(
          (b) => b._dateObj && b._dateObj > now && b.status !== "cancelled"
        );
        const completedBookings = withDateObj.filter(
          (b) =>
            isPast(b._dateObj) &&
            ["completed", "confirmed", "accepted"].includes(
              (b.status || "").toLowerCase()
            )
        );

        setPerformanceData({
          todayStats: {
            workoutsCompleted: todayBookings.filter((b) =>
              ["completed", "confirmed", "accepted"].includes(
                (b.status || "").toLowerCase()
              )
            ).length,
            totalBookings: bookingsData.length,
            upcomingBookings: upcomingBookings.length,
            completedBookings: completedBookings.length,
          },
          recentBookings: bookingsData.slice(0, 5).map((b) => ({
            name: "Συνεδρία",
            trainer:
              b.trainer_name ||
              (b.trainer_id
                ? `Προπονητής #${String(b.trainer_id).slice(0, 6)}`
                : "Προπονητής"),
            date: b.date
              ? new Date(`${b.date}T00:00:00`).toLocaleDateString("el-GR")
              : "—",
            time: [b.start_time, b.end_time].filter(Boolean).join("–"),
            status: b.status || "pending",
            duration: b.duration_min ? `${b.duration_min} λεπτά` : "60 λεπτά",
          })),
        });

        if (goalsRes.status === "fulfilled" && !goalsRes.value.error) {
          const rawGoals = goalsRes.value.data || [];
          const normalized = rawGoals.map((g) => {
            const progressPct = g.target_value
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
      } catch (err) {
        console.error("Error fetching user data:", err);
      } finally {
        if (!opts.silent) setInitialLoading(false);
      }
    },
    [profile?.id]
  );

  useEffect(() => {
    if (!profileLoaded || !profile) return;
    if (hasFetchedRef.current) return;

    hasFetchedRef.current = true;
    fetchUserData();
  }, [profileLoaded, profile, fetchUserData]);

  const handleSectionChange = useCallback((newSection) => {
    setSection(newSection);
    window.location.hash = newSection;
  }, []);

  if (!profileLoaded || initialLoading) {
    return (
      <>
        <UserMenu />
        <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black">
          <AthleticBackground />
          <div className="flex min-h-screen items-center justify-center">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-zinc-700/30 border-t-zinc-500" />
                <div className="absolute inset-2 animate-spin rounded-full border-2 border-zinc-800/30 border-t-zinc-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-zinc-300">
                  Φόρτωση Dashboard
                </p>
                <p className="text-sm text-zinc-500">
                  Προετοιμασία των δεδομένων σας...
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-black via-zinc-900 to-black text-gray-100">
      <AthleticBackground />
      <UserMenu />

      <main className="relative z-10 pl-0 lg:pl-[var(--side-w)]">
        <div className="mx-auto max-w-8xl space-y-6 px-4 py-6 sm:px-6 lg:space-y-10 lg:px-8 lg:py-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-start gap-4"
          >
            <div>
              <h1 className="mb-2 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                Καλώς ήρθες, {profile?.full_name || "Αθλητή"}
              </h1>

              <DashboardDateTime location={profile?.location} />
            </div>
          </motion.div>

          <UserDashboardTabs
            currentSection={section}
            onSectionChange={handleSectionChange}
            hasProfileImage={hasProfileImage}
          />

          <div className="space-y-8">
            <DashSection id="dashboard" show={section === "dashboard"}>
              <div className="space-y-8">
                <UserPerformanceStats performanceData={performanceData} />

                <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <RecentBookingsCard
                      bookings={performanceData.recentBookings}
                      totalBookings={performanceData.todayStats.totalBookings}
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.05 }}
                  >
                    <GoalsCard goals={goals} />
                  </motion.div>
                </div>
              </div>
            </DashSection>

            <DashSection id="profile" show={section === "profile"}>
              <ProfileSettingsSection>
                <EditProfileForm />
              </ProfileSettingsSection>
            </DashSection>

            <DashSection id="avatar" show={section === "avatar"}>
              <AvatarArea avatar={avatar} onUpload={setAvatar} />
            </DashSection>

            <DashSection id="security" show={section === "security"}>
              <SecuritySettingsSection>
                <ChangePasswordForm />
              </SecuritySettingsSection>
            </DashSection>
          </div>
        </div>
      </main>
    </div>
  );
}