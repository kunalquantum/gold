import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Vite only exposes VITE_-prefixed env vars to the browser. The publishable
// (anon) key is designed to ship in client code.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const SUPABASE_CONFIGURED = Boolean(url && key);

// Null when no credentials are present — the app then runs fully local.
export const supabase: SupabaseClient | null = SUPABASE_CONFIGURED
  ? createClient(url as string, key as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: "universe.session",
      },
    })
  : null;
