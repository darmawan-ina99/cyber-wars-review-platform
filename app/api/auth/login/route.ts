import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, SESSION_MAX_AGE, signSession, verifyPin } from "@/lib/session";

/**
 * CYBER WARS :: PIN LOGIN
 * POST /api/auth/login  { pin: string }
 * Success -> httpOnly signed session cookie. Failure -> 401 with throttle.
 */

const ACCESS_PIN = process.env.ACCESS_PIN!;
const WINDOW_MS = 5 * 60 * 1000; // window throttle
const MAX_ATTEMPTS = 8;

// Simple in-memory throttle (per server instance). Blunt but effective against
// casual brute force of a 6-digit code.
const failures: number[] = [];

function throttled(): boolean {
  const now = Date.now();
  while (failures.length && now - failures[0] > WINDOW_MS) failures.shift();
  return failures.length >= MAX_ATTEMPTS;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const pin = String(body?.pin ?? "");

  if (throttled()) {
    return NextResponse.json(
      { error: "LOCKED", message: "Terlalu banyak percobaan gagal. Coba lagi 5 menit." },
      { status: 429 }
    );
  }

  if (!ACCESS_PIN) {
    return NextResponse.json({ error: "SERVER_CONFIG" }, { status: 500 });
  }

  if (!pin || !verifyPin(pin, ACCESS_PIN)) {
    failures.push(Date.now());
    return NextResponse.json(
      { error: "INVALID_PIN", message: "Kode akses ditolak." },
      { status: 401 }
    );
  }

  failures.length = 0;
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, signSession(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
