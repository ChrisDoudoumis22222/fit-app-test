// src/components/TrainerSearchNav.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type DatePreset = "" | "today" | "tomorrow" | "week";

/** UI sort keys (what the chips use/highlight) */
type SortUiKey = "newest" | "name" | "experience" | "rating";

/**
 * IMPORTANT:
 * Many parent queries treat `sort` as a DB column name.
 * So "newest" breaks. We output "created_at" for newest.
 */
function toOutgoingSort(ui: SortUiKey): string {
  if (ui === "newest") return "created_at";
  return ui;
}

/**
 * Accept whatever comes from parent and normalize to our UI keys.
 * This makes the UI work even if parent stores sort as "created_at".
 */
function toUiSortKey(v: any): SortUiKey {
  const s = String(v ?? "").trim().toLowerCase();

  if (!s) return "newest";

  // treat created_at as "newest"
  if (
    s === "newest" ||
    s === "recent" ||
    s === "latest" ||
    s === "created_at" ||
    s === "createdat" ||
    s === "created_at_desc" ||
    s === "created_at_asc"
  ) {
    return "newest";
  }

  if (s === "name" || s === "full_name" || s === "fullname" || s === "full_name_asc") {
    return "name";
  }

  if (
    s === "experience" ||
    s === "exp" ||
    s === "years_experience" ||
    s === "experience_years" ||
    s === "experience_desc"
  ) {
    return "experience";
  }

  if (
    s === "rating" ||
    s === "stars" ||
    s === "avg_rating" ||
    s === "average_rating" ||
    s === "rating_desc"
  ) {
    return "rating";
  }

  // fallback
  return "newest";
}

type FilterValues = {
  search: string;
  sort: SortUiKey;
  cats: string[];
  onlyOnline: boolean;
  excludeVacation: boolean;
  selectedDate: DatePreset;
  selectedCity: string;
};

type CategoryItem = {
  value: string;
  label: string;
  iconKey?: keyof typeof ICON_BY_KEY | "tag";
};

type CityItem = {
  value: string;
  label: string;
};

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

/* ---------- Helpers ---------- */
const MAX_SEARCH_TERMS = 10;

function normalizeTerm(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

function splitToTerms(raw: string) {
  const hasDelim = /[,;\n|]/.test(raw);
  if (!hasDelim) return [];
  return raw
    .split(/[,;\n|]+/g)
    .map(normalizeTerm)
    .filter(Boolean);
}

function mergeUnique(base: string[], add: string[]) {
  const seen = new Set(base.map((x) => x.toLowerCase()));
  const out = [...base];

  for (const a of add) {
    const n = normalizeTerm(a);
    if (!n) continue;

    const k = n.toLowerCase();
    if (seen.has(k)) continue;

    out.push(n);
    seen.add(k);

    if (out.length >= MAX_SEARCH_TERMS) break;
  }

  return out;
}

function buildCombinedSearch(tokens: string[], input: string) {
  const tail = normalizeTerm(input);
  const all = tail ? [...tokens, tail] : [...tokens];
  return all.join(" ").trim();
}

function parseSearchUi(raw: string) {
  const normalized = raw ?? "";
  const terms = splitToTerms(normalized);

  if (terms.length) {
    return {
      tokens: terms.slice(0, MAX_SEARCH_TERMS),
      input: "",
    };
  }

  return {
    tokens: [] as string[],
    input: normalized,
  };
}

function normalizeCats(values?: string[]) {
  if (!values?.length) return [];

  const out: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const v = String(value ?? "").trim();
    if (!v || v === "all") continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }

  return out;
}

function legacyCatFromCats(cats: string[]) {
  return cats[0] ?? "all";
}

function equalStringArraysAsSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;

  const aSorted = [...a].sort();
  const bSorted = [...b].sort();

  for (let i = 0; i < aSorted.length; i += 1) {
    if (aSorted[i] !== bSorted[i]) return false;
  }

  return true;
}

