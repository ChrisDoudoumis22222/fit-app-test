"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  Clock3,
  Laptop,
  MapPin,
  Link as LinkIcon,
  Sparkles,
  X,
  CheckCircle2,
} from "lucide-react";

/*
  Standalone availability editor modal.

  Supports 2 input styles:

  1) Modern:
     initialAvailability = [
       {
         weekday: "monday",
         start_time: "08:00",
         end_time: "21:00",
         is_online: true
       }
     ]

  2) Legacy / TrainerSchedulePage:
     initialSelectedDays={["monday","tuesday"]}
     initialStartTime="08:00"
     initialEndTime="21:00"
     initialIsOnline={false}

  onSave(payload) returns:
  {
    availability,
    selectedDays,
    startTime,
    endTime,
    isOnline,
    availability_mode,
    offline_location,
    online_link,
  }
*/

const DAYS = [
  { key: "monday", label: "Δευτέρα", short: "Δευ" },
  { key: "tuesday", label: "Τρίτη", short: "Τρι" },
  { key: "wednesday", label: "Τετάρτη", short: "Τετ" },
  { key: "thursday", label: "Πέμπτη", short: "Πεμ" },
  { key: "friday", label: "Παρασκευή", short: "Παρ" },
  { key: "saturday", label: "Σάββατο", short: "Σαβ" },
  { key: "sunday", label: "Κυριακή", short: "Κυρ" },
];

const DEFAULT_START = "09:00";
const DEFAULT_END = "17:00";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function normalizeWeekday(value) {
  const v = String(value || "").trim().toLowerCase();

  const map = {
    monday: "monday",
    mon: "monday",
    "δευτέρα": "monday",
    "δευ": "monday",

    tuesday: "tuesday",
    tue: "tuesday",
    "τρίτη": "tuesday",
    "τρι": "tuesday",

    wednesday: "wednesday",
    wed: "wednesday",
    "τετάρτη": "wednesday",
    "τετ": "wednesday",

    thursday: "thursday",
    thu: "thursday",
    "πέμπτη": "thursday",
    "πεμ": "thursday",

    friday: "friday",
    fri: "friday",
    "παρασκευή": "friday",
    "παρ": "friday",

    saturday: "saturday",
    sat: "saturday",
    "σάββατο": "saturday",
    "σαβ": "saturday",

    sunday: "sunday",
    sun: "sunday",
    "κυριακή": "sunday",
    "κυρ": "sunday",
  };

  return map[v] || v;
}

