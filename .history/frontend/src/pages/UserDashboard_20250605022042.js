import React, { useState } from "react";
import { useAuth } from "../AuthProvider";
import { supabase } from "../supabaseClient";
import AvatarUpload from "../components/AvatarUpload";
import ChangePasswordForm from "../components/ChangePasswordForm";
import EditProfileForm from "../components/EditProfileForm";
import { PLACEHOLDER } from "../utils/avatar";

export default function UserDashboard() {
  const { profile } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || PLACEHOLDER);

  const deleteAvatar = async () => {
    try {
      /* 1) clear DB column */
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", profile.id);
      if (error) throw error;

      /* 2) optionally delete the object in Storage
         if (profile.avatar_url) {
           const path = profile.avatar_url.split("/avatars/")[1];
           await supabase.storage.from("avatars").remove([path]);
         }
      */

      setAvatarUrl(PLACEHOLDER);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <section style={styles.container}>
      <img src={avatarUrl} alt="avatar" style={styles.avatar} />

      {profile.avatar_url && (
        <button style={styles.deleteBtn} onClick={deleteAvatar}>
          Delete avatar
        </button>
      )}

      <h1>Welcome, {profile?.full_name || "user"} 👋</h1>
      <button onClick={() => supabase.auth.signOut()}>Log out</button>

      <AvatarUpload />
      <EditProfileForm />
      <ChangePasswordForm />
    </section>
  );
}

const styles = {
  container: { textAlign: "center", marginTop: 40 },
  avatar: {
    width: 120, height: 120, borderRadius: "50%", objectFit: "cover", marginBottom: 10
  },
  deleteBtn: { marginBottom: 12 }
};
