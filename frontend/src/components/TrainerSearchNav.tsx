// src/components/TrainerSearchNav.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import {
  Search as SearchIcon,
  Filter,
  ChevronRight,
  ChevronDown,
  X,
  Wifi,
  WifiOff,
  Sun,
  Tag as TagIcon,
  MapPin,
  Calendar as CalendarIcon,
  CheckCircle2,
  ArrowDownAZ,
  Star,
  Clock,
} from "lucide-react";

/* Icons for categories */
import { FaDumbbell, FaUsers, FaAppleAlt, FaLaptop, FaRunning, FaMusic, FaHeartbeat } from "react-icons/fa";
import { MdFitnessCenter, MdSelfImprovement, MdHealthAndSafety, MdPsychology } from "react-icons/md";
import { GiMuscleUp, GiSwordsPower, GiWeightLiftingUp, GiBoxingGlove } from "react-icons/gi";
import { TbYoga, TbStethoscope } from "react-icons/tb";

type CategoryItem = { value: string; label: string; iconKey?: keyof typeof ICON_BY_KEY | "tag" };
type CityItem = { value: string; label: string };

const ICON_BY_KEY = {
  tag: TagIcon,
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
} as const;

/* ---------- Small UI helpers ---------- */
function PremiumCard({
  title,
  subtitle,
  icon,
  action,
  children,
  className = "",
  gradient = false,
}: {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`panel relative overflow-hidden rounded-3xl p-6 border border-white/10 shadow-2xl transition-all duration-300 ${
        gradient ? "premium-gradient" : ""
      } ${className}`}
    >
      {(title || subtitle || icon || action) && (
        <div className="relative mb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            {icon && (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-white ring-1 ring-white/15">
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

/* ⤵️ Added className for compact variants */
function FilterButton({
  active,
  onClick,
  Icon,
  label,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  Icon: any;
  label: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-start gap-3 px-4 py-3 rounded-2xl font-medium border transition-all duration-300 text-sm ${
        active
          ? "bg-white text-black border-white shadow-lg"
          : "bg-white/[0.04] text-zinc-200 border-white/10 hover:bg-white/[0.08] hover:border-white/20"
      } ${className}`}
      title={label}
    >
      <Icon className="h-5 w-5" />
      <span className="leading-tight">{label}</span>
    </button>
  );
}

/* ---------- Mobile Bottom Sheet (75% at top ⇄ 100% on scroll, smooth close) ---------- */
function MobileFiltersSheet({
  open,
  onClose,
  results,
  body,
}: {
  open: boolean;
  onClose: () => void;
  results: number;
  body: React.ReactNode;
}) {
  const controls = useDragControls();
  const [expanded, setExpanded] = useState(false); // false = 75%, true = 100%
  const [allowDrag, setAllowDrag] = useState(true); // drag enabled only when scrollTop === 0
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // lock background scroll while open
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prevHtml = html.style.overflow;
    const prevBody = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [open]);

  // reset state on (re)open
  useEffect(() => {
    if (!open) return;
    setExpanded(false); // start collapsed
  }, [open]);

  // Sync expansion & drag with scroll position
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const atTop = el.scrollTop <= 0;
      setExpanded(!atTop); // at top => 75%, scrolled => 100%
      setAllowDrag(atTop); // drag only when at the top
    };

    handleScroll();
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [scrollRef.current]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[101]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            <motion.div
              className="w-full border border-white/10 bg-zinc-950/95 backdrop-blur-xl shadow-2xl"
              style={{ willChange: "height" }}
              animate={{
                height: expanded ? "100svh" : "min(75svh, 75vh)",
                borderTopLeftRadius: expanded ? 0 : 24,
                borderTopRightRadius: expanded ? 0 : 24,
              }}
              transition={{
                height: { type: "spring", stiffness: 280, damping: 34 },
                borderTopLeftRadius: { duration: 0.18 },
                borderTopRightRadius: { duration: 0.18 },
              }}
              drag="y"
              dragControls={controls}
              dragListener={allowDrag}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y > 80 || info.velocity.y > 500) {
                  if (expanded) {
                    setExpanded(false);
                  } else {
                    onClose();
                  }
                } else if (info.offset.y < -60) {
                  setExpanded(true);
                }
              }}
            >
              <div className="grid grid-rows-[auto_1fr_auto] h-full">
                {/* Header / handle */}
                <div
                  className="px-4 pt-3 pb-4 border-b border-white/10"
                  onPointerDown={(e) => allowDrag && controls.start(e)}
                  role="button"
                  aria-label="Σύρε για κλείσιμο"
                >
                  <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white font-semibold">
                      <Filter className="h-5 w-5" />
                      Φίλτρα
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10" aria-label="Κλείσιμο">
                      <X className="h-5 w-5 text-zinc-400" />
                    </button>
                  </div>
                </div>

                {/* Scrollable content */}
                <div ref={scrollRef} className="overflow-y-auto overscroll-contain px-4 py-5 space-y-8">
                  {body}
                </div>

                {/* Footer */}
                <div className="px-4 pb-[max(env(safe-area-inset-bottom),16px)] bg-transparent">
                  <div className="text-center text-xs text-zinc-400 mb-2">
                    {results} {results === 1 ? "αποτέλεσμα" : "αποτελέσματα"}
                  </div>
                  <button
                    type="button"
                    // Keep sheet open; user will close via X, drag-down, or tapping backdrop
                    onClick={(e) => e.currentTarget.blur()}
                    className="w-full h-12 rounded-xl bg-white text-black hover:bg-zinc-100 active:scale-[0.99] inline-flex items-center justify-center gap-2 font-semibold"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    Εφαρμογή Φίλτρων
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ---------- Main component ---------- */
type Props = {
  results?: number;

  search?: string;
  setSearch?: (v: string) => void;

  sort?: string;
  setSort?: (v: string) => void;

  cat?: string;
  setCat?: (v: string) => void;

  onlyOnline?: boolean;
  setOnlyOnline?: (v: boolean) => void;

  excludeVacation?: boolean;
  setExcludeVacation?: (v: boolean) => void;

  selectedDate?: "" | "today" | "tomorrow" | "week";
  setSelectedDate?: (v: "" | "today" | "tomorrow" | "week") => void;

  selectedCity?: string;
  setSelectedCity?: (v: string) => void;

  showFilters?: boolean;
  setShowFilters?: (v: boolean) => void;

  categories?: CategoryItem[];
  cities?: CityItem[];

  onChange?: (v: {
    search: string;
    view: "grid";
    sort: string;
    cat: string;
    onlyOnline: boolean;
    excludeVacation: boolean;
    selectedDate: "" | "today" | "tomorrow" | "week";
    selectedCity: string;
  }) => void;

  initial?: Partial<{
    search: string;
    sort: string;
    cat: string;
    onlyOnline: boolean;
    excludeVacation: boolean;
    selectedDate: "" | "today" | "tomorrow" | "week";
    selectedCity: string;
  }>;
};

export default function TrainerSearchNav({
  results = 0,
  search: cSearch,
  setSearch: cSetSearch,
  sort: cSort,
  setSort: cSetSort,
  cat: cCat,
  setCat: cSetCat,
  onlyOnline: cOnlyOnline,
  setOnlyOnline: cSetOnlyOnline,
  excludeVacation: cExcludeVacation,
  setExcludeVacation: cSetExcludeVacation,
  selectedDate: cSelectedDate,
  setSelectedDate: cSetSelectedDate,
  selectedCity: cSelectedCity,
  setSelectedCity: cSetSelectedCity,
  showFilters: cShowFilters,
  setShowFilters: cSetShowFilters,
  categories,
  cities,
  onChange,
  initial,
}: Props) {
  // local fallbacks for uncontrolled mode
  const [uSearch, uSetSearch] = useState(initial?.search ?? "");
  const [uSort, uSetSort] = useState(initial?.sort ?? "newest");
  const [uCat, uSetCat] = useState(initial?.cat ?? "all");
  const [uOnlyOnline, uSetOnlyOnline] = useState(!!initial?.onlyOnline);
  const [uExcludeVacation, uSetExcludeVacation] = useState(!!initial?.excludeVacation);
  const [uSelectedDate, uSetSelectedDate] = useState<"" | "today" | "tomorrow" | "week">(initial?.selectedDate ?? "");
  const [uSelectedCity, uSetSelectedCity] = useState(initial?.selectedCity ?? "all");
  const [uShowFilters, uSetShowFilters] = useState(false);

  const value = {
    search: cSearch ?? uSearch,
    sort: cSort ?? uSort,
    cat: cCat ?? uCat,
    onlyOnline: cOnlyOnline ?? uOnlyOnline,
    excludeVacation: cExcludeVacation ?? uExcludeVacation,
    selectedDate: cSelectedDate ?? uSelectedDate,
    selectedCity: cSelectedCity ?? uSelectedCity,
    showFilters: cShowFilters ?? uShowFilters,
  };

  const set = {
    search: (v: string) => (cSetSearch ? cSetSearch(v) : uSetSearch(v)),
    sort: (v: string) => (cSetSort ? cSetSort(v) : uSetSort(v)),
    cat: (v: string) => (cSetCat ? cSetCat(v) : uSetCat(v)),
    onlyOnline: (v: boolean) => (cSetOnlyOnline ? cSetOnlyOnline(v) : uSetOnlyOnline(v)),
    excludeVacation: (v: boolean) => (cSetExcludeVacation ? cSetExcludeVacation(v) : uSetExcludeVacation(v)),
    selectedDate: (v: "" | "today" | "tomorrow" | "week") =>
      cSetSelectedDate ? cSetSelectedDate(v) : uSetSelectedDate(v),
    selectedCity: (v: string) => (cSetSelectedCity ? cSetSelectedCity(v) : uSetSelectedCity(v)),
    showFilters: (v: boolean) => (cSetShowFilters ? cSetShowFilters(v) : uSetShowFilters(v)),
  };

  // debounced external emitter
  useEffect(() => {
    if (!onChange) return;
    const t = setTimeout(
      () =>
        onChange({
          search: value.search,
          view: "grid",
          sort: value.sort,
          cat: value.cat,
          onlyOnline: value.onlyOnline,
          excludeVacation: value.excludeVacation,
          selectedDate: value.selectedDate,
          selectedCity: value.selectedCity,
        }),
      150
    );
    return () => clearTimeout(t);
  }, [
    value.search,
    value.sort,
    value.cat,
    value.onlyOnline,
    value.excludeVacation,
    value.selectedDate,
    value.selectedCity,
    onChange,
  ]);

  // mobile breakpoint
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const setBP = () => setIsMobile(window.innerWidth < 768);
    setBP();
    window.addEventListener("resize", setBP);
    return () => window.removeEventListener("resize", setBP);
  }, []);

  // outside click (DESKTOP panel only)
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (isMobile || !value.showFilters) return;

    function handler(e: MouseEvent) {
      const t = e.target as Node;
      const inToggle = !!toggleRef.current?.contains(t);
      const inPanel = !!panelRef.current?.contains(t);
      if (!inToggle && !inPanel) set.showFilters(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") set.showFilters(false);
    }

    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", onKey);
    };
  }, [isMobile, value.showFilters]); // desktop-only close behavior

  /* ---------- Data lists ---------- */
  const CAT_LIST: CategoryItem[] = useMemo(
    () =>
      categories?.length
        ? categories
        : [
            { value: "all", label: "Όλες οι ειδικότητες", iconKey: "tag" },
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
          ],
    [categories]
  );

  const CITY_LIST: CityItem[] = useMemo(
    () =>
      cities?.length
        ? cities
        : [
            { value: "all", label: "Όλες οι πόλεις" },
            { value: "Αθήνα", label: "Αθήνα" },
            { value: "Θεσσαλονίκη", label: "Θεσσαλονίκη" },
            { value: "Πάτρα", label: "Πάτρα" },
            { value: "Ηράκλειο", label: "Ηράκλειο" },
            { value: "Λάρισα", label: "Λάρισα" },
            { value: "Βόλος", label: "Βόλος" },
            { value: "Ιωάννινα", label: "Ιωάννινα" },
            { value: "Καβάλα", label: "Καβάλα" },
            { value: "Σέρρες", label: "Σέρρες" },
            { value: "Χανιά", label: "Χανιά" },
            { value: "Αγρίνιο", label: "Αγρίνιο" },
          ],
    [cities]
  );

  /* ---------- Sort chips (FIRST inside filters) ---------- */
  const SortChips = (
    <div>
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <ArrowDownAZ className="h-5 w-5" /> Ταξινόμηση
      </h3>
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {[
          { key: "newest", label: "Νεότεροι", Icon: Clock },
          { key: "name", label: "Όνομα A–Z", Icon: ArrowDownAZ },
          { key: "experience", label: "Εμπειρία", Icon: TagIcon },
          { key: "rating", label: "Αξιολόγηση", Icon: Star },
        ].map(({ key, label, Icon }) => (
          <FilterButton
            key={key}
            active={value.sort === key}
            onClick={() => set.sort(key)}
            Icon={Icon}
            label={label}
            className="px-3 py-2 text-xs"
          />
        ))}
      </div>
    </div>
  );

  /* ---------- Reusable filters body ---------- */
  const FiltersBody = (
    <>
      {/* 1) Sort – requested to be FIRST */}
      {SortChips}

      {/* 2) Category */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <TagIcon className="h-5 w-5" /> Τύπος Προπόνησης
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {CAT_LIST.map(({ value: v, label, iconKey }) => {
            const Icon = iconKey ? (ICON_BY_KEY as any)[iconKey] || TagIcon : TagIcon;
            const active = value.cat === v;
            return (
              <FilterButton
                key={v}
                active={active}
                onClick={() => set.cat(active ? "all" : v)}
                Icon={Icon}
                label={label}
              />
            );
          })}
        </div>
      </div>

      {/* 3) Date quick filters */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" /> Ημερομηνία Διαθεσιμότητας
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: "", label: "Οποιαδήποτε", Icon: CalendarIcon },
            { key: "today", label: "Σήμερα", Icon: Wifi },
            { key: "tomorrow", label: "Αύριο", Icon: Sun },
            { key: "week", label: "Αυτή την εβδομάδα", Icon: CalendarIcon },
          ].map(({ key, label, Icon }) => (
            <button
              key={key || "any"}
              onClick={() => set.selectedDate(key as any)}
              className={`flex items-center justify-center gap-2 p-3 rounded-2xl font-medium border transition-all duration-300 text-sm ${
                value.selectedDate === key
                  ? "bg-white text-black border-white shadow-lg"
                  : "bg-white/5 text-zinc-200 border-white/10 hover:bg-white/10 hover:border-white/20"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4) City */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <MapPin className="h-5 w-5" /> Πόλη
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {CITY_LIST.slice(0, 12).map((city) => (
            <button
              key={city.value}
              onClick={() => set.selectedCity(city.value)}
              className={`flex items-center justify-center gap-2 p-3 rounded-2xl font-medium border transition-all duration-300 text-sm ${
                value.selectedCity === city.value
                  ? "bg-white text-black border-white shadow-lg"
                  : "bg-white/5 text-zinc-200 border-white/10 hover:bg-white/10 hover:border-white/20"
              }`}
            >
              <MapPin className="h-4 w-4" />
              <span>{city.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-3">
          <select
            value={value.selectedCity}
            onChange={(e) => set.selectedCity(e.target.value)}
            className="control-select w-full"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e\")",
              backgroundPosition: "right 1rem center",
              backgroundSize: "1.5em 1.5em",
              backgroundRepeat: "no-repeat",
            }}
            aria-label="Επιλογή πόλης"
          >
            {CITY_LIST.map((city) => (
              <option key={city.value} value={city.value} className="bg-zinc-900 text-white">
                {city.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 5) Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          onClick={() => set.onlyOnline(!value.onlyOnline)}
          className={`p-4 rounded-2xl border transition-all duration-300 text-left ${
            value.onlyOnline
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200"
              : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
          }`}
        >
          <div className="flex items-center gap-3">
            {value.onlyOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
            <div>
              <div className="font-semibold">
                {value.onlyOnline ? "Μόνο online διαθέσιμοι" : "Περιλαμβάνει & offline"}
              </div>
              <div className="text-sm opacity-80">
                {value.onlyOnline ? "Εμφάνιση μόνο online εκπαιδευτών" : "Εμφάνιση όλων των εκπαιδευτών"}
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => set.excludeVacation(!value.excludeVacation)}
          className={`p-4 rounded-2xl border transition-all duration-300 text-left ${
            value.excludeVacation
              ? "bg-amber-500/20 border-amber-500/40 text-amber-200"
              : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
          }`}
        >
          <div className="flex items-center gap-3">
            <Sun className="h-5 w-5" />
            <div>
              <div className="font-semibold">Εξαίρεση όσων είναι σε άδεια</div>
              <div className="text-sm opacity-80">Απόκρυψη εκπαιδευτών σε διακοπές</div>
            </div>
          </div>
        </button>
      </div>
    </>
  );

  /* ---------- Render ---------- */
  return (
    <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-16">
      <PremiumCard
        gradient
        title="Αναζήτηση Εκπαιδευτών"
        subtitle="Φιλτράρισε και βρες τον καλύτερο για σένα"
        icon={<SearchIcon className="h-6 w-6" />}
        action={
          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-200 text-xs sm:text-sm font-medium">Ζωντανά αποτελέσματα</span>
            </div>
          </div>
        }
      >
        {/* Top row: Search + Filter (same line on all viewports) */}
        <div className="flex items-stretch gap-2 sm:gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
            <input
              value={value.search}
              onChange={(e) => set.search(e.target.value)}
              placeholder="Αναζήτηση προπονητών, ειδικοτήτων, τοποθεσίας..."
              className="control-input w-full pl-11 sm:pl-16 pr-10 sm:pr-12 py-3 sm:py-5 text-sm sm:text-base"
              aria-label="Αναζήτηση"
            />
            {value.search && (
              <button
                onClick={() => set.search("")}
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white transition-colors"
                aria-label="Καθαρισμός"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filters toggle */}
          <button
            ref={toggleRef}
            onClick={() => set.showFilters(!value.showFilters)}
            className={`shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl border px-3 sm:px-5 h-11 sm:h-auto transition ${
              value.showFilters
                ? "bg-white text-black border-white"
                : "bg-black/40 text-white border-white/10 hover:bg-black/60"
            }`}
            aria-haspopup="dialog"
            aria-expanded={value.showFilters ? "true" : "false"}
          >
            <Filter className="h-5 w-5" />
            <span className="hidden sm:inline">Φίλτρα</span>
            {value.showFilters ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>

        {/* Results line */}
        <div className="text-zinc-300 mb-6">
          <span className="text-white font-bold">{results}</span>{" "}
          {results === 1 ? "εκπαιδευτής" : "εκπαιδευτές"} βρέθηκαν —{" "}
          <span className="opacity-80">Επιλέξτε τον κατάλληλο για εσάς</span>
        </div>

        {/* Desktop filters panel (stays open) */}
        <AnimatePresence>
          {!isMobile && value.showFilters && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35 }}
              className="border-t border-white/10 pt-8 space-y-8"
              role="dialog"
              aria-label="Φίλτρα αναζήτησης"
            >
              {FiltersBody}
            </motion.div>
          )}
        </AnimatePresence>
      </PremiumCard>

      {/* Mobile bottom sheet (smart height) */}
      {isMobile && (
        <MobileFiltersSheet
          open={value.showFilters}
          onClose={() => set.showFilters(false)}
          results={results}
          body={FiltersBody}
        />
      )}

      {/* Minimal styles for inputs/selects */}
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
        .control-input {
          border-radius: 1rem;
          background: rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.12);
          color: #fff;
          outline: none;
          transition: border .2s, box-shadow .2s, background .2s;
        }
        .control-input::placeholder { color: rgba(255,255,255,0.5); }
        .control-input:focus {
          border-color: rgba(255,255,255,0.35);
          box-shadow: 0 0 0 6px rgba(255,255,255,0.06);
          background: rgba(0,0,0,0.55);
        }
        .control-select {
          padding: 1.1rem 3rem 1.1rem 1.25rem;
          border-radius: 1rem;
          background: rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.12);
          color: #fff;
          appearance: none;
          outline: none;
          transition: border .2s, box-shadow .2s, background .2s;
        }
        .control-select:focus {
          border-color: rgba(255,255,255,0.35);
          box-shadow: 0 0 0 6px rgba(255,255,255,0.06);
          background: rgba(0,0,0,0.55);
        }
        .premium-gradient:before {
          content: "";
          position: absolute;
          inset: -2px;
          background: conic-gradient(from 180deg at 50% 50%, rgba(255,255,255,0.12), rgba(255,255,255,0.02), rgba(255,255,255,0.12));
          filter: blur(16px);
          opacity: .22;
          z-index: -1;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </motion.section>
  );
}
