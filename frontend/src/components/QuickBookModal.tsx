// ../components/QuickBookModal.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  X,
  Calendar as CalendarIcon,
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
  User as UserIcon,
} from "lucide-react";

/* ───────── helpers ───────── */
const months = [
  "Ιανουάριος","Φεβρουάριος","Μάρτιος","Απρίλιος","Μάιος","Ιούνιος",
  "Ιούλιος","Αύγουστος","Σεπτέμβριος","Οκτώβριος","Νοέμβριος","Δεκέμβριος",
];
const weekDays = ["ΔΕΥ","ΤΡΙ","ΤΕΤ","ΠΕΜ","ΠΑΡ","ΣΑΒ","ΚΥΡ"];

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
const hhmm = (t: string) => (typeof t === "string" ? t.match(/^(\d{1,2}:\d{2})/)?.[1] || t : t);
const timeToMinutes = (t: string) => {
  const m = (t || "").match(/^(\d{1,2}):(\d{2})/);
  if (!m) return Number.NaN;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
};
const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
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

// four buckets
type Period = "morning" | "midday" | "afternoon" | "night";
const getPeriod4 = (start: string): Period => {
  const m = timeToMinutes(hhmm(start));
  if (!Number.isFinite(m)) return "morning";
  if (m < 12 * 60) return "morning";     // < 12:00
  if (m < 16 * 60) return "midday";      // 12:00–15:59
  if (m < 20 * 60) return "afternoon";   // 16:00–19:59
  return "night";                         // ≥ 20:00
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
}: {
  children: React.ReactNode;
  onClick?: (e: any) => void;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost" | "danger";
  size?: "default" | "sm";
  className?: string;
  title?: string;
  type?: "button" | "submit";
}) => {
  const base =
    "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    default: "bg-white text-black hover:bg-neutral-100",
    outline: "border border-white/15 bg-neutral-900 text-white hover:bg-neutral-800",
    ghost: "text-white hover:bg-neutral-900",
    danger: "bg-red-500 text-white hover:bg-red-600",
  } as const;
  const sizes = {
    default: "h-11 px-4",
    sm: "h-9 px-3 text-sm",
  } as const;
  return (
    <button
      type={type || "button"}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant as keyof typeof variants]} ${sizes[size as keyof typeof sizes]} ${className}`}
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

type Props = {
  open: boolean;
  trainer: { id: string; full_name?: string; avatar_url?: string } | null;
  onClose: () => void;
  onBooked?: (row: any) => void;
};

/** EXACT same placeholder as ServicesMarketplacePage */
const AVATAR_PLACEHOLDER = "https://www.gravatar.com/avatar/?d=mp&s=120";


/* ───────── main popup ───────── */
export default function QuickBookModal({ open, trainer, onClose, onBooked }: Props) {
  const trainerId = trainer?.id;
  const trainerName = trainer?.full_name || "Προπονητής";

  // steps
  type Step = "date" | "period" | "time" | "note" | "success";
  const [step, setStep] = useState<Step>("date");
  const [direction, setDirection] = useState<1 | -1>(1);

  // range (today..+29)
  const rangeStartISO = useMemo(() => localDateISO(0), []);
  const rangeEndISO = useMemo(() => localDateISO(29), []);
  const minDateObj = useMemo(() => new Date(`${rangeStartISO}T00:00:00`), [rangeStartISO]);
  const maxDateObj = useMemo(() => new Date(`${rangeEndISO}T00:00:00`), [rangeEndISO]);

  // month navigation
  const initialIndex = minDateObj.getFullYear() * 12 + minDateObj.getMonth();
  const maxIndex = maxDateObj.getFullYear() * 12 + maxDateObj.getMonth();
  const [monthIndex, setMonthIndex] = useState(initialIndex);
  const displayYear = Math.floor(monthIndex / 12);
  const displayMonth = monthIndex % 12;
  const canPrevMonth = monthIndex > initialIndex;
  const canNextMonth = monthIndex < maxIndex;

  // selections
  const [selectedDateISO, setSelectedDateISO] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("morning");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [note, setNote] = useState("");

  // data
  const [openRows, setOpenRows] = useState<SlotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; title: string; message: string } | null>(null);

  // toast for "no schedule uploaded"
  const [showNoScheduleToast, setShowNoScheduleToast] = useState(false);

  const byDate = useMemo(() => {
    const m = new Map<string, SlotRow[]>();
    for (const r of openRows) {
      const key = r.date;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
          m.forEach((arr) => {
        arr.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
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
    if (!selectedKey) return null as null | { date: string; start_time: string; end_time: string };
    const [date, start, end] = selectedKey.split("|");
    return { date, start_time: start, end_time: end };
  }, [selectedKey]);

  // reset when opening
  useEffect(() => {
    if (!open) return;
    setStep("date");
    setDirection(1);
    setSelectedDateISO(null);
    setPeriod("morning");
    setSelectedKey(null);
    setNote("");
    setBanner(null);
    setShowNoScheduleToast(false);
  }, [open]);

  // load availability
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
          return ["", "open", "available", "free", "publish", "published", "true", "1"].includes(v);
        };
        const isHoliday = (d: string) => (hol || []).some((h) => withinDate(d, h.starts_on, h.ends_on));

        let filtered = (openData || []).filter((r) => {
          if (!usableStatus(r.status)) return false;
          if (isHoliday(r.date)) return false;
          const overlap = (bookedRows || []).some(
            (b) => b.date === r.date && overlaps(r.start_time, r.end_time, b.start_time, b.end_time)
          );
          return !overlap;
        }) as SlotRow[];

        if (filtered.length === 0 && (wav || []).length > 0) {
          const start = new Date(`${rangeStartISO}T00:00:00`);
          const weekdayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
          const derived: SlotRow[] = [];
          for (let i = 0; i < 30; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const iso = toISODate(d);
            if (isHoliday(iso)) continue;
            const weekdayKey = weekdayNames[d.getDay()];
            const daySlots = (wav || []).filter((x: any) => x.weekday === weekdayKey);
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

        // show toast if no schedule uploaded & no open slots
        const openLen = (openData || []).length;
        if ((wav || []).length === 0 && openLen === 0) setShowNoScheduleToast(true);
        else setShowNoScheduleToast(false);
      } catch (e: any) {
        console.error(e);
        setBanner({ type: "error", title: "Σφάλμα", message: "Δεν ήταν δυνατή η φόρτωση διαθεσιμότητας." });
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [open, trainerId, rangeStartISO, rangeEndISO]);

  // Calendar helpers
  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonthIndex = (month: number, year: number) => {
    const firstDay = new Date(year, month, 1).getDay(); // Sun=0
    return firstDay === 0 ? 6 : firstDay - 1; // Mon=0..Sun=6
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

  // step handlers + animation direction
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

  // submit booking
  const submitBooking = async () => {
    if (!trainerId || !selectedSlot) return;
    try {
      setSubmitting(true);
      setBanner(null);

      const { data: sess } = await supabase.auth.getSession();
      const userId = sess?.session?.user?.id;
      if (!userId) {
        setBanner({ type: "error", title: "Απαιτείται σύνδεση", message: "Συνδεθείτε για να ολοκληρώσετε την κράτηση." });
        setSubmitting(false);
        return;
      }

      const slot = (byDate.get(selectedSlot.date) || []).find(
        (s) => s.start_time === selectedSlot.start_time && s.end_time === selectedSlot.end_time
      );

      const startMinutes = timeToMinutes(selectedSlot.start_time);
      const endMinutes = timeToMinutes(selectedSlot.end_time);
      const duration = Math.max(0, endMinutes - startMinutes) || 60;

      const payload = {
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
      };

      const { data, error } = await supabase.from("trainer_bookings").insert([payload]).select().single();
      if (error) throw error;

      goNext("success");
      onBooked?.(data);
    } catch (e: any) {
      console.error(e);
      setBanner({ type: "error", title: "Η κράτηση απέτυχε", message: e?.message || "Δοκιμάστε ξανά." });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  // Decide avatar src: exact same placeholder if missing/broken
  const [broken, setBroken] = useState(false);
  const avatarSrc =
    !broken && trainer?.avatar_url && trainer.avatar_url.trim()
      ? trainer.avatar_url
      : AVATAR_PLACEHOLDER;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 anim-overlay-in"
      onClick={onClose}
    >
      {/* modal card */}
      <div
        className="relative w-full max-w-3xl rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black anim-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="relative z-10 flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-white/10 bg-black">
          <div className="flex items-center gap-3 text-white">
            {/* EXACT default image logic */}
            <img
              src={avatarSrc}
              alt={trainerName}
              className="h-8 w-8 rounded-full object-cover ring-1 ring-white/15 bg-neutral-800"
              onError={(e) => {
                if (!broken) {
                  setBroken(true);
                  // force the exact same placeholder
                  (e.currentTarget as HTMLImageElement).src = AVATAR_PLACEHOLDER;
                }
              }}
            />
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              <div className="font-semibold">Γρήγορη Κράτηση</div>
              <div className="text-white/60">• {trainerName}</div>
            </div>
          </div>
          <Btn variant="ghost" size="sm" onClick={onClose} title="Κλείσιμο">
            <X className="h-5 w-5" />
          </Btn>
        </div>

        {/* banner */}
        {banner && (
          <div className="px-5 sm:px-6 pt-3">
            <div
              className={`rounded-2xl px-4 py-3 border ${
                banner.type === "error"
                  ? "bg-red-500/15 border-red-400/30 text-red-100"
                  : "bg-emerald-500/15 border-emerald-400/30 text-emerald-100"
              }`}
            >
              <div className="flex items-start gap-2">
                {banner.type === "error" ? (
                  <AlertTriangle className="h-4 w-4 mt-0.5" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mt-0.5" />
                )}
                <div>
                  <div className="font-medium">{banner.title}</div>
                  <div className="opacity-90 text-sm">{banner.message}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* steps */}
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2 text-xs text-white/70 mb-4">
            <StepDot active={step === "date"}>Ημ/νία</StepDot>
            <Bar />
            <StepDot active={step === "period"}>Ζώνη</StepDot>
            <Bar />
            <StepDot active={step === "time"}>Ώρα</StepDot>
            <Bar />
            <StepDot active={step === "note"}>Σχόλιο</StepDot>
          </div>

          <div key={step} className={direction === 1 ? "anim-step-right" : "anim-step-left"}>
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
                  if (!dayNumber) return { iso: null, inRange: false, hasSlots: false };
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

            {step === "success" && <SuccessStep trainerName={trainerName} onClose={onClose} />}
          </div>
        </div>
      </div>

      {/* bottom toast for missing schedule */}
      {showNoScheduleToast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-4 sm:bottom-6 z-[210] anim-toast-in">
          <div className="flex items-center gap-2 rounded-full px-4 py-2 bg-black text-white border border-white/10 shadow-xl">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="text-sm whitespace-nowrap">
              Ο προπονητής δεν έχει ανεβάσει διαθέσιμες ημερομηνίες — δοκιμάστε άλλον/η.
            </span>
            <button
              onClick={() => setShowNoScheduleToast(false)}
              className="ml-1 w-7 h-7 rounded-full bg-neutral-900 hover:bg-neutral-800 flex items-center justify-center"
              title="Κλείσιμο"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* animations */}
      <style>{`
        @keyframes overlayIn { from { opacity: 0 } to { opacity: 1 } }
        .anim-overlay-in { animation: overlayIn .18s ease-out both; }

        @keyframes modalIn {
          from { opacity: 0; transform: translateY(10px) scale(.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .anim-modal-in { animation: modalIn .22s cubic-bezier(.2,.7,.2,1) both; }

        @keyframes slideRightIn {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideLeftIn {
          from { opacity: 0; transform: translateX(-16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .anim-step-right { animation: slideRightIn .22s ease-out both; }
        .anim-step-left  { animation: slideLeftIn  .22s ease-out both; }

        @keyframes toastIn {
          from { opacity: 0; transform: translate(-50%, 6px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        .anim-toast-in { animation: toastIn .24s ease-out both; }
      `}</style>
    </div>
  );
}

/* ───────── steps ───────── */
function StepDot({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-2.5 w-2.5 rounded-full ${active ? "bg-white" : "bg-white/25"}`} />
      <span className={`uppercase tracking-wide ${active ? "text-white" : "text-white/50"}`}>{children}</span>
    </div>
  );
}
const Bar = () => <div className="h-[2px] flex-1 bg-white/10 rounded-full" />;

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
  dayMeta: (n: number | null) => { iso: string | null; inRange: boolean; hasSlots: boolean };
  onPick: (iso: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">
          {months[displayMonth]} {displayYear}
        </h3>
        <div className="flex gap-2">
          <Btn variant="ghost" size="sm" onClick={() => shiftMonth(-1)} disabled={!canPrevMonth} title="Προηγούμενος">
            <ChevronLeft className="h-5 w-5" />
          </Btn>
          <Btn variant="ghost" size="sm" onClick={() => shiftMonth(1)} disabled={!canNextMonth} title="Επόμενος">
            <ChevronRight className="h-5 w-5" />
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-[11px] text-white/60 py-1.5">
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
              className={`h-10 p-0 ${!day ? "invisible" : ""} ${disabled ? "opacity-40" : "hover:bg-neutral-900"}`}
              title={iso || ""}
            >
              <span className="text-white">{day}</span>
            </Btn>
          );
        })}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-white/70 mt-3">
          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
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
    id,
    label,
    icon: Icon,
    active,
    onClick,
  }: {
    id: Period;
    label: string;
    icon: any;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-4 w-full text-left transition ${
        active ? "bg-white text-black border-white" : "bg-neutral-950 text-white border-white/10 hover:bg-neutral-900"
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
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">Επιλέξτε ζώνη ημέρας</h3>
        <Btn variant="ghost" size="sm" onClick={onBack} title="Πίσω">
          <ChevronLeft className="h-5 w-5" />
        </Btn>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Item id="morning" label="Πρωί" icon={Sunrise} active={period === "morning"} onClick={() => onPick("morning")} />
        <Item id="midday" label="Μεσημέρι" icon={Sun} active={period === "midday"} onClick={() => onPick("midday")} />
        <Item id="afternoon" label="Απόγευμα" icon={Sunset} active={period === "afternoon"} onClick={() => onPick("afternoon")} />
        <Item id="night" label="Βράδυ" icon={Moon} active={period === "night"} onClick={() => onPick("night")} />
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
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">{fmtDate(dateISO)}</h3>
        <Btn variant="ghost" size="sm" onClick={onBack} title="Πίσω">
          <ChevronLeft className="h-5 w-5" />
        </Btn>
      </div>

      {slots.length === 0 ? (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 text-amber-100 px-4 py-3 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Δεν υπάρχουν διαθέσιμες ώρες για αυτή τη ζώνη.
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {slots.map((s) => (
            <button
              key={`${s.date}|${s.start_time}|${s.end_time}`}
              onClick={() => onPick(s)}
              className="h-12 rounded-xl border border-white/15 bg-neutral-950 text-white hover:bg-white hover:text-black transition relative"
              title={`${s.start_time}–${s.end_time}`}
            >
              <span className="font-medium">{s.start_time}</span>
              {s.is_online && <Wifi className="h-3.5 w-3.5 absolute top-1 right-1 opacity-80" />}
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
  slot: { date: string; start_time: string; end_time: string };
  trainerName: string;
  note: string;
  setNote: (v: string) => void;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">Σχόλιο & Επιβεβαίωση</h3>
        <Btn variant="ghost" size="sm" onClick={onBack} title="Πίσω">
          <ChevronLeft className="h-5 w-5" />
        </Btn>
      </div>

      <div className="rounded-2xl border border-white/10 bg-neutral-950 p-4 mb-4 text-white">
        <div className="flex items-center gap-2 text-sm mb-1">
          <CalendarIcon className="h-4 w-4" />
          <span>Προπονητής: <strong className="font-semibold">{trainerName}</strong></span>
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
        className="w-full rounded-xl border border-white/15 bg-neutral-950 text-white placeholder:text-white/50 p-3 outline-none focus:ring-2 focus:ring-white/30"
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
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
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

function SuccessStep({ trainerName, onClose }: { trainerName: string; onClose: () => void }) {
  return (
    <div className="text-center py-10">
      <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-emerald-500 flex items-center justify-center">
        <CheckCircle2 className="h-10 w-10 text-white" />
      </div>
      <h3 className="text-white text-xl font-semibold mb-2">Η κράτηση στάλθηκε! 🎉</h3>
      <p className="text-white/80 mb-6">
        Θα ενημερωθείτε στο email σας μόλις ο/η {trainerName} επιβεβαιώσει.
      </p>
      <Btn onClick={onClose} className="w-full sm:w-auto">Κλείσιμο</Btn>
    </div>
  );
}