function areFiltersEqual(a: FilterValues, b: FilterValues) {
  return (
    a.search === b.search &&
    a.sort === b.sort &&
    equalStringArraysAsSet(a.cats, b.cats) &&
    a.onlyOnline === b.onlyOnline &&
    a.excludeVacation === b.excludeVacation &&
    a.selectedDate === b.selectedDate &&
    a.selectedCity === b.selectedCity
  );
}

function defaultDraftState(): FilterValues {
  return {
    search: "",
    sort: "newest",
    cats: [],
    onlyOnline: false,
    excludeVacation: false,
    selectedDate: "",
    selectedCity: "all",
  };
}

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
              {title && (
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight break-words">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs sm:text-sm text-zinc-300 mt-1 break-words">{subtitle}</p>
              )}
            </div>
          </div>

          {action && <div className="relative z-10">{action}</div>}
        </div>
      )}

      <div className="relative">{children}</div>
    </motion.div>
  );
}

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
      type="button"
      onClick={onClick}
      title={label}
      className={`flex items-center justify-start gap-3 px-4 py-3 rounded-2xl font-medium border transition-all duration-300 text-sm ${
        active
          ? "bg-white text-black border-white shadow-lg"
          : "bg-white/[0.04] text-zinc-200 border-white/10 hover:bg-white/[0.08] hover:border-white/20"
      } ${className}`}
    >
      <Icon className="h-5 w-5" />
      <span className="leading-tight">{label}</span>
    </button>
  );
}

function SearchChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-200 text-xs">
      <span className="truncate max-w-[220px]">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="p-1 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white"
        aria-label={`Αφαίρεση "${label}"`}
        title="Αφαίρεση"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

/* ---------- Mobile Bottom Sheet ---------- */
function MobileFiltersSheet({
  open,
  onClose,
  onApply,
  results,
  body,
}: {
  open: boolean;
  onClose: () => void;
  onApply: () => void;
  results: number;
  body: React.ReactNode;
}) {
  const controls = useDragControls();
  const [expanded, setExpanded] = useState(false);
  const [allowDrag, setAllowDrag] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!open) return;
    setExpanded(false);
  }, [open]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !open) return;

    const handleScroll = () => {
      const atTop = el.scrollTop <= 0;
      setExpanded(!atTop);
      setAllowDrag(atTop);
    };

    handleScroll();
    el.addEventListener("scroll", handleScroll, { passive: true });

    return () => el.removeEventListener("scroll", handleScroll);
  }, [open]);

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
                  if (expanded) setExpanded(false);
                  else onClose();
                } else if (info.offset.y < -60) {
                  setExpanded(true);
                }
              }}
            >
              <div className="grid grid-rows-[auto_1fr_auto] h-full">
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

                    <button
                      type="button"
                      onClick={onClose}
                      className="p-2 rounded-lg hover:bg-white/10"
                      aria-label="Κλείσιμο"
                    >
                      <X className="h-5 w-5 text-zinc-400" />
                    </button>
                  </div>
                </div>

                <div ref={scrollRef} className="overflow-y-auto overscroll-contain px-4 py-5 space-y-8">
                  {body}
                </div>

                <div className="px-4 pb-[max(env(safe-area-inset-bottom),16px)] bg-transparent">
                  <div className="text-center text-xs text-zinc-400 mb-2">
                    {results} {results === 1 ? "αποτέλεσμα" : "αποτελέσματα"}
                  </div>

                  <button
                    type="button"
                    onClick={onApply}
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

  /** parent may send "newest" OR "created_at" (we normalize) */
  sort?: string;
  setSort?: (v: string) => void;

  cat?: string;
  setCat?: (v: string) => void;

  cats?: string[];
  setCats?: (v: string[]) => void;

  onlyOnline?: boolean;
  setOnlyOnline?: (v: boolean) => void;

  excludeVacation?: boolean;
  setExcludeVacation?: (v: boolean) => void;

  selectedDate?: DatePreset;
  setSelectedDate?: (v: DatePreset) => void;

  selectedCity?: string;
  setSelectedCity?: (v: string) => void;

  showFilters?: boolean;
  setShowFilters?: (v: boolean) => void;

  categories?: CategoryItem[];
  cities?: CityItem[];

  onChange?: (
    v: {
      search: string;
      sort: string; // outgoing sort string (e.g. "created_at" for newest)
      cats: string[];
      onlyOnline: boolean;
      excludeVacation: boolean;
      selectedDate: DatePreset;
      selectedCity: string;
      view: "grid";
      cat: string;
    }
  ) => void;

  onSearchTokensChange?: (tokens: string[]) => void;

  initial?: Partial<
    Omit<FilterValues, "sort"> & {
      sort: string;
      cat: string;
      cats: string[];
    }
  >;
};

