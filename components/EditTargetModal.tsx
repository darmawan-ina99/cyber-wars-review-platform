"use client";

import { useState } from "react";
import { classifyUrl, validateGoogleReviewUrl } from "@/lib/validate-google-url";

interface Props {
  open: boolean;
  cardSlug: string;
  currentUrl: string;
  onClose: () => void;
  /** Persists the new target link; must throw on failure. */
  onSave: (nextUrl: string) => Promise<void>;
}

export default function EditTargetModal({
  open,
  cardSlug,
  currentUrl,
  onClose,
  onSave,
}: Props) {
  const [value, setValue] = useState(currentUrl);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const live = value.trim() ? validateGoogleReviewUrl(value) : null;
  const kind = value.trim() ? classifyUrl(value) : "invalid";

  async function submit() {
    const check = validateGoogleReviewUrl(value);
    if (!check.ok) {
      setError(check.reason ?? "URL tidak valid.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave(value.trim());
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan tautan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={busy ? undefined : onClose}
      />
      <div className="hud-panel relative w-full max-w-xl p-7 animate-flicker">
        <div className="mb-5 flex items-baseline justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-neon-cyan/70">
              // link-reconfiguration
            </p>
            <h2 className="mt-1 text-lg uppercase tracking-[0.15em] text-white">
              Update Target Link
            </h2>
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-slatehud">
            slug: <span className="text-neon-cyan">/{cardSlug}</span>
          </span>
        </div>

        <label className="mb-2 block text-[10px] uppercase tracking-[0.25em] text-slatehud">
          &gt; target_google_url
        </label>
        <input
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !busy) void submit();
            if (e.key === "Escape" && !busy) onClose();
          }}
          spellCheck={false}
          placeholder="https://g.page/r/XXXXXXXXXX/review"
          className={`input-terminal ${error ? "input-terminal--error" : ""}`}
        />

        <div className="mt-3 min-h-[20px] text-[11px] leading-relaxed">
          {error ? (
            <span className="text-neon-crimson">[ERR] {error}</span>
          ) : kind === "direct-review" ? (
            <span className="text-neon-matrix">
              [OK] Direct Review Link terdeteksi. Callback langsung ke form ulasan.
            </span>
          ) : kind === "place" ? (
            <span className="text-neon-amber">
              [WARN] Tautan tempat valid, namun bisa jadi pengguna hanya mendarat di
              halaman profil, bukan form ulasan.
            </span>
          ) : (
            <span className="text-slatehud">
              [IDLE] Menunggu input tautan Google Maps yang sah.
            </span>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button className="btn-danger" onClick={onClose} disabled={busy}>
            Abort
          </button>
          <button
            className="btn-neon"
            onClick={() => void submit()}
            disabled={busy || !live?.ok}
          >
            {busy ? "Transmitting..." : "Commit Link"}
          </button>
        </div>
      </div>
    </div>
  );
}
