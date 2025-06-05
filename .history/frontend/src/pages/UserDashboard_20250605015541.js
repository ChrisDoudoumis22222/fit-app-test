import React from "react";
import { useAuth } from "../AuthProvider";
import { supabase } from "../supabaseClient";
import ChangePasswordForm from "../components/ChangePasswordForm";
import EditProfileForm from "../components/EditProfileForm";

export default function UserDashboard() {
  const { profile } = useAuth();                 // profile is already fetched

  return (
    <section style={styles.container}>
      <h1>Welcome, {profile?.full_name || "user"} 👋</h1>
      <p>
        You are logged in as a regular <strong>user</strong>.
      </p>

      <button onClick={() => supabase.auth.signOut()}>Log out</button>

      {/* ── new features ── */}
      <ChangePasswordForm />
      <EditProfileForm />
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
};
