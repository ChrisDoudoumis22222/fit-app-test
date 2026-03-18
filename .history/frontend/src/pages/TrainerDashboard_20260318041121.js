// FILE: src/pages/TrainerDashboard.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, AlertTriangle } from "lucide-react";

import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";

// ✅ Menu
import TrainerMenu from "../components/TrainerMenu";

// ✅ Trainer components
import DashboardOverview from "../components/trainer/DashboardOverview";
import TrainerProfileForm from "../components/trainer/TrainerProfileForm";
import AvatarCard from "../components/trainer/AvatarCard";
import DiplomaCard from "../components/trainer/DiplomaCard";
import TrainerDashboardTabs from "../components/trainer/TrainerDashboardTabs";
import ChangePasswordCard from "../components/trainer/ChangePasswordCard";

const EMPTY_PERF = {
  todayStats: {
    sessionsToday: 0,
    activeClients: 0,
    upcomingSessions: 0,
    monthlyProgress: 0,
    acceptedTotal: 0,
    declinedTotal: 0,
  },
  grouped: {
    upcoming: [],
    accepted: [],
    declined: [],
  },
  recentSessions: [],
};

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toLocalYMD(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function normalizeBookingStatus(raw) {
  const s = String(raw || "").toLowerCase().trim();

  if (
    s === "pending" ||
    s === "upcoming" ||
    s === "requested" ||
    s === "request" ||
    s === "new"
  ) {
    return "upcoming";
  }

  if (
    s === "accepted" ||
    s === "approved" ||
    s === "approve" ||
    s === "confirmed" ||
    s === "accept"
  ) {
    return "accepted";
  }

  if (
    s === "declined" ||
    s === "rejected" ||
    s === "reject" ||
    s === "cancelled" ||
    s === "canceled" ||
    s === "denied"
  ) {
    return "declined";
  }

  if (s === "completed") {
    return null;
  }

  return null;
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);

    setMatches(mq.matches);

    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, [query]);

  return matches;
}

