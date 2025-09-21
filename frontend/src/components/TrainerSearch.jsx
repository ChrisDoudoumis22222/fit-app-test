// src/components/TrainerSearch.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, FileText, User as UserIcon, CircleHelp, Loader2 } from "lucide-react";

const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;
const FAQ_URL = "/faq"; // ensure your TrainerFAQPage is routed here

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
const SEARCH_ALL = `${API_BASE}/search/all`;

// ===== Auto-redirect behavior when nothing found =====
const AUTO_REDIRECT = true;
const AUTO_REDIRECT_MS = 800;

/* -------------------- Greek utils -------------------- */
const stripCombining = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const norm = (s = "") => stripCombining(String(s).toLowerCase()).replace(/ς/g, "σ").trim();
const isASCII = (s) => /^[\x00-\x7F]*$/.test(s);

function greeklishToGreek(input = "") {
  let s = String(input).toLowerCase();
  const digraphs = [
    ["th", "θ"], ["ch", "χ"], ["ps", "ψ"], ["ks", "ξ"], ["nt", "ντ"], ["mp", "μπ"], ["gk", "γκ"],
    ["tz", "τζ"], ["ts", "τσ"], ["ou", "ου"], ["ai", "αι"], ["ei", "ει"], ["oi", "οι"], ["ui", "υι"], ["au", "αυ"], ["eu", "ευ"],
  ];
  for (const [latin, gr] of digraphs) s = s.replace(new RegExp(latin, "g"), gr);
  const map = { a:"α", b:"β", c:"κ", d:"δ", e:"ε", f:"φ", g:"γ", h:"η", i:"ι", j:"τζ", k:"κ", l:"λ", m:"μ", n:"ν", o:"ο", p:"π", q:"κ", r:"ρ", s:"σ", t:"τ", u:"υ", v:"β", w:"ω", x:"ξ", y:"υ", z:"ζ" };
  let out = ""; for (const ch of s) out += map[ch] ?? ch; return out;
}

/* ---- Greek display names (never show path) ---- */
const PATH_GREEK = {
  "/trainer": "Πίνακας", "/trainer/schedule": "Πρόγραμμα", "/trainer/bookings": "Κρατήσεις",
  "/trainer/payments": "Πληρωμές", "/trainer/posts": "Αναρτήσεις μου", "/posts": "Όλες οι Αναρτήσεις", "/services": "Προπονητές",
};
const HASH_GREEK = { "#dashboard": "Ρυθμίσεις • Πληροφορίες", "#avatar": "Ρυθμίσεις • Avatar", "#security": "Ρυθμίσεις • Ασφάλεια" };
const SEG_GREEK = { trainer:"Προπονητής", schedule:"Πρόγραμμα", bookings:"Κρατήσεις", payments:"Πληρωμές", posts:"Αναρτήσεις", services:"Προπονητές", dashboard:"Πίνακας", avatar:"Avatar", security:"Ασφάλεια" };
const hasGreek = (s = "") => /[Α-ω]/.test(s);

function greekPageTitle(p = {}) {
  if (p.label && hasGreek(p.label) && p.label !== p.href) return p.label;
  const href = p.href || ""; const [path, rawHash] = href.split("#"); const hash = rawHash ? `#${rawHash}` : "";
  if (hash && HASH_GREEK[hash]) return HASH_GREEK[hash];
  if (PATH_GREEK[path]) return PATH_GREEK[path];
  const seg = (path || "").split("/").filter(Boolean).pop();
  if (seg && SEG_GREEK[seg]) return SEG_GREEK[seg];
  return p.label && p.label !== href ? p.label : "Σελίδα";
}

