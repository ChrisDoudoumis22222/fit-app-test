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
  Calendar as CalendarPlus,
  ExternalLink,
  MapPin,
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

const generateGoogleCalendarUrl = (booking: {
  date: string;
  start_time: string;
  end_time: string;
  trainerName: string;
  is_online?: boolean | null;
}): string => {
  const { date, start_time, end_time, trainerName, is_online } = booking;

  const [year, month, day] = date.split("-").map(Number);
  const [startHour, startMin] = start_time.split(":").map(Number);
  const [endHour, endMin] = end_time.split(":").map(Number);

  const formatDateTime = (y: number, m: number, d: number, h: number, min: number) =>
    `${y}${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}${String(min).padStart(2, "0")}00`;

  const startDateTime = formatDateTime(year, month, day, startHour, startMin);
  const endDateTime = formatDateTime(year, month, day, endHour, endMin);

  const title = encodeURIComponent(`Προπόνηση με ${trainerName}`);
  const details = encodeURIComponent(
    is_online
      ? "Online συνεδρία προπόνησης. Θα λάβετε σύνδεσμο πριν την έναρξη."
      : "Προσωπική συνεδρία προπόνησης."
  );
  const location = encodeURIComponent(is_online ? "Online" : "Γυμναστήριο");

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateTime}/${endDateTime}&details=${details}&location=${location}`;
};

/* --------------------- Booking Confirmation Modal --------------------- */
const BookingConfirmationModal: React.FC<{
  isOpen: boolean;
  status: "success" | "error";
  onClose: () => void;
  onCancel?: () => void;
  bookingDetails?: {
    date: string;
    start_time: string;
    end_time: string;
    is_online?: boolean | null;
  } | null;
  trainerName: string;
  errorMessage?: string;
}> = ({
  isOpen,
  status,
  onClose,
  onCancel,
  bookingDetails,
  trainerName,
  errorMessage,
}) => {
  if (!isOpen) return null;

  const handleGoogleCalendar = () => {
    if (!bookingDetails) return;
    const url = generateGoogleCalendarUrl({
      date: bookingDetails.date,
      start_time: bookingDetails.start_time,
      end_time: bookingDetails.end_time,
      trainerName,
      is_online: bookingDetails.is_online,
    });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end lg:items-center justify-center p-0 lg:p-6 bg-black/80 backdrop-blur-md modal-fade"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative w-full lg:max-w-md lg:rounded-3xl rounded-t-3xl overflow-hidden bg-zinc-900",
          "modal-sheet-in lg:modal-pop-in"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "absolute inset-0 opacity-40",
            status === "success"
              ? "bg-gradient-to-br from-emerald-500/30 via-transparent to-transparent"
              : "bg-gradient-to-br from-red-500/30 via-transparent to-transparent"
          )}
        />

        <div className="relative z-10 p-6 lg:p-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
            aria-label="Κλείσιμο"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className={cn(
              "w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center",
              status === "success"
                ? "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30"
                : "bg-gradient-to-br from-red-400 to-red-600 shadow-lg shadow-red-500/30"
            )}
          >
            {status === "success" ? (
              <CheckCircle2 className="h-10 w-10 text-white" />
            ) : (
              <AlertTriangle className="h-10 w-10 text-white" />
            )}
          </div>

          <h2 className="text-2xl font-bold text-center text-white mb-2">
            {status === "success" ? "Επιτυχής Κράτηση!" : "Η Κράτηση Απέτυχε"}
          </h2>

          {status === "success" && bookingDetails ? (
            <>
              <div className="space-y-3 mb-6 mt-6">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                  <CalendarIcon className="h-5 w-5 text-emerald-400" />
                  <div>
                    <p className="text-xs text-zinc-500">Ημερομηνία</p>
                    <p className="text-white font-medium">{fmtDate(bookingDetails.date)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                  <Clock className="h-5 w-5 text-emerald-400" />
                  <div>
                    <p className="text-xs text-zinc-500">Ώρα</p>
                    <p className="text-white font-medium">
                      {bookingDetails.start_time} - {bookingDetails.end_time}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                  {bookingDetails.is_online ? (
                    <Wifi className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <MapPin className="h-5 w-5 text-emerald-400" />
                  )}
                  <div>
                    <p className="text-xs text-zinc-500">Τοποθεσία</p>
                    <p className="text-white font-medium">
                      {bookingDetails.is_online ? "Online Συνεδρία" : "Δια Ζώσης"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6">
                <Mail className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-200/90 leading-relaxed">
                  Θα λάβετε επιβεβαίωση στο email σας εντός 24 ωρών.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleGoogleCalendar}
                  className="w-full h-14 bg-white text-zinc-900 hover:bg-zinc-100 font-semibold rounded-2xl transition-all duration-200 shadow-lg shadow-white/10 active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <CalendarPlus className="h-5 w-5" />
                  <span>Προσθήκη στο Google Calendar</span>
                  <ExternalLink className="h-4 w-4 opacity-50" />
                </button>

                <button
                  onClick={handleCancel}
                  className="w-full h-12 text-red-300 hover:text-red-200 hover:bg-red-500/10 font-medium rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <X className="h-4 w-4" />
                  <span>Ακύρωση Κράτησης</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-center text-zinc-400 mb-6 leading-relaxed">
                {errorMessage || "Κάτι πήγε στραβά. Παρακαλώ δοκιμάστε ξανά."}
              </p>

              <button
                onClick={onClose}
                className="w-full h-14 bg-white text-zinc-900 hover:bg-zinc-100 font-semibold rounded-2xl transition-all duration-200 shadow-lg shadow-white/10 active:scale-[0.98]"
              >
                Δοκιμάστε Ξανά
              </button>
            </>
          )}
        </div>
      </div>
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
    <div className="fixed top-4 left-4 right-4 z-[100] lg:left-1/2 lg:-translate-x-1/2 lg:max-w-md lg:w-full">
      <div
        className={cn(
          "relative rounded-2xl backdrop-blur-xl shadow-2xl banner-in",
          isSuccess ? "bg-emerald-500/90 text-white" : "bg-red-500/90 text-white"
        )}
      >
        <div className="p-4 flex items-start gap-3">
          <div className="shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            {isSuccess ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-sm opacity-90">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
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

  const timeSlotsRef = useRef<HTMLDivElement | null>(null);
  const notesRef = useRef<HTMLDivElement | null>(null);

  /* ---------------------- real data fetch ---------------------- */
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

        /* Fallback: derive slots from weekly availability if trainer_open_slots is empty */
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
    const userId = sess?.session?.user?.id;

    if (!userId) {
      setModalState({
        isOpen: true,
        status: "error",
        errorMessage: "Συνδεθείτε για να ολοκληρώσετε την κράτηση.",
      });
      return;
    }

    try {
      setSubmitting(true);
      setBanner(null);

      const slot = (byDate.get(selectedSlot.date) || []).find(
        (s) =>
          s.start_time === selectedSlot.start_time &&
          s.end_time === selectedSlot.end_time
      );

      if (!slot) {
        throw new Error("Το ραντεβού δεν είναι πλέον διαθέσιμο.");
      }

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
        is_online: !!slot.is_online,
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
        message: "Το ραντεβού σας έχει ακυρωθεί επιτυχώς.",
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

  return (
    <div className="w-full min-h-screen bg-zinc-950">
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

      <div className="w-full lg:min-h-screen lg:flex lg:items-center lg:justify-center lg:py-12 lg:px-8">
        <div className="w-full lg:max-w-6xl">
          <header className="sticky top-0 z-50 lg:static flex items-center justify-center px-5 py-4 lg:py-0 lg:mb-10 border-b border-white/5 lg:border-0 bg-zinc-950/95 backdrop-blur-xl lg:bg-transparent lg:backdrop-blur-none">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-white to-zinc-300 flex items-center justify-center shadow-lg shadow-white/10">
                <CalendarIcon className="h-5 w-5 text-zinc-900" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">
                  Κλείσε Ραντεβού
                </h1>
                <p className="text-sm text-zinc-500 hidden lg:block">
                  με {trainerName}
                </p>
              </div>
            </div>
          </header>

          <div
            className={cn(
              "lg:flex lg:gap-10 xl:gap-14",
              !hasDateSelection && "lg:justify-center"
            )}
          >
            <section
              className={cn(
                "transition-all duration-500 ease-out",
                hasDateSelection
                  ? "lg:w-[380px] xl:w-[420px] lg:shrink-0"
                  : "w-full max-w-md lg:max-w-lg mx-auto"
              )}
            >
              <div className="p-5 lg:p-0">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                      {months[displayMonth]}
                    </h2>
                    <p className="text-sm text-zinc-500 mt-1">{displayYear}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => shiftMonth(-1)}
                      disabled={!canPrevMonth}
                      className={cn(
                        "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300 ease-out",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                        "disabled:opacity-30 disabled:pointer-events-none",
                        canPrevMonth
                          ? "bg-white/5 hover:bg-white/10 hover:scale-105 active:scale-95 text-white"
                          : "text-zinc-600"
                      )}
                      aria-label="Προηγούμενος μήνας"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>

                    <button
                      onClick={() => shiftMonth(1)}
                      disabled={!canNextMonth}
                      className={cn(
                        "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300 ease-out",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                        "disabled:opacity-30 disabled:pointer-events-none",
                        canNextMonth
                          ? "bg-white/5 hover:bg-white/10 hover:scale-105 active:scale-95 text-white"
                          : "text-zinc-600"
                      )}
                      aria-label="Επόμενος μήνας"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-3">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="text-center text-[11px] font-semibold tracking-wider text-zinc-600 py-2"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((day, idx) => {
                    const { iso, inRange, hasSlots } = dayMeta(day);
                    const isSelected = selectedDateISO === iso;
                    const isToday = iso === localDateISO(0);

                    return (
                      <button
                        key={idx}
                        onClick={() =>
                          iso && inRange && hasSlots && setSelectedDateISO(iso)
                        }
                        disabled={!day || !inRange || !hasSlots || loading}
                        className={cn(
                          "aspect-square w-full p-0 text-sm lg:text-base relative rounded-2xl transition-all duration-300 ease-out",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                          "disabled:pointer-events-none",
                          !day && "invisible",
                          isSelected
                            ? "bg-white text-zinc-900 font-bold shadow-xl shadow-white/20 scale-[1.08]"
                            : hasSlots && inRange
                            ? "bg-white/[0.04] text-white font-medium hover:bg-white/10 hover:scale-[1.05] active:scale-95"
                            : isToday
                            ? "text-zinc-500 ring-1 ring-zinc-800"
                            : "text-zinc-700"
                        )}
                        aria-pressed={isSelected}
                        aria-label={iso ? (hasSlots ? fmtDate(iso) : "Χωρίς διαθέσιμα") : ""}
                      >
                        {day}
                        {hasSlots && inRange && !isSelected && (
                          <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {loading && (
                  <div className="flex items-center justify-center gap-3 text-zinc-500 pt-10">
                    <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
                    <span className="text-sm">Φόρτωση...</span>
                  </div>
                )}

                {!loading && !hasDateSelection && (
                  <div className="mt-8 text-center">
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      Επιλέξτε ημερομηνία με{" "}
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-zinc-400">διαθεσιμότητα</span>
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </section>

            {hasDateSelection && (
              <section
                ref={timeSlotsRef}
                className="flex-1 panel-reveal-desktop panel-reveal-mobile"
              >
                <div className="px-5 py-4 lg:hidden border-t border-white/5 bg-white/[0.02]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Επιλέχθηκε</p>
                        <p className="text-white font-semibold">{fmtDateShort(selectedDateISO)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedDateISO(null);
                        setSelectedKey(null);
                      }}
                      className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                    >
                      Αλλαγή
                    </button>
                  </div>
                </div>

                <div className="hidden lg:block mb-8 desktop-top-reveal">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-sm text-zinc-500 mb-1">Επιλεγμένη ημερομηνία</p>
                      <h3 className="text-2xl font-bold text-white">{fmtDate(selectedDateISO)}</h3>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedDateISO(null);
                        setSelectedKey(null);
                      }}
                      className="text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                      Αλλαγή ημερομηνίας
                    </button>
                  </div>
                </div>

                <div className="p-5 lg:p-0 space-y-6">
                  <div className="desktop-block-reveal" style={{ animationDelay: "40ms" }}>
                    <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
                      Φίλτρα ώρας
                    </p>
                    <div className="grid grid-cols-2 lg:flex lg:flex-wrap gap-2">
                      {[
                        { key: "all" as const, label: "Όλες", icon: null, count: periodCounts.all },
                        { key: "morning" as const, label: "Πρωί", icon: Sun, count: periodCounts.morning },
                        { key: "afternoon" as const, label: "Απόγευμα", icon: Sunset, count: periodCounts.afternoon },
                        { key: "night" as const, label: "Βράδυ", icon: Moon, count: periodCounts.night },
                      ].map(({ key, label, icon: Icon, count }) => (
                        <button
                          key={key}
                          onClick={() => setSelectedPeriod(key)}
                          disabled={count === 0}
                          className={cn(
                            "flex items-center justify-center gap-2 px-4 py-3 lg:py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                            "disabled:opacity-30 disabled:pointer-events-none",
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
                              "text-xs px-1.5 py-0.5 rounded-md",
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
                  </div>

                  <div className="desktop-block-reveal" style={{ animationDelay: "90ms" }}>
                    {daySlots.length === 0 ? (
                      <div className="flex items-center gap-4 p-5 rounded-2xl bg-amber-500/10 text-amber-200">
                        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                        <p className="text-sm">
                          Δεν υπάρχουν διαθέσιμα ραντεβού. Δοκιμάστε άλλη περίοδο.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
                          Διαθέσιμες ώρες
                        </p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {daySlots.map((slot, index) => {
                            const key = `${slot.date}|${slot.start_time}|${slot.end_time}`;
                            const selected = selectedKey === key;

                            return (
                              <button
                                key={key}
                                onClick={() => setSelectedKey(key)}
                                style={{ animationDelay: `${Math.min(index * 26, 156)}ms` }}
                                className={cn(
                                  "group relative h-16 lg:h-20 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 ease-out slot-soft-in",
                                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                                  selected
                                    ? "bg-white text-zinc-900 shadow-xl shadow-white/20 scale-[1.03]"
                                    : "bg-white/[0.03] text-white hover:bg-white/[0.08] hover:scale-[1.02] active:scale-95"
                                )}
                                aria-pressed={selected}
                              >
                                <span className="text-lg lg:text-xl font-bold">
                                  {formatSlotLabel(slot.start_time)}
                                </span>
                                <span className="text-xs font-medium text-zinc-500">
                                  έως {hhmm(slot.end_time)}
                                </span>

                                {slot.is_online && (
                                  <span className="absolute top-2.5 right-2.5">
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
                  </div>

                  {hasSlotSelection && (
                    <div
                      className="summary-soft-in"
                      style={{ animationDelay: "40ms" }}
                    >
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-500/10">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-sm text-emerald-300/80">Επιλέχθηκε ώρα</p>
                          <p className="text-white font-bold">
                            {selectedSlot?.start_time} - {selectedSlot?.end_time}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {hasSlotSelection && (
                  <div
                    ref={notesRef}
                    className="mt-6 px-5 lg:px-0 summary-soft-in"
                    style={{ animationDelay: "70ms" }}
                  >
                    <div className="mb-4">
                      <h3 className="text-base font-semibold text-white">
                        Σημείωση{" "}
                        <span className="text-zinc-500 font-normal">(προαιρετική)</span>
                      </h3>
                      <p className="text-sm text-zinc-500 mt-1">
                        Πληροφορίες που θέλετε να γνωρίζει ο προπονητής
                      </p>
                    </div>

                    <textarea
                      placeholder="π.χ. Στόχοι, τραυματισμοί, προτιμήσεις..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full min-h-[120px] rounded-2xl bg-white/[0.03] px-5 py-4 text-white placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 resize-none transition-all hover:bg-white/[0.05]"
                    />
                  </div>
                )}

                {hasSlotSelection && (
                  <div
                    className="px-5 lg:px-0 pt-6 pb-6 lg:pb-0 summary-soft-in"
                    style={{ animationDelay: "95ms" }}
                  >
                    <button
                      onClick={handleContinue}
                      disabled={!selectedKey || submitting}
                      className={cn(
                        "w-full h-14 lg:h-16 text-base lg:text-lg font-bold rounded-2xl transition-all duration-300 ease-out flex items-center justify-center gap-3",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                        selectedKey && !submitting
                          ? "bg-white text-zinc-900 hover:bg-zinc-100 shadow-xl shadow-white/15 hover:shadow-2xl hover:shadow-white/20 active:scale-[0.97]"
                          : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      )}
                    >
                      {submitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin" />
                          <span>Γίνεται κράτηση...</span>
                        </>
                      ) : (
                        <>
                          <CalendarPlus className="h-5 w-5" />
                          <span>Ολοκλήρωση Κράτησης</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-fade {
          animation: modalFade 0.22s ease-out;
        }

        .modal-sheet-in {
          animation: modalSheetIn 0.28s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .modal-pop-in {
          animation: modalPopIn 0.24s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .banner-in {
          animation: bannerIn 0.26s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .panel-reveal-mobile {
          animation: panelRevealMobile 0.32s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .desktop-top-reveal,
        .desktop-block-reveal,
        .summary-soft-in {
          opacity: 0;
          animation-fill-mode: forwards;
        }

        @media (min-width: 1024px) {
          .panel-reveal-desktop {
            animation: panelRevealDesktop 0.46s cubic-bezier(0.22, 1, 0.36, 1);
            transform-origin: top center;
          }

          .desktop-top-reveal {
            animation: softFadeUp 0.42s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          }

          .desktop-block-reveal {
            animation: softFadeUp 0.46s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          }

          .summary-soft-in {
            animation: softFadeUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          }
        }

        @media (max-width: 1023px) {
          .summary-soft-in {
            animation: panelRevealMobile 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          }
        }

        .slot-soft-in {
          opacity: 0;
          animation: slotSoftIn 0.34s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        @keyframes modalFade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes modalSheetIn {
          from {
            opacity: 0;
            transform: translateY(22px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes modalPopIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes bannerIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes panelRevealDesktop {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.992);
            filter: blur(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        @keyframes panelRevealMobile {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes softFadeUp {
          from {
            opacity: 0;
            transform: translateY(12px);
            filter: blur(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }

        @keyframes slotSoftIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .modal-fade,
          .modal-sheet-in,
          .modal-pop-in,
          .banner-in,
          .panel-reveal-mobile,
          .panel-reveal-desktop,
          .desktop-top-reveal,
          .desktop-block-reveal,
          .summary-soft-in,
          .slot-soft-in {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
            filter: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AllInOneBooking;