import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import Menu from "../components/Menu";           // ← NEW
import AvatarUpload from "../components/AvatarUpload";
import ChangePasswordForm from "../components/ChangePasswordForm";
import EditProfileForm from "../components/EditProfileForm";
import { PLACEHOLDER } from "../utils/avatar";

export default function TrainerDashboard() {
  const { profile } = useAuth();
  const [secret, setSecret] = useState("…loading…");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || PLACEHOLDER);

  /* fetch trainer-only data once */
  useEffect(() => {
    (async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch("/api/trainer/secret", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSecret(data.message || data.error);
    })();
  }, []);

  const deleteAvatar = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", profile.id);
      if (error) throw error;

      /* optionally remove from Storage – see UserDashboard for code */
      setAvatarUrl(PLACEHOLDER);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
      {/* global nav bar */}
      <Menu />

      {/* dashboard content */}
      <section style={styles.container}>
        <img src={avatarUrl} alt="avatar" style={styles.avatar} />

        {profile.avatar_url && (
          <button style={styles.deleteBtn} onClick={deleteAvatar}>
            Delete avatar
          </button>
        )}

        <h1>Trainer dashboard 🏋️‍♀️</h1>

        <p style={{ marginTop: 4 }}>
          <strong>Role:</strong> {profile?.role}
        </p>
        <p>{secret}</p>

        <button onClick={() => supabase.auth.signOut()}>Log out</button>

        <AvatarUpload />
        <EditProfileForm />
        <ChangePasswordForm />
      </section>
    </>
  );
}

const styles = {
  container: { textAlign: "center", marginTop: 40 },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: "50%",
    objectFit: "cover",
    marginBottom: 10
  },
  deleteBtn: { marginBottom: 12 }
};
