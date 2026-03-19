// src/components/WeeklyAvailabilityModal.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  Clock3,
  Wifi,
  MapPin,
  Sparkles,
  X,
  CheckCircle2,
} from "lucide-react";

/*
  Expected availability shape:
  [
    {
      id?: string | number,
      weekday: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday",
      start_time: "08:00",
      end_time: "21:00",
      is_online: true | false,
    }
  ]
*/

const DAY_ORDER = [
  { key: "monday", label: "Δευτέρα", short: "Δευ" },
  { key: "tuesday", label: "Τρίτη", short: "Τρι" },
  { key: "wednesday", label: "Τετάρτη", short: "Τετ" },
  { key: "thursday", label: "Πέμπτη", short: "Πεμ" },
  { key: "friday", label: "Παρασκευή", short: "Παρ" },
  { key: "saturday", label: "Σάββατο", short: "Σαβ" },
  { key: "sunday", label: "Κυριακή", short: "Κυρ" },
];

const ROW_HEIGHT = 68;
const DAY_COL_MIN = 160;

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function normalizeWeekday(value) {
  const v = String(value || "").trim().toLowerCase();

  const map = {
    monday: "monday",
    mon: "monday",
    δευτέρα: "monday",
    δευ: "monday",

    tuesday: "tuesday",
    tue: "tuesday",
    τρίτη: "tuesday",
    τρι: "tuesday",

    wednesday: "wednesday",
    wed: "wednesday",
    τετάρτη: "wednesday",
    τετ: "wednesday",

    thursday: "thursday",
    thu: "thursday",
    πέμπτη: "thursday",
    πεμ: "thursday",

    friday: "friday",
    fri: "friday",
    παρασκευή: "friday",
    παρ: "friday",

    saturday: "saturday",
    sat: "saturday",
    σάββατο: "saturday",
    σαβ: "saturday",

    sunday: "sunday",
    sun: "sunday",
    κυριακή: "sunday",
    κυρ: "sunday",
  };

  return map[v] || v;
}

function timeToMinutes(value) {
  const safe = String(value || "00:00").slice(0, 5);
  const [h, m] = safe.split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function buildHours() {
  return Array.from({ length: 24 }, (_, i) => i);
}

function getTodayWeekdayKey() {
  const jsDay = new Date().getDay(); // 0=Sun
  const keys = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return keys[jsDay];
}

function formatRange(start, end) {
  return `${String(start || "").slice(0, 5)} - ${String(end || "").slice(0, 5)}`;
}

function groupAvailability(availability = []) {
  const grouped = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  };

  for (const item of availability) {
    const day = normalizeWeekday(item?.weekday);
    if (!grouped[day]) continue;

    grouped[day].push({
      id:
        item?.id ||
        `${day}-${item?.start_time || "00:00"}-${item?.end_time || "00:00"}-${
          item?.is_online ? "online" : "offline"
        }`,
      weekday: day,
      start_time: String(item?.start_time || "00:00").slice(0, 5),
      end_time: String(item?.end_time || "00:00").slice(0, 5),
      is_online: !!item?.is_online,
    });
  }

  for (const key of Object.keys(grouped)) {
    grouped[key].sort(
      (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
    );
  }

  return grouped;
}

function StatCard({ label, value, icon }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
      <div className="mb-2 flex items-center gap-2 text-white/65">
        {icon}
        <span className="text-xs font-medium uppercase tracking-[0.16em]">
          {label}
        </span>
      </div>
      <div className="text-xl font-black text-white sm:text-2xl">{value}</div>
    </div>
  );
}

function LegendPill({ online }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
        online
          ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
          : "border-blue-400/20 bg-blue-500/10 text-blue-200"
      )}
    >
      {online ? <Wifi className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
      {online ? "Online" : "Δια ζώσης"}
    </div>
  );
}

