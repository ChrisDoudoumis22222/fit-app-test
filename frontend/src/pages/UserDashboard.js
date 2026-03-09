"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { MapPin, Play, Settings, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import UserMenu from "../components/UserMenu";
import EditProfileForm from "../components/EditProfileForm";
import ChangePasswordForm from "../components/ChangePasswordForm";

import AthleticBackground from "../components/user/AthleticBackground";
import PremiumNavigation, { fromHash } from "../components/user/PremiumNavigation";
import UserPerformanceStats from "../components/user/UserPerformanceStats";
import AvatarArea from "../components/user/AvatarArea";
import DashSection from "../components/user/DashSection";
import GoalsCard from "../components/user/GoalsCard";
import RecentBookingsCard from "../components/user/RecentBookingsCard";
import QuickActionButton from "../components/user/QuickActionButton";

export default function EnhancedDashboard() {
  const { profile, profileLoaded } = useAuth();
  const location = useLocation();

  const [currentTime, setCurrentTime] = useState(new Date());
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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  const handleBookTraining = useCallback(() => {
    window.location.href = "/services";
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
                <p className="text-lg font-semibold text-zinc-300">Φόρτωση Dashboard</p>
                <p className="text-sm text-zinc-500">Προετοιμασία των δεδομένων σας...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-gray-100">
      <AthleticBackground />
      <UserMenu />

      <main className="relative z-10 pl-[var(--side-w)]">
        <div className="mx-auto max-w-8xl space-y-6 px-4 py-6 sm:px-6 lg:space-y-10 lg:px-8 lg:py-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center"
          >
            <div>
              <h1 className="mb-2 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                Καλώς ήρθες, {profile?.full_name || "Αθλητή"}
              </h1>

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

              {profile?.location && (
                <p className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
                  <MapPin className="h-4 w-4" />
                  {profile.location}
                </p>
              )}
            </div>

            <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:gap-4">
              <QuickActionButton
                icon={Play}
                label="Νέα Κράτηση"
                primary
                onClick={handleBookTraining}
                fluid
              />
              <QuickActionButton
                icon={Settings}
                label="Ρυθμίσεις"
                onClick={() => handleSectionChange("profile")}
                fluid
              />
            </div>
          </motion.div>

          <PremiumNavigation
            currentSection={section}
            onSectionChange={handleSectionChange}
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
              <WideFormShell
                icon={Settings}
                title="Επεξεργασία Προφίλ"
                description="Διαχειρίσου τα προσωπικά σου στοιχεία."
              >
                <EditProfileForm />
              </WideFormShell>
            </DashSection>

            <DashSection id="avatar" show={section === "avatar"}>
              <AvatarArea avatar={avatar} onUpload={setAvatar} />
            </DashSection>

            <DashSection id="security" show={section === "security"}>
              <WideFormShell
                icon={Shield}
                title="Ρυθμίσεις Ασφαλείας"
                description="Άλλαξε τον κωδικό σου και κράτα ασφαλή τον λογαριασμό σου."
                variant="security"
              >
                <ChangePasswordForm />
              </WideFormShell>
            </DashSection>
          </div>
        </div>
      </main>
    </div>
  );
}

function WideFormShell({
  icon: Icon,
  title,
  description,
  children,
  variant = "default",
}) {
  const isSecurity = variant === "security";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="mx-auto w-full max-w-[1540px]"
    >
      <div
        className={[
          "wide-form-shell relative overflow-hidden rounded-[32px]",
          "bg-gradient-to-b from-zinc-900/80 via-black/70 to-black/50",
          "shadow-[0_32px_100px_rgba(0,0,0,.64)] ring-1 ring-zinc-800/70",
          isSecurity ? "is-security" : "",
        ].join(" ")}
      >
        <style>{`
          .wide-form-shell form {
            display: grid;
            gap: 16px;
            width: 100%;
          }

          .wide-form-shell label {
            display: block;
            margin-bottom: 8px;
            color: rgb(228 228 231);
            font-size: 0.92rem;
            font-weight: 600;
            letter-spacing: -0.01em;
          }

          .wide-form-shell input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]),
          .wide-form-shell textarea,
          .wide-form-shell select {
            width: 100%;
            min-height: 58px;
            border-radius: 18px;
            border: 1px solid rgba(63, 63, 70, 0.95);
            background: linear-gradient(180deg, rgba(20,20,24,0.98), rgba(10,10,12,0.98));
            color: white;
            padding: 15px 16px;
            outline: none;
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.02),
              0 10px 24px rgba(0,0,0,0.18);
            transition:
              border-color .2s ease,
              box-shadow .2s ease,
              background .2s ease,
              transform .2s ease;
          }

          .wide-form-shell input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"])::placeholder,
          .wide-form-shell textarea::placeholder {
            color: rgba(161, 161, 170, 0.9);
          }

          .wide-form-shell input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]):focus,
          .wide-form-shell textarea:focus,
          .wide-form-shell select:focus {
            border-color: rgba(113, 113, 122, 1);
            background: linear-gradient(180deg, rgba(26,26,30,0.99), rgba(12,12,14,0.99));
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.03),
              0 0 0 4px rgba(63,63,70,0.18),
              0 14px 28px rgba(0,0,0,0.24);
          }

          .wide-form-shell button[type="submit"] {
            width: 100%;
            min-height: 58px;
            border: 1px solid rgba(255,255,255,0.04);
            border-radius: 18px;
            padding: 15px 18px;
            background: linear-gradient(180deg, rgba(255,255,255,1), rgba(237,237,237,1));
            color: rgb(9 9 11);
            font-weight: 800;
            letter-spacing: -0.01em;
            box-shadow:
              0 14px 28px rgba(0,0,0,0.20),
              inset 0 1px 0 rgba(255,255,255,0.7);
            transition:
              transform .18s ease,
              box-shadow .18s ease,
              background .18s ease,
              opacity .18s ease;
          }

          .wide-form-shell button[type="submit"]:hover:not(:disabled) {
            background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(226,226,226,1));
            transform: translateY(-1px);
            box-shadow:
              0 18px 32px rgba(0,0,0,0.24),
              inset 0 1px 0 rgba(255,255,255,0.72);
          }

          .wide-form-shell button[type="submit"]:active:not(:disabled) {
            transform: translateY(0);
          }

          .wide-form-shell button[type="submit"]:disabled {
            border-color: rgba(63, 63, 70, 0.95);
            background: linear-gradient(180deg, rgba(39,39,42,0.95), rgba(24,24,27,0.95));
            color: rgba(161,161,170,0.95);
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.02),
              0 8px 18px rgba(0,0,0,0.18);
            cursor: not-allowed;
            transform: none;
          }

          .wide-form-shell .error,
          .wide-form-shell .text-red-500,
          .wide-form-shell .text-red-400,
          .wide-form-shell .text-rose-400,
          .wide-form-shell .text-rose-500 {
            color: rgb(251 113 133) !important;
          }

          .wide-form-shell .success,
          .wide-form-shell .text-green-500,
          .wide-form-shell .text-green-400,
          .wide-form-shell .text-emerald-400,
          .wide-form-shell .text-emerald-500 {
            color: rgb(74 222 128) !important;
          }

          .wide-form-shell.is-security form {
            gap: 18px;
          }

          .wide-form-shell.is-security .relative input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]) {
            padding-left: 52px;
            padding-right: 52px;
          }

          .wide-form-shell.is-security .relative button:not([type="submit"]) {
            color: rgb(161 161 170);
          }

          .wide-form-shell.is-security .relative button:not([type="submit"]):hover {
            color: rgb(255 255 255);
          }

          @media (min-width: 1024px) {
            .wide-form-shell form {
              gap: 18px;
            }

            .wide-form-shell input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]),
            .wide-form-shell textarea,
            .wide-form-shell select,
            .wide-form-shell button[type="submit"] {
              min-height: 60px;
            }
          }

          @media (max-width: 640px) {
            .wide-form-shell input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]),
            .wide-form-shell textarea,
            .wide-form-shell select,
            .wide-form-shell button[type="submit"] {
              min-height: 54px;
              border-radius: 16px;
              padding-top: 13px;
              padding-bottom: 13px;
              padding-left: 14px;
              padding-right: 14px;
            }

            .wide-form-shell.is-security .relative input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]) {
              padding-left: 46px;
              padding-right: 46px;
            }
          }
        `}</style>

        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-700/60 to-transparent" />
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-zinc-400/[0.05] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-28 h-80 w-80 rounded-full bg-zinc-700/[0.04] blur-3xl" />

        <div className="relative px-6 pt-6 sm:px-8 sm:pt-8 lg:px-10 xl:px-12">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-zinc-900/80 text-zinc-200 ring-1 ring-zinc-800/70 shadow-[0_10px_24px_rgba(0,0,0,.25)]">
              <Icon className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h3 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                {title}
              </h3>
              <p className="mt-1 text-sm text-zinc-400 sm:text-base">
                {description}
              </p>
            </div>
          </div>
        </div>

        <div className="relative px-6 pb-6 pt-6 sm:px-8 sm:pb-8 lg:px-10 xl:px-12 lg:pt-7 lg:pb-10">
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-zinc-800/55 sm:inset-x-8 lg:inset-x-10 xl:inset-x-12" />
          <div className="pt-5 sm:pt-6">
            {children}
          </div>
        </div>
      </div>
    </motion.div>
  );
}