/* TrainerMenu.js – desktop rail + mobile nav + TrainerSearch overlay (no hardcoded search)
   -------------------------------------------------------------------------------------- */

"use client";

import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import TrainerSearch from "../components/TrainerSearch";

import {
  /* rail / settings */
  BarChart3, FileText, Globe, ShoppingBag,
  CalendarCheck, CreditCard, User as UserIcon, ImagePlus,
  ShieldCheck, Settings, LogOut,
  /* drawer close */
  X,
  /* bottom-nav */
  Home, CalendarClock, CalendarDays,
  Settings as SettingsIcon, MoreHorizontal,
  /* search */
  Search,
  /* NEW: FAQ icon */
  CircleHelp,
} from "lucide-react";

/* -------------------------------- Helpers -------------------------------- */

const normalizePath = (p = "") =>
  p && p !== "/" && p.endsWith("/") ? p.slice(0, -1) : p;

const splitHref = (href = "") => {
  const [p, h] = href.split("#");
  return { path: normalizePath(p || ""), hash: h ? `#${h}` : "" };
};

/** Exact matcher for desktop rail + drawer (hash must match if provided in href) */
const isActiveRoute = (activePath, activeHash, href) => {
  const { path, hash } = splitHref(href);
  if (!path) return false;
  if (normalizePath(activePath) !== path) return false;
  return hash ? activeHash === hash : true;
};

/** Bottom-nav rule: items without a hash are active only when no hash is present.
 *  Items with a hash for /trainer are active for ANY sub-hash of /trainer.
 */
const isActiveBottom = (activePath, activeHash, href) => {
  const { path, hash } = splitHref(href);
  if (!path) return false;
  if (normalizePath(activePath) !== path) return false;
  if (!hash) return activeHash === "";               // e.g., "/trainer" (Home) only with no hash
  if (path === "/trainer") return activeHash.startsWith("#"); // any subpage under /trainer
  return activeHash === hash;                        // default exact for other paths (if any)
};

/* ------------------------------------------------------------------ */
/*                              Avatars                               */
/* ------------------------------------------------------------------ */
const AVATAR_PLACEHOLDER = "/placeholder.svg?height=120&width=120&text=Avatar";

const safeAvatar = (url) =>
  url ? `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}` : AVATAR_PLACEHOLDER;

function Avatar({ url, className = "h-9 w-9", ring = false }) {
  const ringCls = ring ? "ring-2 ring-white/20 shadow-lg" : "";
  if (url) {
    return (
      <img
        src={safeAvatar(url)}
        alt="avatar"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = AVATAR_PLACEHOLDER;
        }}
        className={`${className} rounded-full object-cover bg-white ${ringCls}`}
      />
    );
  }
  return (
    <div className={`${className} rounded-full bg-white/10 flex items-center justify-center ${ringCls}`}>
      <UserIcon className="h-4 w-4 text-gray-400" />
    </div>
  );
}

