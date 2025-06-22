/*  TrainerMenu.js – Black-Glass Side-Rail (matches UserMenu v2.3)
    ----------------------------------------------------------------
    • Collapsed 72 px → Expanded 240 px on hover
    • Mobile top bar + slide-in drawer
*/

"use client";

import { useState, useEffect }              from "react";
import { Link, useLocation, useNavigate }   from "react-router-dom";
import { motion, AnimatePresence }          from "framer-motion";
import { supabase }                         from "../supabaseClient";
import { useAuth }                          from "../AuthProvider";

import {
  /* main nav */
  BarChart3,
  Briefcase,
  FileText,
  Globe,
  ShoppingBag,
  /* settings / misc */
  User as UserIcon,
  ImagePlus,
  Shield,
  Settings,
  LogOut,
  CalendarCheck,
  /* mobile */
  Menu,
  X,
} from "lucide-react";

/* ─── constants ─── */
const COLLAPSED = 72;
const EXPANDED  = 240;
const LOGO_SRC  =
  "https://peakvelocity.gr/wp-content/uploads/2024/03/Logo-chris-black-1.png";

/* expose rail width as CSS var so page content can do pl-[var(--side-w)] */
document.documentElement.style.setProperty("--side-w", `${COLLAPSED}px`);

export default function TrainerMenu() {
  const { profile, profileLoaded } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [open,   setOpen]   = useState(false); // desktop hover expansion
  const [drawer, setDrawer] = useState(false); // mobile slide-in
  const [ready,  setReady]  = useState(false); // fade-in on mount

  /* keep CSS var in sync (desktop only) */
  const syncVar = (isOpen) => {
    const w =
      window.innerWidth >= 1024 ? (isOpen ? EXPANDED : COLLAPSED) : 0;
    document.documentElement.style.setProperty("--side-w", `${w}px`);
  };
  useEffect(() => syncVar(open), [open]);
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 1024) setOpen(false);
      syncVar(open);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open]);
  useEffect(() => setReady(true), []);

  /* guard: only trainers */
  if (!profileLoaded || !profile || profile.role !== "trainer") return null;

  /* nav definitions */
  const navMain = [
    { id: "dash",  label: "Πίνακας",      href: "/trainer",          icon: BarChart3 },
    { id: "serv",  label: "Υπηρεσίες",    href: "/trainer/services", icon: Briefcase },
    { id: "posts", label: "Αναρτήσεις",   href: "/trainer/posts",    icon: FileText  },
    { id: "allp",  label: "Όλες οι Αναρτ.", href: "/posts",            icon: Globe    },
    { id: "mark",  label: "Marketplace",  href: "/services",         icon: ShoppingBag },
  ];
  const navSettings = [
    { id: "profile",  label: "Πληροφορίες", href: "/trainer#profile",  icon: UserIcon      },
    { id: "avatar",   label: "Avatar",      href: "/trainer#avatar",   icon: ImagePlus     },
    { id: "bookings", label: "Κρατήσεις",   href: "/trainer#bookings", icon: CalendarCheck },
    { id: "security", label: "Ασφάλεια",    href: "/trainer#security", icon: Shield        },
  ];

  const activePath = `${location.pathname}${location.hash}`;
  const logout     = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  /* ───────── Desktop rail ───────── */
  return (
    <>
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
        className="hidden lg:flex fixed top-0 left-0 z-40 h-screen
                   flex-col justify-between overflow-hidden
                   bg-gradient-to-b from-black/80 to-black/60
                   backdrop-blur-xl ring-1 ring-white/10 shadow-2xl"
      >
        {/* brand + nav groups */}
        <div className="p-4 flex flex-col gap-6">
          <Brand open={open} />

          <NavList items={navMain}     open={open} active={activePath} />
          <hr className="my-3 border-gray-700/60" />
          {open && (
            <p className="px-4 pt-1 pb-2 text-[11px] uppercase tracking-wider text-gray-500">
              Ρυθμίσεις
            </p>
          )}
          <NavList items={navSettings} open={open} active={activePath} />
        </div>

        <FooterBlock open={open} profile={profile} onLogout={logout} />
      </motion.aside>

      {/* ───────── Mobile top-bar & drawer ───────── */}
      <MobileBar
        drawer={drawer}
        setDrawer={setDrawer}
        profile={profile}
        navMain={navMain}
        navSettings={navSettings}
        active={activePath}
        logout={logout}
      />
    </>
  );
}

/* ─────────── sub-components ─────────── */

