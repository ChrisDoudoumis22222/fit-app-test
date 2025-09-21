// src/pages/Login.js
import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const { error } = await supabase.auth.signInWithPassword(form);
    if (error) return setError(error.message);
    nav("/");
  };

  return (
    <form onSubmit={onSubmit} style={styles.card}>
      <h2>Log in</h2>

      <input
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        required
      />

      <input
        placeholder="Password"
        type="password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        required
      />

      <button>Login</button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* NEW button */}
      <button
        type="button"
        style={styles.secondaryBtn}
        onClick={() => nav("/forgot-password")}
      >
        Forgot password?
      </button>

      <p style={{ marginTop: 12 }}>
        No account? <Link to="/signup">Sign up</Link>
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
  secondaryBtn: {
    background: "transparent",
    border: "1px solid #ccc",
    padding: "6px 10px",
    cursor: "pointer",
  },
};
