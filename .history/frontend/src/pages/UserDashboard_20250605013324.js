import React from "react";
import { useAuth } from "../AuthProvider";
import { supabase } from "../supabaseClient";

export default function UserDashboard() {
  const { profile } = useAuth();

  return (
    <section style={styles.container}>
      <h1>Welcome, {profile?.full_name || "user"} 👋</h1>
      <p>You are logged in as a regular <strong>user</strong>.</p>
      <button onClick={() => supabase.auth.signOut()}>Log out</button>
    </section>
  );
}

const styles = { container: { textAlign: "center", marginTop: 60 } };
