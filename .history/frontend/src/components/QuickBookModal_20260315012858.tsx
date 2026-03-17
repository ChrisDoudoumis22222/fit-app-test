// ../components/QuickBookModal.tsx
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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

type Period = "morning" | "midday" | "afternoon" | "night";

const getPeriod4 = (start: string): Period => {
  const m = timeToMinutes(hhmm(start));
  if (!Number.isFinite(m)) return "morning";
  if (m < 12 * 60) return "morning";
  if (m < 16 * 60) return "midday";
  if (m < 20 * 60) return "afternoon";
  return "night";
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
    setBanner(null);
    setBroken(false);
    setMonthIndex(initialIndex);
  };

  useEffect(() => {
    if (!open) return;
    resetFlow();
    setShowNoScheduleToast(false);
  }, [open, initialIndex]);

  const loadAvailability = useCallback(async () => {
    if (!open || !trainerId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.rpc(
        "get_trainer_available_slots",
        {
          p_trainer_id: trainerId,
          p_from: rangeStartISO,
          p_to: rangeEndISO,
        }
      );

      if (error) throw error;

      const rows: SlotRow[] = (data || []).map((r: any) => ({
        date: r.date,
        start_time: hhmm(r.start_time),
        end_time: hhmm(r.end_time),
        is_online: !!r.is_online,
        status: "open",
      }));

      setOpenRows(rows);
      setShowNoScheduleToast(rows.length === 0);
    } catch (e: any) {
      console.error(e);
      setBanner({
        type: "error",
        title: "Σφάλμα",
        message: "Δεν ήταν δυνατή η φόρτωση διαθεσιμότητας.",
      });
    } finally {
      setLoading(false);
    }
  }, [open, trainerId, rangeStartISO, rangeEndISO]);

  useEffect(() => {
    if (!open || !trainerId) return;
    loadAvailability();
  }, [open, trainerId, loadAvailability]);

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

  const submitBooking = async () => {
    if (!trainerId || !selectedSlot) return;

    try {
      setSubmitting(true);
      setBanner(null);

      const { data: sess } = await supabase.auth.getSession();
      const userId = sess?.session?.user?.id;

      if (!userId) {
        setBanner({
          type: "error",
          title: "Απαιτείται σύνδεση",
          message: "Συνδεθείτε για να ολοκληρώσετε την κράτηση.",
        });
        return;
      }

      const { data, error } = await supabase.rpc("book_trainer_slot", {
        p_trainer_id: trainerId,
        p_date: selectedSlot.date,
        p_start_time: selectedSlot.start_time,
        p_note: note.trim() || null,
      });

      if (error) throw error;

      const booking = Array.isArray(data) ? data[0] : data;

      if (!booking?.id) {
        throw new Error("Δεν επιστράφηκαν στοιχεία κράτησης.");
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
      onBooked?.(booking);
    } catch (e: any) {
      console.error(e);

      const msg = String(e?.message || "");
      const slotGone =
        msg.includes("Slot is not available") ||
        msg.includes("trainer_bookings_no_overlap_excl") ||
        msg.toLowerCase().includes("conflicting key value violates exclusion");

      setBanner({
        type: "error",
        title: "Η κράτηση απέτυχε",
        message: slotGone
          ? "Η συγκεκριμένη ώρα δεν είναι πλέον διαθέσιμη. Διάλεξε άλλη ώρα."
          : e?.message || "Δοκιμάστε ξανά.",
      });

      if (slotGone) {
        await loadAvailability();
        goBack("time");
      }
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
          <div className="flex min-w-0 items-center gap-3 text-white">
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

            <div className="flex min-w-0 items-center gap-2">
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
              Ο προπονητής δεν έχει ανεβάσει διαθέσιμο πρόγραμμα ακόμη.
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
  submitting,
  onBack,
  onSubmit,
}: {
  slot: SelectedSlot;
  trainerName: string;
  note: string;
  setNote: (v: string) => void;
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
        Θα ενημερωθείτε στο email σας μόλις ο/η {trainerName} επιβεβαιώσει.
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