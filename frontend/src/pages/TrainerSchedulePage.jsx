"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import TrainerMenu from "../components/TrainerMenu";
import {
  CalendarDays,
  Clock,
  RefreshCw,
  Save,
  Wifi,
  WifiOff,
  ArrowRight,
  Pencil,
  Plus,
  CalendarRange,
  Trash2,
  Sun,
  CheckCircle2,
  AlertTriangle,
  X as CloseIcon,
  Sparkles, // manual generate button icon
} from "lucide-react";

/* --- ICONS (same mapping as Auth page) --- */
import {
  FaDumbbell,
  FaUsers,
  FaAppleAlt,
  FaLaptop,
  FaRunning,
  FaMusic,
  FaHeartbeat,
} from "react-icons/fa";
import {
  MdFitnessCenter,
  MdSelfImprovement,
  MdHealthAndSafety,
  MdPsychology,
} from "react-icons/md";
import {
  GiMuscleUp,
  GiSwordsPower,
  GiWeightLiftingUp,
  GiBoxingGlove,
} from "react-icons/gi";
import { TbYoga, TbStethoscope } from "react-icons/tb";

/* ---------------------------- constants ---------------------------- */

const ICON_BY_KEY = {
  dumbbell: FaDumbbell,
  users: FaUsers,
  pilates: MdSelfImprovement,
  yoga: TbYoga,
  apple: FaAppleAlt,
  laptop: FaLaptop,
  strength: GiWeightLiftingUp,
  calisthenics: GiMuscleUp,
  crossfit: MdFitnessCenter,
  boxing: GiBoxingGlove,
  martial: GiSwordsPower,
  dance: FaMusic,
  running: FaRunning,
  physio: TbStethoscope,
  rehab: MdHealthAndSafety,
  wellness: FaHeartbeat,
  psychology: MdPsychology,
};

const TRAINER_CATEGORIES = [
  { value: "personal_trainer", label: "Προσωπικός Εκπαιδευτής", iconKey: "dumbbell", specialties: ["Απώλεια λίπους","Μυϊκή ενδυνάμωση","Προπόνηση με βάρη","Σωματική μεταμόρφωση","Προετοιμασία αγώνων/διαγωνισμών","Προπόνηση αρχαρίων","Προπόνηση τρίτης ηλικίας","Προπόνηση εγκύων"] },
  { value: "group_fitness_instructor", label: "Εκπαιδευτής Ομαδικών Προγραμμάτων", iconKey: "users", specialties: ["HIIT υψηλής έντασης","Bootcamp","Λειτουργική προπόνηση (Functional)","TRX","Κυκλική προπόνηση (Circuit)","Αερόβια προπόνηση (Cardio)","Ομαδικά γυναικών"] },
  { value: "pilates_instructor", label: "Εκπαιδευτής Pilates", iconKey: "pilates", specialties: ["Mat Pilates","Reformer Pilates","Προγεννητικό & Μεταγεννητικό","Στάση σώματος / Ενδυνάμωση Core","Pilates για αποκατάσταση"] },
  { value: "yoga_instructor", label: "Εκπαιδευτής Yoga", iconKey: "yoga", specialties: ["Hatha Yoga","Vinyasa Flow","Power Yoga","Yin Yoga","Prenatal Yoga","Mindfulness & Αναπνοές"] },
  { value: "nutritionist", label: "Διατροφολόγος", iconKey: "apple", specialties: ["Απώλεια βάρους","Αύξηση μυϊκής μάζας","Vegan / Χορτοφαγική διατροφή","Διατροφική υποστήριξη αθλητών","Προγράμματα διατροφής με delivery","Εντερική υγεία & δυσανεξίες"] },
  { value: "online_coach", label: "Online Προπονητής", iconKey: "laptop", specialties: ["Απομακρυσμένο 1‑on‑1 coaching","Προγράμματα PDF / Video","Συνδυασμός Διατροφής + Προπόνησης","Ζωντανά μαθήματα μέσω Zoom","Coaching υπευθυνότητας (accountability)"] },
  { value: "strength_conditioning", label: "Προπονητής Δύναμης & Φυσικής Κατάστασης", iconKey: "strength", specialties: ["Ανάπτυξη αθλητών","Αθλητικές επιδόσεις","Ολυμπιακές άρσεις","Πλειομετρικές ασκήσεις","Ανθεκτικότητα σε τραυματισμούς"] },
  { value: "calisthenics", label: "Εκπαιδευτής Calisthenics", iconKey: "calisthenics", specialties: ["Στατική δύναμη","Δυναμικές δεξιότητες (Muscle‑up, Planche)","Ευκινησία & Έλεγχος","Street workout","Προπόνηση σε κρίκους"] },
  { value: "crossfit_coach", label: "Προπονητής CrossFit", iconKey: "crossfit", specialties: ["Καθημερινός προγραμματισμός (WODs)","Ολυμπιακές άρσεις","Προετοιμασία για αγώνες","Γυμναστικές δεξιότητες","Metcons"] },
  { value: "boxing_kickboxing", label: "Προπονητής Πυγμαχίας / Kickboxing", iconKey: "boxing", specialties: ["Cardio boxing","Sparring","Ασκήσεις με σάκο","Βελτίωση τεχνικής","Παιδιά / Αρχάριοι"] },
  { value: "martial_arts", label: "Εκπαιδευτής Πολεμικών Τεχνών", iconKey: "martial", specialties: ["Brazilian Jiu‑Jitsu (BJJ)","Muay Thai","Καράτε","Krav Maga","Αυτοάμυνα","Taekwondo","Προετοιμασία MMA"] },
  { value: "dance_fitness", label: "Εκπαιδευτής Χορευτικής Γυμναστικής", iconKey: "dance", specialties: ["Zumba","Latin dance fitness","Afrobeat / Hip hop cardio","Τόνωση γυναικών","Χορός για ηλικιωμένους"] },
  { value: "running_coach", label: "Προπονητής Τρεξίματος", iconKey: "running", specialties: ["Μαραθώνιος / Ημιμαραθώνιος","Προπόνηση sprint","Διόρθωση τεχνικής τρεξίματος","Προπόνηση αντοχής","Τρέξιμο για αρχάριους"] },
  { value: "physiotherapist", label: "Φυσικοθεραπευτής", iconKey: "physio", specialties: ["Αποκατάσταση τραυματισμών","Manual therapy","Κινησιοθεραπεία","Χρόνιοι πόνοι","Αθλητική αποκατάσταση"] },
  { value: "rehab_prevention", label: "Ειδικός Αποκατάστασης / Πρόληψης Τραυματισμών", iconKey: "rehab", specialties: ["Εργονομική ενδυνάμωση","Διόρθωση κινητικών προτύπων","Ισορροπία & σταθερότητα","Επανένταξη μετά από χειρουργείο"] },
  { value: "wellness_life_coach", label: "Προπονητής Ευεξίας & Ζωής", iconKey: "wellness", specialties: ["Διαχείριση άγχους","Coaching συνηθειών & χρόνου","Ψυχική ανθεκτικότητα","Αποκατάσταση από burnout","Ολιστικός καθορισμός στόχων"] },
  { value: "performance_psych", label: "Προπονητής Απόδοσης / Αθλητικός Ψυχολόγος", iconKey: "psychology", specialties: ["Εκπαίδευση συγκέντρωσης","Ψυχολογία ημέρας αγώνα","Τεχνικές οπτικοποίησης","Αγωνιστικό mindset","Κατάσταση ροής (flow state) coaching"] },
];

