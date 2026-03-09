"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
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
  starts_on: string; // YYYY-MM-DD
  ends_on: string;   // YYYY-MM-DD
  reason?: string | null;
}

interface WeeklyAvailability {
  weekday: WeekdayKey;
  start_time: string; // HH:mm
  end_time: string;   // HH:mm
  is_online?: boolean | null;
}

type BookingStatus = "pending" | "accepted" | "declined" | "cancelled";

interface BookingRow {
  date: string;        // YYYY-MM-DD
  start_time: string;  // HH:mm
  end_time: string;    // HH:mm
  status?: BookingStatus;
}

interface OpenSlotRow {
  date: string;        // YYYY-MM-DD
  start_time: string;  // HH:mm
  end_time: string;    // HH:mm
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

const hhmm = (t: string): string =>
  t.match(/^(\d{1,2}:\d{2})/)?.[1] ?? t;

const timeToMinutes = (t: string): number => {
  const m = (t || "").match(/^(\d{1,2}):(\d{2})/);
  if (!m) return Number.NaN;
  return Number.parseInt(m[1], 10) * 60 + Number.parseInt(m[2], 10);
};

const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string): boolean => {
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
      day: "2-digit",
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

/* --------------------------- small UI primitives -------------------------- */
type ButtonVariant = "default" | "outline" | "ghost";
type ButtonSize = "default" | "sm";

const CustomButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
  }
