/* TrainerMenu.js – desktop rail + mobile nav + TrainerSearch overlay
   with red "new" (posts) + "pending" (bookings) badges
   ------------------------------------------------------------------ */

"use client";

import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import TrainerSearch from "../components/TrainerSearch";
import NavbarNewsCard from "../components/news/NavbarNewsCard";

import {
  FileText,
  Globe,
  CalendarCheck,
  History,
  User as UserIcon,
  ImagePlus,
  ShieldCheck,
  Settings,
  LogOut,
  X,
  Home,
  CalendarClock,
  CalendarDays,
  Settings as SettingsIcon,
  Search,
  Heart,
  MoreHorizontal,
  FileBadge2,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  Dumbbell,
  Target,
} from "lucide-react";

/* -------------------------------- Helpers -------------------------------- */

const normalizePath = (p = "") =>
  p && p !== "/" && p.endsWith("/") ? p.slice(0, -1) : p;

const splitHref = (href = "") => {
  const [p, h] = href.split("#");
  return { path: normalizePath(p || ""), hash: h ? `#${h}` : "" };
};

const isActiveRoute = (activePath, activeHash, href) => {
  const { path, hash } = splitHref(href);
  if (!path) return false;
  if (normalizePath(activePath) !== path) return false;
  return hash ? activeHash === hash : true;
};

const isActiveBottom = (activePath, activeHash, href) => {
  const { path, hash } = splitHref(href);
  if (!path) return false;
  if (normalizePath(activePath) !== path) return false;
  if (!hash) return activeHash === "";
  if (path === "/trainer") return activeHash.startsWith("#");
  return activeHash === hash;
};

const groupIsActive = (activePath, activeHash, children = []) =>
  children.some((child) => isActiveRoute(activePath, activeHash, child.href));

/* ------------------------------------------------------------------ */
/*                              Avatars                               */
/* ------------------------------------------------------------------ */

const AVATAR_PLACEHOLDER = "/placeholder.svg?height=120&width=120&text=Avatar";

const safeAvatar = (url, version) => {
  if (!url) return AVATAR_PLACEHOLDER;
  if (!version) return url;

  try {
    const base =
      typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const u = new URL(url, base);
    u.searchParams.set("v", String(version));
    return u.toString();
  } catch {
    return url;
  }
};

function Avatar({ url, className = "h-9 w-9", ring = false, version }) {
  const ringCls = ring ? "ring-2 ring-white/20 shadow-lg" : "";
  const src = safeAvatar(url, version);

  if (url) {
    return (
      <img
        src={src}
        alt="avatar"
        loading="lazy"
        decoding="async"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = AVATAR_PLACEHOLDER;
        }}
        className={`${className} rounded-full object-cover bg-white ${ringCls}`}
      />
    );
  }

  return (
    <div
      className={`${className} rounded-full bg-white/10 flex items-center justify-center ${ringCls}`}
    >
      <UserIcon className="h-4 w-4 text-gray-400" />
    </div>
  );
}

/* ----------------------------- Badges -------------------------------- */

