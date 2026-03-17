"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { Target, ArrowUpRight, CalendarCheck2 } from "lucide-react";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getStatusLabel(status) {
  const value = String(status || "").toLowerCase().trim();

  if (
    value === "completed" ||
    value === "done" ||
    value === "success" ||
    value === "finished"
  ) {
    return "Ολοκληρωμένος";
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

function getStatusClasses(status) {
  const value = String(status || "").toLowerCase().trim();

  if (
    value === "completed" ||
    value === "done" ||
    value === "success" ||
    value === "finished"
  ) {
    return "border border-white/18 bg-white text-black";
  }

  if (
    value === "paused" ||
    value === "hold" ||
    value === "on_hold" ||
    value === "on-hold"
  ) {
    return "border border-white/10 bg-white/[0.06] text-white/70";
  }

  return "border border-white/10 bg-white/[0.08] text-white/85";
}

const INITIAL_GOALS = 4;
const LOAD_MORE_STEP = 4;

export default function GoalsCard({ goals = [], onNavigate }) {
  const navigate = useNavigate();
  const loadMoreRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_GOALS);

  const go = (path) => {
    if (typeof onNavigate === "function") {
      onNavigate(path);
      return;
    }

    if (typeof window !== "undefined") {
      window.location.assign(path);
      return;
    }

    navigate(path);
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

  useEffect(() => {
    setVisibleCount(INITIAL_GOALS);
  }, [goals]);

  useEffect(() => {
    if (!loadMoreRef.current) return;
    if (visibleCount >= goals.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;

        setVisibleCount((prev) =>
          Math.min(prev + LOAD_MORE_STEP, goals.length)
        );
      },
      {
        root: null,
        rootMargin: "140px 0px",
        threshold: 0.1,
      }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [visibleCount, goals.length]);

  const visibleGoals = useMemo(() => {
    if (!Array.isArray(goals)) return [];
    return goals.slice(0, visibleCount);
  }, [goals, visibleCount]);

  const hasGoals = visibleGoals.length > 0;
  const shownCount = visibleGoals.length;
  const allCount = goals.length || 0;
  const hasMoreGoals = visibleCount < goals.length;

  return (
    <LazyMotion features={domAnimation}>
      <div className="relative mb-12 w-full overflow-hidden bg-transparent sm:rounded-[30px] sm:border sm:border-white/10 sm:bg-black">
        <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(135deg,rgba(255,255,255,0.02),transparent_28%,transparent_72%,rgba(255,255,255,0.015))] sm:block" />

        <div className="relative py-5 sm:p-6 lg:p-7">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-[24px] font-semibold tracking-[-0.03em] text-white sm:text-[28px]">
                Οι Στόχοι σου
              </h3>
<>
  {/* Mobile */}
  <p className="mt-1 text-sm text-white/50 sm:hidden">
    Στόχοι με πρόοδο που φαίνεται
  </p>

  {/* Desktop */}
  <p className="mt-1 hidden text-sm text-white/50 sm:block">
    Κατεύθυνση, συνέπεια και πρόοδος που φαίνεται
  </p>
</>
            </div>

            <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/75">
              {allCount} συνολικά
            </div>
          </div>

          {hasGoals ? (
            <>
              <div className="space-y-3">
                {visibleGoals.map((goal, index) => {
                  const pct = Math.min(Number(goal?.progressPct || 0), 100);
                  const statusLabel = getStatusLabel(goal?.status);

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
                      <div className="flex items-start gap-4">
                        <CalendarCheck2 className="mt-0.5 h-9 w-9 shrink-0 text-white/85" />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="truncate text-base font-semibold text-white sm:text-[17px]">
                              {goal?.title || "Στόχος"}
                            </h4>

                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
                                getStatusClasses(goal?.status)
                              )}
                            >
                              {statusLabel}
                            </span>
                          </div>

                          <p className="mt-1 truncate text-sm text-white/52">
                            {goal?.description ||
                              "Μικρά σταθερά βήματα χτίζουν μεγάλο αποτέλεσμα."}
                          </p>

                          <div className="mt-3">
                            <div className="mb-2 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-white transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs text-white/75">
                                <Target className="h-3.5 w-3.5" />
                                <span>{pct.toFixed(0)}% πρόοδος</span>
                              </div>

                              <div className="text-xs text-white/35 transition-opacity duration-200 group-hover:text-white/55">
                                Προβολή στόχου
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </m.div>
                  );
                })}
              </div>

              {hasMoreGoals && (
                <div ref={loadMoreRef} className="mt-4 flex justify-center">
                  <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/60">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white/70" />
                    Φόρτωση περισσότερων στόχων...
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between">
                <p className="text-xs text-white/45">
                  Εμφανίζονται {shownCount} από {allCount} στόχους
                </p>

                <m.button
                  onClick={goToGoals}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#0c0f14] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(0,0,0,0.45)] transition hover:bg-[#12161c]"
                >
                  <ArrowUpRight className="h-4 w-4" />
                  Προβολή όλων
                </m.button>
              </div>
            </>
          ) : (
            <div className="px-6 py-10 text-center">
              <Target className="mx-auto mb-6 h-16 w-16 text-white/70 sm:h-20 sm:w-20" />

              <h4 className="text-xl font-semibold text-white">
                Δεν υπάρχουν στόχοι ακόμα
              </h4>

              <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-white/50 sm:text-sm sm:leading-6">
                Όταν ορίσεις τον πρώτο σου στόχο, θα εμφανιστεί εδώ για να
                βλέπεις την πορεία σου με μία ματιά.
              </p>

              <div className="mt-6">
                <m.button
                  onClick={goToGoals}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  Δημιούργησε στόχο
                  <ArrowUpRight className="h-4 w-4" />
                </m.button>
              </div>
            </div>
          )}
        </div>
      </div>
    </LazyMotion>
  );
}