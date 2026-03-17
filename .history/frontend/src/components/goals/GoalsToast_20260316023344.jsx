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

  if (!mounted) return null;

  const isOpen = !!toast;
  const isError = toast?.type === "error";
  const isLoading = toast?.type === "loading";

  const Icon = isLoading ? Loader2 : isError ? AlertCircle : CheckCircle2;

  const title =
    toast?.title ||
    (isLoading
      ? "Γίνεται αποθήκευση..."
      : isError
      ? "Κάτι πήγε λάθος"
      : "Ο στόχος ενημερώθηκε");

  const description =
    toast?.description ||
    (isLoading
      ? "Περιμένε λίγο..."
      : isError
      ? "Δοκίμασε ξανά σε λίγο"
      : "Ο στόχος ενημερώθηκε επιτυχώς");

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "fixed inset-0 z-[1200] flex items-center justify-center p-4",
            "sm:items-start sm:justify-end sm:p-4"
          )}
        >
          {/* MOBILE BACKDROP ONLY */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!isLoading) onClose?.();
            }}
            className="absolute inset-0 bg-black/68 backdrop-blur-md sm:hidden"
          />

          <motion.div
            initial={{
              opacity: 0,
              y: 22,
              scale: 0.98,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 12,
              scale: 0.985,
            }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "pointer-events-auto relative w-full overflow-hidden border shadow-2xl",
              "max-w-[380px] rounded-[30px]",
              "bg-zinc-900/95 border-zinc-700/80 backdrop-blur-xl",
              "sm:max-w-[360px] sm:rounded-2xl"
            )}
          >
            {/* TOP LINE */}
            <div
              className={cn(
                "absolute inset-x-0 top-0 h-1.5 sm:h-1",
                isError
                  ? "bg-red-500/90"
                  : isLoading
                  ? "bg-zinc-400/80"
                  : "bg-emerald-500/90"
              )}
            />

            {/* GLOW */}
            <div
              className={cn(
                "pointer-events-none absolute left-1/2 top-10 h-28 w-28 -translate-x-1/2 rounded-full opacity-20 blur-2xl",
                "sm:left-auto sm:right-8 sm:top-4 sm:h-20 sm:w-20 sm:translate-x-0",
                isError
                  ? "bg-red-400"
                  : isLoading
                  ? "bg-zinc-300"
                  : "bg-emerald-400"
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

            {/* MOBILE LAYOUT -> LIKE PIC 2 */}
            <div className="relative px-5 pb-5 pt-7 sm:hidden">
              <div className="flex justify-center">
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
                    <Icon
                      className={cn("h-8 w-8", isLoading && "animate-spin")}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 text-center">
                <h3 className="mt-4 text-[27px] font-bold tracking-tight text-white">
                  {title}
                </h3>

                <p
                  className={cn(
                    "mx-auto mt-2 max-w-[300px] text-sm leading-6",
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

            {/* DESKTOP LAYOUT -> CLASSIC TOAST */}
            <div className="relative hidden sm:block sm:px-4 sm:py-3.5">
              <div className="flex items-center gap-3 pr-8">
                <div
                  className={cn(
                    "grid h-11 w-11 shrink-0 place-items-center rounded-2xl border",
                    isError
                      ? "border-red-500/30 bg-red-500/10 text-red-300"
                      : isLoading
                      ? "border-zinc-500/30 bg-zinc-500/10 text-zinc-200"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  )}
                >
                  <Icon className={cn("h-5 w-5", isLoading && "animate-spin")} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.98rem] font-semibold tracking-tight text-white">
                    {title}
                  </p>

                  <p
                    className={cn(
                      "mt-0.5 text-sm",
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
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}