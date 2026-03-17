"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { supabase } from "../../supabaseClient";

const TABLE_CANDIDATES = ["trainer_bookings", "bookings"];

async function updateBookingStatus({ bookingId, trainerId, status }) {
  const attempts = [];

  for (const table of TABLE_CANDIDATES) {
    try {
      let query = supabase
        .from(table)
        .update({ status })
        .eq("id", bookingId)
        .select("id,status,updated_at,trainer_id");

      if (trainerId) {
        const withTrainer = await query.eq("trainer_id", trainerId);

        if (
          !withTrainer.error &&
          Array.isArray(withTrainer.data) &&
          withTrainer.data.length > 0
        ) {
          return { ok: true, table, row: withTrainer.data[0] };
        }

        attempts.push({
          table,
          mode: "with_trainer_id",
          error: withTrainer.error?.message || "No row matched",
        });
      }

      const withoutTrainer = await supabase
        .from(table)
        .update({ status })
        .eq("id", bookingId)
        .select("id,status,updated_at,trainer_id");

      if (
        !withoutTrainer.error &&
        Array.isArray(withoutTrainer.data) &&
        withoutTrainer.data.length > 0
      ) {
        return { ok: true, table, row: withoutTrainer.data[0] };
      }

      attempts.push({
        table,
        mode: "id_only",
        error: withoutTrainer.error?.message || "No row matched",
      });
    } catch (err) {
      attempts.push({
        table,
        mode: "exception",
        error: err?.message || "Unknown error",
      });
    }
  }

  return {
    ok: false,
    error:
      attempts[attempts.length - 1]?.error ||
      "Δεν έγινε ενημέρωση της κράτησης.",
  };
}

export default function AcceptBookingModal({
  trainerId,
  bookingId,
  close,
  onDone,
}) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(
    () => Boolean(bookingId) && !loading,
    [bookingId, loading]
  );

  useEffect(() => {
    setMounted(true);

    const onKey = (e) => {
      if (e.key === "Escape" && !loading) close?.();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, loading]);

  const handleAccept = async () => {
    if (!canSubmit) return;

    setLoading(true);
    setError("");

    const result = await updateBookingStatus({
      bookingId,
      trainerId,
      status: "accepted",
    });

    if (!result.ok) {
      setLoading(false);
      setError(result.error || "Κάτι πήγε λάθος.");
      return;
    }

    const optimisticRow = {
      ...(result.row || {}),
      id: bookingId,
      trainer_id: trainerId ?? result.row?.trainer_id ?? null,
      status: "accepted",
      updated_at: result.row?.updated_at || new Date().toISOString(),
    };

    onDone?.({
      status: "accepted",
      bookingId,
      table: result.table,
      row: optimisticRow,
      optimistic: true,
    });

    close?.();
    setLoading(false);
  };

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
          className="absolute inset-0 bg-black/72 backdrop-blur-[2px]"
          onClick={() => {
            if (!loading) close?.();
          }}
        />

        <div className="absolute inset-0 grid place-items-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 22, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.985 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#07090d] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.58)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-emerald-500/12 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <h3 className="text-[20px] font-bold leading-tight text-white sm:text-[22px]">
                    Αποδοχή κράτησης
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/70">
                    Θέλεις να αποδεχτείς αυτή την κράτηση;
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!loading) close?.();
                }}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                aria-label="Κλείσιμο"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5">
              <p className="text-sm leading-relaxed text-white">
                Μόλις ολοκληρωθεί η ενέργεια, η κράτηση θα εμφανιστεί ως{" "}
                <span className="font-semibold text-emerald-400">
                  εγκεκριμένη
                </span>
                .
              </p>
            </div>

            {error ? (
              <div className="mt-4 rounded-[18px] border border-rose-400/15 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!loading) close?.();
                }}
                className="inline-flex min-h-[52px] items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.05] px-4 py-3 text-[15px] font-semibold text-white transition hover:bg-white/[0.08]"
              >
                Άκυρο
              </button>

              <button
                type="button"
                onClick={handleAccept}
                disabled={!canSubmit}
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[18px] border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-[15px] font-semibold text-emerald-300 transition hover:bg-emerald-500/16 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Γίνεται αποδοχή...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Αποδοχή
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}