import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";

export default function EditProfileForm() {
  const { profile } = useAuth();

  const [fullName, setFullName]   = useState(profile?.full_name || "");
  const [phone, setPhone]         = useState(profile?.phone || "");
  const [email, setEmail]         = useState(profile?.email || profile?.email); // existing email
  const [msg, setMsg]             = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    setSubmitting(true);

    try {
      /* 1) update profile row */
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), phone: phone.trim() })
        .eq("id", profile.id);
      if (profErr) throw profErr;

      /* 2) update e-mail if it changed */
      if (email.trim() !== profile.email) {
        const { error: emailErr } = await supabase.auth.updateUser({
          email: email.trim(),
        });
        if (emailErr) throw emailErr;
        setMsg(
          "Profile saved. Check your new email address to confirm the change. 📧"
        );
      } else {
        setMsg("Profile updated successfully.");
      }
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} style={styles.box}>
      <h3>Edit profile</h3>

      <input
        placeholder="Full name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />
      <input
        placeholder="Phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <button disabled={submitting}>
        {submitting ? "Saving…" : "Save changes"}
      </button>

      {msg && <p style={{ marginTop: 8 }}>{msg}</p>}
    </form>
  );
}

const styles = {
  box: {
    maxWidth: 320,
    margin: "32px auto",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    border: "1px solid #ccc",
    padding: 16,
    borderRadius: 6,
  },
};
