// FILE: src/components/trainer/TrainerProfileForm.jsx

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Loader2,
  CheckCircle2,
  AlertTriangle,
  User as UserIcon,
  Sparkles,
  BriefcaseBusiness,
  Tags,
  ChevronDown,
  ChevronUp,
  Link2,
} from "lucide-react";
import { supabase } from "../../supabaseClient";

// react-icons for categories
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
  MdSelfImprovement,
  MdFitnessCenter,
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

import {
  TRAINER_CATEGORIES,
  LOCATION_OPTIONS,
} from "../../categoriesAndLocations";

/* ────────────────────────────────────────────────────── */
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function normalizeArray(arr = []) {
  return [...arr].map(String).sort((a, b) => a.localeCompare(b));
}

function areArraysEqual(a = [], b = []) {
  const aa = normalizeArray(a);
  const bb = normalizeArray(b);
  if (aa.length !== bb.length) return false;
  return aa.every((item, i) => item === bb[i]);
}

function normalizeSelectionsMap(map = {}) {
  return Object.keys(map)
    .sort((a, b) => a.localeCompare(b))
    .reduce((acc, key) => {
      acc[key] = normalizeArray(map[key] || []);
      return acc;
    }, {});
}

function areSelectionMapsEqual(a = {}, b = {}) {
  const aa = normalizeSelectionsMap(a);
  const bb = normalizeSelectionsMap(b);

  const aKeys = Object.keys(aa);
  const bKeys = Object.keys(bb);

  if (!areArraysEqual(aKeys, bKeys)) return false;

  return aKeys.every((key) => areArraysEqual(aa[key], bb[key]));
}

function cloneFormState(state) {
  return {
    ...state,
    selectedCategories: [...(state?.selectedCategories || [])],
    selectedSpecialtiesByCategory: Object.fromEntries(
      Object.entries(state?.selectedSpecialtiesByCategory || {}).map(
        ([key, value]) => [key, [...(value || [])]]
      )
    ),
  };
}

function getCategoryByValue(value) {
  return TRAINER_CATEGORIES.find((cat) => cat.value === value) || null;
}

function parseStoredSelections(primaryCategory, roles = []) {
  const selectedCategories = [];
  const selectedSpecialtiesByCategory = {};

  const addCategory = (categoryValue) => {
    const safe = String(categoryValue || "").trim();
    if (!safe) return;
    if (!selectedCategories.includes(safe)) selectedCategories.push(safe);
    if (!selectedSpecialtiesByCategory[safe]) {
      selectedSpecialtiesByCategory[safe] = [];
    }
  };

  const addSpecialty = (categoryValue, specialtyLabel) => {
    const safeCategory = String(categoryValue || "").trim();
    const safeSpec = String(specialtyLabel || "").trim();
    if (!safeCategory || !safeSpec) return;

    addCategory(safeCategory);

    if (!selectedSpecialtiesByCategory[safeCategory].includes(safeSpec)) {
      selectedSpecialtiesByCategory[safeCategory].push(safeSpec);
    }
  };

  const safeRoles = Array.isArray(roles) ? roles.map(String) : [];
  const hasPrefixedValues = safeRoles.some(
    (item) => item.startsWith("cat:") || item.startsWith("spec:")
  );

  if (hasPrefixedValues) {
    safeRoles.forEach((item) => {
      if (item.startsWith("cat:")) {
        addCategory(item.slice(4));
        return;
      }

      if (item.startsWith("spec:")) {
        const raw = item.slice(5);
        const [categoryValue, ...specParts] = raw.split("::");
        const specialtyLabel = specParts.join("::");
        addSpecialty(categoryValue, specialtyLabel);
      }
    });

    if (
      primaryCategory &&
      !selectedCategories.includes(String(primaryCategory).trim())
    ) {
      addCategory(primaryCategory);
    }

    return {
      selectedCategories,
      selectedSpecialtiesByCategory,
    };
  }

  // backward compatibility with old data
  if (primaryCategory) {
    addCategory(primaryCategory);
  }

  safeRoles.forEach((legacySpec) => {
    const safeSpec = String(legacySpec || "").trim();
    if (!safeSpec) return;

    const matchedCategories = TRAINER_CATEGORIES.filter((cat) =>
      Array.isArray(cat.specialties) ? cat.specialties.includes(safeSpec) : false
    );

    if (matchedCategories.length === 1) {
      addSpecialty(matchedCategories[0].value, safeSpec);
      return;
    }

    if (
      matchedCategories.length > 1 &&
      primaryCategory &&
      matchedCategories.some((cat) => cat.value === primaryCategory)
    ) {
      addSpecialty(primaryCategory, safeSpec);
      return;
    }

    if (primaryCategory) {
      addSpecialty(primaryCategory, safeSpec);
    }
  });

  return {
    selectedCategories,
    selectedSpecialtiesByCategory,
  };
}

function buildRolesPayload(
  selectedCategories = [],
  selectedSpecialtiesByCategory = {}
) {
  const payload = [];

  normalizeArray(selectedCategories).forEach((categoryValue) => {
    payload.push(`cat:${categoryValue}`);
  });

  Object.entries(normalizeSelectionsMap(selectedSpecialtiesByCategory)).forEach(
    ([categoryValue, specialties]) => {
      specialties.forEach((specialtyLabel) => {
        payload.push(`spec:${categoryValue}::${specialtyLabel}`);
      });
    }
  );

  return payload;
}

/* ─── Icons / Data ───────────────────────────────────── */
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

// dropdown only
const CITY_OPTIONS = LOCATION_OPTIONS.filter(
  (city) => city !== "Όλες οι πόλεις"
);

const CATEGORY_PREVIEW_LIMIT = 4;

/* ─── layout tokens ─────────────────────────────────── */
const WRAP =
  "w-screen max-w-none space-y-6 -ml-[50vw] left-1/2 relative px-4 sm:relative sm:left-auto sm:-ml-0 sm:w-full sm:max-w-none sm:px-0";
const TITLE_WRAP =
  "flex flex-col gap-3 sm:gap-4 mb-6 sm:mb-8 -mx-4 px-4 sm:mx-0 sm:px-0";

/* -------------------------- Premium UI Components ------------------------- */

function PremiumCard({
  title,
  subtitle,
  icon,
  action,
  children,
  className = "",
  gradient = false,
  dirty = false,
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={[
        "w-full h-full flex flex-col group relative overflow-visible transition-all duration-300",
        "mx-0 px-0 rounded-none border-0 bg-transparent shadow-none",
        "sm:px-5 sm:py-5 sm:rounded-3xl sm:border sm:bg-gradient-to-b sm:from-zinc-900/60 sm:to-black/60 sm:backdrop-blur-xl sm:shadow-2xl",
        "sm:border-white/10 sm:hover:shadow-3xl sm:hover:border-white/20",
        gradient ? "premium-gradient-desktop" : "",
        dirty ? "halo-desktop" : "",
        className,
      ].join(" ")}
    >
      <div className="absolute inset-0 hidden sm:block bg-gradient-to-br from-white/5 via-transparent to-zinc-300/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {(title || subtitle || icon || action) && (
        <div className="relative mb-5 flex w-full items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-4 min-w-0">
            {icon && (
              <div className="flex h-12 w-12 items-center justify-center text-white shrink-0 sm:rounded-2xl sm:bg-white/10 sm:ring-1 sm:ring-white/20">
                {icon}
              </div>
            )}

            <div className="min-w-0">
              {title && (
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight break-words">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs sm:text-sm text-zinc-300 mt-1 break-words">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {action && <div className="relative z-10 shrink-0">{action}</div>}
        </div>
      )}

      <div className="relative flex-1 overflow-visible">{children}</div>
    </motion.div>
  );
}

function PremiumButton({
  children,
  variant = "primary",
  size = "default",
  className = "",
  ...props
}) {
  const baseClasses =
    "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary:
      "bg-white text-black hover:bg-zinc-100 shadow-lg hover:shadow-xl hover:shadow-white/25 active:scale-95",
    secondary:
      "bg-zinc-800 text-white hover:bg-zinc-700 shadow-lg hover:shadow-xl hover:shadow-zinc-800/25 active:scale-95",
    outline:
      "border-2 border-white/20 bg-black/50 backdrop-blur-sm text-white hover:bg-white/10 hover:text-white hover:border-white/50",
    ghost: "text-white hover:bg-white/10 hover:text-white",
  };
  const sizes = {
    sm: "px-4 py-2 text-sm rounded-xl",
    default: "px-6 py-3 text-sm rounded-2xl",
    lg: "px-8 py-4 text-base rounded-2xl",
    xl: "px-6 py-4 text-base rounded-2xl",
  };

  return (
    <button
      {...props}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

function PremiumInput({
  label,
  icon,
  className = "",
  dirty = false,
  rounded = "rounded-2xl",
  as = "input",
  ...props
}) {
  const Comp = as;

  return (
    <div
      className={["space-y-2", dirty ? `halo p-2 -m-2 ${rounded}` : ""].join(
        " "
      )}
    >
      {label && (
        <label className="text-sm font-medium text-white flex items-center gap-2">
          {icon && <span className="text-white">{icon}</span>}
          {label}
        </label>
      )}

      <Comp
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

function PremiumSwitch({
  checked,
  onChange,
  label,
  dirty = false,
  disabled = false,
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center",
        dirty ? "halo p-2 -m-2 rounded-full" : ""
      )}
    >
      <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        role="switch"
        aria-checked={checked}
        aria-label={label || "toggle"}
        className={cn(
          "relative inline-flex h-8 w-[54px] items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/20 border",
          checked
            ? "bg-emerald-500 border-emerald-400/50 shadow-[0_8px_22px_rgba(16,185,129,.28)]"
            : "bg-zinc-300 border-zinc-300/80 shadow-[inset_0_1px_2px_rgba(0,0,0,.08)]",
          disabled ? "opacity-70 cursor-not-allowed" : ""
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,.22)]",
            checked ? "left-[26px]" : "left-[2px]"
          )}
        />
      </button>
    </div>
  );
}

function UnsavedChangesModal({ open, saving, onSave, onCancel }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950/95 backdrop-blur-xl p-5 shadow-[0_24px_80px_rgba(0,0,0,.65)]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-2xl bg-amber-500/12 border border-amber-400/20 p-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-200" />
          </div>

          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">
              Έχεις μη αποθηκευμένες αλλαγές
            </h3>
            <p className="mt-1 text-sm text-white/60">
              Θέλεις να αποθηκεύσεις πριν φύγεις;
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
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
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

function FieldChip({ show, text = "Αλλαγή" }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          initial={{ opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.96 }}
          transition={{ duration: 0.18 }}
          className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/8 px-2 py-1 text-[10px] font-medium text-white/80"
        >
          <Sparkles className="h-3 w-3" />
          {text}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/* ─── Main ──────────────────────────────────────────── */
function TrainerProfileForm({ profile, onAfterSave, pvDebug = false }) {
  const navigate = useNavigate();
  const location = useLocation();

  const profileId = profile?.id || null;
  const [savingAll, setSavingAll] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  const [modal, setModal] = useState({
    open: false,
    type: "success",
    title: "",
    message: "",
  });

  const showSuccess = useCallback(
    (msg, title = "Η ενέργεια ολοκληρώθηκε") =>
      setModal({ open: true, type: "success", title, message: msg }),
    []
  );

  const showError = useCallback(
    (msg, title = "Σφάλμα") =>
      setModal({ open: true, type: "error", title, message: msg }),
    []
  );

  const [leaveOpen, setLeaveOpen] = useState(false);
  const pendingNavRef = useRef(null);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    bio: "",
    location: "",
    experienceYears: "",
    isOnline: false,
    onlineLink: "",
    offlineLocation: "",
    selectedCategories: [],
    selectedSpecialtiesByCategory: {},
  });

  const savedRef = useRef(null);

  // hydrate
  useEffect(() => {
    if (!profileId) return;

    const loc = (profile?.location || "").trim();
    const safeLoc = CITY_OPTIONS.includes(loc) ? loc : "";

    const parsedSelections = parseStoredSelections(
      profile?.specialty || "",
      Array.isArray(profile?.roles) ? profile.roles : []
    );

    const next = {
      fullName: profile?.full_name || "",
      phone: profile?.phone || "",
      email: profile?.email || "",
      bio: profile?.bio || "",
      location: safeLoc,
      experienceYears:
        typeof profile?.experience_years === "number"
          ? String(profile.experience_years)
          : "",
      isOnline: !!profile?.is_online,
      onlineLink: profile?.online_link || "",
      offlineLocation: profile?.offline_location || "",
      selectedCategories: parsedSelections.selectedCategories,
      selectedSpecialtiesByCategory:
        parsedSelections.selectedSpecialtiesByCategory,
    };

    const cloned = cloneFormState(next);
    setForm(cloned);
    savedRef.current = cloneFormState(cloned);
  }, [
    profileId,
    profile?.location,
    profile?.full_name,
    profile?.phone,
    profile?.email,
    profile?.bio,
    profile?.experience_years,
    profile?.is_online,
    profile?.online_link,
    profile?.offline_location,
    profile?.specialty,
    profile?.roles,
  ]);

  const selectedCategoryObjects = useMemo(() => {
    return form.selectedCategories
      .map((categoryValue) => getCategoryByValue(categoryValue))
      .filter(Boolean);
  }, [form.selectedCategories]);

  const primaryCategory = selectedCategoryObjects[0] || null;

  const CurrentIconComp = useMemo(() => {
    if (!primaryCategory?.iconKey) return Trophy;
    return ICON_BY_KEY[primaryCategory.iconKey] || Trophy;
  }, [primaryCategory]);

  const previewCategories = useMemo(
    () => TRAINER_CATEGORIES.slice(0, CATEGORY_PREVIEW_LIMIT),
    []
  );

  const extraCategories = useMemo(
    () => TRAINER_CATEGORIES.slice(CATEGORY_PREVIEW_LIMIT),
    []
  );

  const dirtyMap = useMemo(() => {
    const saved = savedRef.current;

    if (!saved) {
      return {
        fullName: false,
        phone: false,
        bio: false,
        location: false,
        experienceYears: false,
        isOnline: false,
        onlineLink: false,
        offlineLocation: false,
        selectedCategories: false,
        selectedSpecialtiesByCategory: false,
      };
    }

    return {
      fullName: form.fullName !== saved.fullName,
      phone: form.phone !== saved.phone,
      bio: form.bio !== saved.bio,
      location: form.location !== saved.location,
      experienceYears: form.experienceYears !== saved.experienceYears,
      isOnline: form.isOnline !== saved.isOnline,
      onlineLink: form.onlineLink !== saved.onlineLink,
      offlineLocation: form.offlineLocation !== saved.offlineLocation,
      selectedCategories: !areArraysEqual(
        form.selectedCategories,
        saved.selectedCategories
      ),
      selectedSpecialtiesByCategory: !areSelectionMapsEqual(
        form.selectedSpecialtiesByCategory,
        saved.selectedSpecialtiesByCategory
      ),
    };
  }, [form]);

  const personalDirty = dirtyMap.fullName || dirtyMap.phone || dirtyMap.bio;

  const professionalDirty =
    dirtyMap.location ||
    dirtyMap.experienceYears ||
    dirtyMap.isOnline ||
    dirtyMap.onlineLink ||
    dirtyMap.offlineLocation;

  const specialtiesDirty =
    dirtyMap.selectedCategories || dirtyMap.selectedSpecialtiesByCategory;

  const somethingDirty = personalDirty || professionalDirty || specialtiesDirty;

  const dirtyCount =
    (personalDirty ? 1 : 0) +
    (professionalDirty ? 1 : 0) +
    (specialtiesDirty ? 1 : 0);

  const totalSelectedSpecialties = useMemo(() => {
    return Object.values(form.selectedSpecialtiesByCategory || {}).reduce(
      (acc, specs) => acc + (Array.isArray(specs) ? specs.length : 0),
      0
    );
  }, [form.selectedSpecialtiesByCategory]);

  const toggleCategory = useCallback((categoryValue) => {
    setForm((prev) => {
      const isActive = prev.selectedCategories.includes(categoryValue);

      if (isActive) {
        const nextCategories = prev.selectedCategories.filter(
          (item) => item !== categoryValue
        );
        const nextMap = { ...prev.selectedSpecialtiesByCategory };
        delete nextMap[categoryValue];

        return {
          ...prev,
          selectedCategories: nextCategories,
          selectedSpecialtiesByCategory: nextMap,
        };
      }

      return {
        ...prev,
        selectedCategories: [...prev.selectedCategories, categoryValue],
        selectedSpecialtiesByCategory: {
          ...prev.selectedSpecialtiesByCategory,
          [categoryValue]:
            prev.selectedSpecialtiesByCategory?.[categoryValue] || [],
        },
      };
    });
  }, []);

  const toggleSpecialty = useCallback((categoryValue, specialtyLabel) => {
    setForm((prev) => {
      const hasCategory = prev.selectedCategories.includes(categoryValue);
      const currentSpecs =
        prev.selectedSpecialtiesByCategory?.[categoryValue] || [];
      const active = currentSpecs.includes(specialtyLabel);

      return {
        ...prev,
        selectedCategories: hasCategory
          ? prev.selectedCategories
          : [...prev.selectedCategories, categoryValue],
        selectedSpecialtiesByCategory: {
          ...prev.selectedSpecialtiesByCategory,
          [categoryValue]: active
            ? currentSpecs.filter((item) => item !== specialtyLabel)
            : [...currentSpecs, specialtyLabel],
        },
      };
    });
  }, []);

  const saveProfile = useCallback(async () => {
    if (!profileId) {
      showError("Απαιτείται σύνδεση για αποθήκευση.");
      return false;
    }

    const primaryCategoryValue = form.selectedCategories[0] || "";
    const rolesPayload = buildRolesPayload(
      form.selectedCategories,
      form.selectedSpecialtiesByCategory
    );

    const normalizedOnlineLink = form.onlineLink.trim();
    const normalizedOfflineLocation = form.offlineLocation.trim();

    const payload = {
      full_name: form.fullName.trim(),
      phone: form.phone.trim(),
      bio: form.bio.trim(),
      specialty: primaryCategoryValue,
      location: form.location.trim(),
      experience_years: form.experienceYears
        ? Number.parseInt(form.experienceYears, 10)
        : null,
      is_online: !!form.isOnline,
      online_link: form.isOnline ? normalizedOnlineLink || null : null,
      offline_location: form.isOnline ? null : normalizedOfflineLocation || null,
      roles: rolesPayload,
      updated_at: new Date().toISOString(),
    };

    if (pvDebug) {
      console.log("[TrainerProfileForm] update payload:", payload);
    }

    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", profileId);

    if (error) {
      showError(error.message || "Αποτυχία αποθήκευσης.");
      return false;
    }

    savedRef.current = cloneFormState(form);
    showSuccess("Οι αλλαγές αποθηκεύτηκαν.", "Επιτυχής αποθήκευση");
    if (typeof onAfterSave === "function") onAfterSave();
    return true;
  }, [form, onAfterSave, profileId, pvDebug, showError, showSuccess]);

  const handleSaveAll = useCallback(async () => {
    if (savingAll) return false;
    if (!somethingDirty) {
      showError("Δεν υπάρχουν αλλαγές για αποθήκευση.", "Καμία αλλαγή");
      return false;
    }

    setSavingAll(true);
    try {
      return await saveProfile();
    } finally {
      setSavingAll(false);
    }
  }, [saveProfile, savingAll, somethingDirty, showError]);

  const handleCancelAll = useCallback(() => {
    if (!savedRef.current) return;
    startTransition(() => {
      setForm(cloneFormState(savedRef.current));
    });
  }, []);

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      await handleSaveAll();
    },
    [handleSaveAll]
  );

  // browser refresh/close guard
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!somethingDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [somethingDirty]);

  // intercept anchor clicks
  useEffect(() => {
    const onClickCapture = (e) => {
      if (!somethingDirty || savingAll || leaveOpen) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const a = e.target?.closest?.("a[href]");
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

      if (hrefAttr.startsWith("#") && hrefAttr === (location.hash || "")) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      pendingNavRef.current = hrefAttr;
      setLeaveOpen(true);
    };

    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [somethingDirty, savingAll, leaveOpen, location.hash]);

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

  const handleLeaveCancel = useCallback(() => {
    setLeaveOpen(false);
    pendingNavRef.current = null;
  }, []);

  const handleLeaveSave = useCallback(async () => {
    const ok = await handleSaveAll();
    if (!ok) return;
    setLeaveOpen(false);
    setTimeout(() => performPendingNav(), 0);
  }, [handleSaveAll, performPendingNav]);

  return (
    <>
      <style>{`
        .safe-bottom {
          padding-bottom: max(16px, env(safe-area-inset-bottom));
        }

        @property --angle {
          syntax: "<angle>";
          inherits: false;
          initial-value: 0deg;
        }

        @keyframes halo-spin {
          to {
            --angle: 360deg;
          }
        }

        .halo {
          position: relative;
          isolation: isolate;
        }

        .halo::before {
          content: "";
          position: absolute;
          inset: -3px;
          border-radius: inherit;
          padding: 3px;
          background: conic-gradient(
            from var(--angle),
            rgba(255, 255, 255, 0.92) 0%,
            rgba(190, 190, 190, 0.28) 18%,
            rgba(255, 255, 255, 0.92) 36%,
            rgba(190, 190, 190, 0.28) 54%,
            rgba(255, 255, 255, 0.92) 72%,
            rgba(190, 190, 190, 0.28) 90%,
            rgba(255, 255, 255, 0.92) 100%
          );
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
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
          background: radial-gradient(
            closest-side,
            rgba(255, 255, 255, 0.18),
            rgba(255, 255, 255, 0.06) 40%,
            transparent 70%
          );
          filter: blur(8px);
          z-index: -2;
          pointer-events: none;
        }

        .premium-gradient-desktop {
          background-image: none;
        }

        .halo-desktop {
          position: static;
          isolation: auto;
        }

        .halo-desktop::before,
        .halo-desktop::after {
          content: none;
        }

        @media (min-width: 640px) {
          .premium-gradient-desktop {
            background-image:
              radial-gradient(circle at top left, rgba(255,255,255,0.06), transparent 35%),
              linear-gradient(to bottom, rgba(24,24,27,0.72), rgba(0,0,0,0.68));
          }

          .halo-desktop {
            position: relative;
            isolation: isolate;
          }

          .halo-desktop::before {
            content: "";
            position: absolute;
            inset: -3px;
            border-radius: inherit;
            padding: 3px;
            background: conic-gradient(
              from var(--angle),
              rgba(255, 255, 255, 0.92) 0%,
              rgba(190, 190, 190, 0.28) 18%,
              rgba(255, 255, 255, 0.92) 36%,
              rgba(190, 190, 190, 0.28) 54%,
              rgba(255, 255, 255, 0.92) 72%,
              rgba(190, 190, 190, 0.28) 90%,
              rgba(255, 255, 255, 0.92) 100%
            );
            -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            animation: halo-spin 8s linear infinite;
            opacity: 0.85;
            z-index: -1;
            pointer-events: none;
          }

          .halo-desktop::after {
            content: "";
            position: absolute;
            inset: -12px;
            border-radius: inherit;
            background: radial-gradient(
              closest-side,
              rgba(255, 255, 255, 0.18),
              rgba(255, 255, 255, 0.06) 40%,
              transparent 70%
            );
            filter: blur(8px);
            z-index: -2;
            pointer-events: none;
          }
        }

        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>

      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={TITLE_WRAP}
      >
        <div className="min-w-0 space-y-3 sm:space-y-4">
          <h1 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
            Επεξεργασία Προφίλ
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400">
            Συμπλήρωσε τα προσωπικά και επαγγελματικά σου στοιχεία
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <FieldChip show={personalDirty} text="Προσωπικά" />
            <FieldChip show={professionalDirty} text="Επαγγελματικά" />
            <FieldChip show={specialtiesDirty} text="Κατηγορίες / Ειδικότητες" />
          </div>
        </div>
      </motion.header>

      <form onSubmit={onSubmit} className={WRAP}>
        <div className="space-y-6 sm:space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-stretch">
            <PremiumCard
              className="min-h-[430px]"
              title="Προσωπικά Στοιχεία"
              subtitle="Βασικά στοιχεία λογαριασμού"
              icon={<UserIcon className="h-6 w-6" />}
              dirty={personalDirty}
              gradient
            >
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <PremiumInput
                    label="Πλήρες Όνομα"
                    icon={<UserIcon className="h-4 w-4" />}
                    value={form.fullName}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, fullName: e.target.value }))
                    }
                    placeholder="Εισάγετε πλήρες όνομα"
                    dirty={dirtyMap.fullName}
                    className="max-sm:text-base"
                  />

                  <PremiumInput
                    label="Τηλέφωνο"
                    icon={<Smartphone className="h-4 w-4" />}
                    value={form.phone}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, phone: e.target.value }))
                    }
                    placeholder="Εισάγετε τηλέφωνο"
                    dirty={dirtyMap.phone}
                    className="max-sm:text-base"
                  />
                </div>

                <PremiumInput
                  label="Email"
                  icon={<Mail className="h-4 w-4" />}
                  type="email"
                  value={form.email}
                  disabled
                  className="opacity-60 cursor-not-allowed max-sm:text-base"
                />

                <PremiumInput
                  as="textarea"
                  label="Βιογραφικό"
                  icon={<FileText className="h-4 w-4" />}
                  value={form.bio}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, bio: e.target.value }))
                  }
                  placeholder="2–4 γραμμές: εμπειρία, προσέγγιση, στόχοι"
                  dirty={dirtyMap.bio}
                  className="min-h-[140px] resize-y"
                />

                <p className="text-xs text-zinc-400">
                  Tip: γράψε τι αποτέλεσμα φέρνεις και σε ποιον απευθύνεσαι.
                </p>
              </div>
            </PremiumCard>

            <PremiumCard
              className="min-h-[430px]"
              title="Επαγγελματικά Στοιχεία"
              subtitle="Κατηγορίες, πόλη και εμπειρία"
              icon={<BriefcaseBusiness className="h-6 w-6" />}
              dirty={professionalDirty || dirtyMap.selectedCategories}
            >
              <div className="space-y-5">
                <div
                  className={cn(
                    "space-y-3",
                    dirtyMap.selectedCategories ? "halo p-2 -m-2 rounded-2xl" : ""
                  )}
                >
                  <label className="text-sm font-medium text-white flex items-center gap-2">
                    {React.createElement(CurrentIconComp, {
                      className: "h-4 w-4",
                    })}
                    Κατηγορίες
                  </label>

                  {/* First 4 categories only */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {previewCategories.map((category) => {
                      const IconComp = ICON_BY_KEY[category.iconKey] || Trophy;
                      const active = form.selectedCategories.includes(category.value);

                      return (
                        <motion.button
                          key={category.value}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          type="button"
                          onClick={() => toggleCategory(category.value)}
                          className={cn(
                            "group flex items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition-all",
                            active
                              ? "bg-white text-black border-white shadow-lg"
                              : "bg-white/5 text-white border-white/10 hover:bg-white/10 hover:border-white/20"
                          )}
                        >
                          <span className="flex items-center gap-3 min-w-0">
                            <span
                              className={cn(
                                "flex h-9 w-9 items-center justify-center rounded-xl shrink-0",
                                active ? "bg-black/10" : "bg-white/10"
                              )}
                            >
                              <IconComp className="h-4 w-4" />
                            </span>

                            <span className="min-w-0">
                              <span className="block text-sm font-medium truncate">
                                {category.label}
                              </span>
                              <span
                                className={cn(
                                  "block text-xs truncate",
                                  active ? "text-black/65" : "text-white/55"
                                )}
                              >
                                {Array.isArray(category.specialties)
                                  ? `${category.specialties.length} ειδικότητες`
                                  : "Χωρίς ειδικότητες"}
                              </span>
                            </span>
                          </span>

                          <span
                            className={cn(
                              "h-4 w-4 rounded-full shrink-0 transition-all",
                              active ? "bg-black/80" : "bg-white/20"
                            )}
                          />
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Dropdown / expandable remaining categories */}
                  {extraCategories.length > 0 && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setCategoriesExpanded((p) => !p)}
                        className="inline-flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-medium text-white transition-all hover:bg-white/[0.08] hover:border-white/20"
                      >
                        <span className="flex items-center gap-2">
                          <span>
                            {categoriesExpanded
                              ? "Λιγότερες κατηγορίες"
                              : `Περισσότερες κατηγορίες (${extraCategories.length})`}
                          </span>
                        </span>

                        {categoriesExpanded ? (
                          <ChevronUp className="h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0" />
                        )}
                      </button>

                      <AnimatePresence initial={false}>
                        {categoriesExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, y: -6 }}
                            animate={{ opacity: 1, height: "auto", y: 0 }}
                            exit={{ opacity: 0, height: 0, y: -6 }}
                            transition={{ duration: 0.24 }}
                            className="overflow-hidden"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3">
                              {extraCategories.map((category) => {
                                const IconComp =
                                  ICON_BY_KEY[category.iconKey] || Trophy;
                                const active = form.selectedCategories.includes(
                                  category.value
                                );

                                return (
                                  <motion.button
                                    key={category.value}
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="button"
                                    onClick={() => toggleCategory(category.value)}
                                    className={cn(
                                      "group flex items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition-all",
                                      active
                                        ? "bg-white text-black border-white shadow-lg"
                                        : "bg-white/5 text-white border-white/10 hover:bg-white/10 hover:border-white/20"
                                    )}
                                  >
                                    <span className="flex items-center gap-3 min-w-0">
                                      <span
                                        className={cn(
                                          "flex h-9 w-9 items-center justify-center rounded-xl shrink-0",
                                          active ? "bg-black/10" : "bg-white/10"
                                        )}
                                      >
                                        <IconComp className="h-4 w-4" />
                                      </span>

                                      <span className="min-w-0">
                                        <span className="block text-sm font-medium truncate">
                                          {category.label}
                                        </span>
                                        <span
                                          className={cn(
                                            "block text-xs truncate",
                                            active
                                              ? "text-black/65"
                                              : "text-white/55"
                                          )}
                                        >
                                          {Array.isArray(category.specialties)
                                            ? `${category.specialties.length} ειδικότητες`
                                            : "Χωρίς ειδικότητες"}
                                        </span>
                                      </span>
                                    </span>

                                    <span
                                      className={cn(
                                        "h-4 w-4 rounded-full shrink-0 transition-all",
                                        active ? "bg-black/80" : "bg-white/20"
                                      )}
                                    />
                                  </motion.button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  <p className="text-xs text-zinc-400">
                    Εμφανίζονται πρώτα οι 4 βασικές κατηγορίες. Μπορείς να
                    ανοίξεις το dropdown για τις υπόλοιπες.
                  </p>
                </div>

                {form.selectedCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedCategoryObjects.map((category) => (
                      <span
                        key={category.value}
                        className="inline-flex items-center gap-2 rounded-full bg-white/8 border border-white/10 px-3 py-1.5 text-[13px] text-white/90"
                      >
                        <span>{category.label}</span>
                        <button
                          type="button"
                          onClick={() => toggleCategory(category.value)}
                          className="text-white/45 hover:text-white transition-colors"
                          aria-label={`Αφαίρεση ${category.label}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div
                    className={cn(
                      "space-y-2",
                      dirtyMap.location ? "halo p-2 -m-2 rounded-2xl" : ""
                    )}
                  >
                    <label className="text-sm font-medium text-white flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Πόλη
                    </label>

                    <div className="relative">
                      <select
                        className="w-full appearance-none rounded-2xl border border-white/20 bg-black/50 backdrop-blur-sm px-4 py-3 pr-10 text-white transition-all duration-200 focus:border-white focus:ring-2 focus:ring-white/20 focus:outline-none"
                        value={form.location}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, location: e.target.value }))
                        }
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
                    </div>
                  </div>

                  <PremiumInput
                    label="Χρόνια Εμπειρίας"
                    icon={<Clock className="h-4 w-4" />}
                    type="number"
                    min="0"
                    max="50"
                    value={form.experienceYears}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        experienceYears: e.target.value,
                      }))
                    }
                    placeholder="π.χ. 5"
                    dirty={dirtyMap.experienceYears}
                    className="max-sm:text-base h-[54px]"
                  />
                </div>

                <div
                  className={cn(
                    "rounded-2xl border-0 bg-transparent p-5 sm:p-6",
                    dirtyMap.isOnline
                      ? "halo-desktop sm:border sm:border-white/10 sm:bg-gradient-to-br sm:from-zinc-900/80 sm:to-black/70"
                      : "sm:border sm:border-white/10 sm:bg-zinc-900/40"
                  )}
                >
                  <div className="flex h-full items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center text-white sm:h-14 sm:w-14 sm:rounded-2xl sm:border sm:border-white/10 sm:bg-gradient-to-br sm:from-white/14 sm:to-white/5 sm:shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_8px_20px_rgba(0,0,0,0.22)]">
                      {form.isOnline ? (
                        <Wifi className="h-5 w-5 text-white sm:h-6 sm:w-6" />
                      ) : (
                        <WifiOff className="h-5 w-5 text-zinc-400 sm:h-6 sm:w-6" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[15px] font-semibold text-white sm:text-base">
                            Διαθέσιμος Online
                          </div>
                        </div>

                        <div className="shrink-0">
                          <PremiumSwitch
                            checked={form.isOnline}
                            onChange={(value) =>
                              setForm((p) => ({ ...p, isOnline: value }))
                            }
                            dirty={dirtyMap.isOnline}
                          />
                        </div>
                      </div>

                      <p className="mt-3 text-[13px] leading-6 text-zinc-400 sm:text-sm sm:leading-7">
                        Αν είναι ενεργό, θα εμφανίζεσαι ως διαθέσιμος για online
                        συνεδρίες. Αν είναι ανενεργό, θα εμφανίζεται το σημείο
                        της δια ζώσης συνεδρίας.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Conditional online/offline section */}
                <AnimatePresence mode="wait" initial={false}>
                  {form.isOnline ? (
                    <motion.div
                      key="online-section"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.22 }}
                      className={cn(
                        "rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5",
                        dirtyMap.onlineLink ? "halo-desktop" : ""
                      )}
                    >
                      <PremiumInput
                        label="Σύνδεσμος Online Συνεδρίας"
                        icon={<Link2 className="h-4 w-4" />}
                        type="url"
                        value={form.onlineLink}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, onlineLink: e.target.value }))
                        }
                        placeholder="https://zoom.us/... ή https://meet.google.com/..."
                        dirty={dirtyMap.onlineLink}
                        className="max-sm:text-base"
                      />

                      <p className="mt-3 text-xs sm:text-sm text-zinc-400 leading-6">
                        Αυτό το link θα αποθηκεύεται στο{" "}
                        <span className="text-white/80 font-medium">
                          online_link
                        </span>{" "}
                        και μπορεί να χρησιμοποιηθεί για Zoom, Google Meet ή άλλο
                        session URL.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="offline-section"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.22 }}
                      className={cn(
                        "rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5",
                        dirtyMap.offlineLocation ? "halo-desktop" : ""
                      )}
                    >
                      <PremiumInput
                        label="Τοποθεσία Δια Ζώσης Συνεδρίας"
                        icon={<MapPin className="h-4 w-4" />}
                        value={form.offlineLocation}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            offlineLocation: e.target.value,
                          }))
                        }
                        placeholder="π.χ. Studio στο Ηράκλειο, οδός / περιοχή / γυμναστήριο"
                        dirty={dirtyMap.offlineLocation}
                        className="max-sm:text-base"
                      />

                      <p className="mt-3 text-xs sm:text-sm text-zinc-400 leading-6">
                        Αυτή η τιμή θα αποθηκεύεται στο{" "}
                        <span className="text-white/80 font-medium">
                          offline_location
                        </span>{" "}
                        και μπορεί να είναι διεύθυνση, studio ή χώρος
                        συνάντησης.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </PremiumCard>
          </div>

          {selectedCategoryObjects.length > 0 && (
            <PremiumCard
              title="Ειδικότητες"
              subtitle={`Διάλεξε ειδικότητες μέσα σε κάθε κατηγορία · ${form.selectedCategories.length} κατηγορί${
                form.selectedCategories.length === 1 ? "α" : "ες"
              }`}
              icon={<Tags className="h-6 w-6" />}
              dirty={specialtiesDirty}
              className="min-h-[320px]"
            >
              <div className="space-y-5">
                {selectedCategoryObjects.map((category) => {
                  const IconComp = ICON_BY_KEY[category.iconKey] || Trophy;
                  const selectedSpecs =
                    form.selectedSpecialtiesByCategory?.[category.value] || [];

                  return (
                    <div
                      key={category.value}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                            <IconComp className="h-4 w-4" />
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-sm sm:text-base font-semibold text-white truncate">
                              {category.label}
                            </h4>
                            <p className="text-xs text-zinc-400">
                              Επίλεξε μία ή περισσότερες ειδικότητες
                            </p>
                          </div>
                        </div>

                        <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/75">
                          {selectedSpecs.length} επιλεγμένες
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {(category.specialties || []).map((spec) => {
                          const active = selectedSpecs.includes(spec);

                          return (
                            <motion.button
                              key={`${category.value}-${spec}`}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.98 }}
                              type="button"
                              onClick={() => toggleSpecialty(category.value, spec)}
                              className={cn(
                                "group flex items-center justify-between gap-2 rounded-2xl px-3 py-3 text-left transition-all border",
                                active
                                  ? "bg-white text-black border-white/30 shadow-lg"
                                  : "bg-white/5 text-white/90 border-white/10 hover:bg-white/10 hover:border-white/20"
                              )}
                            >
                              <span className="text-[13px] truncate" title={spec}>
                                {spec}
                              </span>

                              <span
                                className={cn(
                                  "h-4 w-4 rounded-full shrink-0 transition-all",
                                  active ? "bg-black/80" : "bg-white/20"
                                )}
                              />
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {totalSelectedSpecialties > 0 && (
                  <div className="mt-2">
                    <p className="text-sm sm:text-base text-white/60 mb-4 font-medium">
                      Επιλεγμένες ειδικότητες ({totalSelectedSpecialties}):
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {selectedCategoryObjects.flatMap((category) =>
                        (form.selectedSpecialtiesByCategory?.[category.value] || []).map(
                          (spec) => (
                            <span
                              key={`${category.value}-${spec}-chip`}
                              className="inline-flex items-center gap-2 rounded-full bg-white/8 border border-white/10 px-3 py-1.5 sm:px-4 sm:py-2 text-[13px] sm:text-sm text-white/90"
                            >
                              <span className="max-w-[220px] truncate" title={spec}>
                                {category.label} · {spec}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  toggleSpecialty(category.value, spec)
                                }
                                className="text-white/45 hover:text-white transition-colors"
                                aria-label={`Αφαίρεση ${spec}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </span>
                          )
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </PremiumCard>
          )}
        </div>
      </form>

      <AnimatePresence>
        {somethingDirty && (
          <motion.div
            initial={{ y: 96, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="fixed z-50 left-0 right-0 bottom-0 sm:bottom-4"
          >
            <div className="sm:hidden w-full bg-gradient-to-br from-zinc-900/95 to-black/95 border-t border-white/10 safe-bottom px-4 pt-3 pb-4 shadow-[0_-6px_24px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Sparkles className="h-5 w-5" />
                  <span className="text-sm">
                    Έχεις{" "}
                    <span className="font-semibold text-white">
                      {dirtyCount}
                    </span>{" "}
                    μη αποθηκευμένη{dirtyCount === 1 ? "" : "ς"} αλλαγ
                    {dirtyCount === 1 ? "ή" : "ές"}.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <PremiumButton
                  variant="outline"
                  size="xl"
                  className="w-full py-3"
                  onClick={handleCancelAll}
                  disabled={savingAll}
                  type="button"
                >
                  <X className="h-5 w-5" /> Ακύρωση
                </PremiumButton>

                <PremiumButton
                  size="xl"
                  className="w-full py-3"
                  onClick={handleSaveAll}
                  disabled={savingAll}
                  type="button"
                >
                  {savingAll ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="h-5 w-5" />
                  )}{" "}
                  Αποθήκευση
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
                        Έχεις{" "}
                        <span className="font-semibold text-white">
                          {dirtyCount}
                        </span>{" "}
                        μη αποθηκευμένη{dirtyCount === 1 ? "" : "ς"} αλλαγ
                        {dirtyCount === 1 ? "ή" : "ές"}.
                      </span>
                    </div>

                    <div className="flex-1" />

                    <div className="flex items-center gap-2">
                      <PremiumButton
                        variant="outline"
                        onClick={handleCancelAll}
                        disabled={savingAll}
                        type="button"
                      >
                        <X className="h-4 w-4" /> Ακύρωση
                      </PremiumButton>

                      <PremiumButton
                        onClick={handleSaveAll}
                        disabled={savingAll}
                        type="button"
                      >
                        {savingAll ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}{" "}
                        Αποθήκευση
                      </PremiumButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() =>
              setModal({ open: false, type: "success", title: "", message: "" })
            }
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
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl",
                    modal.type === "success"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  )}
                >
                  {modal.type === "success" ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <AlertTriangle className="h-6 w-6" />
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">
                    {modal.title}
                  </h3>
                  <p className="text-sm text-zinc-300 mt-1">{modal.message}</p>
                </div>

                <button
                  onClick={() =>
                    setModal({
                      open: false,
                      type: "success",
                      title: "",
                      message: "",
                    })
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <UnsavedChangesModal
        open={leaveOpen}
        saving={savingAll}
        onSave={handleLeaveSave}
        onCancel={handleLeaveCancel}
      />
    </>
  );
}

export default memo(TrainerProfileForm);