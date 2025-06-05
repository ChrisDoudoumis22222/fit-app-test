import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) setMsg(error.message);
    else setMsg("✅ Check your inbox for the reset link.");
  };

  return (
    <main style={styles.wrap}>
      <h2>Password recovery</h2>

      <form onSubmit={submit} style={styles.form}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button>Send reset link</button>
      </form>

      {msg && <p>{msg}</p>}

      <p style={{ marginTop: 16 }}>
        <Link to="/">← Back to sign-in</Link>
      </p>
    </main>
  );
}

const styles = {
  wrap: { maxWidth: 320, margin: "80px auto", textAlign: "center" },
  form: { display: "flex", flexDirection: "column", gap: 8 },
};
