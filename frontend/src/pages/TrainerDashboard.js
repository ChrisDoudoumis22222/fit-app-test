"use client"

import { useEffect, useState } from "react"
import { supabase } from "../supabaseClient"
import { useAuth } from "../AuthProvider"

import AvatarUpload  from "../components/AvatarUpload"
import DiplomaUpload from "../components/DiplomaUpload"
import TrainerMenu   from "../components/TrainerMenu"

/* placeholder όταν δεν υπάρχει avatar */
const PLACEHOLDER =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' font-size='16' text-anchor='middle' alignment-baseline='middle' font-family='system-ui, sans-serif' fill='%2394a3b8'%3EAvatar%3C/text%3E%3C/svg%3E"

export default function TrainerDashboard() {
  /* ───────────────────────────────────── hooks/state ────────────────── */
  const { profile, loading } = useAuth()

  const [secret,      setSecret]      = useState("…loading…")
  const [avatarUrl,   setAvatarUrl]   = useState(null)
  const [diplomaUrl,  setDiplomaUrl]  = useState(null)
  const [activeTab,   setActiveTab]   = useState("profile")

  /* form fields */
  const [fullName, setFullName] = useState("")
  const [phone,    setPhone]    = useState("")
  const [email,    setEmail]    = useState("")

  /* password */
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword,     setNewPassword]     = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError,   setPasswordError]   = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")

  /* ─────────────────────── sync profile → local state ───────────────── */
  useEffect(() => {
    if (!profile) return
    setFullName(profile.full_name || "")
    setPhone(profile.phone || "")
    setEmail(profile.email || "")

    /* avatar */
    if (profile.avatar_url) {
      const cache = `?t=${Date.now()}`
      setAvatarUrl(profile.avatar_url + cache)
    } else {
      setAvatarUrl(PLACEHOLDER)
    }

    /* diploma */
    setDiplomaUrl(profile.diploma_url || null)
  }, [profile])

  /* ───────────── fetch μόνο μία φορά το «trainer secret» ─────────────── */
  useEffect(() => {
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        const res   = await fetch("/api/trainer/secret", {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data  = await res.json()
        setSecret(data.message || data.error)
      } catch {
        setSecret("Error loading trainer data")
      }
    })()
  }, [])

  /* ───────────────────────────── helpers ────────────────────────────── */
  const deleteAvatar = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", profile.id)
      if (error) throw error

      setAvatarUrl(PLACEHOLDER)
    } catch (err) {
      alert("Error deleting avatar: " + err.message)
    }
  }

  const handleAvatarUpload = async (url) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", profile.id)
      if (error) throw error

      setAvatarUrl(url)
    } catch (err) {
      alert("Error updating avatar: " + err.message)
    }
  }

  const refreshAvatar = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", profile.id)
      .single()
    if (error) return

    if (data?.avatar_url) {
      setAvatarUrl(`${data.avatar_url}?t=${Date.now()}`)
    } else {
      setAvatarUrl(PLACEHOLDER)
    }
  }

  /* save profile basics */
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone })
      .eq("id", profile.id)

    alert(error ? "Error: " + error.message : "Profile updated")
  }

  /* change password */
  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordError("")
    setPasswordSuccess("")

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match")
      return
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long")
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) setPasswordError(error.message)
    else {
      setPasswordSuccess("Password changed successfully")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    }
  }

  const handleLogout = () => supabase.auth.signOut()

  /* ─────────────────────── render loading state ─────────────────────── */
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner} />
        <p style={styles.loadingText}>Loading your dashboard…</p>
      </div>
    )
  }

  /* ───────────────────────────── render UI ──────────────────────────── */
  return (
    <div style={styles.container}>
      <TrainerMenu
        userProfile={profile}
        onLogout={handleLogout}
        currentPage="dashboard"
      />

      <div style={styles.content}>
        {/* ──────────────── Sidebar ──────────────── */}
        <div style={styles.sidebar}>
          <div style={styles.profileCard}>
            <div style={styles.avatarContainer}>
              <img
                src={avatarUrl || PLACEHOLDER}
                alt="avatar"
                style={styles.avatar}
                onError={(e) => (e.target.src = PLACEHOLDER)}
              />
              <div style={styles.avatarBadge}>
                <span style={styles.badgeIcon}>✓</span>
              </div>
            </div>

            <h2 style={styles.username}>
              {profile?.full_name || profile?.email}
            </h2>

            <div style={styles.roleBadge}>
              <span style={styles.roleIcon}>🏋️</span> trainer
            </div>

            <div style={styles.secretContainer}>
              <span style={styles.secretIcon}>🔐</span>
              <p style={styles.secretMessage}>{secret}</p>
            </div>
          </div>
        </div>

        {/* ──────────────── Main Area ──────────────── */}
        <div style={styles.mainContent}>
          {/* Tabs */}
          <div style={styles.tabsContainer}>
            <div style={styles.tabs}>
              {["profile", "diploma", "security"].map((key) => (
                <button
                  key={key}
                  style={activeTab === key ? styles.activeTab : styles.tab}
                  onClick={() => setActiveTab(key)}
                >
                  {key === "profile" && <>👤 Profile Information</>}
                  {key === "diploma" && <>🎓 Diploma & Certification</>}
                  {key === "security" && <>🔒 Security</>}
                </button>
              ))}
            </div>
          </div>

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div style={styles.tabContent}>
              <div style={styles.contentCard}>
                <h3 style={styles.sectionTitle}>
                  <span style={styles.sectionIcon}>👤</span> Profile Information
                </h3>

                {/* avatar */}
                <div style={styles.section}>
                  <h4 style={styles.subTitle}>
                    <span style={styles.subIcon}>📸</span> Update Avatar
                  </h4>
                  <div style={styles.avatarActions}>
                    {profile?.avatar_url && (
                      <button
                        style={styles.deleteButton}
                        onClick={deleteAvatar}
                      >
                        🗑️ Delete avatar
                      </button>
                    )}
                    <AvatarUpload
                      url={avatarUrl}
                      onUpload={handleAvatarUpload}
                    />
                    <button
                      style={styles.refreshButton}
                      onClick={refreshAvatar}
                    >
                      🔄 Refresh Avatar
                    </button>
                  </div>
                </div>

                {/* basics */}
                <div style={styles.section}>
                  <h4 style={styles.subTitle}>
                    <span style={styles.subIcon}>✏️</span> Edit Profile Details
                  </h4>

                  <form onSubmit={handleSaveProfile} style={styles.formContainer}>
                    {/* name */}
                    <div style={styles.formGroup}>
                      <label style={styles.label}>
                        👤 Full Name
                      </label>
                      <input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        style={styles.input}
                      />
                    </div>

                    {/* phone */}
                    <div style={styles.formGroup}>
                      <label style={styles.label}>📱 Phone</label>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Enter your phone number"
                        style={styles.input}
                      />
                    </div>

                    {/* email */}
                    <div style={styles.formGroup}>
                      <label style={styles.label}>📧 Email</label>
                      <input
                        type="email"
                        value={email}
                        disabled
                        style={styles.disabledInput}
                      />
                    </div>

                    <button type="submit" style={styles.saveButton}>
                      💾 Save changes
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Diploma Tab */}
          {activeTab === "diploma" && (
            <div style={styles.tabContent}>
              <div style={styles.contentCard}>
                <h3 style={styles.sectionTitle}>
                  <span style={styles.sectionIcon}>🎓</span> Diploma & Certification
                </h3>

                <DiplomaUpload
                  profileId={profile.id}
                  currentUrl={diplomaUrl}
                  onChange={(url) => setDiplomaUrl(url)}
                />
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div style={styles.tabContent}>
              <div style={styles.contentCard}>
                <h3 style={styles.sectionTitle}>
                  <span style={styles.sectionIcon}>🔒</span> Security
                </h3>

                <form onSubmit={handleChangePassword} style={styles.formContainer}>
                  {passwordError && (
                    <div style={styles.errorAlert}>❌ {passwordError}</div>
                  )}
                  {passwordSuccess && (
                    <div style={styles.successAlert}>✅ {passwordSuccess}</div>
                  )}

                  <div style={styles.formGroup}>
                    <label style={styles.label}>🔒 Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>🔑 New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>🔐 Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>

                  <button type="submit" style={styles.saveButton}>
                    🔄 Change Password
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  // Update the container style to use a more modern font stack
  container: {
    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    margin: 0,
    padding: 0,
    backgroundColor: "#f8fafc",
    minHeight: "100vh",
    color: "#334155",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
  },
  loadingSpinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #e2e8f0",
    borderTop: "4px solid #3b82f6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "16px",
  },
  loadingText: {
    color: "#64748b",
    fontSize: "16px",
  },
  content: {
    display: "flex",
    minHeight: "calc(100vh - 72px)",
  },
  sidebar: {
    width: "280px",
    backgroundColor: "white",
    borderRight: "1px solid #e2e8f0",
    padding: "24px",
  },
  profileCard: {
    textAlign: "center",
    padding: "24px",
    backgroundColor: "#f8fafc",
    borderRadius: "16px",
    border: "1px solid #e2e8f0",
  },
  avatarContainer: {
    position: "relative",
    display: "inline-block",
    marginBottom: "16px",
  },
  // Update the avatar style for better presentation
  avatar: {
    width: "120px",
    height: "120px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "4px solid white",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
    backgroundColor: "#f1f5f9",
  },
  avatarBadge: {
    position: "absolute",
    bottom: "8px",
    right: "8px",
    width: "32px",
    height: "32px",
    backgroundColor: "#10b981",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "3px solid white",
  },
  badgeIcon: {
    color: "white",
    fontSize: "14px",
    fontWeight: "bold",
  },
  username: {
    fontSize: "22px",
    fontWeight: "700",
    margin: "0 0 8px 0",
    color: "#1e293b",
  },
  roleBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#3b82f6",
    color: "white",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "14px",
    fontWeight: "500",
    marginBottom: "16px",
    textTransform: "capitalize",
  },
  roleIcon: {
    fontSize: "16px",
  },
  secretContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px",
    backgroundColor: "white",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
  },
  secretIcon: {
    fontSize: "16px",
  },
  secretMessage: {
    fontSize: "14px",
    color: "#64748b",
    margin: 0,
  },
  mainContent: {
    flex: 1,
    padding: "24px",
  },
  tabsContainer: {
    marginBottom: "24px",
  },
  tabs: {
    display: "flex",
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "4px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  tab: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 20px",
    border: "none",
    background: "none",
    cursor: "pointer",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#64748b",
    transition: "all 0.2s",
    flex: 1,
    justifyContent: "center",
  },
  // Update the tab styles for better visual hierarchy
  activeTab: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 20px",
    border: "none",
    backgroundColor: "#3b82f6",
    color: "white",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    flex: 1,
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
  },
  tabIcon: {
    fontSize: "16px",
  },
  tabContent: {
    animation: "fadeIn 0.3s ease-in-out",
  },
  contentCard: {
    backgroundColor: "white",
    borderRadius: "16px",
    padding: "32px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  },
  sectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "24px",
    fontWeight: "700",
    margin: "0 0 32px 0",
    color: "#1e293b",
  },
  sectionIcon: {
    fontSize: "28px",
  },
  section: {
    marginBottom: "32px",
    paddingBottom: "32px",
    borderBottom: "1px solid #f1f5f9",
  },
  subTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "18px",
    fontWeight: "600",
    margin: "0 0 16px 0",
    color: "#374151",
  },
  subIcon: {
    fontSize: "20px",
  },
  formContainer: {
    maxWidth: "600px",
  },
  formGroup: {
    marginBottom: "20px",
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#374151",
  },
  labelIcon: {
    fontSize: "16px",
  },
  // Update the form inputs for better focus states
  input: {
    width: "100%",
    padding: "12px 16px",
    border: "2px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "14px",
    transition: "all 0.2s",
    backgroundColor: "white",
    boxSizing: "border-box",
    outline: "none",
    ":focus": {
      borderColor: "#3b82f6",
      boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.2)",
    },
  },
  disabledInput: {
    width: "100%",
    padding: "12px 16px",
    border: "2px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "14px",
    backgroundColor: "#f8fafc",
    color: "#64748b",
    boxSizing: "border-box",
  },
  // Update buttons for better hover states
  saveButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    padding: "12px 24px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    transition: "all 0.2s",
    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
    ":hover": {
      backgroundColor: "#2563eb",
      transform: "translateY(-1px)",
    },
  },
  deleteButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#ef4444",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  refreshButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#64748b",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  },
  buttonIcon: {
    fontSize: "16px",
  },
  avatarActions: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  warningCard: {
    display: "flex",
    gap: "16px",
    padding: "24px",
    backgroundColor: "#fef3c7",
    border: "1px solid #f59e0b",
    borderRadius: "12px",
  },
  warningIcon: {
    fontSize: "32px",
    flexShrink: 0,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: "18px",
    fontWeight: "600",
    margin: "0 0 8px 0",
    color: "#92400e",
  },
  warningText: {
    fontSize: "14px",
    color: "#92400e",
    marginBottom: "16px",
  },
  successCard: {
    display: "flex",
    gap: "16px",
    padding: "24px",
    backgroundColor: "#d1fae5",
    border: "1px solid #10b981",
    borderRadius: "12px",
  },
  successIcon: {
    fontSize: "32px",
    flexShrink: 0,
  },
  successContent: {
    flex: 1,
  },
  successTitle: {
    fontSize: "18px",
    fontWeight: "600",
    margin: "0 0 8px 0",
    color: "#065f46",
  },
  successText: {
    fontSize: "14px",
    color: "#065f46",
    marginBottom: "16px",
  },
  uploadContainer: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
  },
  hiddenInput: {
    display: "none",
  },
  uploadButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    backgroundColor: "#3b82f6",
    color: "white",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "background-color 0.2s",
  },
  uploadIcon: {
    fontSize: "16px",
  },
  diplomaActions: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  viewButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#3b82f6",
    color: "white",
    textDecoration: "none",
    padding: "10px 20px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    alignSelf: "flex-start",
  },
  updateSection: {
    padding: "16px",
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
  },
  updateText: {
    fontSize: "14px",
    color: "#64748b",
    marginBottom: "12px",
  },
  errorText: {
    color: "#ef4444",
    fontSize: "14px",
    marginTop: "8px",
  },
  errorAlert: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 16px",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    color: "#dc2626",
    fontSize: "14px",
    marginBottom: "16px",
  },
  successAlert: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 16px",
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "8px",
    color: "#16a34a",
    fontSize: "14px",
    marginBottom: "16px",
  },
  alertIcon: {
    fontSize: "16px",
  },
}
