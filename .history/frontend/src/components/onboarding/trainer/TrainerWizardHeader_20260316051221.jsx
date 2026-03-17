"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "./trainerOnboarding.utils";

export default function TrainerWizardHeader({
  currentStep,
  currentIndex,
  steps,
  progressPct,
}) {
  return (
    <div className="border-b border-zinc-800 px-5 sm:px-7 pt-6 pb-5 bg-gradient-to-b from-zinc-900 to-zinc-950">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-zinc-500">
            Trainer onboarding
          </div>

          <h1 className="mt-2 text-2xl sm:text-3xl font-semibold text-white">
            Ολοκλήρωση προφίλ προπονητή
          </h1>

          <p className="mt-2 text-sm sm:text-base text-zinc-400">
            Συμπλήρωσε τα στοιχεία σου για να ενεργοποιηθεί σωστά το trainer
            profile σου.
          </p>
        </div>

        <div className="hidden sm:flex items-center justify-center h-14 min-w-14 rounded-2xl bg-white/5 border border-zinc-800">
          <currentStep.icon className="w-6 h-6 text-zinc-200" />
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
          <span>
            Βήμα {currentIndex + 1} / {steps.length}
          </span>
          <span>{progressPct}%</span>
        </div>

        <div className="h-2 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
          <motion.div
            className="h-full rounded-full bg-white"
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ type: "spring", stiffness: 160, damping: 22 }}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {steps.map((step, idx) => {
          const active = idx === currentIndex;
          const done = idx < currentIndex;

          return (
            <div
              key={step.key}
              className={cn(
                "rounded-2xl border px-3 py-3 transition-all",
                active
                  ? "border-white/30 bg-white/10"
                  : done
                  ? "border-emerald-500/20 bg-emerald-500/10"
                  : "border-zinc-800 bg-zinc-900/70"
              )}
            >
              <div className="flex items-center gap-2">
                {done ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <step.icon
                    className={cn(
                      "w-4 h-4",
                      active ? "text-white" : "text-zinc-500"
                    )}
                  />
                )}

                <span
                  className={cn(
                    "text-sm font-medium",
                    active
                      ? "text-white"
                      : done
                      ? "text-emerald-300"
                      : "text-zinc-400"
                  )}
                >
                  {step.title}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}