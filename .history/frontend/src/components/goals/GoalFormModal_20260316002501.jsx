"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  Edit3,
  Calendar as CalendarIcon,
  TrendingUp,
  Activity,
  CheckCircle,
  Flame,
  Trophy,
  Brain,
  Sparkles,
  Clock,
  X,
  Save,
  Users,
  Heart,
  BookOpen,
  Briefcase,
  AlertCircle,
  Tag,
  Loader2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const cn = (...classes) => classes.filter(Boolean).join(" ");

const GREEK_MONTHS = [
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

const GREEK_WEEKDAYS_SHORT = ["Δε", "Τρ", "Τε", "Πε", "Πα", "Σα", "Κυ"];

const INITIAL_FORM = {
  title: "",
  description: "",
  category: "fitness",
  custom_category: "",
  icon: "",
  target_value: 0,
  progress_value: 0,
  unit: "",
  due_date: "",
  status: "not_started",
};

const categoryOptions = [
  { value: "fitness", label: "Fitness", icon: Target, color: "text-blue-400" },
  { value: "consistency", label: "Συνέπεια", icon: Flame, color: "text-orange-400" },
  { value: "skills", label: "Δεξιότητες", icon: Brain, color: "text-purple-400" },
  { value: "strength", label: "Δύναμη", icon: Trophy, color: "text-yellow-400" },
  { value: "health", label: "Υγεία", icon: Heart, color: "text-red-400" },
  { value: "learning", label: "Μάθηση", icon: BookOpen, color: "text-green-400" },
  { value: "career", label: "Καριέρα", icon: Briefcase, color: "text-indigo-400" },
  { value: "social", label: "Κοινωνικά", icon: Users, color: "text-pink-400" },
  { value: "custom", label: "Custom (δική σου)", icon: Tag, color: "text-teal-400" },
];

const statusOptions = [
  { value: "not_started", label: "Δεν ξεκίνησε", icon: Clock, color: "text-zinc-400" },
  { value: "in_progress", label: "Σε εξέλιξη", icon: Activity, color: "text-blue-400" },
  { value: "completed", label: "Ολοκληρώθηκε", icon: CheckCircle, color: "text-emerald-400" },
];

const MOBILE_MID_HEIGHT = "50dvh";
const MOBILE_FULL_HEIGHT = "85dvh";

/* --------------------------- date helpers --------------------------- */

function pad2(n) {
  return String(n).padStart(2, "0");
}

function parseISODateLocal(value) {
  if (!value) return new Date();
  const [y, m, d] = String(value).split("-").map(Number);
  return new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1, 12, 0, 0);
}

function toISODateLocal(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0);
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - (day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildCalendarGrid(anchorDate) {
  const first = startOfMonth(anchorDate);
  const gridStart = startOfWeek(first);
  const days = [];

  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push({
      date: d,
      key: toISODateLocal(d),
      day: d.getDate(),
      inMonth: d.getMonth() === anchorDate.getMonth(),
      isToday: toISODateLocal(d) === toISODateLocal(new Date()),
    });
  }

  return { days };
}

function formatDateTriggerText(value) {
  if (!value) return "ηη/μμ/εεεε";
  const d = parseISODateLocal(value);
  return d.toLocaleDateString("el-GR");
}

function useIsMobile(bp = 640) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(`(max-width:${bp - 0.02}px)`).matches
      : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia(`(max-width:${bp - 0.02}px)`);
    const onChange = (e) => setIsMobile(e.matches);

    setIsMobile(mq.matches);

    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, [bp]);

  return isMobile;
}

