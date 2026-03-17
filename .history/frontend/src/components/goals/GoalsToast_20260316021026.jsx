"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle, X } from "lucide-react";

const cn = (...classes) => classes.filter(Boolean).join(" ");

export default function GoalsToast({ toast, onClose }) {
  if (!toast) return null;

  const isError = toast.type === "error";
  const Icon = isError ? AlertCircle : CheckCircle;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-3 z-[1200] flex justify-center",
        "top-[calc(env(safe-area-inset-top,0px)+4.75rem)]",
        "sm:inset-x-auto sm:right-4 sm:left-auto sm:justify-end sm:top-4"
      )}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: -18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.96 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "pointer-events-auto relative w-full max-w-[min(100%,25rem)] overflow-hidden",
            "rounded-[1.25rem] border backdrop-blur-xl shadow-2xl",
            "px-3.5 py-3 sm:px-4 sm:py-3.5",
            isError
              ? "border-red-500/25 bg-[linear-gradient(135deg,rgba(69,10,10,0.92),rgba(24,24,27,0.96))] text-red-100 shadow-[0_18px_50px_rgba(127,29,29,0.28)]"
              : "border-emerald-500/25 bg-[linear-gradient(135deg,rgba(6,78,59,0.22),rgba(24,24,27,0.96))] text-emerald-50 shadow-[0_18px_50px_rgba(6,95,70,0.22)]"
          )}
        >
          <div
            className={cn(
              "pointer-events-none absolute inset-0 opacity-80",
              isError
                ? "bg-[radial-gradient(circle_at_top_right,rgba(248,113,113,0.14),transparent_38%)]"
                : "bg-[radial-gradient(circle_at_top_right,rgba(74,222,128,0.14),transparent_38%)]"
            )}
          />

          <div className="relative flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
                isError
                  ? "border-red-400/20 bg-red-500/10 text-red-200"
                  : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
              )}
            >
              <Icon className="h-4.5 w-4.5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.95rem] font-semibold tracking-tight sm:text-[1rem]">
                {toast.title}
              </p>

              {!isError ? (
                <p className="mt-0.5 text-[11px] text-emerald-200/70 sm:text-xs">
                  Ο στόχος ενημερώθηκε επιτυχώς
                </p>
              ) : (
                <p className="mt-0.5 text-[11px] text-red-200/70 sm:text-xs">
                  Δοκίμασε ξανά σε λίγο
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-white/60 transition hover:bg-white/5 hover:text-white"
              aria-label="Κλείσιμο ειδοποίησης"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 4, ease: "linear" }}
            className={cn(
              "absolute bottom-0 left-0 h-[2px] w-full origin-left",
              isError ? "bg-red-400/70" : "bg-emerald-400/80"
            )}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}