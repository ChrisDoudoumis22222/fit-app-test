"use client";

import React, {
  lazy,
  Suspense,
  useEffect,
  memo,
  useState,
  useMemo,
  useRef,
} from "react";
import { useLocation } from "react-router-dom";
import {
  Loader2,
  Calendar,
  Users,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Euro,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "../AuthProvider";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import UserBookingDetailsDock from "../components/userbookings/UserBookingDetailsDock";

const UserMenu = lazy(() => import("../components/UserMenu"));

/* ---------------- helpers: dates (LOCAL) ---------------- */
const pad2 = (n) => String(n).padStart(2, "0");
const toYMDLocal = (d) => {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
};

const hhmm = (t) =>
  typeof t === "string" ? t.match(/^(\d{1,2}:\d{2})/)?.[1] ?? t : t;

const timeToMinutes = (t) => {
  if (!t) return 0;
  const [h, m] = String(t).split(":").map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
};

const fmtShortDay = (d) => d.toLocaleDateString("el-GR", { weekday: "short" });
const fmtLongDay = (d) => d.toLocaleDateString("el-GR", { weekday: "long" });
const fmtDayNum = (d) => d.toLocaleDateString("el-GR", { day: "2-digit" });
const fmtMonth = (d) => d.toLocaleDateString("el-GR", { month: "long" });
const fmtMonthYear = (d) =>
  d.toLocaleDateString("el-GR", { month: "long", year: "numeric" });

function startOfWeek(date, weekStartsOn = 1) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  if (day !== weekStartsOn) d.setDate(d.getDate() - (day - weekStartsOn));
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function withTimeout(promise, ms = 12000, msg = "Timeout") {
  let t;
  const timeout = new Promise((_, rej) => {
    t = setTimeout(() => rej(new Error(msg)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

/* ---------- Background ---------- */
const BaseBackground = memo(() => (
  <div className="fixed inset-0 -z-50">
    <div className="absolute inset-0 bg-black" />
    <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
  </div>
));

const AthleticBackground = memo(() => (
  <>
    <style>{`
      @keyframes pulse-performance { 0%,100%{opacity:.08;transform:scale(1)} 50%{opacity:.18;transform:scale(1.05)} }
      @keyframes athletic-grid { 0%{transform:translate(0,0) rotate(0)} 100%{transform:translate(60px,60px) rotate(.5deg)} }
    `}</style>
  </>
));

/* ---------- Glass primitives ---------- */
const Glass = memo(({ className = "", children }) => (
  <div
    className={[
      "relative rounded-3xl border border-white/10",
      "bg-[rgba(17,18,21,.65)] backdrop-blur-xl",
      "shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_10px_30px_rgba(0,0,0,.45)]",
      className,
    ].join(" ")}
  >
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
      <div className="absolute inset-0 bg-gradient-to-br from-white/[.06] via-white/[.02] to-transparent opacity-40" />
      <div className="absolute -top-1/2 left-0 right-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent opacity-50" />
    </div>
    <div className="relative">{children}</div>
  </div>
));

const GlassTile = ({ className = "", children }) => (
  <div
    className={[
      "relative rounded-2xl border border-white/10",
      "bg-white/[.04] transition hover:bg-white/[.06]",
      "shadow-[inset_0_1px_0_rgba(255,255,255,.05),0_6px_20px_rgba(0,0,0,.35)]",
      className,
    ].join(" ")}
  >
    <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[.08] to-transparent opacity-30" />
    <div className="relative">{children}</div>
  </div>
);

const ColorCard = memo(({ color = "red", className = "", children }) => {
  const gradientMap = {
    red: "from-red-600 to-red-700",
    emerald: "from-emerald-600 to-emerald-700",
    zinc: "from-zinc-700 to-zinc-800",
  };
  const gradient = gradientMap[color] || gradientMap.zinc;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-white shadow-xl ${gradient} ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% -10%, white, transparent 40%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
});

/* ---------- Spinner ---------- */
function Spinner({ full = false, onRetry }) {
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    if (!full) return;
    const t = setTimeout(() => setStalled(true), 15000);
    return () => clearTimeout(t);
  }, [full]);

  const reload = () => window.location.reload();

  if (full) {
    return (
      <div className="relative min-h-screen text-gray-100">
        <BaseBackground />
        <AthleticBackground />
        <div className="relative z-10 flex h-screen items-center justify-center px-4">
          {stalled ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-md rounded-3xl border border-amber-500/30 bg-[rgba(17,18,21,.65)] p-6 text-center shadow-[0_10px_30px_rgba(245,158,11,.25)] backdrop-blur-xl sm:p-8"
            >
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-amber-400" />
              <h3 className="mb-2 text-lg font-semibold text-amber-300">
                Άργησε πολύ να φορτώσει
              </h3>
              <p className="mb-6 text-amber-200/90">
                Δοκίμασε ξανά ή επαναφόρτωσε τη σελίδα.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={onRetry || reload}
                  className="flex-1 rounded-xl border border-amber-500/30 bg-amber-500/20 px-6 py-3 text-amber-100 transition hover:bg-amber-500/30"
                >
                  Δοκίμασε ξανά
                </button>
                <button
                  onClick={reload}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-700/60 bg-zinc-800/60 px-6 py-3 text-zinc-100 transition hover:bg-zinc-700/60"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reload σελίδας
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-6 rounded-3xl border border-white/10 bg-[rgba(17,18,21,.65)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_10px_30px_rgba(0,0,0,.45)] backdrop-blur-xl sm:p-8"
            >
              <Loader2 className="h-12 w-12 animate-spin text-blue-200" />
              <div className="space-y-2 text-center">
                <h3 className="text-xl font-semibold text-white">
                  Φόρτωση κρατήσεων
                </h3>
                <p className="text-white/70">Προετοιμασία των δεδομένων...</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center py-12 sm:py-16">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[rgba(17,18,21,.65)] px-4 py-3 backdrop-blur-xl">
        <Loader2 className="h-6 w-6 animate-spin text-blue-200" />
        <p className="text-white/70">Φόρτωση...</p>
      </div>
    </div>
  );
}

/* ---------- Error Boundary ---------- */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Calendar crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ColorCard color="red" className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-6 w-6" />
            <div>
              <p className="font-semibold">
                Κάτι πήγε στραβά στη λίστα κρατήσεων.
              </p>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="mt-4 rounded-lg bg-white/20 px-4 py-2 transition hover:bg-white/30"
              >
                Προσπάθησε ξανά
              </button>
            </div>
          </div>
        </ColorCard>
      );
    }
    return this.props.children;
  }
}

/* ======================= SMALL UTIL: media ======================= */
function useIsMobile(bp = 640) {
  const [is, setIs] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width:${bp - 0.02}px)`);
    const on = (e) => setIs(e.matches);
    setIs(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [bp]);

  return is;
}

/* ======================= SWITCHER ======================= */
function ViewSwitch({ value, onChange }) {
  const options = [
    { k: "day", label: "Ημερήσιο" },
    { k: "week", label: "Εβδομαδιαίο" },
    { k: "month", label: "Μηνιαίο" },
  ];

  return (
    <div className="w-full">
      <div
        className="
          relative flex w-full items-center gap-1
          rounded-none border-0 bg-transparent p-0 shadow-none
          sm:inline-flex sm:w-auto
          sm:gap-1 sm:rounded-full sm:border sm:border-white/10
          sm:bg-white/[.06] sm:p-1
          sm:shadow-[inset_0_1px_0_rgba(255,255,255,.05)]
        "
      >
        {options.map((o) => {
          const active = value === o.k;

          return (
            <button
              key={o.k}
              type="button"
              onClick={() => onChange(o.k)}
              className={`
                relative flex-1 sm:flex-none
                min-w-0 h-11 sm:h-9
                px-2.5 sm:px-4
                rounded-xl sm:rounded-full
                text-[12px] sm:text-sm
                font-semibold tracking-[-0.01em]
                ${
                  active
                    ? "border border-white/10 bg-white/[.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.16),0_6px_18px_rgba(0,0,0,.22)]"
                    : "border border-transparent bg-transparent text-white/50 hover:text-white/80"
                }
                sm:min-w-[106px]
              `}
            >
              <span className="block w-full truncate text-center">
                {o.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Booking pill ---------- */
function BookingPill({ b, onOpen, compact = false }) {
  const status = (b.status || "pending").toLowerCase();

  const ring =
    status === "accepted" || status === "completed"
      ? "ring-emerald-400/40"
      : status === "declined" || status === "cancelled"
      ? "ring-red-400/40"
      : "ring-yellow-400/40";

  const tint =
    status === "accepted" || status === "completed"
      ? "bg-gradient-to-br from-emerald-500/25 to-emerald-500/10"
      : status === "declined" || status === "cancelled"
      ? "bg-gradient-to-br from-red-500/25 to-red-500/10"
      : "bg-gradient-to-br from-yellow-500/25 to-yellow-500/10";

  const minutes =
    timeToMinutes(b.end_time) - timeToMinutes(b.start_time) || b.duration_min;
  const durationStr = minutes ? `${minutes}’` : null;
  const price = b.amount ?? null;
  const trainerLabel = b.trainer_name || b.trainer?.full_name || "Προπονητής";

  const pad = compact ? "px-2 py-1.5" : "px-3 py-2.5";
  const timeCls = compact
    ? "text-[11px] text-white/70"
    : "text-xs text-white/70";
  const nameCls = compact ? "text-[11px]" : "text-sm";
  const endCls = "text-[10px] text-white/60";
  const onlineCls = compact ? "text-[9px] px-1" : "text-[10px] px-1.5";

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onOpen?.(b);
      }}
      className="w-full text-left"
      type="button"
    >
      <GlassTile className={`${pad} ring-1 ${ring} ${tint}`}>
        <div className="flex items-center justify-between gap-2">
          <span className={timeCls}>{hhmm(b.start_time)}</span>
          {!compact && price != null && (
            <span className="inline-flex items-center gap-1 text-xs text-white/80">
              <Euro className="h-3 w-3" />
              {Number(price).toLocaleString("el-GR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          )}
        </div>

        <div className="mt-1 flex items-center gap-2">
          <span className={`${nameCls} truncate font-medium`}>
            {trainerLabel}
          </span>
          {b.is_online && (
            <span
              className={`${onlineCls} rounded bg-blue-400/15 py-0.5 text-blue-200`}
            >
              Online
            </span>
          )}
        </div>

        <div className="mt-1 flex items-center justify-between">
          <span className={endCls}>{hhmm(b.end_time)}</span>
          {durationStr && <span className={endCls}>{durationStr}</span>}
        </div>
      </GlassTile>
    </button>
  );
}

/* ---------- Tiny month chip for mobile ---------- */
function MonthMiniChip({ booking, onOpen }) {
  const status = (booking?.status || "pending").toLowerCase();

  const tone =
    status === "accepted" || status === "completed"
      ? "border-emerald-400/20 bg-emerald-500/16 text-emerald-200"
      : status === "declined" || status === "cancelled"
      ? "border-rose-400/20 bg-rose-500/16 text-rose-200"
      : "border-amber-400/20 bg-amber-500/16 text-amber-200";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen?.(booking);
      }}
      className="block w-full text-left"
    >
      <span
        className={[
          "block w-full truncate rounded-md border px-1.5 py-1",
          "text-[10px] font-medium leading-tight",
          tone,
        ].join(" ")}
      >
        {hhmm(booking?.start_time) || "—"}
      </span>
    </button>
  );
}

/* ---------- shared booking fetch ---------- */
async function fetchUserBookings({ userId, startDate, endDate }) {
  const query = supabase
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
        break_before_min,
        break_after_min,
        note,
        status,
        created_at,
        updated_at,
        is_online,
        user_email,
        user_name,
        trainer_name,
        amount,
        currency_code,
        payment_method,
        payment_status,
        paid_at,
        payment_reference,
        sale,
        trainer:profiles!trainer_bookings_trainer_id_fkey (
          id,
          full_name,
          email,
          avatar_url
        )
      `
    )
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate);

  const { data, error } = await withTimeout(query, 12000, "Timeout bookings");
  if (error) throw error;

  return (data ?? [])
    .map((r) => ({
      ...r,
      trainer: Array.isArray(r.trainer) ? r.trainer[0] : r.trainer || null,
    }))
    .sort((a, b) => {
      if (a.date !== b.date) return String(a.date).localeCompare(String(b.date));
      return timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
    });
}

