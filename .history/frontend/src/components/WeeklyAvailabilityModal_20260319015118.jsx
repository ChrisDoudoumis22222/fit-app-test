"use client";

import React, { useMemo } from "react";
import { Laptop, MapPin, Link as LinkIcon } from "lucide-react";

const FULL_DAYS = [
  { key: "monday", label: "Δευτέρα" },
  { key: "tuesday", label: "Τρίτη" },
  { key: "wednesday", label: "Τετάρτη" },
  { key: "thursday", label: "Πέμπτη" },
  { key: "friday", label: "Παρασκευή" },
  { key: "saturday", label: "Σάββατο" },
  { key: "sunday", label: "Κυριακή" },
];

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function AvalabilityModalScheduler({
  ALL_DAYS,
  selectedDays,
  setSelectedDays,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  isOnline,
  setIsOnline,
  TimePickerInput,

  // optional future props
  offlineLocation = "",
  setOfflineLocation,
  onlineLink = "",
  setOnlineLink,
}) {
  const days = useMemo(() => {
    const incoming = Array.isArray(ALL_DAYS) && ALL_DAYS.length ? ALL_DAYS : FULL_DAYS;

    return FULL_DAYS.map((day) => {
      const found = incoming.find((d) => d.key === day.key);
      return {
        key: day.key,
        label: day.label,
        shortLabel: found?.label || day.label,
      };
    });
  }, [ALL_DAYS]);

  const enabledCount = useMemo(
    () => days.filter((day) => selectedDays?.has(day.key)).length,
    [days, selectedDays]
  );

  const hasInvalidTime =
    Boolean(startTime) &&
    Boolean(endTime) &&
    String(startTime) >= String(endTime);

  const toggleDay = (dayKey) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayKey)) next.delete(dayKey);
      else next.add(dayKey);
      return next;
    });
  };

  return (
    <section className="-mx-4 md:mx-0">
      <div className="md:rounded-[28px] md:border md:border-zinc-900 md:bg-zinc-950/70 md:p-5">
        <div className="space-y-3">
          {days.map((day) => {
            const enabled = selectedDays?.has(day.key);

            return (
              <div
                key={day.key}
                className="rounded-none border-y border-zinc-800 bg-transparent px-4 py-4 md:rounded-[26px] md:border md:bg-zinc-950/60 md:px-4 md:py-4"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex items-start justify-between gap-3 xl:min-w-[260px] xl:justify-start xl:gap-3">
                    <button
                      type="button"
                      onClick={() => toggleDay(day.key)}
                      className={cn(
                        "relative order-2 mt-0.5 h-8 w-14 shrink-0 rounded-full transition-colors xl:order-1",
                        enabled ? "bg-emerald-500 md:bg-white" : "bg-zinc-700"
                      )}
                      aria-pressed={enabled}
                      aria-label={`Ενεργοποίηση ${day.label}`}
                    >
                      <span
                        className={cn(
                          "absolute top-1 h-6 w-6 rounded-full transition-all",
                          enabled
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
                        {enabled
                          ? "Η ημέρα είναι ενεργή"
                          : "Η ημέρα είναι ανενεργή"}
                      </p>
                    </div>
                  </div>

                  {enabled ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:w-auto xl:min-w-[420px]">
                      <div className="rounded-2xl border border-zinc-800 bg-transparent px-4 py-3 md:bg-zinc-900/80">
                        <label className="mb-2 block text-[11px] font-medium text-zinc-400">
                          Ώρα έναρξης
                        </label>

                        <TimePickerInput
                          label=""
                          value={startTime}
                          onChange={setStartTime}
                          minuteStep={15}
                        />
                      </div>

                      <div className="rounded-2xl border border-zinc-800 bg-transparent px-4 py-3 md:bg-zinc-900/80">
                        <label className="mb-2 block text-[11px] font-medium text-zinc-400">
                          Ώρα λήξης
                        </label>

                        <TimePickerInput
                          label=""
                          value={endTime}
                          onChange={setEndTime}
                          minuteStep={15}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="hidden xl:block xl:flex-1" />
                  )}
                </div>

                {enabled && hasInvalidTime ? (
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
              {isOnline ? (
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
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setIsOnline(false)}
              className={cn(
                "flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-medium transition border",
                !isOnline
                  ? "border-white bg-white text-black"
                  : "border-zinc-800 bg-transparent text-white hover:border-zinc-700 md:bg-zinc-900"
              )}
            >
              <MapPin className="h-4 w-4" />
              <span>Δια ζώσης</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOnline(true)}
              className={cn(
                "flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-medium transition border",
                isOnline
                  ? "border-white bg-white text-black"
                  : "border-zinc-800 bg-transparent text-white hover:border-zinc-700 md:bg-zinc-900"
              )}
            >
              <Laptop className="h-4 w-4" />
              <span>Online</span>
            </button>
          </div>

          {typeof setOfflineLocation === "function" ||
          typeof setOnlineLink === "function" ? (
            <div className="mt-4">
              {!isOnline ? (
                <div className="rounded-2xl border border-zinc-800 bg-transparent px-4 py-3 md:bg-zinc-900/80">
                  <label className="mb-2 flex items-center gap-2 text-[11px] font-medium text-zinc-400">
                    <MapPin className="h-3.5 w-3.5" />
                    Τοποθεσία προπόνησης
                  </label>

                  <input
                    type="text"
                    value={offlineLocation}
                    onChange={(e) => setOfflineLocation?.(e.target.value)}
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
                    onChange={(e) => setOnlineLink?.(e.target.value)}
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
          ) : null}
        </div>
      </div>
    </section>
  );
}