function RedBadge({ count, className = "" }) {
  if (!count || count <= 0) return null;

  return (
    <span
      className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white
                  text-[11px] leading-[18px] font-bold flex items-center justify-center shadow-md ${className}`}
      aria-label={`${count} new`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/* ----------------------- Badges logic (bookings + posts) ----------------------- */

const LS_PREFIX = "pv_seen_";
const hasWindow = typeof window !== "undefined";

const getSeen = (key) => {
  if (!hasWindow) return 0;

  try {
    return parseInt(window.localStorage.getItem(LS_PREFIX + key) || "0", 10) || 0;
  } catch {
    return 0;
  }
};

const setSeen = (key, ts = Date.now()) => {
  if (!hasWindow) return;

  try {
    window.localStorage.setItem(LS_PREFIX + key, String(ts));
  } catch {}
};

const isPendingBooking = (row = {}) =>
  (row.status || "").toLowerCase() === "pending";

function useNewCounters({ profile, activePath }) {
  const trainerId = profile?.id;

  const FALLBACK_DAYS = 7;
  const fallbackTs = useMemo(
    () => Date.now() - FALLBACK_DAYS * 24 * 60 * 60 * 1000,
    []
  );

  const WATCHERS = useMemo(
    () => [
      {
        key: "bookings",
        mode: "pending",
        route: "/trainer/bookings",
        table: "trainer_bookings",
        select: "id,status,trainer_id,created_at",
        initialFilter: (q) => q.eq("trainer_id", trainerId).eq("status", "pending"),
        matchRow: (row) => row?.trainer_id === trainerId,
      },
      {
        key: "posts",
        mode: "new",
        route: "/posts",
        table: "posts",
        select: "id,created_at",
        initialFilter: (q) => q,
        matchRow: () => true,
      },
    ],
    [trainerId]
  );

  const [counts, setCounts] = useState(() =>
    Object.fromEntries(WATCHERS.map((w) => [w.key, 0]))
  );

  useEffect(() => {
    let canceled = false;

    async function loadCounts() {
      const updates = {};

      for (const w of WATCHERS) {
        if (w.mode === "pending") {
          const { count, error } = await w.initialFilter(
            supabase.from(w.table).select("id", { count: "exact", head: true })
          );
          updates[w.key] = error ? 0 : count || 0;
        } else {
          const lastSeen = getSeen(w.key) || fallbackTs;

          const { data, error } = await w
            .initialFilter(supabase.from(w.table).select(w.select))
            .gt("created_at", new Date(lastSeen).toISOString())
            .limit(500);

          updates[w.key] = error ? 0 : data?.length || 0;
        }
      }

      if (!canceled) setCounts((prev) => ({ ...prev, ...updates }));
    }

    if (trainerId) loadCounts();
    return () => {
      canceled = true;
    };
  }, [WATCHERS, trainerId, fallbackTs]);

  useEffect(() => {
    if (!trainerId) return;

    const channels = WATCHERS.map((w) => {
      const ch = supabase.channel(`rt-${w.key}-${trainerId}`);

      if (w.mode === "pending") {
        ch.on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: w.table },
          (payload) => {
            const row = payload?.new || {};
            if (!w.matchRow(row)) return;
            if (isPendingBooking(row)) {
              setCounts((prev) => ({ ...prev, [w.key]: (prev[w.key] || 0) + 1 }));
            }
          }
        );

        ch.on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: w.table },
          (payload) => {
            const oldRow = payload?.old || {};
            const newRow = payload?.new || {};

            if (!w.matchRow(newRow)) return;

            const was = isPendingBooking(oldRow);
            const is = isPendingBooking(newRow);

            if (was && !is) {
              setCounts((prev) => ({
                ...prev,
                [w.key]: Math.max(0, (prev[w.key] || 0) - 1),
              }));
            } else if (!was && is) {
              setCounts((prev) => ({ ...prev, [w.key]: (prev[w.key] || 0) + 1 }));
            }
          }
        );
      } else {
        ch.on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: w.table },
          (payload) => {
            const row = payload?.new || {};
            if (!w.matchRow(row)) return;

            const lastSeen = getSeen(w.key) || fallbackTs;
            const createdTs = row?.created_at ? new Date(row.created_at).getTime() : 0;

            if (createdTs > lastSeen) {
              setCounts((prev) => ({ ...prev, [w.key]: (prev[w.key] || 0) + 1 }));
            }
          }
        );
      }

      ch.subscribe();
      return ch;
    });

    return () => {
      channels.forEach((ch) => {
        try {
          supabase.removeChannel(ch);
        } catch {}
      });
    };
  }, [WATCHERS, trainerId, fallbackTs]);

  useEffect(() => {
    const watcher = WATCHERS.find(
      (w) => normalizePath(activePath) === normalizePath(w.route)
    );

    if (!watcher) return;

    if (watcher.mode === "new") {
      setSeen(watcher.key, Date.now());
      setCounts((prev) => ({ ...prev, [watcher.key]: 0 }));
    }
  }, [activePath, WATCHERS]);

  const countForHref = (href) => {
    const { path } = splitHref(href);
    const watcher = WATCHERS.find(
      (w) => normalizePath(w.route) === normalizePath(path)
    );
    return watcher ? counts[watcher.key] || 0 : 0;
  };

  return { counts, countForHref };
}

/* ------------------------------------------------------------------ */

const COLLAPSED = 72;
const EXPANDED = 240;
const LOGO_SRC =
  "https://peakvelocity.gr/wp-content/uploads/2024/03/Logo-chris-black-1.png";

if (typeof document !== "undefined") {
  document.documentElement.style.setProperty("--side-w", `${COLLAPSED}px`);
}

function useDropdownController(allItems, activePath, activeHash) {
  const activeGroupId = useMemo(() => {
    return (
      allItems.find((item) =>
        item.children ? groupIsActive(activePath, activeHash, item.children) : false
      )?.id || null
    );
  }, [allItems, activePath, activeHash]);

  const [openGroupId, setOpenGroupId] = useState(activeGroupId);
  const [manuallyOpenedGroup, setManuallyOpenedGroup] = useState(null);

  useEffect(() => {
    if (manuallyOpenedGroup !== null) return;
    if (activeGroupId) {
      setOpenGroupId(activeGroupId);
    }
  }, [activeGroupId, manuallyOpenedGroup]);

  const handleGroupToggle = (groupId) => {
    setOpenGroupId((prev) => {
      const next = prev === groupId ? null : groupId;
      setManuallyOpenedGroup(next);
      return next;
    });
  };

  return {
    openGroupId,
    handleGroupToggle,
  };
}

export default function TrainerMenu() {
  const { profile, profileLoaded } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [ready, setReady] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const syncVar = (o) => {
    if (typeof document === "undefined" || typeof window === "undefined") return;
    const w = window.innerWidth >= 1024 ? (o ? EXPANDED : COLLAPSED) : 0;
    document.documentElement.style.setProperty("--side-w", `${w}px`);
  };

  useEffect(() => syncVar(open), [open]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const h = () => {
      if (window.innerWidth < 1024) setOpen(false);
      syncVar(open);
    };
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [open]);

  useEffect(() => setReady(true), []);

  const activePath = location.pathname;
  const activeHash = location.hash || "";

  const { countForHref } = useNewCounters({ profile, activePath });
  const avatarVersion = profile?.avatar_updated_at || profile?.updated_at || "";

  if (!profileLoaded || !profile || profile.role !== "trainer") return null;

  const navMain = [
    { id: "dash", label: "Αρχική", href: "/trainer", icon: Home },
    {
      id: "bookings-group",
      label: "Κρατήσεις",
      icon: FolderKanban,
      children: [
        {
          id: "schedule",
          label: "Το Πρόγραμμά μου",
          href: "/trainer/schedule",
          icon: CalendarDays,
        },
        {
          id: "books",
          label: "Κρατήσεις μου",
          href: "/trainer/bookings",
          icon: CalendarCheck,
        },
        {
          id: "pay",
          label: "Ιστορικό Κρατήσεων",
          href: "/trainer/payments",
          icon: History,
        },
      ],
    },
    {
      id: "posts-group",
      label: "Αναρτήσεις",
      icon: FileText,
      children: [
        {
          id: "posts",
          label: "Αναρτήσεις μου",
          href: "/trainer/posts",
          icon: FileText,
        },
        {
          id: "allp",
          label: "Όλες οι Αναρτήσεις",
          href: "/posts",
          icon: Globe,
        },
      ],
    },
    { id: "mark", label: "Προπονητές", href: "/services", icon: Dumbbell },
    { id: "likes", label: "Αγαπημένα", href: "/trainer/likes", icon: Heart },
    { id: "goals", label: "Στόχοι", href: "/trainer/goals", icon: Target },
  ];

  const navSettings = [
    {
      id: "settings-group",
      label: "Ρυθμίσεις",
      icon: Settings,
      children: [
        { id: "profile", label: "Πληροφορίες", href: "/trainer#profile", icon: UserIcon },
        { id: "avatar", label: "Προφίλ", href: "/trainer#avatar", icon: ImagePlus },
        {
          id: "credentials",
          label: "Δικαιολογητικά",
          href: "/trainer#credentials",
          icon: FileBadge2,
        },
        { id: "security", label: "Ασφάλεια", href: "/trainer#security", icon: ShieldCheck },
      ],
    },
  ];

  const bottomNav = [
    { href: "/trainer", label: "Αρχική", icon: Home },
    { href: "/trainer/schedule", label: "Πρόγραμμα", icon: CalendarClock },
    { href: "/trainer/bookings", label: "Κρατήσεις", icon: CalendarDays },
    { href: "/trainer#profile", label: "Ρυθμίσεις", icon: SettingsIcon },
    { href: "drawer", label: "Περισσότερα", icon: MoreHorizontal },
  ];

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const openOverlay = () => setSearchOpen(true);

  return (
    <>
      <DesktopRail
        open={open}
        setOpen={setOpen}
        ready={ready}
        navMain={navMain}
        navSettings={navSettings}
        activePath={activePath}
        activeHash={activeHash}
        profile={profile}
        logout={logout}
        onOpenSearch={openOverlay}
        countForHref={countForHref}
        avatarVersion={avatarVersion}
      />

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
          <img
            src={LOGO_SRC}
            alt="logo"
            className="h-10 w-10 rounded-xl bg-white object-contain p-1"
          />
        </div>

        <Avatar url={profile.avatar_url} version={avatarVersion} className="h-9 w-9" />
      </motion.header>

      <div
        className="lg:hidden"
        style={{ height: "calc(4.75rem + env(safe-area-inset-top))" }}
      />

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      <MobileDrawer
        open={drawer}
        setOpen={setDrawer}
        navMain={navMain}
        navSettings={navSettings}
        activePath={activePath}
        activeHash={activeHash}
        profile={profile}
        logout={logout}
        countForHref={countForHref}
        avatarVersion={avatarVersion}
      />

      <BottomNav
        items={bottomNav}
        path={activePath}
        hash={activeHash}
        drawerOpen={drawer}
        openDrawer={() => setDrawer(true)}
        countForHref={countForHref}
      />
    </>
  );
}

/* ------------- Desktop rail helpers ------------- */

function DesktopRail({
  open,
  setOpen,
  ready,
  navMain,
  navSettings,
  activePath,
  activeHash,
  profile,
  logout,
  onOpenSearch,
  countForHref,
  avatarVersion,
}) {
  const allItems = [...navMain, ...navSettings];
  const { openGroupId, handleGroupToggle } = useDropdownController(
    allItems,
    activePath,
    activeHash
  );

  return (
    <motion.aside
      initial={{ opacity: 0, width: COLLAPSED }}
      animate={{ opacity: ready ? 1 : 0, width: open ? EXPANDED : COLLAPSED }}
      whileHover={{ width: EXPANDED }}
      transition={{
        opacity: { duration: 1.0, ease: [0.4, 0, 0.2, 1] },
        width: { type: "spring", stiffness: 120, damping: 20, mass: 1.1 },
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className="hidden lg:flex fixed top-0 left-0 z-40 h-screen flex-col justify-between
                 overflow-hidden bg-gradient-to-b from-black/80 to-black/60 backdrop-blur-xl
                 ring-1 ring-white/10 shadow-2xl"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <Brand open={open} />
        <DesktopSearch open={open} onOpen={onOpenSearch} />

        <NavList
          items={navMain}
          open={open}
          activePath={activePath}
          activeHash={activeHash}
          countForHref={countForHref}
          openGroupId={openGroupId}
          onToggleGroup={handleGroupToggle}
        />

        <NavList
          items={navSettings}
          open={open}
          activePath={activePath}
          activeHash={activeHash}
          countForHref={countForHref}
          openGroupId={openGroupId}
          onToggleGroup={handleGroupToggle}
        />
      </div>

      <FooterBlock
        open={open}
        profile={profile}
        onLogout={logout}
        avatarVersion={avatarVersion}
      />
    </motion.aside>
  );
}

const Brand = ({ open }) => (
  <div className="flex items-center gap-3">
    <img
      src={LOGO_SRC}
      alt="logo"
      className="h-10 w-10 rounded-xl bg-white object-contain p-1"
    />
    <AnimatePresence>
      {open && (
        <motion.span
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
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
        className="w-full flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 hover:bg-white/15 transition-colors text-left"
        aria-label="Άνοιγμα αναζήτησης"
      >
        <Search className="h-5 w-5 text-gray-200" />
        <span className="text-sm text-gray-300">Ψάξε σελίδες…</span>
      </button>
    </div>
  );
}

function NavList({
  items,
  open,
  activePath,
  activeHash,
  countForHref,
  openGroupId,
  onToggleGroup,
}) {
  const getGroupCount = (children = []) =>
    children.reduce((sum, child) => sum + (countForHref?.(child.href) || 0), 0);

  return (
    <ul className="space-y-1">
      {items.map((item) => {
        if (item.children?.length) {
          const Icon = item.icon;
          const groupActive = groupIsActive(activePath, activeHash, item.children);
          const expanded = openGroupId === item.id;
          const layout = open ? "justify-start px-4" : "justify-center px-0";
          const groupCount = getGroupCount(item.children);

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onToggleGroup(item.id)}
                className={`flex items-center gap-4 w-full rounded-xl py-3 ${layout}
                            ${
                              groupActive
                                ? "bg-white text-black shadow-inner"
                                : "text-gray-300 hover:bg-white/10"
                            }
                            transition-colors relative`}
              >
                <div className="relative">
                  <Icon className={`h-5 w-5 ${groupActive ? "text-black" : ""}`} />
                  <RedBadge count={groupCount} />
                </div>

                <AnimatePresence>
                  {open && (
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.3 }}
                      className="flex min-w-0 flex-1 items-center justify-between gap-2"
                    >
                      <span className="truncate text-sm font-medium">{item.label}</span>
                      <span className="shrink-0">
                        {expanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>

              <AnimatePresence initial={false}>
                {open && expanded && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="mt-1 ml-2 overflow-hidden pl-3"
                  >
                    {item.children.map(({ id, label, href, icon: ChildIcon }) => {
                      const active = isActiveRoute(activePath, activeHash, href);
                      const count = countForHref?.(href) || 0;

                      return (
                        <li key={id} className="py-0.5">
                          <Link
                            to={href}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors relative
                                        ${
                                          active
                                            ? "bg-white text-black shadow-inner"
                                            : "text-gray-300 hover:bg-white/10"
                                        }`}
                          >
                            <div className="relative">
                              <ChildIcon className="h-4 w-4" />
                              <RedBadge count={count} className="-top-2 -right-2" />
                            </div>
                            <span className="truncate">{label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>
          );
        }

        const { id, label, href, icon: Icon } = item;
        const active = isActiveRoute(activePath, activeHash, href);
        const layout = open ? "justify-start px-4" : "justify-center px-0";
        const count = countForHref?.(href) || 0;

        return (
          <li key={id}>
            <Link
              to={href}
              className={`flex items-center gap-4 w-full rounded-xl py-3 ${layout}
                          ${
                            active
                              ? "bg-white text-black shadow-inner"
                              : "text-gray-300 hover:bg-white/10"
                          }
                          transition-colors relative`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${active ? "text-black" : ""}`} />
                <RedBadge count={count} />
              </div>

              <AnimatePresence>
                {open && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
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

function FooterBlock({ open, profile, onLogout, avatarVersion }) {
  return (
    <div className="p-4">
      {open && (
        <div className="mb-4">
          <NavbarNewsCard />
        </div>
      )}

      <div className="flex items-center gap-3 rounded-2xl hover:bg-white/10 p-2 transition-colors">
        <Avatar url={profile.avatar_url} version={avatarVersion} className="h-9 w-9" />

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
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
    </div>
  );
}

/* ----------------- Search Overlay ----------------- */

function SearchOverlay({ open, onClose }) {
  const navigate = useNavigate();

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="search-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        key="search-panel"
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -24, opacity: 0 }}
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

function MobileDrawer({
  open,
  setOpen,
  navMain,
  navSettings,
  activePath,
  activeHash,
  profile,
  logout,
  countForHref,
  avatarVersion,
}) {
  if (!open) return null;

  const allItems = [...navMain, ...navSettings];
  const { openGroupId, handleGroupToggle } = useDropdownController(
    allItems,
    activePath,
    activeHash
  );

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.55 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="fixed inset-0 z-40 bg-black backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      <motion.aside
        key="drawer"
        initial={{ x: -320 }}
        animate={{ x: 0 }}
        exit={{ x: -320 }}
        transition={{ type: "spring", stiffness: 110, damping: 20, mass: 1.1 }}
        className="fixed inset-y-0 left-0 z-50 w-[76vw] max-w-[320px] flex flex-col
                   bg-gradient-to-b from-black/90 to-black/70 border-r border-gray-800 shadow-2xl"
      >
        <DrawerHeader close={() => setOpen(false)} />

        <div className="flex-1 overflow-y-auto p-4">
          <Section>Μενού</Section>
          <DrawerLinks
            items={navMain}
            activePath={activePath}
            activeHash={activeHash}
            close={() => setOpen(false)}
            countForHref={countForHref}
            openGroupId={openGroupId}
            onToggleGroup={handleGroupToggle}
          />

          <div className="my-5 h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent" />

          <Section>Ρυθμίσεις</Section>
          <DrawerLinks
            items={navSettings}
            activePath={activePath}
            activeHash={activeHash}
            close={() => setOpen(false)}
            countForHref={countForHref}
            openGroupId={openGroupId}
            onToggleGroup={handleGroupToggle}
          />
        </div>

        <DrawerFooter
          profile={profile}
          close={() => setOpen(false)}
          logout={logout}
          avatarVersion={avatarVersion}
        />
      </motion.aside>
    </AnimatePresence>
  );
}

const Section = ({ children }) => (
  <p className="mb-3 mt-1 px-2 text-[12px] uppercase tracking-wider text-gray-500">
    {children}
  </p>
);

function DrawerHeader({ close }) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-800">
      <div className="flex items-center gap-3">
        <img
          src={LOGO_SRC}
          alt="logo"
          className="h-10 w-10 rounded-xl bg-white object-contain p-1"
        />
        <span className="text-lg font-bold text-white">
          Trainer<span className="font-light text-gray-400">Hub</span>
        </span>
      </div>

      <button
        onClick={close}
        className="rounded-lg p-2 text-gray-400 hover:text-white hover:bg-white/10"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

function DrawerLinks({
  items,
  activePath,
  activeHash,
  close,
  countForHref,
  openGroupId,
  onToggleGroup,
}) {
  const getGroupCount = (children = []) =>
    children.reduce((sum, child) => sum + (countForHref?.(child.href) || 0), 0);

  return (
    <ul className="space-y-1">
      {items.map((item) => {
        if (item.children?.length) {
          const Icon = item.icon;
          const active = groupIsActive(activePath, activeHash, item.children);
          const expanded = openGroupId === item.id;
          const groupCount = getGroupCount(item.children);

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onToggleGroup(item.id)}
                className={`flex w-full min-h-11 items-center gap-3 rounded-xl px-4 text-sm font-medium
                            ${
                              active
                                ? "bg-white text-black"
                                : "text-gray-300 hover:bg-gray-800"
                            }
                            relative`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <RedBadge count={groupCount} />
                </div>

                <span className="flex-1 text-left">{item.label}</span>

                {expanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0" />
                )}
              </button>

              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="mt-1 ml-2 overflow-hidden pl-3"
                  >
                    {item.children.map(({ id, label, href, icon: ChildIcon }) => {
                      const childActive = isActiveRoute(activePath, activeHash, href);
                      const count = countForHref?.(href) || 0;

                      return (
                        <li key={id} className="py-0.5">
                          <Link
                            to={href}
                            onClick={close}
                            className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium
                                        ${
                                          childActive
                                            ? "bg-white text-black"
                                            : "text-gray-300 hover:bg-gray-800"
                                        }
                                        relative`}
                          >
                            <div className="relative">
                              <ChildIcon className="h-4 w-4 flex-shrink-0" />
                              <RedBadge count={count} className="-top-2 -right-2" />
                            </div>
                            {label}
                          </Link>
                        </li>
                      );
                    })}
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>
          );
        }

        const { id, label, href, icon: Icon } = item;
        const active = isActiveRoute(activePath, activeHash, href);
        const count = countForHref?.(href) || 0;

        return (
          <li key={id}>
            <Link
              to={href}
              onClick={close}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-4 text-sm font-medium
                          ${active ? "bg-white text-black" : "text-gray-300 hover:bg-gray-800"}
                          relative`}
            >
              <div className="relative">
                <Icon className="h-5 w-5 flex-shrink-0" />
                <RedBadge count={count} />
              </div>
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function DrawerFooter({ profile, close, logout, avatarVersion }) {
  return (
    <div className="space-y-4 bg-gradient-to-t from-black/90 to-black/70 p-4 shadow-inner">
      <NavbarNewsCard />

      <div className="flex items-center gap-3">
        <Avatar url={profile.avatar_url} version={avatarVersion} className="h-11 w-11" ring />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {profile.full_name || "Trainer"}
          </p>
          <p className="truncate text-xs text-gray-400">{profile.email}</p>
        </div>
      </div>

      <button
        onClick={() => {
          logout();
          close();
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-800/20 px-4 py-3 text-red-300 hover:bg-red-700/30"
      >
        <LogOut className="h-5 w-5" /> Αποσύνδεση
      </button>
    </div>
  );
}

/* ------------- Bottom nav (MOBILE ONLY) ------------- */

const CREAMY_WHITE = "#FFF5E6";

function NavBtn({ href, label, icon: Icon, active, onClick, count }) {
  if (active) {
    const Body = (
      <div
        className="inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-black shadow-sm relative"
        style={{ backgroundColor: CREAMY_WHITE }}
      >
        <div className="relative">
          <Icon className="h-5 w-5" />
          <RedBadge count={count} />
        </div>
        <span className="text-xs font-semibold leading-none">{label}</span>
      </div>
    );

    return href ? (
      <Link to={href} className="flex-1 flex justify-center">
        {Body}
      </Link>
    ) : (
      <button onClick={onClick} className="flex-1 flex justify-center">
        {Body}
      </button>
    );
  }

  const Body = (
    <div className="flex items-center justify-center relative">
      <Icon className="h-6 w-6 text-white/85" />
      <RedBadge count={count} />
    </div>
  );

  return href ? (
    <Link to={href} className="flex-1 flex justify-center">
      {Body}
    </Link>
  ) : (
    <button onClick={onClick} className="flex-1 flex justify-center">
      {Body}
    </button>
  );
}

function BottomNav({ items, path, hash, drawerOpen, openDrawer, countForHref }) {
  return (
    <motion.nav
      initial={{ y: 36, opacity: 0 }}
      animate={{
        y: 0,
        opacity: drawerOpen ? 0 : 1,
        pointerEvents: drawerOpen ? "none" : "auto",
      }}
      transition={{ duration: 0.85, ease: [0.25, 0.1, 0.25, 1] }}
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 pointer-events-none"
    >
      <div
        className="mx-auto w-[92%] max-w-md pointer-events-auto"
        style={{ marginBottom: "calc(14px + env(safe-area-inset-bottom))" }}
      >
        <div className="relative flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/40 backdrop-blur-xl px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-b from-black/30 via-black/10 to-transparent" />

          <div className="relative z-10 flex w-full items-center justify-between">
            {items.map(({ href, label, icon }) => {
              const active = href === "drawer" ? false : isActiveBottom(path, hash, href);
              const count = href === "drawer" ? 0 : countForHref?.(href) || 0;

              return (
                <NavBtn
                  key={label}
                  href={href !== "drawer" ? href : null}
                  label={label}
                  icon={icon}
                  active={active}
                  onClick={href === "drawer" ? openDrawer : undefined}
                  count={count}
                />
              );
            })}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}