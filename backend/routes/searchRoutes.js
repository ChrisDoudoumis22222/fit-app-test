// backend/routes/search.js
import express from "express";
import { supabaseAdmin } from "../supabaseClient.js";

const router = express.Router();

/* ----------------------------- utils ----------------------------- */
const norm = (s = "") =>
  String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents (works for Greek too)
    .trim();

const contains = (hay, needle) => norm(hay).includes(norm(needle));

/* ----------------------------- PAGES ----------------------------- */
/** Trainer area pages (adjust hrefs/labels if yours differ) */
const PAGES = [
  {
    id: "trainer-home",
    label: "Πίνακας",
    href: "/trainer",
    keywords: ["dashboard", "πινακας", "home", "αρχικη"],
  },
  {
    id: "trainer-schedule",
    label: "Πρόγραμμα",
    href: "/trainer/schedule",
    keywords: ["schedule", "προγραμμα", "ραντεβου", "ημερολογιο", "calendar"],
  },
  {
    id: "trainer-bookings",
    label: "Κρατήσεις",
    href: "/trainer/bookings",
    keywords: ["κρατησεις", "bookings", "ραντεβου"],
  },
  {
    id: "trainer-payments",
    label: "Πληρωμές",
    href: "/trainer/payments",
    keywords: ["πληρωμες", "payments", "τιμολογια", "χρεωσεις"],
  },
  {
    id: "trainer-posts",
    label: "Αναρτήσεις",
    href: "/trainer/posts",
    keywords: ["αναρτησεις", "post", "posts", "αρθρα", "blog", "content"],
  },
  {
    id: "all-posts",
    label: "Όλες οι Αναρτήσεις",
    href: "/posts",
    keywords: ["ολες οι αναρτησεις", "posts", "blog", "αναρτησεις"],
  },
  {
    id: "market-services",
    label: "Προπονητές",
    href: "/services",
    keywords: ["προπονητες", "αγορα", "services", "marketplace", "coaches"],
  },
  {
    id: "trainer-settings-profile",
    label: "Ρυθμίσεις • Πληροφορίες",
    href: "/trainer#dashboard",
    keywords: ["ρυθμισεις", "profile", "πληροφοριες", "settings"],
  },
  {
    id: "trainer-settings-avatar",
    label: "Ρυθμίσεις • Avatar",
    href: "/trainer#avatar",
    keywords: ["avatar", "φωτο", "εικονα", "profile photo"],
  },
  {
    id: "trainer-settings-security",
    label: "Ρυθμίσεις • Ασφάλεια",
    href: "/trainer#security",
    keywords: ["ασφαλεια", "security", "κωδικος", "password", "2fa"],
  },
];

/* ----------------------------- search helpers ----------------------------- */
function searchPages(qRaw, limit = 6) {
  const q = norm(qRaw);
  if (!q || q.length < 2) return [];

  const scored = PAGES.map((p) => {
    const text = `${p.label} ${p.href} ${(p.keywords || []).join(" ")}`;
    const hit =
      contains(p.label, q) ||
      contains(p.href, q) ||
      (p.keywords || []).some((k) => contains(k, q));

    // simple scoring: label match > keyword > href
    let score = 0;
    if (contains(p.label, q)) score += 3;
    if ((p.keywords || []).some((k) => contains(k, q))) score += 2;
    if (contains(p.href, q)) score += 1;

    return { ...p, hit, score };
  })
    .filter((x) => x.hit)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ id, label, href }) => ({ id, label, href }));

  return scored;
}

async function searchTrainers(qRaw, limit = 10) {
  const q = String(qRaw || "").trim();
  if (!q || q.length < 2) return [];

  // Sanitize wildcards for ILIKE
  const safe = q.replace(/[%_]/g, "");

  // OR search a few text cols
  const orExpr =
    `full_name.ilike.%${safe}%,` +
    `email.ilike.%${safe}%,` +
    `specialty.ilike.%${safe}%,` +
    `location.ilike.%${safe}%`;

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, avatar_url, specialty, roles, location, role")
    .eq("role", "trainer")
    .or(orExpr)
    .limit(50);

  if (error) throw error;

  const qn = norm(q);
  const filtered = (data || []).filter((row) => {
    const inRoles =
      Array.isArray(row.roles) &&
      row.roles.some((r) => norm(String(r)).includes(qn));
    return (
      inRoles ||
      norm(row.full_name || "").includes(qn) ||
      norm(row.specialty || "").includes(qn) ||
      norm(row.location || "").includes(qn) ||
      norm(row.email || "").includes(qn)
    );
  });

  return filtered.slice(0, limit).map((row) => ({
    id: row.id,
    name: row.full_name,
    avatar_url: row.avatar_url,
    specialty: row.specialty,
    roles: row.roles || [],
    location: row.location,
    url: `/services/${row.id}`, // public trainer page
  }));
}

/* ----------------------------- routes ----------------------------- */
// GET /api/search/pages?q=...&limit=6
router.get("/pages", async (req, res) => {
  try {
    const q = req.query.q || "";
    const limit = Math.min(parseInt(req.query.limit || "6", 10), 50);
    const results = searchPages(q, limit);
    res.json({ results });
  } catch (e) {
    console.error("GET /api/search/pages error:", e);
    res.status(500).json({ error: "Search failed" });
  }
});

// GET /api/search/trainers?q=...&limit=10
router.get("/trainers", async (req, res) => {
  try {
    const q = req.query.q || "";
    const limit = Math.min(parseInt(req.query.limit || "10", 10), 50);
    const results = await searchTrainers(q, limit);
    res.json({ results });
  } catch (e) {
    console.error("GET /api/search/trainers error:", e);
    res.status(500).json({ error: "Search failed" });
  }
});

// GET /api/search/all?q=...&limitPages=6&limitTrainers=8
router.get("/all", async (req, res) => {
  try {
    const q = req.query.q || "";
    const limitPages = Math.min(parseInt(req.query.limitPages || "6", 10), 50);
    const limitTrainers = Math.min(parseInt(req.query.limitTrainers || "8", 10), 50);

    const [pages, trainers] = await Promise.all([
      Promise.resolve(searchPages(q, limitPages)),
      searchTrainers(q, limitTrainers),
    ]);

    res.json({ results: { pages, trainers } });
  } catch (e) {
    console.error("GET /api/search/all error:", e);
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
