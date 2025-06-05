import express from "express";
import cors from "cors";
import "dotenv/config";
import { supabase, HAS_ADMIN } from "./supabaseClient.js";

const app = express();
app.use(cors());
app.use(express.json());

/*─────────────────────────────────────────────────────────────
  SAFE SIGN-UP ROUTE — works with or without admin key
─────────────────────────────────────────────────────────────*/
app.post("/api/signup", async (req, res) => {
  const { email, password, full_name = "", role = "user" } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "email and password are required" });

  try {
    let userId;

    if (HAS_ADMIN) {
      /* 1-A  Admin flow (service-role key) */
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) throw error;
      userId = data.user.id;
    } else {
      /* 1-B  Public flow (anon key) */
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      userId = data.user.id;
    }

    /* 2) Insert profile row (works in either case) */
    const { error: profErr } = await supabase.from("profiles").insert({
      id: userId,
      full_name,
      role,
    });
    if (profErr) throw profErr;

    return res.status(201).json({ message: "user created", id: userId });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: err.message });
  }
});

/* …keep the rest of index.js unchanged… */
