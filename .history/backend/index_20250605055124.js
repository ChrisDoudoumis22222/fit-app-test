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
  const { email, password, full_name = "", role = "user" } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "email and password are required" });
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
    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userData.user.id,
        full_name,
        role,
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
    // Use supabasePublic so RLS policies apply to “profiles”
    const { data, error } = await supabasePublic
      .from("profiles")
      .select("role, full_name, avatar_url, diploma_url")
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
    // Use supabasePublic so RLS policy on profiles restricts by role
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
      Clients POST here instead of writing directly to profiles
─────────────────────────────────────────────────────────────*/
app.post("/api/update-diploma", requireAuth, async (req, res) => {
  const { diploma_url } = req.body;
  const trainerId = req.user.id;

  if (!diploma_url) {
    return res.status(400).json({ error: "Missing diploma_url" });
  }

  try {
    // Perform the update with the service‐role client, bypassing RLS
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
  Start server
─────────────────────────────────────────────────────────────*/
app.listen(PORT, () =>
  console.log(`✅  Backend running at http://localhost:${PORT}`)
);
