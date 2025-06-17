/*  UserDashboard.jsx – Glass-Dark (greyscale + refined animated grid)  v3.0
    ------------------------------------------------------------------------
    • 4 hash sections  (#profile | #avatar | #security | #bookings)
    • <UserBookings/> is code-split
    • Back-drop: three drifting line-layers + vignette mask for softer edges
*/

"use client";

import React, { useEffect, useState, lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import {
  User as UserIcon, Camera, Trash2, Mail, Phone,
  BadgeCheck, Calendar, CalendarCheck,
  Settings, Shield, ImagePlus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { supabase }           from "../supabaseClient";
import { useAuth }            from "../AuthProvider";
import UserMenu               from "../components/UserMenu";
import AvatarUpload           from "../components/AvatarUpload";
import EditProfileForm        from "../components/EditProfileForm";
import ChangePasswordForm     from "../components/ChangePasswordForm";
import { PLACEHOLDER }        from "../utils/avatar";

/* shadcn/ui */
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge  } from "../components/ui/badge";

/* lazy */
const UserBookings = lazy(() => import("../components/UserBookings"));

/* ---------- styling helpers ---------- */
const glassBG = {
  background : "linear-gradient(135deg,#000 0%,#111 100%)",
  backdropFilter       : "blur(32px) saturate(160%)",
  WebkitBackdropFilter : "blur(32px) saturate(160%)",
};
const ringMono = "ring-1 ring-white/10";

/* soft blobs inside cards */
function Blobs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-24 -top-20 size-96 rounded-full bg-white/5  blur-3xl" />
      <div className="absolute  right-0  -bottom-24 size-72 rounded-full bg-white/7 blur-2xl" />
    </div>
  );
}

/* animated grid backdrop  (vignette-masked) */
function LinesBG() {
  return (
    <>
      <style>{`
        @keyframes driftX { 0%{transform:translateX(-50%)} 100%{transform:translateX(50%)} }
        @keyframes driftY { 0%{transform:translateY(-40%)} 100%{transform:translateY(40%)} }
        @keyframes driftD { 0%{background-position:0 0} 100%{background-position:800px 800px} }
      `}</style>

      {/* vertical lines */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage : "repeating-linear-gradient(90deg,transparent 0 27px,rgba(255,255,255,.06) 27px 29px)",
          backgroundSize  : "54px 100%",
          animation       : "driftX 80s linear infinite reverse",
          maskImage       : "radial-gradient(circle at 50% 40%,black 40%,transparent 100%)",
        }}
      />
      {/* horizontal lines */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage : "repeating-linear-gradient(0deg,transparent 0 27px,rgba(255,255,255,.06) 27px 29px)",
          backgroundSize  : "100% 54px",
          animation       : "driftY 120s linear infinite",
          maskImage       : "radial-gradient(circle at 50% 60%,black 40%,transparent 100%)",
        }}
      />
      {/* subtle diagonal noise-ish layer */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage : "repeating-linear-gradient(45deg,transparent 0 95px,rgba(255,255,255,.03) 95px 97px)",
          backgroundSize  : "190px 190px",
          animation       : "driftD 240s linear infinite",
          maskImage       : "radial-gradient(circle,black 0%,transparent 80%)",
        }}
      />
    </>
  );
}

/* hash → section */
const SECTIONS = ["profile", "avatar", "security", "bookings"];
const fromHash = (h="") => (SECTIONS.includes(h.replace("#","")) ? h.replace("#","") : "profile");

/* ================================================================= */
export default function UserDashboard() {
  const { profile, profileLoaded } = useAuth();
  const location = useLocation();

  const [avatar,  setAvatar]  = useState(PLACEHOLDER);
  const [section, setSection] = useState(fromHash(location.hash));

  useEffect(() => { setAvatar(profile?.avatar_url || PLACEHOLDER); }, [profile]);
  useEffect(() => { setSection(fromHash(location.hash));           }, [location.hash]);

  const deleteAvatar = async () => {
    if (!window.confirm("Διαγραφή avatar;")) return;
    await supabase.from("profiles").update({ avatar_url:null }).eq("id", profile.id);
    setAvatar(PLACEHOLDER);
  };

  /* splash */
  if (!profileLoaded) {
    return (
      <>
        <UserMenu />
        <div className="min-h-screen grid place-items-center bg-black text-gray-500">Φόρτωση…</div>
      </>
    );
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="relative bg-black min-h-svh text-gray-200">
      <LinesBG />   {/* animated backdrop at z-0 */}
      <UserMenu />

      <main className="pl-[var(--side-w)] px-4 lg:px-6 py-12 space-y-12 relative z-10">
        <HeroCard avatar={avatar} profile={profile} />

        <DashSection id="profile"  show={section==="profile"}>
          <GlassCard title="Επεξεργασία προφίλ" icon={Settings}>
            <EditProfileForm />
          </GlassCard>
        </DashSection>

        <DashSection id="avatar"   show={section==="avatar"}>
          <GlassCard title="Διαχείριση Avatar" icon={ImagePlus}>
            <AvatarArea
              avatar={avatar}
              placeholder={PLACEHOLDER}
              onUpload={setAvatar}
              onDelete={deleteAvatar}
            />
          </GlassCard>
        </DashSection>

        <DashSection id="security" show={section==="security"}>
          <GlassCard title="Αλλαγή κωδικού" icon={Shield}>
            <ChangePasswordForm />
          </GlassCard>
        </DashSection>

        <DashSection id="bookings" show={section==="bookings"}>
          <GlassCard title="Οι Κρατήσεις μου" icon={CalendarCheck}>
            <Suspense fallback={<p className="text-gray-500">Φόρτωση κρατήσεων…</p>}>
              <UserBookings />
            </Suspense>
          </GlassCard>
        </DashSection>
      </main>
    </div>
  );
}

