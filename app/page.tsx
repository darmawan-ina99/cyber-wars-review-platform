"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
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
  const supabase = useMemo(() => getSupabase(), []);
  const [email, setEmail] = useState("");
  const [session, setSession] = useState<{ id: string } | null>(null);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<CardRow | null>(null);

  /* ---------- auth ---------- */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session?.user ? { id: data.session.user.id } : null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s?.user ? { id: s.user.id } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cards")
      .select("id, card_slug, target_google_url, click_count, is_active, created_at")
      .order("created_at", { ascending: false });
    if (error) setNotice(`[ERR] Gagal memuat kartu: ${error.message}`);
    setCards((data as CardRow[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (session) void load();
  }, [session, load]);

  /* ---------- actions ---------- */
  async function signIn() {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setNotice(
      error ? `[ERR] ${error.message}` : "[OK] Link akses dikirim ke email Anda."
    );
  }

  async function commitTarget(card: CardRow, nextUrl: string) {
    const { error } = await supabase
      .from("cards")
      .update({ target_google_url: nextUrl })
      .eq("id", card.id);
    if (error) throw new Error(error.message);
    setCards((prev) =>
      prev.map((c) => (c.id === card.id ? { ...c, target_google_url: nextUrl } : c))
    );
    setNotice(`[OK] Target /${card.card_slug} diperbarui. Chip fisik tidak perlu diubah.`);
  }

  async function toggleActive(card: CardRow) {
    const next = !card.is_active;
    const { error } = await supabase
      .from("cards")
      .update({ is_active: next })
      .eq("id", card.id);
    if (error) {
      setNotice(`[ERR] ${error.message}`);
      return;
    }
    setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, is_active: next } : c)));
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
  if (!session) {
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
            Autentikasi operator diperlukan untuk mengakses panel kendali tautan
            ulasan.
          </p>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operator@domain.com"
            className="input-terminal mt-5"
            spellCheck={false}
          />
          <button className="btn-neon mt-4 w-full" onClick={() => void signIn()}>
            Request Access Link
          </button>
          {notice && <p className="mt-4 text-[11px] text-neon-amber">{notice}</p>}
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
          <button className="btn-danger" onClick={() => void supabase.auth.signOut()}>
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

      {/* ---------- card grid ---------- */}
      <section className="space-y-4">
        {cards.length === 0 && !loading && (
          <div className="hud-panel p-8 text-center text-xs text-slatehud">
            Tidak ada kartu terdaftar. Buat baris baru pada tabel <code>cards</code>{" "}
            (atau lewat form Create Card) untuk mengaktifkan grid.
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
