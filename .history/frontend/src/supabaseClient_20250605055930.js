// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// These environment variables must be defined in your React app’s .env:
//   REACT_APP_SUPABASE_URL
//   REACT_APP_SUPABASE_ANON_KEY
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "❌ Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY in your environment."
  );
}

// 1) Create the “public” (RLS-enforced) client
export const supabasePublic = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// 2) Re-export it as `supabase` so old imports keep working
export const supabase = supabasePublic;
