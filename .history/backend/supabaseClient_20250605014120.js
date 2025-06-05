import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

/* Detect whether we really have an admin key */
export const HAS_ADMIN = !!(
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY.trim().length > 0
);

export const supabase = createClient(
  process.env.SUPABASE_URL,
  HAS_ADMIN
    ? process.env.SUPABASE_SERVICE_ROLE_KEY      // full access
    : process.env.SUPABASE_ANON_KEY,             // fallback to anon
  { auth: { autoRefreshToken: false, persistSession: false } }
);
