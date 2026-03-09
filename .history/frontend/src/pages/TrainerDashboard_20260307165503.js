// FILE: src/pages/TrainerDashboard.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Loader2,
  AlertTriangle,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
  LayoutDashboard,
  UserRound,
  Image as ImageIcon,
  GraduationCap,
  Shield,
} from "lucide-react";

import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";

// ✅ Menu
import TrainerMenu from "../components/TrainerMenu";

// ✅ Trainer components
import DashboardOverview from "../components/trainer/DashboardOverview";
import TrainerProfileForm from "../components/trainer/TrainerProfileForm";
import AvatarCard from "../components/trainer/AvatarCard";
import DiplomaCard from "../components/trainer/DiplomaCard";

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

function cn(...c) {
  return c.filter(Boolean).join(" ");
}

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

function PageToast({ open, text, type = "success", onClose }) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => onClose?.(), 2400);
    return () => clearTimeout(t);
  }, [open, onClose]);

  const bg =
    type === "success"
      ? "bg-emerald-500/90"
      : type === "warning"
      ? "bg-amber-500/90"
      : "bg-white/15";

  const Icon = type === "warning" ? AlertTriangle : CheckCircle2;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[9999] transition-all duration-200",
        open
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-2 pointer-events-none"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl px-4 py-3 shadow-lg",
          bg
        )}
      >
        <Icon className="h-5 w-5 text-white" />
        <span className="text-sm font-medium text-white">{text}</span>
        <button
          type="button"
          onClick={() => onClose?.()}
          className="ml-2 rounded-full p-1 hover:bg-white/15"
          aria-label="Κλείσιμο"
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </div>
    </div>
  );
}

function ChangePasswordCard() {
  const [nextPassword, setNextPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);

  const [saving, setSaving] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastText, setToastText] = useState("");
  const [toastType, setToastType] = useState("success");

  const showToast = useCallback((t, type = "success") => {
    setToastText(t);
    setToastType(type);
    setToastOpen(true);
  }, []);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (!nextPassword || nextPassword.length < 8) {
        showToast(
          "Ο νέος κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες",
          "warning"
        );
        return;
      }

      if (nextPassword !== confirm) {
        showToast("Οι κωδικοί δεν ταιριάζουν", "warning");
        return;
      }

      setSaving(true);

      try {
        const { error } = await supabase.auth.updateUser({
          password: nextPassword,
        });

        if (error) throw error;

        setNextPassword("");
        setConfirm("");
        showToast("Ο κωδικός ενημερώθηκε ✅", "success");
      } catch (err) {
        showToast(err?.message || "Αποτυχία ενημέρωσης κωδικού", "warning");
      } finally {
        setSaving(false);
      }
    },
    [nextPassword, confirm, showToast]
  );

  return (
    <>
      <div
        className={cn(
          "relative overflow-hidden",
          "rounded-none sm:rounded-3xl",
          "-mx-4 px-4 sm:mx-0 sm:px-0",
          "border-0 ring-0 outline-none",
          "bg-transparent sm:bg-zinc-950/50",
          "backdrop-blur-0 sm:backdrop-blur",
          "shadow-none sm:shadow-[0_12px_40px_rgba(0,0,0,0.45)]",
          "sm:border sm:border-white/10"
        )}
      >
        <div className="px-4 py-5 sm:p-5 sm:sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-2">
              <KeyRound className="h-5 w-5 text-white/85" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                Αλλαγή κωδικού
              </div>
              <div className="text-xs text-white/55">
                Ενημέρωση του κωδικού πρόσβασης.
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
                Νέος κωδικός
              </label>
              <input
                value={nextPassword}
                onChange={(e) => setNextPassword(e.target.value)}
                type={show ? "text" : "password"}
                className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:bg-white/7 focus:ring-2 focus:ring-white/20"
                placeholder="Τουλάχιστον 8 χαρακτήρες"
                disabled={saving}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
                Επιβεβαίωση νέου κωδικού
              </label>
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                type={show ? "text" : "password"}
                className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:bg-white/7 focus:ring-2 focus:ring-white/20"
                placeholder="Επανάληψη νέου κωδικού"
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between pt-2 gap-2">
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="inline-flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                disabled={saving}
              >
                {show ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {show ? "Απόκρυψη" : "Εμφάνιση"}
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-white/90 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Ενημέρωση
              </button>
            </div>
          </form>
        </div>
      </div>

      <PageToast
        open={toastOpen}
        text={toastText}
        type={toastType}
        onClose={() => setToastOpen(false)}
      />
    </>
  );
}

