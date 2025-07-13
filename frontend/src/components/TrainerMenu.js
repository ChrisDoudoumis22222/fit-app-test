/* TrainerMenu.js – desktop rail + mobile nav  (2025‑07‑19) */

"use client";

import { useState, useEffect }            from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence }        from "framer-motion";
import { supabase }                       from "../supabaseClient";
import { useAuth }                        from "../AuthProvider";
import {
  /* rail / settings */
  BarChart3, Briefcase, FileText, Globe, ShoppingBag,
  CalendarCheck, CreditCard, User as UserIcon, ImagePlus,
  ShieldCheck, Settings, LogOut,
  /* drawer close */
  X,
  /* bottom‑nav */
  Home, CalendarDays, Briefcase as BriefcaseIcon,
  Settings as SettingsIcon, MoreHorizontal,
} from "lucide-react";

const COLLAPSED = 72;
const EXPANDED  = 240;
const LOGO_SRC  = "https://peakvelocity.gr/wp-content/uploads/2024/03/Logo-chris-black-1.png";
document.documentElement.style.setProperty("--side-w", `${COLLAPSED}px`);

export default function TrainerMenu() {
  const { profile, profileLoaded } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();

  /* desktop hover + drawer */
  const [open,   setOpen]   = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [ready,  setReady]  = useState(false);

  /* sync var */
  const syncVar = (o) => {
    const w = window.innerWidth >= 1024 ? (o ? EXPANDED : COLLAPSED) : 0;
    document.documentElement.style.setProperty("--side-w", `${w}px`);
  };
  useEffect(() => syncVar(open), [open]);
  useEffect(() => { const h = () => { if (window.innerWidth < 1024) setOpen(false); syncVar(open); }; window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, [open]);
  useEffect(() => setReady(true), []);

  if (!profileLoaded || !profile || profile.role !== "trainer") return null;

  /* nav data */
  const navMain = [
    { id: "dash",  label: "Πίνακας",        href: "/trainer",            icon: BarChart3 },
    { id: "serv",  label: "Υπηρεσίες",      href: "/trainer/services",   icon: Briefcase },
    { id: "posts", label: "Αναρτήσεις",     href: "/trainer/posts",      icon: FileText  },
    { id: "allp",  label: "Όλες οι Αναρτ.", href: "/posts",              icon: Globe    },
    { id: "mark",  label: "Marketplace",    href: "/services",           icon: ShoppingBag },
    { id: "books", label: "Κρατήσεις",      href: "/trainer/bookings",   icon: CalendarCheck },
    { id: "pay",   label: "Πληρωμές",       href: "/trainer/payments",   icon: CreditCard },
  ];
  const navSettings = [
    { id: "profile",  label: "Πληροφορίες", href: "/trainer#profile",  icon: UserIcon },
    { id: "avatar",   label: "Avatar",      href: "/trainer#avatar",   icon: ImagePlus },
    { id: "bookings", label: "Κρατήσεις",   href: "/trainer/bookings", icon: CalendarCheck },
    { id: "payments", label: "Πληρωμές",    href: "/trainer/payments", icon: CreditCard },
    { id: "security", label: "Ασφάλεια",    href: "/trainer#security", icon: ShieldCheck },
  ];

  /* bottom nav buttons */
  const bottomNav = [
    { href: "/trainer",           label: "Επισκόπηση", icon: Home },
    { href: "/trainer/services",  label: "Υπηρεσίες",  icon: BriefcaseIcon },
    { href: "/trainer/bookings",  label: "Κρατήσεις",  icon: CalendarDays },
    { href: "/trainer#profile",   label: "Ρυθμίσεις",  icon: SettingsIcon },
    { href: "drawer",             label: "Περισσότερα",icon: MoreHorizontal },
  ];

  /* accurate route for active state */
  const route = location.pathname + location.hash;

  const logout = async () => { await supabase.auth.signOut(); navigate("/"); };

  return (
    <>
      {/* -------- DESKTOP RAIL -------- */}
      <DesktopRail
        open={open} setOpen={setOpen} ready={ready}
        navMain={navMain} navSettings={navSettings}
        active={location.pathname} profile={profile} logout={logout}
      />

      {/* -------- MOBILE TOP BAR (logo + avatar, no hamburger) -------- */}
      <motion.header
        initial={false}
        animate={{ opacity: drawer ? 0 : 1, pointerEvents: drawer ? "none" : "auto" }}
        className="lg:hidden fixed inset-x-0 top-0 z-40 flex items-center
                   h-14 px-4 bg-black/80 backdrop-blur ring-1 ring-white/10 transition-opacity"
      >
        {/* invisible spacer keeps logo centered */}
        <div className="w-10" />

        <div className="flex-1 flex justify-center">
          <img src={LOGO_SRC} alt="logo" className="h-10 w-10 rounded-xl bg-white object-contain p-1" />
        </div>

        <img src={profile.avatar_url || undefined} alt="avatar" className="h-9 w-9 rounded-full object-cover bg-white" />
      </motion.header>

      {/* -------- MOBILE DRAWER -------- */}
      <MobileDrawer
        open={drawer} setOpen={setDrawer}
        navMain={navMain} navSettings={navSettings}
        activePath={location.pathname} profile={profile} logout={logout}
      />

      {/* -------- MOBILE BOTTOM NAV -------- */}
      <BottomNav
        items={bottomNav}
        route={route}
        drawerOpen={drawer}
        openDrawer={() => setDrawer(true)}
      />
    </>
  );
}

/* ------------- Desktop rail helpers (unchanged) ------------- */
function DesktopRail({ open, setOpen, ready, navMain, navSettings, active, profile, logout }) {
  return (
    <motion.aside
      initial={{ opacity: 0, width: COLLAPSED }}
      animate={{ opacity: ready ? 1 : 0, width: open ? EXPANDED : COLLAPSED }}
      whileHover={{ width: EXPANDED }}
      transition={{
        opacity: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
        width:   { type: "spring", stiffness: 260, damping: 26 },
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className="hidden lg:flex fixed top-0 left-0 z-40 h-screen flex-col justify-between
                 overflow-hidden bg-gradient-to-b from-black/80 to-black/60 backdrop-blur-xl
                 ring-1 ring-white/10 shadow-2xl"
    >
      <div className="flex flex-col gap-6 p-4">
        <Brand open={open} />
        <NavList items={navMain}     open={open} active={active} />
        <hr className="my-3 border-gray-700/60" />
        {open && <p className="px-4 pt-1 pb-2 text-[11px] uppercase tracking-wider text-gray-500">Ρυθμίσεις</p>}
        <NavList items={navSettings} open={open} active={active} />
      </div>
      <FooterBlock open={open} profile={profile} onLogout={logout} />
    </motion.aside>
  );
}

const Brand = ({ open }) => (
  <div className="flex items-center gap-3">
    <img src={LOGO_SRC} alt="logo" className="h-10 w-10 rounded-xl bg-white object-contain p-1" />
    <AnimatePresence>
      {open && (
        <motion.span
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.2 }}
          className="max-w-[110px] truncate text-xl font-bold text-white"
        >
          Trainer<span className="font-light text-gray-400">Hub</span>
        </motion.span>
      )}
    </AnimatePresence>
  </div>
);

function NavList({ items, open, active }) {
  return (
    <ul className="space-y-1">
      {items.map(({ id, label, href, icon: Icon }) => {
        const isActive = active === href;
        const layout   = open ? "justify-start px-4" : "justify-center px-0";
        return (
          <li key={id}>
            <Link
              to={href}
              className={`flex items-center gap-4 w-full rounded-xl py-3 ${layout}
                          ${isActive ? "bg-white text-black shadow-inner" : "text-gray-300 hover:bg-white/10"}
                          transition-colors`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-black" : ""}`} />
              <AnimatePresence>
                {open && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                    className="truncate text-sm font-medium"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function FooterBlock({ open, profile, onLogout }) {
  return (
    <div className="flex items-center gap-3 p-4 hover:bg-white/10 cursor-pointer">
      <img src={profile.avatar_url || undefined} alt="avatar" className="h-9 w-9 rounded-full object-cover bg-white" />
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
            className="min-w-0 text-sm text-white"
          >
            <p className="truncate font-medium">{profile.full_name || "Trainer"}</p>
            <p className="truncate text-xs text-gray-400">{profile.email}</p>
          </motion.div>
        )}
      </AnimatePresence>
      {open && (
        <button onClick={onLogout} className="ml-auto rounded-lg p-2 hover:bg-white/10">
          <LogOut className="h-5 w-5 text-red-400" />
        </button>
      )}
    </div>
  );
}

/* ------------- Mobile drawer ------------- */
function MobileDrawer({ open, setOpen, navMain, navSettings, activePath, profile, logout }) {
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 0.55 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <motion.aside
        key="drawer"
        initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }}
        transition={{ type: "spring", damping: 24 }}
        className="fixed inset-y-0 left-0 z-50 w-[76vw] max-w-[320px] flex flex-col
                   bg-gradient-to-b from-black/90 to-black/70 border-r border-gray-800 shadow-2xl"
      >
        <DrawerHeader close={() => setOpen(false)} />
        <div className="flex-1 overflow-y-auto p-4">
          <Section>Μενού</Section>
          <DrawerLinks items={navMain} active={activePath} close={() => setOpen(false)} />
          <div className="my-5 h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent" />
          <Section>Ρυθμίσεις</Section>
          <DrawerLinks items={navSettings} active={activePath} close={() => setOpen(false)} />
        </div>
        <DrawerFooter profile={profile} close={() => setOpen(false)} logout={logout} />
      </motion.aside>
    </AnimatePresence>
  );
}

const Section = ({ children }) => <p className="mb-3 mt-1 px-2 text-[12px] uppercase tracking-wider text-gray-500">{children}</p>;

function DrawerHeader({ close }) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-800">
      <div className="flex items-center gap-3">
        <img src={LOGO_SRC} alt="logo" className="h-10 w-10 rounded-xl bg-white object-contain p-1" />
        <span className="text-lg font-bold text-white">Trainer<span className="font-light text-gray-400">Hub</span></span>
      </div>
      <button onClick={close} className="rounded-lg p-2 text-gray-400 hover:text-white hover:bg-white/10">
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

function DrawerLinks({ items, active, close }) {
  return (
    <ul className="space-y-1">
      {items.map(({ id, label, href, icon: Icon }) => (
        <li key={id}>
          <Link
            to={href}
            onClick={close}
            className={`flex min-h-11 items-center gap-3 rounded-xl px-4 text-sm font-medium
                        ${active === href ? "bg-white text-black" : "text-gray-300 hover:bg-gray-800"}`}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function DrawerFooter({ profile, close, logout }) {
  return (
    <div className="space-y-4 bg-gradient-to-t from-black/90 to-black/70 p-4 shadow-inner">
      <div className="flex items-center gap-3">
        <img src={profile.avatar_url || undefined} alt="avatar" className="h-11 w-11 rounded-full object-cover bg-white" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{profile.full_name || "Trainer"}</p>
          <p className="truncate text-xs text-gray-400">{profile.email}</p>
        </div>
      </div>
      <Link to="/trainer#profile" onClick={close} className="flex items-center gap-3 rounded-xl px-4 py-3 text-gray-300 hover:bg-gray-800">
        <Settings className="h-5 w-5" /> Ρυθμίσεις προφίλ
      </Link>
      <button onClick={() => { logout(); close(); }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-800/20 px-4 py-3 text-red-300 hover:bg-red-700/30">
        <LogOut className="h-5 w-5" /> Αποσύνδεση
      </button>
    </div>
  );
}

/* ------------- Bottom nav ------------- */
function NavBtn({ href, label, icon: Icon, active, onClick }) {
  const cls = active ? "text-indigo-400" : "text-white/60 hover:bg-white/10";
  const base = "flex flex-1 flex-col items-center justify-center gap-1 py-3";
  const body = (<><Icon className="h-6 w-6" /><span className="text-xs font-medium">{label}</span></>);

  return href ? (
    <Link to={href} className={`${base} ${cls}`}>{body}</Link>
  ) : (
    <button onClick={onClick} className={`${base} ${cls}`}>{body}</button>
  );
}

function BottomNav({ items, route, drawerOpen, openDrawer }) {
  return (
    <motion.footer
      initial={false}
      animate={{ opacity: drawerOpen ? 0 : 1, pointerEvents: drawerOpen ? "none" : "auto" }}
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 flex border-t border-white/10 bg-black/90 backdrop-blur"
    >
      {items.map(({ href, label, icon }) => (
        <NavBtn
          key={label}
          href={href !== "drawer" ? href : null}
          label={label}
          icon={icon}
          active={href !== "drawer" && route === href}
          onClick={href === "drawer" ? openDrawer : undefined}
        />
      ))}
    </motion.footer>
  );
}
