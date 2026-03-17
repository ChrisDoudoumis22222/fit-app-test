// ../components/QuickBookModal.tsx
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "../supabaseClient";
import {
  X,
  Calendar as CalendarIcon,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Wifi,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Mail,
  Phone,
} from "lucide-react";

/* ───────── helpers ───────── */
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
];

const weekDays = ["ΔΕΥ", "ΤΡΙ", "ΤΕΤ", "ΠΕΜ", "ΠΑΡ", "ΣΑΒ", "ΚΥΡ"];

const localDateISO = (offsetDays = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const toISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const hhmm = (t: string) =>
  typeof t === "string" ? t.match(/^(\d{1,2}:\d{2})/)?.[1] || t : t;

const timeToMinutes = (t: string) => {
  const m = (t || "").match(/^(\d{1,2}):(\d{2})/);
  if (!m) return Number.NaN;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
};

const overlaps = (
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
) => {
  const as = timeToMinutes(hhmm(aStart));
  const ae = timeToMinutes(hhmm(aEnd));
  const bs = timeToMinutes(hhmm(bStart));
  const be = timeToMinutes(hhmm(bEnd));
  return as < be && ae > bs;
};

const withinDate = (d: string, f: string, t: string) => {
  const D = new Date(`${d}T00:00:00`);
  const F = new Date(`${f}T00:00:00`);
  const T = new Date(`${t}T00:00:00`);
  return D >= F && D <= new Date(T.getTime() + 86399999);
};

const fmtDate = (d: string) => {
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

const toGoogleCalendarDate = (dateISO: string, time: string) => {
  const [year, month, day] = dateISO.split("-").map(Number);
  const [hours, minutes] = hhmm(time).split(":").map(Number);

  const date = new Date(year, month - 1, day, hours, minutes, 0);

  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");

  return `${yyyy}${mm}${dd}T${hh}${min}${ss}Z`;
};

const buildGoogleCalendarUrl = ({
  trainerName,
  date,
  start_time,
  end_time,
}: {
  trainerName: string;
  date: string;
  start_time: string;
  end_time: string;
}) => {
  const text = `Προπόνηση με ${trainerName}`;
  const details = `Κράτηση μέσω Peak Velocity με τον/την ${trainerName}.`;
  const dates = `${toGoogleCalendarDate(date, start_time)}/${toGoogleCalendarDate(
    date,
    end_time
  )}`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text,
    dates,
    details,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

// four buckets
type Period = "morning" | "midday" | "afternoon" | "night";

const getPeriod4 = (start: string): Period => {
  const m = timeToMinutes(hhmm(start));
  if (!Number.isFinite(m)) return "morning";
  if (m < 12 * 60) return "morning";
  if (m < 16 * 60) return "midday";
  if (m < 20 * 60) return "afternoon";
  return "night";
};

const getErrorText = (error: any) =>
  `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();

const isMissingGuestColumnsError = (error: any) => {
  const txt = getErrorText(error);
  return (
    txt.includes("guest_name") ||
    txt.includes("guest_email") ||
    txt.includes("guest_phone") ||
    txt.includes('column "guest_') ||
    txt.includes("does not exist")
  );
};

const isUserIdPolicyOrConstraintError = (error: any) => {
  const txt = getErrorText(error);
  return (
    txt.includes("user_id") &&
    (txt.includes("null value") ||
      txt.includes("not-null") ||
      txt.includes("not null") ||
      txt.includes("violates row-level security") ||
      txt.includes("row-level security"))
  );
};

/* ───────── ui primitives ───────── */
const Btn = ({
  children,
  onClick,
  disabled = false,
  variant = "default",
  size = "default",
  className = "",
  title,
  type,
  as = "button",
  href,
  target,
  rel,
}: {
  children: ReactNode;
  onClick?: (e: any) => void;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost" | "danger";
  size?: "default" | "sm";
  className?: string;
  title?: string;
  type?: "button" | "submit";
  as?: "button" | "a";
  href?: string;
  target?: string;
  rel?: string;
}) => {
  const base =
    "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    default: "bg-white text-black hover:bg-neutral-100",
    outline:
      "border border-white/15 bg-neutral-900 text-white hover:bg-neutral-800",
    ghost: "text-white hover:bg-neutral-900",
    danger: "bg-red-500 text-white hover:bg-red-600",
  } as const;
  const sizes = {
    default: "h-11 px-4",
    sm: "h-9 px-3 text-sm",
  } as const;

  const classes = `${base} ${
    variants[variant as keyof typeof variants]
  } ${sizes[size as keyof typeof sizes]} ${className}`;

  if (as === "a") {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        title={title}
        className={classes}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type={type || "button"}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={classes}
    >
      {children}
    </button>
  );
};

/* ───────── types & constants ───────── */
type SlotRow = {
  date: string;
  start_time: string;
  end_time: string;
  is_online?: boolean;
  status?: string | null;
};

type SelectedSlot = {
  date: string;
  start_time: string;
  end_time: string;
  is_online?: boolean;
};

type Props = {
  open: boolean;
  trainer: { id: string; full_name?: string; avatar_url?: string } | null;
  onClose: () => void;
  onBooked?: (row: any) => void;
};

type BookingInsertPayload = {
  trainer_id: string;
  user_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  duration_min: number;
  break_before_min: number;
  break_after_min: number;
  note: string | null;
  status: string;
  is_online: boolean;
  created_at: string;
  guest_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
};

const AVATAR_PLACEHOLDER = "https://www.gravatar.com/avatar/?d=mp&s=120";

/* ───────── main popup ───────── */
export default function QuickBookModal({
  open,
  trainer,
  onClose,
  onBooked,
}: Props) {
  const trainerId = trainer?.id;
  const trainerName = trainer?.full_name || "Προπονητής";

  type Step = "date" | "period" | "time" | "note" | "success";
  const [step, setStep] = useState<Step>("date");
  const [direction, setDirection] = useState<1 | -1>(1);

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

  const [monthIndex, setMonthIndex] = useState(initialIndex);
  const displayYear = Math.floor(monthIndex / 12);
  const displayMonth = monthIndex % 12;
  const canPrevMonth = monthIndex > initialIndex;
  const canNextMonth = monthIndex < maxIndex;

  const [selectedDateISO, setSelectedDateISO] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("morning");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [broken, setBroken] = useState(false);

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  const [openRows, setOpenRows] = useState<SlotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  const [showNoScheduleToast, setShowNoScheduleToast] = useState(false);

  const byDate = useMemo(() => {
    const m = new Map<string, SlotRow[]>();
    for (const r of openRows) {
      const key = r.date;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    m.forEach((arr) => {
      arr.sort(
        (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
      );
    });
    return m;
  }, [openRows]);

  const availableDateSet = useMemo(
    () => new Set(Array.from(byDate.keys())),
    [byDate]
  );

  const daySlots = useMemo(() => {
    if (!selectedDateISO) return [];
    const list = byDate.get(selectedDateISO) || [];
    return list.filter((s) => getPeriod4(s.start_time) === period);
  }, [selectedDateISO, period, byDate]);

  const selectedSlot = useMemo(() => {
    if (!selectedKey) return null as SelectedSlot | null;
    const [date, start, end] = selectedKey.split("|");
    const match = (byDate.get(date) || []).find(
      (s) => s.start_time === start && s.end_time === end
    );
    return {
      date,
      start_time: start,
      end_time: end,
      is_online: !!match?.is_online,
    };
  }, [selectedKey, byDate]);

  const resetFlow = () => {
    setStep("date");
    setDirection(1);
    setSelectedDateISO(null);
    setPeriod("morning");
    setSelectedKey(null);
    setNote("");
    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
    setBanner(null);
    setBroken(false);
    setMonthIndex(initialIndex);
  };

  useEffect(() => {
    if (!open) return;
    resetFlow();
    setShowNoScheduleToast(false);
  }, [open, initialIndex]);

  useEffect(() => {
    let mounted = true;

    const readSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setAuthUserId(data?.session?.user?.id || null);
      } catch {
        if (!mounted) return;
        setAuthUserId(null);
      }
    };

    if (open) readSession();

    return () => {
      mounted = false;
    };
  }, [open]);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (!open || !trainerId) return;

      try {
        setLoading(true);

        const { data: bookedData } = await supabase
          .from("trainer_bookings")
          .select("date,start_time,end_time,status")
          .eq("trainer_id", trainerId)
          .gte("date", rangeStartISO)
          .lte("date", rangeEndISO)
          .in("status", ["pending", "accepted"]);

        const bookedRows = (bookedData || []).map((b) => ({
          date: b.date,
          start_time: hhmm(b.start_time),
          end_time: hhmm(b.end_time),
        }));

        const { data: openData } = await supabase
          .from("trainer_open_slots")
          .select("date,start_time,end_time,is_online,status")
          .eq("trainer_id", trainerId)
          .gte("date", rangeStartISO)
          .lte("date", rangeEndISO)
          .order("date", { ascending: true })
          .order("start_time", { ascending: true });

        const { data: avData } = await supabase
          .from("trainer_availability")
          .select("weekday,start_time,end_time,is_online")
          .eq("trainer_id", trainerId);

        const { data: holData } = await supabase
          .from("trainer_holidays")
          .select("starts_on,ends_on")
          .eq("trainer_id", trainerId);

        if (!alive) return;

        const wav = avData || [];
        const hol = holData || [];

        const usableStatus = (s: any) => {
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

        const isHoliday = (d: string) =>
          (hol || []).some((h) => withinDate(d, h.starts_on, h.ends_on));

        let filtered = (openData || []).filter((r) => {
          if (!usableStatus(r.status)) return false;
          if (isHoliday(r.date)) return false;

          const overlap = (bookedRows || []).some(
            (b) =>
              b.date === r.date &&
              overlaps(r.start_time, r.end_time, b.start_time, b.end_time)
          );

          return !overlap;
        }) as SlotRow[];

        if (filtered.length === 0 && (wav || []).length > 0) {
          const start = new Date(`${rangeStartISO}T00:00:00`);
          const weekdayNames = [
            "sunday",
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
          ];

          const derived: SlotRow[] = [];

          for (let i = 0; i < 30; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const iso = toISODate(d);

            if (isHoliday(iso)) continue;

            const weekdayKey = weekdayNames[d.getDay()];
            const daySlots = (wav || []).filter(
              (x: any) => x.weekday === weekdayKey
            );

            for (const s of daySlots) {
              const overlap = (bookedRows || []).some(
                (b) =>
                  b.date === iso &&
                  overlaps(
                    s.start_time,
                    s.end_time,
                    b.start_time,
                    b.end_time
                  )
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

        const openLen = (openData || []).length;
        if ((wav || []).length === 0 && openLen === 0)
          setShowNoScheduleToast(true);
        else setShowNoScheduleToast(false);
      } catch (e: any) {
        console.error(e);
        setBanner({
          type: "error",
          title: "Σφάλμα",
          message: "Δεν ήταν δυνατή η φόρτωση διαθεσιμότητας.",
        });
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();

    return () => {
      alive = false;
    };
  }, [open, trainerId, rangeStartISO, rangeEndISO]);

  const getDaysInMonth = (month: number, year: number) =>
    new Date(year, month + 1, 0).getDate();

  const getFirstDayOfMonthIndex = (month: number, year: number) => {
    const firstDay = new Date(year, month, 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1;
  };

  const daysInMonth = getDaysInMonth(displayMonth, displayYear);
  const firstDayIdx = getFirstDayOfMonthIndex(displayMonth, displayYear);
  const calendarDays = Array.from({ length: 42 }, (_, i) => {
    const dayNumber = i - firstDayIdx + 1;
    return dayNumber > 0 && dayNumber <= daysInMonth ? dayNumber : null;
  });

  const shiftMonth = (delta: number) => {
    const next = Math.min(Math.max(monthIndex + delta, initialIndex), maxIndex);
    setMonthIndex(next);
  };

  const goBack = (to: Step) => {
    setDirection(-1);
    setStep(to);
  };

  const goNext = (to: Step) => {
    setDirection(1);
    setStep(to);
  };

  const selectDate = (iso: string) => {
    setSelectedDateISO(iso);
    goNext("period");
  };

  const selectPeriod = (p: Period) => {
    setPeriod(p);
    setSelectedKey(null);
    goNext("time");
  };

  const selectTime = (slot: SlotRow) => {
    setSelectedKey(`${slot.date}|${slot.start_time}|${slot.end_time}`);
    goNext("note");
  };

  const insertBookingWithFallback = async (payload: BookingInsertPayload) => {
    let result = await supabase
      .from("trainer_bookings")
      .insert([payload])
      .select()
      .single();

    if (!result.error) return result;

    if (isMissingGuestColumnsError(result.error)) {
      const fallbackPayload = {
        trainer_id: payload.trainer_id,
        user_id: payload.user_id,
        date: payload.date,
        start_time: payload.start_time,
        end_time: payload.end_time,
        duration_min: payload.duration_min,
        break_before_min: payload.break_before_min,
        break_after_min: payload.break_after_min,
        note: payload.note,
        status: payload.status,
        is_online: payload.is_online,
        created_at: payload.created_at,
      };

      result = await supabase
        .from("trainer_bookings")
        .insert([fallbackPayload])
        .select()
        .single();
    }

    return result;
  };

  const submitBooking = async () => {
    if (!trainerId || !selectedSlot) return;

    try {
      setSubmitting(true);
      setBanner(null);

      const { data: sess } = await supabase.auth.getSession();
      const userId = sess?.session?.user?.id || null;
      setAuthUserId(userId);

      const slot = (byDate.get(selectedSlot.date) || []).find(
        (s) =>
          s.start_time === selectedSlot.start_time &&
          s.end_time === selectedSlot.end_time
      );

      const startMinutes = timeToMinutes(selectedSlot.start_time);
      const endMinutes = timeToMinutes(selectedSlot.end_time);
      const duration = Math.max(0, endMinutes - startMinutes) || 60;

      const payload: BookingInsertPayload = {
        trainer_id: trainerId,
        user_id: userId,
        date: selectedSlot.date,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        duration_min: duration,
        break_before_min: 0,
        break_after_min: 0,
        note: note.trim() || null,
        status: "pending",
        is_online: !!slot?.is_online,
        created_at: new Date().toISOString(),
        guest_name: guestName.trim() || null,
        guest_email: guestEmail.trim() || null,
        guest_phone: guestPhone.trim() || null,
      };

      const { data, error } = await insertBookingWithFallback(payload);

      if (error) {
        if (!userId && isUserIdPolicyOrConstraintError(error)) {
          throw new Error(
            "Το frontend είναι έτοιμο για guest booking, αλλά ο πίνακας trainer_bookings ή το RLS policy σου ακόμα απαιτεί user_id. Κάνε το user_id nullable ή πρόσθεσε policy για guest inserts."
          );
        }
        throw error;
      }

      setOpenRows((prev) =>
        prev.filter(
          (r) =>
            !(
              r.date === selectedSlot.date &&
              r.start_time === selectedSlot.start_time &&
              r.end_time === selectedSlot.end_time
            )
        )
      );

      goNext("success");
      onBooked?.(data);
    } catch (e: any) {
      console.error(e);
      setBanner({
        type: "error",
        title: "Η κράτηση απέτυχε",
        message: e?.message || "Δοκιμάστε ξανά.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const avatarSrc =
    !broken && trainer?.avatar_url && trainer.avatar_url.trim()
      ? trainer.avatar_url
      : AVATAR_PLACEHOLDER;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-3 backdrop-blur-md sm:p-6 anim-overlay-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl anim-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-black px-5 py-4 sm:px-6">
          <div className="min-w-0 flex items-center gap-3 text-white">
            <img
              src={avatarSrc}
              alt={trainerName}
              className="h-8 w-8 rounded-full bg-neutral-800 object-cover ring-1 ring-white/15"
              onError={(e) => {
                if (!broken) {
                  setBroken(true);
                  (e.currentTarget as HTMLImageElement).src =
                    AVATAR_PLACEHOLDER;
                }
              }}
            />

            <div className="min-w-0 flex items-center gap-2">
              <CalendarIcon className="hidden h-5 w-5 sm:block" />
              <div className="truncate font-semibold">Γρήγορη Κράτηση</div>
              <div className="truncate text-white/60">• {trainerName}</div>
            </div>
          </div>

          <Btn variant="ghost" size="sm" onClick={onClose} title="Κλείσιμο">
            <X className="h-5 w-5" />
          </Btn>
        </div>

        {banner && (
          <div className="px-5 pt-3 sm:px-6">
            <div
              className={`rounded-2xl border px-4 py-3 ${
                banner.type === "error"
                  ? "border-red-400/30 bg-red-500/15 text-red-100"
                  : "border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
              }`}
            >
              <div className="flex items-start gap-2">
                {banner.type === "error" ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-4 w-4" />
                )}

                <div>
                  <div className="font-medium">{banner.title}</div>
                  <div className="text-sm opacity-90">{banner.message}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2 text-xs text-white/70">
            <StepDot active={step === "date"}>Ημ/νία</StepDot>
            <Bar />
            <StepDot active={step === "period"}>Ζώνη</StepDot>
            <Bar />
            <StepDot active={step === "time"}>Ώρα</StepDot>
            <Bar />
            <StepDot active={step === "note"}>Σχόλιο</StepDot>
          </div>

          <div
            key={step}
            className={direction === 1 ? "anim-step-right" : "anim-step-left"}
          >
            {step === "date" && (
              <DateStep
                loading={loading}
                displayMonth={displayMonth}
                displayYear={displayYear}
                canPrevMonth={canPrevMonth}
                canNextMonth={canNextMonth}
                shiftMonth={shiftMonth}
                calendarDays={calendarDays}
                dayMeta={(dayNumber: number | null) => {
                  if (!dayNumber)
                    return { iso: null, inRange: false, hasSlots: false };

                  const dObj = new Date(displayYear, displayMonth, dayNumber);
                  const iso = toISODate(dObj);
                  const inRange = dObj >= minDateObj && dObj <= maxDateObj;
                  const hasSlots = availableDateSet.has(iso);

                  return { iso, inRange, hasSlots };
                }}
                onPick={(iso) => selectDate(iso)}
              />
            )}

            {step === "period" && (
              <PeriodStep
                period={period}
                onPick={(p) => selectPeriod(p)}
                onBack={() => goBack("date")}
              />
            )}

            {step === "time" && selectedDateISO && (
              <TimeStep
                dateISO={selectedDateISO}
                slots={daySlots}
                onPick={(slot) => selectTime(slot)}
                onBack={() => goBack("period")}
              />
            )}

            {step === "note" && selectedSlot && (
              <NoteStep
                slot={selectedSlot}
                trainerName={trainerName}
                note={note}
                setNote={setNote}
                guestName={guestName}
                setGuestName={setGuestName}
                guestEmail={guestEmail}
                setGuestEmail={setGuestEmail}
                guestPhone={guestPhone}
                setGuestPhone={setGuestPhone}
                showGuestFields={!authUserId}
                submitting={submitting}
                onBack={() => goBack("time")}
                onSubmit={submitBooking}
              />
            )}

            {step === "success" && selectedSlot && (
              <SuccessStep
                trainerName={trainerName}
                slot={selectedSlot}
                onClose={onClose}
                onCreateAnother={resetFlow}
              />
            )}
          </div>
        </div>
      </div>

      {showNoScheduleToast && (
        <div className="fixed bottom-4 left-1/2 z-[210] -translate-x-1/2 sm:bottom-6 anim-toast-in">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black px-4 py-2 text-white shadow-xl">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="whitespace-nowrap text-sm">
              Ο προπονητής δεν έχει ανεβάσει διαθέσιμες ημερομηνίες — δοκιμάστε
              άλλον/η.
            </span>
            <button
              onClick={() => setShowNoScheduleToast(false)}
              className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 hover:bg-neutral-800"
              title="Κλείσιμο"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes overlayIn {
          from { opacity: 0 }
          to { opacity: 1 }
        }
        .anim-overlay-in { animation: overlayIn .18s ease-out both; }

        @keyframes modalIn {
          from { opacity: 0; transform: translateY(10px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .anim-modal-in { animation: modalIn .22s cubic-bezier(.2,.7,.2,1) both; }

        @keyframes slideRightIn {
          from { opacity: 0; transform: translateX(16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideLeftIn {
          from { opacity: 0; transform: translateX(-16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .anim-step-right { animation: slideRightIn .22s ease-out both; }
        .anim-step-left { animation: slideLeftIn .22s ease-out both; }

        @keyframes toastIn {
          from { opacity: 0; transform: translate(-50%, 6px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .anim-toast-in { animation: toastIn .24s ease-out both; }
      `}</style>
    </div>
  );
}

