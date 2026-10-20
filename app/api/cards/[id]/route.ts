import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { COOKIE_NAME, verifySession } from "@/lib/session";
import { validateGoogleReviewUrl } from "@/lib/validate-google-url";

/**
 * CYBER WARS :: CARD UPDATE (PIN-gated)
 * PATCH /api/cards/[id] { target_google_url?, is_active? }
 */

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!verifySession(req.cookies.get(COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};

  if (typeof body?.is_active === "boolean") patch.is_active = body.is_active;
  if (typeof body?.target_google_url === "string" && body.target_google_url.trim()) {
    const url = body.target_google_url.trim();
    const check = validateGoogleReviewUrl(url);
    if (!check.ok) {
      return NextResponse.json(
        { error: "INVALID_URL", message: check.reason ?? "URL Google tidak valid." },
        { status: 400 }
      );
    }
    patch.target_google_url = url;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "NOTHING_TO_UPDATE" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("cards")
    .update(patch)
    .eq("id", params.id)
    .select("id, card_slug, target_google_url, click_count, is_active, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({ card: data });
}
