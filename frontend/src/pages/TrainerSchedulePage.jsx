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
  Pencil,
  Plus,
  Trash2,
  Sun,
  CheckCircle2,
  AlertTriangle,
  DoorClosedIcon as CloseIcon,
  Sparkles,
  Euro,
  Target,
  Calendar,
  Timer,
  ListChecks,
} from "lucide-react";
import { FaDumbbell, FaUsers, FaAppleAlt, FaLaptop, FaRunning, FaMusic } from "react-icons/fa";
import { MdFitnessCenter, MdSelfImprovement } from "react-icons/md";
import { GiMuscleUp, GiSwordsPower, GiWeightLiftingUp, GiBoxingGlove } from "react-icons/gi";
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
};

const TRAINER_CATEGORIES = [
  { value: "personal_trainer", label: "Προσωπικός Εκπαιδευτής", iconKey: "dumbbell", specialties: ["Απώλεια λίπους","Μυϊκή ενδυνάμωση","Προπόνηση με βάρη","Σωματική μεταμόρφωση","Προετοιμασία αγώνων/διαγωνισμών","Προπόνηση αρχαρίων","Προπόνηση τρίτης ηλικίας","Προπόνηση εγκύων"] },
  { value: "group_fitness_instructor", label: "Εκπαιδευτής Ομαδικών Προγραμμάτων", iconKey: "users", specialties: ["HIIT υψηλής έντασης","Bootcamp","Λειτουργική προπόνηση (Functional)","TRX","Κυκλική προπόνηση (Circuit)","Αερόβια προπόνηση (Cardio)","Ομαδικά γυναικών"] },
  { value: "pilates_instructor", label: "Εκπαιδευτής Pilates", iconKey: "pilates", specialties: ["Mat Pilates","Reformer Pilates","Προγεννητικό & Μεταγεννητικό","Στάση σώματος / Ενδυνάμωση Core","Pilates για αποκατάσταση"] },
  { value: "yoga_instructor", label: "Εκπαιδευτής Yoga", iconKey: "yoga", specialties: ["Hatha Yoga","Vinyasa Flow","Power Yoga","Yin Yoga","Prenatal Yoga","Mindfulness & Αναπνοές"] },
  { value: "nutritionist", label: "Διατροφολόγος", iconKey: "apple", specialties: ["Απώλεια βάρους","Αύξηση μυϊκής μάζας","Vegan / Χορτοφαγική διατροφή","Διατροφική υποστήριξη αθλητών","Προγράμματα διατροφής με delivery","Εντερική υγεία & δυσανεξίες"] },
  { value: "online_coach", label: "Online Προπονητής", iconKey: "laptop", specialties: ["Απομακρυσμένο 1-on-1 coaching","Προγράμματα PDF / Video","Συνδυασμός Διατροφής + Προπόνησης","Ζωντανά μαθήματα μέσω Zoom","Coaching υπευθυνότητας (accountability)"] },
  { value: "strength_conditioning", label: "Προπονητής Δύναμης & Φυσικής Κατάστασης", iconKey: "strength", specialties: ["Ανάπτυξη αθλητών","Αθλητικές επιδόσεις","Ολυμπιακές άρσεις","Πλειομετρικές ασκήσεις","Ανθεκτικότητα σε τραυματισμούς"] },
  { value: "calisthenics", label: "Εκπαιδευτής Calisthenics", iconKey: "calisthenics", specialties: ["Στατική δύναμη","Δυναμικές δεξιότητες (Muscle-up, Planche)","Ευκινησία & Έλεγχος","Street workout","Προπόνηση σε κρίκους"] },
  { value: "crossfit_coach", label: "Προπονητής CrossFit", iconKey: "crossfit", specialties: ["Καθημερινός προγραμματισμός (WODs)","Ολυμπιακές άρσεις","Προετοιμασία για αγώνες","Γυμναστικές δεξιότητες","Metcons"] },
  { value: "boxing_kickboxing", label: "Προπονητής Πυγμαχίας / Kickboxing", iconKey: "boxing", specialties: ["Cardio boxing","Sparring","Ασκήσεις με σάκο","Βελτίωση τεχνικής","Παιδιά / Αρχάριοι"] },
  { value: "martial_arts", label: "Εκπαιδευτής Πολεμικών Τεχνών", iconKey: "martial", specialties: ["Brazilian Jiu-Jitsu (BJJ)","Muay Thai","Καράτε","Krav Maga","Αυτοάμυνα","Taekwondo","Προετοιμασία MMA"] },
  { value: "dance_fitness", label: "Εκπαιδευτής Χορευτικής Γυμναστικής", iconKey: "dance", specialties: ["Zumba","Latin dance fitness","Afrobeat / Hip hop cardio","Τόνωση γυναικών","Χορός για ηλικιωμένους"] },
  { value: "running_coach", label: "Προπονητής Τρεξίματος", iconKey: "running", specialties: ["Μαραθώνιος / Ημιμαραθώνιος","Προπόνηση sprint","Διόρθωση τεχνικής τρεξίματος","Προπόνηση αντοχής","Τρέξιμο για αρχάριους"] },
  { value: "physiotherapist", label: "Φυσικοθεραπευτής", iconKey: "physio", specialties: ["Αποκατάσταση τραυματισμών","Manual therapy","Κινησιοθεραπεία","Χρόνιοι πόνοι","Αθλητική αποκατάσταση"] },
  { value: "rehab_prevention", label: "Ειδικός Αποκατάστασης / Πρόληψης Τραυματισμών", iconKey: "rehab", specialties: ["Εργονομική ενδυνάμωση","Διόρθωση κινητικών προτύπων","Ισορροπία & σταθερότητα","Επανένταξη μετά από χειρουργείο"] },
  { value: "wellness_life_coach", label: "Προπονητής Ευεξίας & Ζωής", iconKey: "wellness", specialties: ["Διαχείριση άγχους","Coaching συνηθειών & χρόνου","Ψυχική ανθεκτικότητα","Αποκατάσταση από burnout","Ολιστικός καθορισμός στόχων"] },
  { value: "performance_psych", label: "Προπονητής Απόδοσης / Αθλητικός Ψυχολόγος", iconKey: "psychology", specialties: ["Εκπαίδευση συγκέντρωσης","Ψυχολογία ημέρας αγώνα","Τεχνικές οπτικοποίησης","Αγωνιστικό mindset","Κατάσταση ροής (flow state) coaching"] },
];

