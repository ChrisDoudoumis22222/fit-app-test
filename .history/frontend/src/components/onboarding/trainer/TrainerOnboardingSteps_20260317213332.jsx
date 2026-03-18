"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "./trainerOnboarding.utils";

const spring = {
  type: "spring",
  stiffness: 260,
  damping: 24,
};

const slideEase = [0.22, 1, 0.36, 1];

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
        {/* top dots / pills */}
        <div className="mb-3 flex items-center justify-center gap-2">
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
                      ? "w-10 bg-zinc-300 shadow-[0_0_18px_rgba(212,212,216,0.18)]"
                      : done
                      ? "w-3 bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.25)]"
                      : "w-3 bg-zinc-700/80"
                  )}
                />
              </button>
            );
          })}
        </div>

        {/* current step only */}
        <div className="overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentStep?.key}
              initial={{ opacity: 0, x: 24, y: 4 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: -24, y: -2 }}
              transition={{ duration: 0.28, ease: slideEase }}
              className="rounded-[22px] border border-zinc-800 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(10,10,12,0.96))] px-4 py-3 shadow-[0_12px_34px_rgba(0,0,0,0.28)]"
            >
              <div className="flex items-center gap-3">
                <motion.div
                  layout
                  transition={spring}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-200 shadow-inner"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={currentStep?.key}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      <CurrentIcon className="h-5 w-5" />
                    </motion.div>
                  </AnimatePresence>
                </motion.div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                      Βήμα {currentIndex + 1}/{steps.length}
                    </span>

                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                      Τώρα
                    </span>
                  </div>

                  <div className="mt-1 text-sm font-semibold text-white">
                    {currentStep?.navTitle}
                  </div>

                  <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400">
                    {currentStep?.navDescription}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
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
              "relative min-w-0 overflow-hidden rounded-[22px] border px-4 py-4 text-left transition-all duration-300",
              done
                ? "border-emerald-500/30 bg-[linear-gradient(180deg,rgba(6,78,59,0.22),rgba(3,22,18,0.92))] shadow-[0_10px_30px_rgba(16,185,129,0.10)]"
                : active
                ? "border-zinc-500/70 bg-[linear-gradient(180deg,rgba(34,34,38,0.95),rgba(10,10,12,0.96))] shadow-[0_10px_28px_rgba(0,0,0,0.22)]"
                : "border-zinc-800 bg-[linear-gradient(180deg,rgba(10,10,12,0.98),rgba(5,5,7,0.98))] text-zinc-500 hover:border-zinc-700"
            )}
          >
            {done ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.24 }}
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent"
              />
            ) : null}

            <div className="flex items-start gap-3">
              <motion.div
                layout
                transition={spring}
                className={cn(
                  "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all",
                  done
                    ? "border-emerald-400/35 bg-emerald-500/14 text-emerald-300 shadow-[0_0_0_1px_rgba(16,185,129,0.08),0_10px_20px_rgba(16,185,129,0.10)]"
                    : active
                    ? "border-zinc-400/70 bg-zinc-800 text-zinc-100"
                    : "border-zinc-800 bg-zinc-950 text-zinc-500"
                )}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={done ? `done-${step.key}` : `icon-${step.key}`}
                    initial={{ scale: 0.72, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.72, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </motion.div>
                </AnimatePresence>
              </motion.div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-[0.2em]",
                      done
                        ? "text-emerald-300/90"
                        : active
                        ? "text-zinc-300"
                        : "text-zinc-500"
                    )}
                  >
                    Βήμα {index + 1}
                  </span>

                  {active ? (
                    <span className="rounded-full border border-zinc-600 bg-zinc-800 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-200">
                      Τώρα
                    </span>
                  ) : null}
                </div>

                <div
                  className={cn(
                    "mt-1 truncate text-sm font-semibold",
                    done
                      ? "text-emerald-50"
                      : active
                      ? "text-white"
                      : "text-zinc-500"
                  )}
                >
                  {step.navTitle}
                </div>

                <div
                  className={cn(
                    "mt-1 line-clamp-2 text-xs leading-relaxed",
                    done
                      ? "text-emerald-100/65"
                      : active
                      ? "text-zinc-300"
                      : "text-zinc-600"
                  )}
                >
                  {step.navDescription}
                </div>
              </div>
            </div>

            {active ? (
              <motion.div
                layoutId="pv-active-step-highlight"
                className="pointer-events-none absolute inset-0 rounded-[22px] ring-1 ring-zinc-500/20"
              />
            ) : null}
          </motion.button>
        );
      })}
    </div>
  );
}