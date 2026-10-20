import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { COOKIE_NAME, verifySession } from "@/lib/session";
import { validateGoogleReviewUrl } from "@/lib/validate-google-url";

/**
 * CYBER WARS :: CARDS API (PIN-gated)
 * GET  /api/cards          -> list all cards (operator scope)
 * POST /api/cards          -> create card { slug, url }
 * PATCH handled in /api/cards/[id].
 */

const OWNER_ID = process.env.CARDS_OWNER_ID!;

function guard(req: NextRequest): boolean {
  return verifySession(req.cookies.get(COOKIE_NAME)?.value);
}

function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
}

export async function GET(req: NextRequest) {
  if (!guard(req)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("cards")
    .select("id, card_slug, target_google_url, click_count, is_active, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ cards: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!guard(req)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const slug = slugify(String(body?.slug ?? ""));
  const url = String(body?.url ?? "").trim();

  if (slug.length < 4) {
    return NextResponse.json(
      { error: "INVALID_SLUG", message: "Slug minimal 4 karakter alfanumerik." },
      { status: 400 }
    );
  }
  const check = validateGoogleReviewUrl(url);
  if (!check.ok) {
    return NextResponse.json(
      { error: "INVALID_URL", message: check.reason ?? "URL Google tidak valid." },
      { status: 400 }
    );
  }
  if (!OWNER_ID) {
    return NextResponse.json({ error: "SERVER_CONFIG" }, { status: 500 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("cards")
    .insert({ user_id: OWNER_ID, card_slug: slug, target_google_url: url })
    .select("id, card_slug, target_google_url, click_count, is_active, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "SLUG_TAKEN", message: `Slug /${slug} sudah dipakai.` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ card: data }, { status: 201 });
}