/* ------------------------------------------------------------------ */

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

  /* search overlay */
  const [searchOpen, setSearchOpen] = useState(false);

  /* sync var */
  const syncVar = (o) => {
    const w = window.innerWidth >= 1024 ? (o ? EXPANDED : COLLAPSED) : 0;
    document.documentElement.style.setProperty("--side-w", `${w}px`);
  };
  useEffect(() => syncVar(open), [open]);
  useEffect(() => {
    const h = () => { if (window.innerWidth < 1024) setOpen(false); syncVar(open); };
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [open]);
  useEffect(() => setReady(true), []);

  if (!profileLoaded || !profile || profile.role !== "trainer") return null;

  /* nav data (kept for menus only) */
  const navMain = [
    { id: "dash",     label: "Πίνακας",        href: "/trainer",            icon: BarChart3 },
    { id: "schedule", label: "Πρόγραμμα",      href: "/trainer/schedule",   icon: CalendarDays },
    { id: "posts",    label: "Αναρτήσεις",     href: "/trainer/posts",      icon: FileText  },
    { id: "allp",     label: "Όλες οι Αναρτ.", href: "/posts",              icon: Globe    },
    { id: "mark",     label: "Προπονητές",     href: "/services",           icon: ShoppingBag },
    { id: "books",    label: "Κρατήσεις",      href: "/trainer/bookings",   icon: CalendarCheck },
    { id: "pay",      label: "Πληρωμές",       href: "/trainer/payments",   icon: CreditCard },
    /* NEW: FAQ entry */
    { id: "faq",      label: "FAQ",            href: "/faq",                icon: CircleHelp },
  ];

  const navSettings = [
    { id: "profile",  label: "Πληροφορίες", href: "/trainer#dashboard", icon: UserIcon },
    { id: "avatar",   label: "Avatar",      href: "/trainer#avatar",    icon: ImagePlus },
    { id: "payments", label: "Πληρωμές",    href: "/trainer/payments",  icon: CreditCard },
    { id: "security", label: "Ασφάλεια",    href: "/trainer#security",  icon: ShieldCheck },
  ];

  /* bottom nav buttons (mobile) */
  const bottomNav = [
    { href: "/trainer",           label: "Αρχική",    icon: Home },
    { href: "/trainer/schedule",  label: "Πρόγραμμα", icon: CalendarClock },
    { href: "/trainer/bookings",  label: "Κρατήσεις", icon: CalendarDays },
    { href: "/faq",               label: "FAQ",       icon: CircleHelp }, // NEW: FAQ on bottom nav
    { href: "/trainer#dashboard", label: "Ρυθμίσεις", icon: SettingsIcon },
    // Keep "drawer" as an optional sixth item, or remove if you prefer five buttons:
    // { href: "drawer",             label: "Περισσότερα", icon: MoreHorizontal },
  ];

  /* active route pieces */
  const activePath = location.pathname;
  const activeHash = location.hash || "";
  const route = activePath + activeHash;

  const logout = async () => { await supabase.auth.signOut(); navigate("/"); };

  const openOverlay = () => setSearchOpen(true);

  return (
    <>
      {/* -------- DESKTOP RAIL -------- */}
      <DesktopRail
        open={open} setOpen={setOpen} ready={ready}
        navMain={navMain} navSettings={navSettings}
        activePath={activePath} activeHash={activeHash}
        profile={profile} logout={logout}
        onOpenSearch={openOverlay}
      />

      {/* -------- MOBILE TOP BAR (search icon + logo + avatar) -------- */}
      <motion.header
        initial={false}
        animate={{ opacity: drawer ? 0 : 1, pointerEvents: drawer ? "none" : "auto" }}
        className="lg:hidden fixed inset-x-0 top-0 z-40 flex items-center
                   px-4 bg-black/60 backdrop-blur-xl ring-1 ring-white/10 transition-opacity"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          height: "calc(4rem + env(safe-area-inset-top))",
        }}
      >
        <button
          onClick={openOverlay}
          className="rounded-lg p-2 text-gray-300 hover:text-white hover:bg-white/10"
          aria-label="Αναζήτηση"
        >
          <Search className="h-5 w-5" />
        </button>

        <div className="flex-1 flex justify-center">
          <img src={LOGO_SRC} alt="logo" className="h-10 w-10 rounded-xl bg-white object-contain p-1" />
        </div>
        <Avatar url={profile.avatar_url} className="h-9 w-9" />
      </motion.header>

      {/* -------- MOBILE SPACER (for top bar) -------- */}
      <div className="lg:hidden" style={{ height: "calc(4.75rem + env(safe-area-inset-top))" }} />

      {/* -------- SEARCH OVERLAY (mobile & desktop) -------- */}
      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      {/* -------- MOBILE DRAWER -------- */}
      <MobileDrawer
        open={drawer} setOpen={setDrawer}
        navMain={navMain} navSettings={navSettings}
        activePath={activePath} activeHash={activeHash}
        profile={profile} logout={logout}
      />

      {/* -------- MOBILE BOTTOM NAV -------- */}
      <BottomNav
        items={bottomNav}
        path={activePath}
        hash={activeHash}
        route={route}
        drawerOpen={drawer}
        openDrawer={() => setDrawer(true)}
      />
    </>
  );
}

