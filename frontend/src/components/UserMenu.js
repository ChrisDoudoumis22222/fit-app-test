/* UserMenu.js – black-glass rail + bottom nav with badges + quick search
   Fixed:
   - No conditional return before hooks
   - Stable hook order on every render
   - Better active-state handling for hash routes
   - Typo: "Φωτογραφία Προφίλr" -> "Φωτογραφία Προφίλ"
   ----------------------------------------------------------------------- */

"use client";

import { useState, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";

import {
  BarChart3,
  ShoppingBag,
  Globe,
  User as UserIcon,
  ImagePlus,
  Shield,
  Settings,
  CalendarCheck,
  LogOut,
  X,
  Home,
  CalendarDays,
  MoreHorizontal,
  HelpCircle,
  Heart,
  Search as SearchIcon,
} from "lucide-react";

const COLLAPSED = 72;
const EXPANDED = 240;
const LOGO_SRC =
  "https://peakvelocity.gr/wp-content/uploads/2024/03/Logo-chris-black-1.png";

/* -------------------- Avatar -------------------- */
const AVATAR_PLACEHOLDER = "/placeholder.svg?height=120&width=120&text=Avatar";

const safeAvatar = (url) =>
  url ? `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}` : AVATAR_PLACEHOLDER;

function Avatar({ url, className = "h-9 w-9" }) {
  if (url) {
    return (
      <img
        src={safeAvatar(url)}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = AVATAR_PLACEHOLDER;
        }}
        alt="avatar"
        className={`${className} rounded-full object-cover bg-white`}
      />
    );
  }

  return (
    <div
      className={`${className} rounded-full bg-white/10 flex items-center justify-center`}
    >
      <UserIcon className="h-4 w-4 text-gray-400" />
    </div>
  );
}

/* -------------------- Badge -------------------- */
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

/* -------------------- Badges logic -------------------- */
const LS_PREFIX = "pv_seen_user_";
const getSeen = (key) =>
  parseInt(localStorage.getItem(LS_PREFIX + key) || "0", 10) || 0;
const setSeen = (key, ts = Date.now()) =>
  localStorage.setItem(LS_PREFIX + key, String(ts));
const isAccepted = (row = {}) => (row.status || "").toLowerCase() === "accepted";

function useUserBadges({ profile, activePath }) {
  const userId = profile?.id;

  const FALLBACK_DAYS = 7;
  const fallbackTs = useMemo(
    () => Date.now() - FALLBACK_DAYS * 24 * 60 * 60 * 1000,
    []
  );

  const WATCHERS = useMemo(
    () => [
      {
        key: "bookingsAccepted",
        route: "/user/bookings",
        table: "trainer_bookings",
        select: "id,status,user_id,created_at,updated_at",
        initialFilter: (q) => q.eq("user_id", userId).eq("status", "accepted"),
        tsField: "updated_at",
        matchRow: (row) => row?.user_id === userId && isAccepted(row),
      },
      {
        key: "posts",
        route: "/posts",
        table: "posts",
        select: "id,created_at",
        initialFilter: (q) => q,
        tsField: "created_at",
        matchRow: () => true,
      },
    ],
    [userId]
  );

  const [counts, setCounts] = useState(() =>
    Object.fromEntries(WATCHERS.map((w) => [w.key, 0]))
  );

  useEffect(() => {
    if (!userId) return;

    let canceled = false;

    (async () => {
      const updates = {};

      for (const w of WATCHERS) {
        const lastSeen = getSeen(w.key) || fallbackTs;

        const { data, error } = await w
          .initialFilter(supabase.from(w.table).select(w.select))
          .gt(w.tsField, new Date(lastSeen).toISOString())
          .limit(500);

        updates[w.key] = error ? 0 : (data || []).filter(w.matchRow).length;
      }

      if (!canceled) {
        setCounts((prev) => ({ ...prev, ...updates }));
      }
    })();

    return () => {
      canceled = true;
    };
  }, [WATCHERS, userId, fallbackTs]);

  useEffect(() => {
    if (!userId) return;

    const channels = WATCHERS.map((w) => {
      const ch = supabase.channel(`rt-${w.table}-user-${w.key}`);

      if (w.key === "posts") {
        ch.on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: w.table },
          (payload) => {
            const row = payload?.new || {};
            if (!w.matchRow(row)) return;

            const lastSeen = getSeen(w.key) || fallbackTs;
            const t = row[w.tsField] ? new Date(row[w.tsField]).getTime() : 0;

            if (t > lastSeen) {
              setCounts((prev) => ({
                ...prev,
                [w.key]: (prev[w.key] || 0) + 1,
              }));
            }
          }
        );
      } else if (w.key === "bookingsAccepted") {
        ch.on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: w.table },
          (payload) => {
            const row = payload?.new || {};
            if (!w.matchRow(row)) return;

            const lastSeen = getSeen(w.key) || fallbackTs;
            const t = row[w.tsField]
              ? new Date(row[w.tsField]).getTime()
              : row.created_at
              ? new Date(row.created_at).getTime()
              : 0;

            if (t > lastSeen) {
              setCounts((prev) => ({
                ...prev,
                [w.key]: (prev[w.key] || 0) + 1,
              }));
            }
          }
        );

        ch.on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: w.table },
          (payload) => {
            const oldRow = payload?.old || {};
            const newRow = payload?.new || {};

            const was = isAccepted(oldRow);
            const isNow = isAccepted(newRow);

            if (!was && isNow && newRow.user_id === userId) {
              const lastSeen = getSeen(w.key) || fallbackTs;
              const t = newRow[w.tsField] ? new Date(newRow[w.tsField]).getTime() : 0;

              if (t > lastSeen) {
                setCounts((prev) => ({
                  ...prev,
                  [w.key]: (prev[w.key] || 0) + 1,
                }));
              }
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
  }, [WATCHERS, userId, fallbackTs]);

  useEffect(() => {
    const watcher = WATCHERS.find((w) => w.route === activePath);
    if (!watcher) return;

    setSeen(watcher.key, Date.now());
    setCounts((prev) => ({ ...prev, [watcher.key]: 0 }));
  }, [activePath, WATCHERS]);

  const countForHref = (href) => {
    const watcher = WATCHERS.find((w) => w.route === href);
    return watcher ? counts[watcher.key] || 0 : 0;
  };

  return { countForHref };
}