/* ───────── steps ───────── */
function StepDot({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-2.5 w-2.5 rounded-full ${
          active ? "bg-white" : "bg-white/25"
        }`}
      />
      <span
        className={`uppercase tracking-wide ${
          active ? "text-white" : "text-white/50"
        }`}
      >
        {children}
      </span>
    </div>
  );
}

const Bar = () => <div className="h-[2px] flex-1 rounded-full bg-white/10" />;

function DateStep({
  loading,
  displayMonth,
  displayYear,
  canPrevMonth,
  canNextMonth,
  shiftMonth,
  calendarDays,
  dayMeta,
  onPick,
}: {
  loading: boolean;
  displayMonth: number;
  displayYear: number;
  canPrevMonth: boolean;
  canNextMonth: boolean;
  shiftMonth: (d: number) => void;
  calendarDays: (number | null)[];
  dayMeta: (n: number | null) => {
    iso: string | null;
    inRange: boolean;
    hasSlots: boolean;
  };
  onPick: (iso: string) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-white">
          {months[displayMonth]} {displayYear}
        </h3>

        <div className="flex gap-2">
          <Btn
            variant="ghost"
            size="sm"
            onClick={() => shiftMonth(-1)}
            disabled={!canPrevMonth}
            title="Προηγούμενος"
          >
            <ChevronLeft className="h-5 w-5" />
          </Btn>

          <Btn
            variant="ghost"
            size="sm"
            onClick={() => shiftMonth(1)}
            disabled={!canNextMonth}
            title="Επόμενος"
          >
            <ChevronRight className="h-5 w-5" />
          </Btn>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {weekDays.map((d) => (
          <div key={d} className="py-1.5 text-center text-[11px] text-white/60">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => {
          const { iso, inRange, hasSlots } = dayMeta(day);
          const disabled = !day || !inRange || !hasSlots || loading;

          return (
            <Btn
              key={idx}
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => iso && !disabled && onPick(iso)}
              className={`h-10 p-0 ${
                !day ? "invisible" : ""
              } ${disabled ? "opacity-40" : "hover:bg-neutral-900"}`}
              title={iso || ""}
            >
              <span className="text-white">{day}</span>
            </Btn>
          );
        })}
      </div>

      {loading && (
        <div className="mt-3 flex items-center gap-2 text-white/70">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <span className="text-sm">Φόρτωση διαθεσιμότητας…</span>
        </div>
      )}
    </div>
  );
}

function PeriodStep({
  period,
  onPick,
  onBack,
}: {
  period: Period;
  onPick: (p: Period) => void;
  onBack: () => void;
}) {
  const Item = ({
    label,
    icon: Icon,
    active,
    onClick,
  }: {
    label: string;
    icon: any;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        active
          ? "border-white bg-white text-black"
          : "border-white/10 bg-neutral-950 text-white hover:bg-neutral-900"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${active ? "text-black" : "text-white"}`} />
        <div className="font-medium">{label}</div>
      </div>
    </button>
  );

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-white">Επιλέξτε ζώνη ημέρας</h3>

        <Btn variant="ghost" size="sm" onClick={onBack} title="Πίσω">
          <ChevronLeft className="h-5 w-5" />
        </Btn>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Item
          label="Πρωί"
          icon={Sunrise}
          active={period === "morning"}
          onClick={() => onPick("morning")}
        />
        <Item
          label="Μεσημέρι"
          icon={Sun}
          active={period === "midday"}
          onClick={() => onPick("midday")}
        />
        <Item
          label="Απόγευμα"
          icon={Sunset}
          active={period === "afternoon"}
          onClick={() => onPick("afternoon")}
        />
        <Item
          label="Βράδυ"
          icon={Moon}
          active={period === "night"}
          onClick={() => onPick("night")}
        />
      </div>
    </div>
  );
}