/* ------------- Desktop rail helpers ------------- */
function DesktopRail({
  open, setOpen, ready,
  navMain, navSettings,
  activePath, activeHash,
  profile, logout,
  onOpenSearch,
}) {
  return (
    <motion.aside
      initial={{ opacity: 0, width: COLLAPSED }}
      animate={{ opacity: ready ? 1 : 0, width: open ? EXPANDED : COLLAPSED }}
      whileHover={{ width: EXPANDED }}
      transition={{
        opacity: { duration: 1.0, ease: [0.4, 0, 0.2, 1] },
        width:   { type: "spring", stiffness: 120, damping: 20, mass: 1.1 },
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className="hidden lg:flex fixed top-0 left-0 z-40 h-screen flex-col justify-between
                 overflow-hidden bg-gradient-to-b from-black/80 to-black/60 backdrop-blur-xl
                 ring-1 ring-white/10 shadow-2xl"
    >
      <div className="flex flex-col gap-4 p-4">
        <Brand open={open} />
        <DesktopSearch open={open} onOpen={onOpenSearch} />
        <NavList items={navMain}     open={open} activePath={activePath} activeHash={activeHash} />
        <hr className="my-3 border-gray-700/60" />
        {open && <p className="px-4 pt-1 pb-2 text-[11px] uppercase tracking-wider text-gray-500">Ρυθμίσεις</p>}
        <NavList items={navSettings} open={open} activePath={activePath} activeHash={activeHash} />
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
          transition={{ duration: 0.3 }}
          className="max-w-[110px] truncate text-xl font-bold text-white"
        >
          Trainer<span className="font-light text-gray-400">Hub</span>
        </motion.span>
      )}
    </AnimatePresence>
  </div>
);

function DesktopSearch({ open, onOpen }) {
  if (!open) {
    return (
      <div className="flex justify-center">
        <button
          onClick={onOpen}
          className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Αναζήτηση"
        >
          <Search className="h-5 w-5 text-white" />
        </button>
      </div>
    );
  }
  return (
    <div className="px-2">
      <button
        onClick={onOpen}
        className="w-full flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2
                   hover:bg-white/15 transition-colors text-left"
        aria-label="Άνοιγμα αναζήτησης"
      >
        <Search className="h-5 w-5 text-gray-200" />
        <span className="text-sm text-gray-300">Ψάξε σελίδες…</span>
      </button>
    </div>
  );
}

function NavList({ items, open, activePath, activeHash }) {
  return (
    <ul className="space-y-1">
      {items.map(({ id, label, href, icon: Icon }) => {
        const active = isActiveRoute(activePath, activeHash, href);
        const layout = open ? "justify-start px-4" : "justify-center px-0";
        return (
          <li key={id}>
            <Link
              to={href}
              className={`flex items-center gap-4 w-full rounded-xl py-3 ${layout}
                          ${active ? "bg-white text-black shadow-inner" : "text-gray-300 hover:bg-white/10"}
                          transition-colors`}
            >
              <Icon className={`h-5 w-5 ${active ? "text-black" : ""}`} />
              <AnimatePresence>
                {open && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.3 }}
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
      <Avatar url={profile.avatar_url} className="h-9 w-9" />

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.3 }}
            className="min-w-0 text-sm text-white"
          >
            <p className="truncate font-medium">{profile.full_name || "Trainer"}</p>
            <p className="truncate text-xs text-gray-400">{profile.email}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {open && (
        <button onClick={onLogout} className="ml-auto rounded-lg p-2 hover:bg-white/10">
          <LogOut className="h-4 w-4 text-red-400" />
        </button>
      )}
    </div>
  );
}

/* ----------------- Search Overlay (uses TrainerSearch) ----------------- */
function SearchOverlay({ open, onClose }) {
  const navigate = useNavigate();
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="search-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        key="search-panel"
        initial={{ y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -24, opacity: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 20 }}
        className="fixed inset-x-3 top-[calc(8vh+env(safe-area-inset-top))] z-[61] mx-auto max-w-xl
                   rounded-2xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl shadow-2xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-gray-200">
            <Search className="h-5 w-5" />
            <span className="text-sm">Αναζήτηση σελίδων</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 hover:text-white hover:bg-white/10"
            aria-label="Κλείσιμο"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* TrainerSearch panel (no hardcoded pages) */}
        <TrainerSearch
          ui="panel"
          onSelectHref={(href) => {
            onClose();
            navigate(href);
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}

/* ------------- Mobile drawer ------------- */
function MobileDrawer({ open, setOpen, navMain, navSettings, activePath, activeHash, profile, logout }) {
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 0.55 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="fixed inset-0 z-40 bg-black backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <motion.aside
        key="drawer"
        initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }}
        transition={{ type: "spring", stiffness: 110, damping: 20, mass: 1.1 }}
        className="fixed inset-y-0 left-0 z-50 w-[76vw] max-w-[320px] flex flex-col
                   bg-gradient-to-b from-black/90 to-black/70 border-r border-gray-800 shadow-2xl"
      >
        <DrawerHeader close={() => setOpen(false)} />
        <div className="flex-1 overflow-y-auto p-4">
          <Section>Μενού</Section>
          <DrawerLinks items={navMain} activePath={activePath} activeHash={activeHash} close={() => setOpen(false)} />
          <div className="my-5 h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent" />
          <Section>Ρυθμίσεις</Section>
          <DrawerLinks items={navSettings} activePath={activePath} activeHash={activeHash} close={() => setOpen(false)} />
        </div>
        <DrawerFooter profile={profile} close={() => setOpen(false)} logout={logout} />
      </motion.aside>
    </AnimatePresence>
  );
}

