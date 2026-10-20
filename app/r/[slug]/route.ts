import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * CYBER WARS :: DYNAMIC REDIRECT ENGINE
 * GET /r/[slug]
 * Atomic RPC `register_hit` increments click_count and returns target URL.
 * Responds 302 on success, 404 on unknown/inactive slug, 400 on bad input.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const dynamic = "force-dynamic";

function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = slugify(params?.slug ?? "");

  if (!slug || slug.length < 4) {
    return NextResponse.json({ error: "INVALID_SLUG" }, { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, ANON_KEY);
  const { data: target, error } = await supabase.rpc("register_hit", { p_slug: slug });

  if (error || !target) {
    return NextResponse.json(
      { error: "CARD_OFFLINE", message: "Slug tidak ditemukan atau kartu offline." },
      { status: 404 }
    );
  }

  return NextResponse.redirect(target as string, {
    status: 302,
  });
}