export default function TrainerDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const { loading, profile, profileLoaded, refreshProfile } = useAuth();

  const [err, setErr] = useState("");
  const [authUserId, setAuthUserId] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const [performanceData, setPerformanceData] = useState(EMPTY_PERF);
  const [overviewReloadKey, setOverviewReloadKey] = useState(0);

  const resolvedTrainerId = useMemo(
    () => profile?.id || authUserId || null,
    [profile?.id, authUserId]
  );

  useEffect(() => {
    let alive = true;

    async function getAuthUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!alive) return;
        setAuthUserId(user?.id ?? null);
      } catch {
        if (!alive) return;
        setAuthUserId(null);
      }
    }

    getAuthUser();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadDashboardPerformance() {
      if (!profileLoaded) return;

      if (!resolvedTrainerId) {
        if (!alive) return;
        setPerformanceData(EMPTY_PERF);
        setDashboardLoading(false);
        setDashboardError("");
        return;
      }

      setDashboardLoading(true);
      setDashboardError("");

      try {
        const { data, error } = await supabase
          .from("trainer_bookings")
          .select(
            `
            id,
            trainer_id,
            user_id,
            date,
            start_time,
            end_time,
            duration_min,
            status,
            is_online,
            user_name,
            user_email,
            trainer_name,
            created_at
          `
          )
          .eq("trainer_id", resolvedTrainerId)
          .order("date", { ascending: true })
          .order("start_time", { ascending: true });

        if (error) throw error;

        const rows = Array.isArray(data) ? data : [];

        const grouped = {
          upcoming: [],
          accepted: [],
          declined: [],
        };

        for (const row of rows) {
          const bucket = normalizeBookingStatus(row?.status);
          if (!bucket) continue;
          grouped[bucket].push(row);
        }

        const todayStr = toLocalYMD(new Date());

        const sessionsToday = rows.filter((row) => {
          if (!row?.date) return false;
          return String(row.date) === todayStr;
        }).length;

        const uniqueClients = new Set(
          rows
            .map(
              (row) => row?.user_name || row?.user_email || row?.user_id || null
            )
            .filter(Boolean)
        ).size;

        if (!alive) return;

        setPerformanceData({
          todayStats: {
            sessionsToday,
            activeClients: uniqueClients,
            upcomingSessions: grouped.upcoming.length,
            monthlyProgress: 0,
            acceptedTotal: grouped.accepted.length,
            declinedTotal: grouped.declined.length,
          },
          grouped,
          recentSessions: rows,
        });

        setDashboardError("");
      } catch (e) {
        if (!alive) return;

        setPerformanceData(EMPTY_PERF);
        setDashboardError(e?.message || "Αποτυχία φόρτωσης κρατήσεων");
      } finally {
        if (alive) setDashboardLoading(false);
      }
    }

    loadDashboardPerformance();

    return () => {
      alive = false;
    };
  }, [profileLoaded, resolvedTrainerId, overviewReloadKey]);

  const hasDiploma = useMemo(() => {
    return Boolean(profile?.diploma_url && String(profile.diploma_url).trim());
  }, [profile?.diploma_url]);

  const showDiplomaWarning = useMemo(() => {
    return profileLoaded && !!profile && !hasDiploma;
  }, [profileLoaded, profile, hasDiploma]);

  const section = useMemo(() => {
    const h = (location.hash || "#overview")
      .replace("#", "")
      .trim()
      .toLowerCase();

    if (h === "profile") return "profile";
    if (h === "avatar") return "avatar";
    if (h === "diploma") return "diploma";
    if (h === "security" || h === "password") return "security";

    return "overview";
  }, [location.hash]);

  const handleRefresh = useCallback(async () => {
    setErr("");

    try {
      await refreshProfile();
      setOverviewReloadKey((k) => k + 1);
    } catch (e) {
      setErr(e?.message || "Αποτυχία ανανέωσης στοιχείων");
    }
  }, [refreshProfile]);

  const handleJumpToBookings = useCallback(
    (bookingKey = "all") => {
      const mappedKey =
        bookingKey === "accepted" ||
        bookingKey === "declined" ||
        bookingKey === "upcoming"
          ? bookingKey
          : "all";

      navigate("/trainer/bookings", {
        state: { bookingView: mappedKey },
      });
    },
    [navigate]
  );

  const renderSection = () => {
    if (!profile) return null;

    switch (section) {
      case "overview":
        return (
          <DashboardOverview
            key={`overview-section-${resolvedTrainerId || "guest"}-${
              overviewReloadKey || 0
            }`}
            trainerId={resolvedTrainerId}
            performanceData={performanceData}
            loading={dashboardLoading}
            error={dashboardError}
            onJumpToBookings={handleJumpToBookings}
          />
        );

      case "profile":
        return (
          <TrainerProfileForm
            key="profile-section"
            profile={profile}
            onAfterSave={handleRefresh}
          />
        );

      case "avatar":
        return (
          <AvatarCard
            key="avatar-section"
            profile={profile}
            onAfterSave={handleRefresh}
          />
        );

      case "diploma":
        return (
          <DiplomaCard
            key="diploma-section"
            profile={profile}
            onAfterSave={handleRefresh}
          />
        );

      case "security":
        return <ChangePasswordCard key="security-section" />;

      default:
        return (
          <DashboardOverview
            key={`overview-section-${resolvedTrainerId || "guest"}-${
              overviewReloadKey || 0
            }`}
            trainerId={resolvedTrainerId}
            performanceData={performanceData}
            loading={dashboardLoading}
            error={dashboardError}
            onJumpToBookings={handleJumpToBookings}
          />
        );
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-zinc-950 text-white">
      <div className="flex min-h-screen w-full">
        {isDesktop ? (
          <aside className="shrink-0 border-r border-white/10">
            <TrainerMenu />
          </aside>
        ) : null}

        <main className="min-w-0 flex-1 px-3 pb-28 pt-20 sm:px-6 sm:pb-12 sm:pt-6 lg:px-8 xl:px-10">
          <div className="mx-auto w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1600px]">
            <div className="mb-6 sm:mb-6">
              <h1 className="mt-10 text-[26px] font-extrabold leading-tight tracking-tight text-white sm:mt-0 sm:text-4xl">
                Πίνακας Προπονητή
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:mt-2 sm:text-base">
                Οργάνωσε το προφίλ σου, την εικόνα, το πτυχίο και τις βασικές
                ρυθμίσεις του λογαριασμού σου
              </p>
            </div>

            <div className="mb-6 sm:mb-6">
              <TrainerDashboardTabs
                section={section}
                showDiplomaWarning={showDiplomaWarning}
              />
            </div>

            {loading && (
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 sm:rounded-3xl sm:p-6">
                <Loader2 className="h-5 w-5 animate-spin" />
                <div className="text-sm text-white/80">Φόρτωση...</div>
              </div>
            )}

            {!loading && err && (
              <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5 sm:rounded-3xl sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
                    <AlertTriangle className="h-5 w-5 text-white/85" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">
                      Δεν ήταν δυνατή η ανανέωση
                    </div>
                    <div className="mt-1 text-sm text-white/60">{err}</div>
                  </div>
                </div>
              </div>
            )}

            {!loading && profileLoaded && !profile && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:rounded-3xl sm:p-6">
                <div className="text-sm text-white/80">
                  Δεν βρέθηκε προφίλ για αυτόν τον χρήστη.
                </div>
              </div>
            )}

            {!loading && profile && (
              <div className="min-w-0">{renderSection()}</div>
            )}
          </div>
        </main>
      </div>

      {!isDesktop ? (
        <div className="border-t border-white/10">
          <TrainerMenu />
        </div>
      ) : null}
    </div>
  );
}