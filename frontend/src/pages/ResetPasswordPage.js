/* ResetPasswordPage.jsx – glassy UI to match Auth/Forgot pages */
"use client";

import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

/* ------------------ CONFIG ------------------ */
const LOGO_SRC =
  "https://peakvelocity.gr/wp-content/uploads/2024/03/Logo-chris-black-1.png";

/** tiny helper – reject if an SDK call hangs */
function withTimeout(promise, ms, label = "operation") {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms
      )
    ),
  ]);
}

export default function ResetPasswordPage() {
  const nav = useNavigate();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [state, setState] = useState({ msg: "", type: "", loading: false });

  // ensure session created by magic link
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) setState({ msg: "Link invalid or expired.", type: "error", loading: false });
      setSessionChecked(true);
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setState({ msg: "", type: "", loading: true });

    try {
      const { error } = await withTimeout(
        supabase.auth.updateUser({ password }),
        10000,
        "update-password"
      );
      if (error) throw error;

      setState({
        msg: "✅ Ο κωδικός ενημερώθηκε. Ανακατεύθυνση…",
        type: "success",
        loading: false,
      });
      setTimeout(() => nav("/"), 1500);
    } catch (err) {
      setState({
        msg: err?.message || "Κάτι πήγε στραβά. Προσπάθησε ξανά.",
        type: "error",
        loading: false,
      });
    }
  };

  if (!sessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-zinc-900">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-black" />
        <StaticBlobs />
        <div className="relative z-10 flex items-center gap-3 text-zinc-300">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Επαλήθευση συνδέσμου…</span>
        </div>
      </div>
    );
  }

  const linkInvalid = state.msg.toLowerCase().includes("invalid");

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-zinc-900">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-black" />
      <StaticBlobs />

      <LayoutGroup>
        <motion.main
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 150 }}
          className="relative z-10 w-full max-w-md px-7 py-9 space-y-7 rounded-3xl
                     bg-black/40 backdrop-blur-xl border border-zinc-700/50 text-gray-200
                     shadow-[0_20px_50px_rgba(0,0,0,0.7)]"
        >
          {/* Header */}
          <motion.div
            className="text-center space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <img
              src={LOGO_SRC || "/placeholder.svg"}
              alt="Peak Velocity"
              className="mx-auto h-16 w-16 rounded-xl bg-white p-1 object-contain"
            />
            <div className="text-[30px] font-bold text-white">
              Peak<span className="font-light text-zinc-300">Velocity</span>
            </div>
            <p className="text-zinc-400 text-[15px]">Ορισμός νέου κωδικού</p>
          </motion.div>

          {/* Alerts */}
          <AnimatePresence>
            {state.msg && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className={`p-3 rounded-lg text-base border ${
                  state.type === "success"
                    ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/30"
                    : "bg-red-500/20 text-red-200 border-red-500/30"
                }`}
              >
                <div className="flex items-start gap-2">
                  {state.type === "success" ? (
                    <CheckCircle2 className="mt-0.5 w-5 h-5 shrink-0" />
                  ) : (
                    <AlertTriangle className="mt-0.5 w-5 h-5 shrink-0" />
                  )}
                  <p className="leading-snug">{state.msg}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form (hidden if invalid link) */}
          {!linkInvalid && (
            <form onSubmit={submit} className="space-y-5">
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                showPw={showPw}
                setShowPw={setShowPw}
              />
              <SubmitButton disabled={state.loading} />
            </form>
          )}

          {/* Back link */}
          <div className="pt-1">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-[15px] text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Πίσω στη σελίδα σύνδεσης
            </Link>
          </div>
        </motion.main>
      </LayoutGroup>
    </div>
  );
}

/* ------------------ UI bits ------------------ */
const StaticBlobs = () => (
  <>
    <div className="absolute left-1/4 -top-40 w-96 aspect-square rounded-full bg-gradient-to-r from-zinc-600/10 to-gray-700/10 blur-2xl" />
    <div className="absolute -right-40 bottom-10 w-[30rem] aspect-square rounded-full bg-gradient-to-r from-gray-700/10 to-zinc-800/10 blur-2xl" />
  </>
);

function SubmitButton({ disabled }) {
  return (
    <motion.button
      type="submit"
      disabled={disabled}
      whileHover={!disabled ? { y: -1 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      transition={{ duration: 0.15 }}
      className={`w-full py-4 rounded-xl font-semibold text-white text-base
        transition-all duration-300 flex items-center justify-center gap-2
        ${
          disabled
            ? "bg-zinc-700 opacity-70 cursor-not-allowed"
            : "bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 shadow-lg"
        }`}
    >
      {disabled ? <Loader2 className="animate-spin w-5 h-5" /> : "Ενημέρωση κωδικού"}
    </motion.button>
  );
}

function PasswordInput({ value, onChange, showPw, setShowPw }) {
  return (
    <div className="relative group">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
      <input
        type={showPw ? "text" : "password"}
        placeholder="Νέος κωδικός"
        value={value}
        onChange={onChange}
        required
        className="w-full pl-10 pr-11 py-4 rounded-xl text-base
           bg-black/30 border border-zinc-700
          text-gray-200 placeholder-zinc-500
          focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500
          transition-all"
      />
      <button
        type="button"
        onClick={() => setShowPw((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
      >
        {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  );
}
