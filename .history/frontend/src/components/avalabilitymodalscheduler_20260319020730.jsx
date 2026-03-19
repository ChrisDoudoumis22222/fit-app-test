"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  CalendarDays,
  Clock,
  Wifi,
  WifiOff,
  ArrowUpRight,
} from "lucide-react";
import WeeklyAvailabilityModal from "./WeeklyAvailabilityModal";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function AvalabilityModalScheduler({
  ALL_DAYS,
  selectedDays,
  setSelectedDays,
  selectedDaysDirty,
  startTime,
  setStartTime,
  startTimeDirty,
  endTime,
  setEndTime,
  endTimeDirty,
  isOnline,
  setIsOnline,
  isOnlineDirty,
  availabilityDirty,
  PremiumCard,
  TimePickerInput,
  PremiumSwitch,
}) {
  const [plannerOpen, setPlannerOpen] = useState(false);

  const weeklyAvailability = useMemo(() => {
    return ALL_DAYS.filter((d) => selectedDays?.has?.(d.key)).map((d) => ({
      id: `${d.key}-${startTime}-${endTime}-${isOnline ? "online" : "offline"}`,
      weekday: d.key,
      start_time: startTime,
      end_time: endTime,
      is_online: !!isOnline,
    }));
  }, [ALL_DAYS, selectedDays, startTime, endTime, isOnline]);

  return (
    <>
      <PremiumCard
        className="min-h-[460px]"
        title="Διαθεσιμότητα"
        subtitle="Ορισμός ημερών και ωραρίου εργασίας"
        icon={<Calendar className="h-6 w-6" />}
        gradient
        dirty={availabilityDirty}
        action={
          <button
            type="button"
            onClick={() => setPlannerOpen(true)}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3",
              "text-sm font-semibold text-white transition-all duration-200",
              "hover:bg-white/10 hover:border-white/20 hover:shadow-[0_8px_24px_rgba(255,255,255,0.08)]",
              "active:scale-[0.98] sm:w-auto"
            )}
          >
            <CalendarDays className="h-4 w-4" />
            <span className="text-sm font-semibold text-white">Περισσότερα</span>
            <ArrowUpRight className="h-4 w-4 text-zinc-400" />
          </button>
        }
      >
        <div className="space-y-5 overflow-visible">
          <div
            className={[
              "-mx-3 mt-3 px-3 py-4 sm:mx-0 sm:mt-0 sm:rounded-2xl sm:border sm:p-3",
              selectedDaysDirty
                ? "halo sm:border-white/10"
                : "sm:border-white/10 sm:bg-black/30",
            ].join(" ")}
          >
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-7">
              {ALL_DAYS.map((d) => {
                const active = selectedDays?.has?.(d.key);

                return (
                  <motion.button
                    key={d.key}
                    type="button"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() =>
                      setSelectedDays((prev) => {
                        const next = new Set(prev);
                        next.has(d.key) ? next.delete(d.key) : next.add(d.key);
                        return next;
                      })
                    }
                    className={`w-full justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-sm ring-1 transition ${
                      d.key === "sunday" ? "col-span-3 sm:col-span-1" : ""
                    } ${
                      active
                        ? "bg-white text-black ring-white/30 shadow-white/20"
                        : "bg-white/5 text-white/90 ring-white/10 hover:bg-white/10 hover:ring-white/20"
                    }`}
                  >
                    {d.label}
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 overflow-visible md:grid-cols-2">
            <TimePickerInput
              label="Ώρα έναρξης"
              icon={<Clock className="h-4 w-4" />}
              value={startTime}
              onChange={setStartTime}
              dirty={startTimeDirty}
            />

            <TimePickerInput
              label="Ώρα λήξης"
              icon={<Clock className="h-4 w-4" />}
              value={endTime}
              onChange={setEndTime}
              dirty={endTimeDirty}
            />
          </div>

          <div className="-mx-3 mt-3 px-3 py-5 sm:mx-0 sm:mt-0 sm:rounded-2xl sm:border sm:border-white/10 sm:bg-zinc-800/20 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/14 to-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_8px_20px_rgba(0,0,0,0.22)] sm:h-14 sm:w-14">
                  {isOnline ? (
                    <Wifi className="h-5 w-5 text-white sm:h-6 sm:w-6" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-zinc-400 sm:h-6 sm:w-6" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-[15px] font-semibold text-white sm:text-base">
                    Διαθέσιμος Online
                  </div>
                  <div className="mt-1 text-[13px] leading-6 text-zinc-400 sm:mt-1.5 sm:text-sm sm:leading-7">
                    Προσφέρεις συνεδρίες μέσω βιντεοκλήσης
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-center">
                <PremiumSwitch
                  checked={isOnline}
                  onChange={setIsOnline}
                  dirty={isOnlineDirty}
                />
              </div>
            </div>
          </div>
        </div>
      </PremiumCard>

      <WeeklyAvailabilityModal
        open={plannerOpen}
        onClose={() => setPlannerOpen(false)}
        availability={weeklyAvailability}
        title="Εβδομαδιαία Προβολή Διαθεσιμότητας"
        subtitle="Όλες οι επιλεγμένες ημέρες, ώρες και τύπος συνεδρίας"
      />
    </>
  );
}