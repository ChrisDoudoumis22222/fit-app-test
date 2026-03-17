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
  CalendarCheck2,
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
  Sparkles,
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

  if (pct >= 85 && pct < 100) return "Σχεδόν έτοιμος";

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
    return "border border-white/15 bg-white/10 text-white";
  }

  if (pct >= 85 && pct < 100) {
    return "border border-amber-400/25 bg-amber-500/14 text-amber-300";
  }

  if (
    value === "paused" ||
    value === "hold" ||
    value === "on_hold" ||
    value === "on-hold"
  ) {
    return "border border-white/10 bg-white/10 text-white/65";
  }

  return "border border-sky-400/20 bg-sky-500/10 text-sky-300";
}

function getMotivation(pct = 0) {
  if (pct >= 90) {
    return "Ένα τελευταίο push και το κλειδώνεις. Μην το αφήσεις τώρα.";
  }
  if (pct >= 80) {
    return "Είσαι πάρα πολύ κοντά. Τελείωσέ το και δώσε στον εαυτό σου τη νίκη.";
  }
  if (pct >= 60) {
    return "Πολύ καλή πρόοδος. Συνέχισε έτσι, το αποτέλεσμα φαίνεται ήδη.";
  }
  if (pct >= 35) {
    return "Έχεις χτίσει ρυθμό. Κράτα συνέπεια και θα το δεις να απογειώνεται.";
  }
  if (pct > 0) {
    return "Έκανες την αρχή. Αυτό που μετράει τώρα είναι να μη σπάσεις το momentum.";
  }
  return "Ξεκίνα σήμερα με ένα μικρό βήμα. Η συνέπεια χτίζει το αποτέλεσμα.";
}

function getProgressTone(pct = 0) {
  if (pct >= 85) return "from-amber-300 via-amber-400 to-yellow-300";
  if (pct >= 60) return "from-sky-300 via-white to-sky-300";
  return "from-white via-white to-white/80";
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
        "animate-pulse rounded-xl bg-gradient-to-r from-white/[0.05] via-white/[0.09] to-white/[0.05]",
        className
      )}
    />
  );
}

function GoalPreviewSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
      <div className="space-y-3.5">
        <div className="flex items-start gap-3">
          <SkeletonPulse className="h-11 w-11 shrink-0 rounded-2xl" />
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

        <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
          <SkeletonPulse className="h-10 w-full rounded-xl" />
          <SkeletonPulse className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function GoalsCardSkeleton() {
  return (
    <section className="relative -mx-4 w-[calc(100%+2rem)] overflow-hidden bg-transparent sm:mx-0 sm:w-full sm:rounded-[30px] sm:border sm:border-white/10 sm:bg-black">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.02),transparent_28%,transparent_72%,rgba(255,255,255,0.015))]" />

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
    <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.025] px-6 py-10 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
        {icon}
      </div>

      <h4 className="text-xl font-semibold text-white">{title}</h4>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/55">
        {message}
      </p>

      <div className="mt-6">
        <m.button
          onClick={onClick}
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
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
  const isAlmostThere = pct >= 85 && pct < 100;

  return (
    <m.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.05 }}
      className="group cursor-pointer rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.05]"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={onKeyOpen}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
                isAlmostThere
                  ? "border-amber-400/25 bg-amber-500/10"
                  : "border-white/10 bg-white/[0.04]"
              )}
            >
              {goal?.icon || goal?.category ? (
                <GoalIconRenderer
                  category={goal?.category}
                  icon={goal?.icon}
                  className={cn(
                    "h-5 w-5",
                    isAlmostThere ? "text-amber-300" : "text-white/80"
                  )}
                />
              ) : isAlmostThere ? (
                <Flame className="h-5 w-5 text-amber-300" />
              ) : (
                <CalendarCheck2 className="h-5 w-5 text-white/80" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="truncate text-base font-semibold text-white sm:text-[17px]">
                  {goal?.title || "Στόχος"}
                </h4>

                <div
                  className={cn(
                    "inline-flex w-fit items-center rounded-full px-3 py-1.5 text-xs font-medium",
                    getStatusClasses(goal?.status, pct)
                  )}
                >
                  {statusLabel}
                </div>
              </div>

              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/38">
                {categoryLabel}
              </p>

<p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/38">
  {categoryLabel}
</p>

              <div className="mt-3">
                <div className="mb-2 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className={cn(
                      "h-full rounded-full bg-gradient-to-r transition-all duration-500",
                      getProgressTone(pct)
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs text-white/75">
                    <Target className="h-3.5 w-3.5" />
                    <span>{pct.toFixed(0)}% πρόοδος</span>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs text-white/75">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    <span>{dueDateText}</span>
                  </div>

                  {isAlmostThere && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Λίγο ακόμα 👀</span>
                    </div>
                  )}
                </div>

                <p
                  className={cn(
                    "mt-3 text-xs leading-5",
                    isAlmostThere ? "text-amber-200/90" : "text-white/55"
                  )}
                >
                  {motivation}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <div className="inline-flex items-center gap-1 text-xs text-white/35 transition-opacity duration-200 group-hover:text-white/55">
            Προβολή στόχου
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </m.div>
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
      <div className="relative -mx-4 w-[calc(100%+2rem)] overflow-hidden bg-transparent sm:mx-0 sm:w-full sm:rounded-[30px] sm:border sm:border-white/10 sm:bg-black">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.02),transparent_28%,transparent_72%,rgba(255,255,255,0.015))]" />

        <div className="relative px-4 py-5 sm:p-6 lg:p-7">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-[24px] font-semibold tracking-[-0.03em] text-white sm:text-[28px]">
                Οι Στόχοι σου
              </h3>
              <p className="mt-1 text-sm text-white/50">
                Δες τους ενεργούς στόχους σου και κλείσε αυτούς που είναι κοντά.
              </p>
            </div>

            <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white sm:text-white/75">
              {allCount} συνολικά
            </div>
          </div>

          {viewState === "error" ? (
            <InfoState
              icon={<AlertCircle className="h-7 w-7 text-white/70" />}
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
              icon={<CheckCircle className="h-7 w-7 text-white/70" />}
              title="Έχεις ολοκληρώσει όλους τους στόχους σου"
              message="Πολύ δυνατό. Ώρα να βάλεις τον επόμενο στόχο και να συνεχίσεις το momentum σου."
              buttonLabel="Βάλε νέο στόχο"
              onClick={goToGoals}
            />
          ) : viewState === "empty" ? (
            <InfoState
              icon={<Target className="h-7 w-7 text-white/70" />}
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
                <p className="text-xs text-white/45">
                  Εμφανίζονται {shownCount} από {allCount} ενεργούς στόχους
                </p>

                <m.button
                  onClick={goToGoals}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(0,0,0,0.45)] transition hover:bg-[#12161c] sm:bg-[#0c0f14]"
                >
                  <ArrowRight className="h-3.5 w-3.5 rotate-[-45deg]" />
                  Προβολή όλων
                </m.button>
              </div>
            </>
          )}
        </div>
      </div>
    </LazyMotion>
  );
}