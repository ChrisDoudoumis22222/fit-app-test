"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Sunset,
  Moon,
  Wifi,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar as CalendarPlus,
  MapPin,
  CalendarIcon,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import BookingConfirmationModal from "./modals/BookingModalPopup";

/* ----------------------------- types ----------------------------- */
type WeekdayKey =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

interface Holiday {
  starts_on: string;
  ends_on: string;
  reason?: string | null;
}

interface WeeklyAvailability {
  weekday: WeekdayKey;
  start_time: string;
  end_time: string;
  is_online?: boolean | null;
}

type BookingStatus = "pending" | "accepted" | "declined" | "cancelled";

interface BookingRow {
  date: string;
  start_time: string;
  end_time: string;
  status?: BookingStatus;
}

interface OpenSlotRow {
  date: string;
  start_time: string;
  end_time: string;
  is_online?: boolean | null;
  status?: string | null;
}

type PeriodFilter = "all" | "morning" | "afternoon" | "night";

interface BannerState {
  type: "success" | "error";
  title: string;
  message: string;
}

interface AllInOneBookingProps {
  trainerId: string;
  trainerName?: string;
  weeklyAvailability?: WeeklyAvailability[];
  holidays?: Holiday[];
}

/* ----------------------------- helpers ----------------------------- */
const months = [
  "Ιανουάριος",
  "Φεβρουάριος",
  "Μάρτιος",
  "Απρίλιος",
  "Μάιος",
  "Ιούνιος",
  "Ιούλιος",
  "Αύγουστος",
  "Σεπτέμβριος",
  "Οκτώβριος",
  "Νοέμβριος",
  "Δεκέμβριος",
] as const;

const weekDays = ["ΔΕΥ", "ΤΡΙ", "ΤΕΤ", "ΠΕΜ", "ΠΑΡ", "ΣΑΒ", "ΚΥΡ"] as const;

const localDateISO = (offsetDays = 0): string => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const toISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const hhmm = (t: string): string => t.match(/^(\d{1,2}:\d{2})/)?.[1] ?? t;

const timeToMinutes = (t: string): number => {
  const m = (t || "").match(/^(\d{1,2}):(\d{2})/);
  if (!m) return Number.NaN;
  return Number.parseInt(m[1], 10) * 60 + Number.parseInt(m[2], 10);
};

