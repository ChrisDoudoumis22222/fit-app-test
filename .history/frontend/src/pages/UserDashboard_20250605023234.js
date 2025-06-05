import React, { useState } from "react";
import { useAuth } from "../AuthProvider";
import { supabase } from "../supabaseClient";
import UserMenu from "../components/UserMenu";          // ← NEW
import AvatarUpload from "../components/AvatarUpload";
import ChangePasswordForm from "../components/ChangePasswordForm";
import EditProfileForm from "../components/EditProfileForm";
import { PLACEHOLDER } from "../utils/avatar";

export default function UserDashboard() {
  const { profile } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || PLACEHOLDER);

  const deleteAvatar = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", profile.id);
      if (error) throw error;
      setAvatarUrl(PLACEHOLDER);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
      <UserMenu />

      <section style={styles.container}>
        <img src={avatarUrl} alt="avatar" style={styles.avatar} />
        {profile.avatar_url && (
          <button style={styles.deleteBtn} onClick={deleteAvatar}>
            Delete avatar
          </button>
        )}

        <h1>Welcome, {profile?.full_name || "user"} 👋</h1>

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
    width: 120, height: 120, borderRadius: "50%", objectFit: "cover", marginBottom: 10
  },
  deleteBtn: { marginBottom: 12 }
};
