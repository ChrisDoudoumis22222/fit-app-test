// index.js
import express from "express";
import cors from "cors";
import "dotenv/config";

import { supabaseAdmin, supabasePublic } from "./supabaseClient.js";
import { requireAuth } from "./authMiddleware.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

/* ────────────────────────────────────────────────────────────
   Helpers – page catalog + fuzzy search (accent-insensitive)
   ──────────────────────────────────────────────────────────── */
const PAGES = [
  // Trainer app (dashboard + subpages)
  { id: "trainer-home",     label: "Πίνακας (Dashboard)",   href: "/trainer",               tags: ["home", "dashboard", "πινακας", "πίνακας", "trainer", "αρχικη", "αρχική"] },
  { id: "trainer-profile",  label: "Ρυθμίσεις • Πληροφορίες", href: "/trainer#dashboard",   tags: ["settings", "profile", "προφιλ", "προφίλ", "ρυθμισεις", "ρυθμίσεις", "info"] },
  { id: "trainer-avatar",   label: "Ρυθμίσεις • Avatar",     href: "/trainer#avatar",       tags: ["avatar", "εικονα", "εικόνα", "profile photo", "φωτο"] },
  { id: "trainer-security", label: "Ρυθμίσεις • Ασφάλεια",   href: "/trainer#security",     tags: ["security", "password", "ασφαλεια", "ασφάλεια", "κωδικος", "κωδικός"] },
  { id: "trainer-schedule", label: "Πρόγραμμα",              href: "/trainer/schedule",     tags: ["calendar", "schedule", "προγραμμα", "πρόγραμμα", "ημερολογιο", "ημερολόγιο", "ραντεβου", "ραντεβού"] },
  { id: "trainer-bookings", label: "Κρατήσεις",              href: "/trainer/bookings",     tags: ["bookings", "κρατησεις", "κρατήσεις", "ραντεβου", "ραντεβού"] },
  { id: "trainer-payments", label: "Πληρωμές",               href: "/trainer/payments",     tags: ["payments", "πληρωμες", "πληρωμές", "τιμολογια", "τιμολόγια", "χρεωσεις", "χρεώσεις"] },
  { id: "trainer-posts",    label: "Αναρτήσεις μου",         href: "/trainer/posts",        tags: ["posts", "articles", "αναρτησεις", "αναρτήσεις", "blog", "αρθρα", "άρθρα", "content", "αναρτ"] },

  // Public listings / discovery
  { id: "all-posts",        label: "Όλες οι Αναρτήσεις",     href: "/posts",                tags: ["posts", "blog", "ολες οι αναρτησεις", "όλες οι αναρτήσεις", "αναρτ"] },
  { id: "services",         label: "Προπονητές",             href: "/services",             tags: ["trainers", "services", "προπονητες", "προπονητές", "coaches", "marketplace"] },
];

/** Safe normalizer: lowercase, strip diacritics, normalize final sigma */
const stripCombiningMarks = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const norm = (s = "") =>
  stripCombiningMarks(String(s).toLowerCase())
    .replace(/ς/g, "σ")
    .trim();

function scorePage(page, qNorm) {
  const label = norm(page.label);
  const href  = norm(page.href);
  const tags  = (page.tags || []).map(norm);

  let score = 0;
  if (label === qNorm || href === qNorm) score += 100;
  if (label.startsWith(qNorm)) score += 40;
  if (href.startsWith(qNorm)) score += 30;
  if (label.includes(qNorm)) score += 20;
  if (href.includes(qNorm)) score += 15;
  if (tags.some((t) => t === qNorm)) score += 25;
  if (tags.some((t) => t.startsWith(qNorm))) score += 18;
  if (tags.some((t) => t.includes(qNorm))) score += 10;
  return score;
}

function searchPagesLocal(q, limit = 6) {
  const qTrim = String(q || "").trim();
  if (!qTrim || qTrim.length < 2) return [];
  const qNorm = norm(qTrim);

  return PAGES
    .map((p) => ({ ...p, _score: scorePage(p, qNorm) }))
    .filter((p) => p._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, limit)
    .map(({ _score, ...rest }) => rest);
}

