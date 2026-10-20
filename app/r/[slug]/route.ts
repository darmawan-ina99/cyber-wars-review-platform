import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * CYBER WARS :: DYNAMIC REDIRECT ENGINE
 * GET /r/[slug]
 * Atomic RPC `register_hit` increments click_count and returns target URL.
 * Responds 302 on success, 404 on unknown/inactive slug, 400 on bad input.
 *
 * Caching is explicitly defeated (no-store + revalidate 0 + request-dependent
 * URL read) so every tap is counted.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const dynamic = "force-dynamic";
export const revalidate = 0;

function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  // Touch the request URL: guarantees per-request execution on this handler.
  const _nocacheKey = req.nextUrl.search;

  const slug = slugify(params?.slug ?? "");
  console.log(`[REDIRECT-ENGINE] tap slug=${slug} at ${new Date().toISOString()}`);

  if (!slug || slug.length < 4) {
    return NextResponse.json({ error: "INVALID_SLUG" }, {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { "x-request-key": `tap-${Date.now()}-${Math.random()}` } },
  });
  const { data: target, error } = await supabase.rpc("register_hit", { p_slug: slug });

  if (error || !target) {
    return NextResponse.json(
      { error: "CARD_OFFLINE", message: "Slug tidak ditemukan atau kartu offline." },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  console.log(`[REDIRECT-ENGINE] -> ${target}`);
  const res = NextResponse.redirect(target as string, { status: 302 });
  res.headers.set("Cache-Control", "no-store, must-revalidate, max-age=0");
  res.headers.set("x-cyber-tap", Date.now().toString());
  return res;
}
