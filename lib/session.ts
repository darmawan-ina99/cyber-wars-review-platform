import { createHmac, timingSafeEqual } from "crypto";

/**
 * CYBER WARS :: PIN SESSION
 * Signed-cookie session for the operator dashboard. No user accounts: the
 * operator proves knowledge of the ACCESS_PIN once, and receives an
 * HMAC-signed, expiring token in an httpOnly cookie.
 */

const SECRET = process.env.SESSION_SECRET!;
export const COOKIE_NAME = "cw_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 hari

function hmac(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

/** Issues a fresh signed session token. */
export function signSession(): string {
  const exp = Date.now() + SESSION_MAX_AGE * 1000;
  return `cw.${exp}.${hmac(`cw.${exp}`)}`;
}

/** Constant-time verification of a session cookie value. */
export function verifySession(token: string | null | undefined): boolean {
  if (!token || !SECRET) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "cw") return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = Buffer.from(hmac(`cw.${parts[1]}`), "hex");
  const given = Buffer.from(parts[2] || "", "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Constant-time comparison of a submitted PIN against the configured code. */
export function verifyPin(input: string, configured: string): boolean {
  const a = createHmac("sha256", "cw-pin").update(input).digest();
  const b = createHmac("sha256", "cw-pin").update(configured).digest();
  return timingSafeEqual(a, b);
}
