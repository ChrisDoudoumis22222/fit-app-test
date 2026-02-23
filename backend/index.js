// backend/index.js
import express from "express";
import cors from "cors";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";

import { supabaseAdmin, supabasePublic } from "./supabaseClient.js";
import { requireAuth } from "./authMiddleware.js";
import searchRouter from "./routes/searchRoutes.js";

const app = express();

/* ───────────────────────── Core middleware ───────────────────────── */
app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*", // set your FE origin in prod
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));

/* CORS preflight for any /api/* route (serverless-safe) */
app.options("/api/*", (_req, res) => {
  res.set({
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  });
  return res.status(204).end();
});

/* ───────────────────────── Health/basic ───────────────────────── */
app.get("/api/health", (_req, res) =>
  res.json({ ok: true, ts: new Date().toISOString() })
);

app.get("/", (_req, res) => res.send("Backend up 🚀"));

/* ───────────────────────── Auth & profile ───────────────────────── */
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

  if (!email || !password)
    return res.status(400).json({ error: "email and password are required" });

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
    console.error("POST /api/signup error:", err);
    return res.status(400).json({ error: err.message });
  }
});

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
    console.error("GET /api/profile error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/trainer/secret", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabasePublic
      .from("profiles")
      .select("role")
      .eq("id", req.user.id)
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (data?.role !== "trainer")
      return res.status(403).json({ error: "Not a trainer" });

    res.json({ message: "🎉 trainer-only data" });
  } catch (err) {
    console.error("GET /api/trainer/secret error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/update-diploma", requireAuth, async (req, res) => {
  const { diploma_url } = req.body;
  const trainerId = req.user.id;

  if (!diploma_url)
    return res.status(400).json({ error: "Missing diploma_url" });

  try {
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ diploma_url })
      .eq("id", trainerId);

    if (error) throw error;
    return res.json({ message: "Diploma URL updated" });
  } catch (err) {
    console.error("POST /api/update-diploma error:", err);
    return res.status(500).json({ error: err.message });
  }
});

/* ───────────────────────── GOALS – CRUD ───────────────────────── */
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

  if (!title) return res.status(400).json({ error: "title is required" });

  try {
    const { data, error } = await supabaseAdmin
      .from("goals")
      .insert([
        {
          user_id: req.user.id,
          title,
          description,
          category,
          target_value,
          unit,
          progress_value,
          status,
          due_date,
        },
      ])
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

    if (!row || row.user_id !== req.user.id)
      return res.status(403).json({ error: "Forbidden" });

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

    if (!row || row.user_id !== req.user.id)
      return res.status(403).json({ error: "Forbidden" });

    const { data, error } = await supabaseAdmin
      .from("goals")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
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

    if (!row || row.user_id !== req.user.id)
      return res.status(403).json({ error: "Forbidden" });

    const { error } = await supabaseAdmin.from("goals").delete().eq("id", id);
    if (error) throw error;

    return res.json({ message: "deleted" });
  } catch (err) {
    console.error("DELETE /api/goals/:id error:", err);
    return res.status(500).json({ error: err.message });
  }
});

/* ───────────────────────── Search routes ───────────────────────── */
app.use("/api/search", searchRouter);

/* ───────────────────────── 404 for unknown API routes ───────────────────────── */
app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

/* ───────────────────────── Error handler ───────────────────────── */
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

/* ───────────────────────── Start server when run directly ───────────────────────── */
// Works on Windows + ESM
const __filename = fileURLToPath(import.meta.url);
const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectRun) {
  const PORT = Number(process.env.PORT) || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

export default app; // keep for serverless usage