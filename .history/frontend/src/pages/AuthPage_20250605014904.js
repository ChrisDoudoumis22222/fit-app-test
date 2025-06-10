import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthProvider";

export default function AuthPage() {
  const nav = useNavigate();
  const { session, profile, loading: authLoading } = useAuth();

  const [mode, setMode] = useState("login");        // "login" | "signup"
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "user",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /*──────── auto-redirect if already logged in ────────*/
  useEffect(() => {
    if (!authLoading && session && profile) {
      nav(profile.role === "trainer" ? "/trainer" : "/user", { replace: true });
    }
  }, [authLoading, session, profile, nav]);

  /*──────── helpers ────────*/
  const setField = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggleMode = () => {
    setError("");
    setMode(mode === "login" ? "signup" : "login");
  };

  const validate = () => {
    if (!form.email.trim() || !form.password) return "Email and password required";
    if (mode === "signup" && form.password.length < 6)
      return "Password must be ≥ 6 characters";
    return null;
  };

  /*──────── submit handler ────────*/
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const msg = validate();
    if (msg) return setError(msg);

    setSubmitting(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });
        if (error) throw error;
      } else {
        /*───────── 1) Sign-up (anon key only) ─────────*/
        const { error: signErr } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
        });
        if (signErr) throw signErr;

        /*—— popup message ——*/
        alert("Hey dude! Check your email to confirm your account. 🚀");

        /*───────── 2) Immediate login ─────────*/
        const { data: loginData, error: loginErr } =
          await supabase.auth.signInWithPassword({
            email: form.email.trim(),
            password: form.password,
          });
        if (loginErr) throw loginErr;

        /*───────── 3) Insert profile row (passes RLS) ─────────*/
        const { error: profErr } = await supabase.from("profiles").insert({
          id: loginData.user.id,
          full_name: form.full_name.trim(),
          role: form.role,
        });
        if (profErr && profErr.code !== "23505") throw profErr; // ignore duplicate
      }

      /* fetch role & redirect */
      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .single();
      nav(prof.role === "trainer" ? "/trainer" : "/user", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  /*──────── view ────────*/
  return (
    <form onSubmit={submit} style={styles.card}>
      <h2>{mode === "login" ? "Log in" : "Sign up"}</h2>

      {mode === "signup" && (
        <>
          <input
            placeholder="Full name"
            value={form.full_name}
            onChange={setField("full_name")}
          />
          <select value={form.role} onChange={setField("role")}>
            <option value="user">User</option>
            <option value="trainer">Trainer</option>
          </select>
        </>
      )}

      <input
        placeholder="Email"
        value={form.email}
        onChange={setField("email")}
      />
      <input
        placeholder="Password"
        type="password"
        value={form.password}
        onChange={setField("password")}
      />

      <button disabled={submitting}>
        {submitting ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <p style={{ marginTop: 16 }}>
        {mode === "login" ? "Need an account?" : "Have an account?"}{" "}
        <span style={styles.link} onClick={toggleMode}>
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
};
