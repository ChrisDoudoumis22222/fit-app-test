// backend/authMiddleware.js
import { supabasePublic } from "./supabaseClient.js"; // anon-key client

// simple cookie parser (no external deps)
function getCookie(req, name) {
  const raw = req.headers?.cookie || "";
  if (!raw) return null;
  const parts = raw.split(";").map((p) => p.trim());
  for (const p of parts) {
    const [k, ...v] = p.split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

function getTokenFromRequest(req) {
  // 1) Authorization header (Bearer <token> or raw token)
  const rawHeader = req.headers?.authorization || "";
  if (rawHeader) {
    if (rawHeader.startsWith("Bearer ")) return rawHeader.slice(7).trim();
    if (rawHeader.length > 10) return rawHeader.trim();
  }

  // 2) Supabase auth cookies (when using @supabase/ssr or Auth Helpers)
  //    sb-access-token is the access token cookie name set by Supabase
  const cookieToken =
    getCookie(req, "sb-access-token") ||
    getCookie(req, "access_token") || // fallback names if you customized
    null;
  if (cookieToken) return cookieToken;

  // 3) Optional: query param for dev tools (never rely on this in prod)
  const qp = req.query?.access_token || req.query?.token;
  if (qp && typeof qp === "string" && qp.length > 10) return qp;

  return null;
}

export const requireAuth = async (req, res, next) => {
  // Let CORS preflight through (Vercel/serverless safe)
  if (req.method === "OPTIONS") return res.status(204).end();

  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  // Verify JWT with Supabase
  const { data, error } = await supabasePublic.auth.getUser(token);
  const user = data?.user;

  if (error || !user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // Attach to request
  req.user = user;
  req.authToken = token; // handy if you need it downstream
  return next();
};
