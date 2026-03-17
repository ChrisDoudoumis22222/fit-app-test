"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Loader2, Trash2, X } from "lucide-react";
import GoalsToast from "./GoalsToast.jsx";

const cn = (...classes) => classes.filter(Boolean).join(" ");

export default function GoalDeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  goalTitle = "",
}) {
  const [mounted, setMounted] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const isBusy = loading || localLoading;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isBusy) onClose?.();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, isBusy]);

  const handleConfirmDelete = async () => {
    if (isBusy) return;

    try {
      setLocalLoading(true);

      await Promise.resolve(onConfirm?.());

      onClose?.();

      setToast({
        id: `goal-delete-success-${Date.now()}`,
        type: "success",
        title: "Ο στόχος διαγράφηκε",
        description: goalTitle
          ? `Ο στόχος “${goalTitle}” διαγράφηκε επιτυχώς.`
          : "Ο στόχος διαγράφηκε επιτυχώς.",
        actionLabel: "Τέλεια",
        duration: 3200,
      });
    } catch (error) {
      setToast({
        id: `goal-delete-error-${Date.now()}`,
        type: "error",
        title: "Η διαγραφή απέτυχε",
        description:
          error?.message ||
          "Δεν ήταν δυνατή η διαγραφή του στόχου. Δοκίμασε ξανά.",
        actionLabel: "Κλείσιμο",
        duration: 3800,
      });
    } finally {
      setLocalLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <>
      {createPortal(
        <>
          <AnimatePresence mode="wait">
            {open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "fixed inset-0 z-[1500]",
                  "flex items-center justify-center p-4",
                  "sm:items-start sm:justify-end sm:p-4"
                )}
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => {
                    if (!isBusy) onClose?.();
                  }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-md"
                />

                <motion.div
                  initial={{
                    opacity: 0,
                    y: 24,
                    scale: 0.975,
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
                    "max-w-[344px] rounded-[30px]",
                    "bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(16,16,20,0.97))]",
                    "border-zinc-700/80 backdrop-blur-xl",
                    "sm:max-w-[380px] sm:rounded-2xl"
                  )}
                >
                  <div className="absolute inset-x-0 top-0 h-1.5 bg-red-500/90 sm:h-1" />

                  <div className="pointer-events-none absolute left-1/2 top-10 h-32 w-32 -translate-x-1/2 rounded-full bg-red-400 opacity-15 blur-3xl sm:left-auto sm:right-6 sm:top-3 sm:h-20 sm:w-20 sm:translate-x-0" />

                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isBusy}
                    className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
                    aria-label="Κλείσιμο"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {/* MOBILE */}
                  <div className="relative px-5 pb-5 pt-8 sm:hidden">
                    <div className="flex justify-center">
                      <div className="grid h-24 w-24 place-items-center rounded-full border border-red-500/30 bg-red-500/10">
                        <div className="grid h-14 w-14 place-items-center rounded-full border border-red-400/35 bg-red-500/15 text-red-300">
                          {isBusy ? (
                            <Loader2 className="h-8 w-8 animate-spin" />
                          ) : (
                            <AlertCircle className="h-8 w-8" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex justify-center">
                      <div className="inline-flex h-8 items-center rounded-full border border-red-500/30 bg-red-500/10 px-4 text-[12px] font-semibold tracking-[0.18em] text-red-200">
                        DELETE
                      </div>
                    </div>

                    <div className="mt-6 text-center">
                      <h3 className="text-[1.85rem] font-bold tracking-tight text-white">
                        Διαγραφή στόχου;
                      </h3>

                      <p className="mx-auto mt-4 max-w-[280px] text-[15px] leading-8 text-zinc-300">
                        Είσαι σίγουρος ότι θέλεις να διαγράψεις
                        {goalTitle ? (
                          <>
                            {" "}
                            τον στόχο{" "}
                            <span className="font-semibold text-white">
                              “{goalTitle}”
                            </span>
                            ;
                          </>
                        ) : (
                          " αυτόν τον στόχο;"
                        )}
                        <br />
                        Αυτή η ενέργεια δεν αναιρείται.
                      </p>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-3">
                      <button
                        type="button"
                        onClick={handleConfirmDelete}
                        disabled={isBusy}
                        className={cn(
                          "h-12 rounded-[18px] font-semibold transition",
                          "disabled:cursor-not-allowed disabled:opacity-60",
                          "bg-white text-black hover:bg-zinc-100"
                        )}
                      >
                        {isBusy ? "Γίνεται διαγραφή..." : "Ναι, διαγραφή"}
                      </button>

                      <button
                        type="button"
                        onClick={onClose}
                        disabled={isBusy}
                        className="h-12 rounded-[18px] border border-zinc-700 bg-zinc-800 text-zinc-200 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Ακύρωση
                      </button>
                    </div>
                  </div>

                  {/* DESKTOP */}
                  <div className="relative hidden sm:block sm:px-4 sm:py-4">
                    <div className="flex items-start gap-3 pr-8">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-300">
                        {isBusy ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Trash2 className="h-5 w-5" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[1rem] font-semibold tracking-tight text-white">
                          Διαγραφή στόχου
                        </p>

                        <p className="mt-1 text-sm leading-6 text-zinc-300">
                          Είσαι σίγουρος ότι θέλεις να διαγράψεις
                          {goalTitle ? (
                            <>
                              {" "}
                              τον στόχο{" "}
                              <span className="font-semibold text-white">
                                “{goalTitle}”
                              </span>
                              ;
                            </>
                          ) : (
                            " αυτόν τον στόχο;"
                          )}{" "}
                          Αυτή η ενέργεια δεν αναιρείται.
                        </p>

                        <div className="mt-4 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleConfirmDelete}
                            disabled={isBusy}
                            className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isBusy ? "Γίνεται διαγραφή..." : "Ναι, διαγραφή"}
                          </button>

                          <button
                            type="button"
                            onClick={onClose}
                            disabled={isBusy}
                            className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 px-4 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Ακύρωση
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <GoalsToast toast={toast} onClose={() => setToast(null)} />
        </>,
        document.body
      )}
    </>
  );
}