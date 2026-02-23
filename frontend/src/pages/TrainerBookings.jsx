// src/pages/TrainerBookingsPage.js
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
import {
  Loader2,
  Calendar,
  Users,
  Clock,
  AlertCircle,
  X,
  CalendarClock,
  CheckCircle,
  Ban,
  Wifi,
  User,
  Mail,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Euro,
  PencilLine,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "../AuthProvider";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";

/* external components */
import TrainerQuickBook from "../components/TrainerQuickBook";

/* lazy components */
const TrainerMenu = lazy(() => import("../components/TrainerMenu"));
const AcceptModal = lazy(() => import("../components/AcceptBookingModal"));
const DeclineModal = lazy(() => import("../components/DeclineBookingModal"));

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
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
};
const fmtShortDay = (d) =>
  d.toLocaleDateString("el-GR", { weekday: "short" });
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
const safeId = (b) =>
  (b && (b.id ?? b.booking_id ?? b.uid ?? b.pk ?? null)) || null;
function toLocalDate(input) {
  if (!input) return null;
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}
function combineDateTime(date, time) {
  if (!date) return null;
  const d = new Date(`${date}T${time ?? "00:00:00"}`);
  return isNaN(d.getTime()) ? null : d;
}
const fmtDate = (d) => {
  if (!d) return "—";
  const obj = typeof d === "string" ? new Date(`${d}T00:00:00`) : d;
  return obj.toLocaleDateString("el-GR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};
const fmtTs = (ts) =>
  ts
    ? ts.toLocaleString("el-GR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
const isNewBooking = (b) => {
  if (!b?.created_at) return false;
  const created = new Date(b.created_at).getTime();
  return Date.now() - created <= 24 * 60 * 60 * 1000;
};

/* ---------- Timeout helper (prevents indefinite hangs) ---------- */
function withTimeout(promise, ms = 12000, msg = "Timeout") {
  let t;
  const timeout = new Promise((_, rej) =>
    (t = setTimeout(() => rej(new Error(msg)), ms))
  );
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
    <div className="pointer-events-none absolute inset-0 rounded-3xl overflow-hidden">
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
      "bg-white/[.04] hover:bg-white/[.06] transition",
      "shadow-[inset_0_1px_0_rgba(255,255,255,.05),0_6px_20px_rgba(0,0,0,.35)]",
      className,
    ].join(" ")}
  >
    <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[.08] to-transparent opacity-30" />
    <div className="relative">{children}</div>
  </div>
);

/* ---------- Simple color card ---------- */
const ColorCard = memo(({ color = "red", className = "", children }) => {
  const gradientMap = {
    red: "from-red-600 to-red-700",
    emerald: "from-emerald-600 to-emerald-700",
    zinc: "from-zinc-700 to-zinc-800",
  };
  const gradient = gradientMap[color] || gradientMap.zinc;
  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-6 shadow-xl text-white bg-gradient-to-br ${gradient} ${className}`}
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

/* ---------- Spinner with 15s stall fallback ---------- */
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
        <div className="relative z-10 flex items-center justify-center h-screen">
          {stalled ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="text-center p-8 rounded-3xl bg-[rgba(17,18,21,.65)] backdrop-blur-xl border border-amber-500/30 shadow-[0_10px_30px_rgba(245,158,11,.25)] max-w-md"
            >
              <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-amber-300 mb-2">
                Άργησε πολύ να φορτώσει
              </h3>
              <p className="text-amber-200/90 mb-6">
                Δοκίμασε ξανά ή επαναφόρτωσε τη σελίδα.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onRetry || reload}
                  className="flex-1 px-6 py-3 rounded-xl bg-amber-500/20 text-amber-100 border border-amber-500/30 hover:bg-amber-500/30 transition"
                >
                  Δοκίμασε ξανά
                </button>
                <button
                  onClick={reload}
                  className="flex-1 px-6 py-3 rounded-xl bg-zinc-800/60 text-zinc-100 border border-zinc-700/60 hover:bg-zinc-700/60 transition inline-flex items-center justify-center gap-2"
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
              className="flex flex-col items-center gap-6 p-8 rounded-3xl bg-[rgba(17,18,21,.65)] backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_10px_30px_rgba(0,0,0,.45)]"
            >
              <Loader2 className="h-12 w-12 animate-spin text-blue-200" />
              <div className="text-center space-y-2">
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
    <div className="flex justify-center py-16">
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[rgba(17,18,21,.65)] backdrop-blur-xl border border-white/10">
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
            <AlertCircle className="h-6 w-6 mt-0.5" />
            <div>
              <p className="font-semibold">
                Κάτι πήγε στραβά στη λίστα κρατήσεων.
              </p>
              <button
                onClick={() =>
                  this.setState({ hasError: false, error: null })
                }
                className="mt-4 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition"
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

/* ======================= SWITCHER (with slide) ======================= */
function ViewSwitch({ value, onChange }) {
  const options = [
    { k: "day", label: "Ημερήσιο" },
    { k: "week", label: "Εβδομαδιαίο" },
    { k: "month", label: "Μηνιαίο" },
  ];

  return (
    <motion.div
      layout
      className="
        relative inline-flex items-center gap-1
        rounded-full p-1
        bg-white/[.06] border border-white/10
        shadow-[inset_0_1px_0_rgba(255,255,255,.05)]
        overflow-hidden
      "
    >
      {options.map((o) => {
        const active = value === o.k;
        return (
          <motion.button
            key={o.k}
            layout
            onClick={() => onChange(o.k)}
            whileTap={{ scale: 0.98 }}
            className={`
              relative h-8 px-3 rounded-full text-xs sm:h-9 sm:px-4 sm:text-sm font-medium
              whitespace-nowrap
              ${active ? "text-white" : "text-white/55 hover:text-white/80"}
              min-w-[80px] sm:min-w-[106px]
            `}
          >
            {active && (
              <motion.span
                layoutId="segThumb"
                className="
                  absolute inset-0 rounded-full
                  bg-white/[.18]
                  shadow-[inset_0_1px_0_rgba(255,255,255,.25),0_2px_8px_rgba(0,0,0,.35)]
                "
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <motion.span
              layout
              className="relative z-10 block"
              initial={false}
              animate={{ y: active ? 0 : 1, opacity: active ? 1 : 0.75 }}
              transition={{ duration: 0.18 }}
            >
              {o.label}
            </motion.span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}

/* ---------- Shared Button ---------- */
function Button({
  children,
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl font-medium transition focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-60 disabled:cursor-not-allowed";
  const sizes = { sm: "h-9 px-3 text-sm", md: "h-10 px-4 text-sm" };
  const variants = {
    primary:
      "bg-emerald-600/90 hover:bg-emerald-600 text-white border border-emerald-400/20 shadow-[0_6px_18px_rgba(16,185,129,.25)]",
    secondary: "bg-white/6 hover:bg-white/10 text-white border border-white/10",
    danger:
      "bg-rose-600/90 hover:bg-rose-600 text-white border border-rose-400/20 shadow-[0_6px_18px_rgba(244,63,94,.25)]",
    ghost: "bg-transparent hover:bg-white/5 text-white border border-white/10",
  };
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

/* ---------- Booking pill ---------- */
function BookingPill({ b, onOpen, compact = false }) {
  const status = (b.status || "pending").toLowerCase();
  const ring =
    status === "accepted"
      ? "ring-emerald-400/35"
      : status === "declined" || status === "cancelled"
      ? "ring-rose-400/35"
      : "ring-amber-400/35";
  const tint =
    status === "accepted"
      ? "bg-emerald-500/10"
      : status === "declined" || status === "cancelled"
      ? "bg-rose-500/10"
      : "bg-amber-500/10";

  const minutes =
    timeToMinutes(b.end_time) - timeToMinutes(b.start_time) || b.duration_min;
  const durationStr = minutes ? `${minutes}’` : null;
  const price = b.price_eur ?? b.total_price ?? b.price;
  const isNew = isNewBooking(b);

  const pad = compact ? "px-2 py-1.5" : "px-3 py-2.5";
  const timeCls = compact ? "text-[12px] text-white/70" : "text-xs text-white/70";
  const nameCls = compact ? "text-[12px]" : "text-sm";
  const endCls = "text-[11px] text-white/60";
  const onlineCls = compact ? "text-[9px] px-1" : "text-[10px] px-1.5";

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onOpen?.(b);
      }}
      className="w-full text-left"
    >
      <GlassTile className={`${pad} ring-1 ${ring} ${tint}`}>
        {isNew && (
          <span
            className={`absolute top-2 right-2 ${
              compact ? "text-[8px] px-1" : "text-[9px] px-1.5"
            } tracking-wide py-0.5 rounded bg-white/20 text-white/90`}
          >
            NEW
          </span>
        )}
        <div className="flex items-center justify-between">
          <span className={timeCls}>{hhmm(b.start_time)}</span>
          {!compact && price != null && (
            <span className="text-xs inline-flex items-center gap-1 text-white/80">
              <Euro className="h-3 w-3" />
              {Number(price).toLocaleString("el-GR")}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className={`${nameCls} font-medium truncate`}>
            {b.user_name || b.client_name || "Κράτηση"}
          </span>
          {b.is_online && (
            <span
              className={`${onlineCls} py-0.5 rounded bg-blue-400/15 text-blue-200`}
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

/* ======================= NEW: POPUP BAR ======================= */
function NewBookingsPopup({ trainerId, onOpenDetails, refreshKey }) {
  const [items, setItems] = useState([]);
  const [minimized, setMinimized] = useState(false);
  const [loading, setLoading] = useState(true);

  // initial load with timeout
  useEffect(() => {
    let alive = true;
    if (!trainerId) return;
    (async () => {
      try {
        setLoading(true);
        const query = supabase
          .from("trainer_bookings")
          .select(
            "id,date,start_time,end_time,duration_min,status,is_online,user_name,created_at"
          )
          .eq("trainer_id", trainerId)
          .eq("status", "pending")
          .order("date", { ascending: true })
          .order("start_time", { ascending: true })
          .limit(50);
        const { data, error } = await withTimeout(
          query,
          10000,
          "Timeout νέων κρατήσεων"
        );
        if (error) throw error;
        if (!alive) return;
        setItems(data ?? []);
        setMinimized((data?.length ?? 0) === 0);
      } catch {
        if (!alive) return;
        setItems([]);
        setMinimized(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [trainerId, refreshKey]);

  // realtime
  useEffect(() => {
    if (!trainerId) return;
    const channel = supabase.channel(`realtime-trainer-bookings-${trainerId}`);
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "trainer_bookings",
        filter: `trainer_id=eq.${trainerId}`,
      },
      (payload) => {
        const b = payload.new;
        if ((b.status || "pending") !== "pending") return;
        setItems((prev) => {
          const next = [b, ...prev]
            .sort((a, c) =>
              a.date === c.date
                ? a.start_time.localeCompare(c.start_time)
                : a.date.localeCompare(c.date)
            )
            .slice(0, 50);
          return next;
        });
      }
    );
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "trainer_bookings",
        filter: `trainer_id=eq.${trainerId}`,
      },
      (payload) => {
        const b = payload.new;
        setItems((prev) => {
          const next = prev.map((x) => (x.id === b.id ? { ...x, ...b } : x));
          return next.filter((x) => (x.status || "pending") === "pending");
        });
      }
    );
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [trainerId]);

  if ((items?.length ?? 0) === 0) return null;

  if (minimized) {
    return (
      <AnimatePresence>
        <motion.div
          key="new-bookings-min"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="sticky top-2 z-40"
        >
          <button
            onClick={() => setMinimized(false)}
            className="
              w-fit px-3 sm:px-4 py-2 rounded-full
              border border-white/10 bg-[rgba(17,18,21,.65)] backdrop-blur-xl
              shadow-[inset_0_1px_0_rgba(255,255,255,.05),0_8px_20px_rgba(0,0,0,.45)]
              text-white/90 hover:bg-white/[.08] transition flex items-center gap-2
            "
            aria-label="Άνοιγμα νέων κρατήσεων"
            title="Άνοιγμα νέων κρατήσεων"
          >
            <CalendarClock className="h-4 w-4" />
            <span className="text-sm font-medium">Νέα αιτήματα κράτησης</span>
            <span className="text-xs text-white/70">({items.length})</span>
          </button>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        key="new-bookings-popup"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="mb-3 md:mb-4 sticky top-2 z-40"
      >
        <Glass className="p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-white/90 font-medium">
              Νέα αιτήματα κράτησης{" "}
              <span className="text-white/55">({items.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setMinimized(true)}
                aria-label="Μίνιμαϊζ"
              >
                <X className="h-4 w-4 text-white/85" />
              </Button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {loading && (
              <div className="text-xs text-white/60 px-2 py-2">Φόρτωση…</div>
            )}
            {!loading &&
              items.map((b) => (
                <div key={b.id} className="min-w-[220px] sm:min-w-[240px]">
                  <BookingPill
                    b={b}
                    onOpen={(bb) => onOpenDetails?.(bb)}
                    compact
                  />
                </div>
              ))}
          </div>
        </Glass>
      </motion.div>
    </AnimatePresence>
  );
}

/* ======================= DAY VIEW ======================= */
function DaySchedule({
  trainerId,
  onOpenDetails,
  view,
  onChangeView,
  refreshKey,
  onSelectDate,
}) {
  const [day, setDay] = useState(startOfDay(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const dayStr = useMemo(() => toYMDLocal(day), [day]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!trainerId) return;
      setLoading(true);
      setError(null);
      try {
        const query = supabase
          .from("trainer_bookings")
          .select(
            "id,date,start_time,end_time,duration_min,status,is_online,user_name,created_at"
          )
          .eq("trainer_id", trainerId)
          .eq("date", dayStr);
        const { data, error } = await withTimeout(
          query,
          10000,
          "Timeout day view"
        );
        if (error) throw error;
        const sorted = (data ?? []).sort(
          (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
        );
        if (!alive) return;
        setRows(sorted);
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
  }, [trainerId, dayStr, refreshKey]);

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

  return (
    <Glass className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <button className="p-2 rounded-xl bg-white/6 hover:bg-white/10 border border-white/10" onClick={goPrev}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button className="p-2 rounded-xl bg-white/6 hover:bg-white/10 border border-white/10" onClick={goNext}>
            <ChevronRight className="h-5 w-5" />
          </button>
          <p className="ml-1 sm:ml-2 text-white/90">
            {fmtLongDay(day)} {fmtDayNum(day)} {fmtMonth(day)}
          </p>
        </div>
        <div className="hidden md:block">
          <ViewSwitch value={view} onChange={onChangeView} />
        </div>
      </div>
      <div className="md:hidden mb-3 flex justify-center">
        <ViewSwitch value={view} onChange={onChangeView} />
      </div>

      <div
        className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 cursor-pointer"
        onClick={() => onSelectDate?.(dayStr)}
        title="Κάνε κλικ για γρήγορη κράτηση για αυτή τη μέρα"
      >
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-2xl bg-white/[.06] animate-pulse border border-white/10"
            />
          ))
        ) : error ? (
          <div className="text-sm text-red-300 bg-red-900/20 rounded-xl p-3">
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-xs text-white/60 px-2 py-6 text-center border border-dashed border-white/12 rounded-2xl col-span-full">
            καμια κρατηση • πάτα για κράτηση
          </div>
        ) : (
          rows.map((b) => (
            <BookingPill key={b.id} b={b} onOpen={onOpenDetails} />
          ))
        )}
      </div>
    </Glass>
  );
}

/* ======================= WEEK VIEW ======================= */
function WeeklyScheduleGrid({
  trainerId,
  onOpenDetails,
  view,
  onChangeView,
  refreshKey,
  onSelectDate,
}) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), 1));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

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
    const load = async () => {
      if (!trainerId) return;
      setLoading(true);
      setError(null);
      try {
        const start = dateStr(weekStart);
        const endDate = new Date(weekStart);
        endDate.setDate(endDate.getDate() + 6);
        const end = dateStr(endDate);

        const query = supabase
          .from("trainer_bookings")
          .select(
            "id,date,start_time,end_time,duration_min,status,is_online,user_name,created_at"
          )
          .eq("trainer_id", trainerId)
          .gte("date", start)
          .lte("date", end);

        const { data, error } = await withTimeout(
          query,
          10000,
          "Timeout week view"
        );
        if (error) throw error;
        const sorted = (data ?? []).sort(
          (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
        );
        if (!alive) return;
        setRows(sorted);
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        setError(e.message || "Σφάλμα φόρτωσης κρατήσεων");
        setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [trainerId, weekStart, refreshKey]);

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
      : `${weekStart.getDate()} ${fmtMonth(weekStart)} – ${end.getDate()} ${fmtMonth(end)}`;

  return (
    <Glass className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <button className="p-2 rounded-xl bg-white/6 hover:bg-white/10 border border-white/10" onClick={goPrev}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button className="p-2 rounded-xl bg-white/6 hover:bg-white/10 border border-white/10" onClick={goNext}>
            <ChevronRight className="h-5 w-5" />
          </button>
          <p className="ml-1 sm:ml-2 text-white/90">{label}</p>
        </div>
        <div className="hidden md:block">
          <ViewSwitch value={view} onChange={onChangeView} />
        </div>
      </div>
      <div className="md:hidden mb-3 flex justify-center">
        <ViewSwitch value={view} onChange={onChangeView} />
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1000px] grid grid-cols-7 gap-3 sm:gap-4">
          {days.map((d) => {
            const key = dateStr(d);
            const dayRows = grouped.get(key) || [];
            return (
              <div
                key={key}
                onClick={() => onSelectDate?.(key)}
                className="rounded-3xl p-3 border border-white/10 bg-[rgba(17,18,21,.55)] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_6px_24px_rgba(0,0,0,.4)] cursor-pointer hover:ring-1 hover:ring-white/15 transition"
                title="Κάνε κλικ για γρήγορη κράτηση"
              >
                <GlassTile className="px-3 py-2 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-white/85">{fmtShortDay(d)}</div>
                    <div className="text-sm font-semibold text-white">
                      {fmtDayNum(d)}
                    </div>
                  </div>
                </GlassTile>

                <div className="space-y-3">
                  {loading ? (
                    [...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="h-16 rounded-2xl bg-white/[.06] animate-pulse border border-white/10"
                      />
                    ))
                  ) : error ? (
                    <div className="text-sm text-red-300 bg-red-900/20 rounded-xl p-3">
                      {error}
                    </div>
                  ) : dayRows.length === 0 ? (
                    <div className="text-xs text-white/40 px-2 py-6 text-center border border-dashed border-white/12 rounded-2xl">
                      καμια κρατηση • πάτα για κράτηση
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
    </Glass>
  );
}

/* ======================= MONTH VIEW (mobile-tuned + empty-day hint) ======================= */
function MonthlySchedule({
  trainerId,
  onOpenDetails,
  view,
  onChangeView,
  refreshKey,
  onSelectDate,
}) {
  const [anchor, setAnchor] = useState(startOfMonth(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

  // Mobile breakpoints
  const isMobile = useIsMobile(640);
  const isTiny = useIsMobile(400); // very small phones
  const maxPills = isTiny ? 1 : isMobile ? 2 : 3;

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
      if (!trainerId) return;
      setLoading(true);
      setError(null);
      try {
        const query = supabase
          .from("trainer_bookings")
          .select(
            "id,date,start_time,end_time,duration_min,status,is_online,user_name,created_at"
          )
          .eq("trainer_id", trainerId)
          .gte("date", startStr)
          .lte("date", endStr);
        const { data, error } = await withTimeout(
          query,
          12000,
          "Timeout month view"
        );
        if (error) throw error;
        if (!alive) return;
        setRows(data ?? []);
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
  }, [trainerId, startStr, endStr, refreshKey]);

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
  const weekdays = ["Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ", "Κυρ"];

  return (
    <Glass className="p-3 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex items-center gap-1.5 sm:gap-3">
          <button className="p-2 rounded-xl bg-white/6 hover:bg-white/10 border border-white/10" onClick={goPrev}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button className="p-2 rounded-xl bg-white/6 hover:bg-white/10 border border-white/10" onClick={goNext}>
            <ChevronRight className="h-5 w-5" />
          </button>
          <p className="ml-1 sm:ml-2 text-white/90 text-sm sm:text-base">
            {fmtMonthYear(anchor)}
          </p>
        </div>
        <div className="hidden md:block">
          <ViewSwitch value={view} onChange={onChangeView} />
        </div>
      </div>
      <div className="md:hidden mb-2 flex justify-center">
        <ViewSwitch value={view} onChange={onChangeView} />
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-[3px] sm:gap-2 mb-1 sm:mb-2">
        {weekdays.map((w) => (
          <div key={w} className="text-center text-[9px] sm:text-xs text-white/60">
            {w}
          </div>
        ))}
      </div>

      {/* Grid — allow horizontal scroll on very small screens */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-[3px] sm:gap-2 min-w-[560px] sm:min-w-0">
          {gridDays.map((d, idx) => {
            const inMonth = d.getMonth() === anchor.getMonth();
            const key = toYMDLocal(d);
            const dayRows = byDate.get(key) || [];
            return (
              <div
                key={idx}
                onClick={() => onSelectDate?.(key)}
                className={[
                  "rounded-lg sm:rounded-2xl border border-white/10",
                  "p-1 sm:p-2",
                  isTiny ? "min-h-[64px]" : "min-h-[72px] sm:min-h-[110px]",
                  inMonth
                    ? "bg-[rgba(17,18,21,.55)]"
                    : "bg-[rgba(17,18,21,.35)] opacity-70",
                  "backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_6px_24px_rgba(0,0,0,.4)]",
                  "cursor-pointer hover:ring-1 hover:ring-white/15 transition",
                ].join(" ")}
                title="Κάνε κλικ για γρήγορη κράτηση"
              >
                {/* Date header row */}
                <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                  <span
                    className={`font-medium ${
                      inMonth ? "text-white/85" : "text-white/40"
                    } ${isTiny ? "text-[10px]" : "text-[11px]"} sm:text-[12px]`}
                  >
                    {fmtDayNum(d)}
                  </span>
                  {loading && idx < 7 ? (
                    <span
                      className={`${
                        isTiny ? "text-[8px]" : "text-[9px]"
                      } sm:text-[10px] text-white/30`}
                    >
                      …
                    </span>
                  ) : null}
                </div>

                {/* Body */}
                {loading ? (
                  <div
                    className={`${
                      isTiny ? "h-10" : "h-12"
                    } sm:h-16 rounded-md sm:rounded-xl bg-white/[.06] animate-pulse border border-white/10`}
                  />
                ) : error ? (
                  <div
                    className={`${
                      isTiny ? "text-[9px]" : "text-[10px]"
                    } sm:text-[11px] text-red-300 bg-red-900/20 rounded p-1.5`}
                  >
                    Σφάλμα
                  </div>
                ) : dayRows.length === 0 ? (
                  <div className="flex items-center gap-1 text-white/60">
                    <PencilLine
                      className={`${
                        isTiny ? "h-3 w-3" : "h-3.5 w-3.5"
                      } opacity-70`}
                    />
                    <span
                      className={`${isTiny ? "text-[9px]" : "text-[10px]"} leading-none`}
                    >
                      Πρόσθεσε μια κράτηση
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {dayRows.slice(0, maxPills).map((b) => (
                      <BookingPill key={b.id} b={b} onOpen={onOpenDetails} compact />
                    ))}
                    {dayRows.length > maxPills && (
                      <div
                        className={`${
                          isTiny ? "text-[9px]" : "text-[10px]"
                        } text-white/50`}
                      >
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
    </Glass>
  );
}

/* ======================= DETAILS DOCK ======================= */
function BookingDetailsDock({
  booking,
  bookingId,
  trainerId,
  onDone,
  onClose,
}) {
  const id = useMemo(
    () => (bookingId ? bookingId : safeId(booking)),
    [booking, bookingId]
  );
  const [full, setFull] = useState(() => (booking && id ? booking : null));
  const [loading, setLoading] = useState(!booking);
  const [err, setErr] = useState(null);
  const [showAccept, setAccept] = useState(false);
  const [showDecline, setDecline] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!id) return;

    const hasEverything =
      booking &&
      booking.date &&
      booking.start_time &&
      (booking.user_name || booking.user?.full_name) &&
      (booking.trainer_name || booking.trainer?.full_name);
    if (hasEverything) {
      setFull(booking);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      setErr(null);
      const query = supabase
        .from("trainer_bookings")
        .select(
          `
          id, trainer_id, user_id, date, start_time, end_time, duration_min,
          note, status, created_at, updated_at, is_online,
          user_name, user_email, trainer_name,
          user:profiles!trainer_bookings_user_id_fkey ( id, full_name, email, avatar_url ),
          trainer:profiles!trainer_bookings_trainer_id_fkey ( id, full_name, email, avatar_url )
        `
        )
        .eq("id", id)
        .single();

      try {
        const { data, error } = await withTimeout(
          query,
          10000,
          "Timeout details"
        );
        if (!alive) return;
        if (error) {
          setErr(error.message || "Σφάλμα ανάγνωσης κράτησης");
          setLoading(false);
          return;
        }

        const normalized = {
          ...data,
          client: {
            full_name:
              data.user_name || data.user?.full_name || "Χρήστης",
            email: data.user_email || data.user?.email || null,
            avatar_url: data.user?.avatar_url || null,
          },
          trainer_info: {
            full_name: data.trainer_name || data.trainer?.full_name || null,
            email: data.trainer?.email || null,
            avatar_url: data.trainer?.avatar_url || null,
          },
        };
        setFull(normalized);
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        setErr(e.message || "Σφάλμα ανάγνωσης κράτησης");
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id, booking]);

  const status = useMemo(() => {
    const raw = (full?.status || "pending").toString().toLowerCase();
    if (
      raw === "confirmed" ||
      raw === "approve" ||
      raw === "approved" ||
      raw === "accept"
    )
      return "accepted";
    if (raw === "reject") return "declined";
    return raw;
  }, [full?.status]);

  const statusTone =
    {
      pending: "bg-amber-500/20 text-amber-300",
      accepted: "bg-emerald-600/20 text-emerald-300",
      declined: "bg-rose-600/20 text-rose-300",
      cancelled: "bg-rose-600/20 text-rose-300",
    }[status];
  const statusLabel =
    {
      pending: "Σε αναμονή",
      accepted: "Αποδεκτή",
      declined: "Απορρίφθηκε",
      cancelled: "Ακυρώθηκε",
    }[status];
  const secondLabel =
    { accepted: "Αποδοχή", declined: "Απόρριψη", cancelled: "Ακύρωση", pending: null }[
      status
    ];
  const SecondIcon =
    status === "accepted" ? CheckCircle : status === "pending" ? Clock : Ban;

  return (
    <Glass className="p-5 h-fit">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">Λεπτομέρειες Κράτησης</h3>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Κλείσιμο">
            <X className="h-4 w-4 text-white/85" />
          </Button>
        )}
      </div>

      {!id ? null : loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-7 w-40 bg-white/[.08] rounded border border-white/10" />
          <div className="h-32 bg-white/[.06] rounded-xl border border-white/10" />
          <div className="h-6 bg-white/[.06] rounded border border-white/10" />
          <div className="h-6 bg-white/[.06] rounded border border-white/10" />
        </div>
      ) : err ? (
        <div className="text-sm text-red-300 bg-red-900/30 rounded-xl p-3">
          {err}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-4 mb-6">
            {full?.client?.avatar_url ? (
              <img
                src={full.client.avatar_url}
                alt=""
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-full bg-gray-700">
                <CalendarClock className="h-7 w-7 text-gray-500" />
              </div>
            )}
            <div>
              <div className="text-xl font-medium text-white">
                {full?.client?.full_name || full?.user_name || "Χρήστης"}
              </div>
              <span
                className={`inline-flex mt-2 px-2.5 py-0.5 rounded-lg text-xs ${statusTone}`}
              >
                {statusLabel}
              </span>
            </div>
          </div>

          <ul className="space-y-3 text-gray-300">
            <Li icon={CalendarClock} label="Ημερομηνία" value={fmtDate(full?.date)} />
            <Li
              icon={Clock}
              label="Ώρες"
              value={`${hhmm(full?.start_time)} – ${hhmm(full?.end_time)}`}
            />
            <Li
              icon={Clock}
              label="Διάρκεια"
              value={`${full?.duration_min ?? 0} λεπτά`}
            />
            <Li icon={Wifi} label="Τύπος" value={full?.is_online ? "Online συνεδρία" : "Δια ζώσης"} />
            {!!full?.note && <Li icon={MapPin} label="Σημείωση" value={full.note} />}
            <div className="h-px bg-white/10 my-2" />
            <Li icon={User} label="Πελάτης" value={full?.client?.full_name || full?.user_name || "—"} />
            {!!(full?.client?.email || full?.user_email) && (
              <Li icon={Mail} label="Email πελάτη" value={full?.client?.email || full?.user_email} />
            )}
            {!!full?.trainer_name && <Li icon={User} label="Προπονητής" value={full.trainer_name} />}
            <div className="h-px bg-white/10 my-2" />
            <Li
              icon={CalendarClock}
              label="Υποβλήθηκε"
              value={fmtTs(
                toLocalDate(full?.created_at) ??
                  combineDateTime(full?.date, full?.start_time)
              )}
            />
            {secondLabel && full?.updated_at && (
              <Li
                icon={SecondIcon}
                label={secondLabel}
                value={fmtTs(toLocalDate(full.updated_at))}
              />
            )}
          </ul>

          {status === "pending" && (
            <div className="mt-6 flex items-center gap-2 justify-end">
              <Button variant="secondary" onClick={() => setDecline(true)}>
                Απόρριψη
              </Button>
              <Button variant="primary" onClick={() => setAccept(true)}>
                Αποδοχή
              </Button>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {showAccept && (
          <Suspense fallback={null}>
            <AcceptModal
              trainerId={trainerId}
              bookingId={id}
              close={() => setAccept(false)}
              onDone={() => onDone?.()}
            />
          </Suspense>
        )}
        {showDecline && (
          <Suspense fallback={null}>
            <DeclineModal
              trainerId={trainerId}
              bookingId={id}
              close={() => setDecline(false)}
              onDone={() => onDone?.()}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </Glass>
  );
}

const Li = ({ icon: Icon, label, value }) => (
  <li className="flex items-start gap-3">
    <Icon className="h-6 w-6 text-gray-500 mt-0.5" />
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-base text-gray-200 break-words">{value || "—"}</p>
    </div>
  </li>
);

/* ======================= STABLE VIEW SLIDE ======================= */
function CalendarStage({ view, childrenMap }) {
  const order = { day: 0, week: 1, month: 2 };
  const [mounted, setMounted] = useState(() => new Set([view]));
  const prev = useRef(view);

  useEffect(() => {
    setMounted((s) => new Set(s).add(view));
    prev.current = view;
  }, [view]);

  return (
    <div className="relative min-h-[520px] sm:min-h-[560px]">
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
            className={isActive ? "relative" : "absolute inset-0 pointer-events-none"}
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
export default function TrainerBookingsPage() {
  useEffect(() => {
    document.documentElement.classList.add("bg-black");
    document.body.classList.add("bg-black");
    return () => {
      document.documentElement.classList.remove("bg-black");
      document.body.classList.remove("bg-black");
    };
  }, []);

  const { profile, loading } = useAuth();
  const [authUserId, setAuthUserId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("week");
  const [refreshKey, setRefreshKey] = useState(0);

  const [workStart, setWorkStart] = useState("08:00");
  const [workEnd, setWorkEnd] = useState("22:00");
  const [sessionMinutes, setSessionMinutes] = useState(60);

  const [quickDate, setQuickDate] = useState(null);
  const quickRef = useRef(null);
  const detailsRef = useRef(null);

  const [authRetryKey, setAuthRetryKey] = useState(0);

  useEffect(() => {
    const getAuthUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setAuthUserId(user?.id ?? null);
    };
    getAuthUser();
  }, [authRetryKey]);

  const resolvedTrainerId = useMemo(
    () => profile?.id || authUserId || null,
    [profile?.id, authUserId]
  );

  // settings
  useEffect(() => {
    if (!resolvedTrainerId) return;
    const pad = (n) => String(n).padStart(2, "0");
    const toHHMM = (v) => {
      if (v == null) return null;
      if (typeof v === "number") return `${pad(Math.floor(v / 60))}:${pad(v % 60)}`;
      const m = String(v).match(/(\d{1,2}):?(\d{2})/);
      if (m)
        return `${pad(Math.min(23, parseInt(m[1], 10) || 0))}:${pad(
          parseInt(m[2], 10) || 0
        )}`;
      return null;
    };
    const first = (...vals) => vals.find((v) => v !== null && v !== undefined && v !== "");

    (async () => {
      try {
        let { data: ts } = await supabase
          .from("trainer_settings")
          .select(
            "work_start,work_end,session_minutes,start_time,end_time,session_min,session_length_min"
          )
          .eq("trainer_id", resolvedTrainerId)
          .maybeSingle();

        let pf = null;
        if (!ts) {
          const { data: pData } = await supabase
            .from("profiles")
            .select(
              "work_start,work_end,session_minutes,start_time,end_time,session_min,session_length_min,slot_minutes"
            )
            .eq("id", resolvedTrainerId)
            .maybeSingle();
          pf = pData || null;
        }

        const src = ts || pf || {};
        const start = toHHMM(first(src.work_start, src.start_time));
        const end = toHHMM(first(src.work_end, src.end_time));
        const sess = Number(
          first(
            src.session_minutes,
            src.session_min,
            src.session_length_min,
            src.slot_minutes
          )
        );

        if (start) setWorkStart(start);
        if (end) setWorkEnd(end);
        if (!Number.isNaN(sess) && sess > 0) setSessionMinutes(sess);
      } catch {
        /* keep defaults */
      }
    })();
  }, [resolvedTrainerId]);

  const scrollTo = (ref) => {
    const el = ref?.current;
    if (!el) return;
    const isMobile = window.matchMedia("(max-width: 1023px)").matches;
    const top =
      el.getBoundingClientRect().top +
      window.scrollY -
      (isMobile ? 88 : 100);
    window.scrollTo({ top, behavior: "smooth" });
  };

  const openDetails = (bookingOrId) => {
    setSelected(bookingOrId);
    setTimeout(() => scrollTo(detailsRef), 60);
  };
  const closeDetails = () => setSelected(null);

  const handleSelectDate = (dateStr) => {
    setQuickDate(dateStr);
    setTimeout(() => scrollTo(quickRef), 60);
  };
  const handleCreated = () => {
    setRefreshKey((k) => k + 1);
    setQuickDate(null);
  };

  const handleFab = () => {
    if (!quickDate) setQuickDate(toYMDLocal(new Date()));
    setTimeout(() => scrollTo(quickRef), 70);
  };

  // --- PAGE-LEVEL LOADING WATCHDOG ---
  if (loading || !profile || !resolvedTrainerId) {
    return <Spinner full onRetry={() => setAuthRetryKey((k) => k + 1)} />;
  }

  if (profile.role !== "trainer") {
    return (
      <div className="relative min-h-screen text-gray-100">
        <BaseBackground />
        <AthleticBackground />
        <div className="relative z-10 flex items-center justify-center h-screen">
          <ColorCard color="red" className="text-center p-8 max-w-md">
            <div className="p-4 rounded-full bg-white/15 w-fit mx-auto mb-4">
              <Users className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              Μη εξουσιοδοτημένη πρόσβαση
            </h2>
            <p className="text-white/80">
              Δεν έχετε δικαίωμα πρόσβασης σε αυτή τη σελίδα.
            </p>
          </ColorCard>
        </div>
      </div>
    );
  }

  const easing = [0.22, 1, 0.36, 1];

  return (
    <>
      <title>Κρατήσεις Πελατών • TrainerHub</title>

      <div className="relative min-h-screen text-gray-100">
        <BaseBackground />
        <AthleticBackground />

        <div className="min-h-screen overflow-x-hidden pt-0 md:pt-4 lg:pt-0 lg:pl-[var(--side-w)] relative z-10">
          <Suspense fallback={<></>}>
            <TrainerMenu />
          </Suspense>

          {/* Header */}
          <motion.div
            className="mx-4 mt-2 md:mt-6"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: easing }}
          >
            <div className="relative p-4 md:p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-white/8 border border-white/10">
                  <Calendar className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                    Κρατήσεις <br className="md:hidden" /> Πελατών
                  </h1>
                  <p className="text-white/70 mt-1">
                    Διαχειριστείτε τις κρατήσεις και τα ραντεβού σας
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Popup bar */}
          <div className="mx-4">
            <NewBookingsPopup
              trainerId={resolvedTrainerId}
              onOpenDetails={openDetails}
              refreshKey={refreshKey}
            />
          </div>

          {/* Calendar + details dock + QuickBook */}
          <main className="mx-auto w-full max-w-none px-4 pb-28 md:pb-16">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: easing }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-[1fr,420px] gap-4 md:gap-6 items-stretch">
                {/* LEFT: calendar */}
                <ErrorBoundary>
                  <Suspense fallback={<Spinner />}>
                    <CalendarStage
                      view={view}
                      childrenMap={{
                        day: (
                          <DaySchedule
                            key={`day-${refreshKey}`}
                            trainerId={resolvedTrainerId}
                            onOpenDetails={openDetails}
                            view={view}
                            onChangeView={setView}
                            refreshKey={refreshKey}
                            onSelectDate={handleSelectDate}
                          />
                        ),
                        week: (
                          <WeeklyScheduleGrid
                            key={`week-${refreshKey}`}
                            trainerId={resolvedTrainerId}
                            onOpenDetails={openDetails}
                            view={view}
                            onChangeView={setView}
                            refreshKey={refreshKey}
                            onSelectDate={handleSelectDate}
                          />
                        ),
                        month: (
                          <MonthlySchedule
                            key={`month-${refreshKey}`}
                            trainerId={resolvedTrainerId}
                            onOpenDetails={openDetails}
                            view={view}
                            onChangeView={setView}
                            refreshKey={refreshKey}
                            onSelectDate={handleSelectDate}
                          />
                        ),
                      }}
                    />
                  </Suspense>
                </ErrorBoundary>

                {/* RIGHT: details column */}
                <div className="self-stretch min-h-full">
                  <div className="lg:sticky lg:top-4 h-full flex flex-col">
                    <div ref={detailsRef} className="h-0" />
                    <AnimatePresence mode="wait">
                      {selected && (
                        <motion.div
                          key="details-panel"
                          initial={{
                            opacity: 0,
                            y: -8,
                            clipPath: "inset(0% 0% 100% 0% round 24px)",
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                            clipPath: "inset(0% 0% 0% 0% round 24px)",
                          }}
                          exit={{
                            opacity: 0,
                            y: -8,
                            clipPath: "inset(0% 0% 100% 0% round 24px)",
                          }}
                          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                          className="flex-1"
                        >
                          <BookingDetailsDock
                            booking={
                              typeof selected === "object" ? selected : null
                            }
                            bookingId={
                              typeof selected === "string" ? selected : null
                            }
                            trainerId={resolvedTrainerId}
                            onDone={() => setRefreshKey((k) => k + 1)}
                            onClose={closeDetails}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div ref={quickRef} />
                    <AnimatePresence>
                      {quickDate && (
                        <motion.div
                          key="quickbook"
                          initial={{
                            opacity: 0,
                            y: -8,
                            clipPath: "inset(0% 0% 100% 0% round 24px)",
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                            clipPath: "inset(0% 0% 0% 0% round 24px)",
                          }}
                          exit={{
                            opacity: 0,
                            y: -8,
                            clipPath: "inset(0% 0% 100% 0%  round 24px)",
                          }}
                          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                          className="mt-4 md:mt-6"
                        >
                          <Glass className="p-4 md:p-5">
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-white/90 font-medium">
                                Γρήγορη Κράτηση – {fmtDate(quickDate)}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setQuickDate(null)}
                                aria-label="Κλείσιμο"
                              >
                                <X className="h-4 w-4 text-white/85" />
                              </Button>
                            </div>

                            <TrainerQuickBook
                              trainerId={resolvedTrainerId}
                              sessionMinutes={sessionMinutes}
                              workStart={workStart}
                              workEnd={workEnd}
                              selectedDate={quickDate}
                              onCreated={handleCreated}
                            />
                          </Glass>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>
          </main>

          {/* FAB */}
          <button
            type="button"
            onClick={handleFab}
            className="
              fixed right-4 md:right-6 z-[70]
              bottom-24 sm:bottom-6
              h-14 w-14 rounded-full shadow-xl border border-white/15
              bg-white text-black hover:bg-zinc-200
              flex items-center justify-center
            "
            aria-label="Πρόσθεσε κράτηση"
            title="Πρόσθεσε κράτηση"
          >
            <PencilLine className="h-6 w-6" />
          </button>
        </div>
      </div>
    </>
  );
}