const ALL_DAYS = [
  { key: "monday",    label: "Δευ" },
  { key: "tuesday",   label: "Τρι" },
  { key: "wednesday", label: "Τετ" },
  { key: "thursday",  label: "Πεμ" },
  { key: "friday",    label: "Παρ" },
  { key: "saturday",  label: "Σαβ" },
  { key: "sunday",    label: "Κυρ" },
];

const SLOT_PRESETS = [30, 45, 60, 90];
const BREAK_PRESETS = [0, 5, 10, 15, 30];
const GENERATION_HORIZON_DAYS = 180;

/* -------------------------- Premium UI Components ------------------------- */

function PremiumCard({ title, subtitle, icon, action, children, className = "", gradient = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/60 to-black/60 backdrop-blur-xl p-6 shadow-2xl transition-all duration-300 hover:shadow-3xl hover:border-white/20 ${gradient ? "premium-gradient" : ""} ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-zinc-300/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      {(title || subtitle || icon || action) && (
        <div className="relative mb-6 flex items-start justify-between">
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
      <div className="relative">{children}</div>
    </motion.div>
  );
}

function PremiumButton({ children, variant = "primary", size = "default", ...props }) {
  const baseClasses =
    "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-white text-black hover:bg-zinc-100 shadow-lg hover:shadow-xl hover:shadow-white/25 active:scale-95",
    secondary: "bg-zinc-800 text-white hover:bg-zinc-700 shadow-lg hover:shadow-xl hover:shadow-zinc-800/25 active:scale-95",
    outline: "border-2 border-white/20 bg-black/50 backdrop-blur-sm text-white hover:bg-white/10 hover:text-white hover:border-white/50",
    ghost: "text-white hover:bg-white/10 hover:text-white",
  };
  const sizes = { sm: "px-4 py-2 text-sm rounded-xl", default: "px-6 py-3 text-sm rounded-2xl", lg: "px-8 py-4 text-base rounded-2xl" };
  return (
    <button {...props} className={`${baseClasses} ${variants[variant]} ${sizes[size]}`}>
      {children}
    </button>
  );
}

function PremiumInput({ label, icon, className = "", ...props }) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-white flex items-center gap-2">
          {icon && <span className="text-white">{icon}</span>}
          {label}
        </label>
      )}
      <input
        {...props}
        className={`w-full rounded-2xl border border-white/20 bg-black/50 backdrop-blur-sm px-4 py-3 text-white placeholder-zinc-400 transition-all duration-200 focus:border-white focus:ring-2 focus:ring-white/20 focus:outline-none ${className}`}
      />
    </div>
  );
}