const Section = ({ children }) => (
  <p className="mb-3 mt-1 px-2 text-[12px] uppercase tracking-wider text-gray-500">{children}</p>
);

function DrawerHeader({ close }) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-800">
      <div className="flex items-center gap-3">
        <img src={LOGO_SRC} alt="logo" className="h-10 w-10 rounded-xl bg-white object-contain p-1" />
        <span className="text-lg font-bold text-white">
          Trainer<span className="font-light text-gray-400">Hub</span>
        </span>
      </div>
      <button onClick={close} className="rounded-lg p-2 text-gray-400 hover:text-white hover:bg-white/10">
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

function DrawerLinks({ items, activePath, activeHash, close }) {
  return (
    <ul className="space-y-1">
      {items.map(({ id, label, href, icon: Icon }) => {
        const active = isActiveRoute(activePath, activeHash, href);
        return (
          <li key={id}>
            <Link
              to={href}
              onClick={close}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-4 text-sm font-medium
                          ${active ? "bg-white text-black" : "text-gray-300 hover:bg-gray-800"}`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function DrawerFooter({ profile, close, logout }) {
  return (
    <div className="space-y-4 bg-gradient-to-t from-black/90 to-black/70 p-4 shadow-inner">
      <div className="flex items-center gap-3">
        <Avatar url={profile.avatar_url} className="h-11 w-11" ring />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text:white">{profile.full_name || "Trainer"}</p>
          <p className="truncate text-xs text-gray-400">{profile.email}</p>
        </div>
      </div>
      <Link
        to="/trainer#dashboard"
        onClick={close}
        className="flex items-center gap-3 rounded-xl px-4 py-3 text-gray-300 hover:bg-gray-800"
      >
        <Settings className="h-5 w-5" /> Ρυθμίσεις προφίλ
      </Link>
      <button
        onClick={() => { logout(); close(); }}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-800/20 px-4 py-3 text-red-300 hover:bg-red-700/30"
      >
        <LogOut className="h-5 w-5" /> Αποσύνδεση
      </button>
    </div>
  );
}

/* ------------- Bottom nav (MOBILE ONLY) ------------- */
const CREAMY_WHITE = "#FFF5E6";

function NavBtn({ href, label, icon: Icon, active, onClick }) {
  if (active) {
    const Body = (
      <div
        className="inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-black shadow-sm"
        style={{ backgroundColor: CREAMY_WHITE }}
      >
        <Icon className="h-5 w-5" />
        <span className="text-xs font-semibold leading-none">{label}</span>
      </div>
    );
    return href ? (
      <Link to={href} className="flex-1 flex justify-center">{Body}</Link>
    ) : (
      <button onClick={onClick} className="flex-1 flex justify-center">{Body}</button>
    );
  }

  const Body = (
    <div className="flex items-center justify-center">
      <Icon className="h-6 w-6 text-white/85" />
    </div>
  );
  return href ? (
    <Link to={href} className="flex-1 flex justify-center">{Body}</Link>
  ) : (
    <button onClick={onClick} className="flex-1 flex justify-center">{Body}</button>
  );
}

function BottomNav({ items, path, hash, route, drawerOpen, openDrawer }) {
  return (
    <motion.nav
      initial={{ y: 36, opacity: 0 }}
      animate={{ y: 0, opacity: drawerOpen ? 0 : 1, pointerEvents: drawerOpen ? "none" : "auto" }}
      transition={{ duration: 0.85, ease: [0.25, 0.1, 0.25, 1] }}
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 pointer-events-none"
    >
      <div
        className="mx-auto w-[92%] max-w-md pointer-events-auto"
        style={{ marginBottom: "calc(14px + env(safe-area-inset-bottom))" }}
      >
        <div className="relative flex items-center justify-between gap-2 rounded-lg 
                border border-white/10 
                bg-black/40 backdrop-blur-xl px-4 py-3 
                shadow-[0_8px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="pointer-events-none absolute inset-0 rounded-lg 
                  bg-gradient-to-b from-black/30 via-black/10 to-transparent" />
          <div className="relative z-10 flex w-full items-center justify-between">
            {items.map(({ href, label, icon }) => {
              const active =
                href === "drawer"
                  ? false
                  : isActiveBottom(path, hash, href);
              return (
                <NavBtn
                  key={label}
                  href={href !== "drawer" ? href : null}
                  label={label}
                  icon={icon}
                  active={active}
                  onClick={href === "drawer" ? openDrawer : undefined}
                />
              );
            })}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
