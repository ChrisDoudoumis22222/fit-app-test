"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, PencilLine } from "lucide-react";
import { supabase } from "../../supabaseClient";

/* ---------------- helpers ---------------- */
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

const fmtDayNum = (d) => d.toLocaleDateString("el-GR", { day: "2-digit" });

const fmtMonthYear = (d) =>
  d.toLocaleDateString("el-GR", { month: "long", year: "numeric" });

const fmtWeekdayLong = (d) =>
  d.toLocaleDateString("el-GR", { weekday: "long" });

function startOfWeek(date, weekStartsOn = 1) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  if (day !== weekStartsOn) d.setDate(d.getDate() - (day - weekStartsOn));
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfMonth(date) {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  d.setHours(0, 0, 0, 0);
  return d;
}

function withTimeout(promise, ms = 12000, msg = "Timeout") {
  let t;
  const timeout = new Promise((_, rej) =>
    (t = setTimeout(() => rej(new Error(msg)), ms))
  );
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

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

function isToday(date) {
  return toYMDLocal(date) === toYMDLocal(new Date());
}

function statusLabel(status) {
  const s = (status || "pending").toLowerCase();

  if (s === "accepted") return "ΑΠΟΔΕΚΤΗ";
  if (s === "declined") return "ΑΠΟΡΡΙΦΘΗΚΕ";
  if (s === "cancelled") return "ΑΚΥΡΩΘΗΚΕ";
  return "ΣΕ ΑΝΑΜΟΝΗ";
}

/* ---------------- ui ---------------- */
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
          p-0 bg-transparent border-0 shadow-none rounded-none

          sm:inline-flex sm:w-auto
          sm:gap-1 sm:p-1
          sm:rounded-full
          sm:border sm:border-white/10
          sm:bg-white/[.06]
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
                min-w-0
                h-11 sm:h-9
                px-2.5 sm:px-4
                rounded-xl sm:rounded-full
                text-[12px] sm:text-sm
                font-semibold
                tracking-[-0.01em]
                ${
                  active
                    ? "text-white bg-white/[.12] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,.16),0_6px_18px_rgba(0,0,0,.22)]"
                    : "text-white/50 border border-transparent bg-transparent hover:text-white/80"
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

function Glass({ className = "", children }) {
  return (
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
  );
}

function GlassTile({ className = "", children }) {
  return (
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
}

function TodayDot({ className = "" }) {
  return (
    <span
      className={[
        "inline-block h-2.5 w-2.5 rounded-full bg-emerald-400",
        "shadow-[0_0_0_3px_rgba(16,185,129,.12),0_0_12px_rgba(16,185,129,.45)]",
        className,
      ].join(" ")}
    />
  );
}

function BookingPill({ b, onOpen, compact = false }) {
  const status = (b.status || "pending").toLowerCase();

  const ring =
    status === "accepted"
      ? "ring-emerald-400/40"
      : status === "declined" || status === "cancelled"
      ? "ring-red-400/40"
      : "ring-yellow-400/40";

  const tint =
    status === "accepted"
      ? "bg-gradient-to-br from-emerald-500/25 to-emerald-500/10"
      : status === "declined" || status === "cancelled"
      ? "bg-gradient-to-br from-red-500/25 to-red-500/10"
      : "bg-gradient-to-br from-yellow-500/25 to-yellow-500/10";

  const minutes =
    timeToMinutes(b.end_time) - timeToMinutes(b.start_time) || b.duration_min;
  const durationStr = minutes ? `${minutes}` : null;

  const pad = compact ? "px-3 py-2.5" : "px-3.5 py-3";
  const timeCls = compact
    ? "text-[11px] text-white/72"
    : "text-[12px] text-white/72";
  const nameCls = compact ? "text-[12px]" : "text-[13px]";
  const metaCls = compact
    ? "text-[10px] text-white/60"
    : "text-[11px] text-white/60";
  const onlineCls = compact ? "text-[9px] px-1.5" : "text-[10px] px-2";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen?.(b);
      }}
      className="w-full text-left"
    >
      <GlassTile className={`${pad} ring-1 ${ring} ${tint}`}>
        <div className="flex items-center justify-between gap-2">
          <span className={`${timeCls} font-medium`}>
            {hhmm(b.start_time)} - {hhmm(b.end_time)}
          </span>
          {durationStr && <span className={metaCls}>{durationStr}′</span>}
        </div>

        <div className="mt-1.5 flex items-center gap-2">
          <span className={`${nameCls} font-semibold truncate`}>
            {b.user_name || b.client_name || "Κράτηση"}
          </span>

          {b.is_online && (
            <span
              className={`${onlineCls} shrink-0 py-0.5 rounded-full bg-blue-400/15 text-blue-200 border border-blue-300/20`}
            >
              Online
            </span>
          )}
        </div>

        <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/45">
          {statusLabel(status)}
        </div>
      </GlassTile>
    </button>
  );
}

