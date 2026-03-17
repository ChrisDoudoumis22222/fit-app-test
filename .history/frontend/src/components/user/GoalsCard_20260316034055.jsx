"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
  Suspense,
  lazy,
} from "react";
import { useNavigate } from "react-router-dom";
import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";
import {
  Target,
  ArrowRight,
  Calendar as CalendarIcon,
  Activity,
  Flame,
  Star,
  Trophy,
  Users,
  Heart,
  BookOpen,
  Briefcase,
  Tag,
  CheckCircle,
  AlertCircle,
  ChevronRight,
} from "lucide-react";

const cn = (...classes) => classes.filter(Boolean).join(" ");

/* -------------------------------------------------------------------------- */
/*                                ICON HELPER                                 */
/* -------------------------------------------------------------------------- */
function GoalIconRenderer({ category, icon, className }) {
  const defaults = {
    fitness: Activity,
    consistency: Flame,
    skills: Star,
    strength: Trophy,
    health: Heart,
    learning: BookOpen,
    career: Briefcase,
    social: Users,
    custom: Tag,
  };

  if (icon && /^https?:\/\//i.test(icon)) {
    return (
      <img
        src={icon}
        alt="εικονίδιο"
        loading="lazy"
        decoding="async"
        className={cn("h-5 w-5 object-cover", className)}
      />
    );
  }

  const looksLikeEmoji =
    icon && !/^https?:\/\//i.test(icon) && String(icon).length <= 6;

  if (looksLikeEmoji) {
    return (
      <span className={cn("text-lg leading-none", className || "")}>
        {icon}
      </span>
    );
  }

  const FallbackIcon = defaults[category || ""] || Target;
  return <FallbackIcon className={className || "h-4.5 w-4.5"} />;
}

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */
function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

function normalizePct(value) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return 0;
  return clamp(raw, 0, 100);
}

function isCompletedStatus(status) {
  const value = String(status || "").toLowerCase().trim();
  return (
    value === "completed" ||
    value === "done" ||
    value === "success" ||
    value === "finished"
  );
}

function isCompletedGoal(goal) {
  const pct = normalizePct(goal?.progressPct);
  return isCompletedStatus(goal?.status) || pct >= 100;
}

function toGreekCategoryLabel(category, customCategory) {
  const normalized = String(category ?? "").trim().toLowerCase();

  const map = {
    fitness: "Fitness",
    consistency: "Συνέπεια",
    skills: "Δεξιότητες",
    strength: "Δύναμη",
    health: "Υγεία",
    learning: "Μάθηση",
    career: "Καριέρα",
    social: "Κοινωνικά",
    custom: customCategory?.trim() || "Προσαρμοσμένη",
  };

  return map[normalized] || customCategory?.trim() || category || "Στόχος";
}

function getStatusLabel(status, pct = 0) {
  const value = String(status || "").toLowerCase().trim();

  if (pct >= 85 && pct < 100) {
    return "Σχεδόν έτοιμος";
  }

  if (
    value === "active" ||
    value === "in_progress" ||
    value === "in-progress" ||
    value === "progress" ||
    value === "ongoing"
  ) {
    return "Σε εξέλιξη";
  }

  if (
    value === "paused" ||
    value === "hold" ||
    value === "on_hold" ||
    value === "on-hold"
  ) {
    return "Σε παύση";
  }

  return "Ενεργός";
}

function getStatusClasses(status, pct = 0) {
  const value = String(status || "").toLowerCase().trim();

  if (isCompletedStatus(value) || pct >= 100) {
    return "border-white/15 bg-white/10 text-white";
  }

  if (pct >= 85 && pct < 100) {
    return "border-white/15 bg-white/8 text-white";
  }

  if (
    value === "paused" ||
    value === "hold" ||
    value === "on_hold" ||
    value === "on-hold"
  ) {
    return "border-zinc-700 bg-zinc-800/90 text-zinc-300";
  }

  return "border-zinc-700 bg-zinc-800/90 text-zinc-100";
}

