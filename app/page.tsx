"use client";

import { useCallback, useEffect, useState } from "react";
import EditTargetModal from "@/components/EditTargetModal";
import QrButton from "@/components/QrButton";

const ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? "";

export interface CardRow {
  id: string;
  card_slug: string;
  target_google_url: string;
  click_count: number;
  is_active: boolean;
  created_at: string;
}

export default function CommandCenter() {
  // null = sedang cek sesi, false = perlu PIN, true = authenticated
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<CardRow | null>(null);
  const [newSlug, setNewSlug] = useState("");
  const [newUrl, setNewUrl] = useState("");

  /* ---------- session bootstrap ---------- */
  const load = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    const res = await fetch("/api/cards", { cache: "no-store" });
    if (res.status === 401) {
      setAuthed(false);
      setLoading(false);
      return false;
    }
    const body = await res.json().catch(() => ({ cards: [] }));
    setCards((body.cards as CardRow[]) ?? []);
    setAuthed(true);
    setLoading(false);
    return true;
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* ---------- PIN auth ---------- */
  async function submitPin() {
    if (!pin || pinBusy) return;
    setPinBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setPin("");
        const ok = await load();
        if (ok) setNotice("[OK] Akses diterima. Uplink aman.");
      } else {
        setNotice(`[ERR] ${body.message ?? "Kode akses ditolak."}`);
      }
    } finally {
      setPinBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setCards([]);
    setAuthed(false);
    setNotice(null);
  }

  /* ---------- card actions ---------- */
  async function createCard() {
    setNotice(null);
    const res = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: newSlug, url: newUrl }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      setCards((prev) => [body.card as CardRow, ...prev]);
      setNewSlug("");
      setNewUrl("");
      setNotice(
        `[OK] Kartu /${body.card.card_slug} dibuat. Short URL siap dicetak ke chip.`
      );
    } else {
      setNotice(`[ERR] ${body.message ?? "Gagal membuat kartu."}`);
    }
  }

  async function commitTarget(card: CardRow, nextUrl: string) {
    const res = await fetch(`/api/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_google_url: nextUrl }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.message ?? "Gagal menyimpan tautan.");
    setCards((prev) =>
      prev.map((c) => (c.id === card.id ? { ...c, target_google_url: nextUrl } : c))
    );
    setNotice(
      `[OK] Target /${card.card_slug} diperbarui. Chip fisik tidak perlu diubah.`
    );
  }

  async function toggleActive(card: CardRow) {
    const next = !card.is_active;
    const res = await fetch(`/api/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: next }),
    });
    if (!res.ok) {
      setNotice("[ERR] Gagal mengubah status kartu.");
      return;
    }
    setCards((prev) =>
      prev.map((c) => (c.id === card.id ? { ...c, is_active: next } : c))
    );
  }

  async function copyShort(card: CardRow) {
    const short = `${ORIGIN}/r/${card.card_slug}`;
    try {
      await navigator.clipboard.writeText(short);
      setNotice(`[OK] Short URL tersalin: ${short}`);
    } catch {
      setNotice(`[INFO] Short URL: ${short}`);
    }
  }

  /* ---------- derived stats ---------- */
  const totalTaps = cards.reduce((s, c) => s + Number(c.click_count ?? 0), 0);
  const online = cards.filter((c) => c.is_active).length;

  /* ---------- gate ---------- */
  if (authed === null) {
    return (
      <main className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
        <div className="hud-panel p-7 text-center">
          <p className="text-[10px] uppercase tracking-[0.35em] text-neon-cyan/70">
            // establishing-uplink
          </p>
          <p className="mt-3 text-xs text-slatehud">Memverifikasi sesi operator...</p>
        </div>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
        <div className="hud-panel p-7">
          <p className="text-[10px] uppercase tracking-[0.35em] text-neon-cyan/70">
            // secure-uplink
          </p>
          <h1 className="mt-2 text-xl uppercase tracking-[0.18em]">
            Cyber Wars <span className="text-neon-cyan">Command</span>
          </h1>
          <p className="mt-3 text-xs leading-relaxed text-slatehud">
            Masukkan kode akses operator untuk membuka panel kendali tautan
            ulasan.
          </p>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 10))}
            onKeyDown={(e) => e.key === "Enter" && void submitPin()}
            placeholder="••••••"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            className="input-terminal mt-5 text-center text-lg tracking-[0.5em]"
            spellCheck={false}
          />
          <button
            className="btn-neon mt-4 w-full"
            onClick={() => void submitPin()}
            disabled={pinBusy || pin.length < 4}
          >
            {pinBusy ? "Verifying..." : "Request Access"}
          </button>
          {notice && <p className="mt-4 text-[11px] text-neon-crimson">{notice}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="relative z-10 mx-auto max-w-6xl px-5 py-10">
      {/* ---------- header ---------- */}
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-neon-cyan/70">
            // google review command center
          </p>
          <h1 className="mt-2 text-2xl uppercase tracking-[0.16em]">
            Cyber <span className="text-neon-cyan">Wars</span> Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-neon" onClick={() => void load()}>
            {loading ? "Syncing..." : "Reload Grid"}
          </button>
          <button className="btn-danger" onClick={() => void signOut()}>
            Sign Out
          </button>
        </div>
      </header>

      {/* ---------- stat deck ---------- */}
      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatPanel label="total_taps" value={totalTaps} tone="cyan" />
        <StatPanel label="cards_online" value={`${online}/${cards.length}`} tone="matrix" />
        <StatPanel
          label="cards_offline"
          value={cards.length - online}
          tone={cards.length - online > 0 ? "crimson" : "cyan"}
        />
      </section>

      {notice && (
        <p className="mb-5 border-l-2 border-neon-cyan/60 bg-obsidian-raised px-4 py-2 text-[11px] text-neon-cyan">
          {notice}
        </p>
      )}

      {/* ---------- create card ---------- */}
      <section className="hud-panel mb-6 p-5">
        <p className="text-[10px] uppercase tracking-[0.35em] text-neon-cyan/70">
          // deploy-new-card
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_2fr_auto]">
          <input
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            placeholder="slug-kartu"
            className="input-terminal"
            spellCheck={false}
          />
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void createCard()}
            placeholder="https://g.page/r/XXXXXXXXXX/review"
            className="input-terminal"
            spellCheck={false}
          />
          <button className="btn-neon" onClick={() => void createCard()}>
            Deploy Card
          </button>
        </div>
        <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-slatehud">
          slug jadi short URL: {ORIGIN}/r/slug-kartu
        </p>
      </section>

      {/* ---------- card grid ---------- */}
      <section className="space-y-4">
        {cards.length === 0 && !loading && (
          <div className="hud-panel p-8 text-center text-xs text-slatehud">
            Tidak ada kartu terdaftar. Gunakan form Deploy New Card di atas untuk
            mengaktifkan grid.
          </div>
        )}

        {cards.map((card) => {
          const short = `${ORIGIN}/r/${card.card_slug}`;
          return (
            <article key={card.id} className="hud-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="min-w-[240px] flex-1">
                  <div className="flex items-center gap-3">
                    <span
                      className={`radar-dot ${
                        card.is_active ? "text-neon-matrix" : "text-neon-crimson"
                      }`}
                      style={{
                        background: card.is_active ? "#00FF66" : "#FF003C",
                      }}
                    />
                    <span className="text-sm uppercase tracking-[0.2em]">
                      /{card.card_slug}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-[0.25em] ${
                        card.is_active ? "text-neon-matrix" : "text-neon-crimson"
                      }`}
                    >
                      {card.is_active ? "online" : "offline"}
                    </span>
                  </div>

                  <p className="mt-3 text-[10px] uppercase tracking-[0.25em] text-slatehud">
                    target_url
                  </p>
                  <p className="mt-1 break-all text-[11px] text-neon-cyan/90">
                    {card.target_google_url}
                  </p>

                  <p className="mt-3 text-[10px] uppercase tracking-[0.25em] text-slatehud">
                    short_url
                  </p>
                  <p className="mt-1 break-all text-[11px] text-slatehud">{short}</p>
                </div>

                <div className="flex flex-col items-end gap-4">
                  <div className="text-right">
                    <p className="text-3xl font-semibold tabular-nums text-neon-cyan">
                      {Number(card.click_count).toLocaleString("id-ID")}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-slatehud">
                      total taps
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <button className="btn-neon" onClick={() => setEditing(card)}>
                      Edit Link
                    </button>
                    <QrButton url={short} slug={card.card_slug} />
                    <button className="btn-neon" onClick={() => void copyShort(card)}>
                      Copy URL
                    </button>
                    <button
                      className={card.is_active ? "btn-danger" : "btn-neon"}
                      onClick={() => void toggleActive(card)}
                    >
                      {card.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {editing && (
        <EditTargetModal
          open
          cardSlug={editing.card_slug}
          currentUrl={editing.target_google_url}
          onClose={() => setEditing(null)}
          onSave={(next) => commitTarget(editing, next)}
        />
      )}
    </main>
  );
}

function StatPanel({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "cyan" | "crimson" | "matrix";
}) {
  const color =
    tone === "crimson"
      ? "text-neon-crimson"
      : tone === "matrix"
      ? "text-neon-matrix"
      : "text-neon-cyan";
  const ring =
    tone === "crimson"
      ? "shadow-neon-crimson"
      : tone === "matrix"
      ? "shadow-neon-matrix"
      : "shadow-neon-cyan";

  return (
    <div className={`hud-panel ${ring} p-5`}>
      <p className="text-[10px] uppercase tracking-[0.3em] text-slatehud">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
