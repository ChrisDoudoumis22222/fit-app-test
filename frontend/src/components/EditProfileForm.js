import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function EditProfileForm() {
  const { profile } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    setSubmitting(true);

    try {
      /* 1️⃣ ενημέρωση profile row */
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), phone: phone.trim() })
        .eq("id", profile.id);
      if (profErr) throw profErr;

      /* 2️⃣ αλλαγή email (αν άλλαξε) */
      if (email.trim() !== profile.email) {
        const { error: emailErr } = await supabase.auth.updateUser({
          email: email.trim(),
        });
        if (emailErr) throw emailErr;

        setMsg(
          "✅ Αποθηκεύτηκε. Έλεγξε το νέο email για επιβεβαίωση."
        );
      } else {
        setMsg("✅ Το προφίλ ενημερώθηκε επιτυχώς.");
      }
    } catch (err) {
      setMsg(`⚠️ ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- UI ---------- */
  return (
    <form onSubmit={submit} className="space-y-4">
      {/* full name */}
      <input
        type="text"
        placeholder="Ονοματεπώνυμο"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
      />

      {/* phone */}
      <input
        type="tel"
        placeholder="Τηλέφωνο"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
      />

      {/* email */}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
      />

      {/* submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 disabled:opacity-50 transition"
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        Αποθήκευση
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