function AvailabilityBlock({ item }) {
  const startMin = timeToMinutes(item.start_time);
  const endMin = timeToMinutes(item.end_time);
  const top = (startMin / 60) * ROW_HEIGHT;
  const height = Math.max(((endMin - startMin) / 60) * ROW_HEIGHT, 40);

  return (
    <div
      style={{ top, height }}
      className={cn(
        "absolute left-2 right-2 rounded-2xl border p-2.5 shadow-[0_12px_30px_rgba(0,0,0,.28)] backdrop-blur-md",
        item.is_online
          ? "border-emerald-400/30 bg-gradient-to-br from-emerald-500/22 to-emerald-900/18 text-emerald-50"
          : "border-blue-400/30 bg-gradient-to-br from-blue-500/22 to-blue-900/18 text-blue-50"
      )}
    >
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/65">
              {item.is_online ? "Online" : "Δια ζώσης"}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-white">
              <Clock3 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{formatRange(item.start_time, item.end_time)}</span>
            </div>
          </div>

          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border",
              item.is_online
                ? "border-emerald-300/20 bg-emerald-400/10"
                : "border-blue-300/20 bg-blue-400/10"
            )}
          >
            {item.is_online ? (
              <Wifi className="h-4 w-4 text-white" />
            ) : (
              <MapPin className="h-4 w-4 text-white" />
            )}
          </div>
        </div>

        <div className="mt-2 text-[12px] text-white/75">
          {item.is_online ? "Διαθέσιμο online session" : "Διαθέσιμο δια ζώσης session"}
        </div>
      </div>
    </div>
  );
}