/* ────────────────────────────────────────────────────────────
   1) Sign-Up → DB  (creates auth user + profile row)
   ──────────────────────────────────────────────────────────── */
app.post("/api/signup", async (req, res) => {
  const {
    email,
    password,
    full_name = "",
    role = "user",
    specialty = null,
    roles = [],
    location = null,
  } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  try {
    const { data: userData, error: userErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
    if (userErr) throw userErr;

    const { error: profErr } = await supabaseAdmin.from("profiles").insert({
      id: userData.user.id,
      email,
      full_name,
      role,
      specialty,
      roles,
      location,
    });
    if (profErr) throw profErr;

    return res.status(201).json({ message: "user created" });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: err.message });
  }
});

/* ────────────────────────────────────────────────────────────
   2) Basic test route (public)
   ──────────────────────────────────────────────────────────── */
app.get("/", (_, res) => res.send("Backend up 🚀"));

/* ────────────────────────────────────────────────────────────
   3) Protected – get my profile (RLS via supabasePublic)
   ──────────────────────────────────────────────────────────── */
app.get("/api/profile", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabasePublic
      .from("profiles")
      .select(
        "id, email, role, full_name, avatar_url, diploma_url, specialty, roles, location"
      )
      .eq("id", req.user.id)
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* ────────────────────────────────────────────────────────────
   4) Protected trainer-only sample
   ──────────────────────────────────────────────────────────── */
app.get("/api/trainer/secret", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabasePublic
      .from("profiles")
      .select("role")
      .eq("id", req.user.id)
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (data?.role !== "trainer") {
      return res.status(403).json({ error: "Not a trainer" });
    }
    res.json({ message: "🎉 trainer-only data" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* ────────────────────────────────────────────────────────────
   5) Protected – update my diploma_url (service-role bypass)
   ──────────────────────────────────────────────────────────── */
app.post("/api/update-diploma", requireAuth, async (req, res) => {
  const { diploma_url } = req.body;
  const trainerId = req.user.id;

  if (!diploma_url) {
    return res.status(400).json({ error: "Missing diploma_url" });
  }

  try {
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ diploma_url })
      .eq("id", trainerId);

    if (error) throw error;
    return res.json({ message: "Diploma URL updated" });
  } catch (err) {
    console.error("update-diploma error:", err);
    return res.status(500).json({ error: err.message });
  }
});

/* ────────────────────────────────────────────────────────────
   6) GOALS – CRUD
   ──────────────────────────────────────────────────────────── */
