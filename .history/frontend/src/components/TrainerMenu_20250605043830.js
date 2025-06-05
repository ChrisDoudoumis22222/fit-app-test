import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";

export default function TrainerMenu() {
  const nav = useNavigate();
  const { loading } = useAuth();

  if (loading) return null;

  const logout = async () => {
    await supabase.auth.signOut();
    nav("/");
  };

  return (
    <nav style={styles.bar}>
      <Link style={styles.link} to="/trainer">
        Dashboard
      </Link>
      <Link style={styles.link} to="/trainer/services">
        My&nbsp;services
      </Link>
      <Link style={styles.link} to="/services">
        Marketplace
      </Link>
      <button style={styles.link} onClick={logout}>
        Log out
      </button>
    </nav>
  );
}

const styles = {
  bar: { display: "flex", gap: 12, padding: "10px 16px", background: "#262626" },
  link: {
    color: "#fff",
    textDecoration: "none",
    cursor: "pointer",
    background: "transparent",
    border: "none",
    font: "inherit",
  },
};
