"use client";

import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { LazyMotion, domAnimation, m } from "framer-motion";
import {
  Target,
  ArrowRight,
  CalendarCheck2,
  Sparkles,
  Flame,
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

export default function GoalsCard({ goals = [], onNavigate }) {
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

  const hasGoals = visibleGoals.length > 0;
  const shownCount = visibleGoals.length;
  const allCount = activeGoals.length;
  const hadGoalsButCompletedAll = allGoals.length > 0 && activeGoals.length === 0;

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

          {hasGoals ? (
            <>
              <div className="space-y-3">
                {visibleGoals.map((goal, index) => {
                  const pct = normalizePct(goal?.progressPct);
                  const statusLabel = getStatusLabel(goal?.status, pct);
                  const motivation = getMotivation(pct);
                  const isAlmostThere = pct >= 85 && pct < 100;

                  return (
                    <m.div
                      key={goal?.id || index}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group cursor-pointer rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.05]"
                      onClick={goToGoals}
                      role="button"
                      tabIndex={0}
                      onKeyDown={onKeyToGoals}
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
                              {isAlmostThere ? (
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

                              <p className="mt-1 truncate text-sm text-white/52">
                                {goal?.description ||
                                  "Μικρά σταθερά βήματα χτίζουν μεγάλο αποτέλεσμα."}
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
                          <div className="text-xs text-white/35 transition-opacity duration-200 group-hover:text-white/55">
                            Προβολή στόχου
                          </div>
                        </div>
                      </div>
                    </m.div>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-white/45">
                  {allCount} συνολικά
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
          ) : hadGoalsButCompletedAll ? (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.025] px-6 py-10 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                <Target className="h-7 w-7 text-white/70" />
              </div>

              <h4 className="text-xl font-semibold text-white">
                Έχεις ολοκληρώσει όλους τους στόχους σου
              </h4>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/55">
                Πολύ δυνατό. Ώρα να βάλεις τον επόμενο στόχο και να συνεχίσεις το momentum σου.
              </p>

              <div className="mt-6">
                <m.button
                  onClick={goToGoals}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  Βάλε νέο στόχο
                  <ArrowRight className="h-4 w-4" />
                </m.button>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.025] px-6 py-10 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                <Target className="h-7 w-7 text-white/70" />
              </div>

              <h4 className="text-xl font-semibold text-white">
                Δεν υπάρχουν στόχοι ακόμα
              </h4>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/50">
                Μόλις ορίσεις τον πρώτο σου στόχο, θα εμφανιστεί εδώ για να έχεις άμεση εικόνα της πορείας σου.
              </p>

              <div className="mt-6">
                <m.button
                  onClick={goToGoals}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  Δημιούργησε στόχο
                  <ArrowRight className="h-4 w-4" />
                </m.button>
              </div>
            </div>
          )}
        </div>
      </div>
    </LazyMotion>
  );
}