/* -------------------- Greek-ish search helpers -------------------- */
const stripCombining = (s) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const norm = (s = "") =>
  stripCombining(String(s).toLowerCase()).replace(/ς/g, "σ").trim();

function greeklishToGreek(input = "") {
  let s = String(input).toLowerCase();

  const digraphs = [
    ["th", "θ"],
    ["ch", "χ"],
    ["ps", "ψ"],
    ["ks", "ξ"],
    ["ou", "ου"],
    ["ai", "αι"],
    ["ei", "ει"],
    ["oi", "οι"],
    ["gh", "γ"],
    ["mp", "μπ"],
    ["nt", "ντ"],
    ["ts", "τσ"],
    ["tz", "τζ"],
  ];

  for (const [g, gr] of digraphs) s = s.replaceAll(g, gr);

  const map = {
    a: "α",
    b: "β",
    c: "κ",
    d: "δ",
    e: "ε",
    f: "φ",
    g: "γ",
    h: "η",
    i: "ι",
    j: "ζ",
    k: "κ",
    l: "λ",
    m: "μ",
    n: "ν",
    o: "ο",
    p: "π",
    q: "κ",
    r: "ρ",
    s: "σ",
    t: "τ",
    u: "υ",
    v: "β",
    w: "ω",
    x: "ξ",
    y: "υ",
    z: "ζ",
    " ": " ",
    "-": "-",
  };

  let out = "";
  for (const ch of s) out += map[ch] ?? ch;

  return out;
}

const normalizeQuery = (q) => {
  const base = norm(q);
  const gl = norm(greeklishToGreek(q));
  return base.length >= gl.length ? base : gl;
};

