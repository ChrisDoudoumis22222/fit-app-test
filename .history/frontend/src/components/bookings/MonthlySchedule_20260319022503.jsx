"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, PencilLine } from "lucide-react";
import { supabase } from "../../supabaseClient";

/* ---------------- helpers ---------------- */
const pad2 = (n) => String(n).padStart(2, "0");

const toYMDLocal = (d) => {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(
    x.getDate()
  )}`;
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
  const durationStr = minutes ? `${minutes}’` : null;

  const pad = compact ? "px-2 py-1.5" : "px-3 py-2.5";
  const timeCls = compact
    ? "text-[11px] text-white/70"
    : "text-xs text-white/70";
  const nameCls = compact ? "text-[11px]" : "text-sm";
  const endCls = "text-[10px] text-white/60";
  const onlineCls = compact ? "text-[9px] px-1" : "text-[10px] px-1.5";

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
        <div className="flex items-center justify-between">
          <span className={timeCls}>{hhmm(b.start_time)}</span>
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

function MonthMiniChip({ booking, onOpen }) {
  const status = (booking?.status || "pending").toLowerCase();

  const tone =
    status === "accepted"
      ? "bg-emerald-500/16 text-emerald-200 border-emerald-400/20"
      : status === "declined" || status === "cancelled"
      ? "bg-rose-500/16 text-rose-200 border-rose-400/20"
      : "bg-amber-500/16 text-amber-200 border-amber-400/20";

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
          "block w-full rounded-md border px-1.5 py-1",
          "text-[10px] leading-tight font-medium truncate",
          tone,
        ].join(" ")}
      >
        {hhmm(booking?.start_time) || "—"}
      </span>
    </button>
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
  const isTiny = useIsMobile(390);
  const maxPills = isMobile ? 99 : 3;

  const gridStart = useMemo(() => startOfWeek(startOfMonth(anchor), 1), [anchor]);

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

  const weekdays = ["Δ", "Τ", "Τ", "Π", "Π", "Σ", "Κ"];

  const content = (
    <>
      <div className="flex items-center justify-between mb-2 sm:mb-3 px-3 sm:px-0">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            className="p-2 rounded-xl bg-white/6 hover:bg-white/10 border border-white/10 shrink-0"
            onClick={goPrev}
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button
            className="p-2 rounded-xl bg-white/6 hover:bg-white/10 border border-white/10 shrink-0"
            onClick={goNext}
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <p className="ml-1 sm:ml-2 text-white/90 text-[13px] sm:text-base truncate">
            {fmtMonthYear(anchor)}
          </p>
        </div>

        <div className="hidden md:block">
          <ViewSwitch value={view} onChange={onChangeView} />
        </div>
      </div>

      <div className="md:hidden mb-3 -mx-3 px-3">
        <ViewSwitch value={view} onChange={onChangeView} />
      </div>

      <div className="px-0 sm:px-0">
        <div className="grid grid-cols-7 gap-[2px] sm:gap-2 mb-1 sm:mb-2">
          {weekdays.map((w, i) => (
            <div
              key={`${w}-${i}`}
              className="text-center text-[9px] sm:text-xs text-white/60 font-medium"
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
                onClick={() => onSelectDate?.(key)}
                className={[
                  "rounded-lg sm:rounded-2xl border border-white/10",
                  "p-1 sm:p-2",
                  isTiny
                    ? "min-h-[110px]"
                    : isMobile
                    ? "min-h-[145px]"
                    : "min-h-[110px]",
                  inMonth
                    ? "bg-[rgba(17,18,21,.55)]"
                    : "bg-[rgba(17,18,21,.35)] opacity-70",
                  "backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_6px_24px_rgba(0,0,0,.4)]",
                  "cursor-pointer hover:ring-1 hover:ring-white/15 transition overflow-hidden",
                ].join(" ")}
                title="Κάνε κλικ για γρήγορη κράτηση"
              >
                <div className="flex items-center justify-between mb-0.5 sm:mb-1">
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
                    } rounded-md sm:rounded-xl bg-white/[.06] animate-pulse border border-white/10`}
                  />
                ) : error ? (
                  <div
                    className={`${
                      isTiny ? "text-[8px]" : "text-[9px]"
                    } sm:text-[11px] text-red-300 bg-red-900/20 rounded p-1`}
                  >
                    !
                  </div>
                ) : dayRows.length === 0 ? (
                  isMobile ? (
                    <div className="flex items-center justify-center h-[18px] sm:h-auto text-white/35">
                      <PencilLine
                        className={`${
                          isTiny ? "h-3 w-3" : "h-3.5 w-3.5"
                        } opacity-70`}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-white/60">
                      <PencilLine className="h-3.5 w-3.5 opacity-70" />
                      <span className="text-[10px] leading-none">
                        Πρόσθεσε μια κράτηση
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

  if (isMobile) {
    return <div className="px-0">{content}</div>;
  }

  return <Glass className="p-2 sm:p-6">{content}</Glass>;
}