# CYBER WARS // Google Review Command Center

Platform manajemen tautan dinamis Google Review Card dengan antarmuka taktis
HUD futuristik. Satu chip/QR fisik, target link bisa diganti kapan saja tanpa
mengganti chip.

## Fitur

1. *Dynamic Redirect Engine* — `GET /r/[slug]`: increment `click_count`
   atomik (RPC `register_hit` SECURITY DEFINER) lalu redirect 302 ke
   `target_google_url`.
2. *Command Center Dashboard* — statistik total tap, status online/offline
   dengan radar dot berdenyut, aksi cepat per kartu.
3. *Instant Link Update Modal* — form bergaya terminal dengan validasi live:
   hanya menerima URL Google yang sah (g.page, writereview?placeid=,
   maps.app.goo.gl, dsb.).
4. *High-Res QR Export* — PNG 2048px dua varian: neon (digital) dan
   print-safe hitam-putih (chip fisik), error correction level H.

## Tech Stack

Next.js 14 (App Router, TypeScript) + Tailwind CSS + Supabase
(PostgreSQL + Auth OTP email + RLS) + qrcode.

## Setup

```bash
cp .env.local.example .env.local   # isi kredensial Supabase + domain Anda
npm install
```

1. Buat project di supabase.com, jalankan seluruh isi `supabase/schema.sql`
   di SQL Editor.
2. Isi `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`.
3. Aktifkan Auth -> Email provider (magic link sudah terkonfigurasi di kode).
4. `npm run dev` untuk pengembangan, `npm run build && npm start` untuk
   produksi. Siap deploy ke Vercel/Netlify tanpa konfigurasi tambahan.

## Membuat kartu pertama

Masuk ke dashboard, lalu insert baris lewat Supabase SQL Editor (form create
card bisa ditambahkan sesuai kebutuhan):

```sql
insert into cards (user_id, card_slug, target_google_url)
values ((select auth.uid()), 'warroom-01',
        'https://g.page/r/YOUR_PLACE_ID/review');
```

Short URL Anda: `https://your-domain.com/r/warroom-01`

## Struktur

```text
app/
  layout.tsx          # HUD shell + scanline + grid taktis
  page.tsx            # Command Center dashboard (auth gate + grid kartu)
  globals.css         # Tema Cyber Wars: hud-panel, btn-neon, radar-dot
  r/[slug]/route.ts   # Redirect Engine (302 + counter atomik)
components/
  EditTargetModal.tsx # Modal update link + validasi live
  QrButton.tsx        # Ekspor QR 2048px (neon + print-safe)
lib/
  supabase.ts         # Klien anon RLS-safe
  validate-google-url.ts # Validasi tautan Google yang sah
supabase/
  schema.sql          # Tabel cards + RLS + RPC register_hit + trigger
```

## Keamanan

RLS: pemilik hanya bisa melihat/mengubah barisnya sendiri. Anon hanya bisa
mengeksekusi `register_hit` (increment + return URL), tanpa akses tabel
langsung. Redirect `no-store, noindex` supaya tidak ter-cache dan tidak
terindeks.
