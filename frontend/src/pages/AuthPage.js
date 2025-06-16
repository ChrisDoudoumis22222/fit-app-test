/*
  AuthPage.jsx  –  Έκδοση GR
  ----------------------------------------------------------
  • Αυτόματη ανακατεύθυνση μόλις φορτωθεί το προφίλ
  • Έλεγχος διπλότυπου email + upsert προφίλ
  • Σύνδεση | Εγγραφή  +  «Ξέχασες τον κωδικό;»
  • Tailwind CDN  +  lucide-react
*/

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import {
  Mail,
  Lock,
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AuthPage() {
  const { session, profile, profileLoaded, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login"); // login | signup
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "user",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);

  /* ανακατεύθυνση μόλις ετοιμαστούμε */
  useEffect(() => {
    if (profileLoaded && session && profile) {
      navigate(profile.role === "trainer" ? "/trainer" : "/user", {
        replace: true,
      });
    }
  }, [profileLoaded, session, profile, navigate]);

  /* helpers */
  const setField =
    (k) =>
    (e) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    if (!form.email.trim() || !form.password.trim())
      return "Το email και ο κωδικός είναι υποχρεωτικά.";
    if (mode === "signup" && form.password.length < 6)
      return "Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες.";
    return null;
  };

  /* submit */
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const v = validate();
    if (v) return setError(v);
    setSubmitting(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });
        if (error) throw error;
      } else {
        /* εγγραφή */
        const { data, error: signErr } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            data: { full_name: form.full_name.trim(), role: form.role },
          },
        });

        if (signErr) {
          const dup =
            signErr.status === 400 &&
            /registered|exists|used|already/i.test(signErr.message);
          if (dup) {
            setError(
              "Υπάρχει ήδη λογαριασμός με αυτό το email. Παρακαλώ συνδέσου."
            );
            setMode("login");
            setSubmitting(false);
            return;
          }
          throw signErr;
        }

        /* upsert προφίλ */
        if (data?.user) {
          await supabase.from("profiles").upsert(
            {
              id: data.user.id,
              email: form.email.trim(),
              full_name: form.full_name.trim(),
              role: form.role,
            },
            { onConflict: "id" }
          );
        }

        alert("⚡ Σχεδόν τελείωσες! Έλεγξε το email σου για επιβεβαίωση.");
        await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });
      }

      await refreshProfile(); // redirect στο useEffect
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ──────────── UI ──────────── */
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 relative overflow-hidden">
      <Blob className="left-1/4 -top-40 w-96" />
      <Blob className="-right-40 bottom-10 w-[30rem]" />

      <motion.form
        layout
        onSubmit={submit}
        className="relative z-10 w-full max-w-md px-10 py-12 space-y-8 rounded-[2.25rem]
                   bg-white/15 backdrop-blur-xl border border-white/25 text-gray-200
                   shadow-[0_12px_50px_rgba(0,0,0,.45)]
                   hover:shadow-[0_16px_60px_rgba(0,0,0,.55)]
                   transition-shadow duration-300"
      >
        <h1 className="text-center text-3xl font-extrabold mb-2 select-none">
          Peak<span className="font-light">Velocity</span>
        </h1>

        <TogglePill mode={mode} setMode={setMode} />

        {/* πεδία */}
        <div className="space-y-5">
          {mode === "signup" && (
            <>
              <Input
                icon={User}
                placeholder="Ονοματεπώνυμο"
                value={form.full_name}
                onChange={setField("full_name")}
                required
              />
              <Select
                icon={ShieldCheck}
                value={form.role}
                onChange={setField("role")}
                options={[
                  { label: "Χρήστης", value: "user" },
                  { label: "Trainer", value: "trainer" },
                ]}
              />
            </>
          )}

          <Input
            icon={Mail}
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={setField("email")}
            required
          />
          <Input
            icon={Lock}
            type={showPw ? "text" : "password"}
            placeholder="Κωδικός"
            value={form.password}
            onChange={setField("password")}
            required
            append={
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="text-gray-400 hover:text-gray-200 transition"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />
        </div>

        <GlowButton disabled={submitting}>
          {submitting && <Loader2 className="animate-spin w-4 h-4" />}
          {mode === "login" ? "Σύνδεση" : "Δημιουργία λογαριασμού"}
        </GlowButton>

        {/* ξέχασες κωδικό */}
        {mode === "login" && (
          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="block w-full text-center text-xs text-indigo-400 hover:underline mt-3"
          >
            Ξέχασες τον κωδικό;
          </button>
        )}

        {error && (
          <p className="text-xs bg-red-900/40 border border-red-800 rounded-lg p-2 text-red-200">
            {error}
          </p>
        )}

        <p className="text-center text-sm">
          {mode === "login" ? "Δεν έχεις λογαριασμό;" : "Έχεις ήδη λογαριασμό;"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-indigo-400 hover:underline font-medium"
          >
            {mode === "login" ? "Εγγραφή" : "Σύνδεση"}
          </button>
        </p>
      </motion.form>
    </div>
  );
}

/* ───────── helpers ───────── */
const Blob = ({ className }) => (
  <div
    className={`${className} absolute aspect-square rounded-full
                bg-gradient-to-br from-white/10 to-white/5 blur-3xl
                animate-[pulse_8s_infinite]`}
  />
);

function TogglePill({ mode, setMode }) {
  return (
    <div className="flex justify-center">
      <div className="relative p-1 rounded-full bg-white/20 w-56 flex overflow-hidden">
        <motion.span
          layout
          className="absolute inset-y-0 w-1/2 rounded-full bg-white/90 shadow"
          style={{ left: mode === "login" ? 4 : "calc(50% + 4px)" }}
          transition={{ type: "spring", stiffness: 160, damping: 28 }}
        />
        {[
          { key: "login", label: "Σύνδεση", bold: true },
          { key: "signup", label: "Εγγραφή", bold: false },
        ].map(({ key, label, bold }) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`relative flex-1 py-1.5 text-sm rounded-full transition-colors
              ${bold ? "font-bold" : "font-medium"}
              ${
                mode === key ? "text-gray-900" : "text-gray-300 hover:text-white"
              }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function GlowButton({ disabled, children }) {
  return (
    <motion.button
      type="submit"
      disabled={disabled}
      whileHover={!disabled ? { y: -2 } : {}}
      className="relative w-full py-3 rounded-xl font-medium text-gray-50
                 bg-gray-900/90 overflow-hidden disabled:opacity-50
                 transition-transform duration-200"
    >
      <AnimatePresence>
        {!disabled && (
          <motion.span
            key="sweep"
            className="absolute inset-0 bg-gradient-to-r
                       from-transparent via-white/20 to-transparent"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>
      <span className="relative flex items-center justify-center gap-2">
        {children}
      </span>
    </motion.button>
  );
}

function Input({ icon: Icon, append, ...props }) {
  return (
    <div className="relative">
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        {...props}
        className="w-full pl-12 pr-12 py-2.5 rounded-xl text-sm bg-white/80 text-gray-900
                   placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/60
                   focus:bg-white border border-white/40 transition"
      />
      {append && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">{append}</div>
      )}
    </div>
  );
}

function Select({ icon: Icon, options, ...props }) {
  return (
    <div className="relative">
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <select
        {...props}
        className="w-full pl-12 pr-4 py-2.5 rounded-xl text-sm bg-white/80 text-gray-900
                   focus:outline-none focus:ring-2 focus:ring-white/60
                   focus:bg-white border border-white/40 transition"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
