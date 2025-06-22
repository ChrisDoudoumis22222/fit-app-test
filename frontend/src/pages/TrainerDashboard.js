/*  TrainerDashboard.js – dark glass, responsive, lazy chunks, Lucide icons
    ----------------------------------------------------------------------- */

"use client";

import {
  lazy,
  Suspense,
  useEffect,
  useState,
}                         from "react";
import { supabase }       from "../supabaseClient";
import { useAuth }        from "../AuthProvider";
import {
  Loader2,
  Check,
  User as UserIcon,
  Smartphone,
  Mail,
  Camera,
  Trash2,
  RotateCcw,
  Save,
  GraduationCap,
  Lock,
  KeyRound,
  Shield,
}                         from "lucide-react";

/* ───────── lazy chunks ───────── */
const AvatarUpload  = lazy(() => import("../components/AvatarUpload"));
const DiplomaUpload = lazy(() => import("../components/DiplomaUpload"));
const TrainerMenu   = lazy(() => import("../components/TrainerMenu"));

/* fallback spinner for lazy imports */
const Spinner = ({ size = 6 }) => (
  <Loader2 className={`h-${size} w-${size} animate-spin`} />
);

/* placeholder avatar */
const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='120' height='120' fill='%23333455'/%3E%3C/svg%3E";

