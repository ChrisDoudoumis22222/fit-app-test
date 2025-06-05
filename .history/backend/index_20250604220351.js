import express from "express";
import cors from "cors";
import { requireAuth } from "./authMiddleware.js";
import { supabase } from "./supabaseClient.js";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (_, res) => res.send("Backend up 🚀"));

app.get("/api/profile", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", req.user.id)
    .single();

  if (error) return res.status(500).json({ error });
  res.json(data);
});

app.get("/api/trainer/secret", requireAuth, async (req, res) => {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", req.user.id)
    .single();

  if (data?.role !== "trainer")
    return res.status(403).json({ error: "Not a trainer" });

  res.json({ message: "🎉 trainer-only data" });
});

app.listen(PORT, () =>
  console.log(`✅  Backend running at http://localhost:${PORT}`)
);