function EmptyDayState({ mobile = false }) {
  if (mobile) {
    return (
      <div className="flex items-center gap-2 px-1 py-1.5">
        <PencilLine className="h-4.5 w-4.5 text-white/40" />
        <span className="text-[12px] text-white/50">
          Πρόσθεσε μια κράτηση
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/[.03] px-3 py-3">
      <PencilLine className="h-4 w-4 text-white/40" />
      <span className="text-[11px] text-white/45">
        Πρόσθεσε μια κράτηση
      </span>
    </div>
  );
}

function DayCountBadge({ count }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[26px] h-7 px-2.5 rounded-full border border-white/10 bg-white/[.08] text-[11px] font-semibold text-white/75">
      {count}
    </span>
  );
}

function DesktopMonthCell({
  d,
  anchor,
  dayRows,
  onOpenDetails,
  onSelectDate,
  loading,
  error,
}) {
  const inMonth = d.getMonth() === anchor.getMonth();
  const today = isToday(d);
  const key = toYMDLocal(d);

  return (
    <div
      onClick={() => onSelectDate?.(key)}
      className={[
        "rounded-[22px] p-3 min-h-[260px] h-full",
        inMonth
          ? "bg-[rgba(17,18,21,.55)]"
          : "bg-[rgba(17,18,21,.28)] opacity-75",
        "backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,.02),0_6px_24px_rgba(0,0,0,.4)]",
        "cursor-pointer transition",
      ].join(" ")}
      title="Κάνε κλικ για γρήγορη κράτηση"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div
              className={`font-semibold text-[14px] ${
                inMonth ? "text-white/95" : "text-white/45"
              }`}
            >
              {fmtDayNum(d)}
            </div>
            {today && <TodayDot />}
          </div>

          <div className="text-[10px] text-white/40 truncate capitalize">
            {fmtWeekdayLong(d)}
          </div>
        </div>

        {!loading && !error && dayRows.length > 0 && (
          <DayCountBadge count={dayRows.length} />
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-[68px] rounded-2xl bg-white/[.06] animate-pulse border border-white/10" />
          <div className="h-[68px] rounded-2xl bg-white/[.04] animate-pulse border border-white/10" />
        </div>
      ) : error ? (
        <div className="text-[11px] text-red-300 bg-red-900/20 rounded-xl p-2 border border-red-400/20">
          {error}
        </div>
      ) : dayRows.length === 0 ? (
        <EmptyDayState />
      ) : (
        <div className="space-y-2.5">
          {dayRows.map((b) => (
            <BookingPill key={b.id} b={b} onOpen={onOpenDetails} compact />
          ))}
        </div>
      )}
    </div>
  );
}

