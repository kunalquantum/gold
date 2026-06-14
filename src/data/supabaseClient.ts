import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Vite only exposes VITE_-prefixed env vars to the browser. The publishable
// (anon) key is designed to ship in client code.
// .trim() guards against leading/trailing whitespace from copy-paste into
// hosting dashboards — a single tab character turns every API request into
// a 401 because the key gets URL-encoded as %09… and stops matching.
const url = (import.meta.env.VITE_SUPABASE_URL ?? "").trim() || undefined;
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").trim() || undefined;

export const SUPABASE_CONFIGURED = Boolean(url && key);
export const SUPABASE_URL: string | undefined = url;
export const SUPABASE_ANON_KEY: string | undefined = key;
// When set, world reads go through this URL (Cloudflare Worker) instead of
// the Supabase Edge Function directly. Set VITE_WORLD_CACHE_URL in your
// hosting environment after deploying cloudflare/world-cache.
export const WORLD_CACHE_URL: string | undefined =
  (import.meta.env.VITE_WORLD_CACHE_URL ?? "").trim() || undefined;

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

// Surface the config state at boot so a deploy with missing env vars is
// obvious from the console instead of silently dropping every user into
// local-only guest mode.
if (typeof window !== "undefined") {
  if (SUPABASE_CONFIGURED) {
    console.info(`[Universe] Supabase configured — cloud sync active. URL=${url}`);
  } else {
    console.warn(
      "[Universe] Supabase NOT configured — running in local-only mode. " +
      "Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your hosting " +
      "environment (e.g. Vercel → Project Settings → Environment Variables) " +
      "and redeploy.",
    );
  }
}
