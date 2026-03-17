"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Lock, X } from "lucide-react";

export default function AcceptBookingModal({
  trainerId,
  bookingId,
  close,
  onDone,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const onKey = (e) => {
      if (e.key === "Escape") close?.();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[140]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <button
          type="button"
          aria-label="Κλείσιμο"
          className="absolute inset-0 bg-black/80 backdrop-blur-[4px]"
          onClick={() => close?.()}
        />

        <div className="absolute inset-0 grid place-items-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 22, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.985 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0d0d10] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.72)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] border border-white/10 bg-white/[0.04] text-white/85">
                  <Lock className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <h3 className="text-[20px] font-bold leading-tight text-white sm:text-[22px]">
                    Η κατάσταση της κράτησης είναι κλειδωμένη
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/65">
                    Από αυτό το σημείο δεν επιτρέπεται αλλαγή της κατάστασης της
                    κράτησης.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => close?.()}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                aria-label="Κλείσιμο"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[14px] bg-emerald-500/10 text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                </div>

                <div className="min-w-0">
                  <p className="text-sm leading-relaxed text-white">
                    Η ενέργεια{" "}
                    <span className="font-semibold text-white">
                      “Αποδοχή κράτησης”
                    </span>{" "}
                    δεν είναι διαθέσιμη για τον χρήστη μέσα από αυτό το modal.
                  </p>

                  <p className="mt-2 text-sm leading-relaxed text-white/60">
                    Το component παραμένει μόνο για ενημερωτική προβολή, χωρίς
                    καμία αλλαγή στο booking status.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => close?.()}
                className="inline-flex min-h-[52px] w-full items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.05] px-4 py-3 text-[15px] font-semibold text-white transition hover:bg-white/[0.08]"
              >
                Εντάξει
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}