const overlaps = (
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean => {
  const as = timeToMinutes(hhmm(aStart));
  const ae = timeToMinutes(hhmm(aEnd));
  const bs = timeToMinutes(hhmm(bStart));
  const be = timeToMinutes(hhmm(bEnd));
  return as < be && ae > bs;
};

const within = (d: string, f: string, t: string): boolean => {
  const D = new Date(`${d}T00:00:00`);
  const F = new Date(`${f}T00:00:00`);
  const T = new Date(`${t}T00:00:00`);
  return D >= F && D <= new Date(T.getTime() + 86399999);
};

const fmtDate = (d?: string | null): string => {
  if (!d) return "";
  try {
    return new Date(`${d}T00:00:00`).toLocaleDateString("el-GR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return d;
  }
};

const fmtDateShort = (d?: string | null): string => {
  if (!d) return "";
  try {
    return new Date(`${d}T00:00:00`).toLocaleDateString("el-GR", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return d;
  }
};

const getPeriodFromTime = (start: string): PeriodFilter => {
  const m = timeToMinutes(hhmm(start));
  if (!Number.isFinite(m)) return "morning";
  if (m < 12 * 60) return "morning";
  if (m < 18 * 60) return "afternoon";
  return "night";
};

const formatSlotLabel = (start: string) => hhmm(start);

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

/* ----------------------------- ui bits ----------------------------- */
const ActionButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}> = ({
  children,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
  disabled = false,
}) => {
  const base =
    "inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-[14px] sm:text-[15px] font-semibold transition-all duration-200 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50";

  const variants = {
    primary:
      "bg-white text-black hover:bg-zinc-100 shadow-[0_8px_24px_rgba(255,255,255,0.12)]",
    secondary:
      "border border-white/10 bg-transparent text-zinc-300 hover:border-white/20 hover:text-white",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const StepPill: React.FC<{
  step: number;
  label: string;
  active: boolean;
  done: boolean;
  compact?: boolean;
}> = ({ step, label, active, done, compact = false }) => {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-3 py-3 transition-all",
        active
          ? "border-white/15 bg-white/[0.06]"
          : done
          ? "border-emerald-500/20 bg-emerald-500/10"
          : "border-white/8 bg-white/[0.03]"
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl text-sm font-semibold",
          compact ? "h-7 w-7" : "h-8 w-8",
          active
            ? "bg-white text-black"
            : done
            ? "bg-emerald-500/20 text-emerald-300"
            : "bg-white/[0.06] text-zinc-400"
        )}
      >
        {done ? "✓" : step}
      </div>

      <span
        className={cn(
          "min-w-0 truncate font-medium",
          compact ? "text-xs" : "text-sm",
          active ? "text-white" : done ? "text-emerald-200" : "text-zinc-400"
        )}
      >
        {label}
      </span>
    </div>
  );
};

/* --------------------- Notification Banner --------------------- */
const NotificationBanner: React.FC<BannerState & { onClose: () => void }> = ({
  type,
  title,
  message,
  onClose,
}) => {
  const isSuccess = type === "success";

  return (
    <div className="fixed left-4 right-4 top-4 z-[120] lg:left-1/2 lg:w-full lg:max-w-md lg:-translate-x-1/2">
      <div
        className={cn(
          "relative rounded-2xl backdrop-blur-xl shadow-2xl",
          isSuccess ? "bg-emerald-500/90 text-white" : "bg-red-500/90 text-white"
        )}
      >
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
            {isSuccess ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-sm opacity-90">{message}</p>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
            aria-label="Κλείσιμο"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

/* --------------------------- main component --------------------------- */
export const AllInOneBooking: React.FC<AllInOneBookingProps> = ({
  trainerId,
  trainerName = "Προπονητής",
  weeklyAvailability: weeklyAvailProp,
  holidays: holidaysProp,
}) => {
  const rangeStartISO = useMemo(() => localDateISO(0), []);
  const rangeEndISO = useMemo(() => localDateISO(29), []);
  const minDateObj = useMemo(
    () => new Date(`${rangeStartISO}T00:00:00`),
    [rangeStartISO]
  );
  const maxDateObj = useMemo(
    () => new Date(`${rangeEndISO}T00:00:00`),
    [rangeEndISO]
  );

  const initialIndex = minDateObj.getFullYear() * 12 + minDateObj.getMonth();
  const maxIndex = maxDateObj.getFullYear() * 12 + maxDateObj.getMonth();

  const [monthIndex, setMonthIndex] = useState<number>(initialIndex);
  const displayYear = Math.floor(monthIndex / 12);
  const displayMonth = monthIndex % 12;
  const canPrevMonth = monthIndex > initialIndex;
  const canNextMonth = monthIndex < maxIndex;

  const [notes, setNotes] = useState<string>("");
  const [selectedDateISO, setSelectedDateISO] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const [, setHolidays] = useState<Holiday[]>([]);
  const [, setWeeklyAvailability] = useState<WeeklyAvailability[]>([]);
  const [, setBooked] = useState<BookingRow[]>([]);
  const [openRows, setOpenRows] = useState<OpenSlotRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [banner, setBanner] = useState<BannerState | null>(null);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    status: "success" | "error";
    errorMessage?: string;
  }>({ isOpen: false, status: "success" });

  const [lastBooking, setLastBooking] = useState<{
    date: string;
    start_time: string;
    end_time: string;
    is_online?: boolean | null;
    booking_id?: string;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    if (!trainerId) return;

    (async () => {
      try {
        setLoading(true);

        let hol = holidaysProp;
        if (!hol) {
          const { data: holData, error: holErr } = await supabase
            .from("trainer_holidays")
            .select("starts_on, ends_on, reason")
            .eq("trainer_id", trainerId);

          if (holErr) throw holErr;
          hol = (holData ?? []) as Holiday[];
        }

        let wav = weeklyAvailProp;
        if (!wav) {
          const { data: avData, error: avErr } = await supabase
            .from("trainer_availability")
            .select("weekday, start_time, end_time, is_online")
            .eq("trainer_id", trainerId);

          if (avErr) throw avErr;
          wav = (avData ?? []) as WeeklyAvailability[];
        }

        const { data: bookedData, error: bookedErr } = await supabase
          .from("trainer_bookings")
          .select("date,start_time,end_time,status")
          .eq("trainer_id", trainerId)
          .gte("date", rangeStartISO)
          .lte("date", rangeEndISO)
          .in("status", ["pending", "accepted"]);

        if (bookedErr) throw bookedErr;
        const bookedRows = (bookedData ?? []) as BookingRow[];

        const { data: openData, error: openErr } = await supabase
          .from("trainer_open_slots")
          .select("date,start_time,end_time,is_online,status")
          .eq("trainer_id", trainerId)
          .gte("date", rangeStartISO)
          .lte("date", rangeEndISO)
          .order("date", { ascending: true })
          .order("start_time", { ascending: true });

        if (openErr) throw openErr;
        if (!alive) return;

        setHolidays(hol || []);
        setWeeklyAvailability(wav || []);
        setBooked(bookedRows || []);

        const isHoliday = (d: string) =>
          (hol || []).some((h) => within(d, h.starts_on, h.ends_on));

        const usableStatus = (s?: string | null) => {
          const v = (s ?? "").toString().trim().toLowerCase();
          return ["", "open", "available", "free", "publish", "published", "true", "1"].includes(v);
        };

        let filtered = ((openData ?? []) as OpenSlotRow[]).filter((r) => {
          if (!usableStatus(r.status)) return false;
          if (isHoliday(r.date)) return false;

          const overlap = (bookedRows || []).some(
            (b) =>
              b.date === r.date &&
              overlaps(r.start_time, r.end_time, b.start_time, b.end_time)
          );

          return !overlap;
        });

        if (filtered.length === 0 && (wav || []).length > 0) {
          const start = new Date(`${rangeStartISO}T00:00:00`);
          const weekdayNames: WeekdayKey[] = [
            "sunday",
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
          ];

          const derived: OpenSlotRow[] = [];

          for (let i = 0; i < 30; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const iso = toISODate(d);
            if (isHoliday(iso)) continue;

            const weekdayKey = weekdayNames[d.getDay()];
            const daySlots = (wav || []).filter((x) => x.weekday === weekdayKey);

            for (const s of daySlots) {
              const overlap = (bookedRows || []).some(
                (b) =>
                  b.date === iso &&
                  overlaps(s.start_time, s.end_time, b.start_time, b.end_time)
              );

              if (!overlap) {
                derived.push({
                  date: iso,
                  start_time: hhmm(s.start_time),
                  end_time: hhmm(s.end_time),
                  is_online: !!s.is_online,
                  status: "open",
                });
              }
            }
          }

          filtered = derived.sort(
            (a, b) =>
              a.date.localeCompare(b.date) ||
              timeToMinutes(hhmm(a.start_time)) - timeToMinutes(hhmm(b.start_time))
          );
        }

        setOpenRows(filtered);
      } catch (e) {
        console.error("availability load error:", e);
        if (alive) {
          setBanner({
            type: "error",
            title: "Σφάλμα",
            message: "Αδυναμία φόρτωσης διαθεσιμότητας.",
          });
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [trainerId, rangeStartISO, rangeEndISO, holidaysProp, weeklyAvailProp]);

  const byDate = useMemo(() => {
    const m = new Map<string, OpenSlotRow[]>();

    for (let i = 0; i < openRows.length; i++) {
      const r = openRows[i];
      if (!m.has(r.date)) m.set(r.date, []);
      m.get(r.date)!.push(r);
    }

    m.forEach((arr) => {
      arr.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
    });

    return m;
  }, [openRows]);

  const availableDateSet = useMemo(
    () => new Set<string>(Array.from(byDate.keys())),
    [byDate]
  );

  const getDaysInMonth = (month: number, year: number) =>
    new Date(year, month + 1, 0).getDate();

  const getFirstDayOfMonthIndex = (month: number, year: number) => {
    const firstDay = new Date(year, month, 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1;
  };

  const daysInMonth = getDaysInMonth(displayMonth, displayYear);
  const firstDayIdx = getFirstDayOfMonthIndex(displayMonth, displayYear);

  const calendarDays: Array<number | null> = Array.from({ length: 42 }, (_, i) => {
    const dayNumber = i - firstDayIdx + 1;
    return dayNumber > 0 && dayNumber <= daysInMonth ? dayNumber : null;
  });

  const shiftMonth = (delta: number) => {
    const next = Math.min(Math.max(monthIndex + delta, initialIndex), maxIndex);
    setMonthIndex(next);
    setSelectedDateISO(null);
    setSelectedKey(null);
    setNotes("");
    setSelectedPeriod("all");
  };

  const daySlots: OpenSlotRow[] = useMemo(() => {
    if (!selectedDateISO) return [];
    const list = byDate.get(selectedDateISO) || [];
    if (selectedPeriod === "all") return list;
    return list.filter((s) => getPeriodFromTime(s.start_time) === selectedPeriod);
  }, [selectedDateISO, selectedPeriod, byDate]);

  const selectedSlot = useMemo(() => {
    if (!selectedKey) return null;
    const [date, start_time, end_time] = selectedKey.split("|");
    return (
      openRows.find(
        (s) =>
          s.date === date &&
          hhmm(s.start_time) === hhmm(start_time) &&
          hhmm(s.end_time) === hhmm(end_time)
      ) || {
        date,
        start_time,
        end_time,
        is_online: false,
        status: "open",
      }
    );
  }, [selectedKey, openRows]);

  const dayMeta = (dayNumber: number | null) => {
    if (!dayNumber) {
      return { iso: null as string | null, inRange: false, hasSlots: false };
    }

    const dObj = new Date(displayYear, displayMonth, dayNumber);
    const iso = toISODate(dObj);
    const inRange = dObj >= minDateObj && dObj <= maxDateObj;
    const hasSlots = availableDateSet.has(iso);

    return { iso, inRange, hasSlots };
  };

  const hasDateSelection = !!selectedDateISO;
  const hasSlotSelection = !!selectedKey;
  const currentStep = hasSlotSelection ? 3 : hasDateSelection ? 2 : 1;

  const periodCounts = useMemo(() => {
    if (!selectedDateISO) return { all: 0, morning: 0, afternoon: 0, night: 0 };
    const allSlots = byDate.get(selectedDateISO) || [];
    return {
      all: allSlots.length,
      morning: allSlots.filter((s) => getPeriodFromTime(s.start_time) === "morning").length,
      afternoon: allSlots.filter((s) => getPeriodFromTime(s.start_time) === "afternoon").length,
      night: allSlots.filter((s) => getPeriodFromTime(s.start_time) === "night").length,
    };
  }, [selectedDateISO, byDate]);

  const goBackOneStep = () => {
    if (hasSlotSelection) {
      setSelectedKey(null);
      return;
    }

    if (hasDateSelection) {
      setSelectedDateISO(null);
      setSelectedKey(null);
      setNotes("");
      setSelectedPeriod("all");
    }
  };

  const handleContinue = async () => {
    if (!selectedSlot) return;

    const { data: sess } = await supabase.auth.getSession();
    const userId = sess?.session?.user?.id;

    if (!userId) {
      setModalState({
        isOpen: true,
        status: "error",
        errorMessage: "Συνδέσου για να ολοκληρώσεις την κράτηση.",
      });
      return;
    }

    try {
      setSubmitting(true);
      setBanner(null);

      const startMinutes = timeToMinutes(hhmm(selectedSlot.start_time));
      const endMinutes = timeToMinutes(hhmm(selectedSlot.end_time));
      const duration = Math.max(0, endMinutes - startMinutes) || 60;

      const payload = {
        trainer_id: trainerId,
        user_id: userId,
        date: selectedSlot.date,
        start_time: hhmm(selectedSlot.start_time),
        end_time: hhmm(selectedSlot.end_time),
        duration_min: duration,
        break_before_min: 0,
        break_after_min: 0,
        note: notes.trim() || null,
        status: "pending" as BookingStatus,
        is_online: !!selectedSlot.is_online,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("trainer_bookings")
        .insert([payload])
        .select("id,date,start_time,end_time,is_online")
        .single();

      if (error) throw error;

      setLastBooking({
        date: data.date,
        start_time: hhmm(data.start_time),
        end_time: hhmm(data.end_time),
        is_online: !!data.is_online,
        booking_id: data.id,
      });

      setModalState({ isOpen: true, status: "success" });
      setNotes("");
      setSelectedKey(null);

      setOpenRows((prev) =>
        prev.filter(
          (s) =>
            !(
              s.date === selectedSlot.date &&
              hhmm(s.start_time) === hhmm(selectedSlot.start_time) &&
              hhmm(s.end_time) === hhmm(selectedSlot.end_time)
            )
        )
      );

      const remainingForDay = (byDate.get(selectedSlot.date) || []).filter(
        (s) =>
          !(
            hhmm(s.start_time) === hhmm(selectedSlot.start_time) &&
            hhmm(s.end_time) === hhmm(selectedSlot.end_time)
          )
      );

      if (remainingForDay.length === 0) {
        setSelectedDateISO(null);
      }
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Κάτι πήγε στραβά. Παρακαλώ δοκίμασε ξανά.";

      setModalState({ isOpen: true, status: "error", errorMessage: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!lastBooking?.booking_id) return;

    try {
      const { error } = await supabase
        .from("trainer_bookings")
        .update({ status: "cancelled" })
        .eq("id", lastBooking.booking_id);

      if (error) throw error;

      setOpenRows((prev) =>
        [
          ...prev,
          {
            date: lastBooking.date,
            start_time: lastBooking.start_time,
            end_time: lastBooking.end_time,
            is_online: lastBooking.is_online,
            status: "open",
          },
        ].sort(
          (a, b) =>
            a.date.localeCompare(b.date) ||
            timeToMinutes(hhmm(a.start_time)) - timeToMinutes(hhmm(b.start_time))
        )
      );

      setBanner({
        type: "error",
        title: "Η κράτηση ακυρώθηκε",
        message: "Το ραντεβού σου ακυρώθηκε επιτυχώς.",
      });

      setLastBooking(null);
    } catch (e) {
      console.error("cancel booking error:", e);
      setBanner({
        type: "error",
        title: "Σφάλμα",
        message: "Δεν ήταν δυνατή η ακύρωση της κράτησης.",
      });
    }
  };

  return (
    <div className="w-full">
      {banner && (
        <NotificationBanner
          type={banner.type}
          title={banner.title}
          message={banner.message}
          onClose={() => setBanner(null)}
        />
      )}

      <BookingConfirmationModal
        isOpen={modalState.isOpen}
        status={modalState.status}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        onCancel={handleCancelBooking}
        bookingDetails={lastBooking ?? undefined}
        trainerName={trainerName}
        errorMessage={modalState.errorMessage}
      />

      <div className="mx-auto w-full max-w-7xl">
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-zinc-950/95 shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_42%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02),rgba(0,0,0,0.18))]" />
          </div>

          <div className="relative z-10 lg:flex">
            <aside className="hidden w-full max-w-[320px] shrink-0 border-r border-white/10 bg-white/[0.03] lg:flex lg:flex-col">
              <div className="border-b border-white/10 px-6 py-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-black shadow-[0_10px_25px_rgba(255,255,255,0.12)]">
                    <CalendarIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold leading-tight text-white">
                      Κλείσε Ραντεβού
                    </h1>
                    <p className="mt-1 text-sm text-zinc-400">με {trainerName}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 px-4 py-4">
                <StepPill step={1} label="Ημερομηνία" active={currentStep === 1} done={currentStep > 1} />
                <StepPill step={2} label="Ώρα" active={currentStep === 2} done={currentStep > 2} />
                <StepPill step={3} label="Ολοκλήρωση" active={currentStep === 3} done={false} />
              </div>

              <div className="px-4 pb-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Επιλογή</p>

                  <div className="mt-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-xl bg-white/[0.06] p-2">
                        <CalendarIcon className="h-4 w-4 text-zinc-300" />
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500">Ημερομηνία</div>
                        <div className="text-sm font-semibold text-white">
                          {selectedDateISO ? fmtDateShort(selectedDateISO) : "Δεν έχει επιλεγεί"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-xl bg-white/[0.06] p-2">
                        <Clock className="h-4 w-4 text-zinc-300" />
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500">Ώρα</div>
                        <div className="text-sm font-semibold text-white">
                          {selectedSlot
                            ? `${hhmm(selectedSlot.start_time)} - ${hhmm(selectedSlot.end_time)}`
                            : "Δεν έχει επιλεγεί"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-xl bg-white/[0.06] p-2">
                        {selectedSlot?.is_online ? (
                          <Wifi className="h-4 w-4 text-zinc-300" />
                        ) : (
                          <MapPin className="h-4 w-4 text-zinc-300" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-zinc-500">Τύπος</div>
                        <div className="text-sm font-semibold text-white">
                          {selectedSlot
                            ? selectedSlot.is_online
                              ? "Online"
                              : "Δια ζώσης"
                            : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto border-t border-white/10 p-4">
                <p className="text-xs leading-relaxed text-zinc-500">
                  Επίλεξε πρώτα ημερομηνία, μετά ώρα και στο τέλος ολοκλήρωσε την κράτησή σου.
                </p>
              </div>
            </aside>

            <div className="min-w-0 flex-1 lg:overflow-hidden">
              <div className="border-b border-white/10 px-4 py-4 lg:hidden">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-black shadow-[0_10px_25px_rgba(255,255,255,0.12)]">
                    <CalendarIcon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <h1 className="truncate text-[28px] font-bold leading-none text-white">
                      Κλείσε Ραντεβού
                    </h1>
                    <p className="mt-1 text-xs text-zinc-400">Βήμα {currentStep} από 3</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <StepPill step={1} label="Ημ/νία" active={currentStep === 1} done={currentStep > 1} compact />
                  <StepPill step={2} label="Ώρα" active={currentStep === 2} done={currentStep > 2} compact />
                  <StepPill step={3} label="Τέλος" active={currentStep === 3} done={false} compact />
                </div>
              </div>

              <div className="px-0 py-0">
                <AnimatePresence mode="wait" initial={false}>
                  {!hasDateSelection ? (
                    <motion.section
                      key="step-1-calendar"
                      initial={{ opacity: 0, scale: 0.992 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.992 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="w-full px-4 py-5 sm:px-5 sm:py-6 lg:px-10 lg:py-10 xl:px-14"
                    >
                      <div className="mx-auto w-full max-w-none xl:max-w-[980px]">
                        <div className="mb-6 flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                              Βήμα 1
                            </p>
                            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl xl:text-[44px]">
                              {months[displayMonth]}
                            </h2>
                            <p className="mt-1 text-sm text-zinc-500 sm:text-base">{displayYear}</p>
                          </div>

                          <div className="flex gap-2 sm:gap-3">
                            <button
                              type="button"
                              onClick={() => shiftMonth(-1)}
                              disabled={!canPrevMonth}
                              className={cn(
                                "flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 sm:h-14 sm:w-14",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                                "disabled:pointer-events-none disabled:opacity-30",
                                canPrevMonth
                                  ? "bg-white/5 text-white hover:bg-white/10 hover:scale-105 active:scale-95"
                                  : "text-zinc-600"
                              )}
                              aria-label="Προηγούμενος μήνας"
                            >
                              <ChevronLeft className="h-5 w-5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => shiftMonth(1)}
                              disabled={!canNextMonth}
                              className={cn(
                                "flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 sm:h-14 sm:w-14",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                                "disabled:pointer-events-none disabled:opacity-30",
                                canNextMonth
                                  ? "bg-white/5 text-white hover:bg-white/10 hover:scale-105 active:scale-95"
                                  : "text-zinc-600"
                              )}
                              aria-label="Επόμενος μήνας"
                            >
                              <ChevronRight className="h-5 w-5" />
                            </button>
                          </div>
                        </div>

                        <div className="mb-3 grid grid-cols-7 gap-2 sm:gap-3 lg:gap-4">
                          {weekDays.map((day) => (
                            <div
                              key={day}
                              className="py-2 text-center text-[11px] font-semibold tracking-wider text-zinc-600 sm:text-xs"
                            >
                              {day}
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-7 gap-2 sm:gap-3 lg:gap-4">
                          {calendarDays.map((day, idx) => {
                            const { iso, inRange, hasSlots } = dayMeta(day);
                            const isSelected = selectedDateISO === iso;
                            const isToday = iso === localDateISO(0);

                            return (
                              <button
                                type="button"
                                key={idx}
                                onClick={() => {
                                  if (!iso || !inRange || !hasSlots) return;
                                  setSelectedDateISO(iso);
                                  setSelectedKey(null);
                                  setNotes("");
                                  setSelectedPeriod("all");
                                }}
                                disabled={!day || !inRange || !hasSlots || loading}
                                className={cn(
                                  "relative aspect-square w-full rounded-[22px] p-0 text-sm transition-all duration-300 ease-out sm:text-base lg:text-lg",
                                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                                  "disabled:pointer-events-none",
                                  !day && "invisible",
                                  isSelected
                                    ? "scale-[1.04] bg-white font-bold text-zinc-900 shadow-[0_18px_40px_rgba(255,255,255,0.18)]"
                                    : hasSlots && inRange
                                    ? "bg-white/[0.05] font-semibold text-white hover:scale-[1.03] hover:bg-white/10 active:scale-95"
                                    : isToday
                                    ? "text-zinc-500 ring-1 ring-zinc-800"
                                    : "text-zinc-700"
                                )}
                                aria-pressed={isSelected}
                                aria-label={iso ? (hasSlots ? fmtDate(iso) : "Χωρίς διαθέσιμα") : ""}
                              >
                                <span className="text-[15px] sm:text-base lg:text-[20px]">{day}</span>
                                {hasSlots && inRange && !isSelected && (
                                  <span className="absolute bottom-2 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-emerald-400 lg:h-2.5 lg:w-2.5" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {loading && (
                          <div className="flex items-center justify-center gap-3 pt-8 text-zinc-500">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-400" />
                            <span className="text-sm">Φόρτωση...</span>
                          </div>
                        )}

                        {!loading && !hasDateSelection && (
                          <div className="mt-8 text-center lg:mt-10">
                            <p className="text-sm leading-relaxed text-zinc-500 sm:text-base">
                              Επίλεξε ημερομηνία με{" "}
                              <span className="inline-flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                <span className="text-zinc-400">διαθεσιμότητα</span>
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.section>
                  ) : !hasSlotSelection ? (
                    <motion.section
                      key="step-2-time"
                      initial={{ opacity: 0, scale: 0.992 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.992 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="rounded-3xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 lg:min-h-full lg:rounded-none lg:border-0 lg:bg-transparent lg:p-8"
                    >
                      <div className="mb-5 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                            Βήμα 2
                          </p>
                          <h3 className="mt-2 text-xl font-bold text-white sm:text-2xl">
                            Επίλεξε ώρα
                          </h3>
                          <p className="mt-1 truncate text-sm text-zinc-400">
                            {fmtDate(selectedDateISO)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={goBackOneStep}
                          className="rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:border-white/20 hover:text-white"
                        >
                          Πίσω
                        </button>
                      </div>

                      <div className="mb-5 flex items-center gap-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/10 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-sm text-emerald-300/80">Επιλέχθηκε ημερομηνία</p>
                          <p className="font-bold text-white">{fmtDateShort(selectedDateISO)}</p>
                        </div>
                      </div>

                      <div className="mb-5 grid grid-cols-2 gap-2 lg:flex lg:flex-wrap">
                        {[
                          { key: "all" as const, label: "Όλες", icon: null, count: periodCounts.all },
                          { key: "morning" as const, label: "Πρωί", icon: Sun, count: periodCounts.morning },
                          { key: "afternoon" as const, label: "Απόγευμα", icon: Sunset, count: periodCounts.afternoon },
                          { key: "night" as const, label: "Βράδυ", icon: Moon, count: periodCounts.night },
                        ].map(({ key, label, icon: Icon, count }) => (
                          <button
                            type="button"
                            key={key}
                            onClick={() => setSelectedPeriod(key)}
                            disabled={count === 0}
                            className={cn(
                              "flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 lg:py-2.5",
                              "disabled:pointer-events-none disabled:opacity-30",
                              selectedPeriod === key
                                ? "bg-white text-zinc-900"
                                : "bg-white/5 text-zinc-300 hover:bg-white/10"
                            )}
                            aria-pressed={selectedPeriod === key}
                          >
                            {Icon && <Icon className="h-4 w-4" />}
                            {label}
                            <span
                              className={cn(
                                "rounded-md px-1.5 py-0.5 text-xs",
                                selectedPeriod === key
                                  ? "bg-zinc-200 text-zinc-600"
                                  : "bg-white/10 text-zinc-500"
                              )}
                            >
                              {count}
                            </span>
                          </button>
                        ))}
                      </div>

                      {daySlots.length === 0 ? (
                        <div className="flex items-center gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-amber-200">
                          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
                          <p className="text-sm">
                            Δεν υπάρχουν διαθέσιμα ραντεβού. Δοκίμασε άλλη περίοδο.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-zinc-500">
                            Διαθέσιμες ώρες
                          </p>

                          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
                            {daySlots.map((slot) => {
                              const key = `${slot.date}|${slot.start_time}|${slot.end_time}`;
                              const selected = selectedKey === key;

                              return (
                                <button
                                  type="button"
                                  key={key}
                                  onClick={() => setSelectedKey(key)}
                                  className={cn(
                                    "group relative flex h-16 flex-col items-center justify-center rounded-2xl transition-all duration-300 ease-out lg:h-20",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                                    selected
                                      ? "scale-[1.03] bg-white text-zinc-900 shadow-xl shadow-white/20"
                                      : "bg-white/[0.03] text-white hover:scale-[1.02] hover:bg-white/[0.08] active:scale-95"
                                  )}
                                  aria-pressed={selected}
                                >
                                  <span className="text-lg font-bold lg:text-xl">
                                    {formatSlotLabel(slot.start_time)}
                                  </span>
                                  <span className="text-xs font-medium text-zinc-500">
                                    έως {hhmm(slot.end_time)}
                                  </span>

                                  {slot.is_online && (
                                    <span className="absolute right-2.5 top-2.5">
                                      <Wifi
                                        className={cn(
                                          "h-3.5 w-3.5 transition-colors",
                                          selected ? "text-zinc-400" : "text-zinc-600"
                                        )}
                                      />
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </motion.section>
                  ) : (
                    <motion.section
                      key="step-3-summary"
                      initial={{ opacity: 0, scale: 0.992 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.992 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="space-y-6"
                    >
                      <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-8">
                        <div className="mb-4 flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                              Βήμα 3
                            </p>
                            <h3 className="mt-2 text-lg font-semibold text-white">
                              Σημείωση <span className="font-normal text-zinc-500">(προαιρετική)</span>
                            </h3>
                            <p className="mt-1 text-sm text-zinc-500">
                              Πληροφορίες που θέλεις να γνωρίζει ο προπονητής.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={goBackOneStep}
                            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:border-white/20 hover:text-white"
                          >
                            Πίσω
                          </button>
                        </div>

                        <textarea
                          placeholder="π.χ. Στόχοι, τραυματισμοί, προτιμήσεις..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="min-h-[120px] w-full resize-none rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-4 text-white placeholder:text-zinc-600 transition-all hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                        />
                      </section>

                      <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-8">
                        <div className="mb-4 flex items-center gap-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/10 p-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-sm text-emerald-300/80">Επιλεγμένο ραντεβού</p>
                            <p className="font-bold text-white">
                              {fmtDateShort(selectedSlot.date)} · {hhmm(selectedSlot.start_time)} -{" "}
                              {hhmm(selectedSlot.end_time)}
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                            <div className="text-xs text-zinc-500">Ημερομηνία</div>
                            <div className="mt-1 font-semibold text-white">
                              {fmtDate(selectedSlot.date)}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                            <div className="text-xs text-zinc-500">Ώρα</div>
                            <div className="mt-1 font-semibold text-white">
                              {hhmm(selectedSlot.start_time)} - {hhmm(selectedSlot.end_time)}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 sm:col-span-2 xl:col-span-1">
                            <div className="text-xs text-zinc-500">Τύπος συνεδρίας</div>
                            <div className="mt-1 font-semibold text-white">
                              {selectedSlot.is_online ? "Online" : "Δια ζώσης"}
                            </div>
                          </div>
                        </div>

                        <div className="mt-5">
                          <ActionButton
                            onClick={handleContinue}
                            disabled={!selectedKey || submitting}
                            variant="primary"
                            className="h-14 text-base lg:h-16 lg:text-lg"
                          >
                            {submitting ? (
                              <>
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-900" />
                                <span>Γίνεται κράτηση...</span>
                              </>
                            ) : (
                              <>
                                <CalendarPlus className="h-5 w-5" />
                                <span>Ολοκλήρωση κράτησης</span>
                              </>
                            )}
                          </ActionButton>
                        </div>
                      </section>
                    </motion.section>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllInOneBooking;