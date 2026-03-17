"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle, Loader2, X } from "lucide-react";

const cn = (...classes) => classes.filter(Boolean).join(" ");

export default function GoalsToast({ toast, onClose }) {
  const timerRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!toast || isPaused) return;

    const duration = toast.duration ?? 4000;

    timerRef.current = setTimeout(() => {
      onClose?.();
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast, onClose, isPaused]);

  if (!toast) return null;

  const isError = toast.type === "error";
  const isLoading = toast.type === "loading";

  const Icon = isLoading ? Loader2 : isError ? AlertCircle : CheckCircle;

  const helperText = isLoading
    ? toast.helperText || "Περιμένε λίγο..."
    : isError
    ? toast.helperText || "Δοκίμασε ξανά σε λίγο"
    : toast.helperText || "Ο στόχος ενημερώθηκε επιτυχώς";

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-[1200]",
        // mobile: centered like premium popup under navbar
        "inset-x-3 top-[calc(env(safe-area-inset-top,0px)+4.75rem)] flex justify-center",
        // desktop: classic top-right toast
        "sm:inset-x-auto sm:right-4 sm:left-auto sm:top-4 sm:block"
      )}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={toast.id}
          initial={{
            opacity: 0,
            y: -18,
            scale: 0.96,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          exit={{
            opacity: 0,
            y: -12,
            scale: 0.97,
          }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className={cn(
            "pointer-events-auto relative overflow-hidden border shadow-2xl",
            // mobile style -> similar to your delete modal
            "w-full max-w-[390px] rounded-[30px] px-5 pb-5 pt-5",
            // desktop style -> more classic square popup
            "sm:max-w-[360px] sm:rounded-2xl sm:px-4 sm:py-4",
            isError
              ? "border-zinc-700/80 bg-zinc-900 text-red-50"
              : isLoading
              ? "border-zinc-700/80 bg-zinc-900 text-white"
              : "border-zinc-700/80 bg-zinc-900 text-emerald-50"
          )}
        >
          {/* top accent line */}
          <div
            className={cn(
              "absolute inset-x-0 top-0 h-1.5",
              isError
                ? "bg-red-500/90"
                : isLoading
                ? "bg-zinc-400/80"
                : "bg-emerald-500/90",
              "sm:h-1"
            )}
          />

          {/* glow */}
          <div
            className={cn(
              "pointer-events-none absolute left-1/2 top-8 h-24 w-24 -translate-x-1/2 rounded-full opacity-20 blur-2xl sm:left-auto sm:right-6 sm:top-4 sm:h-20 sm:w-20 sm:translate-x-0",
              isError
                ? "bg-red-400"
                : isLoading
                ? "bg-zinc-300"
                : "bg-emerald-400"
            )}
          />

          {/* close */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Κλείσιμο ειδοποίησης"
          >
            <X className="h-4 w-4" />
          </button>

          {/* MOBILE LAYOUT */}
          <div className="sm:hidden">
            <div className="flex justify-center pt-3">
              <div
                className={cn(
                  "grid h-24 w-24 place-items-center rounded-full border",
                  isError
                    ? "border-red-500/30 bg-red-500/10"
                    : isLoading
                    ? "border-zinc-500/30 bg-zinc-500/10"
                    : "border-emerald-500/30 bg-emerald-500/10"
                )}
              >
                <div
                  className={cn(
                    "grid h-14 w-14 place-items-center rounded-full border",
                    isError
                      ? "border-red-400/35 bg-red-500/15 text-red-300"
                      : isLoading
                      ? "border-zinc-400/35 bg-zinc-500/15 text-zinc-200"
                      : "border-emerald-400/35 bg-emerald-500/15 text-emerald-300"
                  )}
                >
                  <Icon className={cn("h-8 w-8", isLoading && "animate-spin")} />
                </div>
              </div>
            </div>

            <div className="mt-5 text-center">
              <h3 className="mt-4 text-[26px] font-bold tracking-tight text-white">
                {toast.title}
              </h3>

              <p
                className={cn(
                  "mx-auto mt-2 max-w-[300px] text-sm leading-6",
                  isError
                    ? "text-red-100/80"
                    : isLoading
                    ? "text-zinc-300"
                    : "text-emerald-100/80"
                )}
              >
                {helperText}
              </p>
            </div>
          </div>

          {/* DESKTOP LAYOUT */}
          <div className="hidden sm:block">
            <div className="relative flex items-start gap-3">
              <div
                className={cn(
                  "mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
                  isError
                    ? "border-red-400/20 bg-red-500/10 text-red-300"
                    : isLoading
                    ? "border-zinc-400/20 bg-zinc-500/10 text-zinc-200"
                    : "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                )}
              >
                <Icon className={cn("h-5 w-5", isLoading && "animate-spin")} />
              </div>

              <div className="min-w-0 flex-1 pr-8">
                <p className="text-[0.98rem] font-semibold tracking-tight text-white">
                  {toast.title}
                </p>
                <p
                  className={cn(
                    "mt-1 text-sm leading-5",
                    isError
                      ? "text-red-100/75"
                      : isLoading
                      ? "text-zinc-300"
                      : "text-emerald-100/75"
                  )}
                >
                  {helperText}
                </p>
              </div>
            </div>
          </div>

          {/* progress */}
          {!isLoading && (
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: (toast.duration ?? 4000) / 1000, ease: "linear" }}
              className={cn(
                "absolute bottom-0 left-0 h-[2px] w-full origin-left",
                isError ? "bg-red-400/70" : "bg-emerald-400/80"
              )}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}