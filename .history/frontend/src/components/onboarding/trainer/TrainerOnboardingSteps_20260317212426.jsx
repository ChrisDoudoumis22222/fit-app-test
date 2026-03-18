"use client";

import React, { Fragment } from "react";
import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "./trainerOnboarding.utils";

export default function TrainerOnboardingSteps({
  steps,
  currentIndex,
  onGoToStep,
  mobile = false,
}) {
  if (mobile) {
    return (
      <div className="flex items-center w-full select-none">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const active = index === currentIndex;
          const done = index < currentIndex;
          const clickable = index <= currentIndex;

          return (
            <Fragment key={step.key}>
              <button
                type="button"
                onClick={() => clickable && onGoToStep(index)}
                disabled={!clickable}
                aria-label={`Βήμα ${index + 1}: ${step.navTitle}`}
                title={step.navTitle}
                className={cn(
                  "relative grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-all duration-300",
                  active
                    ? "border-white/12 bg-white/[0.12] text-white"
                    : done
                    ? "border-white/10 bg-white/[0.08] text-white"
                    : "border-white/10 bg-white/[0.03] text-white/42"
                )}
              >
                {done && !active ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}

                {active ? (
                  <span className="absolute -inset-1 rounded-full border border-white/10" />
                ) : null}
              </button>

              {index < steps.length - 1 ? (
                <div className="relative mx-2 h-[2px] flex-1 overflow-hidden rounded-full bg-white/8">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-white/70"
                    initial={false}
                    animate={{ width: index < currentIndex ? "100%" : "0%" }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              ) : null}
            </Fragment>
          );
        })}
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
          <button
            key={step.key}
            type="button"
            onClick={() => clickable && onGoToStep(index)}
            disabled={!clickable}
            className={cn(
              "relative min-w-0 overflow-hidden rounded-[20px] border px-4 py-4 text-left transition-all duration-300",
              active
                ? "border-white/18 bg-white/[0.07] shadow-[0_12px_34px_rgba(255,255,255,0.04)]"
                : done
                ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.055]"
                : "border-white/8 bg-white/[0.02] opacity-60 cursor-not-allowed"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-all",
                  active
                    ? "border-white/12 bg-white/[0.10] text-white"
                    : done
                    ? "border-white/10 bg-white/[0.08] text-white"
                    : "border-white/10 bg-white/[0.03] text-white/55"
                )}
              >
                {done && !active ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/38">
                    Βήμα {index + 1}
                  </span>

                  {active ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.08] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/72">
                      Τώρα
                    </span>
                  ) : null}
                </div>

                <div className="mt-1 truncate text-sm font-semibold text-white">
                  {step.navTitle}
                </div>

                <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/46">
                  {step.navDescription}
                </div>
              </div>
            </div>

            {active ? (
              <motion.div
                layoutId="pv-active-step-highlight"
                className="pointer-events-none absolute inset-0 rounded-[20px] ring-1 ring-white/8"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}