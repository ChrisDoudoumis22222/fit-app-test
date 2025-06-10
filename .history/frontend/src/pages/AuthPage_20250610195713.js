import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthProvider";

export default function AuthPage() {
  const nav = useNavigate();
  const { session, profile, profileLoaded, refreshProfile } = useAuth();;

  const [mode, setMode] = useState("login");          // login | signup
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "user",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* redirect if already logged in and the profile row is loaded */
  useEffect(() => {
    if (profileLoaded && session && profile) {
      nav(profile.role === "trainer" ? "/trainer" : "/user", { replace: true });
    }
  }, [profileLoaded, session, profile, nav]);

  const setField =
    (k) =>
    (e) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    if (!form.email.trim() || !form.password.trim())
      return "Email and password are required";
    if (mode === "signup" && form.password.length < 6)
      return "Password must be ≥ 6 characters";
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const localErr = validate();
    if (localErr) return setError(localErr);

    setSubmitting(true);
    try {
      /* ───────── LOGIN ───────── */
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });
        if (error) throw error;
      }

      /* ───────── SIGN-UP ───────── */
      else {
        /* 1) create auth.user */
        const { error: signErr } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            data: { full_name: form.full_name.trim(), role: form.role },
          },
        });
        if (signErr) throw signErr;
        alert("Check your email to confirm your account. 📧");

        /* 2) log in → obtain session (needed for RLS) */
        const { data: loginData, error: loginErr } =
          await supabase.auth.signInWithPassword({
            email: form.email.trim(),
            password: form.password,
          });
        if (loginErr) throw loginErr;

        /* 3) upsert profile row (trigger might have done it already) */
        const { error: upsertErr } = await supabase.from("profiles").upsert(
          {
            id: loginData.user.id,
            email: form.email.trim(),         // NOT NULL column!
            full_name: form.full_name.trim(),
            role: form.role,
          },
          { onConflict: "id" }
        );
        if (upsertErr) throw upsertErr;
      }

      /* 4) reload profile → row must now exist */
      const fresh = await refreshProfile();
      nav(fresh.role === "trainer" ? "/trainer" : "/user", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ───────── view ───────── */
  return (
    <form onSubmit={submit} style={styles.card}>
      <h2>{mode === "login" ? "Log in" : "Sign up"}</h2>

      {mode === "signup" && (
        <>
          <input
            placeholder="Full name"
            value={form.full_name}
            onChange={setField("full_name")}
            required
          />
          <select value={form.role} onChange={setField("role")}>
            <option value="user">User</option>
            <option value="trainer">Trainer</option>
          </select>
        </>
      )}

      <input
        placeholder="Email"
        type="email"
        value={form.email}
        onChange={setField("email")}
        required
      />
      <input
        placeholder="Password"
        type="password"
        value={form.password}
        onChange={setField("password")}
        required
      />

      <button disabled={submitting}>
        {submitting
          ? "Please wait…"
          : mode === "login"
          ? "Log in"
          : "Create account"}
      </button>

      {mode === "login" && (
        <button
          type="button"
          style={styles.secondaryBtn}
          onClick={() => nav("/forgot-password")}
        >
          Forgot password?
        </button>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}

      <p style={{ marginTop: 12 }}>
        {mode === "login" ? "Need an account?" : "Have an account?"}{" "}
        <span
          style={styles.link}
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "Sign up" : "Log in"}
        </span>
      </p>
    </form>
  );
}

const styles = {
  card: {
    maxWidth: 340,
    margin: "80px auto",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  link: { color: "blue", cursor: "pointer", textDecoration: "underline" },
  secondaryBtn: {
    background: "transparent",
    border: "1px solid #ccc",
    padding: "6px 10px",
    cursor: "pointer",
  },
};