function getMotivation(pct = 0) {
  if (pct >= 90) {
    return "Ένα τελευταίο push και το κλειδώνεις. Μην το αφήσεις τώρα.";
  }
  if (pct >= 80) {
    return "Είσαι πολύ κοντά. Συνέχισε με τον ίδιο ρυθμό.";
  }
  if (pct >= 60) {
    return "Πολύ καλή πρόοδος. Το αποτέλεσμα φαίνεται ήδη.";
  }
  if (pct >= 35) {
    return "Έχεις χτίσει ρυθμό. Κράτα συνέπεια.";
  }
  if (pct > 0) {
    return "Έκανες την αρχή. Το momentum είναι το πιο σημαντικό τώρα.";
  }
  return "Ξεκίνα με ένα μικρό βήμα και κράτα σταθερότητα.";
}

function getProgressBarClasses(pct = 0) {
  if (pct >= 85) {
    return "from-white via-zinc-200 to-zinc-300";
  }
  if (pct >= 50) {
    return "from-zinc-100 via-zinc-300 to-zinc-400";
  }
  return "from-zinc-300 via-zinc-400 to-zinc-500";
}

function formatDueDate(value) {
  if (!value) return "Χωρίς προθεσμία";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Χωρίς προθεσμία";

  return date.toLocaleDateString("el-GR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* -------------------------------------------------------------------------- */
/*                                  SKELETON                                  */
/* -------------------------------------------------------------------------- */
function SkeletonPulse({ className = "" }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800",
        className
      )}
    />
  );
}

function GoalPreviewSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-[1.35rem] border border-zinc-800 bg-zinc-900/95 p-3.5 sm:p-4">
      <div className="space-y-3.5">
        <div className="flex items-start gap-3">
          <SkeletonPulse className="h-11 w-11 shrink-0 rounded-[1rem]" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonPulse className="h-4 w-32 rounded-lg" />
            <SkeletonPulse className="h-3.5 w-20 rounded-lg" />
            <SkeletonPulse className="h-3.5 w-11/12 rounded-lg" />
          </div>
          <SkeletonPulse className="h-6 w-20 rounded-full" />
        </div>

        <SkeletonPulse className="h-2.5 w-full rounded-full" />

        <div className="flex flex-wrap gap-2">
          <SkeletonPulse className="h-7 w-24 rounded-full" />
          <SkeletonPulse className="h-7 w-28 rounded-full" />
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-zinc-800 pt-3">
          <SkeletonPulse className="h-10 w-full rounded-xl" />
          <SkeletonPulse className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function GoalsCardSkeleton() {
  return (
    <section className="relative -mx-4 w-[calc(100%+2rem)] overflow-hidden bg-zinc-950 sm:mx-0 sm:w-full sm:rounded-[1.75rem] sm:border sm:border-zinc-800">
      <div className="relative px-4 py-5 sm:p-6 lg:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <SkeletonPulse className="mb-3 h-6 w-36 rounded-lg" />
            <SkeletonPulse className="h-4 w-64 max-w-full rounded-lg" />
          </div>
          <SkeletonPulse className="h-7 w-20 rounded-full" />
        </div>

        <div className="space-y-3">
          <GoalPreviewSkeleton />
          <GoalPreviewSkeleton />
          <GoalPreviewSkeleton />
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <SkeletonPulse className="h-3.5 w-36 rounded-lg" />
          <SkeletonPulse className="h-10 w-32 rounded-full" />
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                               STATE BLOCK                                  */
/* -------------------------------------------------------------------------- */
function InfoState({
  icon,
  title,
  message,
  buttonLabel,
  onClick,
}) {
  return (
    <div className="rounded-[1.5rem] border border-zinc-800 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(10,10,12,0.98))] px-6 py-10 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-zinc-700 bg-white/[0.03]">
        {icon}
      </div>

      <h4 className="text-xl font-semibold tracking-tight text-white">
        {title}
      </h4>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-400">
        {message}
      </p>

      <div className="mt-6">
        <m.button
          onClick={onClick}
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full border border-zinc-700 bg-zinc-800 px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-700"
        >
          {buttonLabel}
          <ArrowRight className="h-4 w-4" />
        </m.button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               PREVIEW ITEM                                 */
/* -------------------------------------------------------------------------- */
const GoalPreviewRowInner = memo(function GoalPreviewRowInner({
  goal,
  index,
  onOpen,
  onKeyOpen,
}) {
  const pct = normalizePct(goal?.progressPct);
  const statusLabel = getStatusLabel(goal?.status, pct);
  const categoryLabel = toGreekCategoryLabel(goal?.category, goal?.custom_category);
  const dueDateText = formatDueDate(goal?.due_date);
  const motivation = getMotivation(pct);

  return (
    <m.article
      initial={{ opacity: 0, y: 18, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.985 }}
      transition={{
        delay: index * 0.04,
        duration: 0.34,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -2 }}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-[1.4rem] border p-3.5 sm:p-4",
        "border-zinc-800 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(10,10,12,0.98))]"
      )}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={onKeyOpen}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex flex-1 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border border-zinc-700 bg-white/[0.03] text-zinc-100">
              <GoalIconRenderer
                category={goal?.category}
                icon={goal?.icon}
                className="h-[16px] w-[16px] shrink-0 text-zinc-100"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4
                  className="truncate text-[1rem] font-bold leading-[1.15] tracking-tight text-white"
                  title={goal?.title || "Στόχος"}
                >
                  {goal?.title || "Στόχος"}
                </h4>

                <span
                  className={cn(
                    "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em]",
                    getStatusClasses(goal?.status, pct)
                  )}
                >
                  {statusLabel}
                </span>
              </div>

              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400">
                {categoryLabel}
              </p>

              <p
                className="mt-2 text-[13px] leading-5 text-zinc-400 sm:text-[13.5px]"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {goal?.description?.trim() ||
                  "Παρακολούθησε την πορεία σου και κράτα τον στόχο σου σε συνεχή εξέλιξη."}
              </p>
            </div>
          </div>

          <div className="hidden shrink-0 items-center text-zinc-500 transition group-hover:text-zinc-200 sm:flex">
            <ChevronRight className="h-4.5 w-4.5" />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              Πρόοδος
            </span>
            <span className="text-xs font-semibold text-zinc-100">
              {Math.round(pct)}%
            </span>
          </div>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={cn(
                "h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out",
                getProgressBarClasses(pct)
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-[10px] font-medium text-zinc-200">
            <Activity className="h-3.5 w-3.5" />
            {goal?.progress_value ?? goal?.progressPct ?? 0}
            {goal?.unit ? ` ${goal.unit}` : ""}
            {goal?.target_value != null ? (
              <span className="text-zinc-500"> / {goal.target_value}</span>
            ) : null}
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-[10px] font-medium text-zinc-200">
            <CalendarIcon className="h-3.5 w-3.5" />
            {dueDateText}
          </div>
        </div>

        <p className="mt-3 text-xs leading-5 text-zinc-500">
          {motivation}
        </p>
      </div>
    </m.article>
  );
});

const GoalPreviewRow = lazy(() =>
  Promise.resolve({ default: GoalPreviewRowInner })
);

/* -------------------------------------------------------------------------- */
/*                              LAZY ITEM WRAPPER                             */
/* -------------------------------------------------------------------------- */
function LazyGoalPreview(props) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || hasEntered) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasEntered(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "200px 0px",
        threshold: 0.01,
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasEntered]);

  return (
    <div ref={ref} className="min-h-[220px]">
      {isVisible ? <GoalPreviewRow {...props} /> : <GoalPreviewSkeleton />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   CARD                                     */
/* -------------------------------------------------------------------------- */
export default function GoalsCard({
  goals = [],
  loading = false,
  error = "",
  onNavigate,
}) {
  const navigate = useNavigate();

  const go = (path) => {
    if (typeof onNavigate === "function") {
      onNavigate(path);
      return;
    }

    if (navigate) {
      navigate(path);
      return;
    }

    if (typeof window !== "undefined") {
      window.location.assign(path);
    }
  };

  const goToGoals = () => go("/goals");

  const onKeyToGoals = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goToGoals();
    }
  };

  const allGoals = Array.isArray(goals) ? goals : [];

  const activeGoals = useMemo(() => {
    return allGoals.filter((goal) => !isCompletedGoal(goal));
  }, [allGoals]);

  const visibleGoals = useMemo(() => {
    return activeGoals.slice(0, 3);
  }, [activeGoals]);

  const hasGoals = visibleGoals.length > 0;
  const allCount = activeGoals.length;
  const shownCount = visibleGoals.length;
  const hadGoalsButCompletedAll = allGoals.length > 0 && activeGoals.length === 0;

  const viewState = useMemo(() => {
    if (loading) return "loading";
    if (error) return "error";
    if (hasGoals) return "list";
    if (hadGoalsButCompletedAll) return "completed";
    return "empty";
  }, [loading, error, hasGoals, hadGoalsButCompletedAll]);

  if (viewState === "loading") {
    return <GoalsCardSkeleton />;
  }

  return (
    <LazyMotion features={domAnimation}>
      <section className="relative -mx-4 w-[calc(100%+2rem)] overflow-hidden bg-zinc-950 sm:mx-0 sm:w-full sm:rounded-[1.75rem] sm:border sm:border-zinc-800">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.018),rgba(255,255,255,0.008))]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="relative px-4 py-5 sm:p-6 lg:p-7">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-zinc-300">
                <Target className="h-3.5 w-3.5" />
                Goals
              </div>

              <h3 className="text-[24px] font-semibold tracking-[-0.03em] text-white sm:text-[28px]">
                Οι Στόχοι σου
              </h3>

              <p className="mt-1 text-sm leading-6 text-zinc-400">
                Δες γρήγορα τους ενεργούς στόχους σου σε πιο compact μορφή.
              </p>
            </div>

            <div className="shrink-0 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200">
              {allCount} συνολικά
            </div>
          </div>

          {viewState === "error" ? (
            <InfoState
              icon={<AlertCircle className="h-7 w-7 text-zinc-200" />}
              title="Κάτι δεν φόρτωσε σωστά"
              message={
                typeof error === "string" && error.trim()
                  ? error
                  : "Δεν μπορέσαμε να φορτώσουμε τους στόχους αυτή τη στιγμή."
              }
              buttonLabel="Προβολή στόχων"
              onClick={goToGoals}
            />
          ) : viewState === "completed" ? (
            <InfoState
              icon={<CheckCircle className="h-7 w-7 text-zinc-100" />}
              title="Έχεις ολοκληρώσει όλους τους στόχους σου"
              message="Πολύ δυνατό. Ώρα να βάλεις τον επόμενο στόχο και να συνεχίσεις το momentum σου."
              buttonLabel="Βάλε νέο στόχο"
              onClick={goToGoals}
            />
          ) : viewState === "empty" ? (
            <InfoState
              icon={<Target className="h-7 w-7 text-zinc-200" />}
              title="Δεν υπάρχουν στόχοι ακόμα"
              message="Μόλις ορίσεις τον πρώτο σου στόχο, θα εμφανιστεί εδώ για να έχεις άμεση εικόνα της πορείας σου."
              buttonLabel="Δημιούργησε στόχο"
              onClick={goToGoals}
            />
          ) : (
            <>
              <Suspense
                fallback={
                  <div className="space-y-3">
                    <GoalPreviewSkeleton />
                    <GoalPreviewSkeleton />
                    <GoalPreviewSkeleton />
                  </div>
                }
              >
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {visibleGoals.map((goal, index) => (
                      <LazyGoalPreview
                        key={goal?.id ?? index}
                        goal={goal}
                        index={index}
                        onOpen={goToGoals}
                        onKeyOpen={onKeyToGoals}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </Suspense>

              <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-zinc-500">
                  Εμφανίζονται {shownCount} από {allCount} ενεργούς στόχους
                </p>

                <m.button
                  onClick={goToGoals}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-700"
                >
                  <ArrowRight className="h-3.5 w-3.5 rotate-[-45deg]" />
                  Προβολή όλων
                </m.button>
              </div>
            </>
          )}
        </div>
      </section>
    </LazyMotion>
  );
}