/* -------------------- Search overlay -------------------- */
function QuickSearchOverlay({ open, onClose, items }) {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");

  useEffect(() => {
    if (!open) {
      setQ("");
      setDq("");
    }
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => setDq(q), 150);
    return () => clearTimeout(timer);
  }, [q]);

  const nq = normalizeQuery(dq);

  const results = useMemo(() => {
    if (!nq) return items.slice(0, 10);

    return items
      .filter((it) => {
        const hay = norm(`${it.title} ${it.keywords || ""}`);
        return hay.includes(nq);
      })
      .slice(0, 20);
  }, [nq, items]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-0 z-[121] flex items-start justify-center p-4 sm:p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="w-full max-w-2xl rounded-2xl bg-zinc-950/95 border border-white/10 shadow-2xl overflow-hidden">
              <div className="flex items-center gap-3 p-3 sm:p-4 border-b border-white/10">
                <SearchIcon className="h-5 w-5 text-zinc-400" />

                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Αναζήτηση σελίδων: πίνακας, κρατήσεις, αγαπημένα, ρυθμίσεις…"
                  className="flex-1 bg-transparent outline-none text-white placeholder:text-zinc-500"
                />

                <button
                  onClick={onClose}
                  className="rounded-lg p-2 hover:bg-white/10"
                >
                  <X className="h-5 w-5 text-zinc-400" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-2">
                {results.length > 0 ? (
                  <ul className="divide-y divide-white/5">
                    {results.map((it) => (
                      <li key={it.href}>
                        <Link
                          to={it.href}
                          onClick={onClose}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition"
                        >
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/5">
                            <it.icon className="h-5 w-5 text-white" />
                          </span>

                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white">
                              {it.title}
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-6 text-center text-zinc-300">
                    Δεν βρέθηκαν αποτελέσματα — πήγαινε στο{" "}
                    <Link
                      to="/faq/users"
                      onClick={onClose}
                      className="text-white underline underline-offset-4"
                    >
                      FAQ (Συχνές Ερωτήσεις)
                    </Link>{" "}
                    και κάνε αναζήτηση 😉
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* -------------------- Component -------------------- */
export default function UserMenu() {
  const { profile, profileLoaded } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [ready, setReady] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    try {
      document.documentElement.style.setProperty("--side-w", `${COLLAPSED}px`);
    } catch {}
  }, []);

  const syncVar = (isOpen) => {
    const w = window.innerWidth >= 1024 ? (isOpen ? EXPANDED : COLLAPSED) : 0;
    try {
      document.documentElement.style.setProperty("--side-w", `${w}px`);
    } catch {}
  };

  useEffect(() => {
    syncVar(open);
  }, [open]);

  useEffect(() => {
    const h = () => {
      if (window.innerWidth < 1024) setOpen(false);
      syncVar(open);
    };

    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [open]);

  useEffect(() => {
    setReady(true);
  }, []);

  const navMain = useMemo(
    () => [
      { id: "dash", label: "Πίνακας", href: "/user", icon: BarChart3 },
      { id: "market", label: "Προπονητές", href: "/services", icon: ShoppingBag },
      { id: "posts", label: "Αναρτήσεις", href: "/posts", icon: Globe },
      {
        id: "bookings",
        label: "Κρατήσεις",
        href: "/user/bookings",
        icon: CalendarCheck,
      },
    ],
    []
  );

  const navSettings = useMemo(
    () => [
      {
        id: "profile",
        label: "Πληροφορίες",
        href: "/user#profile",
        icon: UserIcon,
      },
      {
        id: "avatar",
        label: "Φωτογραφία Προφίλ",
        href: "/user#avatar",
        icon: ImagePlus,
      },
      {
        id: "bookingsS",
        label: "Κρατήσεις",
        href: "/user/bookings",
        icon: CalendarCheck,
      },
      {
        id: "likesS",
        label: "Αγαπημένα",
        href: "/user/likes",
        icon: Heart,
      },
      {
        id: "security",
        label: "Ασφάλεια",
        href: "/user#security",
        icon: Shield,
      },
      {
        id: "faq",
        label: "Συχνές Ερωτήσεις",
        href: "/faq/users",
        icon: HelpCircle,
      },
    ],
    []
  );

  const bottomNav = useMemo(
    () => [
      { href: "/user", label: "Αρχική", icon: Home },
      { href: "/services", label: "Προπονητές", icon: ShoppingBag },
      { href: "/user/bookings", label: "Κρατήσεις", icon: CalendarDays },
      { href: "/user#profile", label: "Ρυθμίσεις", icon: Settings },
      { href: "drawer", label: "Περισσότερα", icon: MoreHorizontal },
    ],
    []
  );

  const searchItems = useMemo(() => {
    const mapItem = ({ label, href, icon }) => ({
      title: label,
      href,
      icon,
      keywords: "",
    });

    return [
      ...navMain.map(mapItem),
      ...navSettings.map(mapItem),
      {
        title: "Συχνές Ερωτήσεις Χρηστών",
        href: "/faq/users",
        icon: HelpCircle,
        keywords: "faq βοήθεια υποστήριξη",
      },
      {
        title: "Αγαπημένοι Προπονητές",
        href: "/user/likes",
        icon: Heart,
        keywords: "likes favorites αγαπημενα",
      },
      {
        title: "Πληρωμές / Κρατήσεις",
        href: "/user/bookings",
        icon: CalendarCheck,
        keywords: "bookings ραντεβού πληρωμες",
      },
      {
        title: "Αναρτήσεις",
        href: "/posts",
        icon: Globe,
        keywords: "posts ενημερωσεις",
      },
      {
        title: "Προπονητές / Υπηρεσίες",
        href: "/services",
        icon: ShoppingBag,
        keywords: "trainers marketplace προπονητες υπηρεσιες",
      },
      {
        title: "Πίνακας",
        href: "/user",
        icon: BarChart3,
        keywords: "dashboard αρχικη",
      },
    ];
  }, [navMain, navSettings]);

  const activePath = location.pathname;
  const route = `${location.pathname}${location.hash || ""}`;

  const { countForHref } = useUserBadges({ profile, activePath });

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (!profileLoaded || !profile) return null;

  return (
    <>
      <DesktopRail
        open={open}
        setOpen={setOpen}
        ready={ready}
        navMain={navMain}
        navSettings={navSettings}
        activePath={activePath}
        route={route}
        profile={profile}
        logout={logout}
        countForHref={countForHref}
        onOpenSearch={() => setSearchOpen(true)}
      />

      <motion.header
        initial={false}
        animate={{
          opacity: drawer ? 0 : 1,
          pointerEvents: drawer ? "none" : "auto",
        }}
        className="lg:hidden fixed inset-x-0 top-0 z-40 flex items-center
                   h-14 px-4 bg-black/80 backdrop-blur ring-1 ring-white/10 transition-opacity"
      >
        <div className="w-10 flex items-center justify-center">
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Αναζήτηση"
            className="rounded-xl bg-white p-2 shadow-sm active:scale-95 transition"
          >
            <SearchIcon className="h-5 w-5 text-black" />
          </button>
        </div>

        <div className="flex-1 flex justify-center">
          <img
            src={LOGO_SRC}
            alt="logo"
            className="h-10 w-10 rounded-xl bg-white object-contain p-1"
          />
        </div>

        <div className="w-10 flex items-center justify-center">
          <Avatar url={profile.avatar_url} className="h-9 w-9" />
        </div>
      </motion.header>

      <MobileDrawer
        open={drawer}
        setOpen={setDrawer}
        navMain={navMain}
        navSettings={navSettings}
        activePath={activePath}
        route={route}
        profile={profile}
        logout={logout}
        countForHref={countForHref}
        onOpenSearch={() => {
          setDrawer(false);
          setSearchOpen(true);
        }}
      />

      <BottomNav
        items={bottomNav}
        route={route}
        drawerOpen={drawer}
        openDrawer={() => setDrawer(true)}
        countForHref={countForHref}
      />

      <QuickSearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        items={searchItems}
      />
    </>
  );
}

/* -------------------- Desktop rail helpers -------------------- */
function DesktopRail({
  open,
  setOpen,
  ready,
  navMain,
  navSettings,
  activePath,
  route,
  profile,
  logout,
  countForHref,
  onOpenSearch,
}) {
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
      <div className="flex flex-col gap-4 p-4">
        <Brand open={open} />

        <button
          onClick={onOpenSearch}
          className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm transition
            ${open ? "justify-start" : "justify-center"}
            bg-black/40 text-white border-white/10 hover:bg-black/60`}
          aria-label="Αναζήτηση"
        >
          <SearchIcon className="h-5 w-5" />
          {open && <span>Αναζήτηση</span>}
        </button>

        <div className="h-2" />

        <NavList
          items={navMain}
          open={open}
          activePath={activePath}
          route={route}
          countForHref={countForHref}
        />

        <hr className="my-3 border-gray-700/60" />

        {open && (
          <p className="px-4 pt-1 pb-2 text-[11px] uppercase tracking-wider text-gray-500">
            Ρυθμίσεις
          </p>
        )}

        <NavList
          items={navSettings}
          open={open}
          activePath={activePath}
          route={route}
          countForHref={countForHref}
        />
      </div>

      <FooterBlock open={open} profile={profile} onLogout={logout} />
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
          User<span className="font-light text-gray-400">Hub</span>
        </motion.span>
      )}
    </AnimatePresence>
  </div>
);

function NavList({ items, open, activePath, route, countForHref }) {
  return (
    <ul className="space-y-1">
      {items.map(({ id, label, href, icon: Icon }) => {
        const isHashRoute = href.includes("#");
        const isActive = isHashRoute ? route === href : activePath === href;
        const layout = open ? "justify-start px-4" : "justify-center px-0";
        const count = countForHref?.(href) || 0;

        return (
          <li key={id}>
            <Link
              to={href}
              className={`flex items-center gap-4 w-full rounded-xl py-3 ${layout}
                          ${
                            isActive
                              ? "bg-white text-black shadow-inner"
                              : "text-gray-300 hover:bg-white/10"
                          }
                          transition-colors relative`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${isActive ? "text-black" : ""}`} />
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

function FooterBlock({ open, profile, onLogout }) {
  return (
    <div className="flex items-center gap-3 p-4 hover:bg-white/10 cursor-pointer">
      <Avatar url={profile.avatar_url} className="h-9 w-9" />

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.3 }}
            className="min-w-0 text-sm text-white"
          >
            <p className="truncate font-medium">
              {profile.full_name || "Χρήστης"}
            </p>
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

/* -------------------- Mobile drawer -------------------- */
function MobileDrawer({
  open,
  setOpen,
  navMain,
  navSettings,
  activePath,
  route,
  profile,
  logout,
  countForHref,
  onOpenSearch,
}) {
  if (!open) return null;

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
        className="fixed inset-y-0 left-0 z-50 w-[76vw] max-w-[320px]
                   flex flex-col bg-gradient-to-b from-black/90 to-black/70
                   border-r border-gray-800 shadow-2xl"
      >
        <DrawerHeader close={() => setOpen(false)} onOpenSearch={onOpenSearch} />

        <div className="flex-1 overflow-y-auto p-4">
          <Section>Μενού</Section>

          <DrawerLinks
            items={navMain}
            activePath={activePath}
            route={route}
            close={() => setOpen(false)}
            countForHref={countForHref}
          />

          <div className="my-5 h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent" />

          <Section>Ρυθμίσεις</Section>

          <DrawerLinks
            items={navSettings}
            activePath={activePath}
            route={route}
            close={() => setOpen(false)}
            countForHref={countForHref}
          />
        </div>

        <DrawerFooter
          profile={profile}
          close={() => setOpen(false)}
          logout={logout}
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

function DrawerHeader({ close, onOpenSearch }) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-800">
      <div className="flex items-center gap-3">
        <img
          src={LOGO_SRC}
          alt="logo"
          className="h-10 w-10 rounded-xl bg-white object-contain p-1"
        />
        <span className="text-lg font-bold text-white">
          User<span className="font-light text-gray-400">Hub</span>
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onOpenSearch}
          className="rounded-lg p-2 text-gray-300 hover:text-white hover:bg-white/10"
          aria-label="Αναζήτηση"
        >
          <SearchIcon className="h-5 w-5" />
        </button>

        <button
          onClick={close}
          className="rounded-lg p-2 text-gray-400 hover:text-white hover:bg-white/10"
          aria-label="Κλείσιμο"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function DrawerLinks({ items, activePath, route, close, countForHref }) {
  return (
    <ul className="space-y-1">
      {items.map(({ id, label, href, icon: Icon }) => {
        const isHashRoute = href.includes("#");
        const isActive = isHashRoute ? route === href : activePath === href;
        const count = countForHref?.(href) || 0;

        return (
          <li key={id}>
            <Link
              to={href}
              onClick={close}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-4 text-sm font-medium
                          ${
                            isActive
                              ? "bg-white text-black"
                              : "text-gray-300 hover:bg-gray-800"
                          }
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

function DrawerFooter({ profile, close, logout }) {
  return (
    <div className="space-y-4 bg-gradient-to-t from-black/90 to-black/70 p-4 shadow-inner">
      <div className="flex items-center gap-3">
        <Avatar url={profile.avatar_url} className="h-11 w-11" />

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {profile.full_name || "Χρήστης"}
          </p>
          <p className="truncate text-xs text-gray-400">{profile.email}</p>
        </div>
      </div>

      <Link
        to="/user#profile"
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
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-800/20 px-4 py-3 text-red-300 hover:bg-red-700/30"
      >
        <LogOut className="h-5 w-5" /> Αποσύνδεση
      </button>
    </div>
  );
}

/* -------------------- Bottom nav -------------------- */
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

function BottomNav({ items, route, drawerOpen, openDrawer, countForHref }) {
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
        <div
          className="relative flex items-center justify-between gap-2 rounded-lg 
                border border-white/10 
                bg-black/40 backdrop-blur-xl px-4 py-3 
                shadow-[0_8px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.04)]"
        >
          <div
            className="pointer-events-none absolute inset-0 rounded-lg 
                bg-gradient-to-b from-black/30 via-black/10 to-transparent"
          />

          <div className="relative z-10 flex w-full items-center justify-between">
            {items.map(({ href, label, icon }) => {
              const isActive = href !== "drawer" && route === href;
              const count = countForHref?.(href) || 0;

              return (
                <NavBtn
                  key={label}
                  href={href !== "drawer" ? href : null}
                  label={label}
                  icon={icon}
                  active={isActive}
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