"use client";

import React, { useMemo } from "react";
import { CalendarDays, Clock3, Laptop, MapPin } from "lucide-react";
import FieldCard from "../FieldCard";

const DAYS = [
  { key: "monday", label: "Δευτέρα" },
  { key: "tuesday", label: "Τρίτη" },
  { key: "wednesday", label: "Τετάρτη" },
  { key: "thursday", label: "Πέμπτη" },
  { key: "friday", label: "Παρασκευή" },
  { key: "saturday", label: "Σάββατο" },
  { key: "sunday", label: "Κυριακή" },
];

const DEFAULT_START = "09:00";
const DEFAULT_END = "17:00";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function TrainerAvailabilityStep({
  form,
  setForm,
  addAvailabilitySlot,
  removeAvailabilitySlot,
  updateAvailabilitySlot,
}) {
  const usingParentSlotApi =
    typeof setForm !== "function" &&
    typeof addAvailabilitySlot === "function" &&
    typeof removeAvailabilitySlot === "function" &&
    typeof updateAvailabilitySlot === "function";

  const availability = useMemo(() => {
    if (usingParentSlotApi) {
      return DAYS.map((day) => {
        const slots = form?.availabilityByDay?.[day.key] || [];
        const firstSlot = slots[0] || null;

        return {
          weekday: day.key,
          enabled: slots.length > 0,
          start_time: firstSlot?.start_time || DEFAULT_START,
          end_time: firstSlot?.end_time || DEFAULT_END,
          is_online: Boolean(firstSlot?.is_online),
          slotCount: slots.length,
        };
      });
    }

    if (Array.isArray(form?.availability) && form.availability.length) {
      return DAYS.map((day) => {
        const existing = form.availability.find((x) => x.weekday === day.key);

        return (
          existing || {
            weekday: day.key,
            enabled: false,
            start_time: DEFAULT_START,
            end_time: DEFAULT_END,
            is_online: false,
            slotCount: 0,
          }
        );
      });
    }

    return DAYS.map((day) => ({
      weekday: day.key,
      enabled: false,
      start_time: DEFAULT_START,
      end_time: DEFAULT_END,
      is_online: false,
      slotCount: 0,
    }));
  }, [form?.availabilityByDay, form?.availability, usingParentSlotApi]);

  const patchAvailability = (weekday, patch) => {
    if (usingParentSlotApi) {
      const slots = form?.availabilityByDay?.[weekday] || [];
      if (!slots.length) return;

      if (Object.prototype.hasOwnProperty.call(patch, "start_time")) {
        updateAvailabilitySlot(weekday, 0, "start_time", patch.start_time);
      }

      if (Object.prototype.hasOwnProperty.call(patch, "end_time")) {
        updateAvailabilitySlot(weekday, 0, "end_time", patch.end_time);
      }

      if (Object.prototype.hasOwnProperty.call(patch, "is_online")) {
        updateAvailabilitySlot(weekday, 0, "is_online", patch.is_online);
      }

      return;
    }

    if (typeof setForm !== "function") return;

    setForm((prev) => {
      const current =
        Array.isArray(prev?.availability) && prev.availability.length
          ? prev.availability
          : DAYS.map((day) => ({
              weekday: day.key,
              enabled: false,
              start_time: DEFAULT_START,
              end_time: DEFAULT_END,
              is_online: false,
            }));

      const next = DAYS.map((day) => {
        const existing =
          current.find((item) => item.weekday === day.key) || {
            weekday: day.key,
            enabled: false,
            start_time: DEFAULT_START,
            end_time: DEFAULT_END,
            is_online: false,
          };

        if (day.key !== weekday) return existing;

        return {
          ...existing,
          ...patch,
        };
      });

      return {
        ...prev,
        availability: next,
      };
    });
  };

  const setEnabled = (weekday, enabled) => {
    if (usingParentSlotApi) {
      const slots = form?.availabilityByDay?.[weekday] || [];

      if (enabled) {
        if (!slots.length) {
          addAvailabilitySlot(weekday);

          setTimeout(() => {
            updateAvailabilitySlot(weekday, 0, "start_time", DEFAULT_START);
            updateAvailabilitySlot(weekday, 0, "end_time", DEFAULT_END);
            updateAvailabilitySlot(weekday, 0, "is_online", false);
          }, 0);
        }
      } else {
        for (let i = slots.length - 1; i >= 0; i -= 1) {
          removeAvailabilitySlot(weekday, i);
        }
      }

      return;
    }

    patchAvailability(weekday, { enabled });
  };

  const setTime = (weekday, field, value) => {
    patchAvailability(weekday, { [field]: value });
  };

  const setOnline = (weekday, is_online) => {
    patchAvailability(weekday, { is_online });
  };

  const enabledCount = availability.filter((d) => d.enabled).length;

  return (
    <div className="grid grid-cols-1 gap-4">
      <FieldCard
        icon={CalendarDays}
        label="Διαθεσιμότητα προπονητή"
        hint="Διάλεξε τις ημέρες και τις ώρες που είσαι διαθέσιμος"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  Πρόγραμμα εβδομάδας
                </p>
                <p className="text-xs text-zinc-400">
                  Έχεις ενεργοποιήσει {enabledCount}{" "}
                  {enabledCount === 1 ? "ημέρα" : "ημέρες"}.
                </p>
              </div>

              <div className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300">
                Ώρα Ελλάδας
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {DAYS.map((day) => {
              const row =
                availability.find((item) => item.weekday === day.key) || {
                  weekday: day.key,
                  enabled: false,
                  start_time: DEFAULT_START,
                  end_time: DEFAULT_END,
                  is_online: false,
                  slotCount: 0,
                };

              const invalidTime =
                row.enabled &&
                row.start_time &&
                row.end_time &&
                row.start_time >= row.end_time;

              return (
                <div
                  key={day.key}
                  className={cn(
                    "rounded-2xl border p-4 transition",
                    row.enabled
                      ? "border-white/15 bg-zinc-950"
                      : "border-zinc-800 bg-zinc-950/60"
                  )}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setEnabled(day.key, !row.enabled)}
                        className={cn(
                          "relative h-6 w-11 rounded-full transition",
                          row.enabled ? "bg-white" : "bg-zinc-800"
                        )}
                        aria-pressed={row.enabled}
                      >
                        <span
                          className={cn(
                            "absolute top-1 h-4 w-4 rounded-full transition",
                            row.enabled
                              ? "left-6 bg-black"
                              : "left-1 bg-white"
                          )}
                        />
                      </button>

                      <div>
                        <p className="text-sm font-semibold text-white">
                          {day.label}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {row.enabled
                            ? "Η ημέρα είναι ενεργή"
                            : "Η ημέρα είναι ανενεργή"}
                        </p>
                      </div>
                    </div>

                    {row.enabled ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-[720px]">
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
                          <label className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-400">
                            <Clock3 className="h-4 w-4" />
                            Ώρα έναρξης
                          </label>
                          <input
                            type="time"
                            value={row.start_time || DEFAULT_START}
                            onChange={(e) =>
                              setTime(day.key, "start_time", e.target.value)
                            }
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
                          />
                        </div>

                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
                          <label className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-400">
                            <Clock3 className="h-4 w-4" />
                            Ώρα λήξης
                          </label>
                          <input
                            type="time"
                            value={row.end_time || DEFAULT_END}
                            onChange={(e) =>
                              setTime(day.key, "end_time", e.target.value)
                            }
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
                          />
                        </div>

                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
                          <label className="mb-2 block text-xs font-medium text-zinc-400">
                            Τρόπος μαθήματος
                          </label>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setOnline(day.key, false)}
                              className={cn(
                                "flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
                                !row.is_online
                                  ? "border-white/20 bg-white text-black"
                                  : "border-zinc-700 bg-zinc-950 text-white hover:border-white/20"
                              )}
                            >
                              <MapPin className="h-4 w-4" />
                              Δια ζώσης
                            </button>

                            <button
                              type="button"
                              onClick={() => setOnline(day.key, true)}
                              className={cn(
                                "flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
                                row.is_online
                                  ? "border-white/20 bg-white text-black"
                                  : "border-zinc-700 bg-zinc-950 text-white hover:border-white/20"
                              )}
                            >
                              <Laptop className="h-4 w-4" />
                              Online
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {row.slotCount > 1 ? (
                    <div className="mt-3 rounded-xl border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">
                      Αυτή τη στιγμή εμφανίζεται μόνο το πρώτο διαθέσιμο slot της
                      ημέρας σε αυτό το βήμα.
                    </div>
                  ) : null}

                  {invalidTime ? (
                    <div className="mt-3 rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">
                      Η ώρα λήξης πρέπει να είναι μετά την ώρα έναρξης.
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3">

          </div>
        </div>
      </FieldCard>
    </div>
  );
}