app.get("/api/goals", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("goals")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.json(data ?? []);
  } catch (err) {
    console.error("GET /api/goals error:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/goals", requireAuth, async (req, res) => {
  const {
    title,
    description = null,
    category = null,
    target_value = null,
    unit = null,
    progress_value = 0,
    status = "not_started",
    due_date = null,
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: "title is required" });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("goals")
      .insert([{
        user_id: req.user.id,
        title,
        description,
        category,
        target_value,
        unit,
        progress_value,
        status,
        due_date,
      }])
      .select("*")
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (err) {
    console.error("POST /api/goals error:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.patch("/api/goals/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const patch = req.body;

  try {
    const { data: row, error: getErr } = await supabaseAdmin
      .from("goals")
      .select("user_id")
      .eq("id", id)
      .single();
    if (getErr) throw getErr;
    if (!row || row.user_id !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { data, error } = await supabaseAdmin
      .from("goals")
      .update({ ...patch })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return res.json(data);
  } catch (err) {
    console.error("PATCH /api/goals/:id error:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/goals/:id/complete", requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const { data: row, error: getErr } = await supabaseAdmin
      .from("goals")
      .select("user_id")
      .eq("id", id)
      .single();
    if (getErr) throw getErr;
    if (!row || row.user_id !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { data, error } = await supabaseAdmin
      .from("goals")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;

    return res.json(data);
  } catch (err) {
    console.error("POST /api/goals/:id/complete error:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.delete("/api/goals/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const { data: row, error: getErr } = await supabaseAdmin
      .from("goals")
      .select("user_id")
      .eq("id", id)
      .single();
    if (getErr) throw getErr;
    if (!row || row.user_id !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { error } = await supabaseAdmin.from("goals").delete().eq("id", id);
    if (error) throw error;

    return res.json({ message: "deleted" });
  } catch (err) {
    console.error("DELETE /api/goals/:id error:", err);
    return res.status(500).json({ error: err.message });
  }
});

/* ────────────────────────────────────────────────────────────
   7) Public – trainers search (DB)
   GET /api/search/trainers?q=...&limit=10
   ──────────────────────────────────────────────────────────── */
async function searchTrainersInDb(qRaw, limit) {
  const qTrim = String(qRaw || "").trim();
  if (!qTrim || qTrim.length < 2) return [];
  const q = qTrim.replace(/[%_]/g, ""); // tame wildcards
  const qLower = norm(q);

  const orExpr =
    `full_name.ilike.%${q}%,` +
    `email.ilike.%${q}%,` +
    `specialty.ilike.%${q}%,` +
    `location.ilike.%${q}%`;

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, avatar_url, specialty, roles, location, role")
    .eq("role", "trainer")
    .or(orExpr)
    .limit(Math.min(limit || 50, 50));

  if (error) throw error;

  const filtered = (data || []).filter((row) => {
    const inRoles =
      Array.isArray(row.roles) &&
      row.roles.some((r) => norm(String(r)).includes(qLower));
    return (
      inRoles ||
      norm(row.full_name || "").includes(qLower) ||
      norm(row.specialty || "").includes(qLower) ||
      norm(row.location || "").includes(qLower) ||
      norm(row.email || "").includes(qLower)
    );
  });

  return filtered.slice(0, Math.min(limit || 10, 50)).map((row) => ({
    id: row.id,
    name: row.full_name,
    avatar_url: row.avatar_url,
    specialty: row.specialty,
    roles: row.roles || [],
    location: row.location,
    // detail page (may be protected in your app)
    url: `/services/${row.id}`,
    // always-public landing (list) with preselection
    publicUrl: `/services?trainer=${row.id}`,
  }));
}

app.get("/api/search/trainers", async (req, res) => {
  try {
    const q = req.query.q || "";
    const limit = parseInt(req.query.limit || "10", 10);
    const results = await searchTrainersInDb(q, limit);
    return res.json({ results });
  } catch (err) {
    console.error("GET /api/search/trainers error:", err);
    return res.status(500).json({ error: "Search failed" });
  }
});

/* ────────────────────────────────────────────────────────────
   8) Public – pages search (in-memory over PAGES)
   GET /api/search/pages?q=...&limit=6
   ──────────────────────────────────────────────────────────── */
app.get("/api/search/pages", async (req, res) => {
  try {
    const q = req.query.q || "";
    const limit = Math.min(parseInt(req.query.limit || "6", 10), 25);
    const results = searchPagesLocal(q, limit);
    return res.json({ results });
  } catch (err) {
    console.error("GET /api/search/pages error:", err);
    return res.status(500).json({ error: "Search failed" });
  }
});

/* ────────────────────────────────────────────────────────────
   9) Public – combined search (pages + trainers)
   GET /api/search/all?q=...&limitTrainers=8&limitPages=6
   ──────────────────────────────────────────────────────────── */
app.get("/api/search/all", async (req, res) => {
  try {
    const q = req.query.q || "";
    const limitTrainers = Math.min(parseInt(req.query.limitTrainers || "8", 10), 50);
    const limitPages    = Math.min(parseInt(req.query.limitPages || "6", 10), 25);

    const [pages, trainers] = await Promise.all([
      Promise.resolve(searchPagesLocal(q, limitPages)),
      searchTrainersInDb(q, limitTrainers),
    ]);

    return res.json({ results: { pages, trainers } });
  } catch (err) {
    console.error("GET /api/search/all error:", err);
    return res.status(500).json({ error: "Search failed" });
  }
});

/* ────────────────────────────────────────────────────────────
   Start server
   ──────────────────────────────────────────────────────────── */
app.listen(PORT, () =>
  console.log(`✅  Backend running at http://localhost:${PORT}`)
);