export default function TrainerDashboard() {
  const location = useLocation();
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
            .map((row) => row?.user_name || row?.user_email || row?.user_id || null)
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

  const renderSection = () => {
    if (!profile) return null;

    switch (section) {
      case "overview":
        return (
          <DashboardOverview
            key="overview-section"
            profile={profile}
            performanceData={performanceData}
            loading={dashboardLoading}
            error={dashboardError}
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
            key="overview-section"
            profile={profile}
            performanceData={performanceData}
            loading={dashboardLoading}
            error={dashboardError}
          />
        );
    }
  };

  const tabs = [
    { key: "overview", label: "Επισκόπηση", icon: LayoutDashboard },
    { key: "profile", label: "Προφίλ", icon: UserRound },
    { key: "avatar", label: "Εικόνα", icon: ImageIcon },
    {
      key: "diploma",
      label: "Πτυχίο",
      icon: GraduationCap,
      showAlert: showDiplomaWarning,
    },
    { key: "security", label: "Ασφάλεια", icon: Shield },
  ];

  const TopTabs = (
    <div className="grid grid-cols-5 gap-2 sm:flex sm:flex-wrap sm:gap-3">
      {tabs.map(({ key, label, icon: Icon, showAlert }) => (
        <a
          key={key}
          href={`#${key}`}
          aria-label={label}
          title={label}
          className={cn(
            "group relative inline-flex items-center justify-center rounded-2xl border transition-all duration-200",
            "h-12 w-full sm:h-auto sm:w-auto sm:px-4 sm:py-3",
            "sm:justify-start sm:gap-2",
            section === key
              ? "bg-white text-black border-white shadow-[0_8px_24px_rgba(255,255,255,0.14)]"
              : "bg-white/5 text-white/80 border-white/10 hover:bg-white/10 hover:text-white"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline text-sm font-semibold">
            {label}
          </span>
          <span className="sr-only sm:hidden">{label}</span>

          {showAlert ? (
            <span
              className={cn(
                "absolute -top-1.5 -right-1.5 sm:static sm:ml-1.5",
                "inline-flex h-5 min-w-[20px] items-center justify-center",
                "rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white",
                "shadow-[0_6px_18px_rgba(239,68,68,0.35)]"
              )}
              aria-label="Λείπει πτυχίο"
              title="Δεν έχει ανέβει πτυχίο"
            >
              !
            </span>
          ) : null}
        </a>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="flex min-h-screen">
        {isDesktop ? (
          <aside className="shrink-0 border-r border-white/10">
            <TrainerMenu />
          </aside>
        ) : null}

<main className="flex-1 px-4 pb-28 pt-24 sm:p-6">
  <div className="max-w-5xl mx-auto">
    <div className="mb-8 sm:mb-6">
<h1 className="mt-14 text-[28px] sm:mt-0 sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
  Πίνακας Προπονητή
</h1>
      <p className="mt-4 text-sm leading-7 text-zinc-400 sm:mt-1 sm:text-base sm:leading-6">
        Οργάνωσε το προφίλ σου, την εικόνα, το πτυχίο και τις βασικές ρυθμίσεις του λογαριασμού σου.
      </p>
    </div>

    <div className="mb-8 sm:mb-6">{TopTabs}</div>

            {loading && (
              <div className="rounded-3xl bg-white/5 border border-white/10 p-6 flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin" />
                <div className="text-sm text-white/80">Φόρτωση...</div>
              </div>
            )}

            {!loading && err && (
              <div className="rounded-3xl bg-white/5 border border-white/10 p-6 mb-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-2">
                    <AlertTriangle className="h-5 w-5 text-white/85" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">
                      Δεν ήταν δυνατή η ανανέωση
                    </div>
                    <div className="text-sm text-white/60 mt-1">{err}</div>
                  </div>
                </div>
              </div>
            )}

            {!loading && profileLoaded && !profile && (
              <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
                <div className="text-sm text-white/80">
                  Δεν βρέθηκε προφίλ για αυτόν τον χρήστη.
                </div>
              </div>
            )}

            {!loading && profile && renderSection()}
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