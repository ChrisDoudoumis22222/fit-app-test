import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";

/**
 * TrainerMenu can disable the “My services” link when disableServices=true.
 */
export default function TrainerMenu({ disableServices = false }) {
  const nav = useNavigate();
  const { loading } = useAuth();

  if (loading) return null;

  const logout = async () => {
    await supabase.auth.signOut();
    nav("/");
  };

  return (
    <nav style={styles.bar}>
      {/* Dashboard always clickable */}
      <Link style={styles.link} to="/trainer">
        Dashboard
      </Link>

      {/* “My services” becomes a <span> when disabled */}
      {disableServices ? (
        <span
          style={{ ...styles.link, opacity: 0.4, cursor: "not-allowed" }}
          title="Upload a diploma to enable this"
        >
          My services
        </span>
      ) : (
        <Link style={styles.link} to="/trainer/services">
          My services
        </Link>
      )}

      {/* Marketplace always clickable */}
      <Link style={styles.link} to="/services">
        Marketplace
      </Link>

      {/* Log out */}
      <button style={styles.link} onClick={logout}>
        Log out
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
