import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import ChangePasswordForm from "../components/ChangePasswordForm";

export default function TrainerDashboard() {
  const [secret, setSecret] = useState("…loading…");

  /* fetch trainer-only data */
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
      <p>{secret}</p>

      <button onClick={() => supabase.auth.signOut()}>Log out</button>

      {/* password-change box */}
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
};