/* --------------------------- Component ---------------------------
   Props:
   - ui: "panel" | "inline"
   - className
   - onSelectHref?: (href) => void
------------------------------------------------------------------*/
export default function TrainerSearch({ ui = "panel", className = "", onSelectHref }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(ui === "inline");
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [flatIdx, setFlatIdx] = useState(-1);

  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const abortRef = useRef(null);
  const redirectTimeoutRef = useRef(null);

  // small, built-in list so the panel isn’t empty before typing
  const ALL_PAGES = useMemo(() => [
    { id:"trainer-home",     label:"Πίνακας",                  href:"/trainer" },
    { id:"trainer-profile",  label:"Ρυθμίσεις • Πληροφορίες",  href:"/trainer#dashboard" },
    { id:"trainer-avatar",   label:"Ρυθμίσεις • Avatar",       href:"/trainer#avatar" },
    { id:"trainer-security", label:"Ρυθμίσεις • Ασφάλεια",     href:"/trainer#security" },
    { id:"trainer-schedule", label:"Πρόγραμμα",                href:"/trainer/schedule" },
    { id:"trainer-bookings", label:"Κρατήσεις",                href:"/trainer/bookings" },
    { id:"trainer-payments", label:"Πληρωμές",                 href:"/trainer/payments" },
    { id:"trainer-posts",    label:"Αναρτήσεις μου",           href:"/trainer/posts" },
    { id:"all-posts",        label:"Όλες οι Αναρτήσεις",       href:"/posts" },
    { id:"services",         label:"Προπονητές",               href:"/services" },
  ], []);

  const buildFaqUrl = (term) => term?.trim()?.length ? `${FAQ_URL}?q=${encodeURIComponent(term.trim())}` : FAQ_URL;

  const flatList = useMemo(() => {
    const qShort = q.trim().length < MIN_CHARS;
    const usePages = qShort ? ALL_PAGES : pages;
    const pageItems = (usePages || []).map((p) => ({ type:"page", id:p.id, title:greekPageTitle(p), href:p.href }));
    const trainerItems = qShort ? [] : (trainers || []).map((t) => ({
      type:"trainer", id:t.id, title:t.name || "Προπονητής",
      subtitle:[t.specialty, t.location].filter(Boolean).join(" • "),
      href:t.url || `/services/${t.id}`, avatar_url:t.avatar_url || null,
    }));
    return [...pageItems, ...trainerItems];
  }, [q, ALL_PAGES, pages, trainers]);

  // outside click (inline only)
  useEffect(() => {
    if (ui !== "inline") return;
    const onClickOutside = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); setFlatIdx(-1); } };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [ui]);

  // normalize backend
  const normalizeResults = (data) => {
    const rawPages = data?.results?.pages ?? data?.pages ?? [];
    const rawTrainers = data?.results?.trainers ?? data?.trainers ?? [];
    const pages = rawPages.map((p, i) => ({ id:p.id ?? p.slug ?? p.href ?? `page-${i}`, label:p.label ?? p.title ?? p.name ?? p.href ?? "", href:p.href ?? p.url ?? "#" }));
    const trainers = rawTrainers.map((t, i) => ({ id:t.id ?? t.user_id ?? `trainer-${i}`, name:t.name ?? t.full_name ?? t.username ?? "Προπονητής", avatar_url:t.avatar_url ?? t.profile_pic ?? null, specialty:t.specialty ?? t.category ?? null, location:t.city ?? t.location ?? null, url:t.url ?? (t.id ? `/services/${t.id}` : null) }));
    return { pages, trainers };
  };

  // clear any pending auto-redirect
  const clearPendingRedirect = () => {
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }
  };

  // debounced fetch
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) { try { abortRef.current.abort(); } catch {} }
    clearPendingRedirect();

    const query = q.trim();
    if (!query || query.length < MIN_CHARS) {
      setPages([]); setTrainers([]); setLoading(false);
      return;
    }

    const fetchAll = async (term, signal) => {
      const qs = new URLSearchParams({ q: term, limitPages:"10", limitTrainers:"8" }).toString();
      let res, data;
      try { res = await fetch(`${SEARCH_ALL}?${qs}`, { signal, credentials:"include" }); if (!res.ok) throw 0; data = await res.json(); }
      catch { const r2 = await fetch(`/api/search/all?${qs}`, { signal, credentials:"include" }); if (!r2.ok) throw 0; data = await r2.json(); }
      return normalizeResults(data);
    };

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController(); abortRef.current = controller; setLoading(true);
      try {
        let term = query;
        let { pages: p, trainers: t } = await fetchAll(term, controller.signal);

        if ((!p?.length && !t?.length) && isASCII(term)) {
          const gl = greeklishToGreek(term);
          if (gl && gl !== term) {
            term = gl;
            ({ pages: p, trainers: t } = await fetchAll(term, controller.signal));
          }
        }

        setPages(Array.isArray(p) ? p : []);
        setTrainers(Array.isArray(t) ? t : []);
        setOpen(true);
        setFlatIdx(-1);

        // ===== Auto-redirect to FAQ if nothing found =====
        if (AUTO_REDIRECT && term === q.trim() && (!p?.length && !t?.length)) {
          redirectTimeoutRef.current = setTimeout(() => {
            // guard: if user typed meanwhile, do nothing
            if (term !== q.trim()) return;
            hardNav(buildFaqUrl(term));
          }, AUTO_REDIRECT_MS);
        }
      } catch (err) {
        if (err?.name === "AbortError") return;
        setPages([]); setTrainers([]); setOpen(true); setFlatIdx(-1);

        // On hard failure, still offer FAQ redirect if there is a query
        if (AUTO_REDIRECT && query.length >= MIN_CHARS) {
          redirectTimeoutRef.current = setTimeout(() => {
            if (query !== q.trim()) return;
            hardNav(buildFaqUrl(query));
          }, AUTO_REDIRECT_MS);
        }
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) { try { abortRef.current.abort(); } catch {} }
      clearPendingRedirect();
    };
  }, [q]);

  const hardNav = (href) => {
    if (onSelectHref) return onSelectHref(href);
    if (href) window.location.assign(href);
  };

  const onKeyDown = (e) => {
    const list = flatList;
    if ((ui === "inline" && !open)) return;

    if (e.key === "ArrowDown") {
      e.preventDefault(); setFlatIdx((v) => Math.min(v + 1, list.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault(); setFlatIdx((v) => Math.max(v - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (list.length === 0 && q.trim().length >= MIN_CHARS) {
        // ===== Enter fallback: go to FAQ with query =====
        hardNav(buildFaqUrl(q));
        return;
      }
      const item = flatIdx >= 0 ? list[flatIdx] : list[0];
      if (item?.href) {
        if (ui === "inline") setOpen(false);
        setFlatIdx(-1); setQ("");
        hardNav(item.href);
      }
    } else if (e.key === "Escape") {
      if (ui === "inline") { setOpen(false); setFlatIdx(-1); }
    }
  };

  /* ------------------------ RENDER ------------------------ */
  const InputRow = (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 backdrop-blur">
      <Search className="h-5 w-5 text-white/70" />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => { setQ(e.target.value); }}
        onFocus={() => ui === "inline" && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Αναζήτηση…"
        className="w-full bg-transparent text-sm text-white placeholder-white/40 outline-none"
      />
      {loading && q.trim().length >= MIN_CHARS && <Loader2 className="h-4 w-4 animate-spin text-white/60" />}
      {!!q && !loading && (
        <button
          aria-label="Καθαρισμός"
          onClick={() => {
            setQ(""); setPages([]); setTrainers([]); if (ui === "inline") setOpen(true); setFlatIdx(-1); inputRef.current?.focus();
          }}
          className="rounded-md p-1 hover:bg-white/10"
        >
          <X className="h-4 w-4 text-white/70" />
        </button>
      )}
    </div>
  );

  const PageRow = ({ p, active }) => {
    const title = greekPageTitle(p);
    return (
      <button
        onClick={() => hardNav(p.href)}
        onMouseEnter={() => {
          const i = flatList.findIndex((f) => f.type === "page" && f.id === p.id);
          setFlatIdx(i);
        }}
        className={`flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors
          ${active ? "bg-white/10" : "hover:bg-white/5"}
        `}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10">
          <FileText className="h-4 w-4 text-white/90" />
        </div>
        <p className="truncate text-[15px] text-white">{title}</p>
      </button>
    );
  };

  const TrainerRow = ({ t, active }) => {
    const href = t.url || `/services/${t.id}`;
    return (
      <button
        onClick={() => hardNav(href)}
        onMouseEnter={() => {
          const i = flatList.findIndex((f) => f.type === "trainer" && f.id === t.id);
          setFlatIdx(i);
        }}
        className={`flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors
          ${active ? "bg-white/10" : "hover:bg-white/5"}
        `}
      >
        {t.avatar_url ? (
          <img
            src={t.avatar_url}
            alt=""
            className="h-7 w-7 rounded-full object-cover"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/placeholder.svg?height=60&width=60&text=Avatar"; }}
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
            <UserIcon className="h-4 w-4 text-white/85" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-[15px] text-white">{t.name || "Προπονητής"}</p>
          {([t.specialty, t.location].filter(Boolean).length > 0) && (
            <p className="truncate text-xs text-white/70">{[t.specialty, t.location].filter(Boolean).join(" • ")}</p>
          )}
        </div>
      </button>
    );
  };

  const NothingFound = (
    <div className="px-3 py-4 text-sm text-white/80">
      <div className="flex items-center gap-2">
        <CircleHelp className="h-4 w-4" />
        <span>Δεν βρέθηκαν αποτελέσματα.</span>
      </div>
      <button
        onClick={() => hardNav(buildFaqUrl(q))}
        className="mt-2 rounded-md bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/15"
      >
        Μετάβαση στο FAQ για «{q.trim()}»
      </button>
      <div className="mt-1 text-[11px] text-white/60">Ή πάτησε Enter για αναζήτηση στο FAQ.</div>
    </div>
  );

  if (ui === "panel") {
    // minimal card: input + simple list
    return (
      <div ref={wrapRef} className={`rounded-xl border border-white/10 bg-zinc-900/90 p-3 backdrop-blur ${className}`}>
        {InputRow}
        <div className="mt-2 max-h-[62vh] overflow-y-auto">
          <ul className="space-y-1">
            {(q.trim().length < MIN_CHARS ? ALL_PAGES : pages).map((p) => {
              const i = flatList.findIndex((f) => f.type === "page" && f.id === p.id);
              return <li key={`page-${p.id}`}><PageRow p={p} active={i === flatIdx} /></li>;
            })}

            {q.trim().length >= MIN_CHARS && trainers.length > 0 && (
              <>
                <li><div className="mt-1 mb-1 h-px bg-white/10" /></li>
                {trainers.map((t) => {
                  const i = flatList.findIndex((f) => f.type === "trainer" && f.id === t.id);
                  return <li key={`trainer-${t.id}`}><TrainerRow t={t} active={i === flatIdx} /></li>;
                })}
              </>
            )}

            {q.trim().length >= MIN_CHARS && pages.length === 0 && trainers.length === 0 && (
              <li>{NothingFound}</li>
            )}
          </ul>
        </div>
      </div>
    );
  }

  // inline: input + light dropdown
  const qShort = q.trim().length < MIN_CHARS;
  const Dropdown = open && (
    <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-black/85 backdrop-blur">
      {!qShort && loading ? (
        <div className="flex items-center gap-2 px-3 py-3 text-sm text-white/80">
          <Loader2 className="h-4 w-4 animate-spin" /> Αναζήτηση…
        </div>
      ) : (
        <div className="max-h-[70vh] overflow-auto p-1">
          <ul className="space-y-1">
            {(qShort ? ALL_PAGES : pages).map((p) => {
              const i = flatList.findIndex((f) => f.type === "page" && f.id === p.id);
              return <li key={`page-${p.id}`}><PageRow p={p} active={i === flatIdx} /></li>;
            })}
            {!qShort && trainers.length > 0 && (
              <>
                <li><div className="mt-1 mb-1 h-px bg-white/10" /></li>
                {trainers.map((t) => {
                  const i = flatList.findIndex((f) => f.type === "trainer" && f.id === t.id);
                  return <li key={`trainer-${t.id}`}><TrainerRow t={t} active={i === flatIdx} /></li>;
                })}
              </>
            )}
            {!qShort && pages.length === 0 && trainers.length === 0 && <li>{NothingFound}</li>}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {InputRow}
      {Dropdown}
    </div>
  );
}
