// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnon = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    "Supabase env vars are missing - did you create `.env.local` and restart the dev server?"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnon);
