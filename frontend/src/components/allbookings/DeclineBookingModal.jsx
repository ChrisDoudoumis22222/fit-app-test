"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Ban, Loader2, X } from "lucide-react";
import { supabase } from "../../supabaseClient";

const TABLE_CANDIDATES = ["trainer_bookings", "bookings"];

async function updateBookingStatus({ bookingId, trainerId, status, note }) {
  const attempts = [];
  const payload = {
    status,
    note: note?.trim() || null,
  };

  for (const table of TABLE_CANDIDATES) {
    try {
      let query = supabase
        .from(table)
        .update(payload)
        .eq("id", bookingId)
        .select("id,status,updated_at,trainer_id,note");

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
        .update(payload)
        .eq("id", bookingId)
        .select("id,status,updated_at,trainer_id,note");

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

export default function DeclineBookingModal({
  trainerId,
  bookingId,
  close,
  onDone,
}) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [declineNote, setDeclineNote] = useState("");

  const trimmedNote = declineNote.trim();

  const canSubmit = useMemo(
    () => Boolean(bookingId) && Boolean(trimmedNote) && !loading,
    [bookingId, trimmedNote, loading]
  );

  useEffect(() => {
    setMounted(true);

    const onKey = (e) => {
      if (e.key === "Escape" && !loading) close?.();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, loading]);

  const handleDecline = async () => {
    if (!canSubmit) {
      if (!trimmedNote) {
        setError("Πρέπει να συμπληρώσεις λόγο απόρριψης.");
      }
      return;
    }

    setLoading(true);
    setError("");

    const result = await updateBookingStatus({
      bookingId,
      trainerId,
      status: "declined",
      note: trimmedNote,
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
      status: "declined",
      note: trimmedNote,
      updated_at: result.row?.updated_at || new Date().toISOString(),
    };

    onDone?.({
      status: "declined",
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
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-rose-500/12 text-rose-400">
                  <Ban className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <h3 className="text-[20px] font-bold leading-tight text-white sm:text-[22px]">
                    Απόρριψη κράτησης
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/70">
                    Συμπλήρωσε λόγο απόρριψης για να συνεχίσεις.
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
                Η κράτηση θα εμφανιστεί ως{" "}
                <span className="font-semibold text-rose-400">απορριφθείσα</span>{" "}
                και ο λόγος θα αποθηκευτεί στη σημείωση της κράτησης.
              </p>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-white">
                Λόγος απόρριψης <span className="text-rose-400">*</span>
              </label>

              <textarea
                value={declineNote}
                onChange={(e) => {
                  setDeclineNote(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Π.χ. Δεν υπάρχει διαθεσιμότητα για τη συγκεκριμένη ώρα."
                rows={4}
                maxLength={500}
                autoFocus
                className="w-full resize-none rounded-[18px] border border-white/20 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white focus:bg-white/[0.06] focus:ring-0"
              />

              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[12px] text-white/45">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Το πεδίο είναι υποχρεωτικό
                </div>
                <div className="text-[12px] text-white/40">
                  {declineNote.length}/500
                </div>
              </div>
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
                className="inline-flex min-h-[52px] items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.06] px-4 py-3 text-[15px] font-semibold text-white transition hover:bg-white/[0.12]"
              >
                Άκυρο
              </button>

              <button
                type="button"
                onClick={handleDecline}
                disabled={!canSubmit}
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[18px] border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-[15px] font-semibold text-rose-400 transition hover:bg-rose-500/14 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Γίνεται απόρριψη...
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4" />
                    Απόρριψη
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