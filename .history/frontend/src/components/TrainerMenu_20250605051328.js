import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";

/**
 * @param {Object} props
 * @param {boolean} props.disableServices – when true the “My services”
 *        item is shown in grey and is not clickable
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
      {/* dashboard link */}
      <Link style={styles.link} to="/trainer">
        Dashboard
      </Link>

      {/* services link – may be disabled */}
      {disableServices ? (
        <span
          style={{ ...styles.link, opacity: 0.4, cursor: "not-allowed" }}
          title="Upload a diploma first"
        >
          My&nbsp;services
        </span>
      ) : (
        <Link style={styles.link} to="/trainer/services">
          My&nbsp;services
        </Link>
      )}

      {/* marketplace */}
      <Link style={styles.link} to="/services">
        Marketplace
      </Link>

      {/* log-out */}
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
