// Cloudflare Worker — caching proxy for the universe_public world feed.
//
// Deploy:
//   npm install -g wrangler
//   wrangler login
//   # Edit wrangler.toml: set SUPABASE_FUNCTION_URL to your project's function URL
//   wrangler deploy
//
// Then set VITE_WORLD_CACHE_URL=https://gold-world-cache.<your-subdomain>.workers.dev
// in your app's environment (Vercel/Netlify dashboard, or .env.production).
//
// How it works:
//   - All users hitting the same offset share one cached response for 30 s.
//   - Cloudflare's request coalescing collapses concurrent cache-miss fetches
//     into a single upstream call, so the Supabase Edge Function is never
//     hammered by a thundering herd.
//   - stale-while-revalidate=120 means stale data is served instantly while
//     the cache refreshes in the background — zero latency spikes.

const CACHE_TTL = 30; // seconds — must match Edge Function Cache-Control

export default {
  async fetch(request, env, ctx) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "content-type",
        },
      });
    }

    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    const url = new URL(request.url);
    const offset = Math.max(
      0,
      parseInt(url.searchParams.get("offset") ?? "0", 10),
    );

    // Canonical cache key — identical for all users at this offset.
    const upstreamUrl = `${env.SUPABASE_FUNCTION_URL}?offset=${offset}`;
    const cacheKey = new Request(upstreamUrl);

    // ── Cache hit ──────────────────────────────────────────────────────────
    const cached = await caches.default.match(cacheKey);
    if (cached) {
      const hit = new Response(cached.body, cached);
      hit.headers.set("X-Cache", "HIT");
      hit.headers.set("Access-Control-Allow-Origin", "*");
      return hit;
    }

    // ── Cache miss: fetch from Supabase Edge Function ──────────────────────
    let upstream;
    try {
      upstream = await fetch(upstreamUrl);
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (!upstream.ok) {
      // Pass error through without caching.
      const errBody = await upstream.text();
      return new Response(errBody, {
        status: upstream.status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const body = await upstream.text();
    const toCache = new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${CACHE_TTL}, stale-while-revalidate=120`,
        "Access-Control-Allow-Origin": "*",
        "X-Cache": "MISS",
      },
    });

    // Store in Cloudflare's cache — shared across all edge nodes globally.
    ctx.waitUntil(caches.default.put(cacheKey, toCache.clone()));

    return toCache;
  },
};
