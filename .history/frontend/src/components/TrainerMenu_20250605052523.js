// src/components/TrainerMenu.js
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";

export default function TrainerMenu() {
  const nav = useNavigate();
  const { profile, loading } = useAuth();

  // Wait until auth/profile is loaded
  if (loading) return null;

  // If somehow not a trainer, don’t render anything
  if (!profile || profile.role !== "trainer") return null;

  const logout = async () => {
    await supabase.auth.signOut();
    nav("/");
  };

  // If diploma_url is falsy, disable “My services”
  const disabled = !profile.diploma_url;

  return (
    <nav style={styles.bar}>
      {/* Dashboard always clickable */}
      <Link style={styles.link} to="/trainer">
        Dashboard
      </Link>

      {/* Disable “My services” if no diploma uploaded */}
      {disabled ? (
        <span
          style={{ ...styles.link, opacity: 0.4, cursor: "not-allowed" }}
          title="Upload a diploma to enable this"
        >
          My&nbsp;services
        </span>
      ) : (
        <Link style={styles.link} to="/trainer/services">
          My&nbsp;services
        </Link>
      )}

      {/* Marketplace always clickable */}
      <Link style={styles.link} to="/services">
        Marketplace
      </Link>

      {/* Log out */}
      <button style={styles.link} onClick={logout}>
        Log&nbsp;out
      </button>
    </nav>
  );
}

const styles = {
  bar: {
    display: "flex",
    gap: 12,
    padding: "10px 16px",
    background: "#262626",
  },
  link: {
    color: "#fff",
    textDecoration: "none",
    cursor: "pointer",
    background: "transparent",
    border: "none",
    font: "inherit",
  },
};