function MobileDayCard({
  d,
  dayRows,
  onOpenDetails,
  onSelectDate,
  loading,
  error,
}) {
  const key = toYMDLocal(d);
  const today = isToday(d);
  const showBadge = !loading && !error && dayRows.length > 0;

  return (
    <div
      onClick={() => onSelectDate?.(key)}
      className={[
        "rounded-[28px] p-4 min-h-[170px]",
        "bg-[rgba(17,18,21,.68)] backdrop-blur-xl",
        "shadow-[inset_0_1px_0_rgba(255,255,255,.02),0_12px_28px_rgba(0,0,0,.38)]",
      ].join(" ")}
    >
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[20px] font-bold text-white">
              {fmtDayNum(d)}
            </span>
            {today && <TodayDot />}
          </div>

          <div className="text-[12px] capitalize text-white/60">
            {fmtWeekdayLong(d)}
          </div>
        </div>

        {showBadge && (
          <div className="shrink-0">
            <DayCountBadge count={dayRows.length} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2.5">
          <div className="h-[74px] rounded-2xl bg-white/[.06] animate-pulse border border-white/10" />
          <div className="h-[74px] rounded-2xl bg-white/[.04] animate-pulse border border-white/10" />
        </div>
      ) : error ? (
        <div className="text-[12px] text-red-300 bg-red-900/20 rounded-2xl p-3 border border-red-400/20">
          {error}
        </div>
      ) : dayRows.length === 0 ? (
        <EmptyDayState mobile />
      ) : (
        <div className="space-y-3">
          {dayRows.map((b) => (
            <BookingPill key={b.id} b={b} onOpen={onOpenDetails} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- component ---------------- */
export default function MonthlySchedule({
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

  const isMobile = useIsMobile(768);

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

  const currentMonthDays = useMemo(() => {
    const arr = [];
    const start = startOfMonth(anchor);
    const end = endOfMonth(anchor);

    const cur = new Date(start);
    while (cur <= end) {
      arr.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }

    return arr;
  }, [anchor]);

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
          .lte("date", endStr)
          .order("date", { ascending: true })
          .order("start_time", { ascending: true });

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

  const weekdays = ["Δ", "Τ", "Τ", "Π", "Π", "Σ", "Κ"];

  const content = (
    <>
      <div className="flex items-center justify-between mb-3 sm:mb-4 px-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            className="p-2.5 rounded-2xl bg-white/6 hover:bg-white/10 border border-white/10 shrink-0 transition"
            onClick={goPrev}
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          <button
            className="p-2.5 rounded-2xl bg-white/6 hover:bg-white/10 border border-white/10 shrink-0 transition"
            onClick={goNext}
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          <p className="ml-1 text-white/95 text-[15px] sm:text-lg font-semibold tracking-[-0.02em] truncate capitalize">
            {fmtMonthYear(anchor)}
          </p>
        </div>

        <div className="hidden md:block">
          <ViewSwitch value={view} onChange={onChangeView} />
        </div>
      </div>

      <div className="md:hidden mb-4">
        <ViewSwitch value={view} onChange={onChangeView} />
      </div>

      {isMobile ? (
        <div className="space-y-4">
          {currentMonthDays.map((d) => {
            const key = toYMDLocal(d);
            const dayRows = byDate.get(key) || [];

            return (
              <MobileDayCard
                key={key}
                d={d}
                dayRows={dayRows}
                onOpenDetails={onOpenDetails}
                onSelectDate={onSelectDate}
                loading={loading}
                error={error}
              />
            );
          })}
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-7 gap-3 mb-3">
            {weekdays.map((w, i) => (
              <div
                key={`${w}-${i}`}
                className="text-center text-xs text-white/55 font-semibold uppercase tracking-[0.16em]"
              >
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-3">
            {gridDays.map((d) => {
              const key = toYMDLocal(d);
              const dayRows = byDate.get(key) || [];

              return (
                <DesktopMonthCell
                  key={key}
                  d={d}
                  anchor={anchor}
                  dayRows={dayRows}
                  onOpenDetails={onOpenDetails}
                  onSelectDate={onSelectDate}
                  loading={loading}
                  error={error}
                />
              );
            })}
          </div>
        </div>
      )}
    </>
  );

  if (isMobile) {
    return <div className="px-0">{content}</div>;
  }

  return <Glass className="p-4 sm:p-6">{content}</Glass>;
}