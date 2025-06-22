/*  TrainerMenu.js – black-glass side-rail (rev 2025-06-22 + Payments)
    ------------------------------------------------------------------
    • Collapsed 72 px → Expanded 240 px
    • Now includes “Πληρωμές” (/trainer/payments) in main group
*/

"use client";

import { useState, useEffect }            from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence }        from "framer-motion";
import { supabase }                       from "../supabaseClient";
import { useAuth }                        from "../AuthProvider";

import {
  /* main nav */
  BarChart3,
  Briefcase,
  FileText,
  Globe,
  ShoppingBag,
  CalendarCheck,
  CreditCard,
  /* settings */
  User as UserIcon,
  ImagePlus,
  ShieldCheck,
  Settings,
  /* misc */
  LogOut,
  Menu,
  X,
} from "lucide-react";

/* ─── constants ─── */
const COLLAPSED = 72;
const EXPANDED  = 240;
const LOGO_SRC  =
  "https://peakvelocity.gr/wp-content/uploads/2024/03/Logo-chris-black-1.png";

/* expose rail width so pages can do pl-[var(--side-w)] */
document.documentElement.style.setProperty("--side-w", `${COLLAPSED}px`);

export default function TrainerMenu() {
  const { profile, profileLoaded } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  /* UI state */
  const [open,   setOpen]   = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [ready,  setReady]  = useState(false);

  /* sync CSS var */
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

  /* guard */
  if (!profileLoaded || !profile || profile.role !== "trainer") return null;

  /* navigation groups */
  const navMain = [
    { id: "dash",  label: "Πίνακας",        href: "/trainer",            icon: BarChart3 },
    { id: "serv",  label: "Υπηρεσίες",      href: "/trainer/services",   icon: Briefcase },
    { id: "posts", label: "Αναρτήσεις",     href: "/trainer/posts",      icon: FileText  },
    { id: "allp",  label: "Όλες οι Αναρτ.", href: "/posts",              icon: Globe    },
    { id: "mark",  label: "Marketplace",    href: "/services",           icon: ShoppingBag },
    { id: "books", label: "Κρατήσεις",      href: "/trainer/bookings",   icon: CalendarCheck },
    { id: "pay",   label: "Πληρωμές",       href: "/trainer/payments",   icon: CreditCard },  /* NEW */
  ];
  const navSettings = [
    { id: "profile",  label: "Πληροφορίες", href: "/trainer#profile",  icon: UserIcon    },
    { id: "avatar",   label: "Avatar",      href: "/trainer#avatar",   icon: ImagePlus   },
    { id: "bookings", label: "Κρατήσεις",   href: "/trainer/bookings", icon: CalendarCheck },
    { id: "payments", label: "Πληρωμές",    href: "/trainer/payments", icon: CreditCard  }, /* NEW */
    { id: "security", label: "Ασφάλεια",    href: "/trainer#security", icon: ShieldCheck },
  ];

  const activePath = location.pathname;

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  /* ------------- desktop rail ------------- */
  return (
    <>
      {/* rail */}
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
        <div className="flex flex-col gap-6 p-4">
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

      {/* mobile bar + drawer */}
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

/* ------------ sub-components ------------ */

function Brand({ open }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src={LOGO_SRC}
        alt="logo"
        className="h-10 w-10 rounded-xl bg-white object-contain p-1"
      />
      <AnimatePresence initial={false}>
        {open && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
            className="max-w-[110px] truncate text-xl font-bold tracking-tight text-white"
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
                            : "text-gray-300 hover:bg-white/10"}`}
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
            className="min-w-0 text-sm leading-tight text-white"
          >
            <p className="truncate font-medium">
              {profile.full_name || "Trainer"}
            </p>
            <p className="truncate text-xs text-gray-400">{profile.email}</p>
          </motion.div>
        )}
      </AnimatePresence>
      {open && (
        <button
          onClick={onLogout}
          title="Αποσύνδεση"
          className="ml-auto rounded-lg p-2 hover:bg-white/10"
        >
          <LogOut className="h-4 w-4 text-red-400" />
        </button>
      )}
    </div>
  );
}

/* ------------ mobile bar & drawer ------------ */

function MobileBar({
  drawer,
  setDrawer,
  profile,
  navMain,
  navSettings,
  active,
  logout,
}) { /* …unchanged… */ }

/* DrawerHeader, DrawerLinks, DrawerFooter – unchanged except ↓ */

function DrawerFooter({ profile, close, logout }) {
  return (
    <div className="mt-auto space-y-4 border-t border-gray-800 p-4">
      <div className="flex items-center gap-3">
        <img
          src={profile.avatar_url || undefined}
          alt="avatar"
          className="h-10 w-10 rounded-full object-cover bg-white"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {profile.full_name || "Trainer"}
          </p>
          <p className="truncate text-xs text-gray-400">{profile.email}</p>
        </div>
      </div>

      <Link
        to="/trainer#profile"
        onClick={close}
        className="flex items-center gap-3 rounded-xl px-4 py-3 text-gray-300 hover:bg-gray-800"
      >
        <Settings className="h-5 w-5" /> Ρυθμίσεις προφίλ
      </Link>

      <Link
        to="/trainer/bookings"
        onClick={close}
        className="flex items-center gap-3 rounded-xl px-4 py-3 text-gray-300 hover:bg-gray-800"
      >
        <CalendarCheck className="h-5 w-5" /> Κρατήσεις
      </Link>

      {/* NEW payments link */}
      <Link
        to="/trainer/payments"
        onClick={close}
        className="flex items-center gap-3 rounded-xl px-4 py-3 text-gray-300 hover:bg-gray-800"
      >
        <CreditCard className="h-5 w-5" /> Πληρωμές
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
