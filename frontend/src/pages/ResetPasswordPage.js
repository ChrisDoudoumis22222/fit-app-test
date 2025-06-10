import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function ResetPasswordPage() {
  const nav = useNavigate();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  /* make sure we have a session created by the magic link */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) setMsg("Link invalid or expired.");
      setSessionChecked(true);
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMsg(error.message);
    else {
      setMsg("✅ Password updated. Redirecting…");
      setTimeout(() => nav("/"), 1500);
    }
  };

  if (!sessionChecked) return <p>Loading…</p>;

  return (
    <main style={styles.wrap}>
      <h2>Set a new password</h2>

      {msg && <p>{msg}</p>}

      {!msg.includes("invalid") && (
        <form onSubmit={submit} style={styles.form}>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button>Update password</button>
        </form>
      )}

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
