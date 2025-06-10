// backend/supabaseClient.js
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

/* ────────────────────────────────────────────────
   Validate env vars up-front (fail fast & clear)
─────────────────────────────────────────────────*/
const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY
} = process.env;

if (!SUPABASE_URL)
  throw new Error("❌ SUPABASE_URL env var is missing (check backend/.env)");
if (!SUPABASE_ANON_KEY)
  throw new Error("❌ SUPABASE_ANON_KEY env var is missing (check backend/.env)");
if (!SUPABASE_SERVICE_ROLE_KEY)
  throw new Error(
    "❌ SUPABASE_SERVICE_ROLE_KEY env var is missing (check backend/.env)"
  );

/* ────────────────────────────────────────────────
   Two separate clients
   • supabaseAdmin  – uses service-role key (full access)
   • supabasePublic – uses anon key (JWT verify, safe)
─────────────────────────────────────────────────*/
export const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const supabasePublic = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