function useClickOutside(ref, handler, when = true) {
  useEffect(() => {
    if (!when) return;

    const onDown = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler?.();
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [ref, handler, when]);
}

function useFloatingPanel(triggerRef, open, { width = 360, gap = 10, zIndex = 3200 } = {}) {
  const [style, setStyle] = useState(null);

  const update = useCallback(() => {
    if (!triggerRef.current || typeof window === "undefined") return;

    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const panelWidth = Math.min(width, vw - 16);
    let left = rect.left;
    let top = rect.bottom + gap;

    if (left + panelWidth > vw - 8) left = vw - panelWidth - 8;
    if (left < 8) left = 8;

    const estimatedHeight = 430;
    const notEnoughBelow = top + estimatedHeight > vh - 8;
    if (notEnoughBelow && rect.top > estimatedHeight / 2) {
      top = Math.max(8, rect.top - gap - estimatedHeight);
    }

    setStyle({
      position: "fixed",
      top,
      left,
      width: panelWidth,
      zIndex,
    });
  }, [triggerRef, width, gap, zIndex]);

  useEffect(() => {
    if (!open) return;
    update();

    const handle = () => update();
    window.addEventListener("resize", handle);
    window.addEventListener("scroll", handle, true);

    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("scroll", handle, true);
    };
  }, [open, update]);

  return style;
}

function PickerPortal({ open, children }) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

/* --------------------------- fields --------------------------- */

function FieldShell({ label, icon, children, helper }) {
  return (
    <div className="relative">
      {children}

      <label className="absolute -top-2 left-3 inline-flex items-center gap-1.5 rounded bg-black/70 px-2 text-xs font-medium text-zinc-400 backdrop-blur-sm">
        {icon}
        <span>{label}</span>
      </label>

      {helper && <p className="mt-2 text-[11px] text-zinc-500">{helper}</p>}
    </div>
  );
}

function TextInput({
  label,
  icon,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
  min,
}) {
  return (
    <FieldShell label={label} icon={icon}>
      <input
        type={type}
        min={min}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-zinc-900/60 px-4 py-3 text-zinc-100 placeholder-zinc-400 backdrop-blur-xl transition-all duration-200 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
      />
    </FieldShell>
  );
}

function TextareaField({
  label,
  icon,
  value,
  onChange,
  placeholder,
  rows = 4,
}) {
  return (
    <FieldShell label={label} icon={icon}>
      <textarea
        value={value}
        onChange={onChange}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-none rounded-2xl border border-white/10 bg-zinc-900/60 px-4 py-3 text-zinc-100 placeholder-zinc-400 backdrop-blur-xl transition-all duration-200 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
      />
    </FieldShell>
  );
}

function SelectField({
  label,
  icon,
  value,
  onChange,
  options,
  rightIcon,
}) {
  return (
    <FieldShell label={label} icon={icon}>
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          className="w-full appearance-none rounded-2xl border border-white/10 bg-zinc-900/60 px-4 py-3 pr-11 text-zinc-100 backdrop-blur-xl transition-all duration-200 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-zinc-950">
              {option.label}
            </option>
          ))}
        </select>

        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
          {rightIcon || <ChevronDown className="h-4 w-4" />}
        </div>
      </div>
    </FieldShell>
  );
}