/* -------- helpers -------- */
function AvatarArea({ avatar, placeholder, onUpload, onDelete }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <img
          src={avatar}
          alt="avatar"
          className="h-40 w-40 rounded-full object-cover border-[5px] border-gray-800 shadow-xl"
        />
        <div className="absolute inset-0 rounded-full ring-8 ring-white/10 animate-pulse" />
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <AvatarUpload url={avatar} onUpload={onUpload} icon={<Camera size={16} />} />
        {avatar !== placeholder && (
          <Button variant="destructive" onClick={onDelete}>
            <Trash2 className="mr-2 size-4" /> Διαγραφή
          </Button>
        )}
      </div>
    </div>
  );
}

function DashSection({ id, show, children }) {
  return (
    <section id={id} className="mx-auto max-w-4xl scroll-mt-28">
      <AnimatePresence mode="popLayout" initial={false}>
        {show && (
          <motion.div
            initial={{ height:0, opacity:0 }}
            animate={{ height:"auto", opacity:1 }}
            exit={{ height:0, opacity:0 }}
            transition={{ duration:0.4, ease:[0.42,0,0.2,1] }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function HeroCard({ avatar, profile }) {
  return (
    <motion.section
      initial={{ opacity:0, y:32 }}
      animate={{ opacity:1, y:0 }}
      transition={{ duration:0.6, ease:[0.4,0,0.2,1] }}
      className={`relative overflow-hidden rounded-3xl shadow-2xl ${ringMono}`}
      style={glassBG}
    >
      <Blobs />
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="size-72 bg-white/5 rounded-full blur-2xl" />
      </div>

      <div className="relative grid gap-10 md:grid-cols-[auto_1fr] px-8 py-14">
        <motion.div whileHover={{ scale:1.05 }} className="justify-self-center md:justify-self-start">
          <div className="relative">
            <img
              src={avatar}
              alt="avatar"
              className="h-36 w-36 sm:h-44 sm:w-44 rounded-full object-cover border-[6px] border-gray-900 shadow-xl"
            />
            {!profile?.avatar_url && (
              <div className="absolute inset-0 grid place-items-center text-gray-600">
                <UserIcon className="h-20 w-20" />
              </div>
            )}
          </div>
        </motion.div>

        <div className="text-center md:text-left">
          <h1 className="text-4xl font-extrabold text-white">
            Καλωσήρθες,&nbsp;
            <span className="text-gray-300">{profile.full_name || "Χρήστη"}</span>
          </h1>

          <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-3">
            <InfoPill icon={Mail}  label={profile.email} />
            {profile.phone && <InfoPill icon={Phone} label={profile.phone} />}
            <InfoPill icon={BadgeCheck} label={profile.role} extra="capitalize" />
            {profile.created_at && (
              <InfoPill
                icon={Calendar}
                label={new Date(profile.created_at).toLocaleDateString("el-GR", {
                  day:"2-digit", month:"short", year:"numeric",
                })}
              />
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function InfoPill({ icon:Icon, label, extra="" }) {
  return (
    <Badge
      variant="secondary"
      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs bg-white/10 text-gray-200 ${extra}`}
    >
      <Icon className="size-4 text-gray-400" /> {label}
    </Badge>
  );
}

function GlassCard({ title, icon:Icon, children }) {
  return (
    <motion.div whileHover={{ scale:1.02 }} transition={{ duration:0.25 }}
      className={`relative rounded-3xl ${ringMono}`} style={glassBG}>
      <Blobs />
      <div className="pointer-events-none absolute inset-px rounded-[inherit] bg-gradient-to-br from-white/6 via-transparent to-transparent" />
      <Card className="relative bg-transparent shadow-none">
        <CardHeader className="relative pb-4">
          <CardTitle className="flex items-center gap-3 text-gray-200">
            <Icon className="size-6 text-gray-400" /> {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-6">{children}</CardContent>
      </Card>
    </motion.div>
  );
}
