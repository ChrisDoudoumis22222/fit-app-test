import React from "react";
import { useAuth } from "../AuthProvider";
import { supabase } from "../supabaseClient";
import ChangePasswordForm from "../components/ChangePasswordForm";
import EditProfileForm from "../components/EditProfileForm";
import AvatarUpload from "../components/AvatarUpload";

export default function UserDashboard() {
  const { profile } = useAuth();

  const avatar = profile?.avatar_url
    ? profile.avatar_url
    : "https://placehold.co/120x120?text=Avatar";

  return (
    <section style={styles.container}>
      <img src={avatar} alt="avatar" style={styles.avatar} />

      <h1>Welcome, {profile?.full_name || "user"} 👋</h1>
      <p>
        You are logged in as a regular <strong>user</strong>.
      </p>

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
};