function Brand({ open }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src={LOGO_SRC}
        alt="logo"
        className="h-10 w-10 object-contain rounded-xl bg-white p-1"
      />
      <AnimatePresence initial={false}>
        {open && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
            className="text-xl font-bold tracking-tight text-white max-w-[110px] truncate"
          >
            Trainer<span className="font-light text-gray-400">Hub</span>
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

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
                          transition-colors
                          ${isActive
                            ? "bg-white text-black shadow-inner"
                            : "hover:bg-white/10 text-gray-300"}`}
            >
              <Icon
                className={`h-5 w-5 flex-shrink-0 ${
                  isActive ? "text-black" : "text-gray-300"
                }`}
              />
              <AnimatePresence initial={false}>
                {open && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm font-medium truncate"
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
      <img
        src={profile.avatar_url || undefined}
        alt="avatar"
        className="h-9 w-9 rounded-full object-cover bg-white"
      />
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
            className="min-w-0 text-white text-sm leading-tight"
          >
            <p className="font-medium truncate">
              {profile.full_name || "Trainer"}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {profile.email}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      {open && (
        <button
          onClick={onLogout}
          title="Αποσύνδεση"
          className="ml-auto p-2 rounded-lg hover:bg-white/10"
        >
          <LogOut className="h-4 w-4 text-red-400" />
        </button>
      )}
    </div>
  );
}

/* ───────── Mobile bar + drawer ───────── */

function MobileBar({
  drawer,
  setDrawer,
  profile,
  navMain,
  navSettings,
  active,
  logout,
}) {
  return (
    <>
      {/* top-bar (mobile only) */}
      <header className="lg:hidden fixed inset-x-0 top-0 z-40 h-14 flex items-center justify-between bg-black/90 backdrop-blur-md px-4">
        <button
          onClick={() => setDrawer(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-700 bg-gray-900 text-white"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <img
            src={LOGO_SRC}
            alt="logo"
            className="h-6 w-6 object-contain rounded-md bg-white p-0.5"
          />
          <span className="text-xl font-semibold text-white">
            Trainer<span className="font-light text-gray-400">Hub</span>
          </span>
        </div>

        <img
          src={profile.avatar_url || undefined}
          alt="avatar"
          className="h-9 w-9 rounded-full object-cover bg-white"
        />
      </header>

      {/* slide-in drawer */}
      {drawer && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() => setDrawer(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 max-w-full flex flex-col bg-black border-r border-gray-800 overflow-y-auto">
            <DrawerHeader close={() => setDrawer(false)} />
            <DrawerLinks
              items={navMain}
              active={active}
              close={() => setDrawer(false)}
            />
            <hr className="my-2 border-gray-700/60" />
            <p className="px-6 pt-1 pb-2 text-[11px] uppercase tracking-wider text-gray-500">
              Ρυθμίσεις
            </p>
            <DrawerLinks
              items={navSettings}
              active={active}
              close={() => setDrawer(false)}
            />
            <DrawerFooter
              profile={profile}
              close={() => setDrawer(false)}
              logout={logout}
            />
          </div>
        </>
      )}
    </>
  );
}

function DrawerHeader({ close }) {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <img
          src={LOGO_SRC}
          alt="logo"
          className="h-9 w-9 object-contain rounded-xl bg-white p-1"
        />
        <span className="text-lg font-bold text-white">Trainer Hub</span>
      </div>
      <button
        onClick={close}
        className="h-10 w-10 flex items-center justify-center rounded-xl border border-gray-700 bg-gray-900 text-gray-400"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

function DrawerLinks({ items, active, close }) {
  return (
    <ul className="space-y-1 px-2">
      {items.map(({ id, label, href, icon: Icon }) => {
        const isActive = active === href;
        return (
          <li key={id}>
            <Link
              to={href}
              onClick={close}
              className={`flex items-center gap-4 rounded-xl px-4 py-3
                           ${isActive
                             ? "bg-white text-black"
                             : "text-gray-300 hover:bg-gray-800"}`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function DrawerFooter({ profile, close, logout }) {
  return (
    <div className="mt-auto p-4 space-y-4 border-t border-gray-800">
      <div className="flex items-center gap-3">
        <img
          src={profile.avatar_url || undefined}
          alt="avatar"
          className="h-10 w-10 rounded-full object-cover bg-white"
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {profile.full_name || "Trainer"}
          </p>
          <p className="text-xs text-gray-400 truncate">{profile.email}</p>
        </div>
      </div>

      <Link
        to="/trainer#profile"
        onClick={close}
        className="flex items-center gap-3 rounded-xl px-4 py-3 text-gray-300 hover:bg-gray-800"
      >
        <Settings className="h-5 w-5" /> Ρυθμίσεις προφίλ
      </Link>
      <button
        onClick={() => {
          logout();
          close();
        }}
        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-red-400 hover:bg-red-950/30"
      >
        <LogOut className="h-5 w-5" /> Αποσύνδεση
      </button>
    </div>
  );
}