> = ({ children, variant = "default", size = "default", className = "", ...props }) => {
  const base =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  const variants: Record<ButtonVariant, string> = {
    default: "bg-white text-black hover:bg-gray-200",
    outline: "border border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700",
    ghost: "hover:bg-zinc-800 text-white",
  };
  const sizes: Record<ButtonSize, string> = {
    default: "h-10 px-4 py-2",
    sm: "h-8 px-3 text-sm",
  };
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const CustomTextarea: React.FC<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
> = ({ className = "", ...props }) => (
  <textarea
    className={`flex min-h-[80px] w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none ${className}`}
    {...props}
  />
);

/* --------------------- Success modal & banner --------------------- */
const BookingSuccessModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  bookingDetails?: { date: string; start_time: string; end_time: string; is_online?: boolean | null } | null;
  trainerName: string;
}> = ({ isOpen, onClose, bookingDetails, trainerName }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative max-w-md w-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 rounded-3xl border border-zinc-700/50 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-emerald-600/10" />
        <div className="relative z-10 p-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center shadow-2xl">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-center text-zinc-100 mb-4">Επιτυχής Κράτηση! 🎉</h2>
          <div className="bg-zinc-800/50 rounded-2xl p-6 mb-6 border border-zinc-700/30 space-y-3">
            <div className="flex items-center gap-3 text-zinc-300">
              <CalendarIcon className="h-5 w-5 text-emerald-400" />
              <span>
                Προπονητής: <span className="text-zinc-100 font-semibold">{trainerName}</span>
              </span>
            </div>
            <div className="flex items-center gap-3 text-zinc-300">
              <CalendarIcon className="h-5 w-5 text-emerald-400" />
              <span>
                Ημερομηνία: <span className="text-zinc-100 font-semibold">{fmtDate(bookingDetails?.date)}</span>
              </span>
            </div>
            <div className="flex items-center gap-3 text-zinc-300">
              <Clock className="h-5 w-5 text-emerald-400" />
              <span className="text-zinc-300">
                Ώρα:{" "}
                <span className="text-zinc-100 font-semibold">
                  {bookingDetails?.start_time} - {bookingDetails?.end_time}
                </span>
              </span>
            </div>
            {bookingDetails?.is_online && (
              <div className="flex items-center gap-3 text-zinc-300">
                <Wifi className="h-5 w-5 text-emerald-400" />
                <span>
                  Τύπος: <span className="text-zinc-100 font-semibold">Online συνεδρία</span>
                </span>
              </div>
            )}
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <Mail className="h-5 w-5 text-amber-400" />
            <div className="text-amber-100 text-sm">
              <span className="font-semibold">Θα σας ειδοποιήσουμε:</span> Η απάντηση θα σταλεί στο email σας εντός 24 ωρών
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold rounded-2xl transition-all duration-200 shadow-lg"
          >
            Εντάξει, κατάλαβα!
          </button>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-zinc-700/50 hover:bg-zinc-600/50 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-all"
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
          box: "from-emerald-500/20 via-green-500/20 to-emerald-600/20 border-emerald-400/30 text-emerald-100",
          Icon: CheckCircle2,
        }
      : {
          box: "from-red-500/20 via-rose-500/20 to-red-600/20 border-red-400/30 text-red-100",
          Icon: AlertTriangle,
        };
  const Icon = cfg.Icon;
  return (
    <div className="fixed top-4 left-4 right-4 z-[100] mx-auto max-w-xl">
      <div className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl shadow-2xl bg-gradient-to-r ${cfg.box}`}>
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
  // calendar range: today -> +29 days
  const rangeStartISO = useMemo(() => localDateISO(0), []);
  const rangeEndISO = useMemo(() => localDateISO(29), []);
  const minDateObj = useMemo(() => new Date(`${rangeStartISO}T00:00:00`), [rangeStartISO]);
  const maxDateObj = useMemo(() => new Date(`${rangeEndISO}T00:00:00`), [rangeEndISO]);

  // month index (year*12 + month), clamped to range
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

  // data
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [weeklyAvailability, setWeeklyAvailability] = useState<WeeklyAvailability[]>([]);
  const [booked, setBooked] = useState<BookingRow[]>([]);
  const [openRows, setOpenRows] = useState<OpenSlotRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // feedback
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
  const continueRef = useRef<HTMLDivElement | null>(null);

  // fetch base data
  useEffect(() => {
    let alive = true;
    if (!trainerId) return;

    (async () => {
      try {
        setLoading(true);

        // holidays
        let hol = holidaysProp;
        if (!hol) {
          const { data: holData } = await supabase
            .from("trainer_holidays")
            .select("starts_on, ends_on, reason")
            .eq("trainer_id", trainerId);
          hol = (holData ?? []) as Holiday[];
        }

        // weekly availability
        let wav = weeklyAvailProp;
        if (!wav) {
          const { data: avData } = await supabase
            .from("trainer_availability")
            .select("weekday, start_time, end_time, is_online")
            .eq("trainer_id", trainerId);
          wav = (avData ?? []) as WeeklyAvailability[];
        }

        // existing bookings
        const { data: bookedData } = await supabase
          .from("trainer_bookings")
          .select("date,start_time,end_time,status")
          .eq("trainer_id", trainerId)
          .gte("date", rangeStartISO)
          .lte("date", rangeEndISO)
          .in("status", ["pending", "accepted"]);
        const bookedRows = (bookedData ?? []) as BookingRow[];

        // open slots
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

        // filter open against holidays + overlaps
        const isHoliday = (d: string) => (hol || []).some((h) => within(d, h.starts_on, h.ends_on));
        const usableStatus = (s?: string | null) => {
          const v = (s ?? "").toString().trim().toLowerCase();
          return ["", "open", "available", "free", "publish", "published", "true", "1"].includes(v);
        };

        let filtered = ((openData ?? []) as OpenSlotRow[]).filter((r) => {
          if (!usableStatus(r.status)) return false;
          if (isHoliday(r.date)) return false;
          const overlap = (bookedRows || []).some(
            (b) => b.date === r.date && overlaps(r.start_time, r.end_time, b.start_time, b.end_time)
          );
          return !overlap;
        });

        // derive from weekly availability if no explicit open slots
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
                (b) => b.date === iso && overlaps(s.start_time, s.end_time, b.start_time, b.end_time)
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
              a.date.localeCompare(b.date) || timeToMinutes(hhmm(a.start_time)) - timeToMinutes(hhmm(b.start_time))
          );
        }

        setOpenRows(filtered);
      } catch (e) {
        console.error(e);
        setBanner({ type: "error", title: "Σφάλμα", message: "Αδυναμία φόρτωσης διαθεσιμότητας." });
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [trainerId, rangeStartISO, rangeEndISO, holidaysProp, weeklyAvailProp]);

  // mobile scroll helpers
  useEffect(() => {
    if (selectedDateISO && timeSlotsRef.current && typeof window !== "undefined" && window.innerWidth < 768) {
      setTimeout(() => {
        timeSlotsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [selectedDateISO]);

  useEffect(() => {
    if (selectedKey && notesRef.current && typeof window !== "undefined" && window.innerWidth < 768) {
      setTimeout(() => {
        notesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 500);
    }
  }, [selectedKey]);

  // map by date (iterator-safe for TS target < ES2015)
  const byDate = useMemo(() => {
    const m = new Map<string, OpenSlotRow[]>();
    for (let i = 0; i < openRows.length; i++) {
      const r = openRows[i];
      if (!m.has(r.date)) m.set(r.date, []);
      m.get(r.date)!.push(r);
    }
    // sort each date's slots by time without using for..of over Map
    m.forEach((arr) => {
      arr.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
    });
    return m;
  }, [openRows]);

  // avoid spreading Map iterators
  const availableDateSet = useMemo(() => new Set<string>(Array.from(byDate.keys())), [byDate]);

  // calendar grid (7x6)
  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonthIndex = (month: number, year: number) => {
    // Monday=0 ... Sunday=6
    const firstDay = new Date(year, month, 1).getDay(); // Sun=0
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
  };

  // slots for selected date & filter by period
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

  // booking
  const handleContinue = async () => {
    if (!selectedSlot) return;
    const { data: sess } = await supabase.auth.getSession();
    const sessionUserId: string | undefined = (sess as any)?.session?.user?.id;
    if (!sessionUserId) {
      setBanner({ type: "error", title: "Απαιτείται σύνδεση", message: "Συνδεθείτε για να ολοκληρώσετε την κράτηση." });
      return;
    }

    try {
      setSubmitting(true);
      setBanner(null);

      const startMinutes = timeToMinutes(hhmm(selectedSlot.start_time));
      const endMinutes = timeToMinutes(hhmm(selectedSlot.end_time));
      const duration = Math.max(0, endMinutes - startMinutes) || 60;

      const slot = (byDate.get(selectedSlot.date) || []).find(
        (s) => s.start_time === selectedSlot.start_time && s.end_time === selectedSlot.end_time
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

      const { data, error } = await supabase.from("trainer_bookings").insert([payload]).select().single();
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

      // remove slot from state
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

      // clear date if no more slots that day
      const remainingForDay = (byDate.get(selectedSlot.date) || []).filter(
        (s) => !(s.start_time === selectedSlot.start_time && s.end_time === selectedSlot.end_time)
      );
      if (remainingForDay.length === 0) setSelectedDateISO(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Κάτι πήγε στραβά. Παρακαλώ δοκιμάστε ξανά.";
      console.error("booking error:", e);
      setBanner({ type: "error", title: "Η κράτηση απέτυχε", message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  // helper: whether a calendar day is selectable
  const dayMeta = (dayNumber: number | null) => {
    if (!dayNumber) return { iso: null as string | null, inRange: false, hasSlots: false };
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
    const nextIndex = direction === "prev"
      ? (currentIndex > 0 ? currentIndex - 1 : daySlots.length - 1)
      : (currentIndex < daySlots.length - 1 ? currentIndex + 1 : 0);

    const nextSlot = daySlots[nextIndex];
    if (nextSlot) {
      const nextKey = `${nextSlot.date}|${nextSlot.start_time}|${nextSlot.end_time}`;
      setSelectedKey(nextKey);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto">
        {/* Feedback */}
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

        <div className="backdrop-blur-xl bg-black/20 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/10 bg-white/5">
            <div className="w-6" />
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-5 w-5 md:h-6 md:w-6 text-white/80" />
              <h1 className="text-lg md:text-xl font-medium text-white">Ραντεβού</h1>
            </div>
            <div className="w-6" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12 p-4 md:p-6 lg:p-8">
            {/* Left Column - Calendar */}
            <div className="space-y-6 transition-all duration-500 ease-out">
              {/* Calendar */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg md:text-xl font-medium text-white">
                    {months[displayMonth]} {displayYear}
                  </h2>
                  <div className="flex gap-2">
                    <CustomButton
                      variant="ghost"
                      size="sm"
                      onClick={() => shiftMonth(-1)}
                      disabled={!canPrevMonth}
                      className="h-10 w-10 md:h-10 md:w-10 p-0 text-white hover:bg-white/10 disabled:opacity-30 backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95"
                      aria-label="Προηγούμενος μήνας"
                    >
                      <ChevronLeft className="h-6 w-6 md:h-5 md:w-5" />
                    </CustomButton>
                    <CustomButton
                      variant="ghost"
                      size="sm"
                      onClick={() => shiftMonth(1)}
                      disabled={!canNextMonth}
                      className="h-10 w-10 md:h-10 md:w-10 p-0 text-white hover:bg-white/10 disabled:opacity-30 backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95"
                      aria-label="Επόμενος μήνας"
                    >
                      <ChevronRight className="h-6 w-6 md:h-5 md:w-5" />
                    </CustomButton>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
                  {weekDays.map((day) => (
                    <div key={day} className="text-center text-xs md:text-sm text-white/60 py-2 md:py-3">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 md:gap-2">
                  {calendarDays.map((day, idx) => {
                    const { iso, inRange, hasSlots } = dayMeta(day);
                    const isSelected = selectedDateISO === iso;
                    return (
                      <CustomButton
                        key={idx}
                        variant="ghost"
                        onClick={() => iso && inRange && hasSlots && setSelectedDateISO(iso)}
                        disabled={!day || !inRange || !hasSlots || loading}
                        className={`
                          h-10 md:h-12 w-full p-0 text-sm md:text-base backdrop-blur-sm transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 relative overflow-hidden
                          ${!day ? "invisible" : ""}
                          ${
                            isSelected
                              ? "bg-white text-black hover:bg-white shadow-2xl ring-2 ring-white/70 ring-offset-2 ring-offset-black/20 font-bold border border-white/50"
                              : "text-white hover:bg-white/15 hover:backdrop-blur-md"
                          }
                          ${(!inRange || !hasSlots) && day ? "opacity-35" : ""}
                          ${hasSlots && inRange && !isSelected ? "hover:ring-1 hover:ring-white/30" : ""}
                        `}
                        title={iso ? (hasSlots ? fmtDate(iso) : "Χωρίς διαθέσιμα") : ""}
                        aria-pressed={isSelected}
                      >
                        {isSelected && <div className="absolute inset-0 bg-white/95 rounded-md" />}
                        <span className={`relative z-10 font-bold ${isSelected ? "text-black" : ""}`}>{day}</span>
                      </CustomButton>
                    );
                  })}
                </div>

                {loading && (
                  <div className="flex items-center gap-3 text-white/60 pt-2 transition-all duration-300">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    <span className="text-sm md:text-base">Φόρτωση διαθεσιμότητας…</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Time Slots & Booking */}
            <div className="space-y-6 transition-all duration-500 ease-out">
              {selectedDateISO && (
                <div className="animate-slide-in" ref={timeSlotsRef}>
                  <div className="space-y-4">
                    <h3 className="text-sm md:text-base font-medium text-white">Διαθέσιμες Ώρες</h3>
                    <div className="flex gap-2 flex-wrap">
                      <CustomButton
                        variant={selectedPeriod === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedPeriod("all")}
                        className={`flex items-center gap-2 ${
                          selectedPeriod === "all"
                            ? "bg-gradient-to-r from-white via-white/95 to-white/90 text-black hover:from-white hover:via-white hover:to-white shadow-xl ring-2 ring-white/50 font-semibold"
                            : "bg-white/10 border-white/20 text-white hover:bg-white/25 hover:border-white/40 hover:backdrop-blur-md"
                        }`}
                        aria-pressed={selectedPeriod === "all"}
                      >
                        <span>Όλες</span>
                      </CustomButton>

                      <CustomButton
                        variant={selectedPeriod === "morning" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedPeriod("morning")}
                        className={`flex items-center gap-2 ${
                          selectedPeriod === "morning"
                            ? "bg-gradient-to-r from-white via-white/95 to-white/90 text-black hover:from-white hover:via-white hover:to-white shadow-xl ring-2 ring-white/50 font-semibold"
                            : "bg-white/10 border-white/20 text-white hover:bg-white/25 hover:border-white/40 hover:backdrop-blur-md"
                        }`}
                        aria-pressed={selectedPeriod === "morning"}
                      >
                        <Sun className="h-4 w-4" />
                        <span>Πρωί</span>
                      </CustomButton>

                      <CustomButton
                        variant={selectedPeriod === "afternoon" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedPeriod("afternoon")}
                        className={`flex items-center gap-2 ${
                          selectedPeriod === "afternoon"
                            ? "bg-gradient-to-r from-white via-white/95 to-white/90 text-black hover:from-white hover:via-white hover:to-white shadow-xl ring-2 ring-white/50 font-semibold"
                            : "bg-white/10 border-white/20 text-white hover:bg-white/25 hover:border-white/40 hover:backdrop-blur-md"
                        }`}
                        aria-pressed={selectedPeriod === "afternoon"}
                      >
                        <Sunset className="h-4 w-4" />
                        <span>Απόγευμα</span>
                      </CustomButton>

                      <CustomButton
                        variant={selectedPeriod === "night" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedPeriod("night")}
                        className={`flex items-center gap-2 ${
                          selectedPeriod === "night"
                            ? "bg-gradient-to-r from-white via-white/95 to-white/90 text-black hover:from-white hover:via-white hover:to-white shadow-xl ring-2 ring-white/50 font-semibold"
                            : "bg-white/10 border-white/20 text-white hover:bg-white/25 hover:border-white/40 hover:backdrop-blur-md"
                        }`}
                        aria-pressed={selectedPeriod === "night"}
                      >
                        <Moon className="h-4 w-4" />
                        <span>Βράδυ</span>
                      </CustomButton>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm md:text-base font-medium text-white">{fmtDate(selectedDateISO)}</h3>
                      <div className="flex gap-2">
                        <CustomButton
                          variant="ghost"
                          size="sm"
                          onClick={() => navigateTimeSlot("prev")}
                          disabled={daySlots.length === 0 || !selectedKey}
                          className="h-10 w-10 md:h-10 md:w-10 p-0 text-white hover:bg-white/20 disabled:opacity-30"
                          title="Προηγούμενη ώρα"
                          aria-label="Προηγούμενη ώρα"
                        >
                          <ChevronLeft className="h-6 w-6 md:h-5 md:w-5" />
                        </CustomButton>
                        <CustomButton
                          variant="ghost"
                          size="sm"
                          onClick={() => navigateTimeSlot("next")}
                          disabled={daySlots.length === 0 || !selectedKey}
                          className="h-10 w-10 md:h-10 md:w-10 p-0 text-white hover:bg-white/20 disabled:opacity-30"
                          title="Επόμενη ώρα"
                          aria-label="Επόμενη ώρα"
                        >
                          <ChevronRight className="h-6 w-6 md:h-5 md:w-5" />
                        </CustomButton>
                      </div>
                    </div>

                    {daySlots.length === 0 ? (
                      <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 text-amber-100 px-4 py-6 flex items-center gap-3 text-sm md:text-base">
                        <AlertTriangle className="h-5 w-5" />
                        Δεν υπάρχουν ανοικτά ραντεβού για το επιλεγμένο φίλτρο.
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
                        {daySlots.map((slot, idx) => {
                          const key = `${slot.date}|${slot.start_time}|${slot.end_time}`;
                          const selected = selectedKey === key;
                          return (
                            <CustomButton
                              key={key}
                              variant="outline"
                              onClick={() => setSelectedKey(key)}
                              className={`h-12 md:h-14 text-sm md:text-base relative ${
                                selected
                                  ? "bg-white/90 text-black border-white hover:bg-white ring-2 ring-white/50"
                                  : "bg-white/10 border-white/20 text-white hover:bg-white/30 hover:border-white/40"
                              }`}
                              title={`${slot.start_time}–${slot.end_time}`}
                              style={{ animationDelay: `${idx * 50}ms` as React.CSSProperties["animationDelay"] }}
                              aria-pressed={selected}
                            >
                              <span className={`font-medium ${selected ? "text-black" : "text-white"}`}>
                                {slot.start_time}
                              </span>
                              {slot.is_online && (
                                <span className={`absolute top-1 right-1 ${selected ? "opacity-70" : "opacity-80"}`}>
                                  <Wifi className="h-3 w-3" />
                                </span>
                              )}
                              {selected && (
                                <div className="absolute inset-0 rounded-md bg-gradient-to-r from-white/20 to-transparent pointer-events-none" />
                              )}
                            </CustomButton>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {selectedKey && (
                    <div className="text-center text-sm md:text-base text-white/70 py-2 mt-8 mb-6">
                      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/10 border border-white/20">
                        <Clock className="h-4 w-4" />
                        <span>Επιλέχθηκε: {fmtDate(selectedSlot?.date)} στις {selectedSlot?.start_time}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div ref={notesRef} className="rounded-lg border border-white/10 bg-white/5 text-white">
                <div className="flex flex-col space-y-1.5 p-4 md:p-6 pb-4">
                  <h3 className="text-sm md:text-base font-medium leading-none tracking-tight text-white">
                    Σημείωση (προαιρετική)
                  </h3>
                </div>
                <div className="p-4 md:p-6 pt-0">
                  <CustomTextarea
                    placeholder="Στόχοι, περιορισμοί, προτίμηση για εξοπλισμό κ.λπ."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    rows={3}
                  />
                </div>
              </div>

              {/* CTA */}
              <div className="pt-4" ref={continueRef}>
                <CustomButton
                  onClick={handleContinue}
                  disabled={!selectedKey || submitting}
                  className={`w-full h-12 md:h-14 text-base md:text-lg font-medium ${
                    selectedKey && !submitting
                      ? "bg-white/90 text-black hover:bg-white"
                      : "bg-white/10 text-white/50 cursor-not-allowed border border-white/10"
                  }`}
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
            </div>
          </div>
        </div>
      </div>

      {/* tiny local styles for simple animations */}
      <style jsx>{`
        @keyframes slide-in { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .animate-slide-in { animation: slide-in 0.5s ease-out; }
      `}</style>
    </div>
  );
};
