import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import ChangePasswordForm from "../components/ChangePasswordForm";
import EditProfileForm from "../components/EditProfileForm";
import AvatarUpload from "../components/AvatarUpload";

export default function TrainerDashboard() {
  const { profile } = useAuth();
  const [secret, setSecret] = useState("…loading…");

  /* trainer-only data */
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

  const avatar = profile?.avatar_url
    ? profile.avatar_url
    : "https://placehold.co/120x120?text=Avatar";

  return (
    <section style={styles.container}>
      <img src={avatar} alt="avatar" style={styles.avatar} />

      <h1>Trainer dashboard 🏋️‍♀️</h1>

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

      <AvatarUpload />
      <EditProfileForm />
      <ChangePasswordForm />
    </section>
  );
}

const styles = {
  container: {
    textAlign: "center",
    marginTop: 40,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: "50%",
    objectFit: "cover",
    marginBottom: 12,
  },
  card: {
    border: "1px solid #ccc",
    borderRadius: 6,
    padding: 16,
    minWidth: 260,
    textAlign: "left",
  },
};
