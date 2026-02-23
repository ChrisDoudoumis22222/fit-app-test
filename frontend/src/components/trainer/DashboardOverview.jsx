// src/components/trainer/DashboardOverview.jsx
import React, { memo, useMemo } from "react";
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
}) {
  const data = performanceData || EMPTY_PERF;

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
    [data, loading],
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
    [data, loading],
  );

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
        {statsTop.map((stat, index) => (
          <motion.button
            key={stat.key}
            type="button"
            onClick={() => onJumpToBookings?.(stat.key)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.4 }}
            className={`text-left relative overflow-hidden rounded-xl sm:rounded-2xl bg-black/40 backdrop-blur-xl border ${stat.borderColor} p-4 sm:p-6 w-full`}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color}`} />
            <div className="relative">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <stat.icon className="w-6 h-6 sm:w-8 sm:h-8 text-zinc-300" />
                <span className="text-xs font-semibold text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                  {stat.trend}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-1">
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm text-zinc-400">{stat.label}</div>
            </div>
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {statsBookings.map((stat, index) => (
          <motion.button
            key={stat.key}
            type="button"
            onClick={() => onJumpToBookings?.(stat.key)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.45 }}
            className={`text-left relative overflow-hidden rounded-xl sm:rounded-2xl bg-black/40 backdrop-blur-xl border ${stat.borderColor} p-4 sm:p-6 w-full`}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color}`} />
            <div className="relative">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <stat.icon className="w-6 h-6 sm:w-8 sm:h-8 text-zinc-300" />
                <span className="text-[10px] font-semibold text-zinc-300 bg-white/10 px-2 py-1 rounded-full">
                  {stat.rightTag}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-1">
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm text-zinc-400">{stat.label}</div>
            </div>
          </motion.button>
        ))}
      </div>
    </>
  );
});

/* ------------------------------ bookings card ----------------------------- */

const GroupedBookingsCard = memo(function GroupedBookingsCard({ data, loading }) {
  const safe = data || EMPTY_PERF;

  const section = (title, items, icon, badgeClass) => (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="text-zinc-100 font-semibold text-sm sm:text-base">
            {title}
          </h4>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${badgeClass}`}>
          {items?.length || 0}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Spinner size={20} />
        </div>
      ) : items && items.length ? (
        <div className="space-y-2">
          {items.map((session) => {
            const rawWhen = session?._when ?? null;
            const when =
              rawWhen instanceof Date
                ? rawWhen
                : rawWhen
                  ? new Date(rawWhen)
                  : null;

            const dateText =
              when && !Number.isNaN(when.getTime())
                ? when.toLocaleDateString("el-GR")
                : session?.date || "—";

            const timeText =
              when && !Number.isNaN(when.getTime())
                ? when.toLocaleTimeString("el-GR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : session?.time || "—";

            return (
              <div
                key={String(session.id)}
                className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/30"
              >
                <div className="w-9 h-9 rounded-lg bg-white/5 grid place-items-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-zinc-100 text-sm truncate">
                    {session?.user?.full_name ||
                      session?.user?.email ||
                      "Πελάτης"}
                  </div>
                  <div className="text-zinc-400 text-xs">
                    {dateText} • {timeText}
                  </div>
                </div>
                <div className="text-[11px] text-zinc-300 bg-white/10 px-2 py-1 rounded-full capitalize">
                  {session?._status || session?.status || "—"}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6 text-sm text-zinc-400">
          Καμία εγγραφή
        </div>
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
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-zinc-100">
              Σύνοψη Κρατήσεων
            </h3>
            <p className="text-zinc-400 text-sm">
              Επερχόμενες / Αποδεκτές / Απορριφθείσες
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {section(
            "Επερχόμενες",
            safe.grouped.upcoming,
            <Clock className="w-4 h-4 text-amber-300" />,
            "bg-amber-500/10 text-amber-300 border border-amber-400/20",
          )}
          {section(
            "Αποδεκτές",
            safe.grouped.accepted,
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />,
            "bg-emerald-500/10 text-emerald-300 border border-emerald-400/20",
          )}
          {section(
            "Απορριφθείσες",
            safe.grouped.declined,
            <XCircle className="w-4 h-4 text-rose-300" />,
            "bg-rose-500/10 text-rose-300 border border-rose-400/20",
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
  const data = performanceData || EMPTY_PERF;

  return (
    <div className="space-y-6 sm:space-y-8">
      <TrainerPerformanceStats
        performanceData={data}
        loading={loading}
        onJumpToBookings={onJumpToBookings}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <GroupedBookingsCard data={data} loading={loading} />
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-center"
        >
          <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 text-sm">
            Σφάλμα φόρτωσης δεδομένων: {error}
          </p>
          {pvDebug && (
            <p className="mt-2 text-xs text-red-200/70">
              Άνοιξε Console και δες logs:{" "}
              <span className="font-semibold">[PV DEBUG][TrainerDashboard]</span>
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}

export default memo(DashboardOverview);