export default function WeeklyAvailabilityModal({
  open,
  onClose,
  availability = [],
  title = "Εβδομαδιαία Διαθεσιμότητα",
  subtitle = "Προβολή όλων των διαθέσιμων ωρών για τις 7 ημέρες",
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const grouped = useMemo(() => groupAvailability(availability), [availability]);
  const hours = useMemo(() => buildHours(), []);
  const todayKey = useMemo(() => getTodayWeekdayKey(), []);

  const totalBlocks = useMemo(
    () => availability.length,
    [availability.length]
  );

  const activeDays = useMemo(
    () =>
      DAY_ORDER.filter((d) => (grouped[d.key] || []).length > 0).length,
    [grouped]
  );

  const onlineBlocks = useMemo(
    () => availability.filter((x) => !!x?.is_online).length,
    [availability]
  );

  const totalHeight = hours.length * ROW_HEIGHT;

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <style>{`
            .weekly-modal-scroll::-webkit-scrollbar {
              height: 10px;
              width: 10px;
            }
            .weekly-modal-scroll::-webkit-scrollbar-track {
              background: rgba(255,255,255,0.04);
              border-radius: 999px;
            }
            .weekly-modal-scroll::-webkit-scrollbar-thumb {
              background: rgba(255,255,255,0.16);
              border-radius: 999px;
            }
            .weekly-modal-scroll::-webkit-scrollbar-thumb:hover {
              background: rgba(255,255,255,0.28);
            }
          `}</style>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1200] bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
            className="fixed inset-0 z-[1210] p-2 sm:p-4 lg:p-6"
          >
            <div
              className="mx-auto flex h-full w-full max-w-[1800px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,.96),rgba(0,0,0,.98))] shadow-[0_24px_80px_rgba(0,0,0,.55)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,.08),transparent_38%)] pointer-events-none" />

                <div className="relative flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold tracking-[0.14em] text-white/70">
                      <Sparkles className="h-3.5 w-3.5" />
                      WEEK VIEW
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white">
                        <CalendarDays className="h-6 w-6" />
                      </div>

                      <div className="min-w-0">
                        <h2 className="bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-3xl">
                          {title}
                        </h2>
                        <p className="mt-1 text-sm text-zinc-300 sm:text-base">
                          {subtitle}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-300 transition hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="border-b border-white/10 px-4 py-4 sm:px-6">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatCard
                    label="Σύνολο blocks"
                    value={totalBlocks}
                    icon={<CalendarDays className="h-4 w-4" />}
                  />
                  <StatCard
                    label="Ενεργές ημέρες"
                    value={activeDays}
                    icon={<CheckCircle2 className="h-4 w-4" />}
                  />
                  <StatCard
                    label="Online blocks"
                    value={onlineBlocks}
                    icon={<Wifi className="h-4 w-4" />}
                  />
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:p-4">
                    <div className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-white/65">
                      Τύποι διαθεσιμότητας
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <LegendPill online />
                      <LegendPill online={false} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 p-2 sm:p-4">
                <div className="weekly-modal-scroll h-full overflow-auto rounded-3xl border border-white/10 bg-black/25">
                  <div
                    className="min-w-[1220px]"
                    style={{
                      gridTemplateColumns: `90px repeat(7, minmax(${DAY_COL_MIN}px, 1fr))`,
                    }}
                  >
                    <div
                      className="sticky top-0 z-30 grid border-b border-white/10 bg-zinc-950/95 backdrop-blur-xl"
                      style={{
                        gridTemplateColumns: `90px repeat(7, minmax(${DAY_COL_MIN}px, 1fr))`,
                      }}
                    >
                      <div className="border-r border-white/10 px-3 py-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                        Ώρα
                      </div>

                      {DAY_ORDER.map((day) => {
                        const hasItems = (grouped[day.key] || []).length > 0;
                        const isToday = day.key === todayKey;

                        return (
                          <div
                            key={day.key}
                            className={cn(
                              "border-r border-white/10 px-3 py-4 last:border-r-0",
                              isToday ? "bg-white/[0.04]" : ""
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <div className="text-sm font-bold text-white">
                                  {day.label}
                                </div>
                                <div className="mt-1 text-xs text-white/50">
                                  {hasItems
                                    ? `${grouped[day.key].length} διαθέσιμο${
                                        grouped[day.key].length === 1 ? "" : "ι"
                                      } block`
                                    : "Δεν υπάρχει διαθεσιμότητα"}
                                </div>
                              </div>

                              {hasItems && (
                                <div className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-white/70">
                                  {day.short}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div
                      className="grid"
                      style={{
                        gridTemplateColumns: `90px repeat(7, minmax(${DAY_COL_MIN}px, 1fr))`,
                      }}
                    >
                      <div className="relative border-r border-white/10 bg-zinc-950/60">
                        {hours.map((hour) => (
                          <div
                            key={hour}
                            className="border-b border-white/10 px-2 pt-2 text-right last:border-b-0"
                            style={{ height: ROW_HEIGHT }}
                          >
                            <span className="text-xs font-medium text-white/55">
                              {pad2(hour)}:00
                            </span>
                          </div>
                        ))}
                      </div>

                      {DAY_ORDER.map((day) => {
                        const blocks = grouped[day.key] || [];
                        const isToday = day.key === todayKey;

                        return (
                          <div
                            key={day.key}
                            className={cn(
                              "relative border-r border-white/10 last:border-r-0",
                              isToday ? "bg-white/[0.02]" : ""
                            )}
                            style={{ height: totalHeight }}
                          >
                            {hours.map((hour) => (
                              <div
                                key={`${day.key}-${hour}`}
                                className="border-b border-white/10 last:border-b-0"
                                style={{ height: ROW_HEIGHT }}
                              />
                            ))}

                            {blocks.map((item) => (
                              <AvailabilityBlock key={item.id} item={item} />
                            ))}

                            {!blocks.length && (
                              <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-6">
                                <div className="rounded-full border border-dashed border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/35">
                                  Χωρίς διαθεσιμότητα
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 px-4 py-3 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-zinc-400">
                    Εμφανίζονται όλες οι ώρες της εβδομάδας σε εβδομαδιαίο planner.
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-100"
                  >
                    <X className="h-4 w-4" />
                    Κλείσιμο
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}