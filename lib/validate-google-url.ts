/**
 * CYBER WARS :: Google Review URL VALIDATION UNIT
 * Only accepts legitimate Google review / maps place URLs.
 */

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

const ALLOWED_HOSTS = [
  "g.page",
  "search.google.com",
  "www.google.com",
  "google.com",
  "maps.app.goo.gl",
  "www.maps.google.com",
  "maps.google.com",
];

/** Direct review-write patterns (highest confidence). */
const REVIEW_PATTERNS: RegExp[] = [
  /^https:\/\/g\.page\/r\/[a-z0-9_-]+\/review$/i,
  /^https:\/\/search\.google\.com\/local\/writereview\?placeid=[a-z0-9:_-]+$/i,
  /^https:\/\/(www\.)?google\.com\/maps\/write-review/i,
];

/** Broader place / share patterns (accepted, flagged as indirect). */
const PLACE_PATTERNS: RegExp[] = [
  /^https:\/\/g\.page\/r\/[a-z0-9_-]+$/i,
  /^https:\/\/(www\.)?maps\.google\.com\/maps\?.*$/i,
  /^https:\/\/(www\.)?google\.com\/maps\/search\?.*$/i,
  /^https:\/\/maps\.app\.goo\.gl\/[a-z0-9_-]+$/i,
];

export function validateGoogleReviewUrl(raw: string): ValidationResult {
  const input = (raw ?? "").trim();

  if (!input) return { ok: false, reason: "URL kosong. Masukkan tautan ulasan Google." };
  if (input.length > 2048) return { ok: false, reason: "URL terlalu panjang (maks 2048 karakter)." };

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { ok: false, reason: "Format URL tidak valid. Harus diawali https://" };
  }

  if (url.protocol !== "https:") {
    return { ok: false, reason: "Hanya protokol HTTPS yang diizinkan." };
  }

  const host = url.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.includes(host)) {
    return {
      ok: false,
      reason: "Host tidak diizinkan. Harus domain Google (g.page, search.google.com, maps...).",
    };
  }

  const full = `${url.origin}${url.pathname}${url.search}`;

  if (REVIEW_PATTERNS.some((re) => re.test(full))) return { ok: true };
  if (PLACE_PATTERNS.some((re) => re.test(full))) return { ok: true };

  return {
    ok: false,
    reason: "URL bukan tautan ulasan/tempat Google yang dikenali. Contoh sah: https://g.page/r/<ID>/review",
  };
}

export function classifyUrl(raw: string): "direct-review" | "place" | "invalid" {
  if (!validateGoogleReviewUrl(raw).ok) return "invalid";
  try {
    const u = new URL(raw);
    const full = `${u.origin}${u.pathname}${u.search}`;
    return REVIEW_PATTERNS.some((re) => re.test(full)) ? "direct-review" : "place";
  } catch {
    return "invalid";
  }
}
