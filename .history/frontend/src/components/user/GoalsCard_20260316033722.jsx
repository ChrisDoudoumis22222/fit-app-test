"use client";

import React, { Suspense, lazy, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { LazyMotion, domAnimation, m } from "framer-motion";
import {
  Target,
  ArrowRight,
  CalendarCheck2,
  Sparkles,
  Flame,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function normalizePct(value) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(raw, 100));
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

  if (pct >= 85 && pct < 100) {
    return "border border-amber-400/20 bg-amber-400/10 text-amber-200";
  }

  if (
    value === "paused" ||
    value === "hold" ||
    value === "on_hold" ||
    value === "on-hold"
  ) {
    return "border border-white/10 bg-white/[0.05] text-white/65";
  }

  return "border border-sky-400/20 bg-sky-400/10 text-sky-200";
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
  if (pct >= 85) return "from-amber-200 via-amber-300 to-yellow-200";
  if (pct >= 60) return "from-sky-200 via-white to-sky-300";
  return "from-white via-white to-white/75";
}

function GoalRowInner({ goal, index, goToGoals, onKeyToGoals }) {
  const pct = normalizePct(goal?.progressPct);
  const statusLabel = getStatusLabel(goal?.status, pct);
  const motivation = getMotivation(pct);
  const isAlmostThere = pct >= 85 && pct < 100;

  return (
    <m.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.32, ease: "easeOut" }}
      className={cn(
        "group relative overflow-hidden rounded-[24px] border px-4 py-4 sm:px-5 sm:py-5",
        "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))]",
        "shadow-[0_10px_35px_rgba(0,0,0,0.28)] transition-all duration-250",
        "hover:border-white/20 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))]",
        "cursor-pointer"
      )}
      onClick={goToGoals}
      role="button"
      tabIndex={0}
      onKeyDown={onKeyToGoals}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                "mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
                isAlmostThere
                  ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
                  : "border-white/10 bg-white/[0.05] text-white/80"
              )}
            >
              {isAlmostThere ? (
                <Flame className="h-5 w-5" />
              ) : (
                <CalendarCheck2 className="h-5 w-5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="truncate text-[15px] font-semibold tracking-[-0.02em] text-white sm:text-[17px]">
                  {goal?.title || "Στόχος"}
                </h4>

                <div
                  className={cn(
                    "inline-flex w-fit items-center rounded-full px-3 py-1.5 text-[11px] font-medium sm:text-xs",
                    getStatusClasses(goal?.status, pct)
                  )}
                >
                  {statusLabel}
                </div>
              </div>

              <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-white/52">
                {goal?.description ||
                  "Μικρά σταθερά βήματα χτίζουν μεγάλο αποτέλεσμα."}
              </p>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                    Progress
                  </span>
                  <span className="text-xs font-medium text-white/60">
                    {pct.toFixed(0)}%
                  </span>
                </div>

                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)]" />
                  <div
                    className={cn(
                      "relative h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out",
                      getProgressTone(pct)
                    )}
                    style={{ width: `${pct}%` }}
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.2),transparent)]" />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white/72">
                    <Target className="h-3.5 w-3.5" />
                    <span>{pct.toFixed(0)}% πρόοδος</span>
                  </div>

                  {isAlmostThere && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-200">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Λίγο ακόμα 👀</span>
                    </div>
                  )}
                </div>

                <p
                  className={cn(
                    "mt-3 text-xs leading-5",
                    isAlmostThere ? "text-amber-100/90" : "text-white/55"
                  )}
                >
                  {motivation}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-white/38 transition-all duration-200 group-hover:text-white/62">
            Προβολή στόχου
            <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </m.div>
  );
}

const GoalRow = lazy(() => Promise.resolve({ default: GoalRowInner }));

function GoalsSkeletonCard({ index = 0 }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.035] px-4 py-4 sm:px-5 sm:py-5"
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent)]" />
      <div className="flex items-start gap-3.5">
        <div className="h-12 w-12 shrink-0 rounded-[18px] bg-white/10" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="h-4 w-40 rounded-full bg-white/10" />
            <div className="h-7 w-24 rounded-full bg-white/10" />
          </div>
          <div className="mt-2 h-3 w-11/12 rounded-full bg-white/10" />
          <div className="mt-2 h-3 w-8/12 rounded-full bg-white/10" />
          <div className="mt-4 h-2.5 w-full rounded-full bg-white/10" />
          <div className="mt-3 flex gap-2">
            <div className="h-8 w-28 rounded-full bg-white/10" />
            <div className="h-8 w-24 rounded-full bg-white/10" />
          </div>
          <div className="mt-3 h-3 w-10/12 rounded-full bg-white/10" />
        </div>
      </div>
    </m.div>
  );
}

function GoalsListSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3">
      <style>{`
        @keyframes shimmer {
          100% {
            transform: translateX(200%);
          }
        }
      `}</style>
      {Array.from({ length: count }).map((_, index) => (
        <GoalsSkeletonCard key={index} index={index} />
      ))}
    </div>
  );
}

function InfoState({
  icon = <Target className="h-7 w-7 text-white/70" />,
  title,
  message,
  buttonLabel,
  onClick,
  buttonDark = false,
}) {
  return (
    <div className="rounded-[26px] border border-dashed border-white/10 bg-white/[0.025] px-6 py-10 text-center sm:px-8">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        {icon}
      </div>

      <h4 className="text-xl font-semibold tracking-[-0.02em] text-white">
        {title}
      </h4>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/52">
        {message}
      </p>

      <div className="mt-6">
        <m.button
          onClick={onClick}
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          className={cn(
            "inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition",
            buttonDark
              ? "border border-white/10 bg-black text-white hover:bg-[#12161c]"
              : "bg-white text-black hover:bg-white/90"
          )}
        >
          {buttonLabel}
          <ArrowRight className="h-4 w-4" />
        </m.button>
      </div>
    </div>
  );
}

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

  const goToGoals = () => {
    go("/goals");
  };

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
    return activeGoals.slice(0, 5);
  }, [activeGoals]);

  const allCount = activeGoals.length;
  const shownCount = visibleGoals.length;
  const hasGoals = visibleGoals.length > 0;
  const hadGoalsButCompletedAll = allGoals.length > 0 && activeGoals.length === 0;

  const viewState = useMemo(() => {
    if (loading) return "loading";
    if (error) return "error";
    if (hasGoals) return "list";
    if (hadGoalsButCompletedAll) return "completed";
    return "empty";
  }, [loading, error, hasGoals, hadGoalsButCompletedAll]);

  return (
    <LazyMotion features={domAnimation}>
      <section className="relative -mx-4 w-[calc(100%+2rem)] overflow-hidden bg-[#0a0d12] sm:mx-0 sm:w-full sm:rounded-[30px] sm:border sm:border-white/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_top_right,rgba(125,211,252,0.08),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="relative px-4 py-5 sm:p-6 lg:p-7">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/55">
                <Target className="h-3.5 w-3.5" />
                Goals
              </div>

              <h3 className="text-[24px] font-semibold tracking-[-0.03em] text-white sm:text-[28px]">
                Οι Στόχοι σου
              </h3>

              <p className="mt-1 text-sm leading-6 text-white/50">
                Δες τους ενεργούς στόχους σου και κλείσε αυτούς που είναι κοντά.
              </p>
            </div>

            <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/75">
              {loading ? "..." : `${allCount} συνολικά`}
            </div>
          </div>

          {viewState === "loading" ? (
            <GoalsListSkeleton count={3} />
          ) : viewState === "error" ? (
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
              buttonDark
            />
          ) : viewState === "list" ? (
            <>
              <Suspense fallback={<GoalsListSkeleton count={Math.min(shownCount || 3, 5)} />}>
                <div className="space-y-3">
                  {visibleGoals.map((goal, index) => (
                    <GoalRow
                      key={goal?.id || index}
                      goal={goal}
                      index={index}
                      goToGoals={goToGoals}
                      onKeyToGoals={onKeyToGoals}
                    />
                  ))}
                </div>
              </Suspense>

              <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-white/42">
                  Εμφανίζονται {shownCount} από {allCount} ενεργούς στόχους
                </p>

                <m.button
                  onClick={goToGoals}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(0,0,0,0.45)] transition hover:bg-[#12161c]"
                >
                  <ArrowRight className="h-3.5 w-3.5 rotate-[-45deg]" />
                  Προβολή όλων
                </m.button>
              </div>
            </>
          ) : viewState === "completed" ? (
            <InfoState
              title="Έχεις ολοκληρώσει όλους τους στόχους σου"
              message="Πολύ δυνατό. Ώρα να βάλεις τον επόμενο στόχο και να συνεχίσεις το momentum σου."
              buttonLabel="Βάλε νέο στόχο"
              onClick={goToGoals}
            />
          ) : (
            <InfoState
              title="Δεν υπάρχουν στόχοι ακόμα"
              message="Μόλις ορίσεις τον πρώτο σου στόχο, θα εμφανιστεί εδώ για να έχεις άμεση εικόνα της πορείας σου."
              buttonLabel="Δημιούργησε στόχο"
              onClick={goToGoals}
            />
          )}
        </div>
      </section>
    </LazyMotion>
  );
}