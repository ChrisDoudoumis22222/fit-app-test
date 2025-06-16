/*  UserDashboard.jsx – Glass-Dark v1  (hash-driven sections)
    ---------------------------------------------------------
    • Sections are picked by URL hash   (#profile | #avatar | #security)
    • Global <UserMenu/> controls navigation
    • Smoked-glass cards, neon-indigo accents, dark blobs, responsive hero
*/

"use client";

import React, { useEffect, useState } from "react";
import {
  User as UserIcon,
  Camera,
  Trash2,
  Mail,
  Phone,
  BadgeCheck,
  Calendar,
  Settings,
  Shield,
  ImagePlus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

import { supabase }        from "../supabaseClient";
import { useAuth }         from "../AuthProvider";
import UserMenu            from "../components/UserMenu";
import AvatarUpload        from "../components/AvatarUpload";
import EditProfileForm     from "../components/EditProfileForm";
import ChangePasswordForm  from "../components/ChangePasswordForm";
import { PLACEHOLDER }     from "../utils/avatar";

/* ── dark glass helper ───────────────────────── */
const glassBG = {
  background:
    "linear-gradient(135deg,rgba(24,24,27,.85)0%,rgba(17,17,19,.82)100%)",
  backdropFilter: "blur(28px) saturate(160%)",
  WebkitBackdropFilter: "blur(28px) saturate(160%)",
};

/* translucent blobs (darker & faint indigo) */
function Blobs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-24 -top-16 h-80 w-80 bg-indigo-700/10 rounded-full blur-3xl" />
      <div className="absolute right-0 -bottom-24 h-64 w-64 bg-indigo-500/15 rounded-full blur-2xl" />
    </div>
  );
}

const VALID_TABS = ["profile", "avatar", "security"];
const hashToTab = (hash) => {
  const h = (hash || "").replace("#", "");
  return VALID_TABS.includes(h) ? h : "profile";
};

/* ── main component ─────────────────────────── */
export default function UserDashboard() {
  const { profile, profileLoaded } = useAuth();
  const location = useLocation();

  const [avatarUrl, setAvatarUrl] = useState(PLACEHOLDER);
  const [section, setSection] = useState(hashToTab(location.hash));

  /* keep avatar in sync */
  useEffect(() => {
    setAvatarUrl(profile?.avatar_url || PLACEHOLDER);
  }, [profile]);

  /* switch section on hash change */
  useEffect(() => {
    setSection(hashToTab(location.hash));
  }, [location.hash]);

  /* delete avatar */
  const deleteAvatar = async () => {
    if (!window.confirm("Διαγραφή avatar;")) return;
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", profile.id);
    if (error) return alert(error.message);
    setAvatarUrl(PLACEHOLDER);
  };

  /* loading placeholder */
  if (!profileLoaded) {
    return (
      <>
        <UserMenu />
        <div className="min-h-[60vh] flex items-center justify-center bg-black text-gray-400">
          Φόρτωση…
        </div>
      </>
    );
  }

  /* ── UI ───────────────────────────────────── */
  return (
    <>
      <UserMenu />

      {/* space for side-rail */}
      <div className="min-h-screen bg-black pb-24 px-4 lg:px-0 pl-[var(--side-w)] transition-[padding]">
        <HeroCard avatarUrl={avatarUrl} profile={profile} />

        {/* PROFILE */}
        <SectionWrapper id="profile" visible={section === "profile"}>
          <GlassCard title="Επεξεργασία προφίλ" icon={Settings}>
            <EditProfileForm />
          </GlassCard>
        </SectionWrapper>

        {/* AVATAR */}
        <SectionWrapper id="avatar" visible={section === "avatar"}>
          <GlassCard title="Διαχείριση Avatar" icon={ImagePlus}>
            <div className="flex flex-col items-center gap-6">
              <img
                src={avatarUrl}
                alt="avatar"
                className="h-40 w-40 rounded-full object-cover border-4 border-gray-800 shadow-lg"
              />
              <div className="flex flex-wrap gap-3">
                <AvatarUpload
                  url={avatarUrl}
                  onUpload={setAvatarUrl}
                  icon={<Camera size={16} />}
                  buttonClassName="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
                />
                {avatarUrl !== PLACEHOLDER && (
                  <button
                    onClick={deleteAvatar}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white"
                  >
                    <Trash2 size={16} /> Διαγραφή
                  </button>
                )}
              </div>
            </div>
          </GlassCard>
        </SectionWrapper>

        {/* SECURITY */}
        <SectionWrapper id="security" visible={section === "security"}>
          <GlassCard title="Αλλαγή κωδικού" icon={Shield}>
            <ChangePasswordForm />
          </GlassCard>
        </SectionWrapper>
      </div>
    </>
  );
}

/* ── helpers ─────────────────────────────────── */

function SectionWrapper({ id, visible, children }) {
  return (
    <div id={id} className="mx-auto max-w-4xl space-y-10 scroll-mt-28">
      <AnimatePresence mode="popLayout" initial={false}>
        {visible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.42, 0, 0.2, 1] }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── HERO HEADER ─────────────────────────────── */
function HeroCard({ avatarUrl, profile }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="relative overflow-hidden rounded-3xl shadow-2xl ring-1 ring-gray-800"
      style={glassBG}
    >
      <Blobs />

      <div className="relative px-6 sm:px-8 py-12 grid gap-y-8 gap-x-12 md:grid-cols-[auto_1fr]">
        {/* avatar */}
        <motion.div whileHover={{ scale: 1.05 }} className="justify-self-center md:justify-self-start">
          <div className="relative">
            <img
              src={avatarUrl}
              alt="avatar"
              className="h-32 w-32 sm:h-40 sm:w-40 md:h-44 md:w-44 rounded-full object-cover
                         border-[6px] border-gray-900 shadow-xl"
            />
            {!profile?.avatar_url && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-600">
                <UserIcon className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24" />
              </div>
            )}
          </div>
        </motion.div>

        {/* greeting + pills */}
        <div className="text-center md:text-left">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
            Καλωσήρθες,&nbsp;
            <span className="text-indigo-400">
              {profile.full_name || "Χρήστη"}
            </span>
          </h1>

          <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-3">
            <InfoPill icon={Mail}  label={profile.email}        />
            {profile.phone && <InfoPill icon={Phone} label={profile.phone} />}
            <InfoPill icon={BadgeCheck} label={profile.role} extra="capitalize" />
            {profile.created_at && (
              <InfoPill
                icon={Calendar}
                label={new Date(profile.created_at).toLocaleDateString(
                  "el-GR",
                  { day: "2-digit", month: "short", year: "numeric" }
                )}
              />
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function InfoPill({ icon: Icon, label, extra = "" }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800 text-gray-200 text-sm ${extra}`}
    >
      <Icon className="h-4 w-4 text-indigo-400" /> {label}
    </motion.span>
  );
}

function GlassCard({ title, icon: Icon, children }) {
  return (
    <section
      className="relative overflow-hidden rounded-3xl shadow-xl ring-1 ring-gray-800"
      style={glassBG}
    >
      <Blobs />
      <div className="relative p-8 space-y-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Icon className="h-6 w-6 text-indigo-400" /> {title}
        </h2>
        {children}
      </div>
    </section>
  );
}
