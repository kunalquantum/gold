// Phase 5: CDN-cacheable world read
//
// Deploy once with:
//   supabase functions deploy world --no-verify-jwt
//
// The --no-verify-jwt flag makes this function publicly accessible so a CDN
// (Cloudflare, Vercel Edge, etc.) can cache GET responses by URL.
// universe_public is already open to anonymous reads — no security regression.
//
// In Cloudflare: add a Cache Rule matching
//   (http.request.uri.path contains "/functions/v1/world")
// with "Cache Everything" + Edge TTL 30s.  That's it.
//
// Without a CDN, the function still reduces DB load: browsers receive
// Cache-Control: public, max-age=30 and reuse the response for 30 seconds.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAGE_SIZE = 50;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const offset = Math.max(
    0,
    parseInt(new URL(req.url).searchParams.get("offset") ?? "0", 10),
  );

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await sb
    .from("universe_public")
    .select("id, data")
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ rows: data ?? [] }), {
    headers: {
      ...CORS,
      "Content-Type": "application/json",
      // Cache at the CDN edge for 30 s; serve stale for 2 min while revalidating.
      "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
    },
  });
});
