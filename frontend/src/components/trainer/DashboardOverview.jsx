// src/components/trainer/DashboardOverview.jsx
import React, { memo, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  Target,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Clock,
  Calendar,
  AlertCircle,
  Loader2,
} from "lucide-react";

/* ------------------------------ safe fallback ----------------------------- */

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

const SUMMARY_PREVIEW_LIMIT = 5;

/* ------------------------------ helpers ---------------------------------- */

function toNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function combineDateAndTime(dateValue, timeValue) {
  if (!dateValue) return null;

  const rawTime =
    typeof timeValue === "string" && timeValue.trim()
      ? timeValue.trim()
      : "00:00:00";

  const normalizedTime =
    /^\d{1,2}:\d{2}$/.test(rawTime) ? `${rawTime}:00` : rawTime;

  const parsed = new Date(`${dateValue}T${normalizedTime}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getClientLabel(session) {
  return (
    session?.user?.full_name ||
    session?.user?.name ||
    session?.user?.email ||
    session?.profile?.full_name ||
    session?.profile?.name ||
    session?.profiles?.full_name ||
    session?.profiles?.name ||
    session?.client?.full_name ||
    session?.client?.name ||
    session?.client_name ||
    session?.customer_name ||
    session?.user_name ||
    session?.full_name ||
    session?.name ||
    session?.email ||
    "Πελάτης"
  );
}

function getStatusLabel(session, fallbackStatus) {
  return (
    session?._status ||
    session?.status ||
    session?.booking_status ||
    fallbackStatus ||
    "—"
  );
}

function normalizeStatusKey(rawStatus, fallbackStatus = "upcoming") {
  const value = String(rawStatus || fallbackStatus || "")
    .toLowerCase()
    .trim();

  if (
    value === "pending" ||
    value === "upcoming" ||
    value === "requested" ||
    value === "request" ||
    value === "new"
  ) {
    return "upcoming";
  }

  if (
    value === "accepted" ||
    value === "approved" ||
    value === "approve" ||
    value === "confirmed" ||
    value === "accept"
  ) {
    return "accepted";
  }

  if (
    value === "declined" ||
    value === "rejected" ||
    value === "reject" ||
    value === "cancelled" ||
    value === "canceled" ||
    value === "denied"
  ) {
    return "declined";
  }

  if (
    fallbackStatus === "accepted" ||
    fallbackStatus === "declined" ||
    fallbackStatus === "upcoming"
  ) {
    return fallbackStatus;
  }

  return "upcoming";
}

function getStatusBadgeText(statusKey) {
  if (statusKey === "accepted") return "Αποδεκτή";
  if (statusKey === "declined") return "Απορρίφθηκε";
  return "Σε αναμονή";
}

function getWhen(session) {
  const combined = combineDateAndTime(
    session?.date ||
      session?.booking_date ||
      session?.session_date ||
      session?.scheduled_date,
    session?.start_time ||
      session?.time ||
      session?.booking_time ||
      session?.session_time ||
      session?.scheduled_time
  );

  if (combined) return combined;

  const raw =
    session?._when ||
    session?.scheduled_at ||
    session?.session_at ||
    session?.booking_datetime ||
    session?.starts_at ||
    session?.created_at ||
    null;

  if (raw instanceof Date) return raw;
  if (!raw) return null;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDateText(session, when) {
  if (when) return when.toLocaleDateString("el-GR");

  return (
    session?.date ||
    session?.booking_date ||
    session?.session_date ||
    session?.scheduled_date ||
    "—"
  );
}

function getTimeText(session, when) {
  if (when) {
    return when.toLocaleTimeString("el-GR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    session?.start_time ||
    session?.time ||
    session?.booking_time ||
    session?.session_time ||
    session?.scheduled_time ||
    "—"
  );
}

function normalizeSessions(items, fallbackStatus) {
  return asArray(items).map((session, index) => {
    const when = getWhen(session);
    const rawStatus = getStatusLabel(session, fallbackStatus);
    const statusKey = normalizeStatusKey(rawStatus, fallbackStatus);

    return {
      ...session,
      id:
        session?.id ||
        session?.booking_id ||
        session?.uuid ||
        `${fallbackStatus}-${index}`,
      _when: when,
      _status: rawStatus,
      _statusKey: statusKey,
      _statusBadge: getStatusBadgeText(statusKey),
      _clientLabel: getClientLabel(session),
      _dateText: getDateText(session, when),
      _timeText: getTimeText(session, when),
    };
  });
}

function normalizePerformanceData(input) {
  const src = input && typeof input === "object" ? input : {};

  const todayStatsSrc = src.todayStats || src.stats || src.summary || {};

  const groupedSrc = src.grouped || src.bookings || src.groupedBookings || {};

  return {
    todayStats: {
      sessionsToday: toNum(
        todayStatsSrc.sessionsToday ??
          todayStatsSrc.todaySessions ??
          src.sessionsToday
      ),
      activeClients: toNum(
        todayStatsSrc.activeClients ??
          todayStatsSrc.clientsActive ??
          src.activeClients
      ),
      upcomingSessions: toNum(
        todayStatsSrc.upcomingSessions ??
          todayStatsSrc.upcoming ??
          src.upcomingSessions
      ),
      monthlyProgress: toNum(
        todayStatsSrc.monthlyProgress ??
          todayStatsSrc.progress ??
          src.monthlyProgress
      ),
      acceptedTotal: toNum(
        todayStatsSrc.acceptedTotal ??
          todayStatsSrc.accepted ??
          src.acceptedTotal
      ),
      declinedTotal: toNum(
        todayStatsSrc.declinedTotal ??
          todayStatsSrc.declined ??
          src.declinedTotal
      ),
    },
    grouped: {
      upcoming: normalizeSessions(
        groupedSrc.upcoming ?? src.upcoming,
        "upcoming"
      ),
      accepted: normalizeSessions(
        groupedSrc.accepted ?? src.accepted,
        "accepted"
      ),
      declined: normalizeSessions(
        groupedSrc.declined ?? src.declined,
        "declined"
      ),
    },
    recentSessions: asArray(src.recentSessions),
  };
}

function getErrorText(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (typeof error?.message === "string") return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return "Άγνωστο σφάλμα";
  }
}

/* ------------------------------ tiny UI bits ------------------------------ */

const Spinner = memo(function Spinner({ size = 24 }) {
  return (
    <Loader2
      style={{ width: size, height: size }}
      className="animate-spin text-zinc-400"
    />
  );
});

/* --------------------------------- stats --------------------------------- */

const TrainerPerformanceStats = memo(function TrainerPerformanceStats({
  performanceData,
  loading,
  onJumpToBookings,
  onOpenBookingsPage,
}) {
  const data = useMemo(
    () => normalizePerformanceData(performanceData || EMPTY_PERF),
    [performanceData]
  );

  const statsTop = useMemo(
    () => [
      {
        key: "today",
        label: "Σημερινές Συνεδρίες",
        value: loading ? "..." : data.todayStats.sessionsToday,
        icon: Activity,
        trend: loading
          ? "..."
          : data.todayStats.sessionsToday > 0
            ? `+${data.todayStats.sessionsToday}`
            : "0",
        color: "from-blue-600/20 to-blue-700/20",
        borderColor: "border-blue-500/30",
      },
      {
        key: "monthly",
        label: "Μηνιαίος Στόχος",
        value: loading ? "..." : `${data.todayStats.monthlyProgress}%`,
        icon: Target,
        trend: loading
          ? "..."
          : data.todayStats.monthlyProgress >= 80
            ? "Πολύ κοντά"
            : "Σε εξέλιξη",
        color: "from-purple-600/20 to-purple-700/20",
        borderColor: "border-purple-500/30",
      },
    ],
    [data, loading]
  );

  const statsBookings = useMemo(
    () => [
      {
        key: "accepted",
        label: "Αποδεκτές Κρατήσεις",
        value: loading ? "..." : data.todayStats.acceptedTotal,
        icon: CheckCircle2,
        color: "from-emerald-600/20 to-emerald-700/20",
        borderColor: "border-emerald-500/30",
        rightTag: "Σύνολο",
      },
      {
        key: "declined",
        label: "Απορριφθείσες",
        value: loading ? "..." : data.todayStats.declinedTotal,
        icon: XCircle,
        color: "from-rose-600/20 to-rose-700/20",
        borderColor: "border-rose-500/30",
        rightTag: "Σύνολο",
      },
      {
        key: "upcoming",
        label: "Επερχόμενες",
        value: loading ? "..." : data.todayStats.upcomingSessions,
        icon: ArrowUpRight,
        color: "from-amber-600/20 to-amber-700/20",
        borderColor: "border-amber-500/30",
        rightTag: "Σύντομα",
      },
    ],
    [data, loading]
  );

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
        {statsTop.map((stat, index) => (
          <motion.button
            key={stat.key}
            type="button"
            onClick={() => onJumpToBookings?.(stat.key)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.4 }}
            className={[
              "text-left relative overflow-hidden rounded-2xl",
              "bg-black/40 backdrop-blur-xl border",
              stat.borderColor,
              "p-3 sm:p-6 w-full min-h-[118px] sm:min-h-0",
              "shadow-[0_8px_30px_rgba(0,0,0,0.18)]",
              "transition-all duration-200",
            ].join(" ")}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color}`} />

            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 grid place-items-center">
                  <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-200" />
                </div>

                <span className="text-[10px] sm:text-xs font-semibold text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full whitespace-nowrap">
                  {stat.trend}
                </span>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-bold text-zinc-100 leading-none mb-2">
                  {stat.value}
                </div>
                <div className="text-[11px] sm:text-sm text-zinc-400 leading-snug">
                  {stat.label}
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {statsBookings.map((stat, index) => {
          const isLast = index === statsBookings.length - 1;

          return (
            <motion.button
              key={stat.key}
              type="button"
              onClick={() => onOpenBookingsPage?.(stat.key)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.45 }}
              className={[
                "text-left relative overflow-hidden rounded-2xl",
                "bg-black/40 backdrop-blur-xl border",
                stat.borderColor,
                "p-3 sm:p-6 w-full min-h-[118px] sm:min-h-0",
                "shadow-[0_8px_30px_rgba(0,0,0,0.18)]",
                "transition-all duration-200",
                isLast ? "col-span-2 md:col-span-1" : "",
              ].join(" ")}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color}`} />

              <div className="relative flex h-full flex-col justify-between">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-white/5 grid place-items-center">
                    <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-200" />
                  </div>

                  <span className="text-[10px] sm:text-xs font-semibold text-zinc-200 bg-white/10 px-2.5 py-1 rounded-full whitespace-nowrap">
                    {stat.rightTag}
                  </span>
                </div>

                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-zinc-100 leading-none mb-2">
                    {stat.value}
                  </div>
                  <div
                    className={`text-zinc-400 leading-snug ${
                      isLast ? "text-xs sm:text-sm" : "text-[11px] sm:text-sm"
                    }`}
                  >
                    {stat.label}
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </>
  );
});

/* ------------------------------ bookings card ----------------------------- */

const GroupedBookingsCard = memo(function GroupedBookingsCard({
  data,
  loading,
  onOpenBookingsPage,
}) {
  const safe = useMemo(
    () => normalizePerformanceData(data || EMPTY_PERF),
    [data]
  );

  const section = (title, items, icon, badgeClass, statusKey) => {
    const totalItems = items?.length || 0;
    const visibleItems = asArray(items).slice(0, SUMMARY_PREVIEW_LIMIT);
    const remaining = Math.max(0, totalItems - visibleItems.length);

    return (
      <div className="min-w-0">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {icon}
            <h4 className="text-zinc-100 font-semibold text-sm sm:text-base truncate">
              {title}
            </h4>
          </div>

          <span className={`text-xs px-2 py-1 rounded-full ${badgeClass}`}>
            {totalItems}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Spinner size={20} />
          </div>
        ) : totalItems > 0 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              {visibleItems.map((session) => (
                <button
                  key={String(session.id)}
                  type="button"
                  onClick={() =>
                    onOpenBookingsPage?.(session?._statusKey || statusKey)
                  }
                  className="text-left h-full p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/30 hover:bg-zinc-800/45 hover:border-zinc-500/40 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white/5 grid place-items-center shrink-0">
                      <Calendar className="w-4 h-4 text-zinc-300" />
                    </div>

                    <div className="text-[10px] text-zinc-300 bg-white/10 px-2 py-1 rounded-full shrink-0">
                      {session?._statusBadge || session?._status || "—"}
                    </div>
                  </div>

                  <div className="mt-2 min-w-0">
                    <div className="text-zinc-100 text-xs sm:text-sm truncate">
                      {session?._clientLabel || "Πελάτης"}
                    </div>

                    <div className="text-zinc-400 text-[11px] sm:text-xs mt-1 leading-snug">
                      <div>{session?._dateText || "—"}</div>
                      <div>{session?._timeText || "—"}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-zinc-500">
                {remaining > 0 ? `+${remaining} ακόμη` : "Έως 5 εμφανίζονται"}
              </div>

              <button
                type="button"
                onClick={() => onOpenBookingsPage?.(statusKey)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/10"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Προβολή όλων
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-center py-6 text-sm text-zinc-400">
              Καμία εγγραφή
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onOpenBookingsPage?.(statusKey)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/10"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Προβολή όλων
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      id="bookings-summary"
      className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-black/40 backdrop-blur-xl border border-zinc-700/50 p-4 sm:p-6 lg:p-8"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent" />

      <div className="relative space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
          <div>
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-zinc-100">
              Σύνοψη Κρατήσεων
            </h3>
            <p className="text-zinc-400 text-sm">
              Δες τα όλα με μία ματία
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenBookingsPage?.("all")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-black px-4 py-2.5 text-sm font-semibold hover:bg-white/90"
          >
            <ArrowUpRight className="w-4 h-4" />
            Όλες οι κρατήσεις
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {section(
            "Επερχόμενες",
            safe.grouped.upcoming,
            <Clock className="w-4 h-4 text-amber-300" />,
            "bg-amber-500/10 text-amber-300 border border-amber-400/20",
            "upcoming"
          )}

          {section(
            "Αποδεκτές",
            safe.grouped.accepted,
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />,
            "bg-emerald-500/10 text-emerald-300 border border-emerald-400/20",
            "accepted"
          )}

          {section(
            "Απορριφθείσες",
            safe.grouped.declined,
            <XCircle className="w-4 h-4 text-rose-300" />,
            "bg-rose-500/10 text-rose-300 border border-rose-400/20",
            "declined"
          )}
        </div>
      </div>
    </div>
  );
});

/* -------------------------------- export --------------------------------- */

function DashboardOverview({
  performanceData,
  loading,
  error,
  onJumpToBookings,
  pvDebug = false,
}) {
  const data = useMemo(
    () => normalizePerformanceData(performanceData || EMPTY_PERF),
    [performanceData]
  );

  const navigate = useNavigate();

  const handleOpenBookingsPage = useCallback(
    (bookingKey = "all") => {
      navigate("/trainer/bookings", {
        state: { bookingView: bookingKey },
      });
    },
    [navigate]
  );

  const errorText = getErrorText(error);

  return (
    <div className="space-y-6 sm:space-y-8">
      <TrainerPerformanceStats
        performanceData={data}
        loading={loading}
        onJumpToBookings={onJumpToBookings}
        onOpenBookingsPage={handleOpenBookingsPage}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <GroupedBookingsCard
          data={data}
          loading={loading}
          onOpenBookingsPage={handleOpenBookingsPage}
        />
      </motion.div>

      {!!errorText && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-center"
        >
          <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 text-sm">
            Σφάλμα φόρτωσης δεδομένων: {errorText}
          </p>

          {pvDebug && (
            <p className="mt-2 text-xs text-red-200/70">
              Άνοιξε Console και δες logs:{" "}
              <span className="font-semibold">
                [PV DEBUG][TrainerDashboard]
              </span>
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}

export default memo(DashboardOverview);