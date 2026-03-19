"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "./trainerOnboarding.utils";

const spring = {
  type: "spring",
  stiffness: 260,
  damping: 24,
};

export default function TrainerOnboardingSteps({
  steps,
  currentIndex,
  onGoToStep,
  mobile = false,
}) {
  const iconSize = mobile ? "h-4 w-4" : "h-4.5 w-4.5";
  const circleSize = mobile ? "h-10 w-10" : "h-12 w-12";
  const lineHeight = mobile ? "h-[3px]" : "h-1";
  const wrapperGap = mobile ? "gap-1.5" : "gap-2.5";

  return (
    <div className={cn("w-full", mobile && "bg-transparent")}>
      <div
        className={cn(
          "flex w-full items-center",
          wrapperGap,
          mobile ? "px-1 bg-transparent" : "px-0"
        )}
      >
        {steps.map((step, index) => {
          const Icon = step.icon;
          const active = index === currentIndex;
          const done = index < currentIndex;
          const clickable = index <= currentIndex;
          const connectorFilled = index < currentIndex;

          return (
            <React.Fragment key={step.key}>
              <motion.button
                layout
                transition={spring}
                type="button"
                onClick={() => clickable && onGoToStep(index)}
                disabled={!clickable}
                whileTap={clickable ? { scale: 0.96 } : undefined}
                aria-label={step.navTitle || `Βήμα ${index + 1}`}
                title={step.navTitle || `Βήμα ${index + 1}`}
                className={cn(
                  "relative shrink-0 rounded-full transition-all duration-300",
                  circleSize,
                  done
                    ? "bg-emerald-500 text-white shadow-[0_0_0_1px_rgba(16,185,129,0.35),0_10px_24px_rgba(16,185,129,0.28)]"
                    : active
                    ? mobile
                      ? "bg-transparent text-white ring-2 ring-emerald-400/60 shadow-none"
                      : "bg-zinc-800 text-white ring-2 ring-emerald-400/60 shadow-[0_10px_24px_rgba(0,0,0,0.28)]"
                    : mobile
                    ? "bg-transparent text-zinc-500 ring-1 ring-zinc-800 shadow-none"
                    : "bg-zinc-950 text-zinc-500 ring-1 ring-zinc-800"
                )}
              >
                {!mobile ? (
                  <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.14),transparent_45%)]" />
                ) : null}

                {active && !done ? (
                  <motion.div
                    layoutId="trainer-onboarding-active-step"
                    className="absolute inset-0 rounded-full border border-emerald-400/50"
                  />
                ) : null}

                <div className="relative z-10 flex h-full w-full items-center justify-center">
                  <motion.div
                    key={done ? `done-${step.key}` : `icon-${step.key}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {done ? (
                      <CheckCircle2 className={iconSize} />
                    ) : (
                      <Icon className={iconSize} />
                    )}
                  </motion.div>
                </div>

                {!done && active ? (
                  <motion.div
                    initial={{ scale: 0.85, opacity: 0.35 }}
                    animate={{ scale: 1.12, opacity: 0 }}
                    transition={{
                      duration: 1.4,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                    className="pointer-events-none absolute inset-0 rounded-full border border-emerald-400/50"
                  />
                ) : null}
              </motion.button>

              {index < steps.length - 1 ? (
                <div className="relative min-w-0 flex-1">
                  <div
                    className={cn(
                      "w-full overflow-hidden rounded-full bg-zinc-800/90",
                      lineHeight
                    )}
                  >
                    <motion.div
                      initial={false}
                      animate={{ width: connectorFilled ? "100%" : "0%" }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                    />
                  </div>
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}