async function fetchUserBookingById({ userId, bookingId }) {
  const query = supabase
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
        break_before_min,
        break_after_min,
        note,
        status,
        created_at,
        updated_at,
        is_online,
        user_email,
        user_name,
        trainer_name,
        amount,
        currency_code,
        payment_method,
        payment_status,
        paid_at,
        payment_reference,
        sale,
        trainer:profiles!trainer_bookings_trainer_id_fkey (
          id,
          full_name,
          email,
          avatar_url
        )
      `
    )
    .eq("id", bookingId)
    .eq("user_id", userId)
    .maybeSingle();

  const { data, error } = await withTimeout(query, 12000, "Timeout booking");
  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    trainer: Array.isArray(data.trainer) ? data.trainer[0] : data.trainer || null,
  };
}

/* ======================= DAY VIEW ======================= */
function DaySchedule({
  userId,
  onOpenDetails,
  view,
  onChangeView,
  refreshKey,
  focusDate,
}) {
  const [day, setDay] = useState(() => startOfDay(focusDate || new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const dayStr = useMemo(() => toYMDLocal(day), [day]);
  const isMobile = useIsMobile(640);

  useEffect(() => {
    if (!focusDate) return;
    setDay(startOfDay(focusDate));
  }, [focusDate]);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!userId) return;
      setLoading(true);
      setError(null);

      try {
        const data = await fetchUserBookings({
          userId,
          startDate: dayStr,
          endDate: dayStr,
        });

        if (!alive) return;
        setRows(data);
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        setError(e.message || "Σφάλμα φόρτωσης κρατήσεων");
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [userId, dayStr, refreshKey]);

  const goPrev = () =>
    setDay((d) => {
      const n = new Date(d);
      n.setDate(n.getDate() - 1);
      return startOfDay(n);
    });

  const goNext = () =>
    setDay((d) => {
      const n = new Date(d);
      n.setDate(n.getDate() + 1);
      return startOfDay(n);
    });

  const content = (
    <>
      <div className="mb-2 flex items-center justify-between px-3 sm:mb-3 sm:px-0">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            className="shrink-0 rounded-xl border border-white/10 bg-white/6 p-2 hover:bg-white/10"
            onClick={goPrev}
            type="button"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            className="shrink-0 rounded-xl border border-white/10 bg-white/6 p-2 hover:bg-white/10"
            onClick={goNext}
            type="button"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <p className="ml-1 truncate text-sm text-white/90 sm:ml-2 sm:text-base">
            {fmtLongDay(day)} {fmtDayNum(day)} {fmtMonth(day)}
          </p>
        </div>

        <div className="hidden md:block">
          <ViewSwitch value={view} onChange={onChangeView} />
        </div>
      </div>

      <div className="mb-3 flex justify-center px-3 md:hidden">
        <ViewSwitch value={view} onChange={onChangeView} />
      </div>

      <div
        className={`grid gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 ${
          isMobile ? "px-0" : ""
        }`}
      >
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/[.06] sm:h-20"
            />
          ))
        ) : error ? (
          <div className="rounded-xl bg-red-900/20 p-3 text-sm text-red-300">
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-white/12 px-2 py-5 text-center text-xs text-white/60 sm:py-6">
            καμια κρατηση
          </div>
        ) : (
          rows.map((b) => (
            <BookingPill key={b.id} b={b} onOpen={onOpenDetails} />
          ))
        )}
      </div>
    </>
  );

  if (isMobile) return <div className="px-0">{content}</div>;
  return <Glass className="p-2 sm:p-6">{content}</Glass>;
}

/* ======================= WEEK VIEW ======================= */
function WeeklyScheduleGrid({
  userId,
  onOpenDetails,
  view,
  onChangeView,
  refreshKey,
  focusDate,
}) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(focusDate || new Date(), 1)
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const isMobile = useIsMobile(640);

  useEffect(() => {
    if (!focusDate) return;
    setWeekStart(startOfWeek(focusDate, 1));
  }, [focusDate]);

  const days = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [weekStart]);

  const dateStr = (d) => toYMDLocal(d);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!userId) return;
      setLoading(true);
      setError(null);

      try {
        const start = dateStr(weekStart);
        const endDate = new Date(weekStart);
        endDate.setDate(endDate.getDate() + 6);
        const end = dateStr(endDate);

        const data = await fetchUserBookings({
          userId,
          startDate: start,
          endDate: end,
        });

        if (!alive) return;
        setRows(data);
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        setError(e.message || "Σφάλμα φόρτωσης κρατήσεων");
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [userId, weekStart, refreshKey]);

  const grouped = useMemo(() => {
    const map = new Map();
    days.forEach((d) => map.set(dateStr(d), []));
    rows.forEach((r) => {
      const key = r.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    });
    return map;
  }, [rows, days]);

  const goPrev = () =>
    setWeekStart((d) => {
      const n = new Date(d);
      n.setDate(n.getDate() - 7);
      return startOfWeek(n, 1);
    });

  const goNext = () =>
    setWeekStart((d) => {
      const n = new Date(d);
      n.setDate(n.getDate() + 7);
      return startOfWeek(n, 1);
    });

  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const label =
    weekStart.getMonth() === end.getMonth()
      ? `${weekStart.getDate()}–${end.getDate()} ${fmtMonth(weekStart)}`
      : `${weekStart.getDate()} ${fmtMonth(
          weekStart
        )} – ${end.getDate()} ${fmtMonth(end)}`;

  const content = (
    <>
      <div className="mb-2 flex items-center justify-between px-3 sm:mb-3 sm:px-0">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            className="shrink-0 rounded-xl border border-white/10 bg-white/6 p-2 hover:bg-white/10"
            onClick={goPrev}
            type="button"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            className="shrink-0 rounded-xl border border-white/10 bg-white/6 p-2 hover:bg-white/10"
            onClick={goNext}
            type="button"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <p className="ml-1 truncate text-sm text-white/90 sm:ml-2 sm:text-base">
            {label}
          </p>
        </div>

        <div className="hidden md:block">
          <ViewSwitch value={view} onChange={onChangeView} />
        </div>
      </div>

      <div className="mb-3 flex justify-center px-3 md:hidden">
        <ViewSwitch value={view} onChange={onChangeView} />
      </div>

      <div
        className={
          isMobile ? "-mx-1.5 overflow-x-auto px-1.5" : "overflow-x-auto"
        }
      >
        <div
          className={
            isMobile
              ? "grid w-max min-w-full grid-flow-col auto-cols-[calc(100vw-24px)] gap-2.5"
              : "grid min-w-[840px] grid-cols-7 gap-2.5 sm:gap-4 lg:min-w-[1000px]"
          }
        >
          {days.map((d) => {
            const key = dateStr(d);
            const dayRows = grouped.get(key) || [];

            return (
              <div
                key={key}
                className={[
                  isMobile ? "rounded-2xl p-3" : "rounded-3xl p-2.5 sm:p-3",
                  "border border-white/10 bg-[rgba(17,18,21,.55)] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_6px_24px_rgba(0,0,0,.4)]",
                ].join(" ")}
              >
                <GlassTile className="mb-2.5 px-2.5 py-2 sm:mb-3 sm:px-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/85 sm:text-sm">
                      {fmtShortDay(d)}
                    </div>
                    <div className="text-xs font-semibold text-white sm:text-sm">
                      {fmtDayNum(d)}
                    </div>
                  </div>
                </GlassTile>

                <div className="space-y-2.5 sm:space-y-3">
                  {loading ? (
                    [...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="h-14 animate-pulse rounded-2xl border border-white/10 bg-white/[.06] sm:h-16"
                      />
                    ))
                  ) : error ? (
                    <div className="rounded-xl bg-red-900/20 p-3 text-sm text-red-300">
                      {error}
                    </div>
                  ) : dayRows.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/12 px-2 py-5 text-center text-[11px] text-white/40 sm:py-6 sm:text-xs">
                      καμια κρατηση
                    </div>
                  ) : (
                    dayRows.map((b) => (
                      <BookingPill key={b.id} b={b} onOpen={onOpenDetails} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );

  if (isMobile) return <div className="px-0">{content}</div>;
  return <Glass className="p-2 sm:p-6">{content}</Glass>;
}

/* ======================= MONTH VIEW ======================= */
function MonthlySchedule({
  userId,
  onOpenDetails,
  view,
  onChangeView,
  refreshKey,
  focusDate,
}) {
  const [anchor, setAnchor] = useState(() =>
    startOfMonth(focusDate || new Date())
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

  const isMobile = useIsMobile(768);
  const isTiny = useIsMobile(390);
  const maxPills = isMobile ? 99 : 3;

  useEffect(() => {
    if (!focusDate) return;
    setAnchor(startOfMonth(focusDate));
  }, [focusDate]);

  const gridStart = useMemo(
    () => startOfWeek(startOfMonth(anchor), 1),
    [anchor]
  );

  const gridDays = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [gridStart]);

  const startStr = toYMDLocal(gridStart);
  const endStr = useMemo(() => {
    const e = new Date(gridStart);
    e.setDate(e.getDate() + 41);
    return toYMDLocal(e);
  }, [gridStart]);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!userId) return;
      setLoading(true);
      setError(null);

      try {
        const data = await fetchUserBookings({
          userId,
          startDate: startStr,
          endDate: endStr,
        });

        if (!alive) return;
        setRows(data);
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        setError(e.message || "Σφάλμα φόρτωσης κρατήσεων");
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [userId, startStr, endStr, refreshKey]);

  const byDate = useMemo(() => {
    const m = new Map();
    rows.forEach((r) => {
      if (!m.has(r.date)) m.set(r.date, []);
      m.get(r.date).push(r);
    });
    m.forEach((list) =>
      list.sort(
        (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
      )
    );
    return m;
  }, [rows]);

  const goPrev = () =>
    setAnchor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goNext = () =>
    setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const weekdays = ["Δ", "Τ", "Τ", "Π", "Π", "Σ", "Κ"];

  const content = (
    <>
      <div className="mb-2 flex items-center justify-between px-3 sm:mb-3 sm:px-0">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
          <button
            className="shrink-0 rounded-xl border border-white/10 bg-white/6 p-2 hover:bg-white/10"
            onClick={goPrev}
            type="button"
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button
            className="shrink-0 rounded-xl border border-white/10 bg-white/6 p-2 hover:bg-white/10"
            onClick={goNext}
            type="button"
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <p className="ml-1 truncate text-[13px] text-white/90 sm:ml-2 sm:text-base">
            {fmtMonthYear(anchor)}
          </p>
        </div>

        <div className="hidden md:block">
          <ViewSwitch value={view} onChange={onChangeView} />
        </div>
      </div>

      <div className="-mx-3 mb-3 px-3 md:hidden">
        <ViewSwitch value={view} onChange={onChangeView} />
      </div>

      <div className="px-0 sm:px-0">
        <div className="mb-1 grid grid-cols-7 gap-[2px] sm:mb-2 sm:gap-2">
          {weekdays.map((w, i) => (
            <div
              key={`${w}-${i}`}
              className="text-center text-[9px] font-medium text-white/60 sm:text-xs"
            >
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-[2px] sm:gap-2">
          {gridDays.map((d, idx) => {
            const inMonth = d.getMonth() === anchor.getMonth();
            const key = toYMDLocal(d);
            const dayRows = byDate.get(key) || [];

            return (
              <div
                key={idx}
                className={[
                  "overflow-hidden rounded-lg border border-white/10 p-1 sm:rounded-2xl sm:p-2",
                  isTiny
                    ? "min-h-[110px]"
                    : isMobile
                    ? "min-h-[145px]"
                    : "min-h-[110px]",
                  inMonth
                    ? "bg-[rgba(17,18,21,.55)]"
                    : "bg-[rgba(17,18,21,.35)] opacity-70",
                  "backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_6px_24px_rgba(0,0,0,.4)] transition hover:ring-1 hover:ring-white/15",
                ].join(" ")}
              >
                <div className="mb-0.5 flex items-center justify-between sm:mb-1">
                  <span
                    className={`font-semibold ${
                      inMonth ? "text-white/90" : "text-white/45"
                    } ${isTiny ? "text-[10px]" : "text-[11px]"} sm:text-[12px]`}
                  >
                    {fmtDayNum(d)}
                  </span>
                </div>

                {loading ? (
                  <div
                    className={`${
                      isTiny ? "h-7" : isMobile ? "h-8" : "h-16"
                    } animate-pulse rounded-md border border-white/10 bg-white/[.06] sm:rounded-xl`}
                  />
                ) : error ? (
                  <div
                    className={`${
                      isTiny ? "text-[8px]" : "text-[9px]"
                    } rounded bg-red-900/20 p-1 text-red-300 sm:text-[11px]`}
                  >
                    !
                  </div>
                ) : dayRows.length === 0 ? (
                  isMobile ? (
                    <div className="flex h-[18px] items-center justify-center text-white/35 sm:h-auto">
                      <span
                        className={`${isTiny ? "text-[10px]" : "text-[11px]"}`}
                      >
                        —
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-white/60">
                      <span className="text-[10px] leading-none">
                        Καμία κράτηση
                      </span>
                    </div>
                  )
                ) : isMobile ? (
                  <div className="space-y-1.5">
                    {dayRows.slice(0, maxPills).map((b) => (
                      <MonthMiniChip
                        key={b.id}
                        booking={b}
                        onOpen={onOpenDetails}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {dayRows.slice(0, maxPills).map((b) => (
                      <BookingPill
                        key={b.id}
                        b={b}
                        onOpen={onOpenDetails}
                        compact
                      />
                    ))}
                    {dayRows.length > maxPills && (
                      <div className="text-[10px] text-white/50">
                        +{dayRows.length - maxPills} ακόμα
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );

  if (isMobile) return <div className="px-0">{content}</div>;
  return <Glass className="p-2 sm:p-6">{content}</Glass>;
}

/* ======================= STABLE VIEW SLIDE ======================= */
function CalendarStage({ view, childrenMap }) {
  const order = { day: 0, week: 1, month: 2 };
  const [mounted, setMounted] = useState(() => new Set([view]));

  useEffect(() => {
    setMounted((s) => new Set(s).add(view));
  }, [view]);

  return (
    <div className="relative min-h-[420px] sm:min-h-[520px] lg:min-h-[560px]">
      {[...mounted].map((k) => {
        const rel = order[k] - order[view];
        const isActive = k === view;

        return (
          <motion.div
            key={k}
            initial={false}
            animate={{
              opacity: isActive ? 1 : 0,
              x: isActive ? 0 : rel * 40,
              filter: isActive ? "blur(0px)" : "blur(1px)",
            }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={
              isActive ? "relative" : "pointer-events-none absolute inset-0"
            }
            style={{ willChange: "transform, opacity, filter" }}
          >
            {childrenMap[k]}
          </motion.div>
        );
      })}
    </div>
  );
}

/* ================================ PAGE ================================ */
export default function UserBookingsPage() {
  useEffect(() => {
    document.documentElement.classList.add("bg-black");
    document.body.classList.add("bg-black");
    return () => {
      document.documentElement.classList.remove("bg-black");
      document.body.classList.remove("bg-black");
    };
  }, []);

  const location = useLocation();
  const { profile, loading } = useAuth();

  const [authUserId, setAuthUserId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("week");
  const [focusedDate, setFocusedDate] = useState(null);
  const [refreshKey] = useState(0);
  const [authRetryKey, setAuthRetryKey] = useState(0);

  const isMobile = useIsMobile(640);
  const detailsRef = useRef(null);

  const bookingIdFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("booking");
  }, [location.search]);

  useEffect(() => {
    const getAuthUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setAuthUserId(user?.id ?? null);
    };
    getAuthUser();
  }, [authRetryKey]);

  const userId = useMemo(
    () => profile?.id || authUserId || null,
    [profile?.id, authUserId]
  );

  const scrollTo = (ref) => {
    const el = ref?.current;
    if (!el) return;
    const isMobileNow = window.matchMedia("(max-width: 1023px)").matches;
    const top =
      el.getBoundingClientRect().top + window.scrollY - (isMobileNow ? 88 : 100);
    window.scrollTo({ top, behavior: "smooth" });
  };

  const openDetails = (bookingOrId) => {
    setSelected(bookingOrId);

    if (typeof bookingOrId === "object" && bookingOrId?.date) {
      const nextDate = startOfDay(new Date(`${bookingOrId.date}T00:00:00`));
      setFocusedDate(nextDate);
    }

    if (!isMobile) {
      setTimeout(() => scrollTo(detailsRef), 60);
    }
  };

  const closeDetails = () => setSelected(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!userId || !bookingIdFromQuery) return;

      /* open dock immediately with id, even before full fetch */
      setSelected(bookingIdFromQuery);

      if (typeof window !== "undefined") {
        const desktop = window.matchMedia("(min-width: 1024px)").matches;
        if (desktop) {
          setTimeout(() => scrollTo(detailsRef), 100);
        }
      }

      try {
        const booking = await fetchUserBookingById({
          userId,
          bookingId: bookingIdFromQuery,
        });

        if (!alive || !booking) return;

        const bookingDate = booking?.date
          ? startOfDay(new Date(`${booking.date}T00:00:00`))
          : null;

        setSelected(booking);

        if (bookingDate) {
          setFocusedDate(bookingDate);

          const today = startOfDay(new Date());
          const diffDays = Math.abs(
            Math.round((bookingDate - today) / (1000 * 60 * 60 * 24))
          );

          if (diffDays === 0) {
            setView("day");
          } else if (diffDays <= 7) {
            setView("week");
          } else {
            setView("month");
          }
        }

        if (typeof window !== "undefined") {
          const desktop = window.matchMedia("(min-width: 1024px)").matches;
          if (desktop) {
            setTimeout(() => scrollTo(detailsRef), 140);
          }
        }
      } catch (err) {
        console.error("Failed to open booking from query:", err);
      }
    })();

    return () => {
      alive = false;
    };
  }, [userId, bookingIdFromQuery]);

  if (loading || !profile || !userId) {
    return <Spinner full onRetry={() => setAuthRetryKey((k) => k + 1)} />;
  }

  if (profile.role !== "user") {
    return (
      <div className="relative min-h-screen text-gray-100">
        <BaseBackground />
        <AthleticBackground />
        <div className="relative z-10 flex h-screen items-center justify-center px-4">
          <ColorCard color="red" className="w-full max-w-md p-8 text-center">
            <div className="mx-auto mb-4 w-fit rounded-full bg-white/15 p-4">
              <Users className="h-8 w-8" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">
              Μη εξουσιοδοτημένη πρόσβαση
            </h2>
            <p className="text-white/80">
              Η σελίδα αυτή είναι μόνο για χρήστες.
            </p>
          </ColorCard>
        </div>
      </div>
    );
  }

  const easing = [0.22, 1, 0.36, 1];

  return (
    <>
      

      <div className="relative min-h-screen text-gray-100">
        <BaseBackground />
        <AthleticBackground />

        <div className="relative z-10 min-h-screen overflow-x-hidden pt-0 md:pt-4 lg:pl-[var(--side-w)] lg:pt-0">
          <Suspense fallback={<></>}>
            <UserMenu />
          </Suspense>

          <motion.div
            className="mx-1.5 -mt-4 sm:mx-4 sm:-mt-2 md:mt-6"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: easing }}
          >
            <div className="relative px-0 py-0 sm:px-4 sm:py-4 md:p-6">
              <div className="grid grid-cols-[40px,1fr] items-start gap-x-3 sm:mb-0 sm:flex sm:items-center sm:gap-4">
                <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/6 shrink-0 sm:h-auto sm:w-auto sm:p-3">
                  <Calendar className="h-5 w-5 text-white sm:h-7 sm:w-7" />
                </div>

                <div className="min-w-0">
                  <h1 className="whitespace-nowrap text-[1.15rem] font-bold leading-tight tracking-[-0.02em] text-white sm:text-3xl md:text-4xl">
                    Οι <span className="ml-1 inline sm:ml-2">Κρατήσεις μου</span>
                  </h1>

                  <p className="mt-1.5 max-w-[260px] text-[12px] leading-[1.3] text-white/70 sm:max-w-none sm:text-base">
                    Έχεις πλήρη εικόνα για όλες τις κρατήσεις σου
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <main
            className={`mx-auto w-full max-w-none pb-28 md:pb-16 ${
              isMobile ? "px-0" : "px-1.5 sm:px-4"
            }`}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: easing }}
            >
              <div
                className={`grid grid-cols-1 items-start lg:grid-cols-[1fr,420px] ${
                  isMobile ? "gap-0" : "gap-3 sm:gap-4 md:gap-6"
                }`}
              >
                <ErrorBoundary>
                  <Suspense fallback={<Spinner />}>
                    <CalendarStage
                      view={view}
                      childrenMap={{
                        day: (
                          <DaySchedule
                            key={`day-${refreshKey}`}
                            userId={userId}
                            onOpenDetails={openDetails}
                            view={view}
                            onChangeView={setView}
                            refreshKey={refreshKey}
                            focusDate={focusedDate}
                          />
                        ),
                        week: (
                          <WeeklyScheduleGrid
                            key={`week-${refreshKey}`}
                            userId={userId}
                            onOpenDetails={openDetails}
                            view={view}
                            onChangeView={setView}
                            refreshKey={refreshKey}
                            focusDate={focusedDate}
                          />
                        ),
                        month: (
                          <MonthlySchedule
                            key={`month-${refreshKey}`}
                            userId={userId}
                            onOpenDetails={openDetails}
                            view={view}
                            onChangeView={setView}
                            refreshKey={refreshKey}
                            focusDate={focusedDate}
                          />
                        ),
                      }}
                    />
                  </Suspense>
                </ErrorBoundary>

                <div className="min-h-full self-stretch px-1.5 sm:px-0">
                  <div className="flex h-full flex-col lg:sticky lg:top-4">
                    <div ref={detailsRef} className="h-0" />

                    <AnimatePresence mode="wait">
                      {selected && (
                        <motion.div
                          key={
                            typeof selected === "object"
                              ? selected?.id || "details-panel"
                              : String(selected)
                          }
                          initial={{ opacity: 0, y: isMobile ? 0 : -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: isMobile ? 0 : -8 }}
                          transition={{
                            duration: 0.28,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          className={isMobile ? "" : "flex-1"}
                        >
                          <UserBookingDetailsDock
                            booking={
                              typeof selected === "object" ? selected : null
                            }
                            bookingId={
                              typeof selected === "string" ? selected : null
                            }
                            onClose={closeDetails}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>
          </main>
        </div>
      </div>
    </>
  );
}