export default function TrainerDashboard() {
  /* ───────── auth & state ───────── */
  const { profile, loading } = useAuth();

  const [secret,      setSecret]      = useState("…loading…");
  const [avatarUrl,   setAvatarUrl]   = useState(null);
  const [diplomaUrl,  setDiplomaUrl]  = useState(null);
  const [activeTab,   setActiveTab]   = useState("profile");

  const [fullName, setFullName]       = useState("");
  const [phone,    setPhone]          = useState("");
  const [email,    setEmail]          = useState("");

  /* password */
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError,   setPasswordError]   = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  /* ───────── profile → local ───────── */
  useEffect(() => {
    if (!profile) return;

    setFullName(profile.full_name || "");
    setPhone(profile.phone || "");
    setEmail(profile.email || "");

    setAvatarUrl(
      profile.avatar_url ? `${profile.avatar_url}?t=${Date.now()}` : PLACEHOLDER
    );
    setDiplomaUrl(profile.diploma_url || null);
  }, [profile]);

  /* ───────── load trainer secret once ───────── */
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const res   = await fetch("/api/trainer/secret", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setSecret(data.message || data.error);
      } catch {
        setSecret("Error loading trainer data");
      }
    })();
  }, []);

  /* ───────── helpers ───────── */
  const deleteAvatar = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", profile.id);
      if (error) throw error;
      setAvatarUrl(PLACEHOLDER);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAvatarUpload = async (url) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", profile.id);
      if (error) throw error;
      setAvatarUrl(url);
    } catch (err) {
      alert(err.message);
    }
  };

  const refreshAvatar = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", profile.id)
      .single();
    if (error) return;
    setAvatarUrl(
      data?.avatar_url ? `${data.avatar_url}?t=${Date.now()}` : PLACEHOLDER
    );
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone })
      .eq("id", profile.id);
    alert(error ? error.message : "Profile updated");
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don’t match");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Min length is 6 chars");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setPasswordError(error.message);
    else {
      setPasswordSuccess("Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  /* ───────── loading splash ───────── */
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black">
        <Spinner size={10} />
        <p className="mt-6 text-sm text-neutral-400">
          Loading your dashboard…
        </p>
      </div>
    );
  }

  /* ───────── UI ───────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-neutral-900 to-neutral-800
                    text-white pt-14 lg:pt-0 lg:pl-[var(--side-w)]">
      {/* side-rail (lazy) */}
      <Suspense fallback={<></>}>
        <TrainerMenu userProfile={profile} onLogout={() => supabase.auth.signOut()} />
      </Suspense>

      {/* content wrapper */}
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10
                      px-4 py-10 lg:flex-row">
        {/* ─────── profile card ─────── */}
        <aside className="w-full lg:max-w-xs">
          <div className="rounded-2xl bg-white/5 p-8 backdrop-blur-xl
                          ring-1 ring-white/20 shadow-2xl">
            {/* avatar */}
            <div className="relative mx-auto mb-6 w-32">
              <img
                src={avatarUrl}
                alt="avatar"
                className="aspect-square w-full rounded-full object-cover
                           ring-4 ring-white/20"
              />
              <div className="absolute bottom-1.5 right-1.5 flex h-8 w-8 items-center
                              justify-center rounded-full bg-emerald-500 ring-2 ring-white">
                <Check className="h-4 w-4 text-white" />
              </div>
            </div>

            <h2 className="truncate text-center text-xl font-semibold leading-tight">
              {profile?.full_name || profile?.email}
            </h2>

            <p className="mt-2 inline-flex items-center justify-center gap-2
                           rounded-full bg-indigo-500/90 px-3 py-1 text-sm
                           font-medium capitalize shadow-inner">
              🏋️ Trainer
            </p>

            <div className="mt-6 flex items-center gap-3 rounded-xl bg-white/10
                            p-4 ring-1 ring-white/10">
              <Shield className="h-5 w-5 shrink-0" />
              <p className="truncate text-sm text-white/80">{secret}</p>
            </div>
          </div>
        </aside>

        {/* ─────── main column ─────── */}
        <main className="flex-1 space-y-8">
          {/* tabs */}
          <nav className="mx-auto flex max-w-md rounded-xl bg-black/40 p-1
                          ring-1 ring-white/20 backdrop-blur">
            {[
              ["profile",  "Profile",  <UserIcon      className="h-4 w-4" />],
              ["diploma",  "Diploma",  <GraduationCap className="h-4 w-4" />],
              ["security", "Security", <Lock          className="h-4 w-4" />],
            ].map(([key, label, icon]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2
                            text-sm font-medium transition
                            ${activeTab === key
                              ? "bg-white text-black shadow"
                              : "text-white/60 hover:bg-white/10"}`}
              >
                {icon}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>

          {/* ───────── PROFILE TAB ───────── */}
          {activeTab === "profile" && (
            <section className="space-y-8">
              {/* avatar section */}
              <div className="rounded-2xl bg-white/5 p-6 backdrop-blur
                              ring-1 ring-white/20">
                <h3 className="mb-6 flex items-center gap-3 text-lg font-semibold">
                  <Camera className="h-5 w-5" /> Update Avatar
                </h3>

                <div className="flex flex-wrap items-center gap-4">
                  {profile?.avatar_url && (
                    <button
                      onClick={deleteAvatar}
                      className="inline-flex items-center gap-2 rounded-lg bg-rose-600
                                 px-4 py-2 text-sm font-medium hover:bg-rose-500"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  )}

                  <Suspense fallback={<Spinner />}>
                    <AvatarUpload url={avatarUrl} onUpload={handleAvatarUpload} />
                  </Suspense>

                  <button
                    onClick={refreshAvatar}
                    className="inline-flex items-center gap-2 rounded-lg bg-neutral-600
                               px-4 py-2 text-sm font-medium hover:bg-neutral-500"
                  >
                    <RotateCcw className="h-4 w-4" /> Refresh
                  </button>
                </div>
              </div>

              {/* profile basics */}
              <div className="rounded-2xl bg-white/5 p-6 backdrop-blur
                              ring-1 ring-white/20">
                <h3 className="mb-6 flex items-center gap-3 text-lg font-semibold">
                  <UserIcon className="h-5 w-5" /> Edit Profile
                </h3>

                <form onSubmit={handleSaveProfile} className="space-y-5 max-w-lg">
                  {/* name */}
                  <div>
                    <label className="mb-1 flex items-center gap-2 text-sm font-medium">
                      <UserIcon className="h-4 w-4" /> Full Name
                    </label>
                    <input
                      className="block w-full rounded-lg border border-white/10
                                 bg-black/30 px-4 py-2 text-sm placeholder-white/50
                                 focus:bg-black/50 focus:outline-none
                                 focus:ring-1 focus:ring-indigo-400 sm:text-base"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter full name"
                    />
                  </div>

                  {/* phone */}
                  <div>
                    <label className="mb-1 flex items-center gap-2 text-sm font-medium">
                      <Smartphone className="h-4 w-4" /> Phone
                    </label>
                    <input
                      className="block w-full rounded-lg border border-white/10
                                 bg-black/30 px-4 py-2 text-sm placeholder-white/50
                                 focus:bg-black/50 focus:outline-none
                                 focus:ring-1 focus:ring-indigo-400 sm:text-base"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter phone"
                    />
                  </div>

                  {/* email */}
                  <div>
                    <label className="mb-1 flex items-center gap-2 text-sm font-medium">
                      <Mail className="h-4 w-4" /> Email
                    </label>
                    <input
                      type="email"
                      disabled
                      value={email}
                      className="block w-full cursor-not-allowed rounded-lg border
                                 border-white/10 bg-white/10 px-4 py-2 text-sm
                                 text-white/60 sm:text-base"
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-500
                               px-5 py-2 text-sm font-semibold text-white
                               hover:bg-indigo-400"
                  >
                    <Save className="h-4 w-4" /> Save changes
                  </button>
                </form>
              </div>
            </section>
          )}

          {/* ───────── DIPLOMA TAB ───────── */}
          {activeTab === "diploma" && (
            <section className="rounded-2xl bg-white/5 p-6 backdrop-blur
                                ring-1 ring-white/20">
              <h3 className="mb-6 flex items-center gap-3 text-lg font-semibold">
                <GraduationCap className="h-5 w-5" /> Diploma &amp; Certification
              </h3>

              <Suspense fallback={<Spinner />}>
                <DiplomaUpload
                  profileId={profile.id}
                  currentUrl={diplomaUrl}
                  onChange={(url) => setDiplomaUrl(url)}
                />
              </Suspense>
            </section>
          )}

          {/* ───────── SECURITY TAB ───────── */}
          {activeTab === "security" && (
            <section className="space-y-8">
              <div className="rounded-2xl bg-white/5 p-6 backdrop-blur
                              ring-1 ring-white/20">
                <h3 className="mb-6 flex items-center gap-3 text-lg font-semibold">
                  <KeyRound className="h-5 w-5" /> Change Password
                </h3>

                <form onSubmit={handleChangePassword} className="space-y-5 max-w-lg">
                  {passwordError && (
                    <div className="rounded-lg bg-rose-600/20 p-3 text-sm text-rose-300">
                      {passwordError}
                    </div>
                  )}
                  {passwordSuccess && (
                    <div className="rounded-lg bg-emerald-600/20 p-3 text-sm text-emerald-300">
                      {passwordSuccess}
                    </div>
                  )}

                  {/* current */}
                  <div>
                    <label className="mb-1 flex items-center gap-2 text-sm font-medium">
                      <Lock className="h-4 w-4" /> Current
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="block w-full rounded-lg border border-white/10
                                 bg-black/30 px-4 py-2 text-sm placeholder-white/50
                                 focus:bg-black/50 focus:outline-none
                                 focus:ring-1 focus:ring-indigo-400 sm:text-base"
                    />
                  </div>

                  {/* new */}
                  <div>
                    <label className="mb-1 flex items-center gap-2 text-sm font-medium">
                      <KeyRound className="h-4 w-4" /> New
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="block w-full rounded-lg border border-white/10
                                 bg-black/30 px-4 py-2 text-sm placeholder-white/50
                                 focus:bg-black/50 focus:outline-none
                                 focus:ring-1 focus:ring-indigo-400 sm:text-base"
                      required
                    />
                  </div>

                  {/* confirm */}
                  <div>
                    <label className="mb-1 flex items-center gap-2 text-sm font-medium">
                      <KeyRound className="h-4 w-4" /> Confirm
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full rounded-lg border border-white/10
                                 bg-black/30 px-4 py-2 text-sm placeholder-white/50
                                 focus:bg-black/50 focus:outline-none
                                 focus:ring-1 focus:ring-indigo-400 sm:text-base"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-500
                               px-5 py-2 text-sm font-semibold text-white
                               hover:bg-indigo-400"
                  >
                    <RotateCcw className="h-4 w-4" /> Change Password
                  </button>
                </form>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