function PremiumSwitch({ checked, onChange, label }) {
  return (
    <div className="flex items-center gap-3">
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

function Card({ title, subtitle, icon, action, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/60 to-black/60 p-4 ${className}`}>
      {(title || subtitle || icon || action) && (
        <div className="mb-3 flex items-center gap-2">
          {icon && <div className="text-gray-300">{icon}</div>}
          <div className="flex-1 min-w-0">
            {title && <h3 className="text-base font-semibold text-white break-words">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-400 break-words">{subtitle}</p>}
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

/* Small chip for selected specialties */
function TagChip({ label, onRemove, removable = true }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white">
      {label}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="h-5 w-5 inline-flex items-center justify-center rounded-full hover:bg-white/20"
          aria-label={`Αφαίρεση ${label}`}
          title="Αφαίρεση"
        >
          ×
        </button>
      )}
    </span>
  );
}

/* --------------------------- main component ------------------------ */

export default function TrainerSchedulePage() {
  const { profile, profileLoaded, refreshProfile } = useAuth();

  const [loading, setLoading] = useState(false);

  const [modal, setModal] = useState({ open: false, type: "success", title: "", message: "" });
  const showSuccess = useCallback((msg, title = "Η ενέργεια ολοκληρώθηκε") => setModal({ open: true, type: "success", title, message: msg }), []);
  const showError = useCallback((msg, title = "Σφάλμα") => setModal({ open: true, type: "error", title, message: msg }), []);

  // category / specialty
  const [specialty, setSpecialty] = useState("");
  const [editingCategory, setEditingCategory] = useState(false);
  const [draftCategory, setDraftCategory] = useState("");
  // specialities (array)
  const [specialities, setSpecialities] = useState([]);
  const [editSpecs, setEditSpecs] = useState(false);
  // dynamic options from 'ειδικοτητες'
  const [specOptions, setSpecOptions] = useState([]);
  const [specLoading, setSpecLoading] = useState(false);

  // availability
  const [selectedDays, setSelectedDays] = useState(() => new Set(ALL_DAYS.map((d) => d.key)));
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("21:00");
  const [isOnline, setIsOnline] = useState(false);

  // schedule settings
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

  // generation
  const [generating, setGenerating] = useState(false);

  // pricing (state + original for cancel)
  const defaultPricing = { basePrice: 50, onlineDiscount: 10, specialtyPricing: {}, paymentMethods: { cash: true, card: true } };
  const [pricing, setPricing] = useState(defaultPricing);
  const [pricingInitial, setPricingInitial] = useState(defaultPricing);
  const [editingPricing, setEditingPricing] = useState(false);

  const hasTrainer = Boolean(profile?.id);
  const effectiveSlot = slotPreset === "custom" ? Number(slotCustom || 0) : Number(slotPreset || 0);
  const effectiveBreak = breakPreset === "custom" ? Number(breakCustom || 0) : Number(breakPreset || 0);

  const selectedCategory = useMemo(() => TRAINER_CATEGORIES.find((c) => c.value === specialty) || null, [specialty]);
  const CategoryIcon = selectedCategory?.iconKey ? ICON_BY_KEY[selectedCategory.iconKey] : null;

  /* ------------------------ effects / data load ------------------------ */
  useEffect(() => {
    if (!profileLoaded || !profile?.id) return;

    const cat = profile.specialty || "";
    setSpecialty(cat);
    setDraftCategory(cat);

    const initialSpecs =
      (Array.isArray(profile.specialities) && profile.specialities) ||
      (Array.isArray(profile.roles) && profile.roles) ||
      [];
    setSpecialities(initialSpecs);

    if (typeof profile.is_online === "boolean") setIsOnline(!!profile.is_online);

    (async () => {
      const { data: settings } = await supabase.from("trainer_schedule_settings").select("*").eq("trainer_id", profile.id).single();
      if (settings) {
        const s = Number(settings.slot_minutes || 60);
        const b = Number(settings.break_minutes || 0);
        if ([30, 45, 60, 90].includes(s)) setSlotPreset(s);
        else {
          setSlotPreset("custom");
          setSlotCustom(s);
        }
        if ([0, 5, 10, 15, 30].includes(b)) setBreakPreset(b);
        else {
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

  // load specialties from 'ειδικοτητες'
  useEffect(() => {
    const loadSpecs = async () => {
      setSpecOptions([]);
      if (!selectedCategory) return;
      setSpecLoading(true);
      try {
        let { data, error } = await supabase.from("ειδικοτητες").select("*").eq("category", selectedCategory.value);
        if (error || !Array.isArray(data) || data.length === 0) {
          const alt = await supabase.from("ειδικοτητες").select("*").eq("category_value", selectedCategory.value);
          if (!alt.error && Array.isArray(alt.data) && alt.data.length > 0) data = alt.data;
          else {
            const list = (selectedCategory.specialties || []).map((s) => ({ id: s, label: s }));
            setSpecOptions(list);
            return;
          }
        }
        const normalize = (r) => ({
          id: r.id ?? r.value ?? r.name ?? r.label ?? r.title ?? r.specialty,
          label: r.label ?? r.name ?? r.title ?? r.specialty ?? r.value ?? String(r.id),
        });
        setSpecOptions((data || []).map(normalize).filter((x) => x.id && x.label));
      } finally {
        setSpecLoading(false);
      }
    };
    loadSpecs();
  }, [selectedCategory?.value]);

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

  /* ---------------------------- helpers ---------------------------- */

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

  // INCLUDE WEEKENDS
  const weekdayKey = (d) => {
    const wd = new Date(d).getDay(); // 0=Sun ... 6=Sat
    return {
      0: "sunday",
      1: "monday",
      2: "tuesday",
      3: "wednesday",
      4: "thursday",
      5: "friday",
      6: "saturday",
    }[wd] || null;
  };

  const errText = (e) => e?.message || e?.details || e?.hint || (typeof e === "string" ? e : JSON.stringify(e || {}));

  /* ----------------------- Save pricing ----------------------- */
  async function handleSavePricing() {
    if (!hasTrainer) return showError("Απαιτείται σύνδεση για αποθήκευση τιμών.");

    const base = Number(pricing.basePrice ?? 0);
    const disc = Number(pricing.onlineDiscount ?? 0);
    if (base < 0) return showError("Η βασική τιμή δεν μπορεί να είναι αρνητική.");
    if (disc < 0 || disc > 50) return showError("Η έκπτωση Online πρέπει να είναι 0–50%.");

    setLoading(true);

    const payload = {
      trainer_id: profile.id,
      base_price: base,
      online_discount: disc,
      specialty_pricing: pricing.specialtyPricing ?? {},
      payment_methods: pricing.paymentMethods ?? { cash: true, card: true },
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("trainer_pricing").upsert(payload, { onConflict: "trainer_id" });

    setLoading(false);

    if (error) return showError("Αποτυχία αποθήκευσης τιμών: " + (error.message || JSON.stringify(error)));
    setEditingPricing(false);
    showSuccess("Οι τιμές αποθηκεύτηκαν.", "Επιτυχής αποθήκευση");
  }

  /* ----------------------- Slots generator ----------------------- */
  async function generateOpenSlotsForFuture(trainerId, horizonDays = GENERATION_HORIZON_DAYS) {
    setGenerating(true);
    {
      const { error: tableErr } = await supabase.from("trainer_open_slots").select("trainer_id", { count: "exact", head: true }).limit(1);
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
      const wk = weekdayKey(ds); // now returns weekend keys too
      if (!wk) continue;
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

  /* ------------------------------- actions ----------------------------- */
  const toggleDay = useCallback(
    (dayKey) =>
      setSelectedDays((prev) => {
        const next = new Set(prev);
        next.has(dayKey) ? next.delete(dayKey) : next.add(dayKey);
        return next;
      }),
    []
  );
  const selectPreset = useCallback((keys) => setSelectedDays(new Set(keys)), []);
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
    const rows = Array.from(selectedDays).map((day) => ({
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
    await supabase.from("profiles").update({ is_online: isOnline }).eq("id", trainerId);
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
  function toggleSpeciality(spLabel) {
    setSpecialities((prev) => (prev.includes(spLabel) ? prev.filter((x) => x !== spLabel) : [...prev, spLabel]));
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
      .upsert({ trainer_id: profile.id, slot_minutes: slot, break_minutes: brk, updated_at: new Date().toISOString() }, { onConflict: "trainer_id" });
    setLoading(false);
    if (error) return showError("Αποτυχία αποθήκευσης ρυθμίσεων.");
    showSuccess("Οι ρυθμίσεις συνεδριών αποθηκεύτηκαν.", "Επιτυχής αποθήκευση");
    await generateOpenSlotsForFuture(profile.id);
  }

  async function handleAddHoliday() {
    if (!hasTrainer) return showError("Απαιτείται σύνδεση για προσθήκη άδειας.");
    if (!holidayFrom || !holidayTo) return showError("Συμπλήρωσε ημερομηνίες.");
    if (new Date(holidayTo) < new Date(holidayFrom)) return showError("Η ημερομηνία λήξης πρέπει να είναι μετά την έναρξη.");
    setLoading(true);
    const { error } = await supabase
      .from("trainer_holidays")
      .insert({ trainer_id: profile.id, starts_on: holidayFrom, ends_on: holidayTo, reason: holidayReason || null });
    setLoading(false);
    if (error) return showError("Αποτυχία προσθήκης άδειας.");
    showSuccess("Η άδεια προστέθηκε.", "Επιτυχής προσθήκη");
    setHolidayFrom(todayStr);
    setHolidayTo(todayStr);
    setHolidayReason("");
    await (async (id) => {
      const { data } = await supabase
        .from("trainer_holidays")
        .select("*")
        .eq("trainer_id", id)
        .order("starts_on", { ascending: false });
      setHolidays(data || []);
    })(profile.id);
    await generateOpenSlotsForFuture(profile.id);
  }

  async function handleDeleteHoliday(id) {
    if (!hasTrainer) return;
    setLoading(true);
    const { error } = await supabase.from("trainer_holidays").delete().eq("id", id);
    setLoading(false);
    if (error) return showError("Αποτυχία διαγραφής άδειας.");
    showSuccess("Η άδεια διαγράφηκε.", "Ολοκληρώθηκε");
    const { data } = await supabase
      .from("trainer_holidays")
      .select("*")
      .eq("trainer_id", profile.id)
      .order("starts_on", { ascending: false });
    setHolidays(data || []);
    await generateOpenSlotsForFuture(profile.id);
  }

  const selectedSet = useMemo(() => new Set(specialities), [specialities]);
  const sortedSpecOptions = useMemo(() => {
    return [...specOptions].sort((a, b) => {
      const aSel = selectedSet.has(a.label) ? 1 : 0;
      const bSel = selectedSet.has(b.label) ? 1 : 0;
      if (bSel !== aSel) return bSel - aSel;
      return String(a.label).localeCompare(String(b.label), "el", { sensitivity: "base" });
    });
  }, [specOptions, selectedSet]);

  /* ------------------------------- render ----------------------------- */

  return (
    <>
      {/* GLOBAL SIZE VARS (makes the side menu bigger on desktop) */}
      <style jsx global>{`
        :root { --side-w: 0px; --nav-h: 64px; }
        @media (min-width: 640px){ :root { --nav-h: 72px; } }
        @media (min-width: 1024px){ :root { --side-w: 280px; --nav-h: 0px; } }   /* desktop menu width */
        @media (min-width: 1280px){ :root { --side-w: 320px; } }                 /* xl: even bigger */
      `}</style>

      {/* Background behind EVERYTHING (fixes white gap behind nav) */}
      <div className="fixed inset-0 -z-50 bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <TrainerMenu />

      <div className="relative min-h-screen overflow-x-hidden">
        {/* left padding only when side menu is visible; top padding on mobile for fixed top nav */}
        <div className="lg:pl-[calc(var(--side-w)+8px)] pl-0 lg:pt-0 pt-[var(--nav-h)] transition-[padding]">
          <main className="mx-auto max-w-7xl w-full p-4 sm:p-6 space-y-6 sm:space-y-8 pb-[80px]">
            <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
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

            {profileLoaded && !hasTrainer && (
              <PremiumCard
                title="Απαιτείται σύνδεση"
                subtitle="Συνδέσου για να διαχειριστείς το πρόγραμμά σου"
                icon={<AlertTriangle className="h-6 w-6" />}
              >
                <PremiumButton>Σύνδεση</PremiumButton>
              </PremiumCard>
            )}

            {hasTrainer && (
              <div className="grid gap-6 sm:gap-8 lg:grid-cols-12">
                {/* Left Column */}
                <div className="lg:col-span-8 space-y-6 sm:space-y-8">
                  {/* Availability */}
                  <PremiumCard
                    title="Διαθεσιμότητα"
                    subtitle="Ορισμός ημερών και ωραρίου εργασίας"
                    icon={<Calendar className="h-6 w-6" />}
                    gradient
                    action={
                      <PremiumButton variant="outline" onClick={() => generateOpenSlotsForFuture(profile.id)} disabled={generating}>
                        {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {generating ? "Δημιουργία..." : "Δημιουργία Slots"}
                      </PremiumButton>
                    }
                  >
                    <div className="space-y-6">
                      <div className="flex flex-wrap gap-2 sm:gap-3">
                        {ALL_DAYS.map((d) => {
                          const active = selectedDays.has(d.key);
                          return (
                            <motion.button
                              key={d.key}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => toggleDay(d.key)}
                              className={`px-3 sm:px-5 py-2 sm:py-3 rounded-2xl text-sm sm:text-base font-semibold transition-all duration-200 ${
                                active
                                  ? "bg-white text-black shadow-lg shadow-white/25"
                                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                              }`}
                            >
                              {d.label}
                            </motion.button>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-zinc-400">Γρήγορη επιλογή:</span>
                        {[
                          { label: "Όλες",        days: ALL_DAYS.map((d) => d.key) },
                          { label: "Καθημερινές", days: ["monday", "tuesday", "wednesday", "thursday", "friday"] },
                          { label: "Σαβ/Κυρ",     days: ["saturday", "sunday"] },
                          { label: "Δευ/Τετ/Παρ", days: ["monday", "wednesday", "friday"] },
                          { label: "Τρι/Πεμ",     days: ["tuesday", "thursday"] },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            onClick={() => selectPreset(preset.days)}
                            className="text-white hover:text-zinc-300 hover:underline transition-colors"
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
                        />
                        <PremiumInput
                          label="Ώρα λήξης"
                          icon={<Clock className="h-4 w-4" />}
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
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
                          <PremiumSwitch checked={isOnline} onChange={setIsOnline} />
                        </div>
                      </div>

                      <PremiumButton onClick={handleSaveAvailability} disabled={loading || !validTimeRange} className="w-full">
                        {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Αποθήκευση Διαθεσιμότητας
                      </PremiumButton>
                    </div>
                  </PremiumCard>

                  {/* Pricing */}
                  <PremiumCard
                    title="Διαχείριση Τιμών"
                    subtitle="Ορισμός τιμών και πληρωμών"
                    icon={<Euro className="h-6 w-6" />}
                    action={
                      !editingPricing ? (
                        <PremiumButton variant="ghost" size="sm" onClick={() => setEditingPricing(true)}>
                          <Pencil className="h-4 w-4" /> Επεξεργασία
                        </PremiumButton>
                      ) : null
                    }
                  >
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <PremiumInput
                          label="Βασική τιμή (€)"
                          type="number"
                          min="0"
                          step="5"
                          value={pricing.basePrice}
                          onChange={(e) => setPricing((p) => ({ ...p, basePrice: Number(e.target.value) }))}
                          disabled={!editingPricing}
                        />
                        <PremiumInput
                          label="Έκπτωση Online (%)"
                          type="number"
                          min="0"
                          max="50"
                          value={pricing.onlineDiscount}
                          onChange={(e) => setPricing((p) => ({ ...p, onlineDiscount: Number(e.target.value) }))}
                          disabled={!editingPricing}
                        />
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-zinc-800/20 p-6">
                        <h4 className="font-semibold text-white mb-4">Μέθοδοι Πληρωμής</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {[
                            { key: "cash", title: "Μετρητά", sub: "Cash payments", iconPath: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
                            { key: "card", title: "Κάρτα", sub: "Card payments", iconPath: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
                          ].map((m) => (
                            <div key={m.key} className="flex items-center justify-between p-4 rounded-xl bg-black/50">
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
                                  disabled={!editingPricing}
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

                      {editingPricing && (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <PremiumButton onClick={handleSavePricing} disabled={loading}>
                            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Αποθήκευση
                          </PremiumButton>
                          <PremiumButton
                            variant="outline"
                            onClick={() => {
                              setPricing(pricingInitial);
                              setEditingPricing(false);
                            }}
                            disabled={loading}
                          >
                            Ακύρωση
                          </PremiumButton>
                        </div>
                      )}
                    </div>
                  </PremiumCard>
                </div>

                {/* Right Column */}
                <div className="lg:col-span-4 space-y-6 sm:space-y-8">
                  {/* Category */}
                  <PremiumCard
                    title="Ειδικότητα"
                    subtitle="Η κύρια κατηγορία σου"
                    icon={<Target className="h-6 w-6" />}
                    action={
                      !editingCategory && (
                        <PremiumButton variant="ghost" size="sm" onClick={startEditCategory}>
                          <Pencil className="h-4 w-4" /> Επεξεργασία
                        </PremiumButton>
                      )
                    }
                  >
                    {editingCategory ? (
                      <div className="space-y-4">
                        <select
                          value={draftCategory}
                          onChange={(e) => setDraftCategory(e.target.value)}
                          className="w-full rounded-2xl border border-white/20 bg-black/50 backdrop-blur-sm px-4 py-3 text-white focus:border-white focus:ring-2 focus:ring-white/20 focus:outline-none"
                        >
                          <option value="">-- Επίλεξε κατηγορία --</option>
                          {TRAINER_CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <PremiumButton onClick={saveCategory} disabled={loading} size="sm">
                            <Save className="h-4 w-4" /> Αποθήκευση
                          </PremiumButton>
                          <PremiumButton variant="outline" onClick={cancelCategory} size="sm">
                            Ακύρωση
                          </PremiumButton>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        {CategoryIcon && (
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                            <CategoryIcon className="h-6 w-6" />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-white">{selectedCategory?.label || "Δεν έχει οριστεί"}</div>
                          {!selectedCategory && <div className="text-sm text-zinc-400">Κάντε κλικ για επεξεργασία</div>}
                        </div>
                      </div>
                    )}
                  </PremiumCard>

                  {/* Specialties */}
                  <PremiumCard
                    title="Ειδικότητες"
                    subtitle="Επίλεξε τις ειδικότητές σου"
                    icon={<ListChecks className="h-6 w-6" />}
                    action={
                      <PremiumButton variant="ghost" size="sm" onClick={() => setEditSpecs((v) => !v)}>
                        <Pencil className="h-4 w-4" />
                        {editSpecs ? "Τέλος" : "Επεξεργασία"}
                      </PremiumButton>
                    }
                  >
                    {!selectedCategory && <div className="text-sm text-zinc-400">Επίλεξε πρώτα μία κατηγορία.</div>}
                    {selectedCategory && (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs text-zinc-400">Επιλεγμένα ({specialities.length})</span>
                            {editSpecs && specialities.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setSpecialities([])}
                                className="text-xs text-white/80 hover:underline"
                              >
                                Καθαρισμός
                              </button>
                            )}
                          </div>
                          {specialities.length === 0 ? (
                            <div className="text-sm text-zinc-500">Δεν έχεις επιλέξει ειδικότητες ακόμη.</div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {specialities.map((sp) => (
                                <TagChip key={sp} label={sp} removable={editSpecs} onRemove={() => editSpecs && toggleSpeciality(sp)} />
                              ))}
                            </div>
                          )}
                        </div>

                        {specLoading ? (
                          <div className="flex items-center gap-2 text-zinc-300">
                            <RefreshCw className="h-4 w-4 animate-spin" /> Φόρτωση ειδικοτήτων...
                          </div>
                        ) : sortedSpecOptions.length === 0 ? (
                          <div className="text-sm text-zinc-400">Δεν υπάρχουν διαθέσιμες ειδικότητες.</div>
                        ) : (
                          <div className="space-y-2">
                            {sortedSpecOptions.map((opt) => {
                              const checked = selectedSet.has(opt.label);
                              return (
                                <div
                                  key={opt.id ?? opt.label}
                                  className={`flex items-center justify-between rounded-xl border p-3 transition ${
                                    checked ? "border-white/40 bg-white/10" : "border-white/10 bg-black/40 hover:border-white/20"
                                  }`}
                                >
                                  <span className="text-sm text-white">{opt.label}</span>
                                  {editSpecs ? (
                                    <PremiumSwitch checked={checked} onChange={() => toggleSpeciality(opt.label)} />
                                  ) : (
                                    checked && <CheckCircle2 className="h-4 w-4 text-white/90" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {editSpecs && sortedSpecOptions.length > 0 && (
                          <div className="pt-2">
                            <PremiumButton onClick={handleSaveSpecialities} disabled={loading} size="sm" className="w-full">
                              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Αποθήκευση Ειδικοτήτων
                            </PremiumButton>
                          </div>
                        )}
                      </div>
                    )}
                  </PremiumCard>

                  {/* Session Settings */}
                  <PremiumCard title="Ρυθμίσεις Συνεδριών" subtitle="Διάρκεια και διαλείμματα" icon={<Timer className="h-6 w-6" />}>
                    <div className="space-y-6">
                      <div>
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
                          {/* Optional "custom" button if you want: keep your current logic */}
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
                            />
                          </div>
                        )}
                      </div>

                      <div>
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

                      <PremiumButton onClick={handleSaveScheduleSettings} disabled={loading} className="w-full" size="sm">
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Αποθήκευση Ρυθμίσεων
                      </PremiumButton>
                    </div>
                  </PremiumCard>

                  {/* Holidays */}
                  <PremiumCard title="Διαχείριση Αδειών" subtitle="Προσθήκη αδειών και εορτών" icon={<Sun className="h-6 w-6" />}>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <PremiumInput label="Από" type="date" value={holidayFrom} onChange={(e) => setHolidayFrom(e.target.value)} />
                        <PremiumInput label="Έως" type="date" value={holidayTo} onChange={(e) => setHolidayTo(e.target.value)} />
                      </div>
                      <PremiumInput
                        label="Αιτιολογία (προαιρετικό)"
                        value={holidayReason}
                        onChange={(e) => setHolidayReason(e.target.value)}
                        placeholder="π.χ. Διακοπές, Ασθένεια"
                      />
                      <PremiumButton onClick={handleAddHoliday} disabled={loading} className="w-full" size="sm">
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Προσθήκη Άδειας
                      </PremiumButton>
                      {holidays.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-white">Υπάρχουσες άδειες</h4>
                          {holidays.slice(0, 3).map((h) => (
                            <div key={h.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/50 p-3">
                              <div>
                                <div className="text-sm font-medium text-white">
                                  {new Date(h.starts_on).toLocaleDateString("el-GR")} - {new Date(h.ends_on).toLocaleDateString("el-GR")}
                                </div>
                                {h.reason && <div className="text-xs text-zinc-400">{h.reason}</div>}
                              </div>
                              <button
                                onClick={() => handleDeleteHoliday(h.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-500 hover:text-white transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </PremiumCard>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

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
