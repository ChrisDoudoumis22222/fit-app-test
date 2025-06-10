// frontend/src/components/Menu.js
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";

export default function Menu() {
  const { session, profile } = useAuth();
  const nav = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    nav("/");                        // back to auth page
  };

  /* unauthenticated */
  if (!session)
    return (
      <nav style={styles.bar}>
        <Link style={styles.link} to="/">
          Sign in / Sign up
        </Link>
      </nav>
    );

  /* common links for any logged-in user */
  const common = (
    <>
      <Link style={styles.link} to="/services">
        Services
      </Link>
      <button style={styles.link} onClick={logout}>
        Log out
      </button>
    </>
  );

  if (profile?.role === "trainer") {
    /* trainer menu */
    return (
      <nav style={styles.bar}>
        <Link style={styles.link} to="/trainer">
          Dashboard
        </Link>
        <Link style={styles.link} to="/trainer/services">
          My services
        </Link>
        {common}
      </nav>
    );
  }

  /* regular user menu */
  return (
    <nav style={styles.bar}>
      <Link style={styles.link} to="/user">
        Dashboard
      </Link>
      {common}
    </nav>
  );
}

const styles = {
  bar: {
    display: "flex",
    gap: 12,
    padding: "10px 16px",
    background: "#222",
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
