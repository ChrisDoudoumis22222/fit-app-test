// FILE: src/pages/ServicesMarketplacePage.js
"use client";

import { useEffect, useMemo, useRef, useState, useCallback, memo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  Wifi,
  Calendar as CalendarIcon,
  Sun,
  BadgeCheck,
  User as UserIcon,
  Star,
  Clock,
  HelpCircle,
  Heart,
  ChevronDown,
  ChevronUp,
  Banknote,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient.js";
import { useAuth } from "../AuthProvider.js";
import UserMenu from "../components/UserMenu.js";
import TrainerMenu from "../components/TrainerMenu.js";
import GlassmorphicNavbar from "../components/GlassmorphicNavbar.jsx";
import TrainerSearchNav from "../components/TrainerSearchNav.tsx";

const QuickBookModal = lazy(() => import("../components/QuickBookModal.tsx"));
const GuestBookingAuthModal = lazy(() => import("../components/guest/GuestBookingAuthModal.jsx"));

/* --------------------------- Small UI helpers --------------------------- */
function PremiumButton({ children, variant = "primary", size = "default", className = "", ...props }) {
  const base =
    "w-full inline-flex items-center justify-center gap-2 font-semibold leading-none " +
    "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/10 " +
    "disabled:opacity-50 disabled:pointer-events-none rounded-2xl";

  const variants = {
    primary: "bg-white text-black hover:bg-zinc-100 shadow-lg hover:shadow-xl active:scale-95",
    secondary:
      "bg-zinc-800/80 text-white hover:bg-zinc-700/80 border border-white/10 shadow-lg active:scale-95",
    outline:
      "border border-white/15 bg-black/40 backdrop-blur text-white hover:bg-white/10 hover:border-white/25",
    ghost: "text-white hover:bg-white/10",
  };

  const sizes = {
    sm: "h-10 text-sm px-4",
    default: "h-11 text-sm px-5",
    lg: "h-12 text-base px-6",
  };

  return (
    <button {...props} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </button>
  );
}

/* ------------------------------ constants ------------------------------ */
import { FaDumbbell, FaUsers, FaAppleAlt, FaLaptop, FaRunning, FaMusic, FaHeartbeat } from "react-icons/fa";
import { MdFitnessCenter, MdSelfImprovement, MdHealthAndSafety, MdPsychology } from "react-icons/md";
import { GiMuscleUp, GiSwordsPower, GiWeightLiftingUp, GiBoxingGlove } from "react-icons/gi";
import { TbYoga, TbStethoscope } from "react-icons/tb";

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

const DEFAULT_TRAINER_ICON = MdFitnessCenter;
const DEFAULT_CATEGORY_LABEL = "Γενικός Εκπαιδευτής";

const TRAINER_CATEGORIES = [
  { value: "personal_trainer", label: "Προσωπικός Εκπαιδευτής", iconKey: "dumbbell" },
  { value: "group_fitness_instructor", label: "Εκπαιδευτής Ομαδικών", iconKey: "users" },
  { value: "pilates_instructor", label: "Pilates", iconKey: "pilates" },
  { value: "yoga_instructor", label: "Yoga", iconKey: "yoga" },
  { value: "nutritionist", label: "Διατροφή", iconKey: "apple" },
  { value: "online_coach", label: "Online", iconKey: "laptop" },
  { value: "strength_conditioning", label: "Strength", iconKey: "strength" },
  { value: "calisthenics", label: "Calisthenics", iconKey: "calisthenics" },
  { value: "crossfit_coach", label: "CrossFit", iconKey: "crossfit" },
  { value: "boxing_kickboxing", label: "Boxing", iconKey: "boxing" },
  { value: "martial_arts", label: "Πολεμικές Τέχνες", iconKey: "martial" },
  { value: "dance_fitness", label: "Dance Fitness", iconKey: "dance" },
  { value: "running_coach", label: "Running", iconKey: "running" },
  { value: "physiotherapist", label: "Φυσικοθεραπευτής", iconKey: "physio" },
  { value: "rehab_prevention", label: "Αποκατάσταση", iconKey: "rehab" },
  { value: "wellness_life_coach", label: "Ευεξία", iconKey: "wellness" },
  { value: "performance_psych", label: "Αθλητική Ψυχ.", iconKey: "psychology" },
];

/* ------------------------------ cities ------------------------------ */
const GREEK_CITIES = [
  { value: "all", label: "Όλες οι πόλεις", aliases: [] },
  { value: "Αθήνα", label: "Αθήνα", aliases: ["athens", "athina", "αθηνα", "athena", "athen"] },
  {
    value: "Θεσσαλονίκη",
    label: "Θεσσαλονίκη",
    aliases: ["thessaloniki", "thessalonica", "salonica", "θεσσαλονικη", "saloniki", "thessalonika"],
  },
  { value: "Πάτρα", label: "Πάτρα", aliases: ["patras", "patra", "πατρα", "patrai"] },
  {
    value: "Ηράκλειο",
    label: "Ηράκλειο",
    aliases: ["heraklion", "iraklion", "ηρακλειο", "herakleion", "candia", "crete"],
  },
  { value: "Λάρισα", label: "Λάρισα", aliases: ["larissa", "larisa", "λαρισα"] },
  { value: "Βόλος", label: "Βόλος", aliases: ["volos", "βολος", "volo"] },
  { value: "Ιωάννινα", label: "Ιωάννινα", aliases: ["ioannina", "ιωαννινα", "yannina", "janina", "giannina"] },
  { value: "Καβάλα", label: "Καβάλα", aliases: ["kavala", "καβαλα", "cavala"] },
  { value: "Σέρρες", label: "Σέρρες", aliases: ["serres", "σερρες", "serrai"] },
  { value: "Χανιά", label: "Χανιά", aliases: ["chania", "hania", "χανια", "canea", "khania"] },
  { value: "Αχαρνές", label: "Αχαρνές", aliases: ["acharnes", "αχαρνες", "acharnai", "menidi", "μενιδι"] },
  { value: "Μαρούσι", label: "Μαρούσι", aliases: ["marousi", "μαρουσι", "amarousion", "αμαρουσιον"] },
  { value: "Πειραιάς", label: "Πειραιάς", aliases: ["piraeus", "πειραιας", "pireaus", "pireas"] },
];

/* ------------------- helpers ------------------- */
const pad2 = (n) => String(n).padStart(2, "0");

const toYMD = (input) => {
  if (!input) return "";
  if (typeof input === "string") {
    const m = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    const d = new Date(input);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  const d = new Date(input);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const within = (dateStr, fromStr, toStr) => {
  const d = toYMD(dateStr);
  const f = toYMD(fromStr);
  const t = toYMD(toStr);
  if (!d || !f || !t) return false;
  return d >= f && d <= t;
};

const todayYMD = () => toYMD(new Date());

const weekdayKeyFromDate = (date) => {
  const keys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return keys[new Date(date).getDay()];
};

const formatDate = (d) => {
  try {
    const ymd = toYMD(d);
    const parts = ymd.split("-");
    const local = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return local.toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return d;
  }
};

const formatCurrency = (amount, code = "EUR") => {
  try {
    const opts = { style: "currency", currency: code, maximumFractionDigits: amount % 1 === 0 ? 0 : 2 };
    return new Intl.NumberFormat("el-GR", opts).format(amount);
  } catch {
    return `${amount} ${code}`;
  }
};

const formatDuration = (min) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}ω ${m}’`;
  if (h) return `${h}ω`;
  return `${m}’`;
};

const median = (arr) => {
  if (!arr || arr.length === 0) return null;
  const a = [...arr].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
};

const mode = (arr) => {
  if (!arr || arr.length === 0) return null;
  const map = new Map();
  let best = null;
  let bestCount = 0;

  for (const v of arr) {
    const c = (map.get(v) || 0) + 1;
    map.set(v, c);
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }

  return best;
};

const timeToMinutes = (t) => {
  if (!t) return null;
  const [hh = "0", mm = "0"] = String(t).split(":");
  const h = Number(hh);
  const m = Number(mm);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};

const hasUploadedDiploma = (value) => typeof value === "string" && value.trim().length > 0;

const getTrainerCategory = (specialty) => TRAINER_CATEGORIES.find((c) => c.value === specialty) || null;

const normalizeCategoryArray = (values) => {
  if (!Array.isArray(values) || values.length === 0) return [];

  const out = [];
  const seen = new Set();

  for (const value of values) {
    const v = String(value ?? "").trim();
    if (!v || v === "all" || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }

  return out;
};

const sameStringArrayAsSet = (a = [], b = []) => {
  if (a.length !== b.length) return false;
  const as = [...a].sort();
  const bs = [...b].sort();
  for (let i = 0; i < as.length; i += 1) {
    if (as[i] !== bs[i]) return false;
  }
  return true;
};

const sanitizeSearchToken = (value) =>
  String(value ?? "")
    .replace(/[,%_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractSearchTerms = (raw) => {
  const cleaned = String(raw ?? "")
    .replace(/[|;\n,]+/g, " ")
    .trim();

  if (!cleaned) return [];

  return cleaned
    .split(/\s+/)
    .map(sanitizeSearchToken)
    .filter(Boolean);
};

/* ---------- smart search parsing ---------- */
const normalizeLooseToken = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9α-ω\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const ONLINE_TERMS = [
  "online",
  "remote",
  "virtual",
  "web",
  "διαδικτυακα",
  "διαδικτυακος",
  "διαδικτυακη",
];

const OFFLINE_TERMS = [
  "offline",
  "in person",
  "inperson",
  "onsite",
  "δια ζωσης",
  "διαζωσης",
];

const getCategoryNeedles = (category) => {
  const extras = {
    personal_trainer: ["personal trainer", "pt"],
    group_fitness_instructor: ["group", "group fitness", "ομαδικα", "ομαδικά"],
    pilates_instructor: ["pilates"],
    yoga_instructor: ["yoga"],
    nutritionist: ["nutrition", "διατροφη", "διατροφή", "nutritionist"],
    online_coach: ["online coach", "remote coach"],
    strength_conditioning: ["strength", "conditioning"],
    calisthenics: ["calisthenics"],
    crossfit_coach: ["crossfit", "cross fit"],
    boxing_kickboxing: ["boxing", "kickboxing", "kick boxing"],
    martial_arts: ["martial arts", "mma", "πολεμικες", "πολεμικές"],
    dance_fitness: ["dance", "zumba"],
    running_coach: ["running", "run coach"],
    physiotherapist: ["physio", "physiotherapy", "φυσικοθεραπεια", "φυσικοθεραπεία"],
    rehab_prevention: ["rehab", "recovery", "αποκατασταση", "αποκατάσταση"],
    wellness_life_coach: ["wellness", "life coach", "ευεξια", "ευεξία"],
    performance_psych: ["psychology", "sports psych", "ψυχολογια", "ψυχολογία"],
  };

  return [
    category.value,
    category.value.replace(/_/g, " "),
    category.label,
    ...(extras[category.value] || []),
  ].map(normalizeLooseToken);
};

const parseSmartSearch = (raw) => {
  const rawTerms = extractSearchTerms(raw);

  const out = {
    cats: [],
    city: "all",
    onlyOnline: false,
    onlyOffline: false,
    freeTextTerms: [],
  };

  for (const term of rawTerms) {
    const norm = normalizeLooseToken(term);
    if (!norm) continue;

    if (ONLINE_TERMS.some((needle) => norm.includes(needle))) {
      out.onlyOnline = true;
      continue;
    }

    if (OFFLINE_TERMS.some((needle) => norm.includes(needle))) {
      out.onlyOffline = true;
      continue;
    }

    const cityMatch = GREEK_CITIES.find((city) => {
      const needles = [city.value, city.label, ...(city.aliases || [])].map(normalizeLooseToken);
      return needles.some(
        (needle) => needle && (norm === needle || norm.includes(needle) || needle.includes(norm))
      );
    });

    if (cityMatch && cityMatch.value !== "all") {
      out.city = cityMatch.value;
      continue;
    }

    const catMatch = TRAINER_CATEGORIES.find((category) =>
      getCategoryNeedles(category).some(
        (needle) => needle && (norm === needle || norm.includes(needle) || needle.includes(norm))
      )
    );

    if (catMatch) {
      out.cats.push(catMatch.value);
      continue;
    }

    out.freeTextTerms.push(sanitizeSearchToken(term));
  }

  out.cats = normalizeCategoryArray(out.cats);
  out.freeTextTerms = out.freeTextTerms.filter(Boolean);
  return out;
};

/* ------------------------------ Visual bits ------------------------------ */
function AnimatedParticles() {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const newParticles = [...Array(12)].map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 3}s`,
      animationDuration: `${3 + Math.random() * 4}s`,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-white/15 animate-float"
          style={{ left: p.left, top: p.top, animationDelay: p.animationDelay, animationDuration: p.animationDuration }}
        />
      ))}
    </div>
  );
}

/* ------------------------------ placeholders ------------------------------ */
const AVATAR_PLACEHOLDER = "/placeholder.svg?height=120&width=120&text=Avatar";
const FALLBACK_DATA_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240' width='240' height='240'>
      <defs>
        <linearGradient id='g' x1='0' x2='0' y1='0' y2='1'>
          <stop offset='0%' stop-color='#0b0b0b'/>
          <stop offset='100%' stop-color='#111'/>
        </linearGradient>
      </defs>
      <rect width='100%' height='100%' fill='url(#g)'/>
      <circle cx='120' cy='100' r='46' fill='#2a2a2a'/>
      <rect x='50' y='160' width='140' height='40' rx='20' fill='#2a2a2a'/>
      <text x='120' y='225' fill='#777' font-size='18' text-anchor='middle' font-family='system-ui, sans-serif'>Avatar</text>
    </svg>`
  );

const LargeAvatarCover = memo(function LargeAvatarCover({ url, alt }) {
  const src = url && String(url).trim() ? url : AVATAR_PLACEHOLDER;

  return (
    <img
      src={src}
      loading="lazy"
      decoding="async"
      alt={alt || "trainer"}
      onError={(e) => {
        if (e.currentTarget.dataset.fbk === "1") return;
        e.currentTarget.dataset.fbk = "1";
        e.currentTarget.src = AVATAR_PLACEHOLDER;
        e.currentTarget.onerror = () => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = FALLBACK_DATA_URI;
        };
      }}
      className="w-full h-full object-cover"
    />
  );
});

/* ------------------------------ Skeletons ------------------------------ */
const SkeletonCard = memo(function SkeletonCard({ list = false }) {
  return (
    <div
      className={`overflow-hidden rounded-3xl border border-white/10 bg-white/5 ${
        list ? "flex flex-col lg:flex-row min-h-[260px]" : "flex flex-col min-h-[440px] h-full"
      } animate-pulse`}
    >
      <div className={list ? "h-44 lg:h-auto lg:w-64 bg-white/10" : "h-44 bg-white/10"} />
      <div className={`${list ? "p-6" : "p-5"} space-y-3 flex-1 flex flex-col`}>
        <div className="h-5 w-1/2 bg-white/10 rounded" />
        <div className="h-4 w-1/3 bg-white/10 rounded" />
        <div className="h-7 w-40 bg-white/10 rounded" />
        <div className="h-20 w-full bg-white/10 rounded flex-1" />
        <div className="h-9 w-full bg-white/10 rounded" />
      </div>
    </div>
  );
});

/* ----------------------------- Availability ----------------------------- */
const ALL_DAYS = [
  { key: "monday", label: "Δευ" },
  { key: "tuesday", label: "Τρι" },
  { key: "wednesday", label: "Τετ" },
  { key: "thursday", label: "Πεμ" },
  { key: "friday", label: "Παρ" },
];

const AvailabilityGrid = memo(function AvailabilityGrid({ availability }) {
  const avByDay = useMemo(() => {
    const map = {};
    (availability || []).forEach((slot) => {
      (map[slot.weekday] ||= []).push({
        start: slot.start_time,
        end: slot.end_time,
        online: !!slot.is_online,
      });
    });
    return map;
  }, [availability]);

  if (Object.keys(avByDay).length === 0) {
    return (
      <div className="text-center py-3 px-4 rounded-xl bg-white/5 border border-white/10">
        <Clock className="h-5 w-5 text-zinc-500 mx-auto mb-1" />
        <p className="text-xs text-zinc-500">Δεν έχει οριστεί διαθεσιμότητα</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {ALL_DAYS.map((day) => {
        const slots = avByDay[day.key] || [];
        if (slots.length === 0) return null;

        return (
          <div key={day.key} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs font-medium text-white mb-1.5">{day.label}</div>
            <div className="space-y-1.5">
              {slots.map((slot, idx) => (
                <div
                  key={`${day.key}-${idx}`}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs"
                >
                  <span className="text-zinc-200">
                    {slot.start}–{slot.end}
                  </span>
                  {slot.online && <Wifi className="h-4 w-4 text-emerald-400" />}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
});

/* ------------------------------ Toast / Snackbar ------------------------------ */
function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="fixed inset-x-0 bottom-4 z-[200] flex justify-center px-4 pointer-events-none">
      <div className="w-full max-w-md space-y-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="pointer-events-auto rounded-2xl border border-white/10 bg-black/80 backdrop-blur-md text-white px-4 py-3 shadow-lg"
              role="status"
              onClick={() => onDismiss(t.id)}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ------------------------------ Trainer card ------------------------------ */
const MAX_TAGS_PREVIEW = 4;

const TrainerCard = memo(function TrainerCard({
  list = false,
  trainer,
  onNavigate,
  liked = false,
  onToggleLike,
  onOpenBooking,
}) {
  const [expanded, setExpanded] = useState(false);

  const today = useMemo(() => todayYMD(), []);

  const currentVacation = useMemo(
    () => (trainer.holidays || []).find((h) => within(today, h.starts_on, h.ends_on)) || null,
    [trainer.holidays, today]
  );

  const nextVacation = useMemo(() => {
    const future = (trainer.holidays || []).filter((h) => toYMD(h.starts_on) >= today);
    return future.sort((a, b) => toYMD(a.starts_on).localeCompare(toYMD(b.starts_on)))[0] || null;
  }, [trainer.holidays, today]);

  const cat = getTrainerCategory(trainer.specialty);
  const CatIcon = cat?.iconKey ? ICON_BY_KEY[cat.iconKey] : DEFAULT_TRAINER_ICON;
  const StatusBadgeIcon = trainer.is_online ? Wifi : MapPin;

  const isInteractiveTarget = (target) => {
    if (!(target instanceof Element)) return false;
    return !!target.closest("button, a, input, select, textarea, [role='button'], [data-no-nav]");
  };

  const goProfile = useCallback(() => {
    if (typeof onNavigate === "function") onNavigate(`/trainer/${trainer.id}`);
  }, [onNavigate, trainer.id]);

  const handleCardClick = (e) => {
    if (isInteractiveTarget(e.target)) return;
    goProfile();
  };

  const handleKeyDown = (e) => {
    if (isInteractiveTarget(e.target)) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goProfile();
    }
  };

  return (
    <motion.article
      className={`panel relative overflow-hidden rounded-3xl border border-white/10 transition-all duration-300 ${
        list ? "flex flex-col lg:flex-row" : "flex flex-col"
      } h-full ${list ? "min-h-[260px]" : "min-h-[440px]"} cursor-pointer`}
      role="group"
      aria-label={`${trainer.full_name} — άνοιγμα προφίλ`}
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25 }}
      title="Άνοιγμα προφίλ προπονητή"
    >
      <div className={list ? "relative h-44 lg:h-auto lg:w-64 shrink-0" : "relative h-44"}>
        <LargeAvatarCover url={trainer.avatar_url} alt={trainer.full_name} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike?.();
          }}
          className={`absolute top-3 left-3 h-9 w-9 grid place-items-center rounded-full backdrop-blur-sm border border-white/15 transition-all duration-200 hover:scale-110 ${
            liked ? "bg-red-500/90 text-white" : "bg-black/60 text-white hover:bg-black/80"
          }`}
          title={liked ? "Αφαίρεση από αγαπημένα" : "Αγαπημένο"}
          aria-label={liked ? "Αφαίρεση από αγαπημένα" : "Προσθήκη στα αγαπημένα"}
        >
          {liked ? <Heart className="h-5 w-5 fill-current" /> : <Heart className="h-5 w-5" />}
        </button>

        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <div className="relative group">
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl backdrop-blur-sm text-[10px] sm:text-[11px] font-semibold border ${
                trainer.is_online
                  ? "bg-emerald-500/90 text-white border-emerald-300/40"
                  : "bg-sky-500/90 text-white border-sky-300/40"
              }`}
            >
              <StatusBadgeIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {trainer.is_online ? "Online" : "Δια ζώσης"}
              <HelpCircle className="h-3 w-3" />
            </span>

            <div className="absolute top-full right-0 mt-2 w-64 p-3 panel text-white text-xs rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-[60]">
              <div className="font-medium text-white mb-1.5">
                {trainer.is_online ? "Online Μαθήματα" : "Μαθήματα Δια Ζώσης"}
              </div>
              <div className="text-zinc-300 leading-relaxed">
                {trainer.is_online
                  ? "Αυτός ο εκπαιδευτής προσφέρει μόνο διαδικτυακά μαθήματα."
                  : "Αυτός ο εκπαιδευτής προσφέρει μόνο μαθήματα δια ζώσης."}
              </div>
            </div>
          </div>

          {currentVacation && (
            <span className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-amber-500/90 backdrop-blur-sm text-black text-[11px] font-semibold border border-amber-300/50">
              <Sun className="h-4 w-4" />
              Σε άδεια
            </span>
          )}
        </div>
      </div>

      <div className={`${list ? "flex-1 p-5" : "p-4"} flex flex-col`}>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-white">{trainer.full_name}</h3>

            {hasUploadedDiploma(trainer.diploma_url) && (
              <div className="relative group" data-no-nav>
                <BadgeCheck
                  className="h-5 w-5 text-blue-400 flex-shrink-0 cursor-help"
                  title="Πιστοποιημένος προπονητής"
                />
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 panel text-white text-xs rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-[60]">
                  <div className="font-medium text-white mb-1.5 flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-blue-400" />
                    Πιστοποιημένος Προπονητής
                  </div>
                  <div className="text-zinc-300 leading-relaxed">
                    Ο προπονητής έχει ανεβάσει δίπλωμα και έχει επαληθευτεί.
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {trainer.location || "N/A"}
            </span>
            <span className="inline-flex items-center gap-1">
              <BadgeCheck className="h-4 w-4" />
              {trainer.experience_years || "<1"} έτη
            </span>
          </div>

          <div className="mt-2 flex items-center gap-1" data-no-nav>
            {[...Array(5)].map((_, i) => {
              const r = trainer.rating || 0;
              const isFilled = i < Math.floor(r);
              const isHalf = i === Math.floor(r) && r % 1 >= 0.5;

              if (isHalf) {
                return (
                  <div key={i} className="relative h-4 w-4">
                    <Star className="h-4 w-4 text-zinc-600 fill-current absolute" />
                    <div className="overflow-hidden w-1/2">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    </div>
                  </div>
                );
              }

              return (
                <Star
                  key={i}
                  className={`h-4 w-4 ${isFilled ? "text-yellow-400 fill-current" : "text-zinc-600 fill-current"}`}
                />
              );
            })}

            <span className="ml-1 text-[11px] text-zinc-400">
              {trainer.rating > 0 ? `${trainer.rating.toFixed(1)} • ${trainer.reviewCount || 0} κριτ.` : "—"}
            </span>
          </div>

          <div
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium"
            data-no-nav
          >
            <CatIcon className="h-4 w-4 text-zinc-300" />
            {cat?.label || DEFAULT_CATEGORY_LABEL}
          </div>

          {Array.isArray(trainer.tags) && trainer.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5" data-no-nav>
              {trainer.tags.slice(0, MAX_TAGS_PREVIEW).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300 text-[11px]"
                >
                  {tag}
                </span>
              ))}
              {trainer.tags.length > MAX_TAGS_PREVIEW && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-[11px]">
                  +{trainer.tags.length - MAX_TAGS_PREVIEW} περισσότερα
                </span>
              )}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2" data-no-nav>
            {typeof trainer.typicalPrice === "number" && trainer.typicalPrice > 0 && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium">
                <Banknote className="h-4 w-4" />
                {formatCurrency(trainer.typicalPrice, trainer.currencyCode || "EUR")} / συνεδρία
              </span>
            )}

            {trainer.typicalDurationMin ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium">
                <Clock className="h-4 w-4" />
                {formatDuration(trainer.typicalDurationMin)}
              </span>
            ) : null}
          </div>

          {!currentVacation &&
            trainer.holidays?.length > 0 &&
            (trainer.holidays || []).some((h) => toYMD(h.starts_on) >= today) && (
              <div
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs"
                data-no-nav
              >
                <Sun className="h-4 w-4" />
                {nextVacation ? (
                  <>
                    Προσεχής άδεια: {formatDate(nextVacation.starts_on)}–{formatDate(nextVacation.ends_on)}
                  </>
                ) : (
                  "Προσεχείς άδειες"
                )}
              </div>
            )}
        </div>

        <div className="mt-4 space-y-2">
          <PremiumButton
            variant="secondary"
            size="default"
            onClick={(e) => {
              e.stopPropagation();
              goProfile();
            }}
            title="Προβολή Προφίλ"
          >
            <UserIcon className="h-4 w-4" />
            Προβολή
          </PremiumButton>

          <PremiumButton
            variant="outline"
            size="default"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            aria-expanded={expanded}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Δες περισσότερα
          </PremiumButton>
        </div>

        <div className="mt-auto" />

        <div className="pt-4">
          <PremiumButton
            size="lg"
            onClick={(e) => {
              e.stopPropagation();
              onOpenBooking?.(trainer);
            }}
            title="Κράτηση τώρα"
          >
            <CalendarIcon className="h-5 w-5" />
            Κράτηση τώρα
          </PremiumButton>
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
              data-no-nav
            >
              <div className="mt-4 border-t border-white/10 pt-4">
                <div className="flex items-center gap-2 text-white mb-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span className="font-medium text-sm">Διαθεσιμότητα</span>
                </div>

                <AvailabilityGrid availability={trainer.availability} />

                {Array.isArray(trainer.tags) && trainer.tags.length > 0 && (
                  <>
                    <div className="mt-4 text-sm text-white font-medium">Ετικέτες</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {trainer.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300 text-[11px]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
});

/* ------------------------------ Card08Lite ------------------------------ */
function Card08Lite({
  title = "Modern Design Systems",
  subtitle = "Explore the fundamentals of contemporary UI design",
  image = null,
  badge = { text: "New" },
  isOnline = false,
  onDetails,
  onBookNow,
  IconComp,
  liked = false,
  onToggleLike,
}) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleClick = (e) => {
    e.preventDefault();
    setIsFlipped((v) => !v);
  };

  const StatusIcon = isOnline ? Wifi : MapPin;
  const SafeIcon = IconComp || DEFAULT_TRAINER_ICON;

  const titleLength = (title || "").trim().length;
  const titleSizeClass =
    titleLength > 22
      ? "text-[10px] sm:text-[12px] md:text-[14px]"
      : titleLength > 16
      ? "text-[11px] sm:text-[13px] md:text-[15px]"
      : "text-[12px] sm:text-[15px] md:text-base";

  return (
    <div className="block w-full group" style={{ perspective: "1000px" }}>
      <div
        className={`relative w-full transition-transform duration-500 will-change-transform ${
          isFlipped ? "[transform:rotateY(180deg)]" : ""
        }`}
        onClick={handleClick}
        style={{
          transformStyle: "preserve-3d",
          minHeight: 220,
          height: "clamp(220px, 58vw, 320px)",
        }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 w-full h-full rounded-[22px] overflow-hidden bg-zinc-950/95 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="relative h-full overflow-hidden">
            <img
              src={image || AVATAR_PLACEHOLDER}
              alt={title}
              loading="lazy"
              decoding="async"
              className="object-cover w-full h-full"
              onError={(e) => {
                if (e.currentTarget.dataset.fbk === "1") {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = FALLBACK_DATA_URI;
                  return;
                }
                e.currentTarget.dataset.fbk = "1";
                e.currentTarget.src = AVATAR_PLACEHOLDER;
              }}
            />

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleLike?.();
              }}
              className={`absolute top-2 left-2 sm:top-3 sm:left-3 h-8 w-8 sm:h-9 sm:w-9 grid place-items-center rounded-full border transition-all duration-200 hover:scale-110 ${
                liked
                  ? "bg-red-500/90 text-white border-white/10"
                  : "bg-black/55 text-white border-white/10 hover:bg-black/75 backdrop-blur-sm"
              }`}
              aria-label={liked ? "Αφαίρεση από αγαπημένα" : "Προσθήκη στα αγαπημένα"}
              title={liked ? "Αφαίρεση από αγαπημένα" : "Αγαπημένο"}
            >
              {liked ? (
                <Heart className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
              ) : (
                <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </button>
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-black/5 pointer-events-none" />

          <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-medium border backdrop-blur-sm ${
                isOnline
                  ? "bg-emerald-500/90 text-white border-emerald-300/30"
                  : "bg-sky-500/90 text-white border-sky-300/30"
              }`}
            >
              <StatusIcon className="w-3 h-3" />
              {badge?.text || (isOnline ? "Online" : "Δια ζώσης")}
            </span>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-4">
            <div
              className="
                rounded-2xl p-2.5 sm:p-4
                border border-white/10
                bg-black/35
                shadow-[0_8px_30px_rgba(0,0,0,0.4)]
                supports-[backdrop-filter]:backdrop-blur-md
              "
              style={{ backdropFilter: "saturate(140%) blur(10px)" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-1.5 sm:gap-2 min-w-0">
                    <SafeIcon className="mt-0.5 w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-zinc-200 shrink-0" />

                    <h3
                      className={`min-w-0 flex-1 ${titleSizeClass} font-semibold text-white leading-tight break-words line-clamp-2`}
                      title={title}
                    >
                      {title}
                    </h3>
                  </div>

                  <p
                    className="mt-1 text-[9px] sm:text-[11px] md:text-[12px] text-zinc-200/90 leading-snug break-words line-clamp-2"
                    title={subtitle}
                  >
                    {subtitle}
                  </p>
                </div>

                <div
                  className="
                    p-1.5 rounded-full shrink-0
                    border border-white/15
                    bg-white/10
                    supports-[backdrop-filter]:backdrop-blur-md
                  "
                  style={{ backdropFilter: "saturate(140%) blur(10px)" }}
                >
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 w-full h-full rounded-[22px] overflow-hidden bg-zinc-950/95 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.45)] flex flex-col items-center justify-center gap-3 p-4 sm:p-5"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="text-center space-y-2 mb-1 min-w-0 w-full">
            <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto bg-white/5 rounded-2xl grid place-items-center border border-white/10">
              <SafeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-200" />
            </div>

            <h3 className="text-sm sm:text-base font-semibold text-white line-clamp-2 break-words">{title}</h3>
            <p className="text-[11px] sm:text-sm text-zinc-400 line-clamp-2 break-words">{subtitle}</p>
          </div>

          <div className="space-y-2 w-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDetails?.();
              }}
              className="w-full px-3 py-2.5 rounded-xl text-[12px] sm:text-sm font-medium border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <UserIcon className="w-4 h-4" />
              Λεπτομέρειες
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onBookNow?.();
              }}
              className="w-full px-3 py-2.5 rounded-xl text-[12px] sm:text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2 bg-white text-black hover:bg-zinc-200"
            >
              <CalendarIcon className="w-4 h-4" />
              Κράτηση
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- Page --------------------------------- */
const PAGE_SIZE = 12;
const MAX_EXTRA_PAGES_PER_LOAD = 3;
const RESET_SCAN_CAP = 12;

export default function ServicesMarketplacePage() {
  useEffect(() => {
    document.documentElement.classList.add("bg-black");
    document.body.classList.add("bg-black");
    return () => {
      document.documentElement.classList.remove("bg-black");
      document.body.classList.remove("bg-black");
    };
  }, []);

  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  const role = useMemo(() => {
    if (profile?.role === "trainer") return "trainer";
    if (profile?.id) return "user";
    return "guest";
  }, [profile?.role, profile?.id]);

  const MenuComponent = role === "trainer" ? TrainerMenu : role === "user" ? UserMenu : GlassmorphicNavbar;

  const [toasts, setToasts] = useState([]);
  const pushToast = useCallback((message) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2200);
  }, []);
  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const requireAuth = useCallback(
    (nextPath = window.location.pathname) => {
      if (!profile?.id) {
        pushToast("Συνδέσου για να συνεχίσεις.");
        navigate(`/login?next=${encodeURIComponent(nextPath)}`);
        return false;
      }
      return true;
    },
    [profile?.id, navigate, pushToast]
  );

  const [items, setItems] = useState([]);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState("newest");

  const [catFiltersState, setCatFiltersState] = useState([]);
  const setCatFilters = useCallback((next) => {
    const normalized = normalizeCategoryArray(next);
    setCatFiltersState((prev) => (sameStringArrayAsSet(prev, normalized) ? prev : normalized));
  }, []);
  const catFilters = catFiltersState;

  const [onlyOnline, setOnlyOnline] = useState(false);
  const [excludeVacation, setExcludeVacation] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");

  const smartSearch = useMemo(() => parseSmartSearch(searchTerm), [searchTerm]);

  const effectiveCity = useMemo(
    () => (selectedCity !== "all" ? selectedCity : smartSearch.city),
    [selectedCity, smartSearch.city]
  );

  const hasClientSideNarrowing = useMemo(
    () => effectiveCity !== "all" || excludeVacation || Boolean(selectedDate),
    [effectiveCity, excludeVacation, selectedDate]
  );

  const [lastResolvedResults, setLastResolvedResults] = useState(0);

  useEffect(() => {
    if (!initialLoading && !loadingPage) {
      setLastResolvedResults(items.length);
    }
  }, [items.length, initialLoading, loadingPage]);

  const navResults =
    (initialLoading || loadingPage) && items.length === 0
      ? lastResolvedResults
      : items.length;

  const [likedTrainerIds, setLikedTrainerIds] = useState([]);
  const [bookingTrainer, setBookingTrainer] = useState(null);
  const [guestBookingTrainer, setGuestBookingTrainer] = useState(null);

  const sentinelRef = useRef(null);
  const observerRef = useRef(null);

  const queryKeyRef = useRef(0);
  const pageRef = useRef(0);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        if (!profile?.id) {
          setLikedTrainerIds([]);
          return;
        }

        const { data, error } = await supabase.from("trainer_likes").select("trainer_id").eq("user_id", profile.id);
        if (!error) setLikedTrainerIds((data || []).map((r) => r.trainer_id));
      } catch {
        // ignore
      }
    })();
  }, [profile?.id]);

  const toggleLikeTrainer = useCallback(
    async (trainerId) => {
      if (!profile?.id) return;

      const already = likedTrainerIds.includes(trainerId);

      if (already) {
        const { error } = await supabase
          .from("trainer_likes")
          .delete()
          .eq("user_id", profile.id)
          .eq("trainer_id", trainerId);

        if (!error) setLikedTrainerIds((prev) => prev.filter((id) => id !== trainerId));
      } else {
        const { error } = await supabase.from("trainer_likes").insert([{ user_id: profile.id, trainer_id: trainerId }]);
        if (!error) setLikedTrainerIds((prev) => [...prev, trainerId]);
      }
    },
    [likedTrainerIds, profile?.id]
  );

  const handleToggleLike = useCallback(
    (trainer) => {
      if (!requireAuth(`/trainer/${trainer.id}`)) return;
      const wasLiked = likedTrainerIds.includes(trainer.id);
      void toggleLikeTrainer(trainer.id);
      pushToast(
        wasLiked
          ? "Ο επαγγελματίας αφαιρέθηκε από τα αγαπημένα"
          : "Ο επαγγελματίας αποθηκεύτηκε στα αγαπημένα"
      );
    },
    [likedTrainerIds, toggleLikeTrainer, pushToast, requireAuth]
  );

  const handleOpenBooking = useCallback(
    (trainer) => {
      if (!trainer) return;

      if (role === "guest") {
        setGuestBookingTrainer(trainer);
        return;
      }

      setBookingTrainer(trainer);
    },
    [role]
  );

  useEffect(() => {
    if (profile?.id && guestBookingTrainer) {
      setGuestBookingTrainer(null);
    }
  }, [profile?.id, guestBookingTrainer]);

  const buildProfilesQuery = useCallback(() => {
    let q = supabase
      .from("profiles")
      .select(
        "id, email, full_name, role, avatar_url, created_at, updated_at, bio, specialty, phone, location, experience_years, certifications, diploma_url, roles, is_online, has_seen_welcome",
        { count: "exact" }
      )
      .eq("role", "trainer")
      .not("diploma_url", "is", null)
      .neq("diploma_url", "");

    const effectiveCats = normalizeCategoryArray([...catFilters, ...smartSearch.cats]);

    if (effectiveCats.length === 1) {
      q = q.eq("specialty", effectiveCats[0]);
    } else if (effectiveCats.length > 1) {
      q = q.in("specialty", effectiveCats);
    }

    const effectiveOnlyOnline = onlyOnline || smartSearch.onlyOnline;
    const effectiveOnlyOffline = !effectiveOnlyOnline && smartSearch.onlyOffline;

    if (effectiveOnlyOnline) q = q.eq("is_online", true);
    if (effectiveOnlyOffline) q = q.eq("is_online", false);

    const searchTerms = smartSearch.freeTextTerms
      .map(sanitizeSearchToken)
      .filter(Boolean);

    if (searchTerms.length) {
      const clauses = searchTerms.flatMap((term) => [
        `full_name.ilike.%${term}%`,
        `location.ilike.%${term}%`,
        `specialty.ilike.%${term}%`,
      ]);
      q = q.or(clauses.join(","));
    }

    switch (sortBy) {
      case "name":
        q = q.order("full_name", { ascending: true });
        break;
      case "experience":
        q = q.order("experience_years", { ascending: false, nullsFirst: true });
        break;
      case "rating":
        q = q.order("created_at", { ascending: false });
        break;
      default:
        q = q.order("created_at", { ascending: false });
    }

    return q;
  }, [catFilters, onlyOnline, smartSearch, sortBy]);

  const hydrateTrainers = useCallback(async (rows) => {
    const eligibleRows = (rows || []).filter((r) => hasUploadedDiploma(r?.diploma_url));
    const ids = eligibleRows.map((r) => r.id);

    if (ids.length === 0) return [];

    const [
      { data: avs },
      { data: hols },
      { data: reviews },
      { data: pricing },
      { data: bookings },
    ] = await Promise.all([
      supabase.from("trainer_availability").select("trainer_id, weekday, start_time, end_time, is_online").in("trainer_id", ids),
      supabase.from("trainer_holidays").select("trainer_id, starts_on, ends_on, reason").in("trainer_id", ids),
      supabase.from("trainer_reviews").select("trainer_id, rating").in("trainer_id", ids),
      supabase.from("trainer_pricing").select("trainer_id, base_price, online_discount, specialty_pricing, currency_code").in("trainer_id", ids),
      supabase
        .from("trainer_bookings")
        .select("trainer_id, duration_min, status, created_at")
        .in("trainer_id", ids)
        .in("status", ["accepted", "completed"])
        .order("created_at", { ascending: false }),
    ]);

    const avByTrainer = (avs ?? []).reduce((m, r) => {
      (m[r.trainer_id] ||= []).push(r);
      return m;
    }, {});

    const holByTrainer = (hols ?? []).reduce((m, r) => {
      (m[r.trainer_id] ||= []).push(r);
      return m;
    }, {});

    const ratingsByTrainer = (reviews ?? []).reduce((m, r) => {
      (m[r.trainer_id] ||= []).push(r.rating);
      return m;
    }, {});

    const pricingByTrainer = (pricing ?? []).reduce((m, r) => {
      m[r.trainer_id] = r;
      return m;
    }, {});

    const bookingsByTrainer = (bookings ?? []).reduce((m, r) => {
      (m[r.trainer_id] ||= []).push(r);
      return m;
    }, {});

    const computeDisplayPrice = (prObj, specialty, isOnline) => {
      if (!prObj) return { price: null, currency: "EUR" };

      let base = Number(prObj.base_price ?? 0);
      const specMap = prObj.specialty_pricing && typeof prObj.specialty_pricing === "object" ? prObj.specialty_pricing : {};
      const specOverride = Number(specMap?.[specialty]);

      if (Number.isFinite(specOverride) && specOverride > 0) base = specOverride;

      const discountPct = Number(prObj.online_discount ?? 0);
      if (isOnline && discountPct > 0) base = base * (1 - discountPct / 100);

      return { price: base > 0 ? base : null, currency: prObj.currency_code || "EUR" };
    };

    return eligibleRows.map((t) => {
      const trainerReviews = ratingsByTrainer[t.id] || [];
      const avgRating =
        trainerReviews.length > 0 ? trainerReviews.reduce((s, r) => s + r, 0) / trainerReviews.length : 0;

      const pr = pricingByTrainer[t.id] || null;
      const { price: typicalPrice, currency: currencyCode } = computeDisplayPrice(pr, t.specialty, t.is_online);

      const bs = bookingsByTrainer[t.id] || [];
      const durFromBookings = bs.map((b) => Number(b.duration_min)).filter((n) => Number.isFinite(n) && n > 0);
      let typicalDurationMin = mode(durFromBookings) ?? median(durFromBookings) ?? null;

      if (!typicalDurationMin) {
        const av = avByTrainer[t.id] ?? [];
        const slotDurations = av
          .map((s) => {
            const start = timeToMinutes(s.start_time);
            const end = timeToMinutes(s.end_time);
            return start != null && end != null && end > start ? end - start : null;
          })
          .filter((n) => Number.isFinite(n) && n > 0);

        typicalDurationMin = mode(slotDurations) ?? median(slotDurations) ?? null;
      }

      return {
        ...t,
        tags: Array.isArray(t.roles) ? t.roles : [],
        availability: (avByTrainer[t.id] ?? []).sort(
          (a, b) => ALL_DAYS.findIndex((d) => d.key === a.weekday) - ALL_DAYS.findIndex((d) => d.key === b.weekday)
        ),
        holidays: (holByTrainer[t.id] ?? []).sort((a, b) => toYMD(b.starts_on).localeCompare(toYMD(a.starts_on))),
        rating: avgRating,
        reviewCount: trainerReviews.length,
        typicalPrice,
        currencyCode,
        typicalDurationMin,
      };
    });
  }, []);

  const matchesCity = (trainerLocation, cityValue) => {
    if (!trainerLocation || cityValue === "all") return true;

    const city = GREEK_CITIES.find((c) => c.value === cityValue);
    if (!city) return false;

    const locationLower = String(trainerLocation).toLowerCase().trim();
    if (locationLower.includes(city.value.toLowerCase())) return true;

    return city.aliases.some(
      (alias) => locationLower.includes(alias.toLowerCase()) || alias.toLowerCase().includes(locationLower)
    );
  };

  const applyClientFilters = useCallback(
    (arr) => {
      let out = [...arr];

      out = out.filter((t) => hasUploadedDiploma(t?.diploma_url));

      if (effectiveCity !== "all") {
        out = out.filter((t) => matchesCity(t.location, effectiveCity));
      }

      if (excludeVacation) {
        const today = todayYMD();
        out = out.filter((t) => !(t.holidays || []).some((h) => within(today, h.starts_on, h.ends_on)));
      }

      if (selectedDate) {
        const base = new Date();
        const target =
          selectedDate === "tomorrow"
            ? new Date(base.getTime() + 24 * 60 * 60 * 1000)
            : base;

        const dayKey = selectedDate === "week" ? null : weekdayKeyFromDate(target);

        out = out.filter((t) => {
          const av = t.availability || [];
          if (selectedDate === "week") return av.length > 0;
          return av.some((s) => s.weekday === dayKey);
        });
      }

      if (sortBy === "rating") {
        out.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      }

      return out;
    },
    [effectiveCity, excludeVacation, selectedDate, sortBy]
  );

  const loadMore = useCallback(
    async (
      forcedKey = null,
      minToAdd = PAGE_SIZE,
      pageScanCap = MAX_EXTRA_PAGES_PER_LOAD
    ) => {
      const key = forcedKey ?? queryKeyRef.current;

      if (loadingRef.current) return;
      if (!hasMoreRef.current && forcedKey == null) return;

      loadingRef.current = true;
      setLoadingPage(true);
      setErrorMsg("");

      try {
        let added = 0;
        let pagesScanned = 0;
        let localNew = [];

        const existingIds = new Set(itemsRef.current.map((t) => t.id));

        while (
          added < minToAdd &&
          (hasMoreRef.current || pagesScanned === 0) &&
          pagesScanned < pageScanCap
        ) {
          const from = (pageRef.current + pagesScanned) * PAGE_SIZE;
          const to = from + PAGE_SIZE - 1;

          if (key !== queryKeyRef.current) break;

          const { data: rows, error } = await buildProfilesQuery().range(from, to);

          if (key !== queryKeyRef.current) break;

          if (error) {
            setErrorMsg(error.message || "Σφάλμα φόρτωσης εκπαιδευτών.");
            break;
          }

          pagesScanned += 1;

          const pageHasMore = (rows?.length || 0) === PAGE_SIZE;
          if (!pageHasMore) {
            hasMoreRef.current = false;
          }

          const hydrated = await hydrateTrainers(rows || []);
          const filteredBatch = applyClientFilters(hydrated);

          const uniqueToAdd = filteredBatch.filter((t) => !existingIds.has(t.id));
          uniqueToAdd.forEach((t) => existingIds.add(t.id));

          localNew = localNew.concat(uniqueToAdd);
          added += uniqueToAdd.length;

          if (!pageHasMore) break;
        }

        if (key === queryKeyRef.current) {
          setItems((prev) => [...prev, ...localNew]);
          pageRef.current += Math.max(1, pagesScanned);
          setPage(pageRef.current);
          setHasMore(hasMoreRef.current);
        }
      } catch {
        if (key === queryKeyRef.current) {
          setErrorMsg("Κάτι πήγε στραβά κατά τη φόρτωση.");
        }
      } finally {
        if (key === queryKeyRef.current) {
          loadingRef.current = false;
          setLoadingPage(false);
          setInitialLoading(false);
        }
      }
    },
    [applyClientFilters, buildProfilesQuery, hydrateTrainers]
  );

  useEffect(() => {
    queryKeyRef.current += 1;
    pageRef.current = 0;
    hasMoreRef.current = true;
    loadingRef.current = false;

    setItems([]);
    setPage(0);
    setHasMore(true);
    setErrorMsg("");
    setInitialLoading(true);

    const currentKey = queryKeyRef.current;

    const initialMinToAdd = hasClientSideNarrowing
      ? Number.MAX_SAFE_INTEGER
      : PAGE_SIZE;

    const initialScanCap = hasClientSideNarrowing
      ? Number.MAX_SAFE_INTEGER
      : RESET_SCAN_CAP;

    void loadMore(currentKey, initialMinToAdd, initialScanCap);
  }, [
    searchTerm,
    sortBy,
    catFilters,
    onlyOnline,
    excludeVacation,
    selectedDate,
    selectedCity,
    hasClientSideNarrowing,
    loadMore,
  ]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMoreRef.current && !loadingRef.current) {
          void loadMore(null, PAGE_SIZE, MAX_EXTRA_PAGES_PER_LOAD);
        }
      },
      { rootMargin: "600px 0px" }
    );

    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current && observerRef.current.disconnect();
  }, [loadMore]);

  const bootLoading = (loading || initialLoading) && items.length === 0;

  if (bootLoading) {
    return (
      <div className="min-h-screen bg-black text-white relative overflow-hidden">
        <div className="fixed inset-0 -z-50 bg-black">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.08),transparent_55%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(45deg,transparent_48%,rgba(255,255,255,0.02)_49%,rgba(255,255,255,0.02)_51%,transparent_52%)] bg-[length:20px_20px] animate-slide-diagonal" />
        <AnimatedParticles />

        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-12 pt-10">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-6 items-stretch">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="fixed inset-0 -z-50 bg-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.08),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(45deg,transparent_48%,rgba(255,255,255,0.02)_49%,rgba(255,255,255,0.02)_51%,transparent_52%)] bg-[length:20px_20px] animate-slide-diagonal" />
      <AnimatedParticles />

      <style>{`
        :root { --side-w: 0px; --nav-h: 64px; }
        @media (min-width: 640px){ :root { --nav-h: 72px; } }
        @media (min-width: 1024px){ :root { --side-w: 280px; --nav-h: 0px; } }
        @media (min-width: 1280px){ :root { --side-w: 320px; } }
      `}</style>

      <div className="relative min-h-screen overflow-x-hidden">
        <div className="lg:pl-[calc(var(--side-w)+8px)] pl-0 lg:pt-0 pt-[var(--nav-h)] transition-[padding]">
          <div className="relative z-10">
            {MenuComponent ? <MenuComponent /> : null}

            {role === "guest" && (
              <div aria-hidden className="w-full">
                <div className="h-16 sm:h-20 md:h-28 lg:h-40 xl:h-56" />
              </div>
            )}

            <main className="mx-auto w-full px-0 sm:px-6 lg:px-12 xl:px-16 pt-0 sm:pt-6 lg:pt-10 pb-[80px] lg:pb-[100px]">
              <TrainerSearchNav
                results={navResults}
                search={searchTerm}
                setSearch={setSearchTerm}
                sort={sortBy}
                setSort={setSortBy}
                cats={catFilters}
                setCats={setCatFilters}
                onlyOnline={onlyOnline}
                setOnlyOnline={setOnlyOnline}
                excludeVacation={excludeVacation}
                setExcludeVacation={setExcludeVacation}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                selectedCity={selectedCity}
                setSelectedCity={setSelectedCity}
                onChange={({ view }) => {
                  setViewMode(view ?? "grid");
                }}
                categories={TRAINER_CATEGORIES}
                cities={GREEK_CITIES}
              />

              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-200 px-6 py-4 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3">
                    <X className="h-5 w-5 text-red-400" />
                    <span>{errorMsg}</span>
                  </div>
                </motion.div>
              )}

              {items.length === 0 ? (
                <Empty search={searchTerm} />
              ) : viewMode === "grid" ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-6 px-2 sm:px-0 items-stretch">
                    {items.map((t) => {
                      const cat = getTrainerCategory(t.specialty);
                      const IconComp = cat?.iconKey ? ICON_BY_KEY[cat.iconKey] : DEFAULT_TRAINER_ICON;

                      return (
                        <div key={t.id} className="w-full">
                          <Card08Lite
                            title={t.full_name}
                            subtitle={[
                              t.location || "—",
                              cat?.label || DEFAULT_CATEGORY_LABEL,
                              typeof t.typicalPrice === "number" && t.typicalPrice > 0
                                ? `${formatCurrency(t.typicalPrice, t.currencyCode || "EUR")} / συνεδρία`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" • ")}
                            image={t.avatar_url || null}
                            badge={{ text: t.is_online ? "Online" : "Δια ζώσης" }}
                            isOnline={!!t.is_online}
                            IconComp={IconComp}
                            onDetails={() => navigate(`/trainer/${t.id}`)}
                            onBookNow={() => {
                              handleOpenBooking(t);
                            }}
                            liked={likedTrainerIds.includes(t.id)}
                            onToggleLike={() => handleToggleLike(t)}
                          />
                        </div>
                      );
                    })}

                    {loadingPage &&
                      Array.from({ length: Math.min(6, PAGE_SIZE / 2) }).map((_, i) => (
                        <div key={`sk-${i}`} className="w-full">
                          <SkeletonCard />
                        </div>
                      ))}
                  </div>

                  <div ref={sentinelRef} className="h-12" />
                  {!hasMore && <div className="text-center text-zinc-400 mt-6">Τέλος αποτελεσμάτων</div>}
                </>
              ) : (
                <>
                  <div>
                    {items.map((t) => (
                      <div key={t.id} className="mb-6">
                        <TrainerCard
                          trainer={t}
                          list
                          onNavigate={navigate}
                          liked={likedTrainerIds.includes(t.id)}
                          onToggleLike={() => handleToggleLike(t)}
                          onOpenBooking={(tr) => {
                            handleOpenBooking(tr);
                          }}
                        />
                      </div>
                    ))}

                    {loadingPage &&
                      Array.from({ length: Math.min(4, PAGE_SIZE / 3) }).map((_, i) => (
                        <div className="mb-6" key={`slist-${i}`}>
                          <SkeletonCard list />
                        </div>
                      ))}
                  </div>

                  <div ref={sentinelRef} className="h-12" />
                  {!hasMore && <div className="text-center text-zinc-400 mt-6">Τέλος αποτελεσμάτων</div>}
                </>
              )}

              {hasMore && !loadingPage && (
                <div className="mt-10 flex justify-center px-2 sm:px-0">
                  <PremiumButton variant="secondary" onClick={() => loadMore(null, PAGE_SIZE, MAX_EXTRA_PAGES_PER_LOAD)}>
                    Φόρτωσε περισσότερα
                  </PremiumButton>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <AnimatePresence>
        {bookingTrainer && (
          <Suspense
            fallback={
              <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 backdrop-blur-sm">
                <div className="panel rounded-2xl px-6 py-4 border border-white/10 text-zinc-300">
                  Φόρτωση φόρμας κράτησης…
                </div>
              </div>
            }
          >
            <QuickBookModal open trainer={bookingTrainer} onClose={() => setBookingTrainer(null)} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {guestBookingTrainer && role === "guest" && (
          <Suspense
            fallback={
              <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 backdrop-blur-sm">
                <div className="panel rounded-2xl px-6 py-4 border border-white/10 text-zinc-300">
                  Φόρτωση…
                </div>
              </div>
            }
          >
            <GuestBookingAuthModal
              open
              trainer={guestBookingTrainer}
              nextPath={`/trainer/${guestBookingTrainer.id}?book=1`}
              onClose={() => setGuestBookingTrainer(null)}
              onLogin={() =>
                navigate(`/login?next=${encodeURIComponent(`/trainer/${guestBookingTrainer.id}?book=1`)}`)
              }
              onSignup={() =>
                navigate(`/signup?next=${encodeURIComponent(`/trainer/${guestBookingTrainer.id}?book=1`)}`)
              }
            />
          </Suspense>
        )}
      </AnimatePresence>

      <style>{`
        .panel {
          background:
            radial-gradient(120% 120% at 50% 0%, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.6) 40%),
            linear-gradient(to bottom, rgba(255,255,255,0.02), rgba(0,0,0,0.5));
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.06),
            0 10px 30px rgba(0,0,0,0.6);
        }
        @keyframes float {
          0%,100% { transform: translateY(0) rotate(0) }
          33% { transform: translateY(-10px) rotate(120deg) }
          66% { transform: translateY(5px) rotate(240deg) }
        }
        @keyframes slide-diagonal {
          0% { transform: translateX(-100px) translateY(-100px) }
          100% { transform: translateX(100px) translateY(100px) }
        }
        .animate-float { animation: float 6s ease-in-out infinite }
        .animate-slide-diagonal { animation: slide-diagonal 20s linear infinite }
      `}</style>
    </div>
  );
}

/* ------------------------------ Empty State ------------------------------ */
function Empty({ search }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20 lg:py-28">
      <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-white/5 border border-white/10 grid place-items-center">
        <Search className="h-12 w-12 text-zinc-600" />
      </div>

      <h3 className="text-3xl font-bold text-white mb-4">
        {search ? `Δεν βρέθηκαν αποτελέσματα για "${search}"` : "Δεν βρέθηκαν εκπαιδευτές"}
      </h3>

      <p className="text-zinc-400 mb-8 max-w-md mx-auto">
        {search
          ? "Δοκιμάστε διαφορετικούς όρους αναζήτησης ή αλλάξτε τα φίλτρα σας."
          : "Δοκιμάστε να αλλάξετε τα κριτήρια αναζήτησης ή τα φίλτρα σας."}
      </p>

      <PremiumButton onClick={() => window.location.reload()}>Επαναφόρτωση</PremiumButton>
    </motion.div>
  );
}