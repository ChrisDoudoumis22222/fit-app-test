"use client";

import React, { Fragment } from "react";
import { CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "./trainerOnboarding.utils";

const spring = {
  type: "spring",
  stiffness: 260,
  damping: 22,
};

export default function TrainerOnboardingSteps({
  steps,
  currentIndex,
  onGoToStep,
  mobile = false,
}) {
  if (mobile) {
    const currentStep = steps[currentIndex];
    const CurrentIcon = currentStep?.icon;

    return (
      <div className="w-full">
        <div className="overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentStep?.key}
              initial={{ opacity: 0, x: 26, scale: 0.985 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -26, scale: 0.985 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3 shadow-[0_12px_34px_rgba(0,0,0,0.24)] backdrop-blur-xl"
            >
              <div className="flex items-center gap-3">
                <motion.div
                  layout
                  transition={spring}
                  className={cn(
                    "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border",
                    currentIndex > 0
                      ? "border-emerald-400/30 bg-emerald-500/16 text-emerald-300 shadow-[0_0_0_1px_rgba(16,185,129,0.08),0_10px_30px_rgba(16,185,129,0.12)]"
                      : "border-white/12 bg-white/[0.08] text-white"
                  )}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={currentIndex > 0 ? "done" : currentStep?.key}
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.7, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {currentIndex > 0 ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <CurrentIcon className="h-5 w-5" />
                      )}
                    </motion.div>
                  </AnimatePresence>

                  <span
                    className={cn(
                      "pointer-events-none absolute inset-0 rounded-full",
                      currentIndex > 0
                        ? "ring-1 ring-emerald-400/25"
                        : "ring-1 ring-white/10"
                    )}
                  />
                </motion.div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">
                      Βήμα {currentIndex + 1}/{steps.length}
                    </span>

                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em]",
                        currentIndex > 0
                          ? "border border-emerald-400/20 bg-emerald-500/12 text-emerald-300"
                          : "border border-white/10 bg-white/[0.06] text-white/70"
                      )}
                    >
                      {currentIndex > 0 ? "Σε εξέλιξη" : "Έναρξη"}
                    </span>
                  </div>

                  <div className="mt-1 text-sm font-semibold text-white">
                    {currentStep?.navTitle}
                  </div>

                  <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/50">
                    {currentStep?.navDescription}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          {steps.map((step, index) => {
            const active = index === currentIndex;
            const done = index < currentIndex;
            const clickable = index <= currentIndex;

            return (
              <button
                key={step.key}
                type="button"
                onClick={() => clickable && onGoToStep(index)}
                disabled={!clickable}
                aria-label={`Βήμα ${index + 1}: ${step.navTitle}`}
                className="group relative h-3"
              >
                <motion.span
                  layout
                  transition={spring}
                  className={cn(
                    "block h-3 rounded-full transition-all duration-300",
                    active
                      ? "w-10 bg-white shadow-[0_0_20px_rgba(255,255,255,0.18)]"
                      : done
                      ? "w-3 bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.28)]"
                      : "w-3 bg-white/18"
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-3">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const active = index === currentIndex;
        const done = index < currentIndex;
        const clickable = index <= currentIndex;

        return (
          <motion.button
            layout
            transition={spring}
            key={step.key}
            type="button"
            onClick={() => clickable && onGoToStep(index)}
            disabled={!clickable}
            whileTap={clickable ? { scale: 0.985 } : undefined}
            className={cn(
              "relative min-w-0 overflow-hidden rounded-[20px] border px-4 py-4 text-left transition-all duration-300",
              active
                ? "border-white/18 bg-white/[0.07] shadow-[0_12px_34px_rgba(255,255,255,0.04)]"
                : done
                ? "border-emerald-400/20 bg-emerald-500/[0.08] shadow-[0_12px_34px_rgba(16,185,129,0.08)] hover:bg-emerald-500/[0.10]"
                : "border-white/8 bg-white/[0.02] opacity-60 cursor-not-allowed"
            )}
          >
            <motion.div
              layout
              transition={spring}
              className="flex items-start gap-3"
            >
              <motion.div
                layout
                transition={spring}
                className={cn(
                  "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-all",
                  active
                    ? "border-white/12 bg-white/[0.10] text-white"
                    : done
                    ? "border-emerald-400/25 bg-emerald-500/16 text-emerald-300 shadow-[0_0_0_1px_rgba(16,185,129,0.06),0_10px_24px_rgba(16,185,129,0.10)]"
                    : "border-white/10 bg-white/[0.03] text-white/55"
                )}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={done && !active ? `done-${step.key}` : `icon-${step.key}`}
                    initial={{ scale: 0.72, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.72, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {done && !active ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </motion.div>
                </AnimatePresence>

                {done ? (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.22 }}
                    className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-emerald-400/18"
                  />
                ) : null}
              </motion.div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-[0.2em]",
                      done ? "text-emerald-300/80" : "text-white/38"
                    )}
                  >
                    Βήμα {index + 1}
                  </span>

                  {active ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.08] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/72">
                      Τώρα
                    </span>
                  ) : done ? (
                    <motion.span
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="rounded-full border border-emerald-400/20 bg-emerald-500/12 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-300"
                    >
                      Completed
                    </motion.span>
                  ) : null}
                </div>

                <div
                  className={cn(
                    "mt-1 truncate text-sm font-semibold",
                    done ? "text-emerald-100" : "text-white"
                  )}
                >
                  {step.navTitle}
                </div>

                <div
                  className={cn(
                    "mt-1 line-clamp-2 text-xs leading-relaxed",
                    done ? "text-emerald-100/55" : "text-white/46"
                  )}
                >
                  {step.navDescription}
                </div>
              </div>
            </motion.div>

            {active ? (
              <motion.div
                layoutId="pv-active-step-highlight"
                className="pointer-events-none absolute inset-0 rounded-[20px] ring-1 ring-white/8"
              />
            ) : null}

            {done ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.24 }}
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/45 to-transparent"
              />
            ) : null}
          </motion.button>
        );
      })}
    </div>
  );
}