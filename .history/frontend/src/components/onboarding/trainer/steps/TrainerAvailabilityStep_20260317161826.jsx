"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, Laptop, MapPin } from "lucide-react";

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

        return {
          weekday: day.key,
          enabled: Boolean(existing?.enabled),
          start_time: existing?.start_time || DEFAULT_START,
          end_time: existing?.end_time || DEFAULT_END,
          is_online: Boolean(existing?.is_online),
          slotCount: existing?.enabled ? 1 : 0,
        };
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

  const derivedGlobalIsOnline = useMemo(() => {
    if (form?.availability_mode === "online") return true;
    if (form?.availability_mode === "in_person") return false;

    const firstEnabled = availability.find((item) => item.enabled);
    return Boolean(firstEnabled?.is_online);
  }, [availability, form?.availability_mode]);

  const [globalIsOnline, setGlobalIsOnline] = useState(derivedGlobalIsOnline);

  useEffect(() => {
    const hasEnabledDays = availability.some((item) => item.enabled);
    if (hasEnabledDays) {
      setGlobalIsOnline(derivedGlobalIsOnline);
    }
  }, [availability, derivedGlobalIsOnline]);

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
            updateAvailabilitySlot(weekday, 0, "is_online", globalIsOnline);
          }, 0);
        }
      } else {
        for (let i = slots.length - 1; i >= 0; i -= 1) {
          removeAvailabilitySlot(weekday, i);
        }
      }

      return;
    }

    patchAvailability(weekday, {
      enabled,
      is_online: globalIsOnline,
    });
  };

  const setTime = (weekday, field, value) => {
    patchAvailability(weekday, { [field]: value });
  };

  const setGlobalMode = (nextIsOnline) => {
    setGlobalIsOnline(nextIsOnline);

    if (usingParentSlotApi) {
      DAYS.forEach((day) => {
        const slots = form?.availabilityByDay?.[day.key] || [];
        slots.forEach((_, index) => {
          updateAvailabilitySlot(day.key, index, "is_online", nextIsOnline);
        });
      });
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

      return {
        ...prev,
        availability_mode: nextIsOnline ? "online" : "in_person",
        availability: current.map((item) => ({
          ...item,
          is_online: item.enabled ? nextIsOnline : item.is_online,
        })),
      };
    });
  };

  const enabledCount = availability.filter((d) => d.enabled).length;

  return (
    <section className="-mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="border-0 bg-transparent p-0 sm:rounded-[28px] sm:border sm:border-zinc-900 sm:bg-zinc-950/70 sm:p-5">
        <div className="mb-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 hidden h-11 w-11 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950 text-white sm:flex">
              <CalendarDays className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h3 className="text-base font-semibold text-white sm:text-lg">
                Διαθεσιμότητα προπονητή
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                Διάλεξε τις ημέρες και τις ώρες που είσαι διαθέσιμος.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-zinc-300">
                  Ενεργές ημέρες: {enabledCount}
                </span>
                <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-zinc-300">
                  Ώρα Ελλάδας
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
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
                  "rounded-3xl bg-zinc-950/40 p-4",
                  "sm:bg-zinc-950/70",
                  row.enabled ? "sm:ring-1 sm:ring-zinc-800" : "sm:ring-1 sm:ring-zinc-900"
                )}
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEnabled(day.key, !row.enabled)}
                      className={cn(
                        "relative h-7 w-12 rounded-full transition",
                        row.enabled ? "bg-white" : "bg-zinc-800"
                      )}
                      aria-pressed={row.enabled}
                      aria-label={`Ενεργοποίηση ${day.label}`}
                    >
                      <span
                        className={cn(
                          "absolute top-1 h-5 w-5 rounded-full transition",
                          row.enabled ? "left-6 bg-black" : "left-1 bg-white"
                        )}
                      />
                    </button>

                    <div>
                      <p className="text-sm font-semibold text-white sm:text-base">
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
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:w-[470px]">
                      <div className="rounded-2xl bg-zinc-900/80 p-3 ring-1 ring-zinc-800">
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
                          className="w-full rounded-xl border-0 bg-black px-3 py-2 text-sm text-white outline-none ring-1 ring-zinc-800 focus:ring-zinc-700"
                        />
                      </div>

                      <div className="rounded-2xl bg-zinc-900/80 p-3 ring-1 ring-zinc-800">
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
                          className="w-full rounded-xl border-0 bg-black px-3 py-2 text-sm text-white outline-none ring-1 ring-zinc-800 focus:ring-zinc-700"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                {row.slotCount > 1 ? (
                  <div className="mt-3 rounded-2xl bg-amber-950/30 px-3 py-2 text-xs text-amber-200 ring-1 ring-amber-900/30">
                    Αυτή τη στιγμή εμφανίζεται μόνο το πρώτο διαθέσιμο slot της
                    ημέρας σε αυτό το βήμα.
                  </div>
                ) : null}

                {invalidTime ? (
                  <div className="mt-3 rounded-2xl bg-red-950/30 px-3 py-2 text-xs text-red-300 ring-1 ring-red-900/30">
                    Η ώρα λήξης πρέπει να είναι μετά την ώρα έναρξης.
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-3xl bg-zinc-950/80 p-4 ring-1 ring-zinc-800">
          <div className="mb-3 flex items-start gap-3">
            <div className="mt-0.5 hidden h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900 text-white sm:flex">
              {globalIsOnline ? (
                <Laptop className="h-4 w-4" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-white sm:text-base">
                Τρόπος μαθήματος
              </p>
              <p className="text-xs text-zinc-400">
                Η επιλογή εφαρμόζεται σε όλες τις ενεργές ημέρες.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setGlobalMode(false)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition",
                !globalIsOnline
                  ? "bg-white text-black"
                  : "bg-black text-white ring-1 ring-zinc-800 hover:ring-zinc-700"
              )}
            >
              <MapPin className="h-4 w-4" />
              Δια ζώσης
            </button>

            <button
              type="button"
              onClick={() => setGlobalMode(true)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition",
                globalIsOnline
                  ? "bg-white text-black"
                  : "bg-black text-white ring-1 ring-zinc-800 hover:ring-zinc-700"
              )}
            >
              <Laptop className="h-4 w-4" />
              Online
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}