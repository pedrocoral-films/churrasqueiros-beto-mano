import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const APP_ACCESS_KEY = import.meta.env.VITE_APP_ACCESS_KEY || "";
export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && APP_ACCESS_KEY
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          "x-app-access-key": APP_ACCESS_KEY,
        },
      },
    })
  : null;