const ALL_DAYS = [
  { key: "monday", label: "Δευ" },
  { key: "tuesday", label: "Τρι" },
  { key: "wednesday", label: "Τετ" },
  { key: "thursday", label: "Πεμ" },
  { key: "friday", label: "Παρ" },
];

const SLOT_PRESETS = [30, 45, 60, 90];
const BREAK_PRESETS = [0, 5, 10, 15, 30];

// Default generation horizon (days)
const GENERATION_HORIZON_DAYS = 180;

/* -------------------------- helper UI bits ------------------------- */

function Card({ title, subtitle, icon, action, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/60 to-black/60 p-4 ${className}`}>
      {(title || subtitle || icon || action) && (
        <div className="mb-3 flex items-center gap-2">
          {icon && <div className="text-gray-300">{icon}</div>}
          <div className="flex-1">
            {title && <h3 className="text-base font-semibold">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs text-gray-400">{label}</span>}
      {children}
    </label>
  );
}

function PrimaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-white text-black px-4 py-2 font-medium hover:bg-white/90 active:bg-white/80 transition disabled:opacity-50 disabled:pointer-events-none"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-black px-4 py-2 text-white/90 hover:border-white/30 transition disabled:opacity-50 disabled:pointer-events-none"
    >
      {children}
    </button>
  );
}

function IconButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-black/60 px-2 py-2 text-white/90 hover:border-white/30 transition disabled:opacity-50 disabled:pointer-events-none"
    >
      {children}
    </button>
  );
}

function Switch({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${checked ? "bg-white" : "bg-white/15"}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-black transition ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

/* ------------------------------ Modal ------------------------------ */

const Modal = ({ open, type = "success", title, message, onClose }) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[99] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/80 to-black/80 p-5 text-white shadow-2xl">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 rounded-lg p-2 ${type === "success" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                  {type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold">
                    {title || (type === "success" ? "Η ενέργεια ολοκληρώθηκε" : "Κάτι πήγε στραβά")}
                  </h4>
                  {message && <p className="mt-1 text-sm text-gray-300">{message}</p>}
                </div>
                <IconButton onClick={onClose} aria-label="Κλείσιμο">
                  <CloseIcon className="h-4 w-4" />
                </IconButton>
              </div>
              <div className="mt-4 flex justify-end">
                <PrimaryButton onClick={onClose}>OK</PrimaryButton>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

/* --------------------------- main component ------------------------ */

export default function TrainerSchedulePage() {
  const { profile, profileLoaded, refreshProfile } = useAuth();

  const [loading, setLoading] = useState(false);

  // modal state
  const [modal, setModal] = useState({ open: false, type: "success", title: "", message: "" });
  const showSuccess = useCallback((msg, title = "Η ενέργεια ολοκληρώθηκε") => {
    setModal({ open: true, type: "success", title, message: msg });
  }, []);
  const showError = useCallback((msg, title = "Σφάλμα") => {
    setModal({ open: true, type: "error", title, message: msg });
  }, []);

  // category / specialty (enum from TRAINER_CATEGORIES)
  const [specialty, setSpecialty] = useState("");
  const [editingCategory, setEditingCategory] = useState(false);
  const [draftCategory, setDraftCategory] = useState("");

  // specialities (array) with edit mode
  const [specialities, setSpecialities] = useState([]); // array<string>
  const [editSpecs, setEditSpecs] = useState(false);

  // availability builder
  const [selectedDays, setSelectedDays] = useState(() => new Set(ALL_DAYS.map(d => d.key)));
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("21:00");
  const [isOnline, setIsOnline] = useState(false);

  // schedule settings: slot & break
  const [slotPreset, setSlotPreset] = useState(60);
  const [slotCustom, setSlotCustom] = useState(60);
  const [breakPreset, setBreakPreset] = useState(0);
  const [breakCustom, setBreakCustom] = useState(0);

  // holidays
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [holidayFrom, setHolidayFrom] = useState(todayStr);
  const [holidayTo, setHolidayTo] = useState(todayStr);
  const [holidayReason, setHolidayReason] = useState("");
  const [holidays, setHolidays] = useState([]);

  // manual generator loading
  const [generating, setGenerating] = useState(false);

  const hasTrainer = Boolean(profile?.id);
  const effectiveSlot = slotPreset === "custom" ? Number(slotCustom || 0) : Number(slotPreset || 0);
  const effectiveBreak = breakPreset === "custom" ? Number(breakCustom || 0) : Number(breakPreset || 0);

  const selectedCategory = useMemo(
    () => TRAINER_CATEGORIES.find((c) => c.value === specialty) || null,
    [specialty]
  );
  const CategoryIcon = selectedCategory?.iconKey ? ICON_BY_KEY[selectedCategory.iconKey] : null;

  /* ------------------------ effects / data load ------------------------ */
  useEffect(() => {
    if (!profileLoaded || !profile?.id) return;

    // preload category + specialities
    const cat = profile.specialty || "";
    setSpecialty(cat);
    setDraftCategory(cat);

    const initialSpecs =
      (Array.isArray(profile.specialities) && profile.specialities) ||
      (Array.isArray(profile.roles) && profile.roles) ||
      [];
    setSpecialities(initialSpecs);

    // infer online flag from profile if present (optional)
    if (typeof profile.is_online === "boolean") setIsOnline(!!profile.is_online);

    (async () => {
      const { data: settings } = await supabase
        .from("trainer_schedule_settings")
        .select("*")
        .eq("trainer_id", profile.id)
        .single();

      if (settings) {
        const s = Number(settings.slot_minutes || 60);
        const b = Number(settings.break_minutes || 0);

        if ([30, 45, 60, 90].includes(s)) {
          setSlotPreset(s);
        } else {
          setSlotPreset("custom");
          setSlotCustom(s);
        }

        if ([0, 5, 10, 15, 30].includes(b)) {
          setBreakPreset(b);
        } else {
          setBreakPreset("custom");
          setBreakCustom(b);
        }
      }

      const { data: holData, error: holErr } = await supabase
        .from("trainer_holidays")
        .select("*")
        .eq("trainer_id", profile.id)
        .order("starts_on", { ascending: false });

      if (holErr) {
        setHolidays([]);
        showError("Σφάλμα ανάκτησης αδειών.");
      } else {
        setHolidays(holData || []);
      }
    })();
  }, [profileLoaded, profile?.id, showError]);

  /* ---------------------------- fetch helpers -------------------------- */

  async function fetchScheduleSettings(trainerId) {
    const { data } = await supabase
      .from("trainer_schedule_settings")
      .select("*")
      .eq("trainer_id", trainerId)
      .single();

    if (!data) return;

    const s = Number(data.slot_minutes || 60);
    const b = Number(data.break_minutes || 0);

    if (SLOT_PRESETS.includes(s)) {
      setSlotPreset(s);
    } else {
      setSlotPreset("custom");
      setSlotCustom(s);
    }

    if (BREAK_PRESETS.includes(b)) {
      setBreakPreset(b);
    } else {
      setBreakPreset("custom");
      setBreakCustom(b);
    }
  }

  async function fetchHolidays(trainerId) {
    const { data, error } = await supabase
      .from("trainer_holidays")
      .select("*")
      .eq("trainer_id", trainerId)
      .order("starts_on", { ascending: false });

    if (error) {
      setHolidays([]);
      showError("Σφάλμα ανάκτησης αδειών.");
      return;
    }
    setHolidays(data || []);
  }

  /* --------------------------- time helpers ---------------------------- */
  const toMinutes = useCallback((hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  }, []);
  const minutesToTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };
  const dateAddDays = (d, n) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };
  const dateISO = (d) => new Date(d).toISOString().slice(0, 10);
  const weekdayKey = (d) => {
    const wd = new Date(d).getDay(); // 0..6
    return ({ 1: "monday", 2: "tuesday", 3: "wednesday", 4: "thursday", 5: "friday" }[wd]) || null;
    // weekends map to null
  };

  const isHoliday = (dateStr) =>
    holidays?.some((h) => dateStr >= h.starts_on && dateStr <= h.ends_on);

  // stringify any Supabase error shape (prevents "undefined")
  const errText = (e) =>
    e?.message || e?.details || e?.hint || (typeof e === "string" ? e : JSON.stringify(e || {}));

  /* --------- Auto‑fill future open slots (materialization) -------- */

  /**
   * Generate discrete "open" slots for the next `horizonDays`.
   * Reads:
   *  - trainer_availability (weekly)
   *  - trainer_schedule_settings (slot/break)
   *  - trainer_holidays (skip ranges)
   *  - trainer_bookings (skip conflicts: pending/accepted)
   * Writes:
   *  - trainer_open_slots (upsert, status='open')
   *
   * Requires DB constraint for idempotency:
   *   CREATE UNIQUE INDEX IF NOT EXISTS idx_open_slots_unique
   *   ON trainer_open_slots(trainer_id, date, start_time);
   */
  async function generateOpenSlotsForFuture(trainerId, horizonDays = GENERATION_HORIZON_DAYS) {
    setGenerating(true);

    // --- Preflight: table/RLS availability for trainer_open_slots
    {
      const { error: tableErr } = await supabase
        .from("trainer_open_slots")
        .select("trainer_id", { count: "exact", head: true })
        .limit(1);
      if (tableErr) {
        setGenerating(false);
        showError(
          "Ο πίνακας 'trainer_open_slots' δεν είναι διαθέσιμος ή δεν έχεις δικαιώματα.\n" +
            errText(tableErr)
        );
        return;
      }
    }

    // 1) Load latest availability, settings, holidays
    const [
      { data: avail, error: aErr },
      { data: settings, error: sErr },
      { data: hols, error: hErr },
    ] = await Promise.all([
      supabase
        .from("trainer_availability")
        .select("weekday,start_time,end_time,is_online")
        .eq("trainer_id", trainerId),
      supabase
        .from("trainer_schedule_settings")
        .select("*")
        .eq("trainer_id", trainerId)
        .single(),
      supabase
        .from("trainer_holidays")
        .select("starts_on,ends_on")
        .eq("trainer_id", trainerId),
    ]);

    if (aErr || sErr || hErr) {
      setGenerating(false);
      showError(
        "Σφάλμα ανάκτησης ρυθμίσεων/διαθεσιμότητας/αδειών: " +
          [aErr, sErr, hErr].filter(Boolean).map(errText).join(" • ")
      );
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

    // 2) Conflicting bookings across window
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

    const conflict = (dateStr, sT, eT) => {
      const sMin = toMinutes(sT);
      const eMin = toMinutes(eT);
      return (bookings || [])
        .filter((b) => b.date === dateStr)
        .some((b) => {
          const bs = toMinutes(b.start_time) - (Number(b.break_before_min) || 0);
          const be = toMinutes(b.end_time) + (Number(b.break_after_min) || 0);
          return sMin < be && eMin > bs;
        });
    };

    // 3) Build upsert rows
    const rows = [];
    for (let i = 0; i < horizonDays; i++) {
      const d = dateAddDays(start, i);
      const ds = dateISO(d);

      const wk = weekdayKey(ds);
      if (!wk) continue; // skip weekends

      const inHoliday = holidayList.some((h) => ds >= h.starts_on && ds <= h.ends_on);
      if (inHoliday) continue;

      const todaysBlocks = availability.filter((a) => a.weekday === wk);
      if (!todaysBlocks.length) continue;

      for (const b of todaysBlocks) {
        let cur = toMinutes(b.start_time);
        const endM = toMinutes(b.end_time);
        while (cur + slotMin <= endM) {
          const s = minutesToTime(cur);
          const e = minutesToTime(cur + slotMin);
          if (!conflict(ds, s, e)) {
            rows.push({
              trainer_id: trainerId,
              date: ds,
              start_time: s,
              end_time: e,
              is_online: !!b.is_online,
              status: "open",
            });
          }
          cur += step;
        }
      }
    }

    if (rows.length === 0) {
      setGenerating(false);
      showSuccess("Δεν βρέθηκαν νέα slots για δημιουργία (ίσως είσαι σε άδεια ή όλα είναι κλεισμένα).");
      return;
    }

    // 4) Upsert in chunks
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase
        .from("trainer_open_slots")
        .upsert(chunk, { onConflict: "trainer_id,date,start_time" });
      if (error) {
        setGenerating(false);
        showError("Σφάλμα δημιουργίας μελλοντικών slots: " + errText(error));
        return;
      }
    }

    setGenerating(false);
    showSuccess(`Δημιουργήθηκαν ανοικτά ραντεβού (${rows.length}) για τους επόμενους ${horizonDays} ημέρες.`);
  }

  /* ------------------------------- actions ----------------------------- */

  const toggleDay = useCallback((dayKey) => {
    setSelectedDays(prev => {
      const next = new Set(prev);
      next.has(dayKey) ? next.delete(dayKey) : next.add(dayKey);
      return next;
    });
  }, []);

  const selectPreset = useCallback((keys) => {
    setSelectedDays(new Set(keys));
  }, []);

  const validTimeRange = useMemo(() => {
    const toMin = (hhmm) => {
      const [h, m] = hhmm.split(":").map(Number);
      return h * 60 + m;
    };
    return toMin(endTime) > toMin(startTime);
  }, [startTime, endTime]);

  async function handleSaveAvailability() {
    if (!hasTrainer) return showError("Απαιτείται σύνδεση για αποθήκευση προγράμματος.");
    if (selectedDays.size === 0) return showError("Επίλεξε τουλάχιστον μία ημέρα.");
    if (!validTimeRange) return showError("Η ώρα λήξης πρέπει να είναι μετά την ώρα έναρξης.");

    setLoading(true);

    const trainerId = profile.id;

    const { error: delErr } = await supabase.from("trainer_availability").delete().eq("trainer_id", trainerId);
    if (delErr) {
      setLoading(false);
      return showError("Αποτυχία καθαρισμού παλιών εγγραφών.");
    }

    const rows = Array.from(selectedDays).map(day => ({
      trainer_id: trainerId,
      weekday: day,
      start_time: startTime,
      end_time: endTime,
      is_online: isOnline,
    }));

    const { error: insErr } = await supabase.from("trainer_availability").insert(rows);
    setLoading(false);

    if (insErr) return showError("Αποτυχία αποθήκευσης προγράμματος.");

    showSuccess("Το πρόγραμμα αποθηκεύτηκε.", "Επιτυχής αποθήκευση");

    // mirror online flag to profile (optional)
    await supabase.from("profiles").update({ is_online: isOnline }).eq("id", trainerId);

    // auto-create future open slots
    await generateOpenSlotsForFuture(trainerId);
  }

  function startEditCategory() {
    setDraftCategory(specialty || "");
    setEditingCategory(true);
  }

  async function saveCategory() {
    if (!hasTrainer) return showError("Απαιτείται σύνδεση για αποθήκευση ειδίκευσης.");

    setLoading(true);

    const { error } = await supabase.from("profiles").update({ specialty: draftCategory }).eq("id", profile.id);

    setLoading(false);

    if (error) return showError("Αποτυχία ενημέρωσης ειδίκευσης.");

    setSpecialty(draftCategory);
    setEditingCategory(false);
    showSuccess("Η ειδίκευση ενημερώθηκε.", "Επιτυχής ενημέρωση");
    void refreshProfile?.();
  }

  function cancelCategory() {
    setDraftCategory(specialty || "");
    setEditingCategory(false);
  }

  function toggleSpeciality(sp) {
    setSpecialities(prev => (prev.includes(sp) ? prev.filter(x => x !== sp) : [...prev, sp]));
  }

  async function handleSaveSpecialities() {
    if (!hasTrainer) return showError("Απαιτείται σύνδεση για αποθήκευση ειδικοτήτων.");

    setLoading(true);

    let ok = false;
    const { error: e1 } = await supabase.from("profiles").update({ specialities }).eq("id", profile.id);
    if (!e1) ok = true;
    if (e1) {
      const { error: e2 } = await supabase.from("profiles").update({ roles: specialities }).eq("id", profile.id);
      if (!e2) ok = true;
      if (e2) {
        setLoading(false);
        return showError("Αποτυχία ενημέρωσης ειδικοτήτων.");
      }
    }

    setLoading(false);
    setEditSpecs(false);
    if (ok) {
      showSuccess("Οι ειδικότητες αποθηκεύτηκαν.", "Επιτυχής αποθήκευση");
      void refreshProfile?.();
    }
  }

  async function handleSaveScheduleSettings() {
    if (!hasTrainer) return showError("Απαιτείται σύνδεση για αποθήκευση ρυθμίσεων.");

    const slot = Number(effectiveSlot);
    const brk = Number(effectiveBreak);

    if (!slot || slot < 15 || slot > 240) return showError("Το διάστημα συνεδρίας πρέπει να είναι 15–240 λεπτά.");
    if (brk < 0 || brk > 60) return showError("Το διάλειμμα πρέπει να είναι 0–60 λεπτά.");

    setLoading(true);

    const { error } = await supabase
      .from("trainer_schedule_settings")
      .upsert(
        {
          trainer_id: profile.id,
          slot_minutes: slot,
          break_minutes: brk,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "trainer_id" }
      );

    setLoading(false);

    if (error) return showError("Αποτυχία αποθήκευσης ρυθμίσεων.");
    showSuccess("Οι ρυθμίσεις συνεδριών αποθηκεύτηκαν.", "Επιτυχής αποθήκευση");

    // regenerate future open slots with new cadence
    await generateOpenSlotsForFuture(profile.id);
  }

  async function handleAddHoliday() {
    if (!hasTrainer) return showError("Απαιτείται σύνδεση για προσθήκη άδειας.");
    if (!holidayFrom || !holidayTo) return showError("Συμπλήρωσε ημερομηνίες.");
    if (new Date(holidayTo) < new Date(holidayFrom)) return showError("Η ημερομηνία λήξης πρέπει να είναι μετά την έναρξη.");

    setLoading(true);

    const { error } = await supabase.from("trainer_holidays").insert({
      trainer_id: profile.id,
      starts_on: holidayFrom,
      ends_on: holidayTo,
      reason: holidayReason || null,
    });

    setLoading(false);

    if (error) return showError("Αποτυχία προσθήκης άδειας.");

    showSuccess("Η άδεια προστέθηκε.", "Επιτυχής προσθήκη");
    setHolidayFrom(todayStr);
    setHolidayTo(todayStr);
    setHolidayReason("");
    await fetchHolidays(profile.id);

    // refresh open slots after holiday change
    await generateOpenSlotsForFuture(profile.id);
  }

  async function handleDeleteHoliday(id) {
    if (!hasTrainer) return;

    setLoading(true);
    const { error } = await supabase.from("trainer_holidays").delete().eq("id", id);
    setLoading(false);

    if (error) return showError("Αποτυχία διαγραφής άδειας.");

    showSuccess("Η άδεια διαγράφηκε.", "Ολοκληρώθηκε");
    await fetchHolidays(profile.id);

    // refresh open slots after holiday change
    await generateOpenSlotsForFuture(profile.id);
  }

  /* ------------------------------- render ----------------------------- */

  return (
    <>
      <TrainerMenu />

      <div className="min-h-screen bg-black text-white">
        <div
          className="pointer-events-none fixed inset-0 -z-10"
          aria-hidden="true"
          style={{
            backgroundImage: "radial-gradient(transparent 1px, rgba(255,255,255,0.03) 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="pl-[calc(var(--side-w)+4px)] lg:pt-0 pt-16 transition-[padding]">
          <main className="mx-auto max-w-6xl p-4 md:p-6 space-y-8">
            {/* Header */}
            <motion.header
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
            >
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Το Πρόγραμμά μου</h1>
                <p className="text-sm text-gray-400">Ζώνη ώρας: Ελλάδα (UTC+3) • Δευ–Παρ</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <CalendarDays className="h-4 w-4" />
                <span>Διαχείριση Διαθεσιμότητας & Αδειών</span>
              </div>
            </motion.header>

            {/* Auth / profile guards */}
            {!profileLoaded && <p className="p-4 text-sm text-gray-400">Φόρτωση…</p>}
            {profileLoaded && !hasTrainer && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm">
                Απαιτείται σύνδεση για να προβάλλεις και να αποθηκεύσεις το πρόγραμμά σου.
              </div>
            )}

            {/* Main layout when trainer is present */}
            {hasTrainer && (
              <div className="grid gap-4 md:grid-cols-3">
                {/* Availability Builder */}
                <Card
                  title="Διαθεσιμότητα"
                  subtitle="Επίλεξε ημέρες και ώρες"
                  icon={<CalendarDays className="h-4 w-4" />}
                  className="md:col-span-2"
                  action={
                    <SecondaryButton
                      onClick={() => generateOpenSlotsForFuture(profile.id)}
                      disabled={generating}
                      title="Δημιουργία μελλοντικών slots"
                    >
                      {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {generating ? "Δημιουργία…" : "Δημιουργία μελλοντικών slots"}
                    </SecondaryButton>
                  }
                >
                  {/* Day chips */}
                  <div className="flex flex-wrap gap-2">
                    {ALL_DAYS.map((d) => {
                      const active = selectedDays.has(d.key);
                      return (
                        <button
                          key={d.key}
                          onClick={() => toggleDay(d.key)}
                          className={`rounded-full px-3 py-1.5 text-sm border transition
                            ${active ? "bg-white text-black border-white" : "bg-black text-gray-300 border-white/15 hover:border-white/30"}`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Presets */}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <button
                      className="rounded-full border border-white/15 bg-black px-3 py-1 text-gray-300 hover:border-white/30"
                      onClick={() => selectPreset(ALL_DAYS.map(d => d.key))}
                    >
                      Mon–Fri
                    </button>
                    <button
                      className="rounded-full border border-white/15 bg-black px-3 py-1 text-gray-300 hover:border-white/30"
                      onClick={() => selectPreset([])}
                    >
                      Καμία
                    </button>
                  </div>

                  {/* Time range + online */}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <Field label="Από">
                      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black px-3 py-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="bg-transparent outline-none w-full"
                        />
                      </div>
                    </Field>
                    <Field label="Έως">
                      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black px-3 py-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="bg-transparent outline-none w-full"
                        />
                      </div>
                    </Field>
                    <Field label="Online μαθήματα">
                      <div className="flex items-center gap-2">
                        <Switch checked={isOnline} onChange={setIsOnline} />
                        {isOnline ? (
                          <span className="inline-flex items-center gap-1 text-green-400 text-xs">
                            <Wifi className="h-3 w-3" /> Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray-400 text-xs">
                            <WifiOff className="h-3 w-3" /> Offline
                          </span>
                        )}
                      </div>
                    </Field>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <PrimaryButton onClick={handleSaveAvailability} disabled={loading}>
                      {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {loading ? "Αποθήκευση…" : "Αποθήκευση Προγράμματος"}
                    </PrimaryButton>
                  </div>
                </Card>

                {/* Right Column: Category (with pencil), Specialities (icons), Settings, Holidays */}
                <div className="space-y-4">
                  {/* Category / Specialty (edit via pencil) */}
                  <Card
                    title="Κατηγορία / Ειδίκευση"
                    icon={<ArrowRight className="h-4 w-4" />}
                    action={
                      !editingCategory ? (
                        <IconButton onClick={startEditCategory} title="Αλλαγή κατηγορίας">
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                      ) : null
                    }
                  >
                    {!editingCategory ? (
                      selectedCategory ? (
                        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black px-3 py-2">
                          {CategoryIcon && <CategoryIcon className="h-5 w-5 text-white/80" />}
                          <div className="text-sm text-white/90">{selectedCategory.label}</div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">Δεν έχει οριστεί κατηγορία.</p>
                      )
                    ) : (
                      <>
                        <Field label="Επίλεξε κατηγορία">
                          <div className="flex items-center gap-2">
                            <select
                              value={draftCategory}
                              onChange={(e) => setDraftCategory(e.target.value)}
                              className="flex-1 rounded-lg border border-white/10 bg-black px-3 py-2"
                            >
                              <option value="">— Επιλογή —</option>
                              {TRAINER_CATEGORIES.map((c) => (
                                <option key={c.value} value={c.value}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </Field>
                        <div className="mt-3 flex gap-2">
                          <PrimaryButton onClick={saveCategory} disabled={loading || !draftCategory}>
                            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {loading ? "Αποθήκευση…" : "Αποθήκευση"}
                          </PrimaryButton>
                          <SecondaryButton onClick={cancelCategory}>Άκυρο</SecondaryButton>
                        </div>
                      </>
                    )}
                  </Card>

                  {/* Specialities with icons */}
                  <Card
                    title="Ειδικότητες"
                    subtitle={selectedCategory ? `(${selectedCategory.label})` : "Επίλεξε κατηγορία για λίστα"}
                    icon={<ArrowRight className="h-4 w-4" />}
                    action={
                      selectedCategory && !editSpecs ? (
                        <IconButton onClick={() => setEditSpecs(true)} title="Επεξεργασία">
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                      ) : null
                    }
                  >
                    {!selectedCategory ? (
                      <p className="text-sm text-gray-400">Δεν έχεις επιλέξει κατηγορία.</p>
                    ) : !editSpecs ? (
                      specialities?.length ? (
                        <div className="grid grid-cols-1 gap-2">
                          {specialities.map((sp) => (
                            <div
                              key={sp}
                              className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/60 px-3 py-2"
                            >
                              {CategoryIcon && <CategoryIcon className="h-4 w-4 text-white/70" />}
                              <span className="text-sm">{sp}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">— Καμία ειδικότητα —</p>
                      )
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                          {selectedCategory.specialties.map((sp) => (
                            <label
                              key={sp}
                              className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm hover:border-white/30"
                            >
                              <input
                                type="checkbox"
                                className="accent-white/80"
                                checked={specialities.includes(sp)}
                                onChange={() => toggleSpeciality(sp)}
                              />
                              {CategoryIcon && <CategoryIcon className="h-4 w-4 text-white/70" />}
                              <span>{sp}</span>
                            </label>
                          ))}
                        </div>
                        <div className="mt-3 flex gap-2">
                          <PrimaryButton onClick={handleSaveSpecialities} disabled={loading}>
                            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {loading ? "Αποθήκευση…" : "Αποθήκευση Ειδικοτήτων"}
                          </PrimaryButton>
                          <SecondaryButton onClick={() => setEditSpecs(false)}>Άκυρο</SecondaryButton>
                        </div>
                      </>
                    )}
                  </Card>

                  {/* Appointment Settings */}
                  <Card title="Ρυθμίσεις Ραντεβού" subtitle="Διάρκεια συνεδρίας & διάλειμμα" icon={<Clock className="h-4 w-4" />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Διάρκεια συνεδρίας (λεπτά)">
                        <div className="flex gap-2">
                          <select
                            value={slotPreset}
                            onChange={(e) => setSlotPreset(e.target.value === "custom" ? "custom" : Number(e.target.value))}
                            className="rounded-lg border border-white/10 bg-black px-3 py-2"
                          >
                            {SLOT_PRESETS.map(v => <option key={v} value={v}>{v}</option>)}
                            <option value="custom">Custom</option>
                          </select>
                          {slotPreset === "custom" && (
                            <input
                              type="number"
                              min={15}
                              max={240}
                              step={5}
                              value={slotCustom}
                              onChange={(e) => setSlotCustom(e.target.value)}
                              className="w-24 rounded-lg border border-white/10 bg-black px-3 py-2"
                            />
                          )}
                        </div>
                      </Field>

                      <Field label="Διάλειμμα μεταξύ (λεπτά)">
                        <div className="flex gap-2">
                          <select
                            value={breakPreset}
                            onChange={(e) => setBreakPreset(e.target.value === "custom" ? "custom" : Number(e.target.value))}
                            className="rounded-lg border border-white/10 bg-black px-3 py-2"
                          >
                            {BREAK_PRESETS.map(v => <option key={v} value={v}>{v}</option>)}
                            <option value="custom">Custom</option>
                          </select>
                          {breakPreset === "custom" && (
                            <input
                              type="number"
                              min={0}
                              max={60}
                              step={5}
                              value={breakCustom}
                              onChange={(e) => setBreakCustom(e.target.value)}
                              className="w-24 rounded-lg border border-white/10 bg-black px-3 py-2"
                            />
                          )}
                        </div>
                      </Field>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <PrimaryButton onClick={handleSaveScheduleSettings} disabled={loading}>
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {loading ? "Αποθήκευση…" : "Αποθήκευση Ρυθμίσεων"}
                      </PrimaryButton>

                      {/* Manual regenerate */}
                      <SecondaryButton onClick={() => generateOpenSlotsForFuture(profile.id)} disabled={generating}>
                        {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {generating ? "Δημιουργία…" : "Δημιουργία μελλοντικών slots"}
                      </SecondaryButton>
                    </div>
                  </Card>

                  {/* Holidays / Time-off */}
                  <Card title="Άδειες / Διακοπές" subtitle="Όταν δεν δέχεσαι ραντεβού" icon={<Sun className="h-4 w-4" />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Από">
                        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black px-3 py-2">
                          <CalendarRange className="h-4 w-4 text-gray-400" />
                          <input
                            type="date"
                            value={holidayFrom}
                            onChange={(e) => setHolidayFrom(e.target.value)}
                            className="bg-transparent outline-none w-full"
                          />
                        </div>
                      </Field>
                      <Field label="Έως">
                        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black px-3 py-2">
                          <CalendarRange className="h-4 w-4 text-gray-400" />
                          <input
                            type="date"
                            value={holidayTo}
                            onChange={(e) => setHolidayTo(e.target.value)}
                            className="bg-transparent outline-none w-full"
                          />
                        </div>
                      </Field>
                    </div>
                    <Field label="Λόγος (προαιρετικό)">
                      <input
                        type="text"
                        value={holidayReason}
                        onChange={(e) => setHolidayReason(e.target.value)}
                        placeholder="π.χ. Διακοπές, σεμινάριο, αποκατάσταση…"
                        className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 placeholder-gray-500"
                      />
                    </Field>

                    <div className="mt-3 flex flex-wrap gap-3">
                      <PrimaryButton onClick={handleAddHoliday} disabled={loading}>
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        {loading ? "Προσθήκη…" : "Προσθήκη Άδειας"}
                      </PrimaryButton>
                      <SecondaryButton
                        onClick={() => {
                          const d = new Date();
                          const nextWeek = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)
                            .toISOString().slice(0,10);
                          setHolidayFrom(todayStr);
                          setHolidayTo(nextWeek);
                        }}
                      >
                        Γρήγορα: 7 μέρες από σήμερα
                      </SecondaryButton>
                    </div>

                    <div className="mt-4">
                      <h4 className="text-sm text-gray-300 mb-2">Καταχωρημένες άδειες</h4>
                      {holidays.length === 0 ? (
                        <p className="text-sm text-gray-500">— Καμία άδεια —</p>
                      ) : (
                        <ul className="space-y-2">
                          {holidays.map(h => (
                            <li key={h.id} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
                              <div className="text-sm text-gray-200">
                                {h.starts_on} — {h.ends_on}
                                {h.reason ? <span className="text-gray-400"> • {h.reason}</span> : null}
                              </div>
                              <button
                                className="text-red-300 hover:text-red-200"
                                title="Διαγραφή"
                                onClick={() => handleDeleteHoliday(h.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* One modal instance for all actions */}
      <Modal
        open={modal.open}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
      />
    </>
  );
}
