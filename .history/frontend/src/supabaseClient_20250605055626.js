// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// These two values must come from your environment; e.g. in Create React App,
// you’d set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in .env

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ ANON_KEY) {
  console.error("Missing REACT_APP_SUPABASE_* environment variables");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
