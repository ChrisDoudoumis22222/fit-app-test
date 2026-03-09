// FILE: src/components/trainer/TrainerProfileForm.jsx

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Save,
  Mail,
  MapPin,
  Clock,
  Trophy,
  Wifi,
  WifiOff,
  X,
  Smartphone,
  FileText,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  User as UserIcon,
} from "lucide-react";
import { supabase } from "../../supabaseClient";

// react-icons for categories
import { FaDumbbell, FaUsers, FaAppleAlt, FaLaptop } from "react-icons/fa";
import { MdSelfImprovement } from "react-icons/md";
import { TbYoga } from "react-icons/tb";

/* ────────────────────────────────────────────────────── */
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/* ─── Icons / Data ───────────────────────────────────── */
const ICON_BY_KEY = {
  dumbbell: FaDumbbell,
  users: FaUsers,
  pilates: MdSelfImprovement,
  yoga: TbYoga,
  apple: FaAppleAlt,
  laptop: FaLaptop,
};

const TRAINER_CATEGORIES = [
  {
    value: "personal_trainer",
    label: "Προσωπικός Εκπαιδευτής",
    iconKey: "dumbbell",
    specialties: [
      "Απώλεια λίπους",
      "Μυϊκή ενδυνάμωση",
      "Προπόνηση με βάρη",
      "Σωματική μεταμόρφωση",
      "Προετοιμασία αγώνων/διαγωνισμών",
      "Προπόνηση αρχαρίων",
      "Προπόνηση τρίτης ηλικίας",
      "Προπόνηση εγκύων",
    ],
  },
  {
    value: "group_fitness_instructor",
    label: "Εκπαιδευτής Ομαδικών Προγραμμάτων",
    iconKey: "users",
    specialties: [
      "HIIT υψηλής έντασης",
      "Bootcamp",
      "Λειτουργική προπόνηση (Functional)",
      "TRX",
      "Κυκλική προπόνηση (Circuit)",
      "Αερόβια προπόνηση (Cardio)",
      "Ομαδικά γυναικών",
    ],
  },
  {
    value: "pilates_instructor",
    label: "Εκπαιδευτής Pilates",
    iconKey: "pilates",
    specialties: [
      "Mat Pilates",
      "Reformer Pilates",
      "Προγεννητικό & Μεταγεννητικό",
      "Στάση σώματος / Ενδυνάμωση Core",
      "Pilates για αποκατάσταση",
    ],
  },
  {
    value: "yoga_instructor",
    label: "Εκπαιδευτής Yoga",
    iconKey: "yoga",
    specialties: [
      "Hatha Yoga",
      "Vinyasa Flow",
      "Power Yoga",
      "Yin Yoga",
      "Prenatal Yoga",
      "Mindfulness & Αναπνοές",
    ],
  },
  {
    value: "nutritionist",
    label: "Διατροφολόγος",
    iconKey: "apple",
    specialties: [
      "Απώλεια βάρους",
      "Αύξηση μυϊκής μάζας",
      "Vegan / Χορτοφαγική διατροφή",
      "Διατροφική υποστήριξη αθλητών",
      "Προγράμματα διατροφής με delivery",
      "Εντερική υγεία & δυσανεξίες",
    ],
  },
  {
    value: "online_coach",
    label: "Online Προπονητής",
    iconKey: "laptop",
    specialties: [
      "Απομακρυσμένο 1-on-1 coaching",
      "Προγράμματα PDF / Video",
      "Συνδυασμός Διατροφής + Προπόνησης",
      "Ζωντανά μαθήματα μέσω Zoom",
      "Coaching υπευθυνότητας (accountability)",
    ],
  },
];

// dropdown only
const CITY_OPTIONS = [
  "Αθήνα",
  "Θεσσαλονίκη",
  "Πάτρα",
  "Ηράκλειο",
  "Λάρισα",
  "Βόλος",
  "Ιωάννινα",
  "Καβάλα",
  "Σέρρες",
  "Χανιά",
  "Ρέθυμνο",
  "Ρόδος",
  "Κέρκυρα",
  "Καλαμάτα",
  "Χαλκίδα",
  "Λαμία",
  "Αλεξανδρούπολη",
  "Ξάνθη",
  "Δράμα",
  "Κοζάνη",
  "Βέροια",
  "Κατερίνη",
  "Τρίκαλα",
  "Καρδίτσα",
  "Αγρίνιο",
  "Πειραιάς",
  "Μαρούσι",
  "Χαλάνδρι",
  "Κηφισιά",
  "Περιστέρι",
  "Γλυφάδα",
  "Αχαρνές",
];

