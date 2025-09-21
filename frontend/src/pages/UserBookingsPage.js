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
  Loader2, Calendar, Users, Clock, AlertCircle, X,
  CalendarClock, CheckCircle, Ban, Wifi, User, Mail, MapPin,
  ChevronLeft, ChevronRight, Euro
} from "lucide-react";
import { useAuth } from "../AuthProvider";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";

/* lazy components */
const UserMenu = lazy(() => import("../components/UserMenu"));

/* ---------------- helpers: dates (LOCAL) ---------------- */
const pad2 = (n) => String(n).padStart(2, "0");
const toYMDLocal = (d) => {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
};
const hhmm = (t) => (typeof t === "string" ? (t.match(/^(\d{1,2}:\d{2})/)?.[1] ?? t) : t);
const timeToMinutes = (t) => { if (!t) return 0; const [h,m] = t.split(":").map((x) => parseInt(x,10)); return (h||0)*60 + (m||0) };
const fmtShortDay = (d) => d.toLocaleDateString("el-GR", { weekday: "short" });
const fmtLongDay  = (d) => d.toLocaleDateString("el-GR", { weekday: "long" });
const fmtDayNum   = (d) => d.toLocaleDateString("el-GR", { day: "2-digit" });
const fmtMonth    = (d) => d.toLocaleDateString("el-GR", { month: "long" });
const fmtMonthYear= (d) => d.toLocaleDateString("el-GR", { month: "long", year: "numeric" });
function startOfWeek(date, weekStartsOn = 1) { const d = new Date(date); const day = d.getDay() || 7; if (day !== weekStartsOn) d.setDate(d.getDate() - (day - weekStartsOn)); d.setHours(0,0,0,0); return d }
function startOfDay(date){ const d=new Date(date); d.setHours(0,0,0,0); return d }
function startOfMonth(date){ const d=new Date(date.getFullYear(), date.getMonth(), 1); d.setHours(0,0,0,0); return d }
const safeId = (b) => (b && (b.id ?? b.booking_id ?? b.uid ?? b.pk ?? null)) || null;
function toLocalDate(input) { if (!input) return null; const d = new Date(input); return isNaN(d.getTime()) ? null : d }
function combineDateTime(date, time) { if (!date) return null; const d = new Date(`${date}T${time ?? "00:00:00"}`); return isNaN(d.getTime()) ? null : d }
const fmtDate = (d) => {
  if (!d) return "—";
  const obj = typeof d === "string" ? new Date(`${d}T00:00:00`) : d;
  return obj.toLocaleDateString("el-GR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
};
const fmtTs   = (ts) => ts ? ts.toLocaleString("el-GR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

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

/* ---------- ColorCard ---------- */
const ColorCard = memo(({ color = "red", className = "", children }) => {
  const gradientMap = {
    red: "from-red-600 to-red-700",
    emerald: "from-emerald-600 to-emerald-700",
    zinc: "from-zinc-700 to-zinc-800",
  };
  const gradient = gradientMap[color] || gradientMap.zinc;
  return (
    <div className={`relative overflow-hidden rounded-3xl p-6 shadow-xl text-white bg-gradient-to-br ${gradient} ${className}`}>
      <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% -10%, white, transparent 40%)" }} />
      <div className="relative">{children}</div>
    </div>
  );
});

/* ---------- Spinner ---------- */
function Spinner({ full = false }) {
  if (full) {
    return (
      <div className="relative min-h-screen text-gray-100">
        <BaseBackground />
        <AthleticBackground />
        <div className="relative z-10 flex items-center justify-center h-screen">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .25, ease: [0.22,1,0.36,1] }} className="flex flex-col items-center gap-6 p-8 rounded-3xl bg-[rgba(17,18,21,.65)] backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_10px_30px_rgba(0,0,0,.45)]">
            <Loader2 className="h-12 w-12 animate-spin text-blue-200" />
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-white">Φόρτωση κρατήσεων</h3>
              <p className="text-white/70">Προετοιμασία των δεδομένων...</p>
            </div>
          </motion.div>
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
  constructor(props){ super(props); this.state = { hasError:false, error:null } }
  static getDerivedStateFromError(error){ return { hasError:true, error } }
  componentDidCatch(error, info){ console.error("Calendar crashed:", error, info) }
  render(){
    if(this.state.hasError){
      return (
        <ColorCard color="red" className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 mt-0.5" />
            <div>
              <p className="font-semibold">Κάτι πήγε στραβά στη λίστα κρατήσεων.</p>
              <button
                onClick={() => this.setState({ hasError:false, error:null })}
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
    { k: "day",   label: "Ημερήσιο" },
    { k: "week",  label: "Εβδομαδιαίο" },
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
              transition={{ duration: .18 }}
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
function Button({ children, variant="secondary", size="md", className="", ...props }) {
  const base = "inline-flex items-center justify-center rounded-xl font-medium transition focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-60 disabled:cursor-not-allowed";
  const sizes = { sm: "h-9 px-3 text-sm", md: "h-10 px-4 text-sm" };
  const variants = {
    primary: "bg-emerald-600/90 hover:bg-emerald-600 text-white border border-emerald-400/20 shadow-[0_6px_18px_rgba(16,185,129,.25)]",
    secondary: "bg-white/6 hover:bg-white/10 text-white border border-white/10",
    danger: "bg-rose-600/90 hover:bg-rose-600 text-white border border-rose-400/20 shadow-[0_6px_18px_rgba(244,63,94,.25)]",
    ghost: "bg-transparent hover:bg-white/5 text-white border border-white/10",
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

/* ---------- Booking pill (USER VIEW: shows trainer & status) ---------- */
function BookingPill({ b, onOpen, compact = false }) {
  const status = (b.status || "pending").toLowerCase();
  const ring =
    status === "accepted" ? "ring-emerald-400/35" :
    status === "declined" || status === "cancelled" ? "ring-rose-400/35" :
    "ring-amber-400/35";
  const tint =
    status === "accepted" ? "bg-emerald-500/10" :
    status === "declined" || status === "cancelled" ? "bg-rose-500/10" :
    "bg-amber-500/10";

  const minutes =
    (timeToMinutes(b.end_time) - timeToMinutes(b.start_time)) || b.duration_min;
  const durationStr = minutes ? `${minutes}’` : null;
  const price = b.amount ?? b.price_eur ?? b.total_price ?? b.price;

  const pad = compact ? "px-2 py-1.5" : "px-3 py-2.5";
  const timeCls = compact ? "text-[12px] text-white/70" : "text-xs text-white/70";
  const nameCls = compact ? "text-[12px]" : "text-sm";
  const endCls  = "text-[11px] text-white/60";
  const onlineCls = compact ? "text-[9px] px-1" : "text-[10px] px-1.5";

  return (
    <button onClick={(e) => { e.stopPropagation(); onOpen?.(b) }} className="w-full text-left">
      <GlassTile className={`${pad} ring-1 ${ring} ${tint}`}>
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
            {b.trainer_name || b.trainer?.full_name || "Προπονητής"}
          </span>
          {b.is_online && (
            <span className={`${onlineCls} py-0.5 rounded bg-blue-400/15 text-blue-200`}>Online</span>
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

<<<<<<< HEAD
/* ======================= DAY VIEW (USER) – mobile friendly ======================= */
=======
/* ======================= DAY VIEW (USER) ======================= */
>>>>>>> 6504192de63054a547a6cc75a9a143b5e97ef6f9
function DaySchedule({ userId, onOpenDetails, view, onChangeView, refreshKey }) {
  const [day, setDay] = useState(startOfDay(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
<<<<<<< HEAD
  const [showAll, setShowAll] = useState(false);

  const isMobile = useIsMobile(640);
  const maxItems = isMobile ? 6 : 12; // πόσα pills να φανούν πριν το “+N ακόμα”
=======
>>>>>>> 6504192de63054a547a6cc75a9a143b5e97ef6f9
  const dayStr = useMemo(() => toYMDLocal(day), [day]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!userId) return;
      setLoading(true); setError(null);
      try {
        const { data, error } = await supabase
          .from("trainer_bookings")
          .select("id,date,start_time,end_time,duration_min,status,is_online,trainer_name,created_at,amount,trainer:profiles!trainer_bookings_trainer_id_fkey ( full_name, avatar_url )")
          .eq("user_id", userId)
          .eq("date", dayStr);
        if (error) throw error;
        const list = (data ?? []).map(r => ({ ...r, trainer: r.trainer?.[0] || r.trainer }));
        const sorted = list.sort((a,b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
        if (!alive) return;
        setRows(sorted); setLoading(false);
      } catch (e) {
        if (!alive) return;
        setError(e.message || "Σφάλμα φόρτωσης κρατήσεων"); setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userId, dayStr, refreshKey]);

  const goPrev = () => setDay((d) => { const n = new Date(d); n.setDate(n.getDate() - 1); return startOfDay(n) });
  const goNext = () => setDay((d) => { const n = new Date(d); n.setDate(n.getDate() + 1); return startOfDay(n) });
<<<<<<< HEAD
  const isToday = toYMDLocal(new Date()) === dayStr;

  // items προς εμφάνιση (με “εμφάνιση περισσότερων” σε mobile)
  const visibleRows = showAll ? rows : rows.slice(0, maxItems);
  const hiddenCount = Math.max(0, rows.length - visibleRows.length);

  return (
    <Glass className="p-4 sm:p-6">
      {/* Sticky subheader για καλύτερη πλοήγηση στο mobile */}
      <div className="sticky -top-2 sm:top-0 z-10 -mx-4 sm:mx-0 px-4 sm:px-0 pb-2 bg-black/30 backdrop-blur rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={goPrev}
              className="p-2 rounded-xl bg-white/6 hover:bg-white/10 border border-white/10"
              aria-label="Προηγούμενη μέρα"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goNext}
              className="p-2 rounded-xl bg-white/6 hover:bg-white/10 border border-white/10"
              aria-label="Επόμενη μέρα"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <p className="ml-1 sm:ml-2 text-white/90">
              {fmtLongDay(day)} {fmtDayNum(day)} {fmtMonth(day)}
              {isToday && <span className="ml-2 inline-flex items-center gap-1 text-emerald-300 text-xs"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Σήμερα</span>}
            </p>
          </div>
          <div className="hidden md:block">
            <ViewSwitch value={view} onChange={onChangeView} />
          </div>
        </div>
        <div className="md:hidden mt-2 flex justify-center">
          <ViewSwitch value={view} onChange={onChangeView} />
        </div>
      </div>

      {/* Περιεχόμενο ημέρας */}
      <div className="mt-2">
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
            {[...Array(6)].map((_,i)=>
              <div key={i} className="h-16 sm:h-20 rounded-2xl bg-white/[.06] animate-pulse border border-white/10" />
            )}
          </div>
        ) : error ? (
          <div className="text-sm text-red-300 bg-red-900/20 rounded-xl p-3">{error}</div>
        ) : rows.length === 0 ? (
          <div className="text-xs sm:text-sm text-white/70 px-3 py-8 text-center border border-dashed border-white/12 rounded-2xl">
            Καμία κράτηση για σήμερα
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
              {visibleRows.map((b)=> (
                <BookingPill key={b.id} b={b} onOpen={onOpenDetails} compact={isMobile} />
              ))}
            </div>
            {hiddenCount > 0 && (
              <div className="mt-3 flex justify-center">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setShowAll(true)}
                  className="px-4"
                >
                  +{hiddenCount} ακόμα
                </Button>
              </div>
            )}
          </>
=======

  return (
    <Glass className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={goPrev} className="p-2 rounded-xl bg-white/6 hover:bg-white/10 border border-white/10"><ChevronLeft className="h-5 w-5" /></button>
          <button onClick={goNext} className="p-2 rounded-xl bg-white/6 hover:bg-white/10 border border-white/10"><ChevronRight className="h-5 w-5" /></button>
          <p className="ml-1 sm:ml-2 text-white/90">{fmtLongDay(day)} {fmtDayNum(day)} {fmtMonth(day)}</p>
        </div>
        <div className="hidden md:block">
          <ViewSwitch value={view} onChange={onChangeView} />
        </div>
      </div>
      <div className="md:hidden mb-3 flex justify-center">
        <ViewSwitch value={view} onChange={onChangeView} />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {loading ? (
          [...Array(6)].map((_,i)=><div key={i} className="h-20 rounded-2xl bg-white/[.06] animate-pulse border border-white/10" />)
        ) : error ? (
          <div className="text-sm text-red-300 bg-red-900/20 rounded-xl p-3">{error}</div>
        ) : rows.length === 0 ? (
          <div className="text-xs text-white/60 px-2 py-6 text-center border border-dashed border-white/12 rounded-2xl col-span-full">
            Καμία κράτηση για σήμερα
          </div>
        ) : (
          rows.map((b)=> <BookingPill key={b.id} b={b} onOpen={onOpenDetails} />)
>>>>>>> 6504192de63054a547a6cc75a9a143b5e97ef6f9
        )}
      </div>
    </Glass>
  );
}

<<<<<<< HEAD
/* ======================= WEEK VIEW (USER) – mobile friendly ======================= */
=======
/* ======================= WEEK VIEW (USER) ======================= */
>>>>>>> 6504192de63054a547a6cc75a9a143b5e97ef6f9
function WeeklyScheduleGrid({ userId, onOpenDetails, view, onChangeView, refreshKey }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), 1));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

<<<<<<< HEAD
  const isMobile = useIsMobile(640);
  const isTablet = useIsMobile(768);
  const maxPills = isMobile ? 2 : 3;

=======
>>>>>>> 6504192de63054a547a6cc75a9a143b5e97ef6f9
  const days = useMemo(() => {
    const arr = []; for (let i = 0; i < 7; i++) { const d = new Date(weekStart); d.setDate(d.getDate() + i); arr.push(d) }
    return arr;
  }, [weekStart]);

  const dateStr = (d) => toYMDLocal(d);
<<<<<<< HEAD
  const todayStr = toYMDLocal(startOfDay(new Date()));
=======
>>>>>>> 6504192de63054a547a6cc75a9a143b5e97ef6f9

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!userId) return;
      setLoading(true); setError(null);
      try {
        const start = dateStr(weekStart);
        const endDate = new Date(weekStart); endDate.setDate(endDate.getDate() + 6);
        const end = dateStr(endDate);

        const { data, error } = await supabase
          .from("trainer_bookings")
          .select("id,date,start_time,end_time,duration_min,status,is_online,trainer_name,created_at,amount,trainer:profiles!trainer_bookings_trainer_id_fkey ( full_name, avatar_url )")
          .eq("user_id", userId)
          .gte("date", start)
          .lte("date", end);

        if (error) throw error;
        const list = (data ?? []).map(r => ({ ...r, trainer: r.trainer?.[0] || r.trainer }));
        const sorted = list.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
        if (!alive) return;
        setRows(sorted); setLoading(false);
      } catch (e) {
        if (!alive) return;
        setError(e.message || "Σφάλμα φόρτωσης κρατήσεων"); setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [userId, weekStart, refreshKey]);

  const grouped = useMemo(() => {
    const map = new Map();
    days.forEach((d) => map.set(dateStr(d), []));
    rows.forEach((r) => { const key = r.date; if (!map.has(key)) map.set(key, []); map.get(key).push(r) });
    return map;
  }, [rows, days]);

  const goPrev = () => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return startOfWeek(n, 1) });
  const goNext = () => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return startOfWeek(n, 1) });

  const end = new Date(weekStart); end.setDate(end.getDate() + 6);
  const label = weekStart.getMonth() === end.getMonth()
    ? `${weekStart.getDate()}–${end.getDate()} ${fmtMonth(weekStart)}`
    : `${weekStart.getDate()} ${fmtMonth(weekStart)} – ${end.getDate()} ${fmtMonth(end)}`;

<<<<<<< HEAD
  // κρατάμε 7 στήλες με οριζόντιο scroll σε μικρές οθόνες
  const gridMinWidth = isTablet ? "min-w-[770px]" : "min-w-[770px]";

=======
>>>>>>> 6504192de63054a547a6cc75a9a143b5e97ef6f9
  return (
    <Glass className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={goPrev} className="p-2 rounded-xl bg-white/6 hover:bg-white/10 border border-white/10"><ChevronLeft className="h-5 w-5" /></button>
          <button onClick={goNext} className="p-2 rounded-xl bg-white/6 hover:bg-white/10 border border-white/10"><ChevronRight className="h-5 w-5" /></button>
          <p className="ml-1 sm:ml-2 text-white/90">{label}</p>
        </div>
        <div className="hidden md:block">
          <ViewSwitch value={view} onChange={onChangeView} />
        </div>
      </div>
      <div className="md:hidden mb-3 flex justify-center">
        <ViewSwitch value={view} onChange={onChangeView} />
      </div>

<<<<<<< HEAD
      {/* Scroll container so 7 columns remain readable on mobile */}
      <div className="-mx-2 sm:mx-0 overflow-x-auto">
        <div className={`px-2 sm:px-0 ${gridMinWidth}`}>
          <div className="grid grid-cols-7 gap-3 sm:gap-4">
            {days.map((d, i) => {
              const key = dateStr(d);
              const dayRows = grouped.get(key) || [];
              const isToday = key === todayStr;

              return (
                <div
                  key={key}
                  className="rounded-3xl p-2 sm:p-3 border border-white/10 bg-[rgba(17,18,21,.55)] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_6px_24px_rgba(0,0,0,.4)]"
                >
                  {/* Column header (weekday + day num) */}
                  <GlassTile className={`px-2.5 sm:px-3 py-1.5 sm:py-2 mb-2 sm:mb-3 ${isToday ? "ring-1 ring-emerald-400/40" : ""}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className={`text-[11px] sm:text-sm ${isToday ? "text-white font-medium" : "text-white/85"}`}>
                          {fmtShortDay(d)}
                        </div>
                        {isToday && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />}
                      </div>
                      <div className={`text-[11px] sm:text-sm font-semibold ${isToday ? "text-white" : "text-white"}`}>
                        {fmtDayNum(d)}
                      </div>
                    </div>
                  </GlassTile>

                  {/* Column body */}
                  <div className="space-y-1.5 sm:space-y-2">
                    {loading ? (
                      [...Array(3)].map((_, idx) => (
                        <div key={idx} className="h-14 sm:h-16 rounded-2xl bg-white/[.06] animate-pulse border border-white/10" />
                      ))
                    ) : error ? (
                      <div className="text-sm text-red-300 bg-red-900/20 rounded-xl p-2">{error}</div>
                    ) : dayRows.length === 0 ? (
                      <div className="text-[10px] sm:text-xs text-white/40 px-2 py-6 text-center border border-dashed border-white/12 rounded-2xl">
                        Καμία κράτηση
                      </div>
                    ) : (
                      <>
                        {dayRows.slice(0, maxPills).map((b) => (
                          <BookingPill key={b.id} b={b} onOpen={onOpenDetails} compact={isMobile} />
                        ))}
                        {dayRows.length > maxPills && (
                          <button
                            onClick={() => onOpenDetails(dayRows[0])}
                            className="text-[10px] sm:text-xs text-white/70 hover:text-white/90 underline underline-offset-2"
                          >
                            +{dayRows.length - maxPills} ακόμα
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
=======
      <div className="overflow-x-auto">
        <div className="min-w-[1000px] grid grid-cols-7 gap-3 sm:gap-4">
          {days.map((d) => {
            const key = dateStr(d);
            const dayRows = grouped.get(key) || [];
            return (
              <div
                key={key}
                className="rounded-3xl p-3 border border-white/10 bg-[rgba(17,18,21,.55)] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_6px_24px_rgba(0,0,0,.4)]"
              >
                <GlassTile className="px-3 py-2 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-white/85">{fmtShortDay(d)}</div>
                    <div className="text-sm font-semibold text-white">{fmtDayNum(d)}</div>
                  </div>
                </GlassTile>

                <div className="space-y-3">
                  {loading ? (
                    [...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-2xl bg-white/[.06] animate-pulse border border-white/10" />)
                  ) : error ? (
                    <div className="text-sm text-red-300 bg-red-900/20 rounded-xl p-3">{error}</div>
                  ) : dayRows.length === 0 ? (
                    <div className="text-xs text-white/40 px-2 py-6 text-center border border-dashed border-white/12 rounded-2xl">Καμία κράτηση</div>
                  ) : (
                    dayRows.map((b) => <BookingPill key={b.id} b={b} onOpen={onOpenDetails} />)
                  )}
                </div>
              </div>
            );
          })}
>>>>>>> 6504192de63054a547a6cc75a9a143b5e97ef6f9
        </div>
      </div>
    </Glass>
  );
}

<<<<<<< HEAD

=======
>>>>>>> 6504192de63054a547a6cc75a9a143b5e97ef6f9
/* ======================= MONTH VIEW (USER) ======================= */
function MonthlySchedule({ userId, onOpenDetails, view, onChangeView, refreshKey }) {
  const [anchor, setAnchor] = useState(startOfMonth(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
<<<<<<< HEAD

  // breakpoints
  const isMobile = useIsMobile(640);
  const isTablet = useIsMobile(768);
  const maxPills = isMobile ? 2 : 3;

  // grid dates
=======
  const isMobile = useIsMobile(640);
  const maxPills = isMobile ? 2 : 3;

>>>>>>> 6504192de63054a547a6cc75a9a143b5e97ef6f9
  const gridStart = useMemo(() => startOfWeek(startOfMonth(anchor), 1), [anchor]);
  const gridDays = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 42; i++) { const d = new Date(gridStart); d.setDate(d.getDate() + i); arr.push(d) }
    return arr;
  }, [gridStart]);
  const startStr = toYMDLocal(gridStart);
  const endStr = useMemo(() => { const e = new Date(gridStart); e.setDate(e.getDate()+41); return toYMDLocal(e) }, [gridStart]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!userId) return;
      setLoading(true); setError(null);
      try {
        const { data, error } = await supabase
          .from("trainer_bookings")
          .select("id,date,start_time,end_time,duration_min,status,is_online,trainer_name,created_at,amount,trainer:profiles!trainer_bookings_trainer_id_fkey ( full_name, avatar_url )")
          .eq("user_id", userId)
          .gte("date", startStr)
          .lte("date", endStr);
        if (error) throw error;
        const list = (data ?? []).map(r => ({ ...r, trainer: r.trainer?.[0] || r.trainer }));
        if (!alive) return;
        setRows(list); setLoading(false);
      } catch (e) {
        if (!alive) return;
        setError(e.message || "Σφάλμα φόρτωσης κρατήσεων"); setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userId, startStr, endStr, refreshKey]);

  const byDate = useMemo(() => {
    const m = new Map();
    rows.forEach(r => { if (!m.has(r.date)) m.set(r.date, []); m.get(r.date).push(r) });
    m.forEach(list => list.sort((a,b)=>timeToMinutes(a.start_time)-timeToMinutes(b.start_time)));
    return m;
  }, [rows]);

  const goPrev = () => setAnchor((d)=> new Date(d.getFullYear(), d.getMonth()-1, 1));
  const goNext = () => setAnchor((d)=> new Date(d.getFullYear(), d.getMonth()+1, 1));
  const weekdays = ["Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ", "Κυρ"];

<<<<<<< HEAD
  // today helper
  const todayStr = toYMDLocal(startOfDay(new Date()));

  // min width so 7 στήλες να μην «σπάνε» σε κινητό – γίνεται οριζόντιο scroll
  // 7 columns × ~110px ανά κελί σε κινητό
  const gridMinWidth = isTablet ? "min-w-[770px]" : "min-w-[770px]";

=======
>>>>>>> 6504192de63054a547a6cc75a9a143b5e97ef6f9
  return (
    <Glass className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex items-center gap-2 sm:gap-3">
<<<<<<< HEAD
          <button onClick={goPrev} className="p-2 rounded-xl bg-white/6 hover:bg-white/10 border border-white/10">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={goNext} className="p-2 rounded-xl bg-white/6 hover:bg-white/10 border border-white/10">
            <ChevronRight className="h-5 w-5" />
          </button>
=======
          <button onClick={goPrev} className="p-2 rounded-xl bg-white/6 hover:bg-white/10 border border-white/10"><ChevronLeft className="h-5 w-5" /></button>
          <button onClick={goNext} className="p-2 rounded-xl bg-white/6 hover:bg-white/10 border border-white/10"><ChevronRight className="h-5 w-5" /></button>
>>>>>>> 6504192de63054a547a6cc75a9a143b5e97ef6f9
          <p className="ml-1 sm:ml-2 text-white/90">{fmtMonthYear(anchor)}</p>
        </div>
        <div className="hidden md:block">
          <ViewSwitch value={view} onChange={onChangeView} />
        </div>
      </div>
      <div className="md:hidden mb-3 flex justify-center">
        <ViewSwitch value={view} onChange={onChangeView} />
      </div>

<<<<<<< HEAD
      {/* Scroll container for mobile so 7-cols calendar remains readable */}
      <div className="-mx-2 sm:mx-0 overflow-x-auto">
        <div className={`px-2 sm:px-0 ${gridMinWidth}`}>
          {/* Weekday headers (sticky for better context while scrolling) */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 sticky top-0 z-10 bg-black/40 backdrop-blur supports-[backdrop-filter]:backdrop-blur-xl rounded-xl sm:rounded-2xl p-1">
            {weekdays.map((w) => (
              <div
                key={w}
                className="text-center text-[10px] sm:text-xs text-white/60 py-1"
              >
                {w}
              </div>
            ))}
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {gridDays.map((d, idx) => {
              const inMonth = d.getMonth() === anchor.getMonth();
              const key = toYMDLocal(d);
              const dayRows = byDate.get(key) || [];
              const isToday = key === todayStr;

              return (
                <div
                  key={idx}
                  className={[
                    "rounded-xl sm:rounded-2xl border border-white/10",
                    // tighter padding/heights on mobile
                    "p-1.5 sm:p-2",
                    isMobile ? "min-h-[92px]" : "min-h-[110px]",
                    inMonth ? "bg-[rgba(17,18,21,.55)]" : "bg-[rgba(17,18,21,.35)] opacity-70",
                    "backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_6px_24px_rgba(0,0,0,.4)]",
                    "transition-colors"
                  ].join(" ")}
                  aria-label={`Ημέρα ${fmtDayNum(d)} ${fmtMonth(d)}${isToday ? " (Σήμερα)" : ""}`}
                >
                  {/* Header line: day number + today dot */}
                  <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] sm:text-[11px] ${inMonth ? "text-white/80" : "text-white/40"} ${isToday ? "font-semibold text-white" : ""}`}
                      >
                        {fmtDayNum(d)}
                      </span>
                      {isToday && (
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                      )}
                    </div>
                    {loading && idx < 7 ? <span className="text-[9px] sm:text-[10px] text-white/30">…</span> : null}
                  </div>

                  {/* Body */}
                  {loading ? (
                    <div className="h-12 sm:h-16 rounded-lg sm:rounded-xl bg-white/[.06] animate-pulse border border-white/10" />
                  ) : error ? (
                    <div className="text-[10px] sm:text-[11px] text-red-300 bg-red-900/20 rounded p-1.5">Σφάλμα</div>
                  ) : dayRows.length === 0 ? (
                    <div className="text-[9px] sm:text-[10px] text-white/60 select-none">—</div>
                  ) : (
                    <div className="space-y-1">
                      {dayRows.slice(0, maxPills).map((b)=>(
                        <BookingPill key={b.id} b={b} onOpen={onOpenDetails} compact />
                      ))}
                      {dayRows.length > maxPills && (
                        <button
                          onClick={() => onOpenDetails(dayRows[0])}
                          className="text-[9px] sm:text-[10px] text-white/70 hover:text-white/90 underline underline-offset-2"
                        >
                          +{dayRows.length - maxPills} ακόμα
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
=======
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
        {weekdays.map((w) => (
          <div key={w} className="text-center text-[10px] sm:text-xs text-white/60">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {gridDays.map((d, idx) => {
          const inMonth = d.getMonth() === anchor.getMonth();
          const key = toYMDLocal(d);
          const dayRows = byDate.get(key) || [];
          return (
            <div
              key={idx}
              className={`rounded-xl sm:rounded-2xl border border-white/10 p-1.5 sm:p-2 min-h-[84px] sm:min-h-[110px] ${inMonth ? "bg-[rgba(17,18,21,.55)]" : "bg-[rgba(17,18,21,.35)] opacity-70"} backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_6px_24px_rgba(0,0,0,.4)]`}
            >
              <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                <span className={`text-[10px] sm:text-[11px] ${inMonth ? "text-white/80" : "text-white/40"}`}>{fmtDayNum(d)}</span>
                {loading && idx < 7 ? <span className="text-[9px] sm:text-[10px] text-white/30">…</span> : null}
              </div>

              {loading ? (
                <div className="h-12 sm:h-16 rounded-lg sm:rounded-xl bg-white/[.06] animate-pulse border border-white/10" />
              ) : error ? (
                <div className="text-[10px] sm:text-[11px] text-red-300 bg-red-900/20 rounded p-1.5">Σφάλμα</div>
              ) : dayRows.length === 0 ? (
                <div className="text-[9px] sm:text-[10px] text-white/60">—</div>
              ) : (
                <div className="space-y-1">
                  {dayRows.slice(0, maxPills).map((b)=>(
                    <BookingPill key={b.id} b={b} onOpen={onOpenDetails} compact />
                  ))}
                  {dayRows.length > maxPills && (
                    <div className="text-[9px] sm:text-[10px] text-white/50">+{dayRows.length - maxPills} ακόμα</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
>>>>>>> 6504192de63054a547a6cc75a9a143b5e97ef6f9
      </div>
    </Glass>
  );
}

/* ======================= DETAILS DOCK (USER) ======================= */
function BookingDetailsDock({ booking, bookingId, userId, onClose }) {
  const id = useMemo(() => (bookingId ? bookingId : safeId(booking)), [booking, bookingId]);
  const [full, setFull] = useState(() => (booking && id ? booking : null));
  const [loading, setLoading] = useState(!booking);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!id) return;

    const hasEverything =
      booking && booking.date && booking.start_time && (booking.trainer_name || booking.trainer?.full_name);
    if (hasEverything) { setFull(booking); setLoading(false); return }

    (async () => {
      setLoading(true); setErr(null);
      const { data, error } = await supabase
        .from("trainer_bookings")
        .select(`
          id, trainer_id, user_id, date, start_time, end_time, duration_min,
          note, status, created_at, updated_at, is_online,
          user_name, user_email, trainer_name, amount, currency_code,
          trainer:profiles!trainer_bookings_trainer_id_fkey ( id, full_name, email, avatar_url )
        `)
        .eq("id", id)
        .single();

      if (!alive) return;
      if (error) { setErr(error.message || "Σφάλμα ανάγνωσης κράτησης"); setLoading(false); return }

      const normalized = {
        ...data,
        trainer: data.trainer?.[0] || data.trainer || null,
      };
      setFull(normalized); setLoading(false);
    })();

    return () => { alive = false; };
  }, [id, booking]);

  const status = useMemo(() => {
    const raw = (full?.status || "pending").toString().toLowerCase();
    if (raw === "confirmed" || raw === "approve" || raw === "approved" || raw === "accept") return "accepted";
    if (raw === "reject") return "declined";
    return raw;
  }, [full?.status]);

  const statusTone = {
    pending: "bg-amber-500/20 text-amber-300",
    accepted: "bg-emerald-600/20 text-emerald-300",
    declined: "bg-rose-600/20 text-rose-300",
    cancelled: "bg-rose-600/20 text-rose-300",
  }[status];
  const statusLabel = { pending: "Σε αναμονή", accepted: "Αποδεκτή", declined: "Απορρίφθηκε", cancelled: "Ακυρώθηκε" }[status];

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

      {!id ? null : loading ?  (
        <div className="animate-pulse space-y-3">
          <div className="h-7 w-40 bg-white/[.08] rounded border border-white/10" />
          <div className="h-32 bg-white/[.06] rounded-xl border border-white/10" />
          <div className="h-6 bg-white/[.06] rounded border border-white/10" />
          <div className="h-6 bg-white/[.06] rounded border border-white/10" />
        </div>
      ) : err ? (
        <div className="text-sm text-red-300 bg-red-900/30 rounded-xl p-3">{err}</div>
      ) : (
        <>
          <div className="flex items-center gap-4 mb-6">
            {full?.trainer?.avatar_url ? (
              <img src={full.trainer.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-full bg-gray-700">
                <CalendarClock className="h-7 w-7 text-gray-500" />
              </div>
            )}
            <div>
              <div className="text-xl font-medium text-white">{full?.trainer_name || full?.trainer?.full_name || "Προπονητής"}</div>
              <span className={`inline-flex mt-2 px-2.5 py-0.5 rounded-lg text-xs ${statusTone}`}>{statusLabel}</span>
            </div>
          </div>

          <ul className="space-y-3 text-gray-300">
            <Li icon={CalendarClock} label="Ημερομηνία" value={fmtDate(full?.date)} />
            <Li icon={Clock} label="Ώρες" value={`${hhmm(full?.start_time)} – ${hhmm(full?.end_time)}`} />
            <Li icon={Clock} label="Διάρκεια" value={`${full?.duration_min ?? 0} λεπτά`} />
            <Li icon={Wifi} label="Τύπος" value={full?.is_online ? "Online συνεδρία" : "Δια ζώσης"} />
            {!!full?.note && <Li icon={MapPin} label="Σημείωση" value={full.note} />}
            <div className="h-px bg-white/10 my-2" />
            <Li icon={User} label="Προπονητής" value={full?.trainer_name || full?.trainer?.full_name || "—"} />
            {!!full?.trainer?.email && <Li icon={Mail} label="Email προπονητή" value={full?.trainer?.email} /> }
            <div className="h-px bg-white/10 my-2" />
            <Li icon={CalendarClock} label="Υποβλήθηκε" value={fmtTs(toLocalDate(full?.created_at) ?? combineDateTime(full?.date, full?.start_time))} />
            {!!full?.updated_at && <Li icon={CheckCircle} label="Τελευταία ενημέρωση" value={fmtTs(toLocalDate(full.updated_at))} />}
          </ul>
        </>
      )}
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

  useEffect(() => {
    setMounted((s) => new Set(s).add(view));
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
            transition={{ duration: .22, ease: [0.22, 1, 0.36, 1] }}
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

/* ================================ PAGE (USER) ================================ */
export default function UserBookingsPage() {
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
  const [refreshKey] = useState(0);

  useEffect(() => {
    const getAuthUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setAuthUserId(user?.id ?? null);
    };
    getAuthUser();
  }, []);

  const userId = useMemo(() => profile?.id || authUserId || null, [profile?.id, authUserId]);

  const openDetails  = (bookingOrId) => setSelected(bookingOrId);
  const closeDetails = () => setSelected(null);

  if (loading) return <Spinner full />;

  if (!profile || profile.role !== "user") {
    return (
      <div className="relative min-h-screen text-gray-100">
        <BaseBackground />
        <AthleticBackground />
        <div className="relative z-10 flex items-center justify-center h-screen">
          <ColorCard color="red" className="text-center p-8 max-w-md">
            <div className="p-4 rounded-full bg-white/15 w-fit mx-auto mb-4">
              <Users className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Μη εξουσιοδοτημένη πρόσβαση</h2>
            <p className="text-white/80">Η σελίδα αυτή είναι μόνο για χρήστες.</p>
          </ColorCard>
        </div>
      </div>
    );
  }

  if (!userId) return <Spinner full />;

  const easing = [0.22, 1, 0.36, 1];

  return (
    <>
      <title>Οι Κρατήσεις μου • TrainerHub</title>

      <div className="relative min-h-screen text-gray-100">
        <BaseBackground />
        <AthleticBackground />

        <div className="min-h-screen overflow-x-hidden pt-0 md:pt-4 lg:pt-0 lg:pl-[var(--side-w)] relative z-10">
          <Suspense fallback={<></>}><UserMenu /></Suspense>

          {/* Header */}
          <motion.div className="mx-4 mt-2 md:mt-6" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25, ease: easing }}>
            <div className="relative p-4 md:p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-white/8 border border-white/10">
                  <Calendar className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                    Οι Κρατήσεις μου
                  </h1>
                  <p className="text-white/70 mt-1">Δες αν οι κρατήσεις σου έχουν γίνει αποδεκτές</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Calendar + details dock */}
          <main className="mx-auto w-full max-w-none px-4 pb-28 md:pb-16">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .28, ease: easing }}>
              <div className="grid grid-cols-1 lg:grid-cols-[1fr,420px] gap-4 md:gap-6 items-stretch">
                {/* LEFT: calendar with direction-aware slide */}
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
                          />
                        ),
                      }}
                    />
                  </Suspense>
                </ErrorBoundary>

                {/* RIGHT: details column */}
                <div className="self-stretch min-h-full">
                  <div className="lg:sticky lg:top-4 h-full flex flex-col">
                    <AnimatePresence mode="wait">
                      {selected && (
                        <motion.div
                          key="details-panel"
                          initial={{ opacity: 0, y: -8, clipPath: "inset(0% 0% 100% 0% round 24px)" }}
                          animate={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0% round 24px)" }}
                          exit={{ opacity: 0, y: -8, clipPath: "inset(0% 0% 100% 0% round 24px)" }}
                          transition={{ duration: .28, ease: [0.22, 1, 0.36, 1] }}
                          className="flex-1"
                        >
                          <BookingDetailsDock
                            booking={typeof selected === "object" ? selected : null}
                            bookingId={typeof selected === "string" ? selected : null}
                            userId={userId}
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
