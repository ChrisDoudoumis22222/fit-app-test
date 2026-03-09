"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Sunset,
  Moon,
  Wifi,
  X,
  CheckCircle2,
  Mail,
  CalendarIcon,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "../supabaseClient";

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

/* --------------------------- UI primitives -------------------------- */
type ButtonVariant = "default" | "outline" | "ghost";
type ButtonSize = "default" | "sm";

const CustomButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
  }
> = ({
  children,
  variant = "default",
  size = "default",
  className = "",
  ...props
}) => {
  const base =
    "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:pointer-events-none disabled:opacity-50";
  const variants: Record<ButtonVariant, string> = {
    default: "bg-white text-black hover:bg-zinc-100",
    outline: "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]",
    ghost: "text-white hover:bg-white/[0.06]",
  };
  const sizes: Record<ButtonSize, string> = {
    default: "h-10 px-4 py-2",
    sm: "h-9 px-3 text-sm",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const CustomTextarea: React.FC<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
> = ({ className = "", ...props }) => (
  <textarea
    className={cn(
      "flex min-h-[110px] w-full rounded-2xl border border-white/8 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15 resize-none transition-all duration-300",
      "hover:bg-white/[0.06] focus:bg-white/[0.07]",
      className
    )}
    {...props}
  />
);

/* --------------------- feedback --------------------- */
const BookingSuccessModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  bookingDetails?: {
    date: string;
    start_time: string;
    end_time: string;
    is_online?: boolean | null;
  } | null;
  trainerName: string;
}> = ({ isOpen, onClose, bookingDetails, trainerName }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-md w-full rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-emerald-600/10" />
        <div className="relative z-10 p-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 flex items-center justify-center shadow-2xl">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>

          <h2 className="text-2xl font-bold text-center text-white mb-4">
            Επιτυχής Κράτηση! 🎉
          </h2>

          <div className="rounded-2xl p-6 mb-6 border border-white/8 bg-white/[0.04] space-y-3">
            <div className="flex items-center gap-3 text-zinc-300">
              <CalendarIcon className="h-5 w-5 text-emerald-400" />
              <span>
                Προπονητής:{" "}
                <span className="text-white font-semibold">{trainerName}</span>
              </span>
            </div>

            <div className="flex items-center gap-3 text-zinc-300">
              <CalendarIcon className="h-5 w-5 text-emerald-400" />
              <span>
                Ημερομηνία:{" "}
                <span className="text-white font-semibold">
                  {fmtDate(bookingDetails?.date)}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-3 text-zinc-300">
              <Clock className="h-5 w-5 text-emerald-400" />
              <span>
                Ώρα:{" "}
                <span className="text-white font-semibold">
                  {bookingDetails?.start_time} - {bookingDetails?.end_time}
                </span>
              </span>
            </div>

            {bookingDetails?.is_online && (
              <div className="flex items-center gap-3 text-zinc-300">
                <Wifi className="h-5 w-5 text-emerald-400" />
                <span>
                  Τύπος:{" "}
                  <span className="text-white font-semibold">
                    Online συνεδρία
                  </span>
                </span>
              </div>
            )}
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <Mail className="h-5 w-5 text-amber-400" />
            <div className="text-amber-100 text-sm">
              <span className="font-semibold">Θα σας ειδοποιήσουμε:</span> Η
              απάντηση θα σταλεί στο email σας εντός 24 ωρών
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-4 px-6 bg-white text-black hover:bg-zinc-100 font-semibold rounded-2xl transition-all duration-200"
          >
            Εντάξει, κατάλαβα!
          </button>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/8 hover:bg-white/14 rounded-full flex items-center justify-center text-zinc-300 hover:text-white transition-all"
            title="Κλείσιμο"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const NotificationBanner: React.FC<BannerState & { onClose: () => void }> = ({
  type,
  title,
  message,
  onClose,
}) => {
  const cfg =
    type === "success"
      ? {
          box: "from-emerald-500/20 via-green-500/20 to-emerald-600/20 border-emerald-400/25 text-emerald-100",
          Icon: CheckCircle2,
        }
      : {
          box: "from-red-500/20 via-rose-500/20 to-red-600/20 border-red-400/25 text-red-100",
          Icon: AlertTriangle,
        };

  const Icon = cfg.Icon;

  return (
    <div className="fixed top-4 left-4 right-4 z-[100] mx-auto max-w-xl">
      <div
        className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl shadow-2xl bg-gradient-to-r ${cfg.box}`}
      >
        <div className="relative p-4 sm:p-5 flex items-start gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-black/20 flex items-center justify-center">
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold mb-1">{title}</div>
            <div className="text-sm opacity-90">{message}</div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center"
            title="Κλείσιμο"
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
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [lastBooking, setLastBooking] = useState<{
    date: string;
    start_time: string;
    end_time: string;
    is_online?: boolean | null;
    booking_id?: string;
  } | null>(null);

  const timeSlotsRef = useRef<HTMLDivElement | null>(null);
  const notesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    if (!trainerId) return;

    (async () => {
      try {
        setLoading(true);

        let hol = holidaysProp;
        if (!hol) {
          const { data: holData } = await supabase
            .from("trainer_holidays")
            .select("starts_on, ends_on, reason")
            .eq("trainer_id", trainerId);
          hol = (holData ?? []) as Holiday[];
        }

        let wav = weeklyAvailProp;
        if (!wav) {
          const { data: avData } = await supabase
            .from("trainer_availability")
            .select("weekday, start_time, end_time, is_online")
            .eq("trainer_id", trainerId);
          wav = (avData ?? []) as WeeklyAvailability[];
        }

        const { data: bookedData } = await supabase
          .from("trainer_bookings")
          .select("date,start_time,end_time,status")
          .eq("trainer_id", trainerId)
          .gte("date", rangeStartISO)
          .lte("date", rangeEndISO)
          .in("status", ["pending", "accepted"]);

        const bookedRows = (bookedData ?? []) as BookingRow[];

        const { data: openData, error: openErr } = await supabase
          .from("trainer_open_slots")
          .select("date,start_time,end_time,is_online,status")
          .eq("trainer_id", trainerId)
          .gte("date", rangeStartISO)
          .lte("date", rangeEndISO)
          .order("date", { ascending: true })
          .order("start_time", { ascending: true });

        if (openErr) console.warn("[open slots] error:", openErr);
        if (!alive) return;

        setHolidays(hol || []);
        setWeeklyAvailability(wav || []);
        setBooked(bookedRows || []);

        const isHoliday = (d: string) =>
          (hol || []).some((h) => within(d, h.starts_on, h.ends_on));

        const usableStatus = (s?: string | null) => {
          const v = (s ?? "").toString().trim().toLowerCase();
          return [
            "",
            "open",
            "available",
            "free",
            "publish",
            "published",
            "true",
            "1",
          ].includes(v);
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
              timeToMinutes(hhmm(a.start_time)) -
                timeToMinutes(hhmm(b.start_time))
          );
        }

        setOpenRows(filtered);
      } catch (e) {
        console.error(e);
        setBanner({
          type: "error",
          title: "Σφάλμα",
          message: "Αδυναμία φόρτωσης διαθεσιμότητας.",
        });
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [trainerId, rangeStartISO, rangeEndISO, holidaysProp, weeklyAvailProp]);

  useEffect(() => {
    if (
      selectedDateISO &&
      timeSlotsRef.current &&
      typeof window !== "undefined" &&
      window.innerWidth < 1024
    ) {
      setTimeout(() => {
        timeSlotsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 220);
    }
  }, [selectedDateISO]);

  useEffect(() => {
    if (
      selectedKey &&
      notesRef.current &&
      typeof window !== "undefined" &&
      window.innerWidth < 1024
    ) {
      setTimeout(() => {
        notesRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 220);
    }
  }, [selectedKey]);

  const byDate = useMemo(() => {
    const m = new Map<string, OpenSlotRow[]>();

    for (let i = 0; i < openRows.length; i++) {
      const r = openRows[i];
      if (!m.has(r.date)) m.set(r.date, []);
      m.get(r.date)!.push(r);
    }

    m.forEach((arr) => {
      arr.sort(
        (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
      );
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

  const calendarDays: Array<number | null> = Array.from(
    { length: 42 },
    (_, i) => {
      const dayNumber = i - firstDayIdx + 1;
      return dayNumber > 0 && dayNumber <= daysInMonth ? dayNumber : null;
    }
  );

  const shiftMonth = (delta: number) => {
    const next = Math.min(Math.max(monthIndex + delta, initialIndex), maxIndex);
    setMonthIndex(next);
    setSelectedDateISO(null);
    setSelectedKey(null);
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
    const [date, start, end] = selectedKey.split("|");
    return { date, start_time: start, end_time: end };
  }, [selectedKey]);

  const handleContinue = async () => {
    if (!selectedSlot) return;

    const { data: sess } = await supabase.auth.getSession();
    const sessionUserId: string | undefined = (sess as any)?.session?.user?.id;

    if (!sessionUserId) {
      setBanner({
        type: "error",
        title: "Απαιτείται σύνδεση",
        message: "Συνδεθείτε για να ολοκληρώσετε την κράτηση.",
      });
      return;
    }

    try {
      setSubmitting(true);
      setBanner(null);

      const startMinutes = timeToMinutes(hhmm(selectedSlot.start_time));
      const endMinutes = timeToMinutes(hhmm(selectedSlot.end_time));
      const duration = Math.max(0, endMinutes - startMinutes) || 60;

      const slot = (byDate.get(selectedSlot.date) || []).find(
        (s) =>
          s.start_time === selectedSlot.start_time &&
          s.end_time === selectedSlot.end_time
      );

      const payload = {
        trainer_id: trainerId,
        user_id: sessionUserId,
        date: selectedSlot.date,
        start_time: hhmm(selectedSlot.start_time),
        end_time: hhmm(selectedSlot.end_time),
        duration_min: duration,
        break_before_min: 0,
        break_after_min: 0,
        note: notes.trim() || null,
        status: "pending" as BookingStatus,
        is_online: !!slot?.is_online,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("trainer_bookings")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      setLastBooking({
        date: selectedSlot.date,
        start_time: hhmm(selectedSlot.start_time),
        end_time: hhmm(selectedSlot.end_time),
        is_online: !!slot?.is_online,
        booking_id: (data as { id?: string })?.id,
      });

      setShowSuccess(true);
      setNotes("");
      setSelectedKey(null);

      setOpenRows((prev) =>
        prev.filter(
          (s) =>
            !(
              s.date === selectedSlot.date &&
              s.start_time === selectedSlot.start_time &&
              s.end_time === selectedSlot.end_time
            )
        )
      );

      const remainingForDay = (byDate.get(selectedSlot.date) || []).filter(
        (s) =>
          !(
            s.start_time === selectedSlot.start_time &&
            s.end_time === selectedSlot.end_time
          )
      );

      if (remainingForDay.length === 0) {
        setSelectedDateISO(null);
      }
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Κάτι πήγε στραβά. Παρακαλώ δοκιμάστε ξανά.";

      console.error("booking error:", e);
      setBanner({
        type: "error",
        title: "Η κράτηση απέτυχε",
        message: msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

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

  const navigateTimeSlot = (direction: "prev" | "next") => {
    if (!selectedDateISO || daySlots.length === 0) return;

    const currentIndex = daySlots.findIndex((slot) => {
      const key = `${slot.date}|${slot.start_time}|${slot.end_time}`;
      return key === selectedKey;
    });

    const nextIndex =
      direction === "prev"
        ? currentIndex > 0
          ? currentIndex - 1
          : daySlots.length - 1
        : currentIndex < daySlots.length - 1
        ? currentIndex + 1
        : 0;

    const nextSlot = daySlots[nextIndex];
    if (nextSlot) {
      const nextKey = `${nextSlot.date}|${nextSlot.start_time}|${nextSlot.end_time}`;
      setSelectedKey(nextKey);
    }
  };

  const hasDateSelection = !!selectedDateISO;
  const hasSlotSelection = !!selectedKey;

  return (
    <div className="w-full min-h-screen md:flex md:items-center md:justify-center md:px-6 md:py-8 xl:px-8">
      <div className="w-full md:max-w-7xl md:mx-auto">
        {banner && (
          <NotificationBanner
            type={banner.type}
            title={banner.title}
            message={banner.message}
            onClose={() => setBanner(null)}
          />
        )}

        <BookingSuccessModal
          isOpen={showSuccess}
          onClose={() => setShowSuccess(false)}
          bookingDetails={lastBooking ?? undefined}
          trainerName={trainerName}
        />

        <div className="w-full md:rounded-[28px] md:border md:border-white/[0.075] md:bg-black/25 md:backdrop-blur-xl md:shadow-[0_20px_70px_rgba(0,0,0,0.45)] md:overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3 md:px-6 md:py-6 md:border-b md:border-white/[0.075] md:bg-white/[0.02]">
            <div className="w-6" />
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-5 w-5 md:h-6 md:w-6 text-white/85" />
              <h1 className="text-lg md:text-2xl font-semibold text-white">
                Ραντεβού
              </h1>
            </div>
            <div className="w-6" />
          </div>

          <div
            className={cn(
              "px-4 pb-6 pt-3 md:px-6 md:pb-6 md:pt-6 lg:px-8 lg:pb-8",
              hasDateSelection
                ? "grid grid-cols-1 xl:grid-cols-[minmax(420px,520px)_1fr] gap-4 md:gap-5 xl:gap-6"
                : "flex justify-center"
            )}
          >
            {/* Calendar */}
            <div
              className={cn(
                "transition-all duration-500 ease-out motion-safe:animate-[fadeUp_.45s_ease-out]",
                hasDateSelection ? "w-full max-w-none" : "w-full max-w-[560px]"
              )}
            >
              <div className="rounded-[24px] border border-white/[0.075] md:border-white/[0.075] bg-transparent md:bg-white/[0.015] p-4 md:p-5 lg:p-6 transition-all duration-500 ease-out">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h2 className="text-xl md:text-2xl font-semibold text-white">
                    {months[displayMonth]} {displayYear}
                  </h2>

                  <div className="flex gap-2">
                    <CustomButton
                      variant="ghost"
                      size="sm"
                      onClick={() => shiftMonth(-1)}
                      disabled={!canPrevMonth}
                      className="h-10 w-10 p-0 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.075] text-white disabled:opacity-30 hover:scale-[1.03] active:scale-[0.98]"
                      aria-label="Προηγούμενος μήνας"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </CustomButton>

                    <CustomButton
                      variant="ghost"
                      size="sm"
                      onClick={() => shiftMonth(1)}
                      disabled={!canNextMonth}
                      className="h-10 w-10 p-0 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.075] text-white disabled:opacity-30 hover:scale-[1.03] active:scale-[0.98]"
                      aria-label="Επόμενος μήνας"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </CustomButton>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2 mb-2">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="text-center text-[11px] md:text-xs font-medium tracking-wide text-white/55 py-2"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((day, idx) => {
                    const { iso, inRange, hasSlots } = dayMeta(day);
                    const isSelected = selectedDateISO === iso;

                    return (
                      <CustomButton
                        key={idx}
                        variant="ghost"
                        onClick={() =>
                          iso && inRange && hasSlots && setSelectedDateISO(iso)
                        }
                        disabled={!day || !inRange || !hasSlots || loading}
                        className={cn(
                          "h-12 md:h-[58px] w-full p-0 text-sm md:text-base relative overflow-hidden rounded-2xl border transition-all duration-300 ease-out",
                          "hover:scale-[1.03] active:scale-[0.98]",
                          !day && "invisible",
                          isSelected
                            ? "bg-white/[0.78] text-black border-white/[0.72] shadow-[0_0_0_1px_rgba(255,255,255,0.25)]"
                            : "bg-white/[0.03] text-white border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.12]",
                          (!inRange || !hasSlots) && day && "opacity-30"
                        )}
                        title={iso ? (hasSlots ? fmtDate(iso) : "Χωρίς διαθέσιμα") : ""}
                        aria-pressed={isSelected}
                      >
                        <span className="relative z-10 font-semibold">
                          {day}
                        </span>
                      </CustomButton>
                    );
                  })}
                </div>

                {loading && (
                  <div className="flex items-center gap-3 text-white/60 pt-4">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    <span className="text-sm md:text-base">
                      Φόρτωση διαθεσιμότητας…
                    </span>
                  </div>
                )}

                {!loading && !hasDateSelection && (
                  <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-white/65 transition-all duration-500">
                    Επίλεξε μια διαθέσιμη ημερομηνία για να εμφανιστούν οι ώρες.
                  </div>
                )}
              </div>
            </div>

            {/* Right side */}
            {hasDateSelection && (
              <div
                ref={timeSlotsRef}
                className="space-y-4 md:space-y-5 transition-all duration-500 ease-out motion-safe:animate-[fadeInRight_.45s_ease-out]"
              >
                <div className="rounded-[24px] border border-white/[0.075] md:border-white/[0.075] bg-transparent md:bg-white/[0.015] p-4 md:p-5 lg:p-6 transition-all duration-500 ease-out">
                  <div className="space-y-5">
                    <div className="space-y-3">
                      <h3 className="text-base md:text-lg font-semibold text-white">
                        Διαθέσιμες Ώρες
                      </h3>

                      <div className="flex gap-2 flex-wrap">
                        <CustomButton
                          variant={selectedPeriod === "all" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedPeriod("all")}
                          className={cn(
                            "gap-2 rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
                            selectedPeriod === "all"
                              ? "bg-white/[0.78] text-black border border-white/[0.7]"
                              : "bg-white/[0.04] border-white/[0.08] text-white hover:bg-white/[0.07]"
                          )}
                          aria-pressed={selectedPeriod === "all"}
                        >
                          Όλες
                        </CustomButton>

                        <CustomButton
                          variant={selectedPeriod === "morning" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedPeriod("morning")}
                          className={cn(
                            "gap-2 rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
                            selectedPeriod === "morning"
                              ? "bg-white/[0.78] text-black border border-white/[0.7]"
                              : "bg-white/[0.04] border-white/[0.08] text-white hover:bg-white/[0.07]"
                          )}
                          aria-pressed={selectedPeriod === "morning"}
                        >
                          <Sun className="h-4 w-4" />
                          Πρωί
                        </CustomButton>

                        <CustomButton
                          variant={selectedPeriod === "afternoon" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedPeriod("afternoon")}
                          className={cn(
                            "gap-2 rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
                            selectedPeriod === "afternoon"
                              ? "bg-white/[0.78] text-black border border-white/[0.7]"
                              : "bg-white/[0.04] border-white/[0.08] text-white hover:bg-white/[0.07]"
                          )}
                          aria-pressed={selectedPeriod === "afternoon"}
                        >
                          <Sunset className="h-4 w-4" />
                          Απόγευμα
                        </CustomButton>

                        <CustomButton
                          variant={selectedPeriod === "night" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedPeriod("night")}
                          className={cn(
                            "gap-2 rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
                            selectedPeriod === "night"
                              ? "bg-white/[0.78] text-black border border-white/[0.7]"
                              : "bg-white/[0.04] border-white/[0.08] text-white hover:bg-white/[0.07]"
                          )}
                          aria-pressed={selectedPeriod === "night"}
                        >
                          <Moon className="h-4 w-4" />
                          Βράδυ
                        </CustomButton>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg md:text-xl font-semibold text-white">
                          {fmtDate(selectedDateISO)}
                        </h3>

                        <div className="flex gap-2 shrink-0">
                          <CustomButton
                            variant="ghost"
                            size="sm"
                            onClick={() => navigateTimeSlot("prev")}
                            disabled={daySlots.length === 0 || !selectedKey}
                            className="h-10 w-10 p-0 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.075] text-white disabled:opacity-30 hover:scale-[1.03] active:scale-[0.98]"
                            title="Προηγούμενη ώρα"
                            aria-label="Προηγούμενη ώρα"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </CustomButton>

                          <CustomButton
                            variant="ghost"
                            size="sm"
                            onClick={() => navigateTimeSlot("next")}
                            disabled={daySlots.length === 0 || !selectedKey}
                            className="h-10 w-10 p-0 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.075] text-white disabled:opacity-30 hover:scale-[1.03] active:scale-[0.98]"
                            title="Επόμενη ώρα"
                            aria-label="Επόμενη ώρα"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </CustomButton>
                        </div>
                      </div>

                      {daySlots.length === 0 ? (
                        <div className="rounded-2xl border border-amber-400/15 bg-amber-500/10 text-amber-100 px-4 py-5 flex items-center gap-3 text-sm md:text-base">
                          <AlertTriangle className="h-5 w-5 shrink-0" />
                          Δεν υπάρχουν ανοικτά ραντεβού για το επιλεγμένο φίλτρο.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                          {daySlots.map((slot, idx) => {
                            const key = `${slot.date}|${slot.start_time}|${slot.end_time}`;
                            const selected = selectedKey === key;

                            return (
                              <CustomButton
                                key={key}
                                variant="outline"
                                onClick={() => setSelectedKey(key)}
                                className={cn(
                                  "group h-[58px] md:h-[64px] relative rounded-2xl px-3 justify-center border transition-all duration-300 ease-out motion-safe:animate-[slotFade_.35s_ease-out]",
                                  "hover:scale-[1.025] active:scale-[0.985]",
                                  selected
                                    ? "bg-white/[0.22] text-white border-white/[0.32] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.20)]"
                                    : "bg-white/[0.05] text-white border-white/[0.10] hover:bg-white/[0.08] hover:border-white/[0.18]"
                                )}
                                style={{ animationDelay: `${idx * 35}ms` }}
                                title={`${slot.start_time}–${slot.end_time}`}
                                aria-pressed={selected}
                              >
                                <span
                                  className={cn(
                                    "text-base md:text-lg font-semibold transition-colors duration-300",
                                    selected ? "text-white" : "text-white"
                                  )}
                                >
                                  {formatSlotLabel(slot.start_time)}
                                </span>

                                {slot.is_online && (
                                  <span className="absolute top-2.5 right-2.5 opacity-80">
                                    <Wifi
                                      className={cn(
                                        "h-3.5 w-3.5 transition-colors duration-300",
                                        selected ? "text-white/80" : "text-white/65"
                                      )}
                                    />
                                  </span>
                                )}
                              </CustomButton>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {hasSlotSelection && (
                      <div className="pt-1 transition-all duration-500 ease-out motion-safe:animate-[fadeUp_.35s_ease-out]">
                        <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.04] px-4 py-2 text-sm text-white/82">
                          <Clock className="h-4 w-4 shrink-0" />
                          <span className="truncate">
                            Επιλέχθηκε: {fmtDate(selectedSlot?.date)} στις{" "}
                            {selectedSlot?.start_time}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {hasSlotSelection && (
                  <div
                    ref={notesRef}
                    className="rounded-[24px] border border-white/[0.075] md:border-white/[0.075] bg-transparent md:bg-white/[0.015] p-4 md:p-5 lg:p-6 transition-all duration-500 ease-out motion-safe:animate-[fadeUp_.4s_ease-out]"
                  >
                    <div className="mb-3">
                      <h3 className="text-base md:text-lg font-semibold text-white">
                        Σημείωση (προαιρετική)
                      </h3>
                    </div>

                    <CustomTextarea
                      placeholder="Στόχοι, περιορισμοί, προτίμηση για εξοπλισμό κ.λπ."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                )}

                {hasSlotSelection && (
                  <div className="pt-1 transition-all duration-500 ease-out motion-safe:animate-[fadeUp_.45s_ease-out]">
                    <CustomButton
                      onClick={handleContinue}
                      disabled={!selectedKey || submitting}
                      className={cn(
                        "w-full h-13 md:h-14 text-base md:text-lg font-semibold rounded-2xl transition-all duration-300",
                        "hover:scale-[1.01] active:scale-[0.99]",
                        selectedKey && !submitting
                          ? "bg-white/[0.82] text-black hover:bg-white/[0.9]"
                          : "bg-white/10 text-white/50 cursor-not-allowed border border-white/10"
                      )}
                    >
                      {submitting ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                          <span>Γίνεται κράτηση…</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-5 w-5 md:h-6 md:w-6" />
                          <span>Συνέχεια</span>
                        </div>
                      )}
                    </CustomButton>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slotFade {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};