export default function TrainerSearchNav({
  results = 0,
  search: cSearch,
  setSearch: cSetSearch,
  sort: cSort,
  setSort: cSetSort,
  cat: cCat,
  setCat: cSetCat,
  cats: cCats,
  setCats: cSetCats,
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
  onSearchTokensChange,
  initial,
}: Props) {
  const initialCats = useMemo(
    () =>
      normalizeCats(
        initial?.cats?.length
          ? initial.cats
          : initial?.cat && initial.cat !== "all"
          ? [initial.cat]
          : []
      ),
    [initial]
  );

  /* committed / applied state (for uncontrolled mode) */
  const [uSearch, uSetSearch] = useState(initial?.search ?? "");
  const [uSortUi, uSetSortUi] = useState<SortUiKey>(toUiSortKey(initial?.sort ?? "newest"));
  const [uCat, uSetCat] = useState(initial?.cat ?? legacyCatFromCats(initialCats));
  const [uCats, uSetCats] = useState<string[]>(initialCats);
  const [uOnlyOnline, uSetOnlyOnline] = useState(!!initial?.onlyOnline);
  const [uExcludeVacation, uSetExcludeVacation] = useState(!!initial?.excludeVacation);
  const [uSelectedDate, uSetSelectedDate] = useState<DatePreset>(initial?.selectedDate ?? "");
  const [uSelectedCity, uSetSelectedCity] = useState(initial?.selectedCity ?? "all");
  const [uShowFilters, uSetShowFilters] = useState(false);

  const appliedCats = useMemo(() => {
    if (Array.isArray(cCats)) return normalizeCats(cCats);
    if (typeof cCat !== "undefined") return cCat && cCat !== "all" ? [cCat] : [];
    return normalizeCats(uCats);
  }, [cCats, cCat, uCats]);

  const applied: FilterValues = {
    search: cSearch ?? uSearch,
    sort: toUiSortKey(cSort ?? uSortUi),
    cats: appliedCats,
    onlyOnline: cOnlyOnline ?? uOnlyOnline,
    excludeVacation: cExcludeVacation ?? uExcludeVacation,
    selectedDate: cSelectedDate ?? uSelectedDate,
    selectedCity: cSelectedCity ?? uSelectedCity,
  };

  const isFiltersOpen = cShowFilters ?? uShowFilters;

  const setShowFilters = useCallback(
    (next: boolean) => {
      if (cSetShowFilters) cSetShowFilters(next);
      else uSetShowFilters(next);
    },
    [cSetShowFilters]
  );

  /* draft state */
  const [draft, setDraft] = useState<FilterValues>(() => applied);
  const draftRef = useRef<FilterValues>(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const initialParsed = useMemo(() => parseSearchUi(applied.search), []);
  const [searchTokens, setSearchTokens] = useState<string[]>(initialParsed.tokens);
  const [searchInput, setSearchInput] = useState<string>(initialParsed.input);

  const syncSearchUiFromRaw = useCallback(
    (raw: string) => {
      const parsed = parseSearchUi(raw);
      setSearchTokens(parsed.tokens);
      setSearchInput(parsed.input);
      onSearchTokensChange?.(parsed.tokens);
    },
    [onSearchTokensChange]
  );

  useEffect(() => {
    const currentDraft = draftRef.current;

    // if user has pending edits, don't overwrite them
    if (!areFiltersEqual(currentDraft, applied)) return;

    setDraft(applied);
    syncSearchUiFromRaw(applied.search);
  }, [
    applied.search,
    applied.sort,
    applied.cats,
    applied.onlyOnline,
    applied.excludeVacation,
    applied.selectedDate,
    applied.selectedCity,
    syncSearchUiFromRaw,
  ]);

  const hasPendingChanges = useMemo(() => !areFiltersEqual(draft, applied), [draft, applied]);

  function updateDraftField<K extends keyof FilterValues>(key: K, value: FilterValues[K]) {
    setDraft((prev) => {
      if (key === "sort") {
        return { ...prev, sort: toUiSortKey(value) };
      }
      return { ...prev, [key]: value };
    });
  }

  const updateDraftSearch = useCallback(
    (nextTokens: string[], nextInput: string) => {
      const safeTokens = nextTokens.slice(0, MAX_SEARCH_TERMS);
      const combined = buildCombinedSearch(safeTokens, nextInput);

      setSearchTokens(safeTokens);
      setSearchInput(nextInput);

      setDraft((prev) => ({
        ...prev,
        search: combined,
      }));

      onSearchTokensChange?.(safeTokens);
    },
    [onSearchTokensChange]
  );

  const commitInputToTokens = useCallback(() => {
    const raw = searchInput;
    const normalized = normalizeTerm(raw);
    if (!normalized) return;

    const parsedTerms = splitToTerms(raw);
    const termsToAdd = parsedTerms.length ? parsedTerms : [normalized];
    const merged = mergeUnique(searchTokens, termsToAdd);

    updateDraftSearch(merged, "");
  }, [searchInput, searchTokens, updateDraftSearch]);

  const removeToken = useCallback(
    (token: string) => {
      const next = searchTokens.filter((t) => t !== token);
      updateDraftSearch(next, searchInput);
    },
    [searchInput, searchTokens, updateDraftSearch]
  );

  const clearAllSearch = useCallback(() => {
    updateDraftSearch([], "");
  }, [updateDraftSearch]);

  const discardDraft = useCallback(() => {
    setDraft(applied);
    syncSearchUiFromRaw(applied.search);
  }, [applied, syncSearchUiFromRaw]);

  const clearDraftFilters = useCallback(() => {
    const cleared = defaultDraftState();
    setDraft(cleared);
    syncSearchUiFromRaw("");
  }, [syncSearchUiFromRaw]);

  const toggleDraftCategory = useCallback((categoryValue: string) => {
    setDraft((prev) => {
      if (categoryValue === "all") {
        return { ...prev, cats: [] };
      }

      const exists = prev.cats.includes(categoryValue);
      const nextCats = exists
        ? prev.cats.filter((item) => item !== categoryValue)
        : [...prev.cats, categoryValue];

      return { ...prev, cats: normalizeCats(nextCats) };
    });
  }, []);

  const applyFilters = useCallback(() => {
    const safeCats = normalizeCats(draft.cats);
    const legacyCat = legacyCatFromCats(safeCats);

    // outgoing sort (fix: newest => created_at)
    const outSort = toOutgoingSort(draft.sort);

    if (cSetSearch) cSetSearch(draft.search);
    else uSetSearch(draft.search);

    if (cSetSort) cSetSort(outSort);
    else uSetSortUi(draft.sort);

    if (cSetCats) cSetCats(safeCats);
    else uSetCats(safeCats);

    if (cSetCat) cSetCat(legacyCat);
    else uSetCat(legacyCat);

    if (cSetOnlyOnline) cSetOnlyOnline(draft.onlyOnline);
    else uSetOnlyOnline(draft.onlyOnline);

    if (cSetExcludeVacation) cSetExcludeVacation(draft.excludeVacation);
    else uSetExcludeVacation(draft.excludeVacation);

    if (cSetSelectedDate) cSetSelectedDate(draft.selectedDate);
    else uSetSelectedDate(draft.selectedDate);

    if (cSetSelectedCity) cSetSelectedCity(draft.selectedCity);
    else uSetSelectedCity(draft.selectedCity);

    onChange?.({
      ...draft,
      sort: outSort,
      cats: safeCats,
      cat: legacyCat,
      view: "grid",
    });

    setShowFilters(false);
  }, [
    draft,
    cSetSearch,
    cSetSort,
    cSetCats,
    cSetCat,
    cSetOnlyOnline,
    cSetExcludeVacation,
    cSetSelectedDate,
    cSetSelectedCity,
    onChange,
    setShowFilters,
  ]);

  /**
   * Sort-only commit (and DOES NOT apply other draft filters).
   * FIX: newest sends "created_at" out.
   */
  const applySortOnly = useCallback(
    (nextUiSort: SortUiKey) => {
      const outSort = toOutgoingSort(nextUiSort);

      setDraft((prev) => ({ ...prev, sort: nextUiSort }));

      if (cSetSort) cSetSort(outSort);
      else uSetSortUi(nextUiSort);

      // notify parent without changing other filters
      const legacyCat = legacyCatFromCats(applied.cats);
      onChange?.({
        ...applied,
        sort: outSort,
        cats: applied.cats,
        cat: legacyCat,
        view: "grid",
      });
    },
    [applied, cSetSort, onChange]
  );

  /**
   * One-time auto-fix:
   * If we're on "newest" and results are 0 with no filters,
   * force outgoing sort to "created_at" (so trainers don't vanish).
   */
  const didAutoFixRef = useRef(false);
  useEffect(() => {
    if (didAutoFixRef.current) return;

    const noFilters =
      !applied.search &&
      applied.cats.length === 0 &&
      !applied.onlyOnline &&
      !applied.excludeVacation &&
      applied.selectedDate === "" &&
      (applied.selectedCity === "all" || !applied.selectedCity);

    if (noFilters && applied.sort === "newest" && results === 0) {
      didAutoFixRef.current = true;
      applySortOnly("newest");
    }
  }, [applied, results, applySortOnly]);

  /* mobile breakpoint */
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const setBP = () => setIsMobile(window.innerWidth < 768);
    setBP();
    window.addEventListener("resize", setBP);
    return () => window.removeEventListener("resize", setBP);
  }, []);

  /* outside click (desktop only) */
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isMobile || !isFiltersOpen) return;

    function handler(e: MouseEvent) {
      const target = e.target as Node;
      const inToggle = !!toggleRef.current?.contains(target);
      const inPanel = !!panelRef.current?.contains(target);
      if (!inToggle && !inPanel) setShowFilters(false);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowFilters(false);
    }

    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", onKey);
    };
  }, [isMobile, isFiltersOpen, setShowFilters]);

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

  /* ---------- Sort chips ---------- */
  const SortChips = (
    <div>
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <ArrowDownAZ className="h-5 w-5" /> Ταξινόμηση
      </h3>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {[
          { key: "newest" as SortUiKey, label: "Νεότεροι", Icon: Clock },
          { key: "name" as SortUiKey, label: "Όνομα A–Z", Icon: ArrowDownAZ },
          { key: "experience" as SortUiKey, label: "Εμπειρία", Icon: TagIcon },
          { key: "rating" as SortUiKey, label: "Αξιολόγηση", Icon: Star },
        ].map(({ key, label, Icon }) => (
          <FilterButton
            key={key}
            active={applied.sort === key}
            onClick={() => applySortOnly(key)}
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
      {SortChips}

      <div>
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <TagIcon className="h-5 w-5" /> Τύπος Προπόνησης
        </h3>

        <div className="mb-3 text-xs text-zinc-400">Μπορείς να επιλέξεις πάνω από μία κατηγορία.</div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {CAT_LIST.map(({ value, label, iconKey }) => {
            const Icon = iconKey ? (ICON_BY_KEY as any)[iconKey] || TagIcon : TagIcon;
            const active = value === "all" ? draft.cats.length === 0 : draft.cats.includes(value);

            return (
              <FilterButton
                key={value}
                active={active}
                onClick={() => toggleDraftCategory(value)}
                Icon={Icon}
                label={label}
              />
            );
          })}
        </div>

        {draft.cats.length > 0 && (
          <div className="mt-3 text-xs text-zinc-400">
            Επιλεγμένες κατηγορίες: <span className="text-zinc-200 font-medium">{draft.cats.length}</span>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" /> Ημερομηνία Διαθεσιμότητας
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: "" as DatePreset, label: "Οποιαδήποτε", Icon: CalendarIcon },
            { key: "today" as DatePreset, label: "Σήμερα", Icon: Wifi },
            { key: "tomorrow" as DatePreset, label: "Αύριο", Icon: Sun },
            { key: "week" as DatePreset, label: "Αυτή την εβδομάδα", Icon: CalendarIcon },
          ].map(({ key, label, Icon }) => (
            <button
              key={key || "any"}
              type="button"
              onClick={() => updateDraftField("selectedDate", key)}
              className={`flex items-center justify-center gap-2 p-3 rounded-2xl font-medium border transition-all duration-300 text-sm ${
                draft.selectedDate === key
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

      <div>
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <MapPin className="h-5 w-5" /> Πόλη
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {CITY_LIST.slice(0, 12).map((city) => (
            <button
              key={city.value}
              type="button"
              onClick={() => updateDraftField("selectedCity", city.value)}
              className={`flex items-center justify-center gap-2 p-3 rounded-2xl font-medium border transition-all duration-300 text-sm ${
                draft.selectedCity === city.value
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
            value={draft.selectedCity}
            onChange={(e) => updateDraftField("selectedCity", e.target.value)}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => updateDraftField("onlyOnline", !draft.onlyOnline)}
          className={`p-4 rounded-2xl border transition-all duration-300 text-left ${
            draft.onlyOnline
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200"
              : "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10"
          }`}
        >
          <div className="flex items-center gap-3">
            {draft.onlyOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
            <div>
              <div className="font-semibold">
                {draft.onlyOnline ? "Μόνο online διαθέσιμοι" : "Περιλαμβάνει & offline"}
              </div>
              <div className="text-sm opacity-80">
                {draft.onlyOnline ? "Εμφάνιση μόνο online εκπαιδευτών" : "Εμφάνιση όλων των εκπαιδευτών"}
              </div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => updateDraftField("excludeVacation", !draft.excludeVacation)}
          className={`p-4 rounded-2xl border transition-all duration-300 text-left ${
            draft.excludeVacation
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

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="mb-16"
    >
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
        {/* Top row */}
        <div className="flex items-stretch gap-2 sm:gap-4 mb-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />

            <input
              value={searchInput}
              onChange={(e) => {
                const next = e.target.value;
                updateDraftSearch(searchTokens, next);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "," || e.key === ";") {
                  e.preventDefault();
                  commitInputToTokens();
                  return;
                }

                if (e.key === "Backspace" && !searchInput && searchTokens.length) {
                  e.preventDefault();
                  const last = searchTokens[searchTokens.length - 1];
                  removeToken(last);
                }
              }}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                const terms = splitToTerms(text);
                if (!terms.length) return;

                e.preventDefault();
                const merged = mergeUnique(searchTokens, terms);
                updateDraftSearch(merged, "");
              }}
              placeholder={
                searchTokens.length
                  ? "Πρόσθεσε άλλο όρο… (Enter ή κόμμα)"
                  : "Αναζήτηση… (Enter ή κόμμα για πολλαπλούς όρους)"
              }
              className="control-input w-full pl-11 sm:pl-16 pr-10 sm:pr-12 py-3 sm:py-5 text-sm sm:text-base"
              aria-label="Αναζήτηση"
            />

            {(searchTokens.length > 0 || !!searchInput) && (
              <button
                type="button"
                onClick={clearAllSearch}
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white transition-colors"
                aria-label="Καθαρισμός"
                title="Καθαρισμός"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            ref={toggleRef}
            type="button"
            onClick={() => setShowFilters(!isFiltersOpen)}
            className={`shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl border px-3 sm:px-5 h-11 sm:h-auto transition ${
              isFiltersOpen
                ? "bg-white text-black border-white"
                : "bg-black/40 text-white border-white/10 hover:bg-black/60"
            }`}
            aria-haspopup="dialog"
            aria-expanded={isFiltersOpen ? "true" : "false"}
          >
            <Filter className="h-5 w-5" />
            <span className="hidden sm:inline">Φίλτρα</span>
            {isFiltersOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>

        {/* Search chips */}
        <div className="mb-4">
          {searchTokens.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2">
                {searchTokens.map((t) => (
                  <SearchChip key={t} label={t} onRemove={() => removeToken(t)} />
                ))}

                {searchTokens.length >= MAX_SEARCH_TERMS && (
                  <span className="text-xs text-zinc-400 self-center ml-1">(max {MAX_SEARCH_TERMS})</span>
                )}
              </div>

              <div className="mt-2 text-xs text-zinc-400">
                Πολλαπλή αναζήτηση ενεργή —{" "}
                <span className="text-zinc-200">{searchTokens.length}</span>{" "}
                {searchTokens.length === 1 ? "όρος" : "όροι"} (πάτα Enter/κόμμα για να προσθέσεις)
              </div>
            </>
          ) : (
            <div className="text-xs text-zinc-400">
              Tip: Γράψε π.χ. <span className="text-zinc-200">Pilates, Αθήνα, online</span> και πάτα
              Enter/κόμμα.
            </div>
          )}
        </div>

        {/* Pending changes */}
        {hasPendingChanges && !isFiltersOpen && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3">
            <div className="text-xs sm:text-sm text-amber-100/90">Υπάρχουν αλλαγές που δεν έχουν εφαρμοστεί ακόμα.</div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={discardDraft}
                className="h-10 px-4 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 text-sm font-medium"
              >
                Ακύρωση
              </button>

              <button
                type="button"
                onClick={applyFilters}
                className="h-10 px-4 rounded-xl bg-white text-black hover:bg-zinc-100 text-sm font-semibold inline-flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Εφαρμογή
              </button>
            </div>
          </div>
        )}

        {/* Results line */}
        <div className="text-zinc-300 mb-6">
          <span className="text-white font-bold">{results}</span>{" "}
          {results === 1 ? "εκπαιδευτής" : "εκπαιδευτές"} βρέθηκαν —{" "}
          <span className="opacity-80">Επιλέξτε τον κατάλληλο για εσάς</span>
        </div>

        {/* Desktop filters panel */}
        <AnimatePresence>
          {!isMobile && isFiltersOpen && (
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

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={clearDraftFilters}
                  className="h-12 px-5 rounded-2xl border border-white/10 bg-white/5 text-white hover:bg-white/10 font-medium"
                >
                  Καθαρισμός
                </button>

                <button
                  type="button"
                  onClick={discardDraft}
                  className="h-12 px-5 rounded-2xl border border-white/10 bg-white/5 text-white hover:bg-white/10 font-medium"
                >
                  Ακύρωση
                </button>

                <button
                  type="button"
                  onClick={applyFilters}
                  className="h-12 px-5 rounded-2xl bg-white text-black hover:bg-zinc-100 font-semibold inline-flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  Εφαρμογή Φίλτρων
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </PremiumCard>

      {/* Mobile bottom sheet */}
      {isMobile && (
        <MobileFiltersSheet
          open={isFiltersOpen}
          onClose={() => setShowFilters(false)}
          onApply={applyFilters}
          results={results}
          body={FiltersBody}
        />
      )}

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

        .control-input::placeholder {
          color: rgba(255,255,255,0.5);
        }

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
          background: conic-gradient(
            from 180deg at 50% 50%,
            rgba(255,255,255,0.12),
            rgba(255,255,255,0.02),
            rgba(255,255,255,0.12)
          );
          filter: blur(16px);
          opacity: .22;
          z-index: -1;
        }

        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }

        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </motion.section>
  );
}