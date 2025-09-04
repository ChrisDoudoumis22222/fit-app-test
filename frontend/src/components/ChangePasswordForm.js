import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { Loader2, CheckCircle, AlertCircle, Lock } from "lucide-react";

export default function ChangePasswordForm() {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* ---------- submit ---------- */
  const submit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (pwd.length < 6)
      return setMsg("⚠️ Ο κωδικός πρέπει να έχει ≥ 6 χαρακτήρες.");
    if (pwd !== confirm)
      return setMsg("⚠️ Οι κωδικοί δεν ταιριάζουν.");

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setSubmitting(false);

    if (error) {
      setMsg(`⚠️ ${error.message}`);
    } else {
      setPwd("");
      setConfirm("");
      setMsg("✅ Ο κωδικός ενημερώθηκε επιτυχώς.");
    }
  };

  /* ---------- UI ---------- */
  return (
    <form onSubmit={submit} className="space-y-4">
      {/* new pwd */}
      <div className="relative">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="password"
          placeholder="Νέος κωδικός"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500"
        />
      </div>

      {/* confirm */}
      <div className="relative">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="password"
          placeholder="Επιβεβαίωση κωδικού"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500"
        />
      </div>

      {/* submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 disabled:opacity-50 transition"
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        Ενημέρωση
      </button>

      {/* message */}
      {msg && (
        <p
          className={`mt-2 flex items-center gap-2 text-sm ${
            msg.startsWith("✅")
              ? "text-green-700 bg-green-50 border border-green-200 rounded-lg p-3"
              : "text-red-700 bg-red-50 border border-red-200 rounded-lg p-3"
          }`}
        >
          {msg.startsWith("✅") ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {msg.replace(/^✅ |^⚠️ /, "")}
        </p>
      )}
    </form>
  );
}
