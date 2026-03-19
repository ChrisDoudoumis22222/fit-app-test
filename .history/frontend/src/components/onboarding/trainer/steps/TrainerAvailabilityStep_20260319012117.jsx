"use client";

import React, { useMemo } from "react";
import { Laptop, MapPin, Link as LinkIcon } from "lucide-react";
import QuickBookTimePicker from "../../../quickbook/quickbooktimepicker";

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

function buildDefaultAvailability() {
  return DAYS.map((day) => ({
    weekday: day.key,
    enabled: false,
    start_time: DEFAULT_START,
    end_time: DEFAULT_END,
    is_online: false,
    slotCount: 0,
  }));
}

function fakeEvent(value) {
  return { target: { value } };
}

export default function TrainerAvailabilityStep({
  form,
  setField,
  setForm,
  addAvailabilitySlot,
  removeAvailabilitySlot,
  updateAvailabilitySlot,
}) {
  const usingParentSlotApi =
    typeof addAvailabilitySlot === "function" &&
    typeof removeAvailabilitySlot === "function" &&
    typeof updateAvailabilitySlot === "function";

  const canWriteDirectly =
    typeof setForm === "function" || typeof setField === "function";

  const updatePlainField = (key, value) => {
    if (typeof setForm === "function") {
      setForm((prev) => ({
        ...prev,
        [key]: value,
      }));
      return;
    }

    if (typeof setField === "function") {
      setField(key)(fakeEvent(value));
    }
  };

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

    return buildDefaultAvailability();
  }, [form?.availabilityByDay, form?.availability, usingParentSlotApi]);

  const globalIsOnline = useMemo(() => {
    if (form?.availability_mode === "online") return true;
    if (form?.availability_mode === "in_person") return false;

    const firstEnabled = availability.find((item) => item.enabled);
    return Boolean(firstEnabled?.is_online);
  }, [availability, form?.availability_mode]);

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
    updatePlainField("availability_mode", nextIsOnline ? "online" : "in_person");
    updatePlainField("is_online", nextIsOnline);

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
        is_online: nextIsOnline,
        availability: current.map((item) => ({
          ...item,
          is_online: item.enabled ? nextIsOnline : item.is_online,
        })),
      };
    });
  };

  const enabledCount = availability.filter((d) => d.enabled).length;
  const offlineLocation = form?.offline_location || "";
  const onlineLink = form?.online_link || "";

  return (
    <section className="-mx-4 md:mx-0">
      <div className="md:rounded-[28px] md:border md:border-zinc-900 md:bg-zinc-950/70 md:p-5">
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
                className="rounded-none border-y border-zinc-800 bg-transparent px-4 py-4 md:rounded-[26px] md:border md:bg-zinc-950/60 md:px-4 md:py-4"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex items-start justify-between gap-3 xl:min-w-[260px] xl:justify-start xl:gap-3">
                    <button
                      type="button"
                      onClick={() => setEnabled(day.key, !row.enabled)}
                      className={cn(
                        "relative order-2 mt-0.5 h-8 w-14 shrink-0 rounded-full transition-colors xl:order-1",
                        row.enabled
                          ? "bg-emerald-500 md:bg-white"
                          : "bg-zinc-700"
                      )}
                      aria-pressed={row.enabled}
                      aria-label={`Ενεργοποίηση ${day.label}`}
                    >
                      <span
                        className={cn(
                          "absolute top-1 h-6 w-6 rounded-full transition-all",
                          row.enabled
                            ? "left-7 bg-white md:bg-black"
                            : "left-1 bg-white"
                        )}
                      />
                    </button>

                    <div className="order-1 min-w-0 flex-1 xl:order-2">
                      <p className="text-sm font-semibold text-white md:text-base">
                        {day.label}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        {row.enabled
                          ? "Η ημέρα είναι ενεργή"
                          : "Η ημέρα είναι ανενεργή"}
                      </p>
                    </div>
                  </div>

                  {row.enabled ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:w-auto xl:min-w-[420px]">
                      <div className="rounded-2xl border border-zinc-800 bg-transparent px-4 py-3 md:bg-zinc-900/80">
                        <label className="mb-2 block text-[11px] font-medium text-zinc-400">
                          Ώρα έναρξης
                        </label>

                        <QuickBookTimePicker
                          value={row.start_time || DEFAULT_START}
                          onChange={(val) =>
                            setTime(day.key, "start_time", val)
                          }
                          minuteStep={15}
                          buttonClassName="w-full border-0 bg-transparent p-0 text-sm font-medium text-white outline-none shadow-none ring-0 md:rounded-xl md:border md:border-zinc-800 md:bg-black/50 md:px-3 md:py-2.5"
                        />
                      </div>

                      <div className="rounded-2xl border border-zinc-800 bg-transparent px-4 py-3 md:bg-zinc-900/80">
                        <label className="mb-2 block text-[11px] font-medium text-zinc-400">
                          Ώρα λήξης
                        </label>

                        <QuickBookTimePicker
                          value={row.end_time || DEFAULT_END}
                          onChange={(val) => setTime(day.key, "end_time", val)}
                          minuteStep={15}
                          buttonClassName="w-full border-0 bg-transparent p-0 text-sm font-medium text-white outline-none shadow-none ring-0 md:rounded-xl md:border md:border-zinc-800 md:bg-black/50 md:px-3 md:py-2.5"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="hidden xl:block xl:flex-1" />
                  )}
                </div>

                {row.slotCount > 1 ? (
                  <div className="mt-3 rounded-2xl border border-amber-900/30 bg-amber-950/20 px-3 py-2 text-xs leading-5 text-amber-200">
                    Αυτή τη στιγμή εμφανίζεται μόνο το πρώτο διαθέσιμο slot της
                    ημέρας σε αυτό το βήμα.
                  </div>
                ) : null}

                {invalidTime ? (
                  <div className="mt-3 rounded-2xl border border-red-900/30 bg-red-950/20 px-3 py-2 text-xs leading-5 text-red-300">
                    Η ώρα λήξης πρέπει να είναι μετά την ώρα έναρξης.
                  </div>
                ) : null}
              </div>
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
                {enabledCount > 0 ? ` Ενεργές ημέρες: ${enabledCount}.` : ""}
              </p>
              {!canWriteDirectly ? (
                <p className="mt-1 text-xs text-amber-400">
                  Χρειάζεται να περαστεί setForm ή setField από το parent για να
                  αποθηκεύονται τα νέα πεδία.
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setGlobalMode(false)}
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
              onClick={() => setGlobalMode(true)}
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
                  onChange={(e) =>
                    updatePlainField("offline_location", e.target.value)
                  }
                  placeholder="π.χ. Αμπελόκηποι, Αθήνα ή Οδός / Studio / Γυμναστήριο"
                  className="w-full rounded-xl border border-zinc-800 bg-transparent px-3 py-3 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30 md:bg-black/50"
                />

                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  Συμπλήρωσε τη βασική τοποθεσία όπου γίνονται οι δια ζώσης
                  προπονήσεις.
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
                  onChange={(e) =>
                    updatePlainField("online_link", e.target.value)
                  }
                  placeholder="π.χ. Zoom / Teams / Google Meet / Discord / WhatsApp link"
                  className="w-full rounded-xl border border-zinc-800 bg-transparent px-3 py-3 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30 md:bg-black/50"
                />

                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  Βάλε το βασικό link που θα χρησιμοποιείς για online coaching ή
                  online μαθήματα.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}