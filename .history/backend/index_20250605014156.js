import express from "express";
import cors from "cors";
import "dotenv/config";
import { supabaseAdmin } from "./supabaseClient.js";  // service-role client
import { requireAuth } from "./authMiddleware.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

/*─────────────────────────────────────────────────────────────
  1) Sign-Up → DB  (creates auth user + profile row)
─────────────────────────────────────────────────────────────*/
app.post("/api/signup", async (req, res) => {
  const { email, password, full_name = "", role = "user" } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  try {
    /* 1-a  create user in auth.users (service-role key required) */
    const { data: userData, error: userErr } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true            // skip confirmation email
      });
    if (userErr) throw userErr;

    /* 1-b  insert matching profile row */
    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userData.user.id,
        full_name,
        role
      });
    if (profErr) throw profErr;

    return res.status(201).json({ message: "user created" });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: err.message });
  }
});

/*─────────────────────────────────────────────────────────────
  2) Basic test route
─────────────────────────────────────────────────────────────*/
app.get("/", (_, res) => res.send("Backend up 🚀"));

/*─────────────────────────────────────────────────────────────
  3) Protected – get my profile
─────────────────────────────────────────────────────────────*/
app.get("/api/profile", requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role, full_name")
    .eq("id", req.user.id)
    .single();

  if (error) return res.status(500).json({ error });
  res.json(data);
});

/*─────────────────────────────────────────────────────────────
  4) Protected trainer-only sample
─────────────────────────────────────────────────────────────*/
app.get("/api/trainer/secret", requireAuth, async (req, res) => {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", req.user.id)
    .single();

  if (data?.role !== "trainer")
    return res.status(403).json({ error: "Not a trainer" });

  res.json({ message: "🎉 trainer-only data" });
});

/*─────────────────────────────────────────────────────────────
  Start server
─────────────────────────────────────────────────────────────*/
app.listen(PORT, () =>
  console.log(`✅  Backend running at http://localhost:${PORT}`)
);
