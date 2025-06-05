// backend/supabaseClient.js
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

/*────── validate env vars ──────*/
const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY
} = process.env;

if (!SUPABASE_URL)
  throw new Error("❌ SUPABASE_URL env var missing (check backend/.env)");
if (!SUPABASE_ANON_KEY)
  throw new Error("❌ SUPABASE_ANON_KEY env var missing (check backend/.env)");
if (!SUPABASE_SERVICE_ROLE_KEY)
  throw new Error(
    "❌ SUPABASE_SERVICE_ROLE_KEY env var missing (check backend/.env)"
  );

/*────── two separate clients ──────*/
export const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,      // full-access key
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const supabasePublic = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,              // anon/public key
  { auth: { autoRefreshToken: false, persistSession: false } }
);
