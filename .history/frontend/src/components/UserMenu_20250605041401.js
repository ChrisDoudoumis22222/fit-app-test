// frontend/src/components/UserMenu.js
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function UserMenu() {
  const nav = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    nav("/");
  };

  return (
    <nav style={styles.bar}>
      <Link style={styles.link} to="/user">
        Dashboard
      </Link>

      {/* marketplace list */}
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
  bar: {
    display: "flex",
    gap: 12,
    padding: "10px 16px",
    background: "#00334d",
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
