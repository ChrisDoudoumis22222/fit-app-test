/* @refresh skip */
import React, { useState } from "react";
import { X, Ban } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { supabase } from "../supabaseClient";

export default function DeclineBookingModal({ bookingId, close, onDone }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  async function detectSourceTable(id) {
    const [tb, bk] = await Promise.all([
      supabase.from("trainer_bookings").select("id,status").eq("id", id).maybeSingle(),
      supabase.from("bookings").select("id,status").eq("id", id).maybeSingle(),
    ]);
    if (tb.error) throw tb.error;
    if (bk.error) throw bk.error;
    if (tb.data) return { table: "trainer_bookings", current: tb.data.status };
    if (bk.data) return { table: "bookings", current: bk.data.status };
    return { table: null, current: null };
  }

  async function updateWithFallback(table, id) {
    // Legacy tables use different decline words; try a few.
    const tries =
      table === "trainer_bookings"
        ? [{ status: "declined", note: reason || null }]
        : [
            { status: "cancelled" }, // most common
            { status: "declined" },
            { status: "rejected" },
          ];

    for (const patch of tries) {
      const { error } = await supabase.from(table).update(patch).eq("id", id);
      if (error) throw error;

      const { data, error: selErr } = await supabase
        .from(table)
        .select("id,status")
        .eq("id", id)
        .maybeSingle();

      if (!selErr && data && data.status && data.status.toLowerCase() !== "pending") {
        return { ok: true, table, finalStatus: data.status };
      }
      if (selErr && selErr.message?.toLowerCase().includes("permission")) {
        return { ok: true, table, finalStatus: patch.status };
      }
    }
    return { ok: false };
  }

  async function onDecline() {
    if (!bookingId) return setErr("Missing booking id");
    setSubmitting(true);
    setErr("");

    try {
      const src = await detectSourceTable(bookingId);
      if (!src.table) {
        throw new Error(
          `Booking ${bookingId} not visible σε καμία από τις 'trainer_bookings' ή 'bookings'. ` +
          `Έλεγχος RLS (SELECT) ή λάθος id.`
        );
      }
      const res = await updateWithFallback(src.table, bookingId);
      if (!res.ok) throw new Error(`Η κατάσταση έμεινε 'pending' στο ${src.table}. Δες τα επιτρεπτά status εκεί.`);

      onDone?.();
      close?.();
    } catch (e) {
      console.error("DeclineBookingModal:", e);
      setErr(e.message || "Αποτυχία απόρριψης");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={close}/>
      <motion.div
        className="fixed inset-0 z-[111] flex items-center justify-center p-3 sm:p-6"
        initial={{scale:0.92,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.92,opacity:0}}
        transition={{type:"spring",stiffness:260,damping:30}}
      >
        <div
          className="relative w-full max-w-[92vw] sm:max-w-xl md:max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-white/10
                     bg-gradient-to-br from-[#1c1c1e]/90 to-[#111]/90 backdrop-blur-lg p-8"
          onClick={(e)=>e.stopPropagation()}
        >
          <button onClick={close} className="absolute top-4 right-4 text-gray-400 hover:text-gray-200"><X className="h-6 w-6" /></button>

          <div className="flex items-center gap-3 mb-2">
            <Ban className="h-6 w-6 text-rose-400" />
            <h3 className="text-lg font-semibold text-gray-100">Απόρριψη κράτησης</h3>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Θα δοκιμάσουμε τα σωστά status για το αντίστοιχο table (νέο ή legacy).
          </p>

          <label className="block text-sm text-gray-300 mb-1">Λόγος (προαιρετικό)</label>
          <textarea
            className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-gray-200 placeholder:text-gray-500 outline-none focus:border-white/20"
            rows={3}
            placeholder="Π.χ. δεν υπάρχει διαθέσιμη ώρα"
            value={reason}
            onChange={(e)=>setReason(e.target.value)}
          />

          {err && <div className="mt-3 rounded-lg border border-rose-700/40 bg-rose-900/30 px-3 py-2 text-rose-200 text-sm">{err}</div>}

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={close} disabled={submitting} className="px-5 py-3">Πίσω</Button>
            <Button onClick={onDecline} disabled={submitting} className="px-5 py-3">
              {submitting ? "Απόρριψη..." : "Απόρριψη"}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
