"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  lazy,
  Suspense,
  startTransition,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
// Lazy-load the big side menu
const TrainerMenuLazy = lazy(() => import("../components/TrainerMenu"));
import {
  CalendarDays,
  Clock,
  RefreshCw,
  Save,
  Wifi,
  WifiOff,
  Plus,
  Trash2,
  Sun,
  CheckCircle2,
  AlertTriangle,
  DoorClosedIcon as CloseIcon,
  Sparkles,
  Euro,
  Calendar,
  Timer,
  Pencil,
  X,
} from "lucide-react";

/* ---------------------------- constants ---------------------------- */

const ALL_DAYS = [
  { key: "monday", label: "Δευ" },
  { key: "tuesday", label: "Τρι" },
  { key: "wednesday", label: "Τετ" },
  { key: "thursday", label: "Πεμ" },
  { key: "friday", label: "Παρ" },
  { key: "saturday", label: "Σαβ" },
  { key: "sunday", label: "Κυρ" },
];

const SLOT_PRESETS = [30, 45, 60, 90];
const BREAK_PRESETS = [0, 5, 10, 15, 30];
const GENERATION_HORIZON_DAYS = 180;

/* -------------------------- helpers ------------------------- */

const deepEqual = (a, b) => {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};

// mount children only when scrolled into view (perf)
function LazySection({ children, rootMargin = "200px" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref}>
      {visible ? (
        children
      ) : (
        <div className="h-72 rounded-3xl border border-white/10 bg-zinc-900/40 animate-pulse" />
      )}
    </div>
  );
}

/* -------------------------- Premium UI Components ------------------------- */