/* ─── UI tokens ─────────────────────────────────────── */
const WRAP = "w-full max-w-3xl space-y-5";
const TITLE_WRAP = "flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between";
const PAGE_TITLE = "text-lg sm:text-xl font-semibold text-white";
const PAGE_SUB = "text-sm text-white/55";

const PANEL =
  "relative overflow-hidden rounded-none sm:rounded-3xl -mx-4 px-4 sm:mx-0 sm:px-0 border-0 ring-0 outline-none bg-transparent sm:bg-zinc-950/50 backdrop-blur-0 sm:backdrop-blur-md shadow-none sm:shadow-[0_12px_40px_rgba(0,0,0,0.45)] sm:border sm:border-white/10";
const PANEL_INNER = "px-4 py-5 sm:p-6";
const PANEL_TITLE =
  "text-[11px] font-medium uppercase tracking-[0.18em] text-white/45 mb-5";

const LABEL =
  "mb-1.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-white/45";
const INPUT =
  "w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:bg-white/7 focus:ring-2 focus:ring-white/20 focus:border-white/15 disabled:opacity-60 disabled:cursor-not-allowed";
const SOFT_BOX =
  "rounded-2xl bg-transparent sm:bg-white/5 border-0 sm:border border-white/10 p-0 sm:p-4";

const CHIP =
  "inline-flex items-center gap-2 rounded-2xl bg-white/8 border border-white/10 px-3 py-1.5 text-[12px] text-white/80";

/* ─── Toast ─────────────────────────────────────────── */
function MiniToast({ open, text, type = "success", onClose }) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => onClose?.(), 2200);
    return () => clearTimeout(t);
  }, [open, onClose]);

  const bg =
    type === "success"
      ? "bg-emerald-500/90"
      : type === "warning"
      ? "bg-amber-500/90"
      : "bg-white/15";

  const Icon = type === "warning" ? AlertTriangle : CheckCircle2;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 transition-all duration-200",
        open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
      )}
    >
      <div className={cn("flex items-center gap-2 rounded-2xl px-4 py-3 shadow-lg", bg)}>
        <Icon className="h-5 w-5 text-white" />
        <span className="text-sm font-medium text-white">{text}</span>
        <button
          type="button"
          onClick={() => onClose?.()}
          className="ml-2 rounded-full p-1 hover:bg-white/15"
          aria-label="Κλείσιμο"
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </div>
    </div>
  );
}

