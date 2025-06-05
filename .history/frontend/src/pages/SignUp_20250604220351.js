import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate, Link } from "react-router-dom";

export default function SignUp() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "user",
  });
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    const { data, error: signErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });
    if (signErr) return setError(signErr.message);

    const { error: profErr } = await supabase.from("profiles").insert({
      id: data.user.id,
      full_name: form.full_name,
      role: form.role,
    });
    if (profErr) return setError(profErr.message);

    nav("/");
  };

  return (
    <form onSubmit={onSubmit} style={styles.card}>
      <h2>Sign up</h2>
      <input
        placeholder="Full name"
        value={form.full_name}
        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
      />
      <input
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />
      <input
        placeholder="Password"
        type="password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />
      <select
        value={form.role}
        onChange={(e) => setForm({ ...form, role: e.target.value })}
      >
        <option value="user">User</option>
        <option value="trainer">Trainer</option>
      </select>
      <button>Create account</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <p>
        Have an account? <Link to="/login">Log in</Link>
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
