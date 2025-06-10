import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthProvider";

export default function AuthPage() {
  const nav = useNavigate();
  const { session, profile, profileLoaded, refreshProfile } = useAuth();

  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "user" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* redirect once everything is loaded */
  useEffect(() => {
    if (profileLoaded && session && profile) {
      nav(profile.role === "trainer" ? "/trainer" : "/user", { replace: true });
    }
  }, [profileLoaded, session, profile, nav]);

  const setField = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

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
    const v = validate();
    if (v) return setError(v);
    setSubmitting(true);

    try {
      /* ---------- LOGIN ---------- */
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });
        if (error) throw error;
      }

      /* ---------- SIGN-UP ---------- */
      else {
        const { error: signErr } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: { data: { full_name: form.full_name.trim(), role: form.role } },
        });
        if (signErr) throw signErr;

        alert("Almost there! Check your e-mail to confirm.");

        const { data: loginData, error: loginErr } =
          await supabase.auth.signInWithPassword({
            email: form.email.trim(),
            password: form.password,
          });
        if (loginErr) throw loginErr;

        const { error: upsertErr } = await supabase.from("profiles").upsert(
          {
            id: loginData.user.id,
            email: form.email.trim(),
            full_name: form.full_name.trim(),
            role: form.role,
          },
          { onConflict: "id" }
        );
        if (upsertErr) throw upsertErr;
      }

      /* refresh -> redirect happens in useEffect */
      await refreshProfile();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} style={styles.card}>
      <h2>{mode === "login" ? "Log in" : "Sign up"}</h2>
      {mode === "signup" && (
        <>
          <input placeholder="Full name" value={form.full_name} onChange={setField("full_name")} />
          <select value={form.role} onChange={setField("role")}>
            <option value="user">User</option>
            <option value="trainer">Trainer</option>
          </select>
        </>
      )}
      <input placeholder="Email" type="email" value={form.email} onChange={setField("email")} />
      <input placeholder="Password" type="password" value={form.password} onChange={setField("password")} />
      <button disabled={submitting}>{submitting ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <p style={{ marginTop: 12 }}>
        {mode === "login" ? "Need an account?" : "Have an account?"}{" "}
        <span style={styles.link} onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "Sign up" : "Log in"}
        </span>
      </p>
    </form>
  );
}

const styles = {
  card: { maxWidth: 340, margin: "80px auto", display: "flex", flexDirection: "column", gap: 12 },
  link: { color: "blue", cursor: "pointer", textDecoration: "underline" },
};
