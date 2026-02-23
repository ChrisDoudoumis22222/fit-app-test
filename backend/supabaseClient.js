// backend/supabaseClient.js
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

/* ───────────────── env checks (backend only) ───────────────── */
const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

if (!SUPABASE_URL) {
  throw new Error("❌ SUPABASE_URL missing (set it in Vercel → Project → Env or backend/.env)");
}
if (!SUPABASE_ANON_KEY) {
  throw new Error("❌ SUPABASE_ANON_KEY missing (set it in Vercel → Project → Env or backend/.env)");
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("❌ SUPABASE_SERVICE_ROLE_KEY missing (backend only)");
}

/* ─────────────── singleton helpers (reuse across invocations) ───────────────
   Vercel serverless may import this file multiple times. Cache instances on
   globalThis to avoid re-creating clients per request.
--------------------------------------------------------------------------- */
const g = globalThis;

function makeClient(key) {
  return createClient(SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    // Optional headers—handy for tracing
    global: {
      headers: { "X-Client-Info": "peakvelocity-backend" },
    },
  });
}

export const supabaseAdmin =
  g.__sv_supabaseAdmin || (g.__sv_supabaseAdmin = makeClient(SUPABASE_SERVICE_ROLE_KEY));

export const supabasePublic =
  g.__sv_supabasePublic || (g.__sv_supabasePublic = makeClient(SUPABASE_ANON_KEY));
