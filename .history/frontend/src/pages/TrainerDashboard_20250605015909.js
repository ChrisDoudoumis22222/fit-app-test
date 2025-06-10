import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import ChangePasswordForm from "../components/ChangePasswordForm";
import EditProfileForm from "../components/EditProfileForm";

export default function TrainerDashboard() {
  const { profile } = useAuth();               // comes from AuthProvider
  const [secret, setSecret] = useState("…loading…");

  /* fetch trainer-only data once */
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch("/api/trainer/secret", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSecret(data.message || data.error);
    })();
  }, []);

  return (
    <section style={styles.container}>
      <h1>Trainer dashboard 🏋️‍♀️</h1>

      {/* profile snapshot */}
      <div style={styles.card}>
        <p><strong>Role:</strong> {profile?.role}</p>
        <p><strong>Full name:</strong> {profile?.full_name || "–"}</p>
        <p><strong>Email:</strong> {profile?.email || "–"}</p>
        <p><strong>Phone:</strong> {profile?.phone || "–"}</p>
        <p><strong>Specialty:</strong> {profile?.specialty || "–"}</p>
        <p><strong>Bio:</strong> {profile?.bio || "–"}</p>
      </div>

      <p style={{ marginTop: 24 }}>{secret}</p>

      <button onClick={() => supabase.auth.signOut()}>Log out</button>

      {/* profile-edit & password-change */}
      <EditProfileForm />
      <ChangePasswordForm />
    </section>
  );
}

const styles = {
  container: {
    textAlign: "center",
    marginTop: 60,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  card: {
    border: "1px solid #ccc",
    borderRadius: 6,
    padding: 16,
    minWidth: 260,
    textAlign: "left",
  },
};
