"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";

const cn = (...classes) => classes.filter(Boolean).join(" ");

export default function GoalsToast({ toast, onClose }) {
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!toast) return;
    if (toast.type === "loading") return;

    const duration = toast.duration ?? 4000;

    timerRef.current = setTimeout(() => {
      onClose?.();
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast, onClose]);

  if (!mounted || !toast) return null;

  const isError = toast.type === "error";
  const isLoading = toast.type === "loading";
  const isSuccess = toast.type === "success";

  const Icon = isLoading ? Loader2 : isError ? AlertCircle : CheckCircle2;

  const title =
    toast.title ||
    (isLoading
      ? "Γίνεται αποθήκευση..."
      : isError
      ? "Κάτι πήγε λάθος"
      : "Ο στόχος ενημερώθηκε");

  const description =
    toast.description ||
    (isLoading
      ? "Περιμένε λίγο..."
      : isError
      ? "Δοκίμασε ξανά σε λίγο"
      : "Ο στόχος ενημερώθηκε επιτυχώς");

  return createPortal(
    <div
      className={cn(
        "pointer-events-none fixed inset-x-3 z-[1200] flex justify-center",
        "top-[calc(env(safe-area-inset-top,0px)+4.75rem)]",
        "sm:inset-x-auto sm:right-4 sm:left-auto sm:top-4 sm:justify-end"
      )}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: -18, scale: 0.975 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "pointer-events-auto relative w-full max-w-[390px] overflow-hidden border shadow-2xl",
            "rounded-[26px] sm:rounded-[24px]",
            "bg-zinc-900/82 border-zinc-700/80 backdrop-blur-xl"
          )}
        >
          <div
            className={cn(
              "absolute inset-x-0 top-0 h-1.5",
              isError
                ? "bg-red-500/90"
                : isLoading
                ? "bg-zinc-400/80"
                : "bg-emerald-500/90"
            )}
          />

          <div
            className={cn(
              "pointer-events-none absolute left-1/2 top-2 h-24 w-24 -translate-x-1/2 rounded-full opacity-20 blur-2xl",
              "sm:left-auto sm:right-6 sm:top-3 sm:h-20 sm:w-20 sm:translate-x-0",
              isError
                ? "bg-red-400"
                : isLoading
                ? "bg-zinc-300"
                : "bg-emerald-400"
            )}
          />

          <div
            className={cn(
              "pointer-events-none absolute inset-0 opacity-70",
              isError
                ? "bg-[radial-gradient(circle_at_top,rgba(248,113,113,0.12),transparent_38%)]"
                : isLoading
                ? "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_38%)]"
                : "bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.12),transparent_38%)]"
            )}
          />

          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Κλείσιμο ειδοποίησης"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative px-4 py-4 sm:px-4.5 sm:py-4">
            <div className="flex items-center gap-3.5 pr-8">
              <div
                className={cn(
                  "grid h-14 w-14 shrink-0 place-items-center rounded-full border",
                  isError
                    ? "border-red-500/30 bg-red-500/10"
                    : isLoading
                    ? "border-zinc-500/30 bg-zinc-500/10"
                    : "border-emerald-500/30 bg-emerald-500/10"
                )}
              >
                <div
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-full border",
                    isError
                      ? "border-red-400/35 bg-red-500/15 text-red-300"
                      : isLoading
                      ? "border-zinc-400/35 bg-zinc-500/15 text-zinc-200"
                      : "border-emerald-400/35 bg-emerald-500/15 text-emerald-300"
                  )}
                >
                  <Icon className={cn("h-4.5 w-4.5", isLoading && "animate-spin")} />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[1rem] font-semibold tracking-tight text-white sm:text-[1.02rem]">
                  {title}
                </p>

                <p
                  className={cn(
                    "mt-1 text-[13px] leading-5 sm:text-sm",
                    isError
                      ? "text-red-100/75"
                      : isLoading
                      ? "text-zinc-300"
                      : "text-emerald-100/75"
                  )}
                >
                  {description}
                </p>
              </div>
            </div>
          </div>

          {!isLoading && (
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{
                duration: (toast.duration ?? 4000) / 1000,
                ease: "linear",
              }}
              className={cn(
                "absolute bottom-0 left-0 h-[2px] w-full origin-left",
                isError ? "bg-red-400/75" : "bg-emerald-400/80"
              )}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body
  );
}