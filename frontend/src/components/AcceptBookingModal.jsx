/* @refresh skip */
import React, { useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { supabase } from "../supabaseClient";

export default function AcceptBookingModal({ bookingId, close, onDone }) {
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
    // Try acceptable statuses for each table until one sticks.
    const tries =
      table === "trainer_bookings"
        ? ["accepted"]                // DB CHECK allows accepted
        : ["confirmed", "approved", "accepted"]; // legacy schemas vary

    for (const status of tries) {
      const { error } = await supabase
        .from(table)
        .update({ status })
        .eq("id", id);
      if (error) {
        // If update is blocked by RLS, stop and surface it
        throw error;
      }
      // verify read-back (nice-to-have; if SELECT blocked, we’ll still consider it success)
      const { data, error: selErr } = await supabase
        .from(table)
        .select("id,status")
        .eq("id", id)
        .maybeSingle();

      if (!selErr && data && data.status && data.status.toLowerCase() !== "pending") {
        return { ok: true, table, finalStatus: data.status };
      }
      // If we couldn't verify (no data due to SELECT policy), treat as success and exit
      if (selErr && selErr.message?.toLowerCase().includes("permission")) {
        return { ok: true, table, finalStatus: status };
      }
      // otherwise try next status word
    }
    return { ok: false };
  }

  async function onAccept() {
    if (!bookingId) return setErr("Missing booking id");
    setSubmitting(true);
    setErr("");

    try {
      const src = await detectSourceTable(bookingId);
      if (!src.table) {
        throw new Error(
          `Booking ${bookingId} not visible in 'trainer_bookings' or 'bookings'. ` +
          `Check RLS (SELECT) or ensure you're passing the correct id.`
        );
      }

      const res = await updateWithFallback(src.table, bookingId);
      if (!res.ok) {
        throw new Error(
          `Tried to set accepted on ${src.table} but status stayed 'pending'. ` +
          `If this is the legacy table, double-check its allowed status values.`
        );
      }

      onDone?.();
      close?.();
    } catch (e) {
      console.error("AcceptBookingModal:", e);
      setErr(e.message || "Αποτυχία αποδοχής");
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
          <button onClick={close} className="absolute top-4 right-4 text-gray-400 hover:text-gray-200">
            <X className="h-6 w-6" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            <h3 className="text-lg font-semibold text-gray-100">Αποδοχή κράτησης</h3>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Θα προσπαθήσουμε με τα σωστά status για το αντίστοιχο table (νέο ή legacy).
          </p>

          {err && <div className="mb-4 rounded-lg border border-rose-700/40 bg-rose-900/30 px-3 py-2 text-rose-200 text-sm">{err}</div>}

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={close} disabled={submitting} className="px-5 py-3">Πίσω</Button>
            <Button onClick={onAccept} disabled={submitting} className="px-5 py-3">
              {submitting ? "Αποδοχή..." : "Αποδοχή"}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