/* ─── Unsaved Changes Modal ─────────────────────────── */
function LeaveGuardModal({ open, saving, onCancel, onSave }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950/95 backdrop-blur-xl p-5 shadow-[0_24px_80px_rgba(0,0,0,.6)]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-2xl bg-amber-500/12 border border-amber-400/20 p-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-200" />
          </div>

          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">
              Υπάρχουν μη αποθηκευμένες αλλαγές
            </h3>
            <p className="mt-1 text-sm text-white/60">
              Θέλεις να αποθηκεύσεις τις αλλαγές σου τώρα;
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 order-1"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Αποθήκευση
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-2xl bg-white/8 border border-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-60 order-2"
          >
            Άκυρο
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ────────────────────────────────── */
function FormField({ icon, label, children }) {
  return (
    <div>
      <label className={LABEL}>
        <span className="inline-flex h-4 w-4 items-center justify-center text-white/65">
          {icon}
        </span>
        {label}
      </label>
      {children}
    </div>
  );
}

function OnlineToggle({ checked, onToggle, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      onClick={onToggle}
      disabled={disabled}
      aria-checked={checked}
      aria-label="Online availability toggle"
      className={cn(
        "relative h-8 w-14 rounded-full transition-all duration-200 disabled:opacity-50 border",
        checked
          ? "bg-emerald-500/90 border-emerald-400/40 shadow-[0_8px_24px_rgba(16,185,129,0.28)]"
          : "bg-white/8 border-white/10"
      )}
    >
      <span
        className={cn(
          "absolute top-1 h-6 w-6 rounded-full transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,.22)]",
          checked ? "left-7 bg-white" : "left-1 bg-white/90"
        )}
      />
    </button>
  );
}

function Panel({ children }) {
  return (
    <section className={PANEL}>
      <div className={PANEL_INNER}>{children}</div>
    </section>
  );
}

/* ─── Main ──────────────────────────────────────────── */
function TrainerProfileForm({ profile, onAfterSave, pvDebug = false }) {
  const navigate = useNavigate();
  const location = useLocation();

  const profileId = profile?.id || null;
  const [saving, setSaving] = useState(false);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastText, setToastText] = useState("");
  const [toastType, setToastType] = useState("success");

  const [guardOpen, setGuardOpen] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    bio: "",
    specialty: "",
    location: "",
    experienceYears: "",
    isOnline: false,
    selectedSpecialties: [],
  });

  const savedRef = useRef(null);
  const pendingNavRef = useRef(null);

  const showToast = useCallback((text, type = "success") => {
    setToastText(text);
    setToastType(type);
    setToastOpen(true);
  }, []);

  // hydrate once per profileId
  useEffect(() => {
    if (!profileId) return;

    const loc = (profile?.location || "").trim();
    const safeLoc = CITY_OPTIONS.includes(loc) ? loc : "";

    const next = {
      fullName: profile?.full_name || "",
      phone: profile?.phone || "",
      email: profile?.email || "",
      bio: profile?.bio || "",
      specialty: profile?.specialty || "",
      location: safeLoc,
      experienceYears:
        typeof profile?.experience_years === "number" ? String(profile.experience_years) : "",
      isOnline: !!profile?.is_online,
      selectedSpecialties: Array.isArray(profile?.roles) ? profile.roles : [],
    };

    setForm(next);
    savedRef.current = next;
  }, [
    profileId,
    profile?.location,
    profile?.full_name,
    profile?.phone,
    profile?.email,
    profile?.bio,
    profile?.specialty,
    profile?.experience_years,
    profile?.is_online,
    profile?.roles,
  ]);

  const isDirty = useMemo(() => {
    if (!savedRef.current) return false;
    return JSON.stringify(form) !== JSON.stringify(savedRef.current);
  }, [form]);

  const currentCategory = useMemo(() => {
    if (!form.specialty) return null;
    return TRAINER_CATEGORIES.find((cat) => cat.value === form.specialty) || null;
  }, [form.specialty]);

  const CurrentIconComp = useMemo(() => {
    if (!currentCategory?.iconKey) return Trophy;
    return ICON_BY_KEY[currentCategory.iconKey] || Trophy;
  }, [currentCategory]);

  const toggleSpecialty = useCallback((name) => {
    setForm((prev) => ({
      ...prev,
      selectedSpecialties: prev.selectedSpecialties.includes(name)
        ? prev.selectedSpecialties.filter((s) => s !== name)
        : [...prev.selectedSpecialties, name],
    }));
  }, []);

  const saveProfile = useCallback(async () => {
    if (!profileId) return false;

    setSaving(true);
    try {
      const payload = {
        full_name: form.fullName.trim(),
        phone: form.phone.trim(),
        bio: form.bio.trim(),
        specialty: form.specialty.trim(),
        location: form.location.trim(),
        experience_years: form.experienceYears ? Number.parseInt(form.experienceYears, 10) : null,
        is_online: !!form.isOnline,
        roles: form.selectedSpecialties,
        updated_at: new Date().toISOString(),
      };

      if (pvDebug) console.log("[TrainerProfileForm] update payload:", payload);

      const { error } = await supabase.from("profiles").update(payload).eq("id", profileId);
      if (error) throw error;

      savedRef.current = { ...form };
      showToast("Οι αλλαγές αποθηκεύτηκαν", "success");
      if (typeof onAfterSave === "function") onAfterSave();
      return true;
    } catch (err) {
      showToast(err?.message || "Σφάλμα κατά την αποθήκευση", "warning");
      return false;
    } finally {
      setSaving(false);
    }
  }, [profileId, form, pvDebug, onAfterSave, showToast]);

  const onSaveSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!isDirty) {
        showToast("Δεν υπάρχουν αλλαγές για αποθήκευση", "warning");
        return;
      }
      await saveProfile();
    },
    [isDirty, saveProfile, showToast]
  );

  // browser refresh/close guard
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  // intercept anchor clicks
  useEffect(() => {
    const onClickCapture = (e) => {
      if (!isDirty || saving || guardOpen) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target;
      const a = target?.closest?.("a[href]");
      if (!a) return;

      if (a.getAttribute("data-no-guard") === "true") return;

      const hrefAttr = a.getAttribute("href");
      if (!hrefAttr) return;

      if (
        hrefAttr.startsWith("mailto:") ||
        hrefAttr.startsWith("tel:") ||
        hrefAttr.startsWith("javascript:")
      ) {
        return;
      }

      if (hrefAttr.startsWith("#") && hrefAttr === (location.hash || "")) return;

      e.preventDefault();
      e.stopPropagation();
      pendingNavRef.current = hrefAttr;
      setGuardOpen(true);
    };

    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [isDirty, saving, guardOpen, location.hash]);

  const performPendingNav = useCallback(() => {
    const href = pendingNavRef.current;
    pendingNavRef.current = null;
    if (!href) return;

    if (href.startsWith("#")) {
      window.location.hash = href;
      return;
    }

    try {
      const url = new URL(href, window.location.href);

      if (url.origin === window.location.origin) {
        const dest = `${url.pathname}${url.search}${url.hash}`;
        navigate(dest);
        return;
      }

      window.location.href = url.href;
    } catch {
      navigate(href);
    }
  }, [navigate]);

  const onCancelGuard = useCallback(() => {
    setGuardOpen(false);
    pendingNavRef.current = null;
  }, []);

  const onSaveGuard = useCallback(async () => {
    const ok = await saveProfile();
    if (!ok) return;
    setGuardOpen(false);
    setTimeout(() => performPendingNav(), 0);
  }, [saveProfile, performPendingNav]);

  return (
    <>
      <div className={TITLE_WRAP}>
        <div>
          <div className={PAGE_TITLE}>Επεξεργασία Προφίλ</div>
          <div className={PAGE_SUB}>Συμπλήρωσε τα στοιχεία σου και αποθήκευσε τις αλλαγές.</div>
        </div>
        <div className="mt-3 sm:mt-0 flex items-center gap-2">
          {isDirty && <span className={CHIP}>Μη αποθηκευμένες αλλαγές</span>}
        </div>
      </div>

      <form onSubmit={onSaveSubmit} className={WRAP}>
        <Panel>
          <h2 className={PANEL_TITLE}>Προσωπικά Στοιχεία</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField icon={<UserIcon className="h-4 w-4" />} label="Πλήρες Όνομα">
              <input
                className={INPUT}
                value={form.fullName}
                onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                placeholder="Εισάγετε πλήρες όνομα"
                disabled={saving}
              />
            </FormField>

            <FormField icon={<Smartphone className="h-4 w-4" />} label="Τηλέφωνο">
              <input
                className={INPUT}
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="Εισάγετε τηλέφωνο"
                disabled={saving}
              />
            </FormField>
          </div>

          <div className="mt-4">
            <FormField icon={<Mail className="h-4 w-4" />} label="Email">
              <input type="email" disabled value={form.email} className={cn(INPUT, "opacity-50 cursor-not-allowed")} />
            </FormField>
          </div>

          <div className="mt-4">
            <FormField icon={<FileText className="h-4 w-4" />} label="Βιογραφικό">
              <textarea
                className={cn(INPUT, "min-h-[120px] resize-y")}
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                placeholder="2–4 γραμμές: εμπειρία, προσέγγιση, στόχοι"
                disabled={saving}
              />
              <p className="mt-2 text-[11px] text-white/45">Tip: γράψε τι αποτέλεσμα φέρνεις & σε ποιον.</p>
            </FormField>
          </div>
        </Panel>

        <Panel>
          <h2 className={PANEL_TITLE}>Επαγγελματικά Στοιχεία</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField icon={React.createElement(CurrentIconComp, { className: "h-4 w-4" })} label="Κατηγορία">
              <div className="relative">
                <select
                  className={cn(INPUT, "appearance-none pr-10")}
                  value={form.specialty}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      specialty: e.target.value,
                      selectedSpecialties: [],
                    }))
                  }
                  disabled={saving}
                >
                  <option value="" className="bg-zinc-950">
                    — Επίλεξε κατηγορία —
                  </option>
                  {TRAINER_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value} className="bg-zinc-950">
                      {c.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
              </div>
            </FormField>

            <FormField icon={<MapPin className="h-4 w-4" />} label="Πόλη">
              <div className="relative">
                <select
                  className={cn(INPUT, "appearance-none pr-10")}
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  disabled={saving}
                >
                  <option value="" className="bg-zinc-950">
                    — Επίλεξε πόλη —
                  </option>
                  {CITY_OPTIONS.map((c) => (
                    <option key={c} value={c} className="bg-zinc-950">
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
              </div>
            </FormField>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField icon={<Clock className="h-4 w-4" />} label="Χρόνια Εμπειρίας">
              <input
                type="number"
                min={0}
                max={50}
                className={INPUT}
                value={form.experienceYears}
                onChange={(e) => setForm((p) => ({ ...p, experienceYears: e.target.value }))}
                placeholder="π.χ. 5"
                disabled={saving}
              />
            </FormField>

            <FormField icon={form.isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />} label="Διαθεσιμότητα">
              <div className={SOFT_BOX}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-white/85">Διαθέσιμος online</span>
                  <OnlineToggle
                    checked={form.isOnline}
                    onToggle={() => setForm((p) => ({ ...p, isOnline: !p.isOnline }))}
                    disabled={saving}
                  />
                </div>
                <p className="mt-2 text-[11px] text-white/45">Θα εμφανίζεσαι ως διαθέσιμος για online συνεδρίες.</p>
              </div>
            </FormField>
          </div>
        </Panel>

        {form.specialty && currentCategory && (
          <Panel>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-4">
              <h2 className={cn(PANEL_TITLE, "mb-0")}>
                Ειδικότητες
                <span className="text-white/35 font-normal ml-2">· {currentCategory.label}</span>
              </h2>
              <span className="text-[11px] text-white/45">Διάλεξε όσες σε περιγράφουν καλύτερα</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
              {currentCategory.specialties.map((spec) => {
                const active = form.selectedSpecialties.includes(spec);
                return (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => toggleSpecialty(spec)}
                    disabled={saving}
                    className={cn(
                      "group flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-left transition-all disabled:opacity-50 border",
                      active ? "bg-white/10 border-white/20" : "bg-white/5 border-white/10 hover:bg-white/8"
                    )}
                  >
                    <span className={cn("text-[13px] truncate", active ? "text-white" : "text-white/70")} title={spec}>
                      {spec}
                    </span>
                    <span
                      className={cn(
                        "h-4 w-4 rounded-full flex items-center justify-center shrink-0 transition-all",
                        active ? "bg-white/20" : "bg-white/10 group-hover:bg-white/15"
                      )}
                      aria-hidden="true"
                    >
                      <span className={cn("h-2 w-2 rounded-full", active ? "bg-white" : "bg-white/30")} />
                    </span>
                  </button>
                );
              })}
            </div>

            {form.selectedSpecialties.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-[11px] text-white/45 mb-2">Επιλεγμένες ({form.selectedSpecialties.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {form.selectedSpecialties.map((spec) => (
                    <span
                      key={spec}
                      className="inline-flex items-center gap-2 rounded-2xl bg-white/8 border border-white/10 px-3 py-1.5 text-[12px] text-white/80"
                    >
                      <span className="max-w-[180px] truncate" title={spec}>
                        {spec}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleSpecialty(spec)}
                        className="text-white/45 hover:text-white transition-colors"
                        disabled={saving}
                        aria-label={`Αφαίρεση ${spec}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all",
              "bg-white text-black hover:bg-white/90",
              "disabled:opacity-60 disabled:cursor-not-allowed"
            )}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Αποθήκευση..." : "Αποθήκευση αλλαγών"}
          </button>
        </div>
      </form>

      <MiniToast open={toastOpen} text={toastText} type={toastType} onClose={() => setToastOpen(false)} />

      <LeaveGuardModal
        open={guardOpen}
        saving={saving}
        onCancel={onCancelGuard}
        onSave={onSaveGuard}
      />
    </>
  );
}

export default memo(TrainerProfileForm);