function GoalDatePickerField({
  label,
  icon,
  value,
  onChange,
  disabled = false,
  minDate,
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(() => parseISODateLocal(value));

  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const isMobile = useIsMobile(640);
  const panelStyle = useFloatingPanel(triggerRef, open, {
    width:
      isMobile && typeof window !== "undefined"
        ? Math.min(window.innerWidth - 16, 380)
        : 360,
    gap: 10,
    zIndex: 3300,
  });

  useClickOutside(panelRef, () => setOpen(false), open);

  useEffect(() => {
    setAnchor(parseISODateLocal(value));
  }, [value]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const selectedDate = useMemo(() => parseISODateLocal(value), [value]);
  const selectedKey = useMemo(() => (value ? toISODateLocal(selectedDate) : ""), [selectedDate, value]);
  const minKey = minDate || "";
  const { days } = useMemo(() => buildCalendarGrid(anchor), [anchor]);

  const prevMonth = () =>
    setAnchor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1, 12, 0, 0));

  const nextMonth = () =>
    setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1, 12, 0, 0));

  const handleSelect = (key) => {
    onChange?.(key);
    setOpen(false);
  };

  const handleToday = () => {
    const today = toISODateLocal(new Date());
    if (minKey && today < minKey) return;
    onChange?.(today);
    setOpen(false);
  };

  const handleClear = () => {
    onChange?.("");
    setOpen(false);
  };

  return (
    <FieldShell label={label} icon={icon}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-900/60 px-4 py-3 text-left text-zinc-100 backdrop-blur-xl transition-all duration-200 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-60"
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-base",
            value ? "font-medium text-zinc-100" : "font-normal text-zinc-400"
          )}
        >
          {formatDateTriggerText(value)}
        </span>

        <CalendarIcon className="h-5 w-5 shrink-0 text-zinc-400" />
      </button>

      <PickerPortal open={open && !!panelStyle}>
        <AnimatePresence>
          {open && panelStyle && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[3290] bg-transparent"
                onClick={() => setOpen(false)}
              />

              <motion.div
                ref={panelRef}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                style={panelStyle}
                className={cn(
                  "overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/98 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,.55)]",
                  isMobile ? "max-h-[min(78vh,520px)]" : ""
                )}
              >
                <div className="flex items-center justify-between border-b border-white/10 px-3 py-3">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-white transition hover:bg-white/10"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <div className="text-sm font-semibold text-white">
                    {GREEK_MONTHS[anchor.getMonth()]} {anchor.getFullYear()}
                  </div>

                  <button
                    type="button"
                    onClick={nextMonth}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-white transition hover:bg-white/10"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-3">
                  <div className="mb-2 grid grid-cols-7 gap-1">
                    {GREEK_WEEKDAYS_SHORT.map((w) => (
                      <div
                        key={w}
                        className="py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-white/45"
                      >
                        {w}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {days.map((d) => {
                      const key = d.key;
                      const disabledDay = minKey ? key < minKey : false;
                      const selected = key === selectedKey;

                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={disabledDay}
                          onClick={() => handleSelect(key)}
                          className={cn(
                            "h-10 rounded-2xl text-sm font-semibold transition",
                            selected
                              ? "bg-white text-black"
                              : d.inMonth
                              ? "bg-white/[0.04] text-white hover:bg-white/[0.08]"
                              : "bg-transparent text-white/35 hover:bg-white/[0.04]",
                            d.isToday && !selected ? "ring-1 ring-white/20" : "",
                            disabledDay ? "pointer-events-none opacity-30" : ""
                          )}
                        >
                          {d.day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-white/10 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleToday}
                      className="text-sm font-medium text-white/75 transition hover:text-white"
                    >
                      Σήμερα
                    </button>

                    <button
                      type="button"
                      onClick={handleClear}
                      className="text-sm font-medium text-white/45 transition hover:text-white/75"
                    >
                      Καθαρισμός
                    </button>
                  </div>

                  <div className="max-w-[58%] truncate text-right text-sm text-white/60">
                    {value || "—"}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </PickerPortal>
    </FieldShell>
  );
}

function ErrorBox({ message }) {
  if (!message) return null;

  return (
    <div className="flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/* --------------------------- main modal --------------------------- */

export default function GoalFormModal({ open, onClose, initial, onSubmit }) {
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [mobileMode, setMobileMode] = useState("mid");
  const [mobileDragY, setMobileDragY] = useState(0);
  const [mobileDragging, setMobileDragging] = useState(false);

  const formScrollRef = useRef(null);
  const dragRef = useRef({
    startY: 0,
    deltaY: 0,
    startMode: "mid",
    source: "header",
    engaged: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    if (initial) {
      setForm({
        title: initial.title ?? "",
        description: initial.description ?? "",
        category: initial.category ?? "fitness",
        custom_category: initial.custom_category ?? "",
        icon: initial.icon ?? "",
        target_value: initial.target_value ?? 0,
        progress_value: initial.progress_value ?? 0,
        unit: initial.unit ?? "",
        due_date: initial.due_date ?? "",
        status: initial.status ?? "not_started",
      });
    } else {
      setForm(INITIAL_FORM);
    }

    setSaving(false);
    setErrorMsg(null);
    setMobileMode("mid");
    setMobileDragY(0);
    setMobileDragging(false);

    if (formScrollRef.current) {
      formScrollRef.current.scrollTop = 0;
    }
  }, [open, initial]);

  useEffect(() => {
    if (!mounted || !open) return;

    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [mounted, open]);

  const setField = (key) => (e) => {
    setForm((prev) => ({
      ...prev,
      [key]: e.target.value,
    }));
  };

  const selectedCategory = useMemo(
    () => categoryOptions.find((cat) => cat.value === form.category),
    [form.category]
  );

  const selectedStatus = useMemo(
    () => statusOptions.find((stat) => stat.value === form.status),
    [form.status]
  );

  const CategoryIcon = selectedCategory?.icon || Target;
  const StatusIcon = selectedStatus?.icon || Clock;

  const isDirty = useMemo(() => {
    return Boolean(
      form.title?.trim() ||
        form.description?.trim() ||
        Number(form.target_value) > 0 ||
        Number(form.progress_value) > 0 ||
        form.unit?.trim() ||
        form.due_date ||
        form.custom_category?.trim() ||
        form.icon?.trim() ||
        form.category !== "fitness" ||
        form.status !== "not_started"
    );
  }, [form]);

  const requestClose = () => {
    if (saving) return;
    onClose?.();
  };

  const handleSubmitAction = async () => {
    setSaving(true);
    setErrorMsg(null);

    try {
      const payload = {
        ...form,
        target_value: Number(form.target_value) || 0,
        progress_value: Number(form.progress_value) || 0,
        unit: form.unit?.trim() || null,
        due_date: form.due_date || null,
      };

      if (form.category === "custom") {
        if (!form.custom_category.trim()) {
          setErrorMsg("Συμπλήρωσε το όνομα της προσαρμοσμένης κατηγορίας.");
          setSaving(false);
          return;
        }
      } else {
        payload.custom_category = null;
        payload.icon = null;
      }

      await onSubmit(payload);
    } catch (err) {
      const message =
        err?.message ||
        err?.response?.data?.message ||
        "Η αποθήκευση απέτυχε. Προσπάθησε ξανά.";
      setErrorMsg(message);
    } finally {
      setSaving(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    await handleSubmitAction();
  };

  const beginMobileGesture = (clientY, source = "header") => {
    dragRef.current.startY = clientY;
    dragRef.current.deltaY = 0;
    dragRef.current.startMode = mobileMode;
    dragRef.current.source = source;
    dragRef.current.engaged = source === "header";
    setMobileDragging(source === "header");
  };

  const moveMobileGesture = (clientY) => {
    const rawDelta = clientY - dragRef.current.startY;
    dragRef.current.deltaY = rawDelta;

    if (dragRef.current.source === "content" && !dragRef.current.engaged) {
      const scrollTop = formScrollRef.current?.scrollTop || 0;
      const startMode = dragRef.current.startMode;

      const shouldExpand = startMode === "mid" && rawDelta < -14;
      const shouldCollapseFromTop =
        startMode === "full" && scrollTop <= 0 && rawDelta > 14;
      const shouldCloseFromMid =
        startMode === "mid" && scrollTop <= 0 && rawDelta > 14;

      if (shouldExpand || shouldCollapseFromTop || shouldCloseFromMid) {
        dragRef.current.engaged = true;
        setMobileDragging(true);
      } else {
        return false;
      }
    }

    if (!dragRef.current.engaged) return false;

    if (rawDelta < 0) {
      setMobileDragY(Math.max(rawDelta, -260));
    } else {
      setMobileDragY(Math.min(rawDelta, 320));
    }

    return true;
  };

  const endMobileGesture = () => {
    const deltaY = dragRef.current.deltaY;
    const startMode = dragRef.current.startMode;
    const engaged = dragRef.current.engaged;

    dragRef.current.engaged = false;
    setMobileDragging(false);
    setMobileDragY(0);

    if (!engaged) return;

    if (startMode === "mid") {
      if (deltaY <= -70) {
        setMobileMode("full");
        return;
      }

      if (deltaY >= 140) {
        requestClose();
        return;
      }

      setMobileMode("mid");
      return;
    }

    if (startMode === "full") {
      if (deltaY >= 80 && deltaY < 210) {
        setMobileMode("mid");
        return;
      }

      if (deltaY >= 210) {
        requestClose();
        return;
      }

      setMobileMode("full");
    }
  };

  const handleHeaderTouchStart = (e) => {
    beginMobileGesture(e.touches[0].clientY, "header");
  };

  const handleHeaderTouchMove = (e) => {
    const engaged = moveMobileGesture(e.touches[0].clientY);
    if (engaged) e.preventDefault();
  };

  const handleHeaderTouchEnd = () => {
    endMobileGesture();
  };

  const handleContentTouchStart = (e) => {
    beginMobileGesture(e.touches[0].clientY, "content");
  };

  const handleContentTouchMove = (e) => {
    const engaged = moveMobileGesture(e.touches[0].clientY);
    if (engaged) e.preventDefault();
  };

  const handleContentTouchEnd = () => {
    endMobileGesture();
  };

  if (!mounted) return null;

  const renderForm = ({ mobile = false }) => (
    <form
      ref={mobile ? formScrollRef : undefined}
      onSubmit={submit}
      className={cn(
        "qb-scroll flex-1 overflow-y-auto overscroll-contain",
        mobile ? "px-4 py-4" : "px-6 py-5"
      )}
      style={{ WebkitOverflowScrolling: "touch" }}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={mobile ? handleContentTouchStart : undefined}
      onTouchMove={mobile ? handleContentTouchMove : undefined}
      onTouchEnd={mobile ? handleContentTouchEnd : undefined}
      onTouchCancel={mobile ? handleContentTouchEnd : undefined}
    >
      <div className="space-y-6">
        <ErrorBox message={errorMsg} />

        <div
          className={cn(
            "grid gap-4",
            mobile ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-[1.15fr_.85fr]"
          )}
        >
          <div className="space-y-4">
            <TextInput
              label="Τίτλος Στόχου"
              icon={<Sparkles className="h-3.5 w-3.5 text-zinc-400" />}
              placeholder="π.χ. Μηνιαίες Προπονήσεις"
              value={form.title}
              onChange={setField("title")}
              required
            />

            <TextareaField
              label="Περιγραφή"
              icon={<Edit3 className="h-3.5 w-3.5 text-zinc-400" />}
              placeholder="Περίγραψε τον στόχο σου..."
              value={form.description}
              onChange={setField("description")}
              rows={mobile ? 4 : 5}
            />

            <AnimatePresence initial={false}>
              {form.category === "custom" && (
                <motion.div
                  key="custom-fields"
                  initial={{ opacity: 0, y: 16, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: 10, height: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 pt-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                      <Tag className="h-4 w-4 text-teal-400" />
                      Ρυθμίσεις custom κατηγορίας
                    </div>

                    <TextInput
                      label="Όνομα κατηγορίας"
                      icon={<Tag className="h-3.5 w-3.5 text-zinc-400" />}
                      placeholder="π.χ. Mindfulness"
                      value={form.custom_category}
                      onChange={setField("custom_category")}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <SelectField
                label="Κατηγορία"
                icon={<CategoryIcon className={cn("h-3.5 w-3.5", selectedCategory?.color)} />}
                value={form.category}
                onChange={setField("category")}
                options={categoryOptions}
              />

              <SelectField
                label="Κατάσταση"
                icon={<StatusIcon className={cn("h-3.5 w-3.5", selectedStatus?.color)} />}
                value={form.status}
                onChange={setField("status")}
                options={statusOptions}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextInput
                type="number"
                min="0"
                label="Στόχος"
                icon={<Target className="h-3.5 w-3.5 text-zinc-400" />}
                placeholder="0"
                value={form.target_value}
                onChange={setField("target_value")}
              />

              <TextInput
                type="number"
                min="0"
                label="Τρέχουσα Πρόοδος"
                icon={<TrendingUp className="h-3.5 w-3.5 text-zinc-400" />}
                placeholder="0"
                value={form.progress_value}
                onChange={setField("progress_value")}
              />
            </div>

            <TextInput
              label="Μονάδα"
              icon={<Tag className="h-3.5 w-3.5 text-zinc-400" />}
              placeholder="π.χ. km, sessions, ώρες"
              value={form.unit || ""}
              onChange={setField("unit")}
            />

            <GoalDatePickerField
              label="Προθεσμία"
              icon={<CalendarIcon className="h-3.5 w-3.5 text-zinc-400" />}
              value={form.due_date}
              onChange={(nextValue) =>
                setForm((prev) => ({
                  ...prev,
                  due_date: nextValue,
                }))
              }
              disabled={saving}
            />

            <div className="rounded-[24px] border border-white/10 bg-zinc-950/60 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                <Target className="h-4 w-4 text-white" />
                Σύνοψη
              </div>

              <div className="mt-3 space-y-2 text-sm text-zinc-400">
                <p>
                  <span className="font-medium text-zinc-200">Κατηγορία:</span>{" "}
                  {selectedCategory?.label || "-"}
                </p>
                <p>
                  <span className="font-medium text-zinc-200">Κατάσταση:</span>{" "}
                  {selectedStatus?.label || "-"}
                </p>
                <p>
                  <span className="font-medium text-zinc-200">Στόχος:</span>{" "}
                  {Number(form.target_value) || 0}
                  {form.unit ? ` ${form.unit}` : ""}
                </p>
                <p>
                  <span className="font-medium text-zinc-200">Πρόοδος:</span>{" "}
                  {Number(form.progress_value) || 0}
                  {form.unit ? ` ${form.unit}` : ""}
                </p>
                <p>
                  <span className="font-medium text-zinc-200">Προθεσμία:</span>{" "}
                  {form.due_date
                    ? parseISODateLocal(form.due_date).toLocaleDateString("el-GR")
                    : "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button type="submit" className="hidden" aria-hidden="true" />
    </form>
  );

  return createPortal(
    <>
      <style>{`
        .qb-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(161, 161, 170, 0.48) transparent;
        }

        .qb-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .qb-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .qb-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(
            180deg,
            rgba(161, 161, 170, 0.42),
            rgba(113, 113, 122, 0.52)
          );
          border-radius: 999px;
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        .qb-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(
            180deg,
            rgba(190, 190, 200, 0.52),
            rgba(125, 125, 135, 0.62)
          );
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        .qb-scroll::-webkit-scrollbar-corner {
          background: transparent;
        }
      `}</style>

      <AnimatePresence>
        {open && (
          <>
            {/* Desktop */}
            <div className="fixed inset-0 z-[120] hidden items-center justify-center p-4 sm:flex">
              <motion.button
                type="button"
                aria-label="close overlay"
                onClick={requestClose}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="absolute inset-0 bg-black/65 backdrop-blur-md"
              />

              <motion.div
                initial={{ opacity: 0, y: 80, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 80, scale: 0.985 }}
                transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="relative flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/85 to-black/90 shadow-2xl backdrop-blur-2xl"
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_30%)]" />

                <div className="relative flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20">
                      <Target className="h-6 w-6" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="break-words text-xl font-bold tracking-tight text-white">
                        {initial ? "Επεξεργασία στόχου" : "Νέος στόχος"}
                      </h3>
                      <p className="mt-1 break-words text-sm text-zinc-300">
                        {initial
                          ? "Ενημέρωσε τα στοιχεία του στόχου σου"
                          : "Δημιούργησε έναν νέο στόχο"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={requestClose}
                    disabled={saving}
                    className="text-white transition hover:opacity-70 disabled:opacity-50"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {renderForm({ mobile: false })}

                <div className="relative border-t border-white/10 bg-black/45 px-6 py-4 backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-zinc-400">
                      {isDirty
                        ? "Έχεις μη αποθηκευμένες αλλαγές."
                        : "Συμπλήρωσε τα πεδία για να αποθηκεύσεις τον στόχο."}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={requestClose}
                        disabled={saving}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-black/30 px-4 py-2 text-white/90 transition hover:bg-white/10 disabled:opacity-60"
                      >
                        Ακύρωση
                      </button>

                      <button
                        type="button"
                        onClick={handleSubmitAction}
                        disabled={saving}
                        className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 font-semibold text-black transition hover:bg-zinc-100 disabled:opacity-60"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Αποθήκευση...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            {initial ? "Ενημέρωση στόχου" : "Δημιουργία στόχου"}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Mobile */}
            <div className="fixed inset-0 z-[120] sm:hidden">
              <motion.button
                type="button"
                aria-label="close overlay"
                onClick={requestClose}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute inset-0 bg-black/88"
              />

              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center">
                <motion.div
                  initial={{ opacity: 1, y: "100%" }}
                  animate={{ opacity: 1, y: mobileDragY }}
                  exit={{ opacity: 1, y: "100%" }}
                  transition={
                    mobileDragging
                      ? { duration: 0 }
                      : { duration: 0.32, ease: [0.22, 1, 0.36, 1] }
                  }
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "pointer-events-auto flex w-full flex-col overflow-hidden rounded-t-[30px] border border-zinc-900 bg-black shadow-[0_-30px_80px_rgba(0,0,0,.9)] will-change-transform",
                    mobileDragging
                      ? "transition-none"
                      : "transition-[height,border-radius] duration-300 ease-out"
                  )}
                  style={{
                    height: mobileMode === "full" ? MOBILE_FULL_HEIGHT : MOBILE_MID_HEIGHT,
                  }}
                >
                  <div
                    className="touch-none select-none bg-black pt-2 pb-1"
                    onTouchStart={handleHeaderTouchStart}
                    onTouchMove={handleHeaderTouchMove}
                    onTouchEnd={handleHeaderTouchEnd}
                    onTouchCancel={handleHeaderTouchEnd}
                  >
                    <div className="mx-auto h-1.5 w-12 rounded-full bg-zinc-700/90" />
                  </div>

                  <div
                    className="touch-none select-none border-b border-zinc-800/90 bg-black px-4 pt-3 pb-4"
                    onTouchStart={handleHeaderTouchStart}
                    onTouchMove={handleHeaderTouchMove}
                    onTouchEnd={handleHeaderTouchEnd}
                    onTouchCancel={handleHeaderTouchEnd}
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-zinc-900 ring-1 ring-zinc-800/90">
                        <Target className="h-5 w-5 text-white" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-[17px] font-semibold leading-tight text-white">
                          {initial ? "Επεξεργασία στόχου" : "Νέος στόχος"}
                        </h3>

                        <div className="mt-1 text-sm leading-snug text-zinc-300">
                          Δημιούργησε τον επόμενο στόχο σου
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={requestClose}
                        disabled={saving}
                        className="shrink-0 text-white transition hover:opacity-70 disabled:opacity-50"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>
                  </div>

                  {renderForm({ mobile: true })}

                  <div className="border-t border-zinc-800/90 bg-black px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
                    <div className="flex flex-col gap-3">
                      <div className="text-sm text-white/75">
                        {isDirty
                          ? "Έχεις μη αποθηκευμένες αλλαγές."
                          : "Συμπλήρωσε τα πεδία για να αποθηκεύσεις."}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={requestClose}
                          disabled={saving}
                          className="h-12 rounded-2xl border border-zinc-800 bg-zinc-900 text-white transition hover:bg-zinc-800 disabled:opacity-60"
                        >
                          Ακύρωση
                        </button>

                        <button
                          type="button"
                          onClick={handleSubmitAction}
                          disabled={saving}
                          className="h-12 rounded-2xl border border-white bg-white font-semibold text-black transition hover:bg-zinc-100 disabled:opacity-60"
                        >
                          <span className="inline-flex items-center justify-center gap-2">
                            {saving ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Αποθήκευση...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4" />
                                {initial ? "Ενημέρωση" : "Δημιουργία"}
                              </>
                            )}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}