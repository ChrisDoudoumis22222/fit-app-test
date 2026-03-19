// src/components/avalabilitymodalscheduler.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Laptop,
  MapPin,
  Link as LinkIcon,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";

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

function normalizeTimeString(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.slice(0, 5);
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
  const safe = normalizeTimeString(value || "00:00") || "00:00";
  const [h, m] = safe.split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function buildEmptyRows(defaultIsOnline = false) {
  return DAYS.map((day) => ({
    weekday: day.key,
    enabled: false,
    start_time: DEFAULT_START,
    end_time: DEFAULT_END,
    is_online: Boolean(defaultIsOnline),
  }));
}

function buildRowsFromDb(availabilityRows = [], profileRow = null) {
  const grouped = DAYS.reduce((acc, day) => {
    acc[day.key] = [];
    return acc;
  }, {});

  for (const row of Array.isArray(availabilityRows) ? availabilityRows : []) {
    const weekday = normalizeWeekday(row?.weekday);
    if (!grouped[weekday]) continue;

    grouped[weekday].push({
      start_time: normalizeTimeString(row?.start_time) || DEFAULT_START,
      end_time: normalizeTimeString(row?.end_time) || DEFAULT_END,
      is_online: Boolean(row?.is_online),
    });
  }

  const profileOnline = Boolean(profileRow?.is_online);

  return DAYS.map((day) => {
    const slots = grouped[day.key] || [];

    if (!slots.length) {
      return {
        weekday: day.key,
        enabled: false,
        start_time: DEFAULT_START,
        end_time: DEFAULT_END,
        is_online: profileOnline,
      };
    }

    const sorted = [...slots].sort(
      (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
    );

    const start_time = sorted[0]?.start_time || DEFAULT_START;
    const end_time =
      [...sorted]
        .sort((a, b) => timeToMinutes(b.end_time) - timeToMinutes(a.end_time))[0]
        ?.end_time || DEFAULT_END;

    return {
      weekday: day.key,
      enabled: true,
      start_time,
      end_time,
      is_online: slots.some((x) => Boolean(x.is_online)) || profileOnline,
    };
  });
}

function resolveGlobalMode(profileRow, rows) {
  if (Array.isArray(rows) && rows.some((row) => Boolean(row?.is_online))) {
    return true;
  }

  if (typeof profileRow?.is_online === "boolean") {
    return Boolean(profileRow.is_online);
  }

  return false;
}

function buildSavePayload(rows, globalIsOnline, offlineLocation, onlineLink) {
  const enabledRows = rows.filter((row) => row.enabled);

  return {
    availabilityRows: enabledRows.map((row) => ({
      weekday: row.weekday,
      start_time: normalizeTimeString(row.start_time) || DEFAULT_START,
      end_time: normalizeTimeString(row.end_time) || DEFAULT_END,
      is_online: Boolean(globalIsOnline),
    })),
    selectedDays: enabledRows.map((row) => row.weekday),
    isOnline: Boolean(globalIsOnline),
    availability_mode: globalIsOnline ? "online" : "in_person",
    offline_location: globalIsOnline ? "" : String(offlineLocation || "").trim(),
    online_link: globalIsOnline ? String(onlineLink || "").trim() : "",
  };
}

function DayRow({ day, row, onToggle, onChange }) {
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
                onChange={(e) => onChange("start_time", e.target.value)}
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
                onChange={(e) => onChange("end_time", e.target.value)}
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

export default function AvalabilityModalScheduler({
  open,
  onClose,
  trainerId: trainerIdProp,
  onSaved,
}) {
  const { profile } = useAuth();
  const trainerId = trainerIdProp || profile?.id || null;

  const [mounted, setMounted] = useState(false);

  const [rows, setRows] = useState(buildEmptyRows(false));
  const [globalIsOnline, setGlobalIsOnline] = useState(false);
  const [offlineLocation, setOfflineLocation] = useState("");
  const [onlineLink, setOnlineLink] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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

  useEffect(() => {
    if (!open || !trainerId) return;

    let cancelled = false;

    async function loadFromDb() {
      setLoading(true);
      setErrorMsg("");
      setSuccessMsg("");

      try {
        const [{ data: profileRow, error: profileError }, { data: availRows, error: availError }] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("id,is_online,offline_location,online_link")
              .eq("id", trainerId)
              .maybeSingle(),
            supabase
              .from("trainer_availability")
              .select("weekday,start_time,end_time,is_online")
              .eq("trainer_id", trainerId),
          ]);

        if (profileError) throw profileError;
        if (availError) throw availError;
        if (cancelled) return;

        const builtRows = buildRowsFromDb(availRows || [], profileRow || null);
        const onlineMode = resolveGlobalMode(profileRow, builtRows);

        setRows(builtRows);
        setGlobalIsOnline(onlineMode);
        setOfflineLocation(profileRow?.offline_location || "");
        setOnlineLink(profileRow?.online_link || "");
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setErrorMsg("Αποτυχία φόρτωσης διαθεσιμότητας.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadFromDb();

    return () => {
      cancelled = true;
    };
  }, [open, trainerId]);

  const enabledCount = useMemo(
    () => rows.filter((row) => row.enabled).length,
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

  const canSave = useMemo(() => {
    if (saving || loading) return false;
    if (invalidCount > 0) return false;

    const trimmedOffline = String(offlineLocation || "").trim();
    const trimmedOnline = String(onlineLink || "").trim();

    if (globalIsOnline) {
      if (!trimmedOnline) return false;
      if (trimmedOnline && !/^https?:\/\//i.test(trimmedOnline)) return false;
    } else {
      if (!trimmedOffline) return false;
    }

    return true;
  }, [saving, loading, invalidCount, offlineLocation, onlineLink, globalIsOnline]);

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

  const updateDayValue = (weekday, field, value) => {
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

  const setGlobalMode = (nextIsOnline) => {
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

  async function handleSave() {
    if (!trainerId) {
      setErrorMsg("Δεν βρέθηκε trainer.");
      return;
    }

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const payload = buildSavePayload(
        rows,
        globalIsOnline,
        offlineLocation,
        onlineLink
      );

      if (!payload.isOnline && !payload.offline_location) {
        throw new Error("Συμπλήρωσε την τοποθεσία για τα δια ζώσης μαθήματα.");
      }

      if (payload.isOnline && !payload.online_link) {
        throw new Error("Συμπλήρωσε το online link για τα online μαθήματα.");
      }

      if (payload.isOnline && !/^https?:\/\//i.test(payload.online_link)) {
        throw new Error("Το online link πρέπει να ξεκινά με http:// ή https://");
      }

      const { error: deleteError } = await supabase
        .from("trainer_availability")
        .delete()
        .eq("trainer_id", trainerId);

      if (deleteError) throw deleteError;

      if (payload.availabilityRows.length > 0) {
        const rowsToInsert = payload.availabilityRows.map((row) => ({
          trainer_id: trainerId,
          weekday: row.weekday,
          start_time: row.start_time,
          end_time: row.end_time,
          is_online: row.is_online,
        }));

        const { error: insertError } = await supabase
          .from("trainer_availability")
          .insert(rowsToInsert);

        if (insertError) throw insertError;
      }

      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          is_online: payload.isOnline,
          offline_location: payload.isOnline
            ? null
            : payload.offline_location || null,
          online_link: payload.isOnline
            ? payload.online_link || null
            : null,
        })
        .eq("id", trainerId);

      if (profileUpdateError) throw profileUpdateError;

      setSuccessMsg("Η διαθεσιμότητα αποθηκεύτηκε.");
      onSaved?.(payload);

      setTimeout(() => {
        onClose?.();
      }, 500);
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err?.message || "Αποτυχία αποθήκευσης διαθεσιμότητας."
      );
    } finally {
      setSaving(false);
    }
  }

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
              className="mx-auto flex h-full w-full max-w-[1100px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,.96),rgba(0,0,0,.98))] shadow-[0_24px_80px_rgba(0,0,0,.55)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-end border-b border-white/10 px-4 py-3 sm:px-5">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-300 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="availability-modal-scroll min-h-0 flex-1 overflow-auto px-2 py-2 sm:px-4 sm:py-4">
                {loading ? (
                  <div className="flex min-h-[300px] items-center justify-center">
                    <div className="flex items-center gap-3 text-zinc-300">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Φόρτωση διαθεσιμότητας...</span>
                    </div>
                  </div>
                ) : (
                  <section className="-mx-4 md:mx-0">
                    <div className="md:rounded-[28px] md:border md:border-zinc-900 md:bg-zinc-950/70 md:p-5">
                      {errorMsg ? (
                        <div className="mb-4 rounded-2xl border border-red-900/30 bg-red-950/20 px-4 py-3 text-sm text-red-300">
                          {errorMsg}
                        </div>
                      ) : null}

                      {successMsg ? (
                        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-900/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-300">
                          <CheckCircle2 className="h-4 w-4" />
                          {successMsg}
                        </div>
                      ) : null}

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
                              onChange={(field, value) =>
                                updateDayValue(day.key, field, value)
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
                                onChange={(e) => setOfflineLocation(e.target.value)}
                                placeholder="π.χ. Αμπελόκηποι, Αθήνα ή Οδός / Studio / Γυμναστήριο"
                                className="w-full rounded-xl border border-zinc-800 bg-transparent px-3 py-3 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30 md:bg-black/50"
                              />

                              <p className="mt-2 text-xs leading-5 text-zinc-500">
                                Συμπλήρωσε τη βασική τοποθεσία όπου γίνονται οι
                                δια ζώσης προπονήσεις.
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
                                placeholder="π.χ. https://zoom.us/... ή https://meet.google.com/..."
                                className="w-full rounded-xl border border-zinc-800 bg-transparent px-3 py-3 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-white/30 md:bg-black/50"
                              />

                              <p className="mt-2 text-xs leading-5 text-zinc-500">
                                Βάλε το βασικό link που θα χρησιμοποιείς για
                                online coaching ή online μαθήματα.
                              </p>
                            </div>
                          )}
                        </div>

                        {invalidCount > 0 ? (
                          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-900/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
                            <AlertTriangle className="h-4 w-4" />
                            Υπάρχουν ημέρες με μη έγκυρο ωράριο.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </section>
                )}
              </div>

              <div className="border-t border-white/10 px-4 py-3 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-zinc-400">
                    Ρύθμισε ημέρες, ώρες και τρόπο μαθήματος.
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
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
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