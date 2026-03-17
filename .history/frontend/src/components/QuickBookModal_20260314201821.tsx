// ../components/QuickBookModal.tsx
"use client";

import React, { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "../supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
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
      year: "numeric",
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
  const text = `Peak Velocity • Προπόνηση με ${trainerName}`;
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
    location: "Peak Velocity",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

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
function Glass({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={[
        "relative rounded-3xl border border-white/10",
        "bg-[rgba(17,18,21,.65)] backdrop-blur-xl",
        "shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_10px_30px_rgba(0,0,0,.45)]",
        className,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[.06] via-white/[.02] to-transparent opacity-40" />
        <div className="absolute -top-1/2 left-0 right-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent opacity-50" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

function Button({
  children,
  variant = "secondary",
  size = "md",
  className = "",
  as = "button",
  href,
  target,
  rel,
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  className?: string;
  as?: "button" | "a";
  href?: string;
  target?: string;
  rel?: string;
  [key: string]: any;
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl font-medium transition focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-60";
  const sizes = { sm: "h-9 px-3 text-sm", md: "h-11 px-4 text-sm" };
  const variants = {
    primary:
      "border border-white/20 bg-white text-black hover:bg-gray-100",
    secondary:
      "border border-white/10 bg-white/6 text-white hover:bg-white/10",
    danger:
      "border border-rose-400/20 bg-rose-600/90 text-white hover:bg-rose-600",
    ghost: "border border-white/10 bg-transparent text-white hover:bg-white/5",
  };

  const classes = `${base} ${sizes[size]} ${variants[variant]} ${className}`;

  if (as === "a") {
    return (
      <a href={href} target={target} rel={rel} className={classes} {...props}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: any;
  label: string;
  value: ReactNode;
  tone?: "default" | "success" | "warn" | "danger";
}) {
  const toneClasses =
    tone === "success"
      ? "bg-emerald-500/10 border-emerald-400/15"
      : tone === "warn"
      ? "bg-amber-500/10 border-amber-400/15"
      : tone === "danger"
      ? "bg-rose-500/10 border-rose-400/15"
      : "bg-white/[.04] border-white/10";

  return (
    <div
      className={`rounded-2xl border p-3 sm:p-3.5 ${toneClasses} shadow-[inset_0_1px_0_rgba(255,255,255,.03)]`}
    >
      <div className="mb-2 flex items-center gap-2 text-white/55">
        <Icon className="h-4 w-4" />
        <span className="text-[11px] uppercase tracking-[0.12em] sm:text-xs">
          {label}
        </span>
      </div>
      <div className="text-sm font-medium text-white sm:text-[15px]">
        {value}
      </div>
    </div>
  );
}

function StepPill({
  active,
  done,
  children,
}: {
  active?: boolean;
  done?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={[
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] transition",
        done
          ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
          : active
          ? "border border-white/20 bg-white text-black"
          : "border border-white/10 bg-white/[.04] text-white/55",
      ].join(" ")}
    >
      <span
        className={[
          "h-2 w-2 rounded-full",
          done ? "bg-emerald-400" : active ? "bg-black" : "bg-white/30",
        ].join(" ")}
      />
      {children}
    </div>
  );
}

/* ───────── types ───────── */
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

/* ───────── main component ───────── */
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
            const dayAvailability = (wav || []).filter(
              (x: any) => x.weekday === weekdayKey
            );

            for (const s of dayAvailability) {
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

  const selectDate = (iso: string) => {
    setSelectedDateISO(iso);
    setStep("period");
  };

  const selectPeriod = (p: Period) => {
    setPeriod(p);
    setSelectedKey(null);
    setStep("time");
  };

  const selectTime = (slot: SlotRow) => {
    setSelectedKey(`${slot.date}|${slot.start_time}|${slot.end_time}`);
    setStep("note");
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
            "Το UI είναι έτοιμο για guest booking, αλλά το trainer_bookings table ή το RLS policy σου ακόμα απαιτεί user_id."
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

      setStep("success");
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

  const currentStepIndex =
    {
      date: 1,
      period: 2,
      time: 3,
      note: 4,
      success: 4,
    }[step] || 1;

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-[201] flex items-center justify-center p-3 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.985 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-4xl"
          onClick={(e) => e.stopPropagation()}
        >
          <Glass className="overflow-hidden">
            <div className="border-b border-white/10 px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-4">
                  <img
                    src={avatarSrc}
                    alt={trainerName}
                    className="h-12 w-12 rounded-full object-cover ring-1 ring-white/15 sm:h-14 sm:w-14"
                    onError={(e) => {
                      if (!broken) {
                        setBroken(true);
                        (e.currentTarget as HTMLImageElement).src =
                          AVATAR_PLACEHOLDER;
                      }
                    }}
                  />

                  <div className="min-w-0">
                    <div className="text-lg font-semibold text-white sm:text-xl">
                      Γρήγορη Κράτηση
                    </div>
                    <div className="truncate text-sm text-white/55 sm:text-[15px]">
                      {trainerName}
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  aria-label="Κλείσιμο"
                >
                  <X className="h-4 w-4 text-white/85" />
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <StepPill active={currentStepIndex === 1}>Ημερομηνία</StepPill>
                <StepPill active={currentStepIndex === 2} done={currentStepIndex > 2}>
                  Ζώνη
                </StepPill>
                <StepPill active={currentStepIndex === 3} done={currentStepIndex > 3}>
                  Ώρα
                </StepPill>
                <StepPill active={currentStepIndex === 4} done={step === "success"}>
                  Επιβεβαίωση
                </StepPill>
              </div>
            </div>

            {banner && (
              <div className="px-4 pt-4 sm:px-6">
                <div
                  className={`rounded-2xl border px-4 py-3 ${
                    banner.type === "error"
                      ? "border-red-400/30 bg-red-500/10 text-red-100"
                      : "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
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

            <div className="p-4 sm:p-6">
              <AnimatePresence mode="wait" initial={false}>
                {step === "date" && (
                  <motion.div
                    key="date"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
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
                      onPick={selectDate}
                    />
                  </motion.div>
                )}

                {step === "period" && (
                  <motion.div
                    key="period"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PeriodStep
                      period={period}
                      onPick={selectPeriod}
                      onBack={() => setStep("date")}
                    />
                  </motion.div>
                )}

                {step === "time" && selectedDateISO && (
                  <motion.div
                    key="time"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TimeStep
                      dateISO={selectedDateISO}
                      slots={daySlots}
                      onPick={selectTime}
                      onBack={() => setStep("period")}
                    />
                  </motion.div>
                )}

                {step === "note" && selectedSlot && (
                  <motion.div
                    key="note"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
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
                      onBack={() => setStep("time")}
                      onSubmit={submitBooking}
                    />
                  </motion.div>
                )}

                {step === "success" && selectedSlot && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <SuccessStep
                      trainerName={trainerName}
                      slot={selectedSlot}
                      onClose={onClose}
                      onCreateAnother={resetFlow}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Glass>
        </motion.div>
      </div>

      {showNoScheduleToast && (
        <div className="fixed bottom-4 left-1/2 z-[210] -translate-x-1/2 sm:bottom-6">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(17,18,21,.88)] px-4 py-2 text-white shadow-xl backdrop-blur-xl">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="whitespace-nowrap text-sm">
              Ο προπονητής δεν έχει ανεβάσει διαθέσιμες ημερομηνίες.
            </span>
            <button
              onClick={() => setShowNoScheduleToast(false)}
              className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/5 hover:bg-white/10"
              title="Κλείσιμο"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ───────── step components ───────── */
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold text-white">
            Επιλογή ημερομηνίας
          </div>
          <div className="mt-1 text-sm text-white/55">
            Διάλεξε μία διαθέσιμη ημέρα για να συνεχίσεις.
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => shiftMonth(-1)}
            disabled={!canPrevMonth}
            title="Προηγούμενος"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => shiftMonth(1)}
            disabled={!canNextMonth}
            title="Επόμενος"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Glass className="p-4 sm:p-5">
        <div className="mb-4 text-center text-lg font-semibold text-white">
          {months[displayMonth]} {displayYear}
        </div>

        <div className="mb-2 grid grid-cols-7 gap-1">
          {weekDays.map((d) => (
            <div
              key={d}
              className="py-1.5 text-center text-[11px] font-medium uppercase tracking-[0.12em] text-white/45"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((day, idx) => {
            const { iso, inRange, hasSlots } = dayMeta(day);
            const disabled = !day || !inRange || !hasSlots || loading;

            return (
              <button
                key={idx}
                type="button"
                disabled={disabled}
                onClick={() => iso && !disabled && onPick(iso)}
                className={[
                  "h-11 rounded-xl border text-sm transition sm:h-12",
                  !day ? "invisible" : "",
                  disabled
                    ? "border-white/5 bg-white/[.02] text-white/25"
                    : "border-white/10 bg-white/[.04] text-white hover:border-white/20 hover:bg-white hover:text-black",
                ].join(" ")}
                title={iso || ""}
              >
                {day}
              </button>
            );
          })}
        </div>

        {loading && (
          <div className="mt-4 flex items-center gap-2 text-white/65">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            <span className="text-sm">Φόρτωση διαθεσιμότητας…</span>
          </div>
        )}
      </Glass>
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
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        active
          ? "border-white/20 bg-white text-black"
          : "border-white/10 bg-white/[.04] text-white hover:bg-white/[.08]"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${active ? "text-black" : "text-white"}`} />
        <div className="font-medium">{label}</div>
      </div>
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold text-white">
            Επιλογή ζώνης ημέρας
          </div>
          <div className="mt-1 text-sm text-white/55">
            Επίλεξε πότε προτιμάς να γίνει η συνεδρία.
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold text-white">
            Διαθέσιμες ώρες
          </div>
          <div className="mt-1 text-sm text-white/55">{fmtDate(dateISO)}</div>
        </div>

        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </div>

      {slots.length === 0 ? (
        <Glass className="p-4">
          <div className="flex items-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <AlertTriangle className="h-4 w-4" />
            Δεν υπάρχουν διαθέσιμες ώρες για αυτή τη ζώνη.
          </div>
        </Glass>
      ) : (
        <Glass className="p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {slots.map((s) => (
              <button
                type="button"
                key={`${s.date}|${s.start_time}|${s.end_time}`}
                onClick={() => onPick(s)}
                className="relative h-14 rounded-2xl border border-white/10 bg-white/[.04] px-3 text-white transition hover:border-white/20 hover:bg-white hover:text-black"
                title={`${s.start_time}–${s.end_time}`}
              >
                <span className="text-sm font-semibold">{s.start_time}</span>
                {s.is_online && (
                  <Wifi className="absolute right-2 top-2 h-3.5 w-3.5 opacity-80" />
                )}
              </button>
            ))}
          </div>
        </Glass>
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold text-white">
            Επιβεβαίωση κράτησης
          </div>
          <div className="mt-1 text-sm text-white/55">
            Έλεγξε τα στοιχεία πριν την αποστολή.
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </div>

      <Glass className="p-4 sm:p-5">
        <div className="mb-4 text-lg font-semibold text-white">
          {trainerName}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <InfoTile icon={CalendarIcon} label="Ημερομηνία" value={fmtDate(slot.date)} />
          <InfoTile
            icon={Clock}
            label="Ώρα"
            value={`${slot.start_time} – ${slot.end_time}`}
          />
          <InfoTile
            icon={Wifi}
            label="Τύπος"
            value={slot.is_online ? "Online συνεδρία" : "Δια ζώσης"}
          />
        </div>
      </Glass>

      <Glass className="p-4 sm:p-5">
        <div className="mb-3 text-sm font-medium text-white">
          Σημείωση για τον προπονητή
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="Στόχοι, περιορισμοί, προτιμήσεις εξοπλισμού κ.λπ. (προαιρετικό)"
          className="w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-white outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/20"
        />
      </Glass>

      {showGuestFields && (
        <Glass className="p-4 sm:p-5">
          <div className="mb-1 text-sm font-medium text-white">
            Στοιχεία επικοινωνίας
          </div>
          <div className="mb-4 text-xs text-white/50">
            Προαιρετικά — δεν χρειάζεται να είσαι συνδεδεμένος/η.
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              icon={User}
              placeholder="Όνομα (προαιρετικό)"
              value={guestName}
              onChange={setGuestName}
            />
            <Field
              icon={Phone}
              placeholder="Τηλέφωνο (προαιρετικό)"
              value={guestPhone}
              onChange={setGuestPhone}
            />
          </div>

          <div className="mt-3">
            <Field
              icon={Mail}
              placeholder="Email (προαιρετικό)"
              value={guestEmail}
              onChange={setGuestEmail}
              type="email"
            />
          </div>
        </Glass>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button variant="ghost" onClick={onBack} className="w-full">
          Πίσω
        </Button>

        <Button
          variant="primary"
          onClick={onSubmit}
          disabled={submitting}
          className="w-full"
        >
          {submitting ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
              <span>Γίνεται κράτηση…</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 !text-black" />
              <span className="text-black">Ολοκλήρωση κράτησης</span>
            </div>
          )}
        </Button>
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
    <div className="space-y-4">
      <Glass className="p-6 text-center sm:p-8">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 shadow-[0_10px_30px_rgba(16,185,129,.25)]">
          <CheckCircle2 className="h-10 w-10 text-white" />
        </div>

        <h3 className="mb-2 text-2xl font-semibold text-white">
          Η κράτηση στάλθηκε! 🎉
        </h3>

        <p className="mx-auto mb-3 max-w-xl text-white/75">
          Ο/Η {trainerName} θα δει το αίτημά σου και θα προχωρήσει σε επιβεβαίωση.
        </p>

        <p className="text-sm text-white/50">
          {fmtDate(slot.date)} • {slot.start_time} – {slot.end_time}
        </p>
      </Glass>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Button
          as="a"
          href={googleCalendarUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="primary"
          className="w-full"
        >
          <div className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 !text-black" />
            <span className="text-black">Βάλ’ το στο ημερολόγιο</span>
          </div>
        </Button>

        <Button onClick={onCreateAnother} variant="secondary" className="w-full">
          Κάνε άλλη κράτηση
        </Button>

        <Button onClick={onClose} variant="ghost" className="w-full">
          Κλείσιμο
        </Button>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  icon: any;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-10 pr-3 text-white outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/20"
      />
    </div>
  );
}