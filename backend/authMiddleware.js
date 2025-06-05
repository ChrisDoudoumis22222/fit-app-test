// backend/authMiddleware.js
import { supabasePublic } from "./supabaseClient.js";  // anon-key client

export const requireAuth = async (req, res, next) => {
  /*───────────────────────────────────────────────
    1) Extract token from  Authorization header
       - Accepts "Bearer <token>"   or   "<token>"
  ───────────────────────────────────────────────*/
  const rawHeader = req.headers.authorization || "";
  const token = rawHeader.startsWith("Bearer ")
    ? rawHeader.slice(7)
    : rawHeader;

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  /*───────────────────────────────────────────────
    2) Verify the JWT with the public Supabase client
  ───────────────────────────────────────────────*/
  const {
    data: { user },
    error
  } = await supabasePublic.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  /*───────────────────────────────────────────────
    3) Attach user to request object and continue
  ───────────────────────────────────────────────*/
  req.user = user;
  next();
};
