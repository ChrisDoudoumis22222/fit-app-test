import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function ChangePasswordForm() {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (pwd.length < 6)
      return setMsg("Password must be at least 6 characters.");
    if (pwd !== confirm) return setMsg("Passwords do not match.");

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setSubmitting(false);

    if (error) setMsg(error.message);
    else {
      setPwd("");
      setConfirm("");
      setMsg("✅ Password updated successfully.");
    }
  };

  return (
    <form onSubmit={submit} style={styles.box}>
      <h3>Change password</h3>
      <input
        type="password"
        placeholder="New password"
        value={pwd}
        onChange={(e) => setPwd(e.target.value)}
      />
      <input
        type="password"
        placeholder="Confirm password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      <button disabled={submitting}>
        {submitting ? "Updating…" : "Update password"}
      </button>
      {msg && <p style={{ marginTop: 8 }}>{msg}</p>}
    </form>
  );
}

const styles = {
  box: {
    maxWidth: 280,
    margin: "32px auto",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    border: "1px solid #ccc",
    padding: 16,
    borderRadius: 6,
  },
};
