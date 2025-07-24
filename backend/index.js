import express from "express";
import cors from "cors";
import "dotenv/config";

import { supabaseAdmin, supabasePublic } from "./supabaseClient.js";
import { requireAuth } from "./authMiddleware.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

/*─────────────────────────────────────────────────────────────
  1) Sign-Up → DB  (creates auth user + profile row)
     Uses supabaseAdmin to bypass RLS on auth.users + profiles
─────────────────────────────────────────────────────────────*/
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
    // 1-a: create user in auth.users (service-role key required)
    const { data: userData, error: userErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // skip confirmation email
      });
    if (userErr) throw userErr;

    // 1-b: insert matching profile row via service-role
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

/*─────────────────────────────────────────────────────────────
  2) Basic test route (public)
─────────────────────────────────────────────────────────────*/
app.get("/", (_, res) => res.send("Backend up 🚀"));

/*─────────────────────────────────────────────────────────────
  3) Protected – get my profile (RLS‐enforced by supabasePublic)
─────────────────────────────────────────────────────────────*/
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

/*─────────────────────────────────────────────────────────────
  4) Protected trainer-only sample (RLS‐enforced by supabasePublic)
─────────────────────────────────────────────────────────────*/
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

/*─────────────────────────────────────────────────────────────
  5) Protected – update my diploma_url (service-role bypass)
─────────────────────────────────────────────────────────────*/
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

/*─────────────────────────────────────────────────────────────
  6) GOALS – CRUD for the logged-in user
     We’ll use supabaseAdmin but manually enforce user_id
     (so we don’t accidentally give cross-user access).
─────────────────────────────────────────────────────────────*/

/**
 * GET /api/goals
 * List my goals
 */
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

/**
 * POST /api/goals
 * Create a goal for the logged-in user
 */
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

/**
 * PATCH /api/goals/:id
 * Update my goal (only if it belongs to me)
 */
app.patch("/api/goals/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const patch = req.body;

  try {
    // First check ownership
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

/**
 * POST /api/goals/:id/complete
 * Mark my goal as completed
 */
app.post("/api/goals/:id/complete", requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    // Validate ownership
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

/**
 * DELETE /api/goals/:id
 * Delete my goal
 */
app.delete("/api/goals/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    // Validate ownership
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

/*─────────────────────────────────────────────────────────────
  Start server
─────────────────────────────────────────────────────────────*/
app.listen(PORT, () =>
  console.log(`✅  Backend running at http://localhost:${PORT}`)
);