function timeToMinutes(value) {
  const safe = String(value || "00:00").slice(0, 5);
  const [h, m] = safe.split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function minutesToTime(mins) {
  const safe = Math.max(0, Number(mins) || 0);
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function buildRowsFromInitial({
  initialAvailability = [],
  initialSelectedDays = [],
  initialStartTime = DEFAULT_START,
  initialEndTime = DEFAULT_END,
  initialIsOnline = false,
}) {
  if (Array.isArray(initialAvailability) && initialAvailability.length > 0) {
    return DAYS.map((day) => {
      const found = initialAvailability.find(
        (item) => normalizeWeekday(item?.weekday) === day.key
      );

      return {
        weekday: day.key,
        enabled: Boolean(found),
        start_time: String(found?.start_time || initialStartTime || DEFAULT_START).slice(0, 5),
        end_time: String(found?.end_time || initialEndTime || DEFAULT_END).slice(0, 5),
        is_online: Boolean(found?.is_online ?? initialIsOnline),
      };
    });
  }

  const selected = new Set(
    Array.isArray(initialSelectedDays) ? initialSelectedDays.map(normalizeWeekday) : []
  );

  return DAYS.map((day) => ({
    weekday: day.key,
    enabled: selected.has(day.key),
    start_time: String(initialStartTime || DEFAULT_START).slice(0, 5),
    end_time: String(initialEndTime || DEFAULT_END).slice(0, 5),
    is_online: Boolean(initialIsOnline),
  }));
}

function buildSavePayload(rows, globalIsOnline, offlineLocation, onlineLink) {
  const enabledRows = rows.filter((row) => row.enabled);

  const availability = enabledRows.map((row) => ({
    weekday: row.weekday,
    start_time: String(row.start_time || DEFAULT_START).slice(0, 5),
    end_time: String(row.end_time || DEFAULT_END).slice(0, 5),
    is_online: !!row.is_online,
  }));

  const selectedDays = enabledRows.map((row) => row.weekday);

  const startTime =
    enabledRows.length > 0
      ? minutesToTime(
          Math.min(...enabledRows.map((row) => timeToMinutes(row.start_time)))
        )
      : DEFAULT_START;

  const endTime =
    enabledRows.length > 0
      ? minutesToTime(
          Math.max(...enabledRows.map((row) => timeToMinutes(row.end_time)))
        )
      : DEFAULT_END;

  return {
    availability,
    selectedDays,
    startTime,
    endTime,
    isOnline: !!globalIsOnline,
    availability_mode: globalIsOnline ? "online" : "in_person",
    offline_location: offlineLocation || "",
    online_link: onlineLink || "",
  };
}

function DayRow({
  day,
  row,
  onToggle,
  onTimeChange,
}) {
  const invalidTime =
    row.enabled &&
    row.start_time &&
    row.end_time &&
    timeToMinutes(row.start_time) >= timeToMinutes(row.end_time);

  return (
    <div className="rounded-none border-y border-zinc-800 bg-transparent px-4 py-4 md:rounded-[26px] md:border md:bg-zinc-950/60 md:px-4 md:py-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start justify-between gap-3 xl:min-w-[260px] xl:justify-start xl:gap-3">
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              "relative order-2 mt-0.5 h-8 w-14 shrink-0 rounded-full transition-colors xl:order-1",
              row.enabled ? "bg-emerald-500 md:bg-white" : "bg-zinc-700"
            )}
            aria-pressed={row.enabled}
            aria-label={`Ενεργοποίηση ${day.label}`}
          >
            <span
              className={cn(
                "absolute top-1 h-6 w-6 rounded-full transition-all",
                row.enabled ? "left-7 bg-white md:bg-black" : "left-1 bg-white"
              )}
            />
          </button>

          <div className="order-1 min-w-0 flex-1 xl:order-2">
            <p className="text-sm font-semibold text-white md:text-base">
              {day.label}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {row.enabled ? "Η ημέρα είναι ενεργή" : "Η ημέρα είναι ανενεργή"}
            </p>
          </div>
        </div>

        {row.enabled ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:w-auto xl:min-w-[420px]">
            <div className="rounded-2xl border border-zinc-800 bg-transparent px-4 py-3 md:bg-zinc-900/80">
              <label className="mb-2 block text-[11px] font-medium text-zinc-400">
                Ώρα έναρξης
              </label>

              <input
                type="time"
                step="900"
                value={row.start_time || DEFAULT_START}
                onChange={(e) => onTimeChange("start_time", e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-transparent px-3 py-3 text-sm font-medium text-white outline-none transition focus:border-white/30 md:bg-black/50"
              />
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-transparent px-4 py-3 md:bg-zinc-900/80">
              <label className="mb-2 block text-[11px] font-medium text-zinc-400">
                Ώρα λήξης
              </label>

              <input
                type="time"
                step="900"
                value={row.end_time || DEFAULT_END}
                onChange={(e) => onTimeChange("end_time", e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-transparent px-3 py-3 text-sm font-medium text-white outline-none transition focus:border-white/30 md:bg-black/50"
              />
            </div>
          </div>
        ) : (
          <div className="hidden xl:block xl:flex-1" />
        )}
      </div>

      {invalidTime ? (
        <div className="mt-3 rounded-2xl border border-red-900/30 bg-red-950/20 px-3 py-2 text-xs leading-5 text-red-300">
          Η ώρα λήξης πρέπει να είναι μετά την ώρα έναρξης.
        </div>
      ) : null}
    </div>
  );
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

export default function AvalabilityModalScheduler({
  open,
  onClose,
  onSave,

  title = "Διαθεσιμότητα",
  subtitle = "Ορισμός ημερών, ωραρίου και τρόπου μαθήματος",

  initialAvailability = [],
  initialSelectedDays = [],
  initialStartTime = DEFAULT_START,
  initialEndTime = DEFAULT_END,
  initialIsOnline = false,

  initialOfflineLocation = "",
  initialOnlineLink = "",
}) {
  const [mounted, setMounted] = useState(false);

  const [rows, setRows] = useState(() =>
    buildRowsFromInitial({
      initialAvailability,
      initialSelectedDays,
      initialStartTime,
      initialEndTime,
      initialIsOnline,
    })
  );

  const [globalIsOnline, setGlobalIsOnline] = useState(Boolean(initialIsOnline));
  const [offlineLocation, setOfflineLocation] = useState(initialOfflineLocation || "");
  const [onlineLink, setOnlineLink] = useState(initialOnlineLink || "");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    setRows(
      buildRowsFromInitial({
        initialAvailability,
        initialSelectedDays,
        initialStartTime,
        initialEndTime,
        initialIsOnline,
      })
    );
    setGlobalIsOnline(Boolean(initialIsOnline));
    setOfflineLocation(initialOfflineLocation || "");
    setOnlineLink(initialOnlineLink || "");
  }, [
    open,
    initialAvailability,
    initialSelectedDays,
    initialStartTime,
    initialEndTime,
    initialIsOnline,
    initialOfflineLocation,
    initialOnlineLink,
  ]);

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

  const enabledCount = useMemo(
    () => rows.filter((row) => row.enabled).length,
    [rows]
  );

  const validCount = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.enabled &&
          timeToMinutes(row.start_time) < timeToMinutes(row.end_time)
      ).length,
    [rows]
  );

  const invalidCount = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.enabled &&
          timeToMinutes(row.start_time) >= timeToMinutes(row.end_time)
      ).length,
    [rows]
  );

  const canSave = invalidCount === 0;

  if (!mounted) return null;

  const toggleDay = (weekday) => {
    setRows((prev) =>
      prev.map((row) =>
        row.weekday === weekday
          ? {
              ...row,
              enabled: !row.enabled,
              is_online: globalIsOnline,
            }
          : row
      )
    );
  };

  const updateDayTime = (weekday, field, value) => {
    setRows((prev) =>
      prev.map((row) =>
        row.weekday === weekday
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  };

  const handleSetGlobalMode = (nextIsOnline) => {
    setGlobalIsOnline(nextIsOnline);

    setRows((prev) =>
      prev.map((row) =>
        row.enabled
          ? {
              ...row,
              is_online: nextIsOnline,
            }
          : row
      )
    );
  };

  const handleSave = () => {
    if (!canSave) return;

    const payload = buildSavePayload(
      rows,
      globalIsOnline,
      offlineLocation,
      onlineLink
    );

    onSave?.(payload);
    onClose?.();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <style>{`
            .availability-modal-scroll::-webkit-scrollbar {
              height: 10px;
              width: 10px;
            }
            .availability-modal-scroll::-webkit-scrollbar-track {
              background: rgba(255,255,255,0.04);
              border-radius: 999px;
            }
            .availability-modal-scroll::-webkit-scrollbar-thumb {
              background: rgba(255,255,255,0.16);
              border-radius: 999px;
            }
            .availability-modal-scroll::-webkit-scrollbar-thumb:hover {
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
              className="mx-auto flex h-full w-full max-w-[1200px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,.96),rgba(0,0,0,.98))] shadow-[0_24px_80px_rgba(0,0,0,.55)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,.08),transparent_38%)] pointer-events-none" />

                <div className="relative flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold tracking-[0.14em] text-white/70">
                      <Sparkles className="h-3.5 w-3.5" />
                      EDITOR MODAL
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
                    label="Ενεργές ημέρες"
                    value={enabledCount}
                    icon={<CalendarDays className="h-4 w-4" />}
                  />
                  <StatCard
                    label="Έγκυρες ημέρες"
                    value={validCount}
                    icon={<CheckCircle2 className="h-4 w-4" />}
                  />
                  <StatCard
                    label="Online mode"
                    value={globalIsOnline ? "Ναι" : "Όχι"}
                    icon={<Laptop className="h-4 w-4" />}
                  />
                  <StatCard
                    label="Προβλήματα"
                    value={invalidCount}
                    icon={<Clock3 className="h-4 w-4" />}
                  />
                </div>
              </div>

              <div className="availability-modal-scroll min-h-0 flex-1 overflow-auto px-2 py-2 sm:px-4 sm:py-4">
                <section className="-mx-4 md:mx-0">
                  <div className="md:rounded-[28px] md:border md:border-zinc-900 md:bg-zinc-950/70 md:p-5">
                    <div className="space-y-3">
                      {DAYS.map((day) => {
                        const row =
                          rows.find((item) => item.weekday === day.key) || {
                            weekday: day.key,
                            enabled: false,
                            start_time: DEFAULT_START,
                            end_time: DEFAULT_END,
                            is_online: globalIsOnline,
                          };

                        return (
                          <DayRow
                            key={day.key}
                            day={day}
                            row={row}
                            onToggle={() => toggleDay(day.key)}
                            onTimeChange={(field, value) =>
                              updateDayTime(day.key, field, value)
                            }
                          />
                        );
                      })}
                    </div>

                    <div className="mt-4 border-y border-zinc-800 bg-transparent px-4 py-4 md:rounded-[26px] md:border md:bg-zinc-950/60 md:p-5">
                      <div className="mb-4 flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-800 bg-transparent text-white md:bg-zinc-900">
                          {globalIsOnline ? (
                            <Laptop className="h-4 w-4" />
                          ) : (
                            <MapPin className="h-4 w-4" />
                          )}
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-white md:text-base">
                            Τρόπος μαθήματος
                          </p>
                          <p className="mt-1 text-xs leading-5 text-zinc-400">
                            Η επιλογή εφαρμόζεται σε όλες τις ενεργές ημέρες.
                            {enabledCount > 0
                              ? ` Ενεργές ημέρες: ${enabledCount}.`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleSetGlobalMode(false)}
                          className={cn(
                            "flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-medium transition border",
                            !globalIsOnline
                              ? "border-white bg-white text-black"
                              : "border-zinc-800 bg-transparent text-white hover:border-zinc-700 md:bg-zinc-900"
                          )}
                        >
                          <MapPin className="h-4 w-4" />
                          <span>Δια ζώσης</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSetGlobalMode(true)}
                          className={cn(
                            "flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-medium transition border",
                            globalIsOnline
                              ? "border-white bg-white text-black"
                              : "border-zinc-800 bg-transparent text-white hover:border-zinc-700 md:bg-zinc-900"
                          )}
                        >
                          <Laptop className="h-4 w-4" />
                          <span>Online</span>
                        </button>
                      </div>

                      <div className="mt-4">
                        {!globalIsOnline ? (
                          <div className="rounded-2xl border border-zinc-800 bg-transparent px-4 py-3 md:bg-zinc-900/80">
                            <label className="mb-2 flex items-center gap-2 text-[11px] font-medium text-zinc-400">
                              <MapPin className="h-3.5 w-3.5" />
                              Τοποθεσία προπόνησης
                            </label>

                            <input
                              type="text"
                              value={offlineLocation}
                              onChange={(e) => setOfflineLocation(e.target.value)}
                              placeholder="π.χ. Αμπελόκηποι, Αθήνα ή Οδός / Studio / Γυμναστήριο"
                              className="w-full rounded-xl border border-zinc-800 bg-transparent px-3 py-3 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30 md:bg-black/50"
                            />

                            <p className="mt-2 text-xs leading-5 text-zinc-500">
                              Συμπλήρωσε τη βασική τοποθεσία όπου γίνονται οι δια
                              ζώσης προπονήσεις.
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-zinc-800 bg-transparent px-4 py-3 md:bg-zinc-900/80">
                            <label className="mb-2 flex items-center gap-2 text-[11px] font-medium text-zinc-400">
                              <LinkIcon className="h-3.5 w-3.5" />
                              Σύνδεσμος online προπόνησης
                            </label>

                            <input
                              type="text"
                              value={onlineLink}
                              onChange={(e) => setOnlineLink(e.target.value)}
                              placeholder="π.χ. Zoom / Teams / Google Meet / Discord / WhatsApp link"
                              className="w-full rounded-xl border border-zinc-800 bg-transparent px-3 py-3 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30 md:bg-black/50"
                            />

                            <p className="mt-2 text-xs leading-5 text-zinc-500">
                              Βάλε το βασικό link που θα χρησιμοποιείς για online
                              coaching ή online μαθήματα.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <div className="border-t border-white/10 px-4 py-3 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-zinc-400">
                    Ρύθμισε ημέρες, ώρες και τρόπο προπόνησης μέσα από standalone modal.
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      <X className="h-4 w-4" />
                      Άκυρο
                    </button>

                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={!canSave}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition",
                        canSave
                          ? "bg-white text-black hover:bg-zinc-100"
                          : "cursor-not-allowed bg-white/10 text-white/40"
                      )}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Αποθήκευση
                    </button>
                  </div>
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