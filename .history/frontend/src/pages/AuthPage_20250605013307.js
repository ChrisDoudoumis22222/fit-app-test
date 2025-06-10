import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthProvider";

export default function AuthPage() {
  const navigate = useNavigate();
  const { session, profile, loading } = useAuth();

  const [mode, setMode] = useState("login");   // or "signup"
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "user",
  });
  const [error, setError] = useState("");

  // redirect if already logged in
  useEffect(() => {
    if (!loading && session && profile) {
      navigate(profile.role === "trainer" ? "/trainer" : "/user", { replace: true });
    }
  }, [loading, session, profile, navigate]);

  const toggleMode = () => {
    setError("");
    setMode(mode === "login" ? "signup" : "login");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
      } else {
        /*──────────   NEW back-end sign-up flow   ──────────*/
        const res = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            full_name: form.full_name,
            role: form.role,
          }),
        });
        const out = await res.json();
        if (!res.ok) throw new Error(out.error || "Signup failed");

        // now log in
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
      }

      // fetch role & redirect
      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .single();
      navigate(prof.role === "trainer" ? "/trainer" : "/user", { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  const setField = (f) => (e) => setForm({ ...form, [f]: e.target.value });

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

      <input placeholder="Email" value={form.email} onChange={setField("email")} />
      <input
        placeholder="Password"
        type="password"
        value={form.password}
        onChange={setField("password")}
      />

      <button>{mode === "login" ? "Log in" : "Create account"}</button>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <p>
        {mode === "login" ? "Need an account?" : "Have an account?"}{" "}
        <span style={{ color: "blue", cursor: "pointer" }} onClick={toggleMode}>
          {mode === "login" ? "Sign up" : "Log in"}
        </span>
      </p>
    </form>
  );
}

const styles = {
  card: {
    maxWidth: 320,
    margin: "80px auto",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
};