function TimeStep({
  dateISO,
  slots,
  onPick,
  onBack,
}: {
  dateISO: string;
  slots: SlotRow[];
  onPick: (slot: SlotRow) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-white">{fmtDate(dateISO)}</h3>

        <Btn variant="ghost" size="sm" onClick={onBack} title="Πίσω">
          <ChevronLeft className="h-5 w-5" />
        </Btn>
      </div>

      {slots.length === 0 ? (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <AlertTriangle className="h-4 w-4" />
          Δεν υπάρχουν διαθέσιμες ώρες για αυτή τη ζώνη.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((s) => (
            <button
              key={`${s.date}|${s.start_time}|${s.end_time}`}
              onClick={() => onPick(s)}
              className="relative h-12 rounded-xl border border-white/15 bg-neutral-950 text-white transition hover:bg-white hover:text-black"
              title={`${s.start_time}–${s.end_time}`}
            >
              <span className="font-medium">{s.start_time}</span>
              {s.is_online && (
                <Wifi className="absolute right-1 top-1 h-3.5 w-3.5 opacity-80" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NoteStep({
  slot,
  trainerName,
  note,
  setNote,
  guestName,
  setGuestName,
  guestEmail,
  setGuestEmail,
  guestPhone,
  setGuestPhone,
  showGuestFields,
  submitting,
  onBack,
  onSubmit,
}: {
  slot: SelectedSlot;
  trainerName: string;
  note: string;
  setNote: (v: string) => void;
  guestName: string;
  setGuestName: (v: string) => void;
  guestEmail: string;
  setGuestEmail: (v: string) => void;
  guestPhone: string;
  setGuestPhone: (v: string) => void;
  showGuestFields: boolean;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-white">Σχόλιο & Επιβεβαίωση</h3>

        <Btn variant="ghost" size="sm" onClick={onBack} title="Πίσω">
          <ChevronLeft className="h-5 w-5" />
        </Btn>
      </div>

      <div className="mb-4 rounded-2xl border border-white/10 bg-neutral-950 p-4 text-white">
        <div className="mb-1 flex items-center gap-2 text-sm">
          <CalendarIcon className="h-4 w-4" />
          <span>
            Προπονητής:{" "}
            <strong className="font-semibold">{trainerName}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4" />
          <span>
            {fmtDate(slot.date)} • {slot.start_time}–{slot.end_time}
          </span>
        </div>
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        placeholder="Στόχοι, περιορισμοί, προτιμήσεις εξοπλισμού κ.λπ. (προαιρετικό)"
        className="w-full rounded-xl border border-white/15 bg-neutral-950 p-3 text-white outline-none focus:ring-2 focus:ring-white/30 placeholder:text-white/50"
      />

      {showGuestFields && (
        <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-neutral-950 p-4">
          <div className="text-sm font-medium text-white">
            Στοιχεία επικοινωνίας (προαιρετικά)
          </div>
          <p className="text-xs text-white/60">
            Δεν χρειάζεται να είσαι συνδεδεμένος/η. Μπορείς προαιρετικά να
            αφήσεις στοιχεία για πιο εύκολη επικοινωνία.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Όνομα (προαιρετικό)"
                className="w-full rounded-xl border border-white/15 bg-black pl-10 pr-3 py-3 text-white outline-none focus:ring-2 focus:ring-white/30 placeholder:text-white/50"
              />
            </div>

            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
              <input
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="Τηλέφωνο (προαιρετικό)"
                className="w-full rounded-xl border border-white/15 bg-black pl-10 pr-3 py-3 text-white outline-none focus:ring-2 focus:ring-white/30 placeholder:text-white/50"
              />
            </div>
          </div>

          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="Email (προαιρετικό)"
              className="w-full rounded-xl border border-white/15 bg-black pl-10 pr-3 py-3 text-white outline-none focus:ring-2 focus:ring-white/30 placeholder:text-white/50"
            />
          </div>
        </div>
      )}

      <div className="mt-4">
        <Btn
          onClick={onSubmit}
          disabled={submitting}
          className="w-full"
          variant="default"
        >
          {submitting ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
              <span>Γίνεται κράτηση…</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              <span>Ολοκλήρωση κράτησης</span>
            </div>
          )}
        </Btn>
      </div>
    </div>
  );
}

function SuccessStep({
  trainerName,
  slot,
  onClose,
  onCreateAnother,
}: {
  trainerName: string;
  slot: SelectedSlot;
  onClose: () => void;
  onCreateAnother: () => void;
}) {
  const googleCalendarUrl = buildGoogleCalendarUrl({
    trainerName,
    date: slot.date,
    start_time: slot.start_time,
    end_time: slot.end_time,
  });

  return (
    <div className="py-10 text-center">
      <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500">
        <CheckCircle2 className="h-10 w-10 text-white" />
      </div>

      <h3 className="mb-2 text-xl font-semibold text-white">
        Η κράτηση στάλθηκε! 🎉
      </h3>

      <p className="mb-2 text-white/80">
        Ο/Η {trainerName} θα δει το αίτημά σου και θα προχωρήσει σε επιβεβαίωση.
      </p>

      <p className="mb-6 text-sm text-white/60">
        {fmtDate(slot.date)} • {slot.start_time}–{slot.end_time}
      </p>

      <div className="mx-auto flex w-full max-w-md flex-col gap-3">
        <Btn
          as="a"
          href={googleCalendarUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="default"
          className="w-full"
        >
          <div className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            <span>Βάλ’ το στο ημερολόγιο</span>
          </div>
        </Btn>

        <Btn onClick={onCreateAnother} variant="outline" className="w-full">
          <span>Κάνε άλλη κράτηση</span>
        </Btn>

        <Btn onClick={onClose} variant="ghost" className="w-full">
          <span>Κλείσιμο</span>
        </Btn>
      </div>
    </div>
  );
}