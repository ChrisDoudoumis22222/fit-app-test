"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  Clock3,
  Wifi,
  WifiOff,
  Check,
} from "lucide-react";
import { WEEKDAYS, cn } from "../trainerOnboarding.utils";

/* ---------------- helpers ---------------- */

const DEFAULT_START = "11:00";
const DEFAULT_END = "18:00";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function parseHHMM(v) {
  const safe = String(v || "00:00").slice(0, 5);
  const [h, m] = safe.split(":").map((x) => parseInt(x, 10));
  return {
    hour: Number.isFinite(h) ? Math.max(0, Math.min(23, h)) : 0,
    minute: Number.isFinite(m) ? Math.max(0, Math.min(59, m)) : 0,
  };
}

function formatHHMM(h, m) {
  return `${pad2(h)}:${pad2(m)}`;
}

function arraysEqualAsSet(a = [], b = []) {
  if (a.length !== b.length) return false;
  const aa = [...a].sort().join("|");
  const bb = [...b].sort().join("|");
  return aa === bb;
}

function buildAvailabilityByDay(selectedDays, startTime, endTime, isOnline) {
  const selected = new Set(selectedDays);
  const next = {};

  WEEKDAYS.forEach((day) => {
    next[day.value] = selected.has(day.value)
      ? [
          {
            start_time: startTime,
            end_time: endTime,
            is_online: !!isOnline,
          },
        ]
      : [];
  });

  return next;
}

function deriveUiStateFromForm(form) {
  const availabilityByDay = form?.availabilityByDay || {};

  const selectedDays = WEEKDAYS.filter(
    (day) => Array.isArray(availabilityByDay[day.value]) && availabilityByDay[day.value].length > 0
  ).map((day) => day.value);

  let firstSlot = null;
  for (const day of WEEKDAYS) {
    const slots = availabilityByDay?.[day.value] || [];
    if (slots.length > 0) {
      firstSlot = slots[0];
      break;
    }
  }

  return {
    selectedDays,
    startTime: firstSlot?.start_time?.slice?.(0, 5) || DEFAULT_START,
    endTime: firstSlot?.end_time?.slice?.(0, 5) || DEFAULT_END,
    isOnline: !!firstSlot?.is_online,
  };
}

function useIsMobile(bp = 640) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(`(max-width:${bp - 0.02}px)`).matches
      : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia(`(max-width:${bp - 0.02}px)`);
    const onChange = (e) => setIsMobile(e.matches);

    setIsMobile(mq.matches);

    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, [bp]);

  return isMobile;
}

function useClickOutside(ref, handler, when = true) {
  useEffect(() => {
    if (!when) return;

    const onDown = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler?.();
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [ref, handler, when]);
}

function useFloatingPanel(triggerRef, open, { width = 360, gap = 10 } = {}) {
  const [style, setStyle] = useState(null);

  useEffect(() => {
    if (!open || !triggerRef.current || typeof window === "undefined") return;

    const update = () => {
      const rect = triggerRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const panelWidth = Math.min(width, vw - 16);
      let left = rect.left;
      let top = rect.bottom + gap;

      if (left + panelWidth > vw - 8) left = vw - panelWidth - 8;
      if (left < 8) left = 8;

      const estimatedHeight = 380;
      if (top + estimatedHeight > vh - 8 && rect.top > estimatedHeight / 2) {
        top = Math.max(8, rect.top - gap - estimatedHeight);
      }

      setStyle({
        position: "fixed",
        top,
        left,
        width: panelWidth,
        zIndex: 2000,
      });
    };

    update();

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [triggerRef, open, width, gap]);

  return style;
}

function PickerPortal({ open, children }) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

function TimePickerInput({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const isMobile = useIsMobile(640);

  const panelStyle = useFloatingPanel(triggerRef, open, {
    width:
      typeof window !== "undefined"
        ? isMobile
          ? window.innerWidth - 16
          : 380
        : 380,
    gap: 10,
  });

  useClickOutside(panelRef, () => setOpen(false), open);

  const { hour, minute } = useMemo(() => parseHHMM(value), [value]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(
    () => Array.from({ length: 12 }, (_, i) => i * 5),
    []
  );

  const setHour = (h) => onChange?.(formatHHMM(h, minute));
  const setMinute = (m) => onChange?.(formatHHMM(hour, m));

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-white">
        <Clock3 className="w-4 h-4" />
        {label}
      </label>

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded-3xl border border-white/10 bg-black px-4 py-4 text-left text-white transition hover:border-white/20 focus:outline-none focus:border-white/30"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-2xl font-semibold tracking-tight">{value}</span>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80 shrink-0">
            <Clock3 className="w-5 h-5" />
          </span>
        </div>
      </button>

      <PickerPortal open={open && !!panelStyle}>
        <>
          <div
            className="fixed inset-0 z-[1990] bg-transparent"
            onClick={() => setOpen(false)}
          />
          <div
            ref={panelRef}
            style={panelStyle}
            className="overflow-hidden rounded-[28px] border border-white/10 bg-zinc-950/98 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,.55)]"
          >
            <div className="grid grid-cols-2 border-b border-white/10">
              <div className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
                Ώρα
              </div>
              <div className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-white/45 border-l border-white/10">
                Λεπτά
              </div>
            </div>

            <div className="grid grid-cols-2">
              <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                {hours.map((h) => {
                  const active = h === hour;

                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHour(h)}
                      className={cn(
                        "w-full rounded-2xl px-3 py-2.5 text-sm font-semibold transition",
                        active
                          ? "bg-white text-black"
                          : "bg-white/[0.04] text-white hover:bg-white/[0.08]"
                      )}
                    >
                      {pad2(h)}
                    </button>
                  );
                })}
              </div>

              <div className="max-h-64 overflow-y-auto p-2 space-y-1 border-l border-white/10">
                {minutes.map((m) => {
                  const active = m === minute;

                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMinute(m)}
                      className={cn(
                        "w-full rounded-2xl px-3 py-2.5 text-sm font-semibold transition",
                        active
                          ? "bg-white text-black"
                          : "bg-white/[0.04] text-white hover:bg-white/[0.08]"
                      )}
                    >
                      {pad2(m)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 px-3 py-3">
              <div className="text-sm text-white/60">
                Επιλεγμένο: <span className="text-white font-semibold">{value}</span>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-100"
              >
                ΟΚ
              </button>
            </div>
          </div>
        </>
      </PickerPortal>
    </div>
  );
}

function OnlineSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange?.(!checked)}
      role="switch"
      aria-checked={checked}
      className={cn(
        "relative inline-flex h-8 w-[54px] items-center rounded-full border transition-all duration-200",
        checked
          ? "bg-emerald-500 border-emerald-400/50 shadow-[0_8px_22px_rgba(16,185,129,.28)]"
          : "bg-zinc-300 border-zinc-300/80"
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,.22)]",
          checked ? "left-[26px]" : "left-[2px]"
        )}
      />
    </button>
  );
}

/* ---------------- component ---------------- */

export default function TrainerAvailabilityStep({
  form,
  setForm,
  addAvailabilitySlot,
  removeAvailabilitySlot,
  updateAvailabilitySlot,
}) {
  const derived = useMemo(() => deriveUiStateFromForm(form), [form]);

  const [selectedDays, setSelectedDays] = useState(derived.selectedDays);
  const [startTime, setStartTime] = useState(derived.startTime);
  const [endTime, setEndTime] = useState(derived.endTime);
  const [isOnline, setIsOnline] = useState(derived.isOnline);

  useEffect(() => {
    if (!arraysEqualAsSet(selectedDays, derived.selectedDays)) {
      setSelectedDays(derived.selectedDays);
    }

    if (startTime !== derived.startTime) setStartTime(derived.startTime);
    if (endTime !== derived.endTime) setEndTime(derived.endTime);
    if (isOnline !== derived.isOnline) setIsOnline(derived.isOnline);
  }, [derived]);

  const selectedSet = useMemo(() => new Set(selectedDays), [selectedDays]);

  const presets = useMemo(
    () => [
      {
        label: "Όλες",
        days: WEEKDAYS.map((d) => d.value),
      },
      {
        label: "Καθημερινές",
        days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      },
      {
        label: "Σαβ/Κυρ",
        days: ["saturday", "sunday"],
      },
      {
        label: "Δευ/Τετ/Παρ",
        days: ["monday", "wednesday", "friday"],
      },
      {
        label: "Τρι/Πεμ",
        days: ["tuesday", "thursday"],
      },
    ],
    []
  );

  const commitWithSetForm = (nextDays, nextStart, nextEnd, nextOnline) => {
    const nextAvailability = buildAvailabilityByDay(
      nextDays,
      nextStart,
      nextEnd,
      nextOnline
    );

    setForm?.((prev) => ({
      ...prev,
      availabilityByDay: nextAvailability,
    }));
  };

  const commitWithLegacyCallbacks = (nextDays, nextStart, nextEnd, nextOnline) => {
    const nextSelected = new Set(nextDays);

    WEEKDAYS.forEach((day) => {
      const currentSlots = form?.availabilityByDay?.[day.value] || [];
      const shouldExist = nextSelected.has(day.value);

      if (!shouldExist) {
        for (let i = currentSlots.length - 1; i >= 0; i -= 1) {
          removeAvailabilitySlot?.(day.value, i);
        }
        return;
      }

      if (currentSlots.length === 0) {
        addAvailabilitySlot?.(day.value);
      }

      for (let i = currentSlots.length - 1; i > 0; i -= 1) {
        removeAvailabilitySlot?.(day.value, i);
      }

      updateAvailabilitySlot?.(day.value, 0, "start_time", nextStart);
      updateAvailabilitySlot?.(day.value, 0, "end_time", nextEnd);
      updateAvailabilitySlot?.(day.value, 0, "is_online", !!nextOnline);
    });
  };

  const commit = (nextDays, nextStart, nextEnd, nextOnline) => {
    if (setForm) {
      commitWithSetForm(nextDays, nextStart, nextEnd, nextOnline);
    } else {
      commitWithLegacyCallbacks(nextDays, nextStart, nextEnd, nextOnline);
    }
  };

  const handleToggleDay = (dayValue) => {
    const nextDays = selectedSet.has(dayValue)
      ? selectedDays.filter((d) => d !== dayValue)
      : [...selectedDays, dayValue];

    setSelectedDays(nextDays);
    commit(nextDays, startTime, endTime, isOnline);
  };

  const handlePreset = (days) => {
    setSelectedDays(days);
    commit(days, startTime, endTime, isOnline);
  };

  const handleStartTimeChange = (value) => {
    setStartTime(value);
    commit(selectedDays, value, endTime, isOnline);
  };

  const handleEndTimeChange = (value) => {
    setEndTime(value);
    commit(selectedDays, startTime, value, isOnline);
  };

  const handleOnlineChange = (value) => {
    setIsOnline(value);
    commit(selectedDays, startTime, endTime, value);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[30px] border border-white/10 bg-gradient-to-b from-zinc-900/70 to-black/70 p-4 sm:p-5">
        <div className="mb-5 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white">
            <CalendarDays className="w-5 h-5" />
          </div>

          <div>
            <div className="text-lg font-bold text-white">Διαθεσιμότητα</div>
            <div className="mt-1 text-sm text-zinc-400">
              Ορισμός ημερών και ωραρίου εργασίας
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[24px] border border-white/10 bg-black/40 p-3">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-7">
              {WEEKDAYS.map((day) => {
                const active = selectedSet.has(day.value);

                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleToggleDay(day.value)}
                    className={cn(
                      "w-full rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ring-1",
                      active
                        ? "bg-white text-black ring-white/40 shadow-[0_8px_24px_rgba(255,255,255,.10)]"
                        : "bg-white/[0.04] text-white ring-white/10 hover:bg-white/[0.08] hover:ring-white/20",
                      day.value === "sunday" ? "col-span-3 sm:col-span-1" : ""
                    )}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs text-zinc-400 sm:text-sm">
              Γρήγορη επιλογή:
            </span>

            {presets.map((preset) => {
              const active = arraysEqualAsSet(selectedDays, preset.days);

              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePreset(preset.days)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs sm:text-sm transition",
                    active
                      ? "border-white/25 bg-white text-black"
                      : "border-white/10 bg-white/5 text-white/90 hover:bg-white/10 hover:border-white/20"
                  )}
                >
                  {active && <Check className="inline-block w-3.5 h-3.5 mr-1" />}
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TimePickerInput
              label="Ώρα έναρξης"
              value={startTime}
              onChange={handleStartTimeChange}
            />

            <TimePickerInput
              label="Ώρα λήξης"
              value={endTime}
              onChange={handleEndTimeChange}
            />
          </div>

          <div className="rounded-[24px] border border-white/10 bg-gradient-to-b from-zinc-900/60 to-black/60 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                  {isOnline ? (
                    <Wifi className="w-5 h-5 text-white" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-zinc-400" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-base font-semibold text-white">
                    Διαθέσιμος Online
                  </div>
                  <div className="mt-1 text-sm text-zinc-400">
                    Προσφέρεις συνεδρίες μέσω βιντεοκλήσης
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                <OnlineSwitch checked={isOnline} onChange={handleOnlineChange} />
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-dashed border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-400">
            {selectedDays.length === 0 ? (
              "Δεν έχεις επιλέξει ημέρες ακόμη."
            ) : (
              <>
                Έχουν επιλεγεί <span className="font-semibold text-white">{selectedDays.length}</span>{" "}
                ημέρες. Για κάθε επιλεγμένη ημέρα θα αποθηκευτεί ένα slot{" "}
                <span className="font-semibold text-white">
                  {startTime}–{endTime}
                </span>
                {isOnline ? " με δυνατότητα online." : "."}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}