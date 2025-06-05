import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

// Client that can verify JWTs (use anon key here)
const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token" });

  const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: "Invalid token" });

  req.user = user;
  next();
};