function PremiumCard({ title, subtitle, icon, action, children, className = "", gradient = false, dirty = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={[
        "w-full h-full flex flex-col group relative overflow-hidden rounded-3xl border bg-gradient-to-b from-zinc-900/60 to-black/60 backdrop-blur-xl p-5 sm:p-6 shadow-2xl transition-all duration-300",
        gradient ? "premium-gradient" : "",
        "border-white/10 hover:shadow-3xl hover:border-white/20",
        dirty ? "halo" : "",
        className,
      ].join(" ")}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-zinc-300/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      {(title || subtitle || icon || action) && (
        <div className="relative mb-5 flex items-start justify-between">
          <div className="flex items-center gap-4">
            {icon && (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {title && <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight break-words">{title}</h3>}
              {subtitle && <p className="text-xs sm:text-sm text-zinc-300 mt-1 break-words">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="relative z-10">{action}</div>}
        </div>
      )}
      <div className="relative flex-1">{children}</div>
    </motion.div>
  );
}

function PremiumButton({ children, variant = "primary", size = "default", className = "", ...props }) {
  const baseClasses =
    "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-white text-black hover:bg-zinc-100 shadow-lg hover:shadow-xl hover:shadow-white/25 active:scale-95",
    secondary: "bg-zinc-800 text-white hover:bg-zinc-700 shadow-lg hover:shadow-xl hover:shadow-zinc-800/25 active:scale-95",
    outline:
      "border-2 border-white/20 bg-black/50 backdrop-blur-sm text-white hover:bg-white/10 hover:text-white hover:border-white/50",
    ghost: "text-white hover:bg-white/10 hover:text-white",
  };
  const sizes = {
    sm: "px-4 py-2 text-sm rounded-xl",
    default: "px-6 py-3 text-sm rounded-2xl",
    lg: "px-8 py-4 text-base rounded-2xl",
    xl: "px-6 py-4 text-base rounded-2xl", // for mobile bottom sheet
  };
  return (
    <button {...props} className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </button>
  );
}

function PremiumInput({ label, icon, className = "", dirty = false, rounded = "rounded-2xl", ...props }) {
  return (
    <div className={["space-y-2", dirty ? `halo p-2 -m-2 ${rounded}` : ""].join(" ")}>
      {label && (
        <label className="text-sm font-medium text-white flex items-center gap-2">
          {icon && <span className="text-white">{icon}</span>}
          {label}
        </label>
      )}
      <input
        {...props}
        className={[
          "w-full border bg-black/50 backdrop-blur-sm px-4 py-3 text-white placeholder-zinc-400 transition-all duration-200 focus:border-white focus:ring-2 focus:ring-white/20 focus:outline-none",
          rounded,
          "border-white/20",
          className,
        ].join(" ")}
      />
    </div>
  );
}

function PremiumSwitch({ checked, onChange, label, dirty = false }) {
  return (
    <div className={["flex items-center gap-3", dirty ? "halo p-2 -m-2 rounded-full" : ""].join(" ")}>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/20 ${
          checked ? "bg-green-500" : "bg-zinc-700"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
      {label && <span className="text-sm font-medium text-white">{label}</span>}
    </div>
  );
}

/* --------------------------- main component ------------------------ */

export default function TrainerSchedulePage() {
  const { profile, profileLoaded } = useAuth();

  const [loading, setLoading] = useState(false);
  const [savingAll, setSavingAll] = useState(false);

  const [modal, setModal] = useState({ open: false, type: "success", title: "", message: "" });
  const showSuccess = useCallback(
    (msg, title = "Η ενέργεια ολοκληρώθηκε") => setModal({ open: true, type: "success", title, message: msg }),
    []
  );
  const showError = useCallback((msg, title = "Σφάλμα") => setModal({ open: true, type: "error", title, message: msg }), []);

  // availability
  const [selectedDays, setSelectedDays] = useState(() => new Set(ALL_DAYS.map((d) => d.key)));
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("21:00");
  const [isOnline, setIsOnline] = useState(false);
  const [availabilityInitial, setAvailabilityInitial] = useState(null);

  // schedule settings
  const [slotPreset, setSlotPreset] = useState(60);
  const [slotCustom, setSlotCustom] = useState(60);
  const [breakPreset, setBreakPreset] = useState(0);
  const [breakCustom, setBreakCustom] = useState(0);
  const [scheduleInitial, setScheduleInitial] = useState(null);

  // holidays
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [holidayFrom, setHolidayFrom] = useState(todayStr);
  const [holidayTo, setHolidayTo] = useState(todayStr);
  const [holidayReason, setHolidayReason] = useState("");
  const [holidays, setHolidays] = useState([]);
  const [editingHolidayId, setEditingHolidayId] = useState(null);
  const [holidayInitial, setHolidayInitial] = useState({ from: todayStr, to: todayStr, reason: "", editingId: null });

  // generation
  const [generating, setGenerating] = useState(false);

  // pricing (state + original for cancel)
  const defaultPricing = { basePrice: 50, onlineDiscount: 10, specialtyPricing: {}, paymentMethods: { cash: true, card: true } };
  const [pricing, setPricing] = useState(defaultPricing);
  const [pricingInitial, setPricingInitial] = useState(defaultPricing);

  const hasTrainer = Boolean(profile?.id);
  const effectiveSlot = slotPreset === "custom" ? Number(slotCustom || 0) : Number(slotPreset || 0);
  const effectiveBreak = breakPreset === "custom" ? Number(breakCustom || 0) : Number(breakPreset || 0);

  // ---- field-level dirty flags (for glow) ----
  const basePriceDirty = pricing.basePrice !== pricingInitial.basePrice;
  const onlineDiscountDirty = pricing.onlineDiscount !== pricingInitial.onlineDiscount;
  const cashDirty = !!pricing.paymentMethods?.cash !== !!pricingInitial.paymentMethods?.cash;
  const cardDirty = !!pricing.paymentMethods?.card !== !!pricingInitial.paymentMethods?.card;

  const selectedDaysDirty = useMemo(() => {
    if (!availabilityInitial) return false;
    const a = Array.from(selectedDays).sort().join(",");
    const b = Array.from(availabilityInitial.days || []).sort().join(",");
    return a !== b;
  }, [selectedDays, availabilityInitial]);

  const startTimeDirty = availabilityInitial ? startTime !== availabilityInitial.startTime : false;
  const endTimeDirty = availabilityInitial ? endTime !== availabilityInitial.endTime : false;
  const isOnlineDirty = availabilityInitial ? !!isOnline !== !!availabilityInitial.isOnline : false;

  const slotDirty = scheduleInitial ? Number(effectiveSlot) !== Number(scheduleInitial.slot) : false;
  const breakDirty = scheduleInitial ? Number(effectiveBreak) !== Number(scheduleInitial.breakMin) : false;

  const holidayFromDirty = holidayFrom !== holidayInitial.from;
  const holidayToDirty = holidayTo !== holidayInitial.to;
  const holidayReasonDirty = (holidayReason || "") !== (holidayInitial.reason || "");
  const holidayEditingDirty = editingHolidayId !== holidayInitial.editingId;

  // ---- section-level dirty flags ----
  const availabilityDirty =
    selectedDaysDirty || startTimeDirty || endTimeDirty || isOnlineDirty;

  const scheduleDirty =
    slotDirty || breakDirty;

  const pricingDirty =
    basePriceDirty || onlineDiscountDirty || cashDirty || cardDirty || !deepEqual(pricing.specialtyPricing, pricingInitial.specialtyPricing);

  const holidayDirty =
    holidayFromDirty || holidayToDirty || holidayReasonDirty || holidayEditingDirty;

  const somethingDirty = availabilityDirty || scheduleDirty || pricingDirty || holidayDirty;
  const dirtyCount =
    (availabilityDirty ? 1 : 0) + (scheduleDirty ? 1 : 0) + (pricingDirty ? 1 : 0) + (holidayDirty ? 1 : 0);

  /* ------------------------ effects / data load ------------------------ */
  useEffect(() => {
    if (!profileLoaded || !profile?.id) return;

    if (typeof profile.is_online === "boolean") setIsOnline(!!profile.is_online);

    (async () => {
      // schedule settings
      const { data: settings } = await supabase
        .from("trainer_schedule_settings")
        .select("*")
        .eq("trainer_id", profile.id)
        .single();
      let slotVal = 60;
      let breakVal = 0;
      if (settings) {
        slotVal = Number(settings.slot_minutes || 60);
        breakVal = Number(settings.break_minutes || 0);
        if ([30, 45, 60, 90].includes(slotVal)) {
          setSlotPreset(slotVal);
          setSlotCustom(slotVal);
        } else {
          setSlotPreset("custom");
          setSlotCustom(slotVal);
        }
        if ([0, 5, 10, 15, 30].includes(breakVal)) {
          setBreakPreset(breakVal);
          setBreakCustom(breakVal);
        } else {
          setBreakPreset("custom");
          setBreakCustom(breakVal);
        }
      }
      setScheduleInitial({ slot: slotVal, breakMin: breakVal });

      // availability
      const { data: availData } = await supabase
        .from("trainer_availability")
        .select("*")
        .eq("trainer_id", profile.id);

      if (Array.isArray(availData) && availData.length > 0) {
        const days = new Set(availData.map((r) => r.weekday));
        const minStart = availData.map((r) => r.start_time).sort()[0] || "08:00";
        const maxEnd = availData.map((r) => r.end_time).sort().slice(-1)[0] || "21:00";
        const online = availData.some((r) => !!r.is_online);
        setSelectedDays(days);
        setStartTime(minStart);
        setEndTime(maxEnd);
        setIsOnline(online);
        setAvailabilityInitial({ days: Array.from(days), startTime: minStart, endTime: maxEnd, isOnline: online });
      } else {
        const init = {
          days: ALL_DAYS.map((d) => d.key),
          startTime: "08:00",
          endTime: "21:00",
          isOnline: !!profile.is_online,
        };
        setAvailabilityInitial(init);
      }

      // holidays list
      const { data: holData } = await supabase
        .from("trainer_holidays")
        .select("*")
        .eq("trainer_id", profile.id)
        .order("starts_on", { ascending: false });
      setHolidays(holData || []);
      setHolidayInitial({ from: todayStr, to: todayStr, reason: "", editingId: null });
    })();
  }, [profileLoaded, profile?.id, todayStr]);

  // load pricing from DB
  useEffect(() => {
    if (!profile?.id) return;
    loadPricing(profile.id);
  }, [profile?.id]);

  async function loadPricing(trainerId) {
    const { data, error } = await supabase.from("trainer_pricing").select("*").eq("trainer_id", trainerId).single();
    if (error || !data) {
      setPricing(defaultPricing);
      setPricingInitial(defaultPricing);
      return;
    }
    const incoming = {
      basePrice: Number(data.base_price ?? 0),
      onlineDiscount: Number(data.online_discount ?? 0),
      specialtyPricing: data.specialty_pricing ?? {},
      paymentMethods: data.payment_methods ?? { cash: true, card: true },
    };
    setPricing(incoming);
    setPricingInitial(incoming);
  }

  /* ---------------------------- misc helpers ---------------------------- */

  const dateAddDays = (d, n) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };
  const dateISO = (d) => new Date(d).toISOString().slice(0, 10);
  const errText = (e) => e?.message || e?.details || e?.hint || (typeof e === "string" ? e : JSON.stringify(e || {}));

  /* ----------------------- Individual saves ----------------------- */

  async function savePricing() {
    if (!hasTrainer) {
      showError("Απαιτείται σύνδεση για αποθήκευση τιμών.");
      return false;
    }
    const base = Number(pricing.basePrice ?? 0);
    const disc = Number(pricing.onlineDiscount ?? 0);
    if (base < 0) return showError("Η βασική τιμή δεν μπορεί να είναι αρνητική.");
    if (disc < 0 || disc > 50) return showError("Η έκπτωση Online πρέπει να είναι 0–50%.");

    const payload = {
      trainer_id: profile.id,
      base_price: base,
      online_discount: disc,
      specialty_pricing: pricing.specialtyPricing ?? {},
      payment_methods: pricing.paymentMethods ?? { cash: true, card: true },
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("trainer_pricing").upsert(payload, { onConflict: "trainer_id" });
    if (error) {
      showError("Αποτυχία αποθήκευσης τιμών: " + (error.message || JSON.stringify(error)));
      return false;
    }
    setPricingInitial({
      basePrice: base,
      onlineDiscount: disc,
      specialtyPricing: payload.specialty_pricing,
      paymentMethods: payload.payment_methods,
    });
    return true;
  }

  async function saveAvailability() {
    if (!hasTrainer) {
      showError("Απαιτείται σύνδεση για αποθήκευση προγράμματος.");
      return false;
    }
    const toMin = (hhmm) => {
      const [h, m] = hhmm.split(":").map(Number);
      return h * 60 + m;
    };
    if (toMin(endTime) <= toMin(startTime)) {
      showError("Η ώρα λήξης πρέπει να είναι μετά την ώρα έναρξης.");
      return false;
    }
    if (selectedDays.size === 0) {
      showError("Επίλεξε τουλάχιστον μία ημέρα.");
      return false;
    }

    const trainerId = profile.id;
    const { error: delErr } = await supabase.from("trainer_availability").delete().eq("trainer_id", trainerId);
    if (delErr) {
      showError("Αποτυχία καθαρισμού παλιών εγγραφών.");
      return false;
    }
    const rows = Array.from(selectedDays).map((day) => ({
      trainer_id: trainerId,
      weekday: day,
      start_time: startTime,
      end_time: endTime,
      is_online: isOnline,
    }));
    const { error: insErr } = await supabase.from("trainer_availability").insert(rows);
    if (insErr) {
      showError("Αποτυχία αποθήκευσης προγράμματος.");
      return false;
    }
    await supabase.from("profiles").update({ is_online: isOnline }).eq("id", trainerId);

    setAvailabilityInitial({
      days: Array.from(selectedDays),
      startTime,
      endTime,
      isOnline,
    });

    await generateOpenSlotsForFuture(trainerId);
    return true;
  }

  async function saveSchedule() {
    if (!hasTrainer) {
      showError("Απαιτείται σύνδεση για αποθήκευση ρυθμίσεων.");
      return false;
    }
    const slot = Number(effectiveSlot);
    const brk = Number(effectiveBreak);
    if (!slot || slot < 15 || slot > 240) {
      showError("Το διάστημα συνεδρίας πρέπει να είναι 15–240 λεπτά.");
      return false;
    }
    if (brk < 0 || brk > 60) {
      showError("Το διάλειμμα πρέπει να είναι 0–60 λεπτά.");
      return false;
    }
    const { error } = await supabase
      .from("trainer_schedule_settings")
      .upsert(
        { trainer_id: profile.id, slot_minutes: slot, break_minutes: brk, updated_at: new Date().toISOString() },
        { onConflict: "trainer_id" }
      );
    if (error) {
      showError("Αποτυχία αποθήκευσης ρυθμίσεων.");
      return false;
    }
    setScheduleInitial({ slot, breakMin: brk });
    await generateOpenSlotsForFuture(profile.id);
    return true;
  }

  async function saveHoliday() {
    if (!hasTrainer) {
      showError("Απαιτείται σύνδεση για προσθήκη/ενημέρωση άδειας.");
      return false;
    }
    if (!holidayFrom || !holidayTo) {
      showError("Συμπλήρωσε ημερομηνίες.");
      return false;
    }
    if (new Date(holidayTo) < new Date(holidayFrom)) {
      showError("Η ημερομηνία λήξης πρέπει να είναι μετά την έναρξη.");
      return false;
    }

    const payload = { starts_on: holidayFrom, ends_on: holidayTo, reason: holidayReason || null };

    let error;
    if (editingHolidayId) {
      ({ error } = await supabase.from("trainer_holidays").update(payload).eq("id", editingHolidayId));
    } else {
      ({ error } = await supabase.from("trainer_holidays").insert({ trainer_id: profile.id, ...payload }));
    }
    if (error) {
      showError(editingHolidayId ? "Αποτυχία ενημέρωσης άδειας." : "Αποτυχία προσθήκης άδειας.");
      return false;
    }

    const reset = { from: todayStr, to: todayStr, reason: "", editingId: null };
    setHolidayFrom(reset.from);
    setHolidayTo(reset.to);
    setHolidayReason(reset.reason);
    setEditingHolidayId(reset.editingId);
    setHolidayInitial(reset);

    const { data } = await supabase
      .from("trainer_holidays")
      .select("*")
      .eq("trainer_id", profile.id)
      .order("starts_on", { ascending: false });
    setHolidays(data || []);
    await generateOpenSlotsForFuture(profile.id);
    return true;
  }

  /* ----------------------- Save All / Cancel All ----------------------- */

  async function handleSaveAll() {
    setSavingAll(true);
    try {
      const results = [];
      if (pricingDirty) results.push(await savePricing());
      if (availabilityDirty) results.push(await saveAvailability());
      if (scheduleDirty) results.push(await saveSchedule());
      if (holidayDirty) results.push(await saveHoliday());
      const ok = results.every(Boolean);
      if (ok) showSuccess("Όλες οι αλλαγές αποθηκεύτηκαν.", "Επιτυχής αποθήκευση");
    } finally {
      setSavingAll(false);
    }
  }

  function handleCancelAll() {
    startTransition(() => {
      setPricing(pricingInitial);
      if (availabilityInitial) {
        setSelectedDays(new Set(availabilityInitial.days || []));
        setStartTime(availabilityInitial.startTime || "08:00");
        setEndTime(availabilityInitial.endTime || "21:00");
        setIsOnline(!!availabilityInitial.isOnline);
      }
      if (scheduleInitial) {
        const s = scheduleInitial.slot;
        const b = scheduleInitial.breakMin;
        if ([30, 45, 60, 90].includes(s)) {
          setSlotPreset(s);
          setSlotCustom(s);
        } else {
          setSlotPreset("custom");
          setSlotCustom(s);
        }
        if ([0, 5, 10, 15, 30].includes(b)) {
          setBreakPreset(b);
          setBreakCustom(b);
        } else {
          setBreakPreset("custom");
          setBreakCustom(b);
        }
      }
      setHolidayFrom(holidayInitial.from);
      setHolidayTo(holidayInitial.to);
      setHolidayReason(holidayInitial.reason);
      setEditingHolidayId(holidayInitial.editingId);
    });
  }

  /* ----------------------- Slots generator ----------------------- */
  async function generateOpenSlotsForFuture(trainerId, horizonDays = GENERATION_HORIZON_DAYS) {
    setGenerating(true);
    {
      const { error: tableErr } = await supabase
        .from("trainer_open_slots")
        .select("trainer_id", { count: "exact", head: true })
        .limit(1);
      if (tableErr) {
        setGenerating(false);
        showError("Ο πίνακας 'trainer_open_slots' δεν είναι διαθέσιμος ή δεν έχεις δικαιώματα.\n" + errText(tableErr));
        return;
      }
    }
    const [{ data: avail, error: aErr }, { data: settings, error: sErr }, { data: hols, error: hErr }] = await Promise.all([
      supabase.from("trainer_availability").select("weekday,start_time,end_time,is_online").eq("trainer_id", trainerId),
      supabase.from("trainer_schedule_settings").select("*").eq("trainer_id", trainerId).single(),
      supabase.from("trainer_holidays").select("starts_on,ends_on").eq("trainer_id", trainerId),
    ]);
    if (aErr || sErr || hErr) {
      setGenerating(false);
      showError("Σφάλμα ανάκτησης ρυθμίσεων/διαθεσιμότητας/αδειών: " + [aErr, sErr, hErr].filter(Boolean).map(errText).join(" • "));
      return;
    }
    const slotMin = Math.max(15, Number(settings?.slot_minutes || effectiveSlot || 60));
    const brkMin = Math.max(0, Number(settings?.break_minutes || effectiveBreak || 0));
    const step = Math.max(5, slotMin + brkMin);
    const availability = Array.isArray(avail) ? avail : [];
    const holidayList = Array.isArray(hols) ? hols : [];
    const start = new Date();
    const end = dateAddDays(start, horizonDays - 1);
    const startISO = dateISO(start);
    const endISO = dateISO(end);
    const { data: bookings, error: bErr } = await supabase
      .from("trainer_bookings")
      .select("date,start_time,end_time,status,break_before_min,break_after_min")
      .eq("trainer_id", trainerId)
      .gte("date", startISO)
      .lte("date", endISO)
      .in("status", ["pending", "accepted"]);
    if (bErr) {
      setGenerating(false);
      showError("Σφάλμα ανάκτησης κρατήσεων: " + errText(bErr));
      return;
    }
    const toMinutesLoc = (hhmm) => {
      const [h, m] = hhmm.split(":").map(Number);
      return h * 60 + m;
    };
    const minutesToTimeLoc = (mins) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };
    const conflict = (dateStr, sT, eT) => {
      const sMin = toMinutesLoc(sT);
      const eMin = toMinutesLoc(eT);
      return (bookings || [])
        .filter((b) => b.date === dateStr)
        .some((b) => {
          const bs = toMinutesLoc(b.start_time) - (Number(b.break_before_min) || 0);
          const be = toMinutesLoc(b.end_time) + (Number(b.break_after_min) || 0);
          return sMin < be && eMin > bs;
        });
    };
    const rows = [];
    for (let i = 0; i < horizonDays; i++) {
      const d = dateAddDays(start, i);
      const ds = dateISO(d);
      const wd = new Date(ds).getDay();
      const wk = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][wd];
      const inHoliday = holidayList.some((h) => ds >= h.starts_on && ds <= h.ends_on);
      if (inHoliday) continue;
      const todaysBlocks = availability.filter((a) => a.weekday === wk);
      if (!todaysBlocks.length) continue;
      for (const b of todaysBlocks) {
        let cur = toMinutesLoc(b.start_time);
        const endM = toMinutesLoc(b.end_time);
        while (cur + slotMin <= endM) {
          const s = minutesToTimeLoc(cur);
          const e = minutesToTimeLoc(cur + slotMin);
          if (!conflict(ds, s, e))
            rows.push({ trainer_id: trainerId, date: ds, start_time: s, end_time: e, is_online: !!b.is_online, status: "open" });
          cur += step;
        }
      }
    }
    if (rows.length === 0) {
      setGenerating(false);
      showSuccess("Δεν βρέθηκαν νέα slots για δημιουργία (ίσως είσαι σε άδεια ή όλα είναι κλεισμένα).");
      return;
    }
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase.from("trainer_open_slots").upsert(chunk, { onConflict: "trainer_id,date,start_time" });
      if (error) {
        setGenerating(false);
        showError("Σφάλμα δημιουργίας μελλοντικών slots: " + errText(error));
        return;
      }
    }
    setGenerating(false);
    showSuccess(`Δημιουργήθηκαν ανοικτά ραντεβού (${rows.length}) για τους επόμενους ${horizonDays} ημέρες.`);
  }

  /* ------------------------------- render ----------------------------- */

  return (
    <>
      {/* GLOBAL SIZE VARS + safe-area padding + halo CSS */}
      <style jsx global>{`
        :root {
          --side-w: 0px;
          --nav-h: 64px;
        }
        @media (min-width: 640px) {
          :root {
            --nav-h: 72px;
          }
        }
        @media (min-width: 1024px) {
          :root {
            --side-w: 280px;
            --nav-h: 0px;
          }
        }
        @media (min-width: 1280px) {
          :root {
            --side-w: 320px;
          }
        }
        .safe-bottom {
          padding-bottom: max(16px, env(safe-area-inset-bottom));
        }

        /* ===== Silvery circular halo (animated conic ring) ===== */
        @property --angle {
          syntax: "<angle>";
          inherits: false;
          initial-value: 0deg;
        }
        @keyframes halo-spin {
          to { --angle: 360deg; }
        }
        .halo {
          position: relative;
          isolation: isolate; /* keep halo under content */
        }
        .halo::before {
          content: "";
          position: absolute;
          inset: -3px;
          border-radius: inherit;
          padding: 3px; /* ring thickness */
          background:
            conic-gradient(from var(--angle),
              rgba(255,255,255,0.92) 0%,
              rgba(190,190,190,0.28) 18%,
              rgba(255,255,255,0.92) 36%,
              rgba(190,190,190,0.28) 54%,
              rgba(255,255,255,0.92) 72%,
              rgba(190,190,190,0.28) 90%,
              rgba(255,255,255,0.92) 100%);
          -webkit-mask:
            linear-gradient(#000 0 0) content-box,
            linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
                  mask-composite: exclude;
          animation: halo-spin 8s linear infinite;
          opacity: 0.85;
          z-index: -1;
          pointer-events: none;
        }
        .halo::after {
          content: "";
          position: absolute;
          inset: -12px;
          border-radius: inherit;
          background:
            radial-gradient(closest-side, rgba(255,255,255,0.18), rgba(255,255,255,0.06) 40%, transparent 70%);
          filter: blur(8px);
          z-index: -2;
          pointer-events: none;
        }
      `}</style>

      {/* Background behind EVERYTHING */}
      <div className="fixed inset-0 -z-50 bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <Suspense fallback={<div className="h-16" />}>
        <TrainerMenuLazy />
      </Suspense>

      <div className="relative min-h-screen overflow-x-hidden">
        {/* left padding only when side menu is visible; top padding on mobile for fixed top nav */}
        <div className="lg:pl-[calc(var(--side-w)+8px)] pl-0 lg:pt-0 pt-[var(--nav-h)] transition-[padding]">
          {/* add bottom padding for mobile bottom sheet space */}
          <main className="mx-auto max-w-screen-2xl 2xl:max-w-[1700px] w-full px-3 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 pb-[160px]">
            <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative">
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="space-y-2 min-w-0">
                  <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent break-words">
                    Το Πρόγραμμά μου
                  </h1>
                  <p className="text-sm sm:text-lg text-zinc-300 break-words">Διαχείριση διαθεσιμότητας και τιμών συνεδριών</p>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-400">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <span>Ζώνη ώρας: Ελλάδα (UTC+3)</span>
                  </div>
                </div>
              </div>
            </motion.header>

            {!profileLoaded && (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 animate-spin text-white" />
                  <span className="text-zinc-300">Φόρτωση προφίλ...</span>
                </div>
              </div>
            )}

            {/* Sign-in guard */}
            {!hasTrainer && profileLoaded && (
              <PremiumCard
                title="Απαιτείται σύνδεση"
                subtitle="Συνδέσου για να διαχειριστείς το πρόγραμμά σου"
                icon={<AlertTriangle className="h-6 w-6" />}
              >
                <PremiumButton>Σύνδεση</PremiumButton>
              </PremiumCard>
            )}

            {/* ======= CONTENT ======= */}
            {hasTrainer ? (
              <div className="space-y-6 sm:space-y-8">
                {/* Row 1: Availability + Pricing */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch">
                  {/* Availability */}
                  <LazySection>
                    <PremiumCard
                      className="min-h-[460px]"
                      title="Διαθεσιμότητα"
                      subtitle="Ορισμός ημερών και ωραρίου εργασίας"
                      icon={<Calendar className="h-6 w-6" />}
                      gradient
                      dirty={availabilityDirty}
                      action={
                        <PremiumButton
                          variant="outline"
                          onClick={() => generateOpenSlotsForFuture(profile.id)}
                          disabled={generating}
                          className="max-sm:hidden"
                        >
                          {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{" "}
                          {generating ? "Δημιουργία..." : "Δημιουργία Slots"}
                        </PremiumButton>
                      }
                    >
                      <div className="space-y-5">
                        {/* Days */}
                        <div className={["rounded-2xl border p-3", selectedDaysDirty ? "halo" : "border-white/10 bg-black/30"].join(" ")}>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                            {ALL_DAYS.map((d) => {
                              const active = selectedDays.has(d.key);
                              return (
                                <motion.button
                                  key={d.key}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() =>
                                    setSelectedDays((prev) => {
                                      const next = new Set(prev);
                                      next.has(d.key) ? next.delete(d.key) : next.add(d.key);
                                      return next;
                                    })
                                  }
                                  className={`w-full justify-center px-4 py-2 rounded-2xl text-sm font-semibold shadow-sm ring-1 transition ${
                                    active
                                      ? "bg-white text-black ring-white/30 shadow-white/20"
                                      : "bg-white/5 text-white/90 ring-white/10 hover:bg-white/10 hover:ring-white/20"
                                  }`}
                                >
                                  {d.label}
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Presets */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs sm:text-sm text-zinc-400 mr-1">Γρήγορη επιλογή:</span>
                          {[
                            { label: "Όλες", days: ALL_DAYS.map((d) => d.key) },
                            { label: "Καθημερινές", days: ["monday", "tuesday", "wednesday", "thursday", "friday"] },
                            { label: "Σαβ/Κυρ", days: ["saturday", "sunday"] },
                            { label: "Δευ/Τετ/Παρ", days: ["monday", "wednesday", "friday"] },
                            { label: "Τρι/Πεμ", days: ["tuesday", "thursday"] },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              onClick={() => setSelectedDays(new Set(preset.days))}
                              className="px-3 py-1 rounded-full text-xs sm:text-sm text-white/90 border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <PremiumInput
                            label="Ώρα έναρξης"
                            icon={<Clock className="h-4 w-4" />}
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            dirty={startTimeDirty}
                          />
                          <PremiumInput
                            label="Ώρα λήξης"
                            icon={<Clock className="h-4 w-4" />}
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            dirty={endTimeDirty}
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-zinc-800/30">
                          <div className="flex items-center gap-3">
                            {isOnline ? <Wifi className="h-5 w-5 text-white" /> : <WifiOff className="h-5 w-5 text-zinc-400" />}
                            <div>
                              <div className="font-semibold text-white">Διαθέσιμος Online</div>
                              <div className="text-sm text-zinc-300">Προσφέρεις συνεδρίες μέσω βιντεοκλήσης</div>
                            </div>
                          </div>
                          <div className="sm:self-end">
                            <PremiumSwitch checked={isOnline} onChange={setIsOnline} dirty={isOnlineDirty} />
                          </div>
                        </div>
                      </div>
                    </PremiumCard>
                  </LazySection>

                  {/* Pricing */}
                  <LazySection>
                    <PremiumCard
                      className="min-h-[460px]"
                      title="Διαχείριση Τιμών"
                      subtitle="Ορισμός τιμών και πληρωμών"
                      icon={<Euro className="h-6 w-6" />}
                      dirty={pricingDirty}
                    >
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <PremiumInput
                            label="Βασική τιμή (€)"
                            type="number"
                            min="0"
                            step="5"
                            value={pricing.basePrice}
                            onChange={(e) => setPricing((p) => ({ ...p, basePrice: Number(e.target.value) }))}
                            dirty={basePriceDirty}
                            className="max-sm:text-base"
                          />
                          <PremiumInput
                            label="Έκπτωση Online (%)"
                            type="number"
                            min="0"
                            max="50"
                            value={pricing.onlineDiscount}
                            onChange={(e) => setPricing((p) => ({ ...p, onlineDiscount: Number(e.target.value) }))}
                            dirty={onlineDiscountDirty}
                            className="max-sm:text-base"
                          />
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-zinc-800/20 p-4 sm:p-6">
                          <h4 className="font-semibold text-white mb-4">Μέθοδοι Πληρωμής</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                              { key: "cash", title: "Μετρητά", sub: "Cash payments", iconPath: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z", dirty: cashDirty },
                              { key: "card", title: "Κάρτα", sub: "Card payments", iconPath: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z", dirty: cardDirty },
                            ].map((m) => (
                              <div
                                key={m.key}
                                className={[
                                  "flex items-center justify-between p-4 rounded-xl bg-black/50 border",
                                  m.dirty ? "halo" : "border-white/10",
                                ].join(" ")}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={m.iconPath} />
                                    </svg>
                                  </div>
                                  <div>
                                    <div className="font-medium text-white">{m.title}</div>
                                    <div className="text-sm text-zinc-400">{m.sub}</div>
                                  </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={!!pricing.paymentMethods[m.key]}
                                    onChange={(e) =>
                                      setPricing((p) => ({
                                        ...p,
                                        paymentMethods: { ...p.paymentMethods, [m.key]: e.target.checked },
                                      }))
                                    }
                                    className="sr-only peer"
                                  />
                                  <div
                                    className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:bg-green-500 peer-checked:after:bg-white relative 
    after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white 
    after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"
                                  ></div>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </PremiumCard>
                  </LazySection>
                </div>

                {/* Row 2: Session Settings + Holidays */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch">
                  {/* Session Settings */}
                  <LazySection>
                    <PremiumCard
                      className="min-h-[380px]"
                      title="Ρυθμίσεις Συνεδριών"
                      subtitle="Διάρκεια και διαλείμματα"
                      icon={<Timer className="h-6 w-6" />}
                      dirty={scheduleDirty}
                    >
                      <div className="space-y-5">
                        <div className={slotDirty ? "halo rounded-2xl p-2 -m-2" : ""}>
                          <label className="text-sm font-medium text-white mb-3 block">Διάρκεια συνεδρίας</label>
                          <div className="grid grid-cols-2 gap-2">
                            {SLOT_PRESETS.map((mins) => (
                              <button
                                key={mins}
                                onClick={() => setSlotPreset(mins)}
                                className={`p-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                                  slotPreset === mins ? "bg-white text-black shadow-lg" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                                }`}
                              >
                                {mins} λεπτά
                              </button>
                            ))}
                          </div>
                          {slotPreset === "custom" && (
                            <div className="mt-3">
                              <PremiumInput
                                label="Λεπτά (15–240)"
                                type="number"
                                min="15"
                                max="240"
                                step="5"
                                value={slotCustom}
                                onChange={(e) => setSlotCustom(e.target.value)}
                                dirty={slotDirty}
                              />
                            </div>
                          )}
                        </div>

                        <div className={breakDirty ? "halo rounded-2xl p-2 -m-2" : ""}>
                          <label className="text-sm font-medium text-white mb-3 block">Διάλειμμα</label>
                          <div className="grid grid-cols-2 gap-2">
                            {BREAK_PRESETS.map((mins) => (
                              <button
                                key={mins}
                                onClick={() => setBreakPreset(mins)}
                                className={`p-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                                  breakPreset === mins ? "bg-zinc-200 text-black shadow-lg" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                                }`}
                              >
                                {mins} λεπτά
                              </button>
                            ))}
                          </div>
                          {breakPreset === "custom" && (
                            <div className="mt-3">
                              <PremiumInput
                                label="Λεπτά (0–60)"
                                type="number"
                                min="0"
                                max="60"
                                step="5"
                                value={breakCustom}
                                onChange={(e) => setBreakCustom(e.target.value)}
                                dirty={breakDirty}
                              />
                            </div>
                          )}
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-zinc-800/20 p-4">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-zinc-400">Διάρκεια:</span>
                              <span className="font-semibold text-white">{effectiveSlot} λεπτά</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-400">Διάλειμμα:</span>
                              <span className="font-semibold text-white">{effectiveBreak} λεπτά</span>
                            </div>
                            <div className="flex justify-between border-t border-white/10 pt-2">
                              <span className="text-zinc-400">Συνολικό:</span>
                              <span className="font-bold text-white">{effectiveSlot + effectiveBreak} λεπτά</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </PremiumCard>
                  </LazySection>

                  {/* Holidays */}
                  <LazySection>
                    <PremiumCard
                      className="min-h-[380px]"
                      title="Διαχείριση Αδειών"
                      subtitle="Προσθήκη / επεξεργασία αδειών και εορτών"
                      icon={<Sun className="h-6 w-6" />}
                      dirty={holidayDirty}
                    >
                      <div className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <PremiumInput
                            label="Από"
                            type="date"
                            value={holidayFrom}
                            onChange={(e) => setHolidayFrom(e.target.value)}
                            dirty={holidayFromDirty}
                          />
                          <PremiumInput
                            label="Έως"
                            type="date"
                            value={holidayTo}
                            onChange={(e) => setHolidayTo(e.target.value)}
                            dirty={holidayToDirty}
                          />
                        </div>
                        <PremiumInput
                          label={`Αιτιολογία ${editingHolidayId ? "(επεξεργασία)" : "(προαιρετικό)"}`}
                          value={holidayReason}
                          onChange={(e) => setHolidayReason(e.target.value)}
                          placeholder="π.χ. Διακοπές, Ασθένεια"
                          dirty={holidayReasonDirty}
                        />

                        {holidays.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-white">Υπάρχουσες άδειες</h4>
                            {holidays.slice(0, 6).map((h) => {
                              const isEditingThis = editingHolidayId === h.id;
                              return (
                                <div
                                  key={h.id}
                                  className={[
                                    "flex items-center justify-between rounded-xl border bg-black/50 p-3",
                                    isEditingThis ? "halo" : "border-white/10",
                                  ].join(" ")}
                                >
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium text-white">
                                      {new Date(h.starts_on).toLocaleDateString("el-GR")} -{" "}
                                      {new Date(h.ends_on).toLocaleDateString("el-GR")}
                                    </div>
                                    {h.reason && <div className="text-xs text-zinc-400 truncate">{h.reason}</div>}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      title="Επεξεργασία"
                                      onClick={() => {
                                        setEditingHolidayId(h.id);
                                        setHolidayFrom(h.starts_on?.slice(0, 10) || todayStr);
                                        setHolidayTo(h.ends_on?.slice(0, 10) || todayStr);
                                        setHolidayReason(h.reason || "");
                                      }}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                      title="Διαγραφή"
                                      onClick={async () => {
                                        setLoading(true);
                                        const { error } = await supabase.from("trainer_holidays").delete().eq("id", h.id);
                                        setLoading(false);
                                        if (error) return showError("Αποτυχία διαγραφής άδειας.");
                                        showSuccess("Η άδεια διαγράφηκε.", "Ολοκληρώθηκε");
                                        const { data } = await supabase
                                          .from("trainer_holidays")
                                          .select("*")
                                          .eq("trainer_id", profile.id)
                                          .order("starts_on", { ascending: false });
                                        setHolidays(data || []);
                                        if (editingHolidayId === h.id) {
                                          setEditingHolidayId(null);
                                          setHolidayFrom(todayStr);
                                          setHolidayTo(todayStr);
                                          setHolidayReason("");
                                        }
                                        await generateOpenSlotsForFuture(profile.id);
                                      }}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-500 hover:text-white transition-colors"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </PremiumCard>
                  </LazySection>
                </div>
              </div>
            ) : null}
          </main>
        </div>
      </div>

      {/* Floating global Save/Cancel bar (responsive for mobile) */}
      <AnimatePresence>
        {somethingDirty && (
          <motion.div
            initial={{ y: 96, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="fixed z-50 left-0 right-0 bottom-0 sm:bottom-4"
          >
            {/* mobile: full width bottom sheet; desktop: centered pill */}
            <div className="sm:hidden w-full bg-gradient-to-br from-zinc-900/95 to-black/95 border-t border-white/10 safe-bottom px-4 pt-3 pb-4 shadow-[0_-6px_24px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Sparkles className="h-5 w-5" />
                  <span className="text-sm">
                    Έχεις <span className="font-semibold text-white">{dirtyCount}</span> μη αποθηκευμένη{dirtyCount === 1 ? "" : "ς"} αλλαγ{dirtyCount === 1 ? "ή" : "ές"}.
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <PremiumButton variant="outline" size="xl" className="w-full py-3" onClick={handleCancelAll} disabled={savingAll}>
                  <X className="h-5 w-5" /> Ακύρωση
                </PremiumButton>
                <PremiumButton size="xl" className="w-full py-3" onClick={handleSaveAll} disabled={savingAll}>
                  {savingAll ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Αποθήκευση
                </PremiumButton>
              </div>
            </div>

            <div className="hidden sm:block">
              <div className="mx-auto w-[min(960px,92vw)]">
                <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-zinc-900/90 to-black/90 backdrop-blur-xl shadow-2xl p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 text-zinc-300">
                      <Sparkles className="h-5 w-5" />
                      <span className="text-sm">
                        Έχεις <span className="font-semibold text-white">{dirtyCount}</span> μη αποθηκευμένη{dirtyCount === 1 ? "" : "ς"} αλλαγ{dirtyCount === 1 ? "ή" : "ές"}.
                      </span>
                    </div>
                    <div className="flex-1" />
                    <div className="flex items-center gap-2">
                      <PremiumButton variant="outline" onClick={handleCancelAll} disabled={savingAll}>
                        <X className="h-4 w-4" /> Ακύρωση
                      </PremiumButton>
                      <PremiumButton onClick={handleSaveAll} disabled={savingAll}>
                        {savingAll ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Αποθήκευση
                      </PremiumButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast modal */}
      <AnimatePresence>
        {modal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setModal({ open: false, type: "success", title: "", message: "" })}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-md w-full mx-4 rounded-3xl border border-white/20 bg-gradient-to-b from-zinc-900 to-black p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                    modal.type === "success" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {modal.type === "success" ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">{modal.title}</h3>
                  <p className="text-sm text-zinc-300 mt-1">{modal.message}</p>
                </div>
                <button
                  onClick={() => setModal({ open: false, type: "success", title: "", message: "" })}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
