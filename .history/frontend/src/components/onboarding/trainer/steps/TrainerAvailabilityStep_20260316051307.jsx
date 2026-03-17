"use client";

import React from "react";
import {
  CalendarDays,
  Clock3,
  Plus,
  Trash2,
  Globe,
} from "lucide-react";
import { WEEKDAYS, cn } from "../trainerOnboarding.utils";

export default function TrainerAvailabilityStep({
  form,
  addAvailabilitySlot,
  removeAvailabilitySlot,
  updateAvailabilitySlot,
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <div className="flex items-start gap-3">
          <CalendarDays className="w-5 h-5 text-zinc-300 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-white">
              Δήλωσε το εβδομαδιαίο σου πρόγραμμα
            </div>
            <div className="text-sm text-zinc-400 mt-1">
              Μπορείς να βάλεις πολλά slots μέσα στην ίδια μέρα. Για παράδειγμα
              09:00–12:00 και 17:00–21:00.
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {WEEKDAYS.map((day) => {
          const slots = form.availabilityByDay?.[day.value] || [];

          return (
            <div
              key={day.value}
              className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4"
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <div className="text-base font-semibold text-white">
                    {day.label}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {slots.length > 0
                      ? `${slots.length} slot${slots.length > 1 ? "s" : ""}`
                      : "Δεν έχει οριστεί ωράριο"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => addAvailabilitySlot(day.value)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-600"
                >
                  <Plus className="w-4 h-4" />
                  Προσθήκη
                </button>
              </div>

              {slots.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/70 px-4 py-5 text-sm text-zinc-500">
                  Δεν έχεις βάλει ακόμη διαθέσιμη ώρα για τη{" "}
                  {day.label.toLowerCase()}.
                </div>
              ) : (
                <div className="space-y-3">
                  {slots.map((slot, index) => (
                    <div
                      key={`${day.value}_${index}`}
                      className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3">
                        <div>
                          <label className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                            <Clock3 className="w-3.5 h-3.5" />
                            Ώρα έναρξης
                          </label>
                          <input
                            type="time"
                            value={slot.start_time}
                            onChange={(e) =>
                              updateAvailabilitySlot(
                                day.value,
                                index,
                                "start_time",
                                e.target.value
                              )
                            }
                            className="w-full rounded-2xl border border-zinc-800 bg-black px-3 py-3 text-white outline-none focus:border-white/30"
                          />
                        </div>

                        <div>
                          <label className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                            <Clock3 className="w-3.5 h-3.5" />
                            Ώρα λήξης
                          </label>
                          <input
                            type="time"
                            value={slot.end_time}
                            onChange={(e) =>
                              updateAvailabilitySlot(
                                day.value,
                                index,
                                "end_time",
                                e.target.value
                              )
                            }
                            className="w-full rounded-2xl border border-zinc-800 bg-black px-3 py-3 text-white outline-none focus:border-white/30"
                          />
                        </div>

                        <div className="flex sm:flex-col items-center justify-between sm:justify-end gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              updateAvailabilitySlot(
                                day.value,
                                index,
                                "is_online",
                                !slot.is_online
                              )
                            }
                            className={cn(
                              "inline-flex items-center gap-2 rounded-2xl border px-3 py-3 text-sm transition-all",
                              slot.is_online
                                ? "border-white bg-white text-black"
                                : "border-zinc-800 bg-zinc-900 text-zinc-300"
                            )}
                          >
                            <Globe className="w-4 h-4" />
                            Online
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              removeAvailabilitySlot(day.value, index)
                            }
                            className="inline-flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-3 text-sm text-red-200 hover:bg-red-500/15"
                          >
                            <Trash2 className="w-4 h-4" />
                            Αφαίρεση
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}