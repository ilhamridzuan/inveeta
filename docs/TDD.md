# Technical Design Document (TDD) — Inveeta MVP

| Atribut | Nilai |
|---|---|
| Versi | 0.1 |
| Tanggal | 13 Oktober 2026 |
| Status | In Progress |
| Penulis | Naridza Studio (solo developer) |
| Dokumen Acuan | [PRD.md](./PRD.md) (v0.3) |

---

## 0. Metadata & Referensi

### 0.1 Dokumen Terkait
- **Product Requirements Document**: [PRD.md](./PRD.md) — Dokumen spesifikasi kebutuhan produk, persona, metrik KPI, batasan non-goals, dan keputusan bisnis.
- **Catatan Awal**: [catatanawalinveeta.md](./catatanawalinveeta.md) — Catatan observasi & kebutuhan awal Inveeta.

### 0.2 Glosarium Istilah
Tabel ini menjadi standar penamaan kode (*ubiquitous language*) di seluruh workspace monorepo:

| Istilah | Penamaan Kode | Definisi |
|---|---|---|
| **Host** | `host` / `user` | Pengguna pemilik akun penyelenggara acara. Mengelola data acara, daftar tamu, kustomisasi visual, dan moderasi via dashboard. |
| **Tamu** | `guest` | Individu atau entitas yang diundang oleh Host ke suatu acara. Memiliki kuota pax, alokasi sesi, dan token akses personal. |
| **Sesi Acara** | `eventSession` / `session` | Sub-acara terpisah dalam satu rangkaian event (contoh: Akad Nikah, Resepsi Siang, Unduh Mantu) dengan jadwal, lokasi fisik, dan alokasi tamu masing-masing. |
| **Token Tamu** | `guestToken` / `token` | String acak berkekuatan kriptografis (entropi ≥ 128-bit) yang disematkan pada URL personal tamu untuk otentikasi tanpa login akun. |
| **Slug** | `slug` | Identifier alfanumerik unik ramah URL untuk halaman undangan (contoh: `romeo-juliet`). Bersifat permanen (*immutable*) setelah event live. |
| **Tier** | `tier` | Klasifikasi paket fitur/template (di MVP selalu bernilai default `free`). Disiapkan pada skema data untuk ekspansi monetisasi masa depan tanpa refactor. |
| **Decoupled Monolith** | `decoupled-monolith` | Pola arsitektur di mana satu backend monolitik melayani berbagai aplikasi frontend terpisah yang independen dalam satu repository monorepo. |
| **Hono RPC** | `hono-rpc` | Mekanisme client-server type safety native Hono di mana tipe route server (`AppType`) diekspor langsung ke client tanpa code generator pihak ketiga. |
| **On-Demand ISR** | `on-demand-isr` | Strategi incremental static regeneration di Next.js di mana halaman di-cache statis di CDN Vercel dan hanya direvalidasi via sinyal webhook API (`revalidateTag`). |

---

## 1. Ringkasan Sistem & Tujuan Desain

### 1.1 Ringkasan Arsitektur
Inveeta MVP dibangun dengan arsitektur **Decoupled Monolith** di dalam **pnpm Monorepo berbasis TypeScript**, di mana satu backend runtime tunggal (`apps/api` berbasis Node.js dan framework Hono) bertindak sebagai gerbang terpusat logika bisnis dan satu-satunya entitas yang memiliki koneksi ke database PostgreSQL (`packages/db` via Drizzle ORM). Backend ini melayani dua aplikasi web independen: `apps/invitation` (Next.js App Router) yang menangani rendering undangan publik berkinerja tinggi dengan Open Graph dinamis dan on-demand caching di Edge CDN Vercel, serta `apps/dashboard` (Vite + React PWA) yang bertindak sebagai antarmuka Host untuk pengelolaan acara offline-tolerant. Seluruh kontrak data dan skema validasi divalidasi end-to-end melalui `packages/shared` menggunakan Zod, aset media disimpan di Cloudflare R2 via presigned URL, dan pembaruan metrik serta ucapan tamu dialirkan secara langsung menggunakan Server-Sent Events (SSE).

```mermaid
flowchart LR
    Host((Host)) -->|"Kelola Acara"| DASH["apps/dashboard<br/>(Vite React PWA)"]
    Guest((Tamu)) -->|"Buka Undangan"| INV["apps/invitation<br/>(Next.js App Router)"]
    
    subgraph Vercel_CDN["Vercel Platform"]
        INV
        DASH
    end
    
    subgraph VPS_Linux["VPS (Docker Network)"]
        API["apps/api<br/>(Node.js + Hono)"]
        DB[("PostgreSQL 16<br/>(Private Network Only)")]
    end
    
    subgraph Cloud_Storage["Cloudflare Infrastructure"]
        R2[("Cloudflare R2<br/>cdn.inveeta.com")]
    end
    
    INV -- "1. SSR Fetch (Hono RPC)<br/>2. RSVP & Wishes" --> API
    DASH -- "1. Management (Hono RPC)<br/>2. Live Stream (SSE)" --> API
    API --> DB
    API -- "Presigned PUT URL" --> DASH
    DASH -- "Upload Foto/Musik Langsung" --> R2
    INV -- "Aset Gambar & Audio" --> R2
    API -- "Trigger revalidateTag" --> INV
```

### 1.2 Prinsip Desain (Design Principles)
1. **Solo-Developer Ergonomics (Simplicity Over Hype)**:
   - Satu bahasa pemrograman dari hulu ke hilir: TypeScript 100%.
   - Tanpa code-generator tambahan (mis. tRPC / GraphQL / OpenAPI codegen). Cukup mengekspor `type AppType` dari Hono ke client via `hc<AppType>()`.
   - Infrastruktur sederhana: satu Linux VPS berdaya tampung efisien yang menjalankan container Docker API dan database PostgreSQL di private network terisolasi.
2. **End-to-End Type Safety**:
   - Skema Zod di `packages/shared` menjadi sumber kebenaran tunggal (*Single Source of Truth*).
   - Validasi payload request di Hono middleware (`zValidator`), validasi form di React (`react-hook-form`), dan DTO response client menggunakan tipe yang identik. Perubahan field di backend langsung memicu compile error di frontend sebelum deployment.
3. **Single Database Gatekeeper (Strict API-Only Access)**:
   - Database PostgreSQL **hanya** memiliki satu klien koneksi: `apps/api`.
   - Frontend (`apps/invitation` dan `apps/dashboard`) dilarang keras mengimpor `packages/db` atau membuka koneksi DB langsung. Tidak ada port PostgreSQL yang diekspos ke publik internet.
4. **Phase 2 Extension Ready (Zero-Refactor Extensibility)**:
   - Struktur backend dibagi modular per domain (`auth`, `events`, `guests`, `rsvp`, `wishes`, `media`, `realtime`).
   - Aplikasi masa depan (`apps/scanner`, `apps/live-display`, `apps/photobooth`) dapat langsung ditambahkan ke dalam monorepo sebagai konsumen baru dari `packages/shared` dan endpoint API tanpa merombak arsitektur basis data atau modul core yang sudah beroperasi.

### 1.3 Batasan & Target yang Mengikat (Constraints & Targets)
| Metrik / Parameter | Target Spesifikasi | Strategi Pemenuhan |
|---|---|---|
| **Performa Undangan (Mobile 4G)** | LCP ≤ 2.5s; Lighthouse Score ≥ 90 | On-demand ISR di Next.js; gambar dikompresi WebP; asset statis di Cloudflare CDN; initial HTML cacheable di Edge Vercel. |
| **Latensi API (p95)** | ≤ 300ms untuk endpoint publik (RSVP, wishes, metadata) | Framework ultra-ringan Hono; query Drizzle terindeks dengan benar; payload JSON ringkas. |
| **Kapasitas Beban Puncak** | 2.000 pembukaan undangan/event; 50 event aktif/bulan | 95%+ traffic undangan dilayani dari Edge Cache Vercel; VPS hanya memproses request mutasi (RSVP/ucapan) dan koneksi SSE. |
| **Koneksi Realtime** | ≥ 200 koneksi SSE simultan per host dashboard | Node.js asynchronous event emitter / SSE stream dengan memory footprint rendah (< 50MB tambahan). |
| **Ukuran Media** | Foto maks 2 MB; Musik MP3/M4A maks 10 MB | Client-side validation + enforcement batas byte pada S3/R2 presigned policy. |
| **Biaya Operasional (Infra Budget)** | Minimum / Low-Cost Solo Dev | 1 VPS ($5–$10/bln) + Vercel Hobby/Pro + Cloudflare R2 (Free 10GB/bln & zero egress fees) + Resend (Free 3.000 email/bln). |

---

## 2. Struktur Monorepo

### 2.1 Pohon Folder Workspace (Final Monorepo Layout)
```
inveeta/
├── apps/
│   ├── api/                     # Node.js + Hono (Modular domain, Hono RPC, SSE Hub)
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts         # Server entrypoint & port listener
│   │       ├── app.ts           # Hono app instance, middlewares & route mounting
│   │       ├── middlewares/     # Auth guard, CORS, error handler, rate limiter
│   │       └── modules/         # Domain modular folders
│   │           ├── auth/
│   │           ├── events/
│   │           ├── templates/
│   │           ├── guests/
│   │           ├── rsvp/
│   │           ├── wishes/
│   │           ├── media/
│   │           ├── realtime/
│   │           └── exports/
│   ├── invitation/              # Next.js 15+ (App Router, ISR, OG dynamic preview)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── next.config.ts
│   │   └── app/
│   │       ├── [slug]/
│   │       │   ├── page.tsx     # Undangan publik (SSR/ISR)
│   │       │   └── [token]/
│   │       │       └── page.tsx # Undangan personal bertamu (SSR/ISR)
│   │       ├── api/
│   │       │   └── revalidate/  # Webhook on-demand revalidation
│   │       └── layout.tsx
│   ├── dashboard/               # Vite + React 18+ PWA (Host console)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── routes/          # Wizard, Overview, Guests, Wishes, Settings
│   │       ├── components/      # UI primitives, layout, tables, modal
│   │       ├── hooks/           # useAuth, useEvents, useSSE, useHonoClient
│   │       └── pwa/             # Service worker registration & offline screen
│   ├── scanner/                 # [Phase 2 Ready] PWA Offline Scanner (IndexedDB)
│   ├── live-display/            # [Phase 2 Ready] Layar Proyektor Interaktif
│   └── photobooth/              # [Phase 2 Ready] Guest Photo Upload Station
├── packages/
│   ├── db/                      # PostgreSQL Drizzle ORM client, schemas & migrations
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── drizzle.config.ts
│   │   ├── src/
│   │   │   ├── index.ts         # Drizzle DB client instance
│   │   │   ├── schemas/         # Skema tabel per domain
│   │   │   └── migrations/      # SQL generated migrations
│   ├── shared/                  # Zod schemas, DTOs, constants, helpers
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── schemas/         # Zod validator (auth, event, guest, rsvp, wish)
│   │       ├── types/           # Inferred TypeScript types
│   │       ├── constants/       # Reserved slugs, file constraints, regex
│   │       └── utils/           # Slugifier, date formatter, token generator
│   ├── config-typescript/       # Base tsconfig presets
│   │   ├── package.json
│   │   ├── base.json
│   │   ├── nextjs.json
│   │   └── react.json
│   ├── config-eslint/           # ESLint configs
│   │   ├── package.json
│   │   └── index.js
│   └── config-tailwind/         # Tailwind CSS presets & design tokens
│       ├── package.json
│       └── tailwind.config.ts
├── turbo.json                   # Turborepo task pipeline configuration
├── pnpm-workspace.yaml          # PNPM workspace definition
├── package.json                 # Monorepo root package.json
└── .gitignore
```

### 2.2 Aturan Dependensi Antar Package (Dependency Matrix)
Untuk menjamin kerapian arsitektur dan mencegah kebocoran lapisan database ke frontend, aturan import dependency antar package diatur secara ketat:

| Consumer Package / App | `@inveeta/shared` | `@inveeta/db` | `@inveeta/api` | `@inveeta/config-*` |
|---|:---:|:---:|:---:|:---:|
| `apps/api` |  Allowed |  Allowed | — (Self) |  Allowed |
| `apps/invitation` |  Allowed | ** FORBIDDEN** |  Allowed (`import type { AppType }` only) |  Allowed |
| `apps/dashboard` |  Allowed | ** FORBIDDEN** |  Allowed (`import type { AppType }` only) |  Allowed |
| `apps/scanner` (P2) |  Allowed | ** FORBIDDEN** |  Allowed (`import type { AppType }` only) |  Allowed |
| `packages/db` |  Allowed | — (Self) | ** FORBIDDEN** |  Allowed |
| `packages/shared` | — (Self) | ** FORBIDDEN** | ** FORBIDDEN** |  Allowed |

> [!CAUTION]
> **Enforcement Rule**: `packages/db` dilarang keras dipasang pada `dependencies` milik `apps/invitation` maupun `apps/dashboard`. Pelanggaran aturan ini akan digagalkan otomatis di level CI melalui skrip linting dependensi monorepo.

### 2.3 Konfigurasi PNPM Workspace (`pnpm-workspace.yaml`)
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### 2.4 Konfigurasi Turborepo (`turbo.json`)
Pipeline `turbo.json` dirancang dengan memanfaatkan caching task untuk kompilasi ultra cepat:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "@inveeta/api#build": {
      "dependsOn": ["^build"],
      "env": [
        "DATABASE_URL",
        "BETTER_AUTH_SECRET",
        "BETTER_AUTH_URL",
        "R2_ACCOUNT_ID",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
        "R2_BUCKET_NAME",
        "REVALIDATION_SECRET"
      ],
      "outputs": ["dist/**"]
    },
    "@inveeta/invitation#build": {
      "dependsOn": ["^build"],
      "env": ["NEXT_PUBLIC_API_URL", "REVALIDATION_SECRET"],
      "outputs": [".next/**", "!.next/cache/**"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "clean": {
      "cache": false
    },
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    }
  },
  "globalEnv": ["NODE_ENV"]
}
```

### 2.5 Standar Penamaan Package & TypeScript Configuration
- **Package Naming Convention**: Semua package internal menggunakan format scoped `@inveeta/<name>`:
  - `@inveeta/shared`: Skema Zod, konstanta, dan tipe umum.
  - `@inveeta/db`: Drizzle schema, koneksi postgres, migrasi.
  - `@inveeta/config-typescript`: Preset `tsconfig.base.json`.
  - `@inveeta/config-eslint`: Preset linting.
  - `@inveeta/config-tailwind`: Konfigurasi token styling bersama.
- **Konfigurasi `packages/config-typescript/base.json`**:
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "isolatedModules": true
  }
}
```

---

## 3. Arsitektur Komponen

### 3.1 Diagram C4 Level Container
Diagram ini menggambarkan batas runtime dan protokol komunikasi antar container:

```mermaid
flowchart TB
    Guest["Tamu (Guest Browser)"]
    Host["Host (Mobile/Desktop Browser)"]
    
    subgraph Vercel_Platform["Vercel Edge & Serverless"]
        INV["apps/invitation<br/>Next.js App Router<br/>SSR/ISR HTML<br/>Dynamic OG Images<br/>Domain: inveeta.com"]
        DASH["apps/dashboard<br/>Vite React PWA<br/>Single Page Application<br/>Service Worker Cache<br/>Domain: app.inveeta.com"]
    end

    subgraph VPS_Node["VPS Host (Linux / Docker)"]
        PROXY["Caddy Reverse Proxy<br/>Auto TLS (Let's Encrypt)<br/>SSE Buffering Off"]
        API["apps/api<br/>Node.js 22 + Hono<br/>Modular Routes<br/>Better Auth Guard<br/>Domain: api.inveeta.com"]
        DB[("PostgreSQL 16<br/>Drizzle Schema<br/>Docker Internal Network")]
    end

    subgraph External_Services["Cloud Services"]
        R2["Cloudflare R2<br/>Storage cdn.inveeta.com<br/>Zero Egress"]
        RESEND["Resend Email API<br/>Transactional Email"]
    end

    Guest -->|"HTTPS / GET"| INV
    Host -->|"HTTPS / Static Assets"| DASH
    
    INV -->|"HTTPS: Hono RPC (get)"| PROXY
    INV -->|"HTTPS: POST RSVP & Wishes"| PROXY
    DASH -->|"HTTPS: Hono RPC (post, patch)"| PROXY
    DASH -->|"HTTPS: SSE Stream Connection"| PROXY
    
    PROXY -->|"HTTP / Local Reverse Proxy"| API
    API -->|"TCP / UNIX Socket"| DB
    
    API -->|"REST API: Send Email"| RESEND
    API -->|"AWS SDK: Presigned PUT URL"| R2
    DASH -->|"Direct Upload (PUT)"| R2
    INV -->|"Fetch Media via CDN"| R2
    
    API -->|"POST /api/revalidate"| INV
```

---

### 3.2 Desain Komponen: `apps/api` (Node.js + Hono)

#### A. Struktur Modul per Domain
Setiap modul di `apps/api/src/modules/<domain>` menerapkan arsitektur 3-layer yang terisolasi:

```
src/modules/events/
├── routes.ts       # Definisi endpoint Hono, middleware per-route, zValidator
├── service.ts      # Business logic murni, orchestrator transaksi, domain rule
├── repository.ts   # Interaksi database Drizzle ORM murni (query & mutasi)
└── schema.ts       # Re-export / spesifik parameter Zod schema dari @inveeta/shared
```

#### B. Pipeline Urutan Middleware
Setiap request yang masuk ke `apps/api` melewati pipeline middleware dengan urutan baku:

```mermaid
flowchart TD
    Req(["HTTP Request"]) --> M0["0. Trusted Proxy Client IP Resolver<br/>Ekstrak IP dari X-Forwarded-For (Caddy)<br/>Simpan ke c.set('clientIp')"]
    M0 --> M1["1. Request ID & Logger Middleware"]
    M1 --> M2["2. CORS Middleware<br/>Origin: inveeta.com, app.inveeta.com<br/>Credentials: true"]
    M2 --> M3["3. Security Headers Middleware<br/>HSTS, X-Content-Type, X-Frame"]
    M3 --> M4["4. Rate Limiter Middleware<br/>Token Bucket per c.get('clientIp')<br/>Bukan 127.0.0.1"]
    M4 --> M5["5. Better Auth Session Resolver<br/>Ekstrak Cookie .inveeta.com & inject user"]
    M5 --> M6{"Route Guard Check"}
    M6 -- "Public Endpoint" --> H["Route Handler"]
    M6 -- "Protected Endpoint" --> M7["6. Require Auth Guard Middleware"]
    M7 --> H
    H --> M8["7. Global Error Handler<br/>Zod Error, Business Error, 500 Catch"]
    M8 --> Res(["HTTP Response"])
```

#### C. Mounting Better Auth & Ekspor Hono RPC `AppType`
Better Auth di-mount menggunakan handler Web Standard (`c.req.raw`) agar endpoint bawaan OAuth & session (`/api/auth/*`) berfungsi native lintas subdomain, sementara modul bisnis di-chain untuk inferensi tipe Hono RPC:

```typescript
// apps/api/src/app.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { auth } from './modules/auth/service';
import { publicRoutes } from './routes/public';
import { manageRoutes } from './routes/manage';
import { realtimeRoutes } from './routes/realtime';
import { trustedProxyMiddleware } from './middlewares/trusted-proxy';
import { rateLimiterMiddleware } from './middlewares/rate-limiter';
import { corsMiddleware } from './middlewares/cors';
import { globalErrorHandler } from './middlewares/errorHandler';

const app = new Hono()
  .onError(globalErrorHandler)
  // 1. Ekstrak IP asli dari Caddy X-Forwarded-For
  .use('*', trustedProxyMiddleware)
  .use('*', corsMiddleware)
  .use('*', rateLimiterMiddleware)
  // 2. Mount Better Auth Web Handler
  .all('/api/auth/*', (c) => auth.handler(c.req.raw))
  // 3. Mount Business RPC Routes dengan Prefix Versi Terpadu (/api/v1/*)
  .route('/api/v1/public', publicRoutes)
  .route('/api/v1/manage', manageRoutes)
  .route('/api/v1/realtime', realtimeRoutes);

export default app;
export type AppType = typeof app;
```

Konfigurasi Better Auth (`apps/api/src/modules/auth/service.ts`):
```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@inveeta/db';
import * as schema from '@inveeta/db/schemas';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  baseURL: 'https://api.inveeta.com',
  trustedOrigins: ['https://inveeta.com', 'https://app.inveeta.com'],
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain: '.inveeta.com', // Berbagi cookie session antara app. dan api.
    },
    defaultCookieAttributes: {
      secure: true,
      sameSite: 'lax',
      httpOnly: true,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});
```

---

### 3.3 Desain Komponen: `apps/invitation` (Next.js App Router)

#### A. Struktur Routing & File Layout
```
app/
├── [slug]/
│   ├── page.tsx            # Undangan Publik (hanya sesi publik, form RSVP dinonaktifkan, cached via ISR)
│   └── [token]/
│       └── page.tsx        # Undangan Personal Tamu (export const dynamic = 'force-dynamic', anti-cache bloat)
└── api/
    └── revalidate/
        └── route.ts        # Route handler penerima webhook on-demand ISR
```
> [!IMPORTANT]
> **Strategi Rendering Personal & Anti-Cache Bloat (`app/[slug]/[token]/page.tsx`)**:
> - Rute publik `app/[slug]/page.tsx` dirender statis via On-Demand ISR (`export const revalidate = false`, dibersihkan via tag `events-${slug}`).
> - Rute personal `app/[slug]/[token]/page.tsx` **wajib** mengekspor **`export const dynamic = 'force-dynamic'`**. Hal ini mencegah Edge CDN Vercel meng-cache ribuan file HTML statis terpisah per token tamu (*cache bloat*). Data shell acara di dalamnya tetap ditarik instan dari Next.js Data Cache ber-tag `events-${slug}`, sedangkan personalisasi tamu di-hydrate dinamis tanpa membebani kuota cache CDN.

> [!NOTE]
> **Standarisasi Open Graph WhatsApp**: `opengraph-image.tsx` sengaja tidak digunakan untuk mencegah duplikasi tag `<meta property="og:image">` ganda di Next.js App Router. Metadata OG sepenuhnya dikendalikan via `generateMetadata()` yang merujuk langsung ke URL gambar cover statis terkompresi di Cloudflare R2 (`event.ogImageUrl` / `event.coverPhotoUrl`, WebP/JPEG < 300 KB), menjamin 100% kompatibilitas dengan crawler WhatsApp.

#### B. Pemisahan Server Component vs Client Component
Untuk memaksimalkan kecepatan LCP, batas Server dan Client Component dipisahkan secara ketat:

| Komponen | Tipe | Tanggung Jawab |
|---|:---:|---|
| **`PageContainer` (`page.tsx`)** | Server Component | Memanggil API via Hono RPC (`client.api.v1.public.events[':slug'].$get`) dengan tag caching `events-${slug}`, merender markup HTML statis awal (mempelai, waktu, peta, cerita). |
| **`CoverSection`** | Client Component | Menangani cover pembuka (*interstitial modal*), tombol "Buka Undangan", memicu pemutaran audio latar (memenuhi kebijakan autoplay browser). |
| **`FloatingAudioPlayer`** | Client Component | Mengontrol status play/pause musik, menyimpan posisi seek playback saat interaksi scroll. |
| **`RSVPSection`** | Client Component | Menangani formulir kehadiran interaktif tamu, validasi jumlah pax, pengiriman mutasi POST ke API via Hono RPC. |
| **`WishesFeedSection`** | Client Component | Merender daftar ucapan tamu awal, membuka koneksi SSE ke `/api/v1/realtime/events/:id/stream` untuk menyisipkan ucapan baru secara live tanpa refresh. |

#### C. Fetching Undangan & Metadata Open Graph (Next.js 15 Cache Enforcement & Request Deduplication)
> [!IMPORTANT]
> **Next.js 15 Default `fetch` Change & Request Deduplication**:
> 1. Next.js 15 mengubah perilaku default `fetch` dari `force-cache` menjadi `no-store`. Pemanggilan Hono RPC **wajib** menyertakan opsi `init.cache: 'force-cache'` dan `init.next.tags`.
> 2. Agar `generateMetadata()` dan komponen `PageContainer` tidak menembak 2 request terpisah ke VPS dalam siklus render yang sama, fungsi fetcher dibungkus dengan **`React.cache()`** untuk deduplikasi request tingkat komponen server.

```typescript
// apps/invitation/app/[slug]/page.tsx
import { cache } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { honoClient } from '@/lib/api-client';

// 1. Data Fetcher dengan React.cache() + Next.js 15 Tag Caching
export const getEventData = cache(async (slug: string) => {
  const res = await honoClient.api.v1.public.events[':slug'].$get(
    { param: { slug } },
    {
      init: {
        cache: 'force-cache',
        next: { tags: [`event-${slug}`] },
      } as RequestInit,
    }
  );

  if (!res.ok) return null;
  return res.json();
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventData(slug); // Menggunakan cached result dari React.cache
  if (!event) return { title: 'Undangan Tidak Ditemukan - Inveeta' };

  return {
    title: `The Wedding of ${event.brideName} & ${event.groomName}`,
    description: `Kami mengundang Anda untuk menghadiri pernikahan kami pada ${event.eventDateFormatted}.`,
    openGraph: {
      title: `The Wedding of ${event.brideName} & ${event.groomName}`,
      description: `Undangan Pernikahan Online - ${event.eventDateFormatted}`,
      url: `https://inveeta.com/${slug}`,
      siteName: 'Inveeta',
      images: [
        {
          url: event.ogImageUrl || event.coverPhotoUrl,
          width: 1200,
          height: 630,
          alt: `Pernikahan ${event.brideName} & ${event.groomName}`,
        },
      ],
      type: 'website',
    },
  };
}

// 2. Server Page Container Component
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventData(slug); // 0 extra network call (deduplicated by React.cache)
  if (!event) notFound();

  return <InvitationView event={event} />;
}
```

#### D. Route Handler On-Demand Revalidation
```typescript
// apps/invitation/app/api/revalidate/route.ts
import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-revalidate-secret');
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { tag } = await req.json();
  if (!tag) {
    return NextResponse.json({ message: 'Tag parameter is required' }, { status: 400 });
  }

  // Di Next.js 15, revalidateTag menandai entri cache ber-tag tersebut sebagai stale seketika,
  // sehingga request tamu berikutnya langsung mendapatkan data teranyar dari API.
  revalidateTag(tag);
  return NextResponse.json({ revalidated: true, tag, now: Date.now() });
}
```

---

### 3.4 Desain Komponen: `apps/dashboard` (Vite + React PWA)

#### A. Client-Side Routing
Menggunakan `react-router-dom` v6 dengan arsitektur terlindungi (*Protected Route Layout*):
- `/login` & `/register`: Halaman autentikasi Host.
- `/wizard`: Multi-step form inisiasi acara (Step 1 s/d 5) untuk pembuatan event baru.
- `/dashboard`: Layout utama Host setelah event aktif:
  - `/overview`: Tampilan ringkasan metrik terpilah:
    - **Metrik Global**: Total Tamu Unik Diundang, Total Ucapan Masuk.
    - **Metrik Kehadiran per Sesi** (Selector Tab/Dropdown per Sesi): Menampilkan rincian status (Hadir / Tidak Hadir / Belum Respons) serta **Total Pax Hadir spesifik per sesi** (contoh: *Akad Nikah: 48 Hadir, 50 Pax*; *Resepsi: 350 Hadir, 420 Pax*). Menghilangkan ambiguitas kuota kursi/katering antar sesi.
  - `/guests`: Tabel daftar tamu, pencarian, filter kategori & sesi, alokasi sesi, modal tambah tamu satuan, generator link WhatsApp.
  - `/wishes`: Feed moderasi ucapan (aksi hide / delete).
  - `/settings`: Kustomisasi warna, urutan section, batas waktu RSVP, dan konfigurasi amplop/kado (`event_gift_details`).

#### B. Pembagian State Management & Autentikasi Client
1. **Autentikasi Host (`@better-auth/react`)**:
   - Khusus login, registrasi, Google OAuth, dan verifikasi email menggunakan SDK resmi Better Auth:
   ```typescript
   // apps/dashboard/src/lib/auth-client.ts
   import { createAuthClient } from 'better-auth/react';

   export const authClient = createAuthClient({
     baseURL: 'https://api.inveeta.com',
   });
   ```
   - Komponen React memanggil `const { data: session, isPending } = authClient.useSession();` untuk guard rute dashboard.
2. **Server State Bisnis (`@tanstack/react-query`)**:
   - Menangani sinkronisasi data bisnis dengan `apps/api` via `hc<AppType>('https://api.inveeta.com')`.
   - Melakukan query caching, refetching saat jendela aktif, dan *optimistic update* saat mengubah data RSVP tamu secara manual.
   - **Pencegahan Refetch Stampede (SSE Ingestion)**: Ketika event realtime (`wish.created`, `rsvp.updated`) diterima via SSE, dashboard **dilarang memanggil `invalidateQueries()`** untuk menghindari puluhan refetch bersamaan (*self-inflicted DDoS*). Data disisipkan langsung ke memori menggunakan `queryClient.setQueryData()` (misal: menambahkan ucapan baru ke array feed teratas dan memperbarui angka counter metrik secara atomik tanpa membebani VPS).
3. **UI & Form State (Wizard Draft Sync)**:
   - Form state dikelola penuh oleh `react-hook-form` yang diintegrasikan dengan `@hookform/resolvers/zod` menggunakan skema dari `@inveeta/shared`.
   - **Sinkronisasi Draft Wizard**: Setiap kali Host menekan "Lanjut" antar langkah wizard (Step 1 s/d 4), API menyimpan event berstatus draft (`is_published = false`) ke PostgreSQL. Host dapat keluar dan melanjutkan kembali kapan saja tanpa kehilangan progres. Slug masih dapat disunting bebas selama status masih draft. Finalisasi Step 5 mengubah `is_published = true` dan mengunci slug secara permanen.

#### C. Strategi PWA & Offline Fallback
- Menggunakan plugin `vite-plugin-pwa` dengan Workbox:
  - Cache static bundle (HTML, JS, CSS, fonts, SVG) menggunakan strategi *Stale-While-Revalidate*.
  - Cache gambar template menggunakan strategi *Cache-First* dengan batas kuota 50 entri.
  - Endpoint API (`api.inveeta.com`) menggunakan strategi *Network-Only* (tidak di-cache untuk mencegah data stale).
- **Offline Screen Handler**:
  Jika perangkat Host kehilangan koneksi jaringan (`navigator.onLine === false`) atau terjadi kegagalan jaringan saat membuka aplikasi, Service Worker menyajikan halaman offline statis:
  > **"Tidak Ada Koneksi Internet"**  
  > Inveeta memerlukan koneksi internet aktif untuk memuat metrik real-time dan memperbarui data tamu. Halaman akan dimuat ulang secara otomatis saat koneksi Anda kembali online.


---

## 4. Desain Data (Database)

### 4.1 Entity Relationship Diagram (ERD) Lengkap
Sistem database Inveeta dirancang di atas PostgreSQL 16 menggunakan Drizzle ORM (`packages/db`). Diagram berikut memetakan 11 entitas inti dan relasi antar tabel:

```mermaid
erDiagram
    users ||--o{ accounts : "has"
    users ||--o{ sessions : "has"
    users ||--o{ events : "owns"
    
    events ||--o{ event_sessions : "contains"
    events ||--o{ event_media : "contains"
    events ||--o| event_gift_details : "configures"
    events ||--o{ guests : "invites"
    events ||--o{ wishes : "receives"
    events ||--o| wa_message_templates : "configures"
    
    guests ||--o{ guest_session_allocations : "allocated_to"
    event_sessions ||--o{ guest_session_allocations : "allocated_with"
    
    guests ||--o{ rsvps : "submits"
    event_sessions ||--o{ rsvps : "tracks"
    guests ||--o{ wishes : "writes"

    users {
        text id PK
        text name
        text email UK
        boolean email_verified
        text image
        timestamp created_at
        timestamp updated_at
    }

    sessions {
        text id PK
        text user_id FK
        text token UK
        timestamp expires_at
        text ip_address
        text user_agent
        timestamp created_at
        timestamp updated_at
    }

    accounts {
        text id PK
        text user_id FK
        text account_id
        text provider_id
        text password
        timestamp created_at
        timestamp updated_at
    }

    verifications {
        text id PK
        text identifier
        text value
        timestamp expires_at
        timestamp created_at
        timestamp updated_at
    }

    events {
        text id PK
        text host_id FK
        text slug UK
        text title
        text bride_name
        text groom_name
        timestamp event_date
        text time_zone
        text template_id
        text template_tier
        jsonb visual_customization
        text cover_photo_url
        text bg_music_url
        timestamp rsvp_deadline
        boolean is_published
        timestamp created_at
        timestamp updated_at
    }

    event_sessions {
        text id PK
        text event_id FK
        text title
        timestamp start_time
        timestamp end_time
        text location_name
        text address
        text google_maps_url
        text waze_url
        boolean is_public
        integer sort_order
        timestamp created_at
        timestamp updated_at
    }

    event_media {
        text id PK
        text event_id FK
        text media_type
        text file_key
        text file_url
        text mime_type
        integer file_size
        text slot_identifier
        integer sort_order
        timestamp created_at
    }

    event_gift_details {
        text id PK
        text event_id FK
        text qris_image_url
        text gift_address
        text gift_recipient_name
        jsonb bank_accounts
        timestamp updated_at
    }

    guests {
        text id PK
        text event_id FK
        text name
        text phone_number
        text category
        integer max_pax
        text token UK
        timestamp created_at
        timestamp updated_at
    }

    guest_session_allocations {
        text id PK
        text guest_id FK
        text event_session_id FK
        timestamp created_at
    }

    rsvps {
        text id PK
        text guest_id FK
        text event_session_id FK
        text event_id FK
        text status
        integer actual_pax
        text notes
        timestamp submitted_at
        boolean is_manual_override
        text override_notes
        timestamp updated_at
    }

    wishes {
        text id PK
        text event_id FK
        text guest_id FK
        text sender_name
        text message
        boolean is_hidden
        text ip_hash
        timestamp created_at
    }

    wa_message_templates {
        text id PK
        text event_id FK
        text template_text
        timestamp updated_at
    }
```

---

### 4.2 Spesifikasi Skema Tabel Drizzle ORM (`packages/db`)

Skema diorganisir modular di bawah direktori `packages/db/src/schemas/`:

#### A. Autentikasi (Better Auth Schema) — `packages/db/src/schemas/auth.ts`
```typescript
import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { generateId } from '@inveeta/shared';
import { events } from './events';

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index('sessions_user_id_idx').on(table.userId),
]);

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index('accounts_user_id_idx').on(table.userId),
]);

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index('verifications_identifier_idx').on(table.identifier),
]);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  events: many(events),
}));
```

---

#### B. Acara & Sesi — `packages/db/src/schemas/events.ts`
```typescript
import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, boolean, integer, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { generateId } from '@inveeta/shared';
import { users } from './auth';
import { guests, guestSessionAllocations, rsvps } from './guests';
import { eventMedia, eventGiftDetails, wishes, waMessageTemplates } from './contents';

export const events = pgTable('events', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  hostId: text('host_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  brideName: text('bride_name').notNull(),
  groomName: text('groom_name').notNull(),
  eventDate: timestamp('event_date', { withTimezone: true }).notNull(),
  timeZone: text('time_zone').default('Asia/Jakarta').notNull(),
  templateId: text('template_id').notNull(), // Id registry template di kode
  templateTier: text('template_tier').default('free').notNull(),
  visualCustomization: jsonb('visual_customization').$type<{
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    sectionOrder: string[];
  }>().notNull(),
  coverPhotoUrl: text('cover_photo_url'),
  bgMusicUrl: text('bg_music_url'),
  rsvpDeadline: timestamp('rsvp_deadline', { withTimezone: true }).notNull(),
  isPublished: boolean('is_published').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  uniqueIndex('events_slug_unique_idx').on(table.slug),
  index('events_host_id_idx').on(table.hostId),
]);

export const eventSessions = pgTable('event_sessions', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  eventId: text('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  title: text('title').notNull(), // Akad Nikah, Resepsi, dll.
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  locationName: text('location_name').notNull(),
  address: text('address').notNull(),
  googleMapsUrl: text('google_maps_url'),
  wazeUrl: text('waze_url'),
  isPublic: boolean('is_public').default(false).notNull(), // Flag tampil di link publik
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index('event_sessions_event_id_idx').on(table.eventId),
]);

export const eventsRelations = relations(events, ({ one, many }) => ({
  host: one(users, {
    fields: [events.hostId],
    references: [users.id],
  }),
  sessions: many(eventSessions),
  giftDetails: one(eventGiftDetails),
  media: many(eventMedia),
  guests: many(guests),
  wishes: many(wishes),
  waTemplate: one(waMessageTemplates),
}));

export const eventSessionsRelations = relations(eventSessions, ({ one, many }) => ({
  event: one(events, {
    fields: [eventSessions.eventId],
    references: [events.id],
  }),
  rsvps: many(rsvps),
  allocations: many(guestSessionAllocations),
}));
```

---

#### C. Tamu, Alokasi & RSVP — `packages/db/src/schemas/guests.ts`
```typescript
import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, boolean, integer, index, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { generateId } from '@inveeta/shared';
import { events, eventSessions } from './events';

export const guests = pgTable('guests', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  eventId: text('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  phoneNumber: text('phone_number'), // Format E.164: +628...
  category: text('category', { enum: ['vip', 'family', 'regular'] }).default('regular').notNull(),
  maxPax: integer('max_pax').default(1).notNull(),
  token: text('token').notNull(), // Entropi >= 128 bit
  checkedInAt: timestamp('checked_in_at', { withTimezone: true }), // Timestamp check-in di lokasi
  checkInSessionId: text('check_in_session_id').references(() => eventSessions.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  uniqueIndex('guests_token_unique_idx').on(table.token),
  index('guests_event_id_idx').on(table.eventId),
  index('guests_check_in_session_id_idx').on(table.checkInSessionId),
  check('guests_max_pax_positive_check', sql`${table.maxPax} > 0`),
]);

export const guestSessionAllocations = pgTable('guest_session_allocations', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  guestId: text('guest_id')
    .notNull()
    .references(() => guests.id, { onDelete: 'cascade' }),
  eventSessionId: text('event_session_id')
    .notNull()
    .references(() => eventSessions.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('guest_session_allocations_unique_idx').on(table.guestId, table.eventSessionId),
  index('guest_session_allocations_guest_idx').on(table.guestId),
  index('guest_session_allocations_session_idx').on(table.eventSessionId),
]);

export const rsvps = pgTable('rsvps', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  guestId: text('guest_id')
    .notNull()
    .references(() => guests.id, { onDelete: 'cascade' }),
  eventSessionId: text('event_session_id')
    .notNull()
    .references(() => eventSessions.id, { onDelete: 'cascade' }),
  eventId: text('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['attending', 'declined', 'pending'] }).notNull(),
  actualPax: integer('actual_pax').default(0).notNull(),
  notes: text('notes'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  isManualOverride: boolean('is_manual_override').default(false).notNull(),
  overrideNotes: text('override_notes'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  uniqueIndex('rsvps_guest_session_unique_idx').on(table.guestId, table.eventSessionId),
  index('rsvps_event_id_idx').on(table.eventId),
  index('rsvps_session_id_idx').on(table.eventSessionId),
  check('rsvps_actual_pax_check', sql`${table.actualPax} >= 0`),
  check(
    'rsvps_status_pax_consistency_check',
    sql`(${table.status} = 'attending' AND ${table.actualPax} > 0) OR (${table.status} = 'declined' AND ${table.actualPax} = 0) OR (${table.status} = 'pending' AND ${table.actualPax} = 0)`
  ),
]);

export const guestsRelations = relations(guests, ({ one, many }) => ({
  event: one(events, {
    fields: [guests.eventId],
    references: [events.id],
  }),
  checkInSession: one(eventSessions, {
    fields: [guests.checkInSessionId],
    references: [eventSessions.id],
  }),
  allocations: many(guestSessionAllocations),
  rsvps: many(rsvps),
}));

export const rsvpsRelations = relations(rsvps, ({ one }) => ({
  guest: one(guests, {
    fields: [rsvps.guestId],
    references: [guests.id],
  }),
  session: one(eventSessions, {
    fields: [rsvps.eventSessionId],
    references: [eventSessions.id],
  }),
  event: one(events, {
    fields: [rsvps.eventId],
    references: [events.id],
  }),
}));
```

---

#### D. Ucapan, Media & Rekening — `packages/db/src/schemas/contents.ts`
```typescript
import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, boolean, integer, index, uniqueIndex, jsonb } from 'drizzle-orm/pg-core';
import { generateId } from '@inveeta/shared';
import { events } from './events';
import { guests } from './guests';

export const wishes = pgTable('wishes', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  eventId: text('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  guestId: text('guest_id')
    .references(() => guests.id, { onDelete: 'set null' }), // Nullable bila tautan publik / anonim
  senderName: text('sender_name').notNull(),
  message: text('message').notNull(),
  isHidden: boolean('is_hidden').default(false).notNull(), // Moderasi Host
  ipHash: text('ip_hash').notNull(), // SHA256 hashed IP (UU PDP compliant)
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('wishes_event_id_created_at_idx').on(table.eventId, table.createdAt),
]);

export const eventMedia = pgTable('event_media', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  eventId: text('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  mediaType: text('media_type', { enum: ['photo', 'audio', 'qris', 'og_image'] }).notNull(),
  fileKey: text('file_key').notNull(), // R2 bucket object key
  fileUrl: text('file_url').notNull(), // cdn.inveeta.com public URL
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(), // dalam bytes
  slotIdentifier: text('slot_identifier'), // 'gallery-1', 'cover', 'qris'
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('event_media_event_id_idx').on(table.eventId),
]);

export const eventGiftDetails = pgTable('event_gift_details', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  eventId: text('event_id')
    .notNull()
    .unique()
    .references(() => events.id, { onDelete: 'cascade' }),
  qrisImageUrl: text('qris_image_url'), // 1 QRIS statis per acara
  giftAddress: text('gift_address'), // 1 alamat kado fisik per acara
  giftRecipientName: text('gift_recipient_name'),
  bankAccounts: jsonb('bank_accounts').$type<Array<{
    id: string;
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    sortOrder: number;
  }>>().default([]).notNull(), // Multi rekening bank / e-wallet
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  uniqueIndex('event_gift_details_event_id_unique_idx').on(table.eventId),
]);

export const waMessageTemplates = pgTable('wa_message_templates', {
  id: text('id').primaryKey().$defaultFn(() => generateId()),
  eventId: text('event_id')
    .notNull()
    .unique()
    .references(() => events.id, { onDelete: 'cascade' }),
  templateText: text('template_text').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  uniqueIndex('wa_message_templates_event_id_unique_idx').on(table.eventId),
]);

export const eventGiftDetailsRelations = relations(eventGiftDetails, ({ one }) => ({
  event: one(events, {
    fields: [eventGiftDetails.eventId],
    references: [events.id],
  }),
}));

export const eventMediaRelations = relations(eventMedia, ({ one }) => ({
  event: one(events, {
    fields: [eventMedia.eventId],
    references: [events.id],
  }),
}));

export const wishesRelations = relations(wishes, ({ one }) => ({
  event: one(events, {
    fields: [wishes.eventId],
    references: [events.id],
  }),
  guest: one(guests, {
    fields: [wishes.guestId],
    references: [guests.id],
  }),
}));

export const waMessageTemplatesRelations = relations(waMessageTemplates, ({ one }) => ({
  event: one(events, {
    fields: [waMessageTemplates.eventId],
    references: [events.id],
  }),
}));
```

---

### 4.3 Aturan Integritas Data & Validasi Database

#### A. Kekekalan Slug (*Slug Immutability Enforcement*)
Slug adalah pengenal utama URL publik yang dicetak pada undangan dan disebar ke ratusan tamu.
1. **Fase Draft (Wizard Step 1–4)**: Selama event berstatus `is_published = false`, Host bebas mengoreksi nama acara dan slug.
2. **Fase Live (Published)**: Begitu event dipublikasikan (`is_published = true`), slug dikunci permanen:
   - **Application Layer (`apps/api`)**: Endpoint update event (`PATCH /events/:id`) menolak mutasi field `slug` jika event telah berstatus published.
   - **Database Engine Layer (Trigger PostgreSQL)**: Mencegah mutasi slug pada event yang sudah terbit:
```sql
CREATE OR REPLACE FUNCTION trg_enforce_slug_immutability()
RETURNS TRIGGER AS $$
BEGIN
  -- Kunci slug HANYA jika acara sudah pernah dipublikasikan
  IF OLD.is_published = true AND OLD.slug IS DISTINCT FROM NEW.slug THEN
    RAISE EXCEPTION 'Slug is immutable and cannot be updated once published.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_slug_immutable
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION trg_enforce_slug_immutability();
```

#### B. Penegakan Kuota Pax & Batas Waktu RSVP (*RSVP Deadline & Pax Enforcement*)
Tamu tidak boleh mengisi RSVP setelah batas waktu (`rsvpDeadline`) dan tidak boleh melebihi kuota `maxPax` untuk setiap sesi yang dialokasikan. Seluruh sesi diproses atomik dalam batch submission menggunakan transaksi Drizzle dengan row-level lock:

```typescript
// apps/api/src/modules/rsvp/service.ts
await db.transaction(async (tx) => {
  // 1. Ambil data event & verifikasi deadline
  const [event] = await tx
    .select({
      id: events.id,
      rsvpDeadline: events.rsvpDeadline,
      timeZone: events.timeZone,
    })
    .from(events)
    .where(eq(events.id, input.eventId));

  if (!event) throw new NotFoundError('Acara tidak ditemukan');

  // Penegakan batas waktu: waktu server dibanding deadline acara
  if (new Date() > new Date(event.rsvpDeadline)) {
    throw new ValidationError('Batas waktu konfirmasi kehadiran (RSVP) untuk acara ini telah berakhir.');
  }

  // 2. Kunci baris tamu untuk mencegah race condition submission konkuren
  const [guest] = await tx
    .select()
    .from(guests)
    .where(and(eq(guests.id, input.guestId), eq(guests.eventId, input.eventId)))
    .for('update');

  if (!guest) throw new NotFoundError('Tamu tidak valid atau tidak terdaftar');

  // 3. Proses batch alokasi sesi (Multi-Sesi Batching Atomik)
  for (const sessionItem of input.sessions) {
    // 3a. Verifikasi alokasi sesi: Tamu hanya boleh konfirmasi sesi yang dialokasikan kepadanya
    const [allocation] = await tx
      .select()
      .from(guestSessionAllocations)
      .where(and(
        eq(guestSessionAllocations.guestId, input.guestId),
        eq(guestSessionAllocations.eventSessionId, sessionItem.eventSessionId),
      ));

    if (!allocation) {
      throw new ForbiddenError(`Tamu tidak memiliki alokasi kehadiran untuk sesi ID ${sessionItem.eventSessionId}`);
    }

    // 3b. Proteksi Manual Override: Jika Host telah melakukan override manual di dashboard,
    // formulir sesi dikunci dan submission tamu ditolak agar tidak membatalkan keputusan Host.
    const [existingRsvp] = await tx
      .select({ isManualOverride: rsvps.isManualOverride })
      .from(rsvps)
      .where(and(
        eq(rsvps.guestId, input.guestId),
        eq(rsvps.eventSessionId, sessionItem.eventSessionId),
      ));

    if (existingRsvp?.isManualOverride) {
      throw new ForbiddenError(
        'Status konfirmasi kehadiran untuk salah satu sesi telah disesuaikan langsung oleh pihak penyelenggara acara. Silakan hubungi penyelenggara bila terdapat perubahan.'
      );
    }

    // 3c. Evaluasi kuota pax per sesi
    if (sessionItem.status === 'attending' && sessionItem.actualPax > guest.maxPax) {
      throw new ValidationError(`Jumlah pax (${sessionItem.actualPax}) melebihi kuota maksimal Anda (${guest.maxPax})`);
    }

    // 3d. Upsert record RSVP per sesi
    await tx.insert(rsvps).values({
      id: generateId(),
      guestId: input.guestId,
      eventSessionId: sessionItem.eventSessionId,
      eventId: input.eventId,
      status: sessionItem.status,
      actualPax: sessionItem.status === 'attending' ? sessionItem.actualPax : 0,
      notes: input.notes,
    }).onConflictDoUpdate({
      target: [rsvps.guestId, rsvps.eventSessionId],
      set: {
        status: sessionItem.status,
        actualPax: sessionItem.status === 'attending' ? sessionItem.actualPax : 0,
        notes: input.notes,
        updatedAt: new Date(),
      },
    });
  }
});
```

#### C. Integritas Tier Template (*Template Tier Consistency*)
- Setiap template di kode memiliki metadata `tier` (`free`, `premium`, `exclusive`).
- Field `templateTier` pada tabel `events` diikat dengan enum constraint.
- Saat Host melakukan penggantian template di dashboard:
  `template_tier (baru) == template_tier (lama)`
  Jika tier berbeda, API melempar error `400 Bad Request: Pergantian template hanya diizinkan untuk paket/tier yang sama.`

#### D. Standarisasi Datetime ISO 8601 & Offset Zona Waktu
Untuk mencegah pergeseran jam (*time drift*) 7–9 jam antara server Node.js di VPS (berjalan di UTC) dan zona waktu acara di Indonesia (`Asia/Jakarta / UTC+7`, `Asia/Makassar / UTC+8`, `Asia/Jayapura / UTC+9`):
1. **Validasi Skema Zod (`packages/shared`)**:
   Seluruh input datetime (`eventDate`, `startTime`, `endTime`, `rsvpDeadline`) **wajib** menyertakan offset zona waktu eksplisit:
   ```typescript
   export const dateTimeSchema = z.string().datetime({ offset: true });
   // Contoh valid: "2026-11-10T23:59:00+08:00" (WITA)
   // Contoh ditolak: "2026-11-10T23:59:00" (tanpa offset)
   ```
2. **PostgreSQL Storage**: Disimpan pada kolom bertipe `timestamp with time zone` (`TIMESTAMPTZ`), memastikan perbandingan waktu `new Date() > new Date(event.rsvpDeadline)` dievaluasi tepat pada milidetik absolut yang sama di seluruh dunia.

#### E. Proteksi Anti-Spam & Sanitasi Buku Ucapan (`POST /wishes`)
Karena endpoint ucapan dapat diakses melalui tautan publik tanpa login, perlindungan ganda diterapkan sebelum ucapan disiarkan secara langsung:
1. **Route-Specific Strict Rate Limiter**:
   - Maksimal **1 ucapan per 30 detik per IP**.
   - Maksimal **5 ucapan per 10 menit per IP**.
   - Melebihi batas mengembalikan `429 Too Many Requests`.
2. **Sanitasi HTML Anti-XSS & Anti-Defacement**:
   - Seluruh pesan disaring menggunakan pembersih string (mis. `sanitize-html`) dengan opsi `allowedTags: []` (strip seluruh tag HTML, script, iframe, dan style).
   - Validasi panjang karakter: `senderName` (2–50 karakter), `message` (5–500 karakter).
   - Hanya teks bersih yang disimpan ke database PostgreSQL dan dipancarkan ke `sseHub.broadcast()`.

---

### 4.4 Strategi Penghapusan Data (Soft Delete vs Hard Delete)

Bagi solo developer, kompleksitas *soft delete* (`deleted_at`) pada semua tabel menimbulkan beban pemeliharaan query yang tinggi (risiko query lupa filter `WHERE deleted_at IS NULL`, duplikasi constraint unique, dan bloat ukuran tabel). Oleh karena itu, Inveeta menerapkan strategi selektif:

| Entitas | Strategi | Alasan & Dampak Bisnis / Hukum (UU PDP) |
|---|:---:|---|
| **`events`** | **Hard Delete** (`CASCADE`) | Jika Host menghapus acara, seluruh data turunan (sesi, media, tamu, RSVP, ucapan) terhapus permanen dari PostgreSQL. Memenuhi hak penghapusan data pribadi secara mutlak (*Right to Erasure*). |
| **`guests`** | **Hard Delete** (`CASCADE`) | Menghapus tamu otomatis menghapus alokasi sesi dan data RSVP terkait. Token tamu seketika invalid (`404 Not Found`). Tidak menyisakan data yatim. |
| **`wishes`** | **Soft Moderation** (`is_hidden`) + Hard Delete | Ucapan yang tidak pantas disembunyikan menggunakan flag `is_hidden: true` agar Host dapat membatalkan penyembunyian (*unhide*). Host juga disediakan tombol hapus permanen (Hard Delete) dari database. |
| **`event_media`** | **Hard Delete** + S3 Deletion Queue | Record di tabel `event_media` dihapus dan background job menghapus file fisik di Cloudflare R2 untuk menghemat kuota storage. |

---

### 4.5 Strategi Migrasi Drizzle (Migration Workflow)

Untuk menjaga stabilitas basis data pada produksi, alur migrasi diatur ketat:

```mermaid
flowchart LR
    Dev["Developer<br/>Edit schema.ts"] --> Gen["pnpm db:generate<br/>(Drizzle Kit)"]
    Gen --> SQL["SQL Migration Files<br/>packages/db/src/migrations/"]
    SQL --> Git["Commit to Git Repo"]
    Git --> CI["CI Pipeline<br/>turbo test & lint"]
    CI --> Deploy["VPS Deploy / Docker Entrypoint"]
    Deploy --> Run["pnpm db:migrate<br/>(Execute Pending Migrations)"]
```

#### Aturan & Skrip Migrasi:
1. **Larangan `drizzle-kit push` di Lingkungan Produksi**:
   `drizzle-kit push` hanya diizinkan pada saat prototyping awal di database lokal. Pada environment staging dan production, migrasi **wajib** menggunakan file SQL terversi yang digenerate oleh `drizzle-kit generate`.
2. **Skrip Migrasi Entrypoint Docker (`apps/api/scripts/migrate.ts`)**:
```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import path from 'path';

async function runMigrations() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  // Menggunakan MIGRATIONS_DIR absolut di container (/app/migrations)
  // Mencegah error ENOENT path relatif akibat kompilasi TypeScript ke dist/
  const migrationsFolder =
    process.env.MIGRATIONS_DIR ||
    path.resolve(process.cwd(), '../../packages/db/src/migrations');

  console.log(`Menjalankan migrasi database Drizzle dari: ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  console.log('Migrasi database selesai sukses.');

  await pool.end();
}

runMigrations().catch((err) => {
  console.error('Gagal menjalankan migrasi database:', err);
  process.exit(1);
});
```

> [!TIP]
> **Instruksi Dockerfile Backend**: Pada multi-stage build `apps/api/Dockerfile`, tambahkan perintah:  
> `COPY packages/db/src/migrations /app/migrations`  
> dan atur env: `ENV MIGRATIONS_DIR=/app/migrations`.

---

### 4.6 Strategi Seed Data (Registry Templates & Dummy Data)

#### A. Seed Template Registry (`packages/db/src/seeds/templates.ts`)
Mendaftarkan 3 template default bertier `free` ke dalam sistem:
```typescript
export const DEFAULT_TEMPLATES = [
  {
    id: 'minimalist-elegance',
    name: 'Minimalist Elegance',
    tier: 'free',
    maxPhotos: 5,
    allowedSections: ['cover', 'quote', 'bride-groom', 'sessions', 'gallery', 'rsvp', 'wishes', 'gift'],
  },
  {
    id: 'rustic-garden',
    name: 'Rustic Garden Floral',
    tier: 'free',
    maxPhotos: 8,
    allowedSections: ['cover', 'quote', 'bride-groom', 'story', 'sessions', 'gallery', 'rsvp', 'wishes', 'gift'],
  },
  {
    id: 'javanese-heritage',
    name: 'Javanese Classic Heritage',
    tier: 'free',
    maxPhotos: 6,
    allowedSections: ['cover', 'quote', 'bride-groom', 'traditional-event', 'sessions', 'gallery', 'rsvp', 'wishes', 'gift'],
  },
] as const;
```

#### B. Skrip Seed Development (`pnpm db:seed`)
Menyediakan akun host dummy (`test@inveeta.com` / `password123`), 1 event lengkap, 2 sesi (Akad & Resepsi), 5 tamu contoh (VIP, Keluarga, Reguler) dengan token acak siap pakai untuk pengujian alur RSVP dan pembacaan SSR secara instan di lingkungan lokal.

---

### 4.7 Arsitektur SSE Channel Hub & Pencegahan Memory Leak

#### A. Masalah Skalabilitas `EventEmitter` Bawaan
Pada aplikasi Node.js standar, penggunaan `EventEmitter` tunggal untuk banyak koneksi HTTP SSE akan memicu peringatan *MaxListenersExceededWarning* (default batas 10 listener per event) dan menimbulkan kebocoran memori (*memory leak*) ketika klien terputus tanpa pembersihan referensi callback.

#### B. Solusi: In-Memory Channel Hub per Event (O(1) Map) & Reconnection Recovery
Inveeta mengimplementasikan singleton `SSEChannelHub` di `apps/api/src/modules/realtime/hub.ts` menggunakan struktur data bertingkat `Map<eventId, Map<clientId, Controller>>` untuk operasi subscribe/unsubscribe berkecepatan $O(1)$:

```typescript
// apps/api/src/modules/realtime/hub.ts
class SSEChannelHub {
  // Map eventId -> (Map clientId -> ReadableStreamDefaultController)
  private channels = new Map<string, Map<string, ReadableStreamDefaultController>>();

  subscribe(eventId: string, clientId: string, controller: ReadableStreamDefaultController) {
    if (!this.channels.has(eventId)) {
      this.channels.set(eventId, new Map());
    }
    this.channels.get(eventId)!.set(clientId, controller);
  }

  unsubscribe(eventId: string, clientId: string) {
    const clients = this.channels.get(eventId);
    if (!clients) return;

    clients.delete(clientId); // O(1) penghapusan instan tanpa iterasi Set
    if (clients.size === 0) {
      this.channels.delete(eventId); // Bebaskan memori jika 0 listener aktif
    }
  }

  broadcast(eventId: string, eventName: string, data: unknown, eventIdHeader?: string) {
    const clients = this.channels.get(eventId);
    if (!clients || clients.size === 0) return;

    const idField = eventIdHeader ? `id: ${eventIdHeader}\n` : '';
    const payload = `${idField}event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoded = new TextEncoder().encode(payload);

    for (const [clientId, controller] of clients.entries()) {
      try {
        controller.enqueue(encoded);
      } catch {
        this.unsubscribe(eventId, clientId);
      }
    }
  }
}

export const sseHub = new SSEChannelHub();
```

#### C. Integrasi Route Handler Hono SSE & Pemulihan Reconnect (`Last-Event-ID`)
Jika sinyal internet Host atau Tamu terputus sesaat, klien mengirimkan header `Last-Event-ID` atau query `?lastTimestamp=...` saat reconnect untuk menjemput pesan yang terlewat:

```typescript
// apps/api/src/modules/realtime/routes.ts
import { Hono } from 'hono';
import { sseHub } from './hub';
import { db } from '@inveeta/db';
import { wishes } from '@inveeta/db/schemas';
import { eq, and, gt } from 'drizzle-orm';
import { generateId } from '@inveeta/shared';

export const realtimeModule = new Hono().get('/events/:id/stream', async (c) => {
  const eventId = c.req.param('id');
  const clientId = generateId();
  const lastEventId = c.req.header('Last-Event-ID') || c.req.query('lastTimestamp');

  const stream = new ReadableStream({
    async start(controller) {
      sseHub.subscribe(eventId, clientId, controller);

      // 1. Pemulihan Reconnect: Kirim ucapan yang terlewat saat jaringan terputus
      if (lastEventId) {
        const lastDate = new Date(lastEventId);
        if (!isNaN(lastDate.getTime())) {
          const missedWishes = await db
            .select()
            .from(wishes)
            .where(and(
              eq(wishes.eventId, eventId),
              eq(wishes.isHidden, false),
              gt(wishes.createdAt, lastDate)
            ))
            .orderBy(wishes.createdAt);

          for (const wish of missedWishes) {
            const payload = `id: ${wish.createdAt.toISOString()}\nevent: wish.created\ndata: ${JSON.stringify(wish)}\n\n`;
            controller.enqueue(new TextEncoder().encode(payload));
          }
        }
      }

      // 2. Heartbeat berkala tiap 15 detik
      const heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': ping\n\n'));
        } catch {
          clearInterval(heartbeatTimer);
        }
      }, 15000);

      // 3. Pembersihan saat koneksi ditutup oleh browser / network drop
      c.req.raw.signal.addEventListener('abort', () => {
        clearInterval(heartbeatTimer);
        sseHub.unsubscribe(eventId, clientId);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Nginx buffering off
    },
  });
});
```

#### D. Konfigurasi Caddy Reverse Proxy untuk SSE
Caddy secara default dapat menahan buffer respons streaming. Direktif `flush_interval -1` diwajibkan pada blok reverse proxy:

```caddyfile
# /etc/caddy/Caddyfile
api.inveeta.com {
    reverse_proxy localhost:3000 {
        # Matikan output buffering khusus path SSE realtime
        @sse path /realtime/*
        handle @sse {
            flush_interval -1
        }
    }
}
```

---

### 4.8 Siklus Hidup Unggah Media R2 (Verifikasi 2-Fase)

Untuk mencegah data media palsu (*ghost records*) di database dan memastikan tidak ada pengunggahan file ilegal yang melebihi kuota 2 MB (foto) atau 10 MB (audio), alur upload menggunakan mekanisme **Verifikasi 2-Fase**:

```mermaid
sequenceDiagram
    autonumber
    actor Host as Host Browser (Dashboard)
    participant API as apps/api (Node.js)
    participant R2 as Cloudflare R2 Bucket
    participant DB as PostgreSQL (packages/db)

    Note over Host,API: Fase 1: Permintaan Presigned URL
    Host->>API: POST /media/presign { fileName, mimeType, fileSize, slotIdentifier }
    Note over API: Validasi MIME (image/jpeg, audio/mpeg) & Ukuran (<= 2MB/10MB)
    API->>API: Generate unique fileKey (events/{id}/{uuid}.ext)
    API->>R2: S3 Client createPutObjectCommand(key, metadata)
    API-->>Host: 200 OK { uploadUrl, fileKey, publicUrl }

    Note over Host,R2: Unggah Langsung Klien ke Cloudflare R2
    Host->>R2: PUT uploadUrl (Binary File Body)
    R2-->>Host: 200 OK (Upload Selesai)

    Note over Host,DB: Fase 2: Konfirmasi & Verifikasi Integritas
    Host->>API: POST /media/confirm { eventId, fileKey, mediaType, slotIdentifier }
    API->>R2: S3 HeadObjectCommand(fileKey)
    R2-->>API: Head Metadata { ContentLength, ContentType }
    Note over API: Verifikasi keberadaan fisik file & ukuran asli di R2
    API->>DB: INSERT into event_media (id, event_id, file_key, file_url, file_size, ...)
    DB-->>API: Saved
    API-->>Host: 201 Created { media: eventMediaRecord }
```

#### Spesifikasi Validasi:
1. **Endpoint `POST /media/presign`**:
   - Foto: ekstensi `.jpg`, `.jpeg`, `.png`, `.webp`, ukuran `fileSize <= 2 * 1024 * 1024` (2 MB).
   - Audio Musik: ekstensi `.mp3`, `.m4a`, ukuran `fileSize <= 10 * 1024 * 1024` (10 MB).
   - Masa berlaku presigned URL dibatasi maksimal **10 menit**.
2. **Endpoint `POST /media/confirm`**:
   - Wajib memanggil `HeadObjectCommand` ke R2 untuk memeriksa keberadaan file sebelum data dicatat ke tabel `event_media`.
   - Jika file tidak ditemukan di R2 atau ukurannya melebihi batas yang dideklarasikan, API membatalkan pencatatan dan mengembalikan `400 Bad Request`.

---

## 5. Desain API & Kontrak (Hono RPC & Shared DTO)

### 5.1 Standar Desain API & Konvensi Hono RPC

#### A. Paradigma Arsitektur API
1. **Pendekatan Hibrida (RESTful + End-to-End Type Safety)**:
   - Seluruh endpoint mematuhi konvensi RESTful standar (metode HTTP, URI resource-oriented, kode status HTTP semantik).
   - Seluruh endpoint didefinisikan menggunakan chaining method Hono (`.get()`, `.post()`, `.put()`, `.patch()`, `.delete()`) dengan validasi `zValidator` dari `@hono/zod-validator`.
   - Backend mengekspor tipe gabungan `AppType` dari `apps/api/src/index.ts`. Frontend (`apps/invitation` dan `apps/dashboard`) mengonsumsi API melalui client bawaan Hono (`hc<AppType>`), menghasilkan *zero-codegen type-safe RPC*.
2. **Format Standar Amplop Respons (*Response Envelope*)**:
   Seluruh respons API dibungkus dalam format amplop terpadu:
   - **Respons Berhasil (`success: true`)**:
     ```typescript
     export interface ApiSuccessResponse<T> {
       success: true;
       data: T;
       meta?: {
         page?: number;
         limit?: number;
         total?: number;
         hasMore?: boolean;
       };
     }
     ```
   - **Respons Gagal (`success: false`)**:
     ```typescript
     export interface ApiErrorResponse {
       success: false;
       error: {
         code: string; // Mis. 'VALIDATION_ERROR', 'FORBIDDEN_OVERRIDE', 'NOT_FOUND'
         message: string; // Pesan ramah pengguna (Bahasa Indonesia)
         details?: Record<string, unknown> | Array<{ field: string; issue: string }>;
       };
     }
     ```

#### B. Katalog Error & Pemetaan Kode Status HTTP
Global Error Handler di `apps/api` memetakan seluruh kegagalan menjadi kode status semantik dan respons JSON seragam:

| Kode HTTP | Error Code | Skenario Bisnis |
|---|---|---|
| **400 Bad Request** | `VALIDATION_ERROR` | Skema Zod gagal, format UUID/nanoid salah, MIME/ukuran media tidak valid. |
| **400 Bad Request** | `RSVP_DEADLINE_EXCEEDED` | Tamu mencoba submit RSVP setelah `rsvpDeadline` terlewati. |
| **400 Bad Request** | `PAX_QUOTA_EXCEEDED` | `actualPax` melebihi kuota `maxPax` yang diberikan Host. |
| **401 Unauthorized** | `UNAUTHORIZED` | Token sesi Better Auth tidak ada, kadaluarsa, atau tidak valid. |
| **403 Forbidden** | `FORBIDDEN_RESOURCE` | Host mencoba mengakses/mengubah acara milik Host lain. |
| **403 Forbidden** | `MANUAL_OVERRIDE_LOCKED` | Tamu mencoba mengisi RSVP yang telah dikunci/di-override manual oleh Host. |
| **403 Forbidden** | `SESSION_NOT_ALLOCATED` | Tamu mencoba RSVP pada sesi yang tidak dialokasikan kepadanya. |
| **404 Not Found** | `RESOURCE_NOT_FOUND` | Slug acara, ID sesi, token tamu, atau file media tidak ditemukan. |
| **409 Conflict** | `SLUG_ALREADY_EXISTS` | Slug acara yang diajukan sudah digunakan oleh acara live lain. |
| **429 Too Many Requests** | `RATE_LIMIT_EXCEEDED` | IP melewati batas rate limiter (IP tamu/buku ucapan spamming). |
| **500 Internal Server Error** | `INTERNAL_SERVER_ERROR` | Kesalahan sistem tak terduga (kegagalan database, crash R2 SDK). |

#### C. Global Error Handler & Middleware Validasi
```typescript
// apps/api/src/middlewares/errorHandler.ts
import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';

export const globalErrorHandler = (err: Error, c: Context) => {
  // 1. Tangani Zod Validation Error dari zValidator
  if (err instanceof ZodError) {
    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Format data masukan tidak valid',
          details: err.issues.map((issue) => ({
            field: issue.path.join('.'),
            issue: issue.message,
          })),
        },
      },
      400
    );
  }

  // 2. Tangani Custom Domain Application Errors
  if (err instanceof AppError) {
    return c.json(
      {
        success: false,
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      },
      err.statusCode as any
    );
  }

  // 3. Tangani HTTP Exceptions bawaan Hono
  if (err instanceof HTTPException) {
    return c.json(
      {
        success: false,
        error: {
          code: 'HTTP_EXCEPTION',
          message: err.message,
        },
      },
      err.status
    );
  }

  // 4. Tangani Unhandled Internal Server Errors
  console.error('[UNHANDLED_ERROR]', err);
  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Terjadi kesalahan internal pada server. Silakan coba beberapa saat lagi.',
      },
    },
    500
  );
};
```

#### D. Konvensi Penamaan, Prefix Versi, dan Standar Paginasi

1. **Prefix Versi API**:
   - Seluruh rute fungsional bisnis diawali dengan prefix `/api/v1/`:
     - `/api/v1/public/*`: Akses terbuka tanpa autentikasi (undangan, RSVP, ucapan).
     - `/api/v1/manage/*`: Akses terproteksi sesi Host (dashboard manajemen acara).
   - Rute modul autentikasi di-mount pada `/api/auth/*` mengikuti standar bawaan Better Auth.
   - Rute internal webhook revalidasi di-mount pada `https://inveeta.com/api/revalidate` (Next.js App Router).

2. **Standar Penamaan (Casing Conventions)**:
   - **URI Path & Query Parameters**: Menggunakan format `kebab-case` (contoh: `/api/v1/manage/events/:id/wa-template`, `?rsvp-status=attending`).
   - **JSON Keys (Request & Response Body)**: Menggunakan format `camelCase` (contoh: `senderName`, `maxPax`, `allocatedSessionIds`).
   - **HTTP Headers Kustom**: Menggunakan format `kebab-case` (contoh: `x-revalidate-secret`, `x-request-id`).
   - **Skema Zod & Type DTO**: Menggunakan format `PascalCase` dengan suffix deskriptif (contoh: `PublicEventDTO`, `CreateGuestInput`, `SubmitRsvpSchema`).

3. **Standar Paginasi**:
   - **Offset-based Pagination (Dashboard Host)**: Digunakan pada endpoint tabel manajemen tamu (`GET /manage/events/:id/guests`) dan moderasi ucapan (`GET /manage/events/:id/wishes/manage`).
     - Query parameters: `page` (integer, default `1`) dan `limit` (integer, default `25`, maks `100`).
     - Metadata amplop respons: `{ page: 1, limit: 25, total: 150, hasMore: true }`.
   - **Cursor-based Pagination (Buku Ucapan Publik Tamu)**: Digunakan pada endpoint publik `GET /public/wishes/:eventId` untuk menjamin konsistensi infinite-scroll tanpa duplikasi atau item terlewat saat ucapan baru masuk secara bersamaan.
     - Query parameters: `cursor` (string timestamp ISO 8601 terenkode atau ID ucapan terakhir) dan `limit` (default `20`, maks `50`).
     - Metadata amplop respons: `{ nextCursor: "2026-10-15T10:15:30.000Z", hasMore: true }`.

---

### 5.2 Katalog Endpoint Lengkap

Struktur rute dikelompokkan secara modular berdasarkan hak akses dan domain:

```
apps/api/src/routes/
├── public/                 # Endpoint terbuka untuk apps/invitation (Tamu)
│   ├── events.ts           # GET /events/:slug, GET /events/:slug/check
│   ├── guests.ts           # GET /events/:slug/guests/:token
│   ├── rsvp.ts             # POST /rsvp
│   └── wishes.ts           # GET /wishes/:eventId, POST /wishes
├── manage/                 # Endpoint terproteksi auth untuk apps/dashboard (Host)
│   ├── events.ts           # Draft wizard, publish, detail, update, delete
│   ├── sessions.ts         # CRUD sesi acara
│   ├── guests.ts           # CRUD tamu, manual override
│   ├── waTemplate.ts       # Template WhatsApp & dynamic link generator
│   ├── wishes.ts           # Moderasi (toggle hidden, hard delete)
│   ├── media.ts            # Presign & confirm upload Cloudflare R2
│   ├── exports.ts          # Ekspor Excel (.xlsx) & CSV
│   └── metrics.ts          # Ringkasan KPI acara & RSVP
└── realtime/               # Endpoint streaming SSE
    └── stream.ts           # GET /realtime/events/:id/stream
```

```mermaid
graph TD
    ClientInvitation["apps/invitation<br/>(Next.js 15)"] -->|Hono RPC (Public)| APIPublic["apps/api<br/>/public/*"]
    ClientDashboard["apps/dashboard<br/>(Vite PWA)"] -->|Hono RPC (Bearer / Cookie)| APIManage["apps/api<br/>/manage/*"]
    ClientRealtime["Browser Client<br/>(SSE EventSource)"] -->|Text/Event-Stream| APIRealtime["apps/api<br/>/realtime/*"]

    subgraph "apps/api Domain Handlers"
        APIPublic --> ModPubEvents["Public Events & Guests"]
        APIPublic --> ModPubRSVP["RSVP Submission"]
        APIPublic --> ModPubWishes["Public Wishes Book"]
        APIManage --> ModManWizard["Wizard & Event Lifecycle"]
        APIManage --> ModManGuests["Guest Management & Override"]
        APIManage --> ModManMedia["R2 Media Verification"]
        APIManage --> ModManExports["Excel/CSV Export"]
        APIRealtime --> SSEHub["SSEChannelHub Singleton"]
    end
```

#### A. Katalog Endpoint Publik (`/public/*`)

Endpoint ini dikonsumsi oleh `apps/invitation` untuk rendering halaman web undangan, verifikasi tamu personal, pengisian formulir RSVP, dan buku ucapan. Seluruh respons **bebas dari kebocoran data sensitif** (daftar seluruh tamu, nomor HP tamu lain, dan data internal host disaring ketat).

##### 1. `GET /events/:slug` — Ambil Data Acara Publik (ISR & OG Metadata)
- **Fungsi**: Titik masuk utama `apps/invitation` (`generateMetadata` & `page.tsx`). Mengembalikan data publik acara untuk kompilasi HTML statis.
- **Header**: `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`
- **Request Param**: `slug: string`
- **Response Data (`PublicEventDTO`)**:
```typescript
{
  id: string;
  slug: string;
  title: string;
  eventType: 'wedding';
  templateId: string;
  templateTier: 'free' | 'premium' | 'exclusive';
  visualCustomization: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    coverLayout: string;
    sectionsOrder: string[];
    hiddenSections: string[];
  };
  eventDate: string; // ISO 8601 UTC Offset
  timeZone: 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura';
  rsvpDeadline: string; // ISO 8601 UTC Offset
  isPublished: boolean;
  ogImageUrl: string | null;
  groomName: string | null;
  groomNickname: string | null;
  groomParents: string | null;
  brideName: string | null;
  brideNickname: string | null;
  brideParents: string | null;
  quoteText: string | null;
  quoteSource: string | null;
  loveStory: Array<{ year: string; story: string; photoUrl?: string }>;
  giftDetails: {
    qrisImageUrl: string | null;
    giftAddress: string | null;
    giftRecipientName: string | null;
    bankAccounts: Array<{
      id: string;
      bankName: string;
      accountNumber: string;
      accountHolder: string;
    }>;
  } | null;
  media: Array<{
    id: string;
    mediaType: 'photo' | 'audio' | 'qris' | 'og_image';
    fileUrl: string;
    slotIdentifier: string | null;
    sortOrder: number;
  }>;
  sessions: Array<{
    id: string;
    title: string;
    startTime: string; // ISO 8601
    endTime: string;   // ISO 8601
    locationName: string;
    address: string;
    googleMapsUrl: string | null;
    wazeUrl: string | null;
    isPublic: boolean;
  }>;
}
```

##### 2. `GET /events/:slug/check` — Cek Ketersediaan Slug
- **Fungsi**: Memvalidasi ketersediaan slug secara real-time pada wizard dashboard sebelum disimpan.
- **Request Query**: `?slug=string`
- **Response Data**:
```typescript
{
  slug: string;
  isAvailable: boolean;
  reason?: 'ALREADY_TAKEN' | 'RESERVED_KEYWORD' | 'INVALID_FORMAT';
}
```

##### 3. `GET /events/:slug/guests/:token` — Verifikasi Tamu Personal
- **Fungsi**: Mengautentikasi tamu berdasarkan token 10 karakter unik pada URL `/[slug]/[token]`. Mengembalikan nama personal, batas kuota pax, sesi yang dialokasikan, dan status RSVP yang sudah terisi.
- **Request Param**: `slug: string`, `token: string`
- **Response Data (`PersonalizedGuestContextDTO`)**:
```typescript
{
  guest: {
    id: string;
    name: string;
    category: 'VIP' | 'Keluarga' | 'Reguler';
    maxPax: number;
    token: string;
  };
  allocatedSessions: Array<{
    sessionId: string;
    sessionTitle: string;
    startTime: string;
    endTime: string;
    locationName: string;
    address: string;
    googleMapsUrl: string | null;
    currentRsvp: {
      status: 'pending' | 'attending' | 'declined';
      actualPax: number;
      notes: string | null;
      isManualOverride: boolean; // Jika true, form dikunci bagi tamu
      updatedAt: string;
    } | null;
  }>;
  isRsvpLocked: boolean; // True jika deadline lewat ATAU di-override Host
  lockReason: 'DEADLINE_PASSED' | 'HOST_OVERRIDE' | null;
}
```

##### 4. `POST /rsvp` — Konfirmasi Kehadiran Tamu (Atomic Multi-Session Batch Upsert)
- **Fungsi**: Mengirimkan konfirmasi kehadiran tamu per sesi dalam satu transaksi atomik. Menolak submission jika batas waktu lewat, kuota per sesi berlebih, atau dikunci oleh host.
- **Request Body (`SubmitRsvpInput`)**:
```typescript
{
  eventId: string;
  guestId: string;
  sessions: Array<{
    eventSessionId: string;
    status: 'attending' | 'declined';
    actualPax: number; // 0 jika declined, 1..maxPax jika attending
  }>;
  notes?: string;
}
```
- **Response Data**:
```typescript
{
  guestId: string;
  sessions: Array<{
    id: string;
    eventSessionId: string;
    status: 'attending' | 'declined';
    actualPax: number;
    updatedAt: string;
  }>;
  notes: string | null;
}
```

##### 5. `GET /wishes/:eventId` — Daftar Buku Ucapan Publik
- **Fungsi**: Mengambil daftar ucapan tamu dengan paginasi kursor (*cursor-based pagination*) untuk scrolling lancar.
- **Request Param**: `eventId: string`
- **Request Query**: `?limit=20&cursor=string` (ISO 8601 created_at kursor)
- **Response Data**:
```typescript
{
  wishes: Array<{
    id: string;
    senderName: string;
    message: string;
    senderRelation: string | null;
    createdAt: string;
  }>;
  nextCursor: string | null;
  hasMore: boolean;
}
```

##### 6. `POST /wishes` — Kirim Ucapan Tamu Baru
- **Fungsi**: Menyimpan ucapan tamu ke database, membersihkan HTML anti-XSS, memberlakukan rate limit 1/30 detik per IP, dan memancarkan ucapan secara real-time ke seluruh klien aktif via SSE Channel Hub.
- **Request Body (`CreateWishInput`)**:
```typescript
{
  eventId: string;
  guestId?: string; // Opsional jika ucapan dikirim dari link publik tanpa token
  senderName: string; // 2..50 karakter
  message: string;    // 5..500 karakter
  senderRelation?: string; // Mis. 'Sahabat Kampus', 'Kolega Kantor'
}
```
- **Response Data**:
```typescript
{
  id: string;
  senderName: string;
  message: string;
  senderRelation: string | null;
  createdAt: string;
}
```

---

#### B. Katalog Endpoint Terproteksi Host (`/manage/*`)

Endpoint ini diakses eksklusif oleh Host dari `apps/dashboard`. Seluruh endpoint dilindungi oleh `authMiddleware` Better Auth dan memverifikasi kepemilikan acara (`hostId === currentUser.id`).

##### 1. Manajemen Acara & Siklus Hidup Wizard (`/manage/events`)

| Metode & URI | Deskripsi Operasi | Request Body / Query | Kode Status |
|---|---|---|:---:|
| `GET /manage/events/mine` | Ambil seluruh acara milik Host yang login | - | 200 |
| `GET /manage/events/:id` | Ambil detail lengkap satu acara untuk editing | `id: string` | 200 |
| `POST /manage/events/draft` | Inisialisasi draft acara baru (Step 1 Wizard) | `CreateDraftEventInput` | 201 |
| `PUT /manage/events/:id/wizard-step` | Simpan progres form parsial per step wizard | `UpdateWizardStepInput` | 200 |
| `POST /manage/events/:id/publish` | Validasi kelengkapan semua step & kunci slug | `PublishEventInput` | 200 |
| `PATCH /manage/events/:id` | Update data acara live (larangan mutasi slug) | `UpdatePublishedEventInput` | 200 |
| `DELETE /manage/events/:id` | Hard delete acara beserta seluruh relasi DB | `id: string` | 200 |

###### Detail Spesifikasi `POST /manage/events/:id/publish`:
```typescript
// Payload Response Sukses
{
  id: string;
  slug: string;
  isPublished: true;
  publishedAt: string;
  invitationUrl: "https://inveeta.com/andi-siti";
}
```
*Efek Samping*:
1. Mengubah `is_published = true` di PostgreSQL.
2. Memanggil endpoint revalidasi internal Next.js `apps/invitation` (`POST https://inveeta.com/api/revalidate`) dengan header `x-revalidate-secret` untuk membersihkan tag cache `events-${slug}`.

##### 2. Manajemen Sesi Acara (`/manage/events/:id/sessions`)

| Metode & URI | Deskripsi Operasi | Request Body |
|---|---|---|
| `POST /manage/events/:id/sessions` | Tambah sesi acara (mis. Akad, Resepsi, Unduh Mantu) | `CreateSessionInput` |
| `PUT /manage/events/:id/sessions/:sessionId` | Update nama, jadwal, dan lokasi sesi | `UpdateSessionInput` |
| `DELETE /manage/events/:id/sessions/:sessionId` | Hapus sesi (menolak jika sudah ada alokasi tamu & RSVP) | - |

##### 3. Manajemen Tamu & Alokasi Kehadiran (`/manage/events/:id/guests`)

| Metode & URI | Deskripsi Operasi | Request Param / Body / Query |
|---|---|---|
| `GET /manage/events/:id/guests` | Daftar tamu dengan filter & pencarian | `?search=andi&category=VIP&rsvpStatus=attending&page=1&limit=25` |
| `POST /manage/events/:id/guests` | Tambah tamu satuan (generate token & alokasi sesi) | `CreateGuestInput` |
| `PUT /manage/events/:id/guests/:guestId` | Edit nama, nomor WhatsApp, kuota pax, & sesi | `UpdateGuestInput` |
| `DELETE /manage/events/:id/guests/:guestId` | Hapus tamu dari sistem (`CASCADE` RSVP) | `guestId: string` |
| `PATCH /manage/events/:id/guests/:guestId/override` | Manual Override RSVP oleh Host (mengunci form tamu) | `ManualOverrideRsvpInput` |

###### Kontrak Input & Output `POST /manage/events/:id/guests`:
```typescript
// Request Body
{
  name: "Bpk. Rahmat & Keluarga";
  phoneNumber: "081234567890";
  category: "Keluarga"; // 'VIP' | 'Keluarga' | 'Reguler'
  maxPax: 4;
  allocatedSessionIds: ["sess_akad_123", "sess_resepsi_456"];
}

// Response Body Data
{
  id: "gst_789abc";
  name: "Bpk. Rahmat & Keluarga";
  phoneNumber: "081234567890";
  category: "Keluarga";
  maxPax: 4;
  token: "k7X9qL2p0m"; // 10 karakter unik nanoid
  invitationUrl: "https://inveeta.com/andi-siti/k7X9qL2p0m";
  allocatedSessionIds: ["sess_akad_123", "sess_resepsi_456"];
  createdAt: "2026-10-15T10:00:00+07:00";
}
```

###### Kontrak Input `PATCH /manage/events/:id/guests/:guestId/override`:
```typescript
{
  sessionId: "sess_resepsi_456";
  status: "attending"; // 'attending' | 'declined' | 'pending'
  actualPax: 3;
  notes: "Dikonfirmasi via telepon langsung oleh Host";
  lockGuestForm: true; // Set isManualOverride = true
}
```

##### 4. Distribusi Undangan WhatsApp (`/manage/events/:id/wa-template`)

| Metode & URI | Deskripsi Operasi | Request Body / Query |
|---|---|---|
| `GET /manage/events/:id/wa-template` | Ambil template pesan WhatsApp acara | - |
| `PUT /manage/events/:id/wa-template` | Simpan template pesan kustom | `{ templateText: string }` |
| `GET /manage/events/:id/guests/:guestId/wa-link` | Dapatkan link `wa.me` dengan teks pesan terisi | `guestId: string` |

###### Generator Link WhatsApp (`GET .../wa-link`):
Sistem mensubstitusi variabel dinamis:
- `{nama}` $\rightarrow$ `guest.name`
- `{link}` $\rightarrow$ `https://inveeta.com/{slug}/{guest.token}`
- `{acara}` $\rightarrow$ `event.title`
- `{tanggal}` $\rightarrow$ Format tanggal ramah pengguna (mis. `Sabtu, 12 Desember 2026`)

Respons mengembalikan string tautan siap pakai:
```typescript
{
  phoneNumber: "6281234567890"; // Standarisasi format E.164 tanpa tanda '+'
  rawMessage: "Halo Bpk. Rahmat, kami mengundang Anda ke pernikahan Andi & Siti...",
  encodedUrl: "https://wa.me/6281234567890?text=Halo%20Bpk.%20Rahmat..."
}
```

##### 5. Moderasi Buku Ucapan (`/manage/events/:id/wishes`)

| Metode & URI | Deskripsi Operasi | Request Param / Body |
|---|---|---|
| `GET /manage/events/:id/wishes/manage` | Ambil seluruh ucapan untuk Host (termasuk yang disembunyikan) | `?page=1&limit=50&status=all` |
| `PATCH /manage/events/:id/wishes/:wishId/visibility` | Sembunyikan atau tampilkan kembali ucapan | `{ isHidden: boolean }` |
| `DELETE /manage/events/:id/wishes/:wishId` | Hapus ucapan secara permanen (Hard Delete) | `wishId: string` |

##### 6. Siklus Unggah Media Cloudflare R2 (`/manage/media`)

| Metode & URI | Deskripsi Operasi | Request Body |
|---|---|---|
| `POST /manage/media/presign` | Minta presigned PUT URL R2 (validasi MIME & Size) | `PresignMediaInput` |
| `POST /manage/media/confirm` | Verifikasi file fisik di R2 via S3 HeadObject & simpan DB | `ConfirmMediaInput` |
| `DELETE /manage/media/:mediaId` | Hapus media dari PostgreSQL dan hapus file di bucket R2 | `mediaId: string` |

##### 7. Ekspor Data Rekap Tamu & RSVP (`/manage/events/:id/export`)

| Metode & URI | Format Respons | Header & Konten |
|---|---|---|
| `GET /manage/events/:id/export/xlsx` | Binary File Buffer (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) | `Content-Disposition: attachment; filename="rekap-tamu-[slug].xlsx"` |
| `GET /manage/events/:id/export/csv` | Text Stream (`text/csv; charset=utf-8`) | `Content-Disposition: attachment; filename="rekap-tamu-[slug].csv"` |

Kolom Dokumen Ekspor:
1. `No`
2. `Nama Tamu`
3. `Kategori` (VIP / Keluarga / Reguler)
4. `Nomor WhatsApp`
5. `Kuota Maks Pax`
6. `Sesi Dialokasikan`
7. `Status Konfirmasi RSVP` (Hadir / Tidak Hadir / Belum Respon)
8. `Jumlah Hadir Sebenarnya (Pax)`
9. `Catatan Tamu`
10. `Diubah Manual oleh Host` (Ya / Tidak)
11. `Tautan Undangan Personal`
12. `Waktu Terakhir Konfirmasi`

##### 8. Metrik Dashboard Host (`/manage/events/:id/metrics`)
- **Fungsi**: Agregasi performa acara untuk komponen statistik atas dashboard.
- **Response Data (`EventDashboardMetricsDTO`)**:
```typescript
{
  totalGuestsInvited: number;
  totalPaxAllocated: number;
  rsvpSummary: {
    attendingCount: number;
    declinedCount: number;
    pendingCount: number;
    totalActualPax: number;
  };
  sessionBreakdown: Array<{
    sessionId: string;
    sessionTitle: string;
    allocatedPax: number;
    confirmedPax: number;
    declinedPax: number;
    pendingPax: number;
  }>;
  totalWishesReceived: number;
}
```

---

#### C. Analisis Perbandingan Payload Endpoint Publik: Per Slug vs Per Token (Resolusi Open Question PRD §5.4)

Dalam arsitektur undangan digital Inveeta, terdapat dua jenis tautan publik:
1. **Tautan Publik Umum** (`inveeta.com/[slug]`): Dibagikan secara luas di media sosial atau grup broadcast.
2. **Tautan Personal Tamu** (`inveeta.com/[slug]/[token]`): Dibagikan khusus per individu/keluarga via WhatsApp.

Untuk memenuhi prinsip keamanan data, kepatuhan UU Pelindungan Data Pribadi (UU PDP), dan pencegahan eksfiltrasi data tamu, payload dibagi secara tegas:

| Bidang Data / Informasi | `GET /public/events/:slug` (Per Slug) | `GET /public/events/:slug/guests/:token` (Per Token) | Rasional Desain & Batasan Privasi (UU PDP) |
|---|:---:|:---:|---|
| **Identitas Acara (Judul, Tanggal, Zona Waktu)** | ✅ Ya | ✅ Ya (Diwarisi dari shell acara) | Informasi publik untuk seluruh tamu. |
| **Profil Pengantin, Kutipan, Cerita Cinta** | ✅ Ya | ✅ Ya (Diwarisi dari shell acara) | Konten naratif umum pernikahan. |
| **Pengaturan Visual & Konfigurasi Template** | ✅ Ya | ✅ Ya (Diwarisi dari shell acara) | Diperlukan oleh engine rendering undangan. |
| **Sesi Acara Publik (`isPublic = true`)** | ✅ Ya | ✅ Ya | Sesi umum (mis. Resepsi) terbuka untuk semua orang. |
| **Sesi Acara Privat (`isPublic = false`)** | ❌ **DITOLAK** | ✅ **Hanya Sesi yang Dialokasikan** | Sesi privat (mis. Akad tertutup) **tidak boleh bocor** di tautan umum. Tamu dengan token hanya melihat sesi privat jika ia dialokasikan oleh Host. |
| **Identitas Personal Tamu (`name`, `category`)** | ❌ **DITOLAK** | ✅ Ya (`name`, `category`) | Menampilkan sapaan personal *"Kepada Yth. Bpk. Rahmat"*. Endpoint slug bebas dari identitas tamu. |
| **Kuota Maksimal Kehadiran (`maxPax`)** | ❌ **DITOLAK** | ✅ Ya | Membatasi angka input kehadiran di form RSVP personal. |
| **Nomor Telepon / WhatsApp Tamu** | ❌ **DITOLAK** | ❌ **DITOLAK (Dilarang Mutlak)** | **Prinsip Zero-Exposure PII**: Nomor telepon **tidak pernah** dikembalikan ke browser tamu untuk mencegah pencurian nomor via token sniffing. |
| **Status Konfirmasi RSVP Saat Ini** | ❌ **DITOLAK** | ✅ Ya (Per sesi alokasi tamu) | Menampilkan riwayat jawaban tamu (Hadir/Tidak Hadir, jumlah pax, catatan). |
| **Flag Kunci Formulir (`isManualOverride`)** | ❌ **DITOLAK** | ✅ Ya | Jika Host telah mengunci jawaban di dashboard, form personal berstatus read-only. |
| **Daftar Rekening & QRIS Digital Gift** | ✅ Ya | ✅ Ya | Informasi amplop digital dapat diakses publik. |
| **Daftar Tamu Lain yang Diundang** | ❌ **DITOLAK** | ❌ **DITOLAK** | Tamu tidak boleh mengetahui siapa saja tamu lain yang diundang oleh Host. |

---

#### D. Matriks Otorisasi, Skema Zod, dan Rate Limiting Terpadu

Berikut adalah matriks acuan implementasi rute backend di `apps/api`:

| Metode & URI Path | Domain | Skema Input (Zod / Param) | Skema Output (DTO) | Aturan Otorisasi | Batas Rate Limiting (per IP / Session) |
|---|---|---|---|---|---|
| `GET /api/v1/public/events/:slug` | Event | `slug: string` | `PublicEventDTO` | Publik (Tanpa Auth) | 100 req / menit per IP |
| `GET /api/v1/public/events/:slug/check` | Event | `?slug=string` | `SlugAvailabilityDTO` | Publik (Tanpa Auth) | 30 req / menit per IP |
| `GET /api/v1/public/events/:slug/guests/:token` | Guest | `slug: string`, `token: string` | `PersonalizedGuestContextDTO` | Publik (Validasi Token) | 60 req / menit per IP |
| `POST /api/v1/public/rsvp` | RSVP | `submitRsvpSchema` | `RsvpResponseDTO` | Publik (Atomic Row Lock) | 10 req / menit per IP |
| `GET /api/v1/public/wishes/:eventId` | Wish | `?cursor=string&limit=20` | `PaginatedWishesDTO` | Publik (Tanpa Auth) | 60 req / menit per IP |
| `POST /api/v1/public/wishes` | Wish | `createWishSchema` | `WishDTO` | Publik (Sanitasi HTML) | **Ketat**: 1 req / 30s & 5 req / 10m per IP |
| `GET /api/v1/realtime/events/:id/stream` | Stream | `id: string`, Header `Last-Event-ID` | Text / Event-Stream | Publik | Maks 5 koneksi concurrent per IP |
| `POST /api/auth/*` | Auth | Skema Better Auth | Sesi / Cookie | Publik / Sesi | 10 percobaan / menit per IP |
| `GET /api/v1/manage/events/mine` | Host | - | `Array<EventListItemDTO>` | Host Login (`requireAuth`) | 60 req / menit per Sesi |
| `GET /api/v1/manage/events/:id` | Host | `id: string` | `FullEventDetailDTO` | Pemilik Acara (`requireEventOwner`) | 60 req / menit per Sesi |
| `POST /api/v1/manage/events/draft` | Host | `createDraftEventSchema` | `DraftEventResponseDTO` | Host Login (`requireAuth`) | 10 req / menit per Sesi |
| `PUT /api/v1/manage/events/:id/wizard-step` | Host | `updateWizardStepSchema` | `EventStepResponseDTO` | Pemilik Acara (`requireEventOwner`) | 30 req / menit per Sesi |
| `POST /api/v1/manage/events/:id/publish` | Host | `id: string` | `PublishEventResponseDTO` | Pemilik Acara (`requireEventOwner`) | 5 req / menit per Sesi |
| `PATCH /api/v1/manage/events/:id` | Host | `updatePublishedEventSchema` | `EventDTO` | Pemilik Acara (`requireEventOwner`) | 20 req / menit per Sesi |
| `DELETE /api/v1/manage/events/:id` | Host | `id: string` | `SuccessDTO` | Pemilik Acara (`requireEventOwner`) | 5 req / menit per Sesi |
| `POST /api/v1/manage/events/:id/sessions` | Session | `createSessionSchema` | `SessionDTO` | Pemilik Acara (`requireEventOwner`) | 20 req / menit per Sesi |
| `PUT /api/v1/manage/events/:id/sessions/:sessionId` | Session | `updateSessionSchema` | `SessionDTO` | Pemilik Acara (`requireEventOwner`) | 20 req / menit per Sesi |
| `DELETE /api/v1/manage/events/:id/sessions/:sessionId` | Session | `id: string`, `sessionId: string` | `SuccessDTO` | Pemilik Acara (`requireEventOwner`) | 10 req / menit per Sesi |
| `GET /api/v1/manage/events/:id/guests` | Guest | `?search=&category=&rsvpStatus=&page=&limit=` | `PaginatedGuestsDTO` | Pemilik Acara (`requireEventOwner`) | 60 req / menit per Sesi |
| `POST /api/v1/manage/events/:id/guests` | Guest | `createGuestSchema` | `GuestDTO` | Pemilik Acara (`requireEventOwner`) | 30 req / menit per Sesi |
| `PUT /api/v1/manage/events/:id/guests/:guestId` | Guest | `updateGuestSchema` | `GuestDTO` | Pemilik Acara (`requireEventOwner`) | 30 req / menit per Sesi |
| `DELETE /api/v1/manage/events/:id/guests/:guestId` | Guest | `id: string`, `guestId: string` | `SuccessDTO` | Pemilik Acara (`requireEventOwner`) | 20 req / menit per Sesi |
| `PATCH /api/v1/manage/events/:id/guests/:guestId/override` | Guest | `manualOverrideRsvpSchema` | `GuestRsvpDTO` | Pemilik Acara (`requireEventOwner`) | 30 req / menit per Sesi |
| `GET /api/v1/manage/events/:id/wa-template` | WhatsApp | `id: string` | `WaTemplateDTO` | Pemilik Acara (`requireEventOwner`) | 30 req / menit per Sesi |
| `PUT /api/v1/manage/events/:id/wa-template` | WhatsApp | `updateWaTemplateSchema` | `WaTemplateDTO` | Pemilik Acara (`requireEventOwner`) | 20 req / menit per Sesi |
| `GET /api/v1/manage/events/:id/guests/:guestId/wa-link` | WhatsApp | `id: string`, `guestId: string` | `WaLinkDTO` | Pemilik Acara (`requireEventOwner`) | 60 req / menit per Sesi |
| `GET /api/v1/manage/events/:id/wishes/manage` | Moderation | `?page=&limit=&status=` | `PaginatedManageWishesDTO` | Pemilik Acara (`requireEventOwner`) | 60 req / menit per Sesi |
| `PATCH /api/v1/manage/events/:id/wishes/:wishId/visibility` | Moderation | `{ isHidden: boolean }` | `WishDTO` | Pemilik Acara (`requireEventOwner`) | 30 req / menit per Sesi |
| `DELETE /api/v1/manage/events/:id/wishes/:wishId` | Moderation | `id: string`, `wishId: string` | `SuccessDTO` | Pemilik Acara (`requireEventOwner`) | 20 req / menit per Sesi |
| `POST /api/v1/manage/media/presign` | Media | `presignMediaSchema` | `PresignedUrlDTO` | Host Login (`requireAuth`) | 20 req / menit per Sesi |
| `POST /api/v1/manage/media/confirm` | Media | `confirmMediaSchema` | `MediaDTO` | Host Login (`requireAuth`) | 20 req / menit per Sesi |
| `DELETE /api/v1/manage/media/:mediaId` | Media | `mediaId: string` | `SuccessDTO` | Host Login (`requireAuth`) | 20 req / menit per Sesi |
| `GET /api/v1/manage/events/:id/export/xlsx` | Export | `id: string` | Binary Buffer (`.xlsx`) | Pemilik Acara (`requireEventOwner`) | 5 req / menit per Sesi |
| `GET /api/v1/manage/events/:id/export/csv` | Export | `id: string` | Text Stream (`.csv`) | Pemilik Acara (`requireEventOwner`) | 5 req / menit per Sesi |
| `GET /api/v1/manage/events/:id/metrics` | Metrics | `id: string` | `EventDashboardMetricsDTO` | Pemilik Acara (`requireEventOwner`) | 60 req / menit per Sesi |

---

### 5.3 Definisi Kontrak & Shared DTO (`packages/shared`)

Struktur folder kontrak di `packages/shared`:
```
packages/shared/src/
├── schemas/
│   ├── event.schema.ts
│   ├── session.schema.ts
│   ├── guest.schema.ts
│   ├── rsvp.schema.ts
│   ├── wish.schema.ts
│   └── media.schema.ts
└── dto/
    ├── event.dto.ts
    ├── guest.dto.ts
    ├── rsvp.dto.ts
    └── metrics.dto.ts
```

#### A. Kode Implementasi Skema Zod Inti

##### 1. Skema Event & Wizard (`packages/shared/src/schemas/event.schema.ts`)
```typescript
import { z } from 'zod';

export const dateTimeSchema = z.string().datetime({ offset: true });

export const visualCustomizationSchema = z.object({
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6})$/, 'Format kode warna HEX tidak valid'),
  secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6})$/, 'Format kode warna HEX tidak valid'),
  fontFamily: z.enum(['playfair-inter', 'cormorant-montserrat', 'cinzel-lato']),
  coverLayout: z.enum(['fullscreen-image', 'split-card', 'minimal-typography']),
  sectionsOrder: z.array(z.string()).min(3),
  hiddenSections: z.array(z.string()).default([]),
});

export const createDraftEventSchema = z.object({
  title: z.string().min(3, 'Nama acara minimal 3 karakter').max(100),
  slug: z.string()
    .min(3, 'Slug minimal 3 karakter')
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung (-)'),
  eventType: z.literal('wedding').default('wedding'),
  timeZone: z.enum(['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura']).default('Asia/Jakarta'),
  templateId: z.string().min(1, 'Template wajib dipilih'),
});

export const updateWizardStepSchema = z.object({
  step: z.number().int().min(1).max(5),
  data: z.record(z.unknown()), // Divalidasi secara dinamis sesuai nomor step
});

export const publishEventSchema = z.object({
  eventId: z.string().min(1),
});

export type CreateDraftEventInput = z.infer<typeof createDraftEventSchema>;
export type UpdateWizardStepInput = z.infer<typeof updateWizardStepSchema>;
```

##### 2. Skema Tamu & Override (`packages/shared/src/schemas/guest.schema.ts`)
```typescript
import { z } from 'zod';

export const createGuestSchema = z.object({
  name: z.string().min(2, 'Nama tamu minimal 2 karakter').max(100),
  phoneNumber: z.string()
    .min(9, 'Nomor WhatsApp minimal 9 digit')
    .max(16)
    .regex(/^(?:\+62|62|08)[0-9]{8,13}$/, 'Format nomor WhatsApp tidak valid'),
  category: z.enum(['VIP', 'Keluarga', 'Reguler']).default('Reguler'),
  maxPax: z.number().int().min(1, 'Kuota minimal 1').max(20, 'Kuota maksimal 20 pax').default(2),
  allocatedSessionIds: z.array(z.string()).min(1, 'Pilih minimal satu sesi acara untuk tamu ini'),
});

export const manualOverrideRsvpSchema = z.object({
  sessionId: z.string().min(1),
  status: z.enum(['attending', 'declined', 'pending']),
  actualPax: z.number().int().min(0).max(20),
  notes: z.string().max(300).optional(),
  lockGuestForm: z.boolean().default(true),
});

export type CreateGuestInput = z.infer<typeof createGuestSchema>;
export type ManualOverrideRsvpInput = z.infer<typeof manualOverrideRsvpSchema>;
```

##### 3. Skema RSVP & Buku Ucapan (`packages/shared/src/schemas/rsvp.schema.ts` & `wish.schema.ts`)
```typescript
import { z } from 'zod';

export const rsvpSessionItemSchema = z.object({
  eventSessionId: z.string().min(1),
  status: z.enum(['attending', 'declined']),
  actualPax: z.number().int().min(0).max(20),
}).refine((data) => {
  if (data.status === 'attending') return data.actualPax >= 1;
  if (data.status === 'declined') return data.actualPax === 0;
  return true;
}, {
  message: 'Tamu yang hadir wajib mengisi minimal 1 pax; tamu yang tidak hadir harus 0 pax',
  path: ['actualPax'],
});

export const submitRsvpSchema = z.object({
  eventId: z.string().min(1),
  guestId: z.string().min(1),
  sessions: z.array(rsvpSessionItemSchema).min(1, 'Pilih minimal satu sesi untuk konfirmasi kehadiran'),
  notes: z.string().max(500).optional(),
});

export const createWishSchema = z.object({
  eventId: z.string().min(1),
  guestId: z.string().optional(),
  senderName: z.string().min(2, 'Nama pengirim minimal 2 karakter').max(50),
  message: z.string().min(5, 'Ucapan minimal 5 karakter').max(500, 'Ucapan maksimal 500 karakter'),
  senderRelation: z.string().max(50).optional(),
});

export type SubmitRsvpInput = z.infer<typeof submitRsvpSchema>;
export type CreateWishInput = z.infer<typeof createWishSchema>;
```

##### 4. Skema Media Cloudflare R2 (`packages/shared/src/schemas/media.schema.ts`)
```typescript
import { z } from 'zod';

export const presignMediaSchema = z.object({
  eventId: z.string().min(1),
  fileName: z.string().min(1).max(255),
  mediaType: z.enum(['photo', 'audio', 'qris', 'og_image']),
  mimeType: z.enum([
    'image/jpeg',
    'image/png',
    'image/webp',
    'audio/mpeg',
    'audio/mp4',
    'audio/x-m4a'
  ]),
  fileSize: z.number().int().positive(),
  slotIdentifier: z.string().max(50).optional(),
}).refine((data) => {
  if (data.mediaType === 'photo' || data.mediaType === 'qris' || data.mediaType === 'og_image') {
    return data.fileSize <= 2 * 1024 * 1024; // Maks 2 MB
  }
  if (data.mediaType === 'audio') {
    return data.fileSize <= 10 * 1024 * 1024; // Maks 10 MB
  }
  return false;
}, {
  message: 'Ukuran file melebihi batas (Maks 2 MB untuk foto, 10 MB untuk audio musik)',
  path: ['fileSize'],
});

export const confirmMediaSchema = z.object({
  eventId: z.string().min(1),
  fileKey: z.string().min(1),
  mediaType: z.enum(['photo', 'audio', 'qris', 'og_image']),
  mimeType: z.string().min(1),
  fileSize: z.number().int().positive(),
  slotIdentifier: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

export type PresignMediaInput = z.infer<typeof presignMediaSchema>;
export type ConfirmMediaInput = z.infer<typeof confirmMediaSchema>;
```

---

### 5.4 Pola Komposisi Hono RPC & Konsumsi di Frontend

#### A. Komposisi Router Backend (`apps/api/src/index.ts`)
```typescript
// apps/api/src/index.ts
import { Hono } from 'hono';
import { publicEventsRoute } from './routes/public/events';
import { publicGuestsRoute } from './routes/public/guests';
import { publicRsvpRoute } from './routes/public/rsvp';
import { publicWishesRoute } from './routes/public/wishes';
import { manageEventsRoute } from './routes/manage/events';
import { manageGuestsRoute } from './routes/manage/guests';
import { manageMediaRoute } from './routes/manage/media';
import { manageExportsRoute } from './routes/manage/exports';
import { globalErrorHandler } from './middlewares/errorHandler';

const app = new Hono()
  .onError(globalErrorHandler)
  // Rute Publik (Apps Invitation)
  .route('/api/v1/public/events', publicEventsRoute)
  .route('/api/v1/public/guests', publicGuestsRoute)
  .route('/api/v1/public/rsvp', publicRsvpRoute)
  .route('/api/v1/public/wishes', publicWishesRoute)
  // Rute Terproteksi Host (Apps Dashboard)
  .route('/api/v1/manage/events', manageEventsRoute)
  .route('/api/v1/manage/guests', manageGuestsRoute)
  .route('/api/v1/manage/media', manageMediaRoute)
  .route('/api/v1/manage/exports', manageExportsRoute);

export type AppType = typeof app;
export default app;
```

#### B. Pola Konsumsi Type-Safe di Server Component Next.js 15 (`apps/invitation`)
```typescript
// apps/invitation/src/lib/api-client.ts
import { hc } from 'hono/client';
import type { AppType } from '@inveeta/api';
import React from 'react';

const API_BASE_URL = process.env.API_INTERNAL_URL || 'https://api.inveeta.com';
export const client = hc<AppType>(API_BASE_URL);

/**
 * Fetcher data acara dengan deduping React.cache() dan Next.js 15 On-Demand ISR Tags.
 * Menjamin 0 duplikasi HTTP request antara generateMetadata() dan page container.
 */
export const getCachedPublicEvent = React.cache(async (slug: string) => {
  const res = await client.api.v1.public.events[':slug'].$get(
    { param: { slug } },
    {
      init: {
        cache: 'force-cache',
        next: { tags: [`event-${slug}`], revalidate: 3600 },
      } as RequestInit,
    }
  );

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Gagal memuat data undangan: ${res.statusText}`);
  }

  const payload = await res.json();
  if (!payload.success) throw new Error(payload.error.message);
  return payload.data;
});
```

#### C. Pola Konsumsi Type-Safe di Dashboard Vite + React (`apps/dashboard`)
```typescript
// apps/dashboard/src/features/guests/api/useGuests.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hc } from 'hono/client';
import type { AppType } from '@inveeta/api';
import type { CreateGuestInput } from '@inveeta/shared';

const client = hc<AppType>(import.meta.env.VITE_API_URL, {
  headers: () => ({
    // Better Auth otomatis menyertakan session cookie; tambahkan Bearer jika menggunakan token
  }),
});

export function useEventGuests(eventId: string, queryParams: { page: number; limit: number; search?: string }) {
  return useQuery({
    queryKey: ['events', eventId, 'guests', queryParams],
    queryFn: async () => {
      const res = await client.api.v1.manage.guests[':id'].$get({
        param: { id: eventId },
        query: {
          page: queryParams.page.toString(),
          limit: queryParams.limit.toString(),
          search: queryParams.search,
        },
      });

      if (!res.ok) throw new Error('Gagal mengambil daftar tamu');
      const json = await res.json();
      if (!json.success) throw new Error(json.error.message);
      return json.data;
    },
  });
}

export function useCreateGuest(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateGuestInput) => {
      const res = await client.api.v1.manage.guests[':id'].$post({
        param: { id: eventId },
        json: input,
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error.message);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'guests'] });
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'metrics'] });
    },
  });
}
```

---

## 6. Autentikasi & Otorisasi

### 6.1 Setup Better Auth di Hono (Backend Engine)

Inveeta menggunakan **Better Auth** sebagai fondasi autentikasi modern berbasis TypeScript yang berjalan langsung di dalam proses Node.js `apps/api` tanpa ketergantungan pada server autentikasi pihak ketiga eksternal yang lambat.

```mermaid
graph TD
    Client["Client Browser<br/>(app.inveeta.com)"] -->|Cookie: inveeta_session| HonoAPI["Hono Backend<br/>(api.inveeta.com)"]
    HonoAPI -->|/api/auth/*| BetterAuthEngine["Better Auth Engine<br/>(Drizzle Adapter)"]
    BetterAuthEngine -->|Query/Mutation| DB[("PostgreSQL<br/>users, sessions, accounts")]
    BetterAuthEngine -->|OAuth 2.0 PKCE| GoogleAuth["Google OAuth Provider"]
    BetterAuthEngine -->|Transaksional Email| ResendAPI["Resend API SDK<br/>(Verifikasi & Reset)"]
```

#### A. Konfigurasi Instansiasi Better Auth (`apps/api/src/lib/auth.ts`)
```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@inveeta/db';
import * as authSchemas from '@inveeta/db/schemas/auth';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const IS_PROD = process.env.NODE_ENV === 'production';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      users: authSchemas.users,
      accounts: authSchemas.accounts,
      sessions: authSchemas.sessions,
      verifications: authSchemas.verifications,
    },
  }),
  baseURL: process.env.BETTER_AUTH_URL || 'https://api.inveeta.com',
  // Whitelist origin resmi untuk mencegah penolakan CSRF / Fetch Metadata 403 Forbidden
  trustedOrigins: [
    'https://inveeta.com',
    'https://app.inveeta.com',
    ...(IS_PROD ? [] : ['http://localhost:3000', 'http://localhost:5173']),
  ],
  // 1. Email & Password dengan proteksi hash scrypt/argon2 bawaan
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    async sendResetPasswordEmail({ user, url }) {
      await resend.emails.send({
        from: 'Inveeta Security <auth@inveeta.com>',
        to: user.email,
        subject: 'Atur Ulang Kata Sandi Akun Inveeta Anda',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Permintaan Reset Kata Sandi</h2>
            <p>Halo ${user.name},</p>
            <p>Kami menerima permintaan untuk mengatur ulang kata sandi akun Inveeta Anda. Klik tombol di bawah ini untuk melanjutkan:</p>
            <p><a href="${url}" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">Reset Kata Sandi</a></p>
            <p>Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini.</p>
          </div>
        `,
      });
    },
  },
  // 2. Verifikasi Email Transaksional via Resend
  emailVerification: {
    async sendVerificationEmail({ user, url }) {
      await resend.emails.send({
        from: 'Inveeta <auth@inveeta.com>',
        to: user.email,
        subject: 'Verifikasi Alamat Email Anda - Inveeta',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Selamat Datang di Inveeta!</h2>
            <p>Halo ${user.name}, terima kasih telah mendaftar.</p>
            <p>Silakan klik tautan di bawah ini untuk memverifikasi akun Anda:</p>
            <p><a href="${url}" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">Verifikasi Akun Saya</a></p>
          </div>
        `,
      });
    },
  },
  // 3. Google OAuth 2.0 & Otomatisasi Account Linking
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  account: {
    accountLinking: {
      enabled: true, // Otomatis gabungkan akun Google jika email sudah terdaftar via password
    },
  },
  // 4. Konfigurasi Cookie Lintas Subdomain
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 menit in-memory / redis cache session
    },
    expiresIn: 60 * 60 * 24 * 7, // 7 hari
    updateAge: 60 * 60 * 24, // Perpanjang usia sesi setiap 24 jam aktivitas
  },
  advanced: {
    cookiePrefix: 'inveeta',
    crossSubDomainCookies: {
      enabled: IS_PROD,
      domain: IS_PROD ? '.inveeta.com' : undefined, // Memungkinkan sesi dibagikan antara app. dan api.
    },
    defaultCookieAttributes: {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: 'lax',
      path: '/',
    },
  },
});
```

#### B. Mounting Handler di Router Hono (`apps/api/src/index.ts`)
```typescript
// Mounting endpoint Better Auth ke rute /api/auth/*
app.on(['POST', 'GET'], '/api/auth/**', (c) => {
  return auth.handler(c.req.raw);
});
```

---

### 6.2 Konfigurasi Cookie Lintas Subdomain & Kebijakan CORS

Karena arsitektur Inveeta memisahkan domain front-end dashboard (`app.inveeta.com`), front-end undangan publik (`inveeta.com`), dan backend API (`api.inveeta.com`), konfigurasi CORS dan cookie diatur sangat ketat:

```typescript
// apps/api/src/middlewares/cors.ts
import { cors } from 'hono/cors';

export const corsMiddleware = cors({
  origin: (origin) => {
    // Whitelist origin resmi Inveeta
    const allowedOrigins = [
      'https://inveeta.com',
      'https://app.inveeta.com',
    ];

    // Izinkan localhost pada saat pengujian lokal
    if (process.env.NODE_ENV !== 'production') {
      allowedOrigins.push('http://localhost:3000', 'http://localhost:5173');
    }

    if (!origin || allowedOrigins.includes(origin)) {
      return origin;
    }
    return null; // Tolak origin liar
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-request-id', 'x-revalidate-secret'],
  exposeHeaders: ['Content-Length', 'x-request-id'],
  credentials: true, // Wajib true agar browser mengirimkan cookie lintas subdomain
  maxAge: 86400, // Preflight cache selama 24 jam
});
```

> [!IMPORTANT]
> **Aturan Keamanan Cookie**: Atribut `SameSite=Lax` memungkinkan cookie dikirimkan pada navigasi tingkat atas (*top-level navigation*) dari link eksternal (mis. klik link dari email verifikasi), namun tetap memblokir serangan Cross-Site Request Forgery (CSRF) dari situs pihak ketiga. Domain `.inveeta.com` memastikan sesi Host tetap valid saat berpindah dari `inveeta.com` ke `app.inveeta.com`.

---

### 6.3 Model Otorisasi Berbasis Kepemilikan Acara (*Event Ownership Guard*)

Sistem otorisasi Inveeta menerapkan prinsip **Least Privilege** berbasis kepemilikan relasional (*Resource-Based Access Control*).

#### A. Middleware Autentikasi Host (`requireAuth`)
```typescript
// apps/api/src/middlewares/requireAuth.ts
import { createMiddleware } from 'hono/factory';
import { auth } from '../lib/auth';
import { UnauthorizedError } from '../utils/errors';

export const requireAuth = createMiddleware<{
  Variables: {
    user: typeof auth.$Infer.Session.user;
    session: typeof auth.$Infer.Session.session;
  };
}>(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    throw new UnauthorizedError('Sesi login tidak valid atau telah berakhir');
  }

  c.set('user', session.user);
  c.set('session', session.session);
  await next();
});
```

#### B. Guard Kepemilikan Acara (`requireEventOwner`)
Guard ini menjamin bahwa seorang Host yang berhasil login **hanya dapat mengakses dan memanipulasi acara miliknya sendiri**:

```typescript
// apps/api/src/middlewares/requireEventOwner.ts
import { createMiddleware } from 'hono/factory';
import { db } from '@inveeta/db';
import { events } from '@inveeta/db/schemas/events';
import { eq, and } from 'drizzle-orm';
import { ForbiddenError, NotFoundError } from '../utils/errors';

export const requireEventOwner = (paramKey: 'id' | 'eventId' = 'id') => {
  return createMiddleware<{
    Variables: {
      eventId: string;
    };
  }>(async (c, next) => {
    const user = c.get('user');
    const targetEventId = c.req.param(paramKey);

    if (!targetEventId) {
      throw new NotFoundError('Parameter pengenal acara wajib disertakan');
    }

    // Query efisien indeks PK: periksa apakah acara ada dan dimiliki oleh Host yang login
    const [event] = await db
      .select({ id: events.id, hostId: events.hostId })
      .from(events)
      .where(eq(events.id, targetEventId));

    if (!event) {
      throw new NotFoundError('Acara tidak ditemukan');
    }

    if (event.hostId !== user.id) {
      throw new ForbiddenError('Anda tidak memiliki hak akses untuk mengelola acara ini');
    }

    c.set('eventId', event.id);
    await next();
  });
};
```

---

### 6.4 Mekanisme Token Tamu (*Guest Token Architecture*)

Token tamu berfungsi sebagai kredensial autentikasi pasif tanpa kata sandi (*passwordless capability token*) yang memungkinkan tamu mengakses undangan personal dan mengisi konfirmasi kehadiran.

#### A. Pembangkitan Token Kriptografis (Entropi $\ge 128$-bit)
PRD §4.5 mensyaratkan token dengan entropi minimum 128-bit untuk mencegah serangan *brute-force enumeration* atau *scraping* massal oleh bot liar.

```typescript
// packages/shared/src/utils/token.ts
import crypto from 'crypto';

/**
 * Menghasilkan token tamu berkekuatan kriptografis tinggi.
 * Menggunakan CSPRNG 16 bytes (128 bits entropi murni).
 * Dikodekan dalam Base64URL string (22 karakter bebas simbol ambigu).
 * Total kombinasi: 2^128 ~= 3.4 x 10^38 kombinasi unik.
 */
export function generateGuestToken(): string {
  return crypto.randomBytes(16).toString('base64url');
}
```

#### B. Indexing & Lookup $O(1)$ di Database
Pada skema `guests` (`packages/db/src/schemas/guests.ts`), kolom `token` dilindungi oleh indeks unik:
```typescript
uniqueIndex('guests_token_unique_idx').on(table.token)
```
Query lookup tamu pada endpoint `GET /public/events/:slug/guests/:token`:
```typescript
const [guest] = await db
  .select()
  .from(guests)
  .where(and(eq(guests.eventId, event.id), eq(guests.token, token)));
```
Eksekusi query menggunakan *Index Unique Scan* di PostgreSQL dengan waktu respons $< 1\text{ ms}$.

#### C. Penanganan Token Tidak Valid (*Graceful Fallback Behavior*)
Jika tamu salah mengetik URL atau membuka token yang sudah dihapus oleh Host:
1. **Tidak Melempar Error 500 / Crash**: API mengembalikan respons terstruktur:
   ```json
   {
     "success": false,
     "error": {
       "code": "GUEST_TOKEN_INVALID",
       "message": "Tautan undangan personal tidak dikenali atau telah kedaluwarsa"
     }
   }
   ```
2. **Perilaku di Frontend `apps/invitation`**:
   - Browser **tidak menampilkan layar putih** (*white screen of death*).
   - Halaman me-redirect atau merender fallback tampilan undangan umum (`inveeta.com/[slug]`) dengan banner notifikasi ramah:  
     > *"Tautan personal Anda tidak valid atau telah diperbarui oleh tuan rumah. Menampilkan undangan umum pernikahan."*
   - Formulir RSVP dinonaktifkan dengan panduan bagi tamu untuk menghubungi langsung pihak mempelai jika ingin melakukan konfirmasi kehadiran.

---

## 7. Rendering, Caching & Revalidasi Undangan

### 7.1 Strategi ISR On-Demand di Next.js 15

`apps/invitation` bertanggung jawab menyajikan halaman undangan pernikahan dengan kecepatan pembukaan instan (LCP $\le 2.5\text{ detik}$) bagi ribuan tamu bersamaan tanpa membebani server database PostgreSQL di VPS.

```mermaid
sequenceDiagram
    autonumber
    actor Guest as Tamu Browser
    actor Host as Host Dashboard
    participant CDN as Vercel Edge CDN (ISR Cache)
    participant NextSSR as Next.js 15 Server (apps/invitation)
    participant API as Hono Backend (apps/api)
    participant DB as PostgreSQL (packages/db)

    Note over Guest,CDN: Alur Pembukaan Halaman (Cache Hit - p95 < 100ms)
    Guest->>CDN: GET https://inveeta.com/andi-siti
    CDN-->>Guest: 200 OK (Cached Static HTML + CSS)

    Note over Host,DB: Alur Revalidasi On-Demand saat Host Update Acara
    Host->>API: PATCH /manage/events/:id (Ubah Jadwal Acara)
    API->>DB: UPDATE events SET ...
    DB-->>API: Updated
    API->>NextSSR: POST /api/revalidate { tag: "event-andi-siti" } (x-revalidate-secret)
    NextSSR->>CDN: Purge Cache Tag "event-andi-siti"
    NextSSR-->>API: 200 OK { revalidated: true }
    API-->>Host: 200 OK (Perubahan Tersimpan & Live)
```

#### A. Struktur Tag Revalidasi: Per Acara vs Per Tamu (Resolusi Open Question PRD §5.4)
TDD menetapkan keputusan arsitektur bahwa tag caching ditetapkan **Per Acara (`event-${slug}`)**, **BUKAN** per tamu.

##### Rasional Desain:
1. **Pencegahan Cache Bloat & Kuota Vercel**: Jika tag dibuat per tamu (`event-${slug}-${token}`), sebuah acara dengan 2.000 tamu akan memicu pembuatan 2.000 varian halaman statis di Edge CDN Vercel. Hal ini akan menghabiskan kuota Vercel Edge Cache, memperlambat proses deploy, dan membebani server saat cache miss.
2. **Proporsi Konten Halaman**: 95% muatan halaman undangan (foto cover, biodata pengantin, galeri 10 foto, rundown sesi umum, musik latar, kutipan cinta, amplop QRIS) bersifat **identik mutlak** untuk semua tamu.
3. **Arsitektur Islands & Dynamic Personal Route (`export const dynamic = 'force-dynamic'`)**: Shell acara statis yang berat di-cache di Vercel CDN via ISR dengan tag `event-${slug}`. Pada rute personal `app/[slug]/[token]/page.tsx`, halaman mengekspor `export const dynamic = 'force-dynamic'` agar Vercel Edge CDN **tidak menyimpan** 2.000 file HTML statis terpisah di CDN cache (menghilangkan risiko CDN storage exhaustion & deployment bloat). Server Next.js membaca shell acara secara instan dari Data Cache internal ber-tag `events-${slug}`, lalu menyuntikkan sapaan personal tamu via Client Island `GET /public/events/:slug/guests/:token`.

#### B. Pemicu Revalidasi On-Demand (*Revalidation Triggers*)
Webhook revalidasi dipanggil oleh backend `apps/api` pada mutasi berikut:

| Aksi Host di Dashboard | Endpoint API Terkait | Tag yang Dihapus | Dampak ke CDN |
|---|---|---|---|
| **Publikasi Pertama Kali** | `POST /manage/events/:id/publish` | `event-${slug}` | Halaman aktif seketika di internet. |
| **Pembaruan Detail Acara** | `PATCH /manage/events/:id` | `event-${slug}` | Teks, kutipan, tanggal, dan pengantin terbarui. |
| **Perubahan Sesi Acara** | `POST/PUT/DELETE .../sessions/*` | `event-${slug}` | Rundown waktu dan peta lokasi terbarui. |
| **Ganti Template / Warna** | `PUT /manage/events/:id/wizard-step` | `event-${slug}` | Tata letak dan tema warna terbarui. |
| **Upload / Hapus Media Foto** | `POST /manage/media/confirm` | `event-${slug}` | Galeri foto dan cover terbarui. |

> [!NOTE]
> **Pengecualian Mutasi**: Pengisian RSVP oleh tamu (`POST /rsvp`) dan pengiriman buku ucapan (`POST /wishes`) **TIDAK memicu revalidasi HTML**. Data ucapan dan status kehadiran bersifat realtime dan langsung disalurkan ke klien melalui jalur SSE streaming (`sseHub`), sehingga CDN cache tetap dingin dan stabil.

---

### 7.2 Keamanan Endpoint Revalidate, Retry & Fallback

#### A. Proteksi Webhook Revalidasi (`apps/invitation/src/app/api/revalidate/route.ts`)
```typescript
// apps/invitation/src/app/api/revalidate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

export async function POST(req: NextRequest) {
  // 1. Verifikasi shared secret otorisasi internal
  const secret = req.headers.get('x-revalidate-secret');
  if (!secret || secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json(
      { success: false, message: 'Akses ditolak: shared secret tidak valid' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { tag } = body;

    if (!tag || typeof tag !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Tag wajib disertakan dalam format string' },
        { status: 400 }
      );
    }

    // 2. Bersihkan cache Vercel CDN untuk tag terkait
    revalidateTag(tag);

    return NextResponse.json({
      success: true,
      revalidated: true,
      tag,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Gagal melakukan revalidasi' },
      { status: 500 }
    );
  }
}
```

#### B. Mekanisme Retry & Exponential Backoff di API (`apps/api/src/services/revalidation.ts`)
Jika Next.js mengalami cold-start atau terjadi gangguan jaringan sesaat antara VPS dan Vercel, service di API mengeksekusi *retry* otomatis hingga 3 kali:

```typescript
// apps/api/src/services/revalidation.ts
export async function triggerNextRevalidate(slug: string): Promise<boolean> {
  const nextAppUrl = process.env.INVITATION_APP_URL || 'https://inveeta.com';
  const secret = process.env.REVALIDATION_SECRET!;
  const targetTag = `event-${slug}`;

  const maxRetries = 3;
  const delays = [500, 1500, 3000]; // Exponential backoff dalam milidetik

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

      const res = await fetch(`${nextAppUrl}/api/revalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-secret': secret,
        },
        body: JSON.stringify({ tag: targetTag }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        console.log(`[REVALIDATE_SUCCESS] Tag ${targetTag} berhasil direvalidasi.`);
        return true;
      }
    } catch (err) {
      console.warn(`[REVALIDATE_RETRY] Percobaan ${attempt + 1} gagal untuk tag ${targetTag}:`, err);
    }

    if (attempt < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }

  console.error(`[REVALIDATE_FAILED] Tag ${targetTag} gagal direvalidasi setelah 3 percobaan.`);
  return false;
}
```

#### C. Fallback Time-Based Safety Net
Sebagai jaring pengaman bila webhook revalidate gagal terpanggil secara permanen, seluruh panggilan fetch di `apps/invitation` disuntikkan aturan kedaluwarsa waktu cadangan:
```typescript
next: { tags: [`event-${slug}`], revalidate: 3600 } // Maksimal 1 jam stale cache
```

---

### 7.3 Pembuatan Open Graph (OG Image WhatsApp $\le 300$ KB)

WhatsApp memiliki perilaku crawler yang sangat sensitif:
- Batas ukuran file gambar preview: **Maksimal 300 KB**.
- Batas waktu timeout bot WhatsApp: **$< 3\text{ detik}$**.
- Rasio aspek gambar ideal: **1.91 : 1** ($1200 \times 630\text{ piksel}$).

#### A. Keputusan Arsitektur: Statis R2 vs Dinamis `ImageResponse`
Inveeta memilih **Gambar Statis Teroptimasi di Cloudflare R2** daripada generator dinamis runtime `@vercel/og` (`ImageResponse`):
1. Generator runtime di Vercel Edge sering mengalami cold-start $> 1.5\text{ detik}$, memicu kegagalan preview di WhatsApp (hanya menampilkan tautan teks polos tanpa kartu gambar).
2. Host mengunggah cover foto pernikahan saat Wizard/Dashboard. Server memproses dan mengompres foto tersebut menjadi format JPEG/WebP berkualitas tinggi dengan resolusi pas $1200 \times 630$ piksel dan ukuran file $\approx 150 - 250\text{ KB}$.
3. URL gambar statis ini disimpan di kolom `events.ogImageUrl` dan disajikan langsung via Cloudflare R2 CDN (`cdn.inveeta.com`) dengan waktu unduh $< 80\text{ ms}$.

#### B. Implementasi di `generateMetadata` (`apps/invitation/src/app/[slug]/page.tsx`)
```typescript
// apps/invitation/src/app/[slug]/page.tsx
import { Metadata } from 'next';
import { getCachedPublicEvent } from '@/lib/api-client';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getCachedPublicEvent(slug);

  if (!event) {
    return {
      title: 'Undangan Tidak Ditemukan - Inveeta',
    };
  }

  const title = `The Wedding of ${event.brideNickname} & ${event.groomNickname}`;
  const description = `Tanpa mengurangi rasa hormat, kami mengundang Anda untuk hadir pada momen bahagia pernikahan kami.`;
  const ogImage = event.ogImageUrl || 'https://cdn.inveeta.com/defaults/default-og-cover.jpg';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://inveeta.com/${slug}`,
      siteName: 'Inveeta',
      locale: 'id_ID',
      type: 'website',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}
```

---

### 7.4 Pembagian Halaman (Islands Architecture: Static vs Dynamic)

Untuk memaksimalkan performa dan meminimalkan ukuran bundle JavaScript yang harus diunduh oleh ponsel tamu (banyak di antaranya menggunakan jaringan seluler 4G), struktur halaman undangan diatur menggunakan konsep **Islands Architecture**:

```
apps/invitation/src/app/[slug]/
├── layout.tsx                      # Root layout, inject fonts & meta viewport
├── page.tsx                        # Server Component Container (Cached via ISR)
└── components/
    ├── static/                     # Server Components (0 KB Client JS Bundle)
    │   ├── CoverSection.tsx        # Hero photo, headline, tanggal
    │   ├── CoupleSection.tsx       # Foto & profil kedua mempelai
    │   ├── QuoteSection.tsx        # Ayat suci / kutipan cinta
    │   ├── LoveStorySection.tsx    # Linimasa cerita cinta
    │   ├── PublicSessions.tsx      # Sesi publik, alamat, peta navigasi
    │   ├── PhotoGallery.tsx        # Galeri foto statis (Lazy loaded)
    │   └── DigitalGiftSection.tsx  # Alamat kado & salin rekening bank
    └── dynamic/                    # Client Components (Hydrated Islands)
        ├── BgmPlayerIsland.tsx     # Floating audio player (autoplay unlock)
        ├── GuestGreetingIsland.tsx # Pembacaan token & sapaan personal tamu
        ├── RsvpInteractiveForm.tsx # Form interaktif konfirmasi kehadiran & pax
        ├── LiveWishesIsland.tsx    # Buku ucapan realtime (SSE listener)
        └── BottomNavIsland.tsx     # Navigasi melayang cepat antar section
```

```mermaid
graph TD
    subgraph "Server Component Shell (Cached di Vercel CDN via ISR)"
        Cover["CoverSection<br/>(Foto & Nama Acara)"]
        Couple["CoupleSection<br/>(Biodata Pengantin)"]
        Sessions["PublicSessions<br/>(Jadwal Sesi Publik)"]
        Gallery["PhotoGallery<br/>(Galeri Gambar)"]
        Gift["DigitalGiftSection<br/>(Amplop & QRIS)"]
    end

    subgraph "Client Component Islands (Di-hydrate Dinamis di Browser)"
        BGM["BgmPlayerIsland<br/>(Audio Play/Pause Controller)"]
        GuestCard["GuestGreetingIsland<br/>(Fetch /public/events/:slug/guests/:token)"]
        RSVPForm["RsvpInteractiveForm<br/>(Atomic Form Mutation)"]
        WishesStream["LiveWishesIsland<br/>(EventSource SSE Stream)"]
    end

    Cover --- BGM
    Sessions --- GuestCard
    GuestCard --> RSVPForm
    Gift --- WishesStream
```

#### Alur Eksekusi di Browser Tamu:
1. **Milidetik 0–150**: Browser menerima HTML statis dari Vercel Edge CDN. Seluruh tampilan undangan visual (cover, pengantin, sesi umum) langsung ter-render secara utuh sebelum JavaScript dieksekusi (*Zero Layout Shift*).
2. **Milidetik 150–300**: Browser mengunduh bundle JavaScript minimal dari Client Islands.
3. **Milidetik 300+**:
   - `BgmPlayerIsland` memasang listener interaksi pertama pengguna untuk memutar musik latar secara halus (*autoplay workaround*).
   - `GuestGreetingIsland` membaca segmen `[token]` dari URL path. Jika token ada, ia melakukan `fetch()` ringan ke API untuk mengambil nama tamu dan alokasi sesi personal.
   - `LiveWishesIsland` membuka koneksi streaming `EventSource` ke `GET /api/v1/realtime/events/:id/stream` untuk mendengarkan ucapan baru yang masuk secara langsung tanpa memuat ulang halaman.

---

## 8. Realtime Engine (Server-Sent Events)

### 8.1 Arsitektur SSE Hub & Abstraksi Event Bus (Phase 2 Ready)

Sistem realtime Inveeta dirancang menggunakan pola **Event-Driven Architecture** dengan lapisan abstraksi internal (`EventBus`). Desain ini memisahkan logika bisnis penghasil event (*producers*) dari mekanisme transport pengiriman data (*consumers*), sehingga transport Server-Sent Events (SSE) pada MVP dapat berdampingan atau ditingkatkan ke WebSocket pada Phase 2 (`apps/live-display` dan `apps/scanner`) tanpa memodifikasi domain service apa pun.

```mermaid
graph TD
    subgraph "Domain Service Layer (Producers)"
        WishesService["WishesService<br/>(submitWish)"]
        RsvpService["RsvpService<br/>(submitRsvp / manualOverride)"]
        MetricsService["MetricsService<br/>(recalculateKPI)"]
    end

    subgraph "Application Event Bus"
        EventBus["AppEventBus Singleton<br/>(EventEmitter / In-Memory Bus)"]
    end

    subgraph "Transport Adapters (Consumers)"
        SSEAdapter["SSEChannelHub<br/>(MVP Active - HTTP SSE)"]
        WSAdapter["WebSocketHub<br/>(Phase 2 Ready - RFC 6455)"]
    end

    subgraph "Connected Clients"
        ClientInvitation["apps/invitation<br/>(Tamu - Live Wishes)"]
        ClientDashboard["apps/dashboard<br/>(Host - Live RSVP & Metrics)"]
        ClientPhase2["apps/live-display<br/>(Phase 2 - Live Screen)"]
    end

    WishesService -->|publish| EventBus
    RsvpService -->|publish| EventBus
    MetricsService -->|publish| EventBus

    EventBus -->|dispatch| SSEAdapter
    EventBus -.->|dispatch| WSAdapter

    SSEAdapter -->|Text/Event-Stream| ClientInvitation
    SSEAdapter -->|Text/Event-Stream| ClientDashboard
    WSAdapter -.->|Bidirectional Frame| ClientPhase2
```

#### A. Definisi Kontrak Abstraksi Event Bus (`apps/api/src/modules/realtime/bus.ts`)
```typescript
import { EventEmitter } from 'events';

export type RealtimeEventType = 'wish.created' | 'rsvp.updated' | 'metrics.updated';

export interface AppDomainEvent<T = unknown> {
  eventId: string;
  type: RealtimeEventType;
  payload: T;
  timestamp: string; // ISO 8601 UTC
}

export interface AppEventBus {
  publish<T>(event: AppDomainEvent<T>): void;
  subscribe(eventType: RealtimeEventType, handler: (event: AppDomainEvent<any>) => void): () => void;
}

class InMemoryEventBus implements AppEventBus {
  private emitter = new EventEmitter();

  constructor() {
    // Hindari batas default 10 listeners pada EventEmitter tunggal
    this.emitter.setMaxListeners(100);
  }

  publish<T>(event: AppDomainEvent<T>): void {
    this.emitter.emit(event.type, event);
    this.emitter.emit('*', event); // Wildcard dispatcher untuk log/auditing
  }

  subscribe(eventType: RealtimeEventType, handler: (event: AppDomainEvent<any>) => void): () => void {
    this.emitter.on(eventType, handler);
    return () => this.emitter.off(eventType, handler);
  }
}

export const appEventBus: AppEventBus = new InMemoryEventBus();
```

#### B. Implementasi SSE Channel Hub Terisolasi per Acara (`apps/api/src/modules/realtime/hub.ts`)
Untuk menjaga kompleksitas memori dan pencarian tetap $O(1)$, koneksi klien disimpan dalam struktur hierarkis `Map<eventId, Map<clientId, Controller>>`:

```typescript
// apps/api/src/modules/realtime/hub.ts
import { appEventBus, AppDomainEvent } from './bus';

class SSEChannelHub {
  // Map<eventId, Map<clientId, ReadableStreamDefaultController>>
  private channels = new Map<string, Map<string, ReadableStreamDefaultController>>();

  constructor() {
    // Daftarkan listener otomatis ke seluruh event domain dari Event Bus
    appEventBus.subscribe('wish.created', (e) => this.broadcastEvent(e));
    appEventBus.subscribe('rsvp.updated', (e) => this.broadcastEvent(e));
    appEventBus.subscribe('metrics.updated', (e) => this.broadcastEvent(e));
  }

  subscribe(eventId: string, clientId: string, controller: ReadableStreamDefaultController) {
    if (!this.channels.has(eventId)) {
      this.channels.set(eventId, new Map());
    }
    this.channels.get(eventId)!.set(clientId, controller);
  }

  unsubscribe(eventId: string, clientId: string) {
    const clients = this.channels.get(eventId);
    if (!clients) return;

    clients.delete(clientId);
    if (clients.size === 0) {
      this.channels.delete(eventId); // Bebaskan memori jika 0 subscriber aktif
    }
  }

  private broadcastEvent(event: AppDomainEvent) {
    const clients = this.channels.get(event.eventId);
    if (!clients || clients.size === 0) return;

    const formattedPayload = `id: ${event.timestamp}\nevent: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`;
    const encoded = new TextEncoder().encode(formattedPayload);

    for (const [clientId, controller] of clients.entries()) {
      try {
        controller.enqueue(encoded);
      } catch {
        this.unsubscribe(event.eventId, clientId);
      }
    }
  }
}

export const sseHub = new SSEChannelHub();
```

---

### 8.2 Format Payload & Tipe Event SSE

Setiap transmisi data melalui koneksi SSE mematuhi spesifikasi W3C EventSource:
```
id: <ISO-8601-Timestamp>
event: <Event-Name>
data: <JSON-String-Payload>
```

#### Tipe Event Resmi:
1. **`wish.created`** — Siaran Ucapan Baru:
   - **Tujuan**: Dikirim ke `apps/invitation` (buku ucapan tamu) dan `apps/dashboard` (monitoring Host).
   - **Payload Data**:
     ```json
     {
       "id": "wsh_0192e2a0",
       "eventId": "evt_abc123",
       "senderName": "Budi Santoso",
       "message": "Selamat menempuh hidup baru Andi & Siti!",
       "senderRelation": "Sahabat Kampus",
       "createdAt": "2026-10-15T19:30:00+07:00"
     }
     ```
2. **`rsvp.updated`** — Konfirmasi Kehadiran Tamu:
   - **Tujuan**: Dikirim khusus ke `apps/dashboard` (Host) saat tamu submit RSVP atau terjadi manual override.
   - **Payload Data**:
     ```json
     {
       "guestId": "gst_xyz890",
       "guestName": "Bpk. Rahmat & Keluarga",
       "eventSessionId": "ses_resepsi_01",
       "sessionTitle": "Resepsi Pernikahan",
       "status": "attending",
       "actualPax": 3,
       "isManualOverride": false,
       "updatedAt": "2026-10-15T19:32:15+07:00"
     }
     ```
3. **`metrics.updated`** — Rekalkulasi KPI Dashboard:
   - **Tujuan**: Dikirim ke `apps/dashboard` untuk memperbarui kartu ringkasan KPI secara instan tanpa refetch REST API.
   - **Payload Data**:
     ```json
     {
       "totalGuests": 250,
       "totalPaxAllocated": 500,
       "totalAttendingPax": 340,
       "totalDeclinedPax": 45,
       "totalPendingPax": 115,
       "totalWishes": 88
     }
     ```

---

### 8.3 Heartbeat & Mekanisme Reconnect (`Last-Event-ID`)

#### A. Keep-Alive Heartbeat (Pencegahan Silent Timeout)
Banyak firewall, ISP seluler, dan reverse proxy memutus koneksi TCP idle setelah 30–60 detik tanpa lalu lintas data.
- Server mengirimkan komentar baris SSE setiap **15 detik**:
  ```http
  : ping
  
  ```
- Komentar diawali titik dua (`:`) diabaikan oleh parser browser `EventSource`, namun menjaga status socket TCP tetap aktif (`ESTABLISHED`).

#### B. Pemulihan Pesan Tertinggal (*Catch-Up via `Last-Event-ID`*)
Ketika sinyal seluler ponsel tamu terputus (misal di lift atau jalan tol) dan tersambung kembali, browser secara otomatis menyertakan header HTTP `Last-Event-ID` yang berisi stempel waktu event terakhir yang diterima:

```typescript
// Cuplikan handler pemulihan di apps/api/src/modules/realtime/routes.ts
const lastEventId = c.req.header('Last-Event-ID') || c.req.query('lastTimestamp');

if (lastEventId) {
  const lastDate = new Date(lastEventId);
  if (!isNaN(lastDate.getTime())) {
    // Ambil ucapan yang masuk selama periode koneksi terputus (dibatasi 20 item untuk mencegah lonjakan memori)
    const missedWishes = await db
      .select()
      .from(wishes)
      .where(and(
        eq(wishes.eventId, eventId),
        eq(wishes.isHidden, false),
        gt(wishes.createdAt, lastDate)
      ))
      .orderBy(wishes.createdAt)
      .limit(20);

    for (const wish of missedWishes) {
      const catchUpPayload = `id: ${wish.createdAt.toISOString()}\nevent: wish.created\ndata: ${JSON.stringify(wish)}\n\n`;
      controller.enqueue(new TextEncoder().encode(catchUpPayload));
    }
  }
}
```

#### C. Mitigasi Lonjakan Rekoneksi Massal (*Thundering Herd & Reconnection Jitter*)
Jika server API mengalami restart atau koneksi jaringan seluler pulih serentak di satu gedung acara, ratusan klien tamu berpotensi melakukan rekoneksi pada milidetik yang sama (*thundering herd problem*), yang dapat menguras *pool* koneksi PostgreSQL.
1. **Server Query Bounding**: Query pemulihan data tertinggal di atas dibatasi keras maksimal 20 item (`.limit(20)`). Tamu yang tertinggal lebih dari 20 pesan diarahkan untuk memuat ulang daftar pesan secara terpaginasi via REST API bila diperlukan.
2. **Client-Side Reconnection Jitter**: Pada browser tamu (`LiveWishesIsland.tsx`), mekanisme rekoneksi otomatis tidak menggunakan interval instan, melainkan menyuntikkan *randomized jitter delay* antara **1 hingga 5 detik**:
   ```typescript
   // apps/invitation/src/components/dynamic/LiveWishesIsland.tsx
   function scheduleReconnect(reconnectAttempt: number) {
     const baseDelay = Math.min(1000 * 2 ** reconnectAttempt, 15000);
     const jitter = Math.floor(Math.random() * 4000) + 1000; // Jitter acak 1-5 detik
     const totalDelay = baseDelay + jitter;
     
     setTimeout(() => {
       initEventSource();
     }, totalDelay);
   }
   ```
   Variasi jeda acak ini menyebarkan kurva lalu lintas rekoneksi secara merata, menjamin koneksi database VPS tetap berada di bawah ambang batas aman pool.

---

### 8.4 Konfigurasi Reverse Proxy (Caddy) untuk Koneksi Streaming

Untuk memastikan paket data SSE tidak ditahan di buffer Caddy dan koneksi berumur panjang tidak terputus prematur, konfigurasi Caddyfile di VPS Linux diatur sebagai berikut:

```caddyfile
# /etc/caddy/Caddyfile
api.inveeta.com {
    # 1. Reverse proxy ke proses Node.js Hono di container internal
    reverse_proxy api:3000 {
        # Matikan buffering secara mutlak khusus rute streaming realtime
        @realtime path /api/v1/realtime/*
        handle @realtime {
            flush_interval -1
        }

        # Pertahankan koneksi streaming hingga 1 jam sebelum graceful recycle
        transport http {
            read_timeout 3600s
            write_timeout 3600s
            keepalive 120s
        }

        # Teruskan IP klien asli untuk kebutuhan rate limiter dan auditing
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

---

## 9. Media & Storage (Cloudflare R2)

### 9.1 Siklus Hidup Unggah Media Presigned PUT (Verifikasi 2-Fase)

Untuk menjamin efisiensi server VPS (\$5–\$10/bulan) dan memanfaatkan biaya transfer Cloudflare R2 yang **bebas biaya egress (\$0 Egress)**, seluruh file media (foto galeri, musik latar, QRIS) diunggah **langsung dari browser klien ke Cloudflare R2** menggunakan mekanisme **Verifikasi 2-Fase**:

```mermaid
sequenceDiagram
    autonumber
    actor Client as Browser Client (Dashboard)
    participant API as Hono Backend (apps/api)
    participant R2 as Cloudflare R2 Bucket
    participant DB as PostgreSQL (packages/db)

    Note over Client,API: Fase 1: Permintaan Presigned Upload URL
    Client->>API: POST /api/v1/manage/media/presign { fileName, mimeType, fileSize, mediaType }
    Note over API: Validasi MIME, Ukuran File & Kuota Foto Template
    API->>API: Bentuk R2 Key unik: events/{id}/photos/{uuid}.webp
    API->>R2: S3 SDK createPutObjectCommand(key, contentType, 10m TTL)
    API-->>Client: 200 OK { uploadUrl, fileKey, publicUrl }

    Note over Client,R2: Unggah Langsung Klien ke R2 (Bypass VPS Network)
    Client->>R2: PUT uploadUrl (Binary Data)
    R2-->>Client: 200 OK (Uploaded)

    Note over Client,DB: Fase 2: Konfirmasi Keberadaan Fisik & Metadata DB
    Client->>API: POST /api/v1/manage/media/confirm { eventId, fileKey, mediaType, slotIdentifier }
    API->>R2: S3 SDK HeadObjectCommand(fileKey)
    R2-->>API: 200 OK { ContentLength, ContentType }
    Note over API: Verifikasi integritas: file fisik ada & ukuran sesuai batas
    API->>DB: INSERT INTO event_media (...)
    DB-->>API: Saved
    API-->>Client: 201 Created { media: eventMediaRecord }
```

#### Aturan Validasi Ukuran & Tipe MIME:
1. **Foto Galeri, Cover & QRIS**:
   - Ekstensi: `.jpg`, `.jpeg`, `.png`, `.webp`.
   - MIME Type: `image/jpeg`, `image/png`, `image/webp`.
   - Ukuran Maksimal: **$\le 2\text{ MB}$** ($2 \times 1024 \times 1024\text{ bytes}$).
2. **Audio Musik Latar (BGM)**:
   - Ekstensi: `.mp3`, `.m4a`.
   - MIME Type: `audio/mpeg`, `audio/mp4`, `audio/x-m4a`.
   - Ukuran Maksimal: **$\le 10\text{ MB}$** ($10 \times 1024 \times 1024\text{ bytes}$).

> [!CAUTION]
> **Presigned PUT Content-Type Lock**:
> Saat API membuat Presigned URL via AWS S3 SDK (`PutObjectCommand`), nilai `ContentType` dikunci secara kriptografis ke dalam tanda tangan URL. Di `apps/dashboard`, saat mengeksekusi `fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': mimeType }, body: file })`, header `Content-Type` yang dikirim **wajib identik persis** dengan nilai `mimeType` yang didaftarkan saat presign. Jika terjadi perbedaan (mis. browser mengirim `image/jpeg` padahal presign meminta `image/jpg`), Cloudflare R2 seketika menolak request dengan status `403 SignatureDoesNotMatch`.

---

### 9.2 Struktur Hierarki Key Bucket Cloudflare R2

Bucket penyimpanan (`inveeta-storage`) diorganisasikan secara hierarkis dan terisolasi per acara untuk mempermudah audit dan pembersihan data saat sebuah acara dihapus:

```
inveeta-storage/
└── events/
    └── {eventId}/
        ├── photos/
        │   ├── cover-{uuid}.webp          # Foto cover utama
        │   ├── gallery-01-{uuid}.webp     # Foto galeri berurutan
        │   └── couple-bride-{uuid}.webp   # Pasfoto mempelai wanita
        ├── audio/
        │   └── bgm-{uuid}.mp3             # File musik latar
        ├── qris/
        │   └── qris-{uuid}.webp           # Gambar kode QRIS amplop digital
        └── og/
            └── og-cover-{uuid}.webp       # Gambar statis Open Graph 1200x630
```

---

### 9.3 Akses Konten via `cdn.inveeta.com` & Optimasi Gambar

#### A. Konfigurasi Custom Domain & Zero Egress
- Cloudflare R2 diikatkan ke domain publik kustom: `cdn.inveeta.com`.
- Seluruh permintaan unduhan diarahkan langsung melalui jaringan CDN global Cloudflare dengan biaya transfer bandwidth **\$0 (Free Egress)**.
- Header Caching Agresif:
  ```http
  Cache-Control: public, max-age=31536000, immutable
  ```

#### B. Optimasi Gambar di Sisi Klien (*Client-Side Pre-Upload Compression*)
Untuk mencegah pengunggahan file kamera ponsel mentah (berukuran 8–15 MB) yang menghabiskan kuota internet pengguna dan memperlambat upload:
- Sebelum file dikirim ke R2, `apps/dashboard` melakukan kompresi di sisi browser menggunakan HTML5 Canvas / OffscreenCanvas API:
  - Dimensi maksimal dibatasi pada lebar $1920\text{ piksel}$ (rasio aspek dipertahankan).
  - Format dikonversi ke **WebP** dengan kualitas $85\%$.
  - Ukuran file hasil kompresi rata-rata turun dari $\sim 8\text{ MB} \rightarrow 300 - 600\text{ KB}$ tanpa penurunan ketajaman visual yang terlihat di layar ponsel.

#### C. Custom Image Loader di Next.js 15 (`apps/invitation`)
Alih-alih menggunakan Next.js Default Image Optimization yang mengonsumsi CPU server Vercel, `apps/invitation` menggunakan loader kustom yang merender URL absolut ke CDN Cloudflare:

```typescript
// apps/invitation/src/lib/image-loader.ts
export default function cloudflareImageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  // Jika URL sudah mengarah ke cdn.inveeta.com, kembalikan langsung
  if (src.startsWith('https://cdn.inveeta.com')) {
    return `${src}?w=${width}&q=${quality || 85}`;
  }
  return src;
}
```

---

### 9.4 Pembersihan File Yatim (*Orphan Cleanup*) & Penegakan Kuota Foto Template

#### A. Masalah File Yatim (*Orphan Storage Bloat*)
File yatim tercipta ketika seorang Host meminta Presigned URL (`POST /media/presign`) dan mengunggah file ke R2, tetapi kemudian membatalkan formulir wizard atau menutup tab browser sebelum memanggil endpoint konfirmasi (`POST /media/confirm`).

#### B. Strategi Pembersihan Otomatis
1. **Pemberian Metadata Lifecycle R2**:
   - Seluruh objek yang dibuat via presigned URL diberi tag metadata S3: `status=pending_confirmation`.
2. **Background Scheduled Maintenance (`apps/api/src/jobs/cleanupOrphanMedia.ts`)**:
   - Script cron harian memeriksa objek di R2 bucket:
     - Jika sebuah objek memiliki tag `pending_confirmation` dengan usia $> 24\text{ jam}$ dan kuncinya tidak tercatat di tabel `event_media` PostgreSQL $\rightarrow$ Hapus objek via `DeleteObjectCommand`.
   - Saat acara dihapus oleh Host (`DELETE /manage/events/:id`), database men-trigger penghapusan baris (`CASCADE`), dan background task membersihkan seluruh folder `events/{eventId}/` di R2 bucket.

#### C. Penegakan Kuota Foto per Template (*Template Photo Quota Enforcement*)
Setiap template di kode memiliki batas kuota foto yang ketat (mis. `maxPhotos: 5` untuk Minimalist Elegance).
- Pada saat pemanggilan `POST /media/presign` dan `POST /media/confirm`:
```typescript
// Validasi kuota foto di apps/api/src/modules/media/service.ts
const existingPhotosCount = await db
  .select({ count: sql<number>`count(*)` })
  .from(eventMedia)
  .where(and(eq(eventMedia.eventId, eventId), eq(eventMedia.mediaType, 'photo')));

const template = TEMPLATE_REGISTRY[event.templateId];

if (existingPhotosCount[0].count >= template.maxPhotos) {
  throw new ValidationError(
    `Batas maksimal kuota foto untuk template ${template.name} (${template.maxPhotos} foto) telah tercapai. Hapus salah satu foto lama untuk mengunggah yang baru.`
  );
}
```

---

## 10. Template Engine (Schema-Driven)

### 10.1 Format Skema Template di Registry Kode

Sesuai ketetapan PRD §2.4 (Non-Goals MVP), Inveeta **tidak menggunakan visual builder drag-and-drop** yang rentan bug, melainkan pendekatan **Schema-Driven Template Engine**. Seluruh template didefinisikan sebagai kode statis terstruktur di `packages/shared/src/templates/registry/`.

```typescript
// packages/shared/src/templates/types.ts
export type TemplateTier = 'free' | 'premium' | 'exclusive';

export type TemplateSectionIdentifier =
  | 'cover'
  | 'quote'
  | 'couple'
  | 'story'
  | 'sessions'
  | 'gallery'
  | 'rsvp'
  | 'wishes'
  | 'gift';

export interface ColorPreset {
  id: string;
  name: string;
  primary: string;   // HEX code (mis. #4A5568)
  secondary: string; // HEX code (mis. #E2E8F0)
  accent: string;    // HEX code (mis. #D69E2E)
  background: string;// HEX code (mis. #F7FAFC)
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  tier: TemplateTier;
  maxPhotos: number;
  supportedFonts: Array<'playfair-inter' | 'cormorant-montserrat' | 'cinzel-lato'>;
  defaultFont: 'playfair-inter' | 'cormorant-montserrat' | 'cinzel-lato';
  colorPresets: ColorPreset[];
  defaultCustomization: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    coverLayout: 'fullscreen-image' | 'split-card' | 'minimal-typography';
    sectionsOrder: TemplateSectionIdentifier[];
    hiddenSections: TemplateSectionIdentifier[];
  };
  allowedSections: TemplateSectionIdentifier[];
  requiredSections: TemplateSectionIdentifier[];
}
```

#### Contoh Registrasi Template MVP (`packages/shared/src/templates/registry/minimalist.ts`)
```typescript
import { TemplateDefinition } from '../types';

export const minimalistElegance: TemplateDefinition = {
  id: 'minimalist-elegance',
  name: 'Minimalist Elegance',
  description: 'Desain bersih, modern, dan anggun dengan tipografi serif elegan dan fokus pada foto potret.',
  thumbnailUrl: 'https://cdn.inveeta.com/templates/thumbnails/minimalist-elegance.webp',
  tier: 'free',
  maxPhotos: 5,
  supportedFonts: ['playfair-inter', 'cormorant-montserrat'],
  defaultFont: 'playfair-inter',
  colorPresets: [
    {
      id: 'warm-sand',
      name: 'Warm Sand',
      primary: '#2D3748',
      secondary: '#E2D9D2',
      accent: '#B7791F',
      background: '#FDFBF7',
    },
    {
      id: 'sage-green',
      name: 'Sage Botanical',
      primary: '#2F3E46',
      secondary: '#CAD2C5',
      accent: '#52796F',
      background: '#F4F7F5',
    },
  ],
  defaultCustomization: {
    primaryColor: '#2D3748',
    secondaryColor: '#E2D9D2',
    fontFamily: 'playfair-inter',
    coverLayout: 'fullscreen-image',
    sectionsOrder: ['cover', 'quote', 'couple', 'sessions', 'gallery', 'rsvp', 'wishes', 'gift'],
    hiddenSections: [],
  },
  allowedSections: ['cover', 'quote', 'couple', 'sessions', 'gallery', 'rsvp', 'wishes', 'gift'],
  requiredSections: ['cover', 'couple', 'sessions', 'rsvp'],
};
```

---

### 10.2 Validasi Skema Zod & Dynamic Section Renderer di `apps/invitation`

#### A. Validasi Kustomisasi Visual Host via Zod (`packages/shared/src/schemas/template.schema.ts`)
```typescript
// packages/shared/src/schemas/template.schema.ts
import { z } from 'zod';
import { TEMPLATE_REGISTRY } from '../templates/registry';

export const updateVisualCustomizationSchema = z.object({
  templateId: z.string().min(1),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6})$/),
  secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6})$/),
  fontFamily: z.enum(['playfair-inter', 'cormorant-montserrat', 'cinzel-lato']),
  coverLayout: z.enum(['fullscreen-image', 'split-card', 'minimal-typography']),
  sectionsOrder: z.array(z.string()).min(3),
  hiddenSections: z.array(z.string()).default([]),
}).superRefine((data, ctx) => {
  const template = TEMPLATE_REGISTRY[data.templateId];
  if (!template) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Template tidak terdaftar di sistem',
      path: ['templateId'],
    });
    return;
  }

  // Validasi: section wajib tidak boleh disembunyikan
  for (const requiredSection of template.requiredSections) {
    if (data.hiddenSections.includes(requiredSection as any)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Section wajib '${requiredSection}' tidak boleh disembunyikan`,
        path: ['hiddenSections'],
      });
    }
  }
});
```

#### B. Dynamic Section Renderer di `apps/invitation` (`src/components/TemplateRenderer.tsx`)
Renderer membaca urutan section dari database dan memetakan string pengenal ke komponen React yang sesuai:

```mermaid
graph LR
    DBConfig["Database Record<br/>events.visualCustomization"] --> Engine["TemplateRenderer Engine<br/>(apps/invitation)"]
    Registry["Section Component Registry<br/>(Cover, Couple, Sessions...)"] --> Engine
    Engine --> Output["Rendered Dynamic DOM<br/>(Injeksi CSS Variables)"]
```

```typescript
// apps/invitation/src/components/TemplateRenderer.tsx
import React from 'react';
import type { PublicEventDTO } from '@inveeta/shared';

// Import komponen seksi
import { CoverSection } from './sections/CoverSection';
import { QuoteSection } from './sections/QuoteSection';
import { CoupleSection } from './sections/CoupleSection';
import { LoveStorySection } from './sections/LoveStorySection';
import { PublicSessionsSection } from './sections/PublicSessionsSection';
import { GallerySection } from './sections/GallerySection';
import { RsvpInteractiveSection } from './sections/RsvpInteractiveSection';
import { LiveWishesSection } from './sections/LiveWishesSection';
import { DigitalGiftSection } from './sections/DigitalGiftSection';

const SECTION_COMPONENTS: Record<string, React.ComponentType<{ event: PublicEventDTO }>> = {
  cover: CoverSection,
  quote: QuoteSection,
  couple: CoupleSection,
  story: LoveStorySection,
  sessions: PublicSessionsSection,
  gallery: GallerySection,
  rsvp: RsvpInteractiveSection,
  wishes: LiveWishesSection,
  gift: DigitalGiftSection,
};

export function TemplateRenderer({ event }: { event: PublicEventDTO }) {
  const { visualCustomization } = event;
  const { sectionsOrder, hiddenSections, primaryColor, secondaryColor, fontFamily } = visualCustomization;

  // Injeksi Dynamic CSS Variables ke Wrapper Div
  const customStyles = {
    '--color-primary': primaryColor,
    '--color-secondary': secondaryColor,
    '--font-theme': fontFamily,
  } as React.CSSProperties;

  return (
    <main className={`template-root font-${fontFamily}`} style={customStyles}>
      {sectionsOrder.map((sectionId) => {
        // Lewati section yang disembunyikan oleh Host
        if (hiddenSections.includes(sectionId)) return null;

        const Component = SECTION_COMPONENTS[sectionId];
        if (!Component) return null;

        return <Component key={sectionId} event={event} />;
      })}
    </main>
  );
}
```

---

### 10.3 Aturan Pergantian Template (*Same-Tier Consistency Enforcement*)

Untuk menjaga model lisensi dan integritas tampilan visual yang konsisten:
1. **Aturan Kesetaraan Tier (*Same-Tier Rule*)**:
   - Host hanya diizinkan berganti template ke template lain yang memiliki **tier yang sama**:
     $$\text{Template Baru.tier} == \text{Acara.templateTier}$$
   - Contoh: Acara dengan tier `free` hanya boleh memilih di antara daftar template bertier `free` (`minimalist-elegance`, `rustic-garden`, `javanese-heritage`).
   - Upaya penggantian lintas tier akan ditolak di level API:
     ```json
     {
       "success": false,
       "error": {
         "code": "TEMPLATE_TIER_MISMATCH",
         "message": "Pergantian template hanya diizinkan untuk paket/tier yang sama (free)."
       }
     }
     ```
2. **Rekonsiliasi Kuota Foto saat Ganti Template**:
   - Jika template tujuan memiliki batas `maxPhotos` yang lebih kecil daripada jumlah foto yang telah diunggah Host saat ini:
     - API mengembalikan peringatan validasi:  
       > *"Template tujuan hanya mendukung maksimal 5 foto, sedangkan Anda telah mengunggah 8 foto. Silakan hapus 3 foto terlebih dahulu sebelum beralih template."*

---

### 10.4 Panduan Pengembang untuk Menambah Template Baru (*Developer Checklist*)

Bagi developer yang ingin menambahkan varian template baru ke Inveeta, ikuti 5 langkah terpadu berikut:

- [ ] **Langkah 1: Definisikan Metadata Template**
  Buat file baru di `packages/shared/src/templates/registry/[template-name].ts`. Tentukan `id`, `name`, `tier`, `maxPhotos`, preset warna HEX, dan daftar `allowedSections`.
- [ ] **Langkah 2: Daftarkan ke Global Registry**
  Ekspor definisi template baru di `packages/shared/src/templates/registry/index.ts` agar dikenali oleh sistem validasi Zod dan DTO.
- [ ] **Langkah 3: Buat Preset Styling / Layout Komponen**
  Buat folder spesifik di `apps/invitation/src/templates/[template-name]/` jika template memerlukan layout komponen unik (misalnya layout cover split-card khusus).
- [ ] **Langkah 4: Jalankan Skrip Seed Database**
  Jalankan perintah sinkronisasi seed:
  ```bash
  pnpm db:seed
  ```
  untuk memastikan template baru tercatat dalam tabel referensi dan siap dipilih pada wizard pembuatan acara.
- [ ] **Langkah 5: Jalankan Pengujian Validasi & Build**
  Jalankan pipeline monorepo:
  ```bash
  pnpm turbo typecheck test
  ```
  Pastikan tidak ada type error dan validasi Zod bekerja sesuai spesifikasi.

---

## 11. Alur Bisnis Kritis (Sequence Diagrams)

Bagian ini memetakan alur interaksi antarkomponen secara sekuensial serta merumuskan aturan validasi mendalam untuk alur-alur bisnis yang paling rentan terhadap bug, inkonsistensi data, maupun *race condition*.

---

### 11.1 Wizard Multi-Step: Penyimpanan Draft, Finalisasi & Penguncian Slug

Pembuatan acara pernikahan oleh Host dilakukan melalui wizard 5 langkah di `apps/dashboard`. Desain alur ini memungkinkan Host keluar dan masuk kembali kapan saja (*draft persistence*) tanpa kehilangan data, sebelum akhirnya mempublikasikan acara secara permanen.

```mermaid
sequenceDiagram
    autonumber
    actor Host as Host (Dashboard Browser)
    participant UI as Dashboard State (React)
    participant API as Hono Backend (apps/api)
    participant DB as PostgreSQL (packages/db)
    participant NextISR as Next.js 15 (apps/invitation)

    Note over Host,DB: Langkah 1-4: Simpan Progres Draft Bertahap
    Host->>UI: Input Info Dasar & Usulkan Slug (Step 1)
    UI->>API: GET /api/v1/public/events/:slug/check?slug=andi-siti
    API->>DB: SELECT id FROM events WHERE slug = 'andi-siti'
    DB-->>API: Not Found (Tersedia)
    API-->>UI: 200 OK { isAvailable: true }

    UI->>API: POST /api/v1/manage/events/draft { title, slug, templateId, timeZone }
    API->>DB: INSERT INTO events (..., is_published=false)
    DB-->>API: Created (eventId: "evt_123")
    API-->>UI: 201 Created { eventId: "evt_123", slug: "andi-siti" }

    Host->>UI: Input Sesi, Profil Pengantin, & Upload Media (Step 2-4)
    UI->>API: PUT /api/v1/manage/events/evt_123/wizard-step { step: 2, data: {...} }
    API->>DB: UPDATE events / INSERT event_sessions
    DB-->>API: Updated
    API-->>UI: 200 OK

    Note over Host,NextISR: Langkah 5: Finalisasi & Penguncian Permanen (Publish)
    Host->>UI: Klik "Publikasikan Undangan" (Step 5)
    UI->>API: POST /api/v1/manage/events/evt_123/publish
    Note over API: Validasi Kelengkapan Wajib:<br/>- Min 1 Sesi Acara<br/>- Nama Kedua Mempelai<br/>- Tanggal & Batas RSVP
    API->>DB: UPDATE events SET is_published = true, published_at = NOW()
    Note over DB: Database Trigger:<br/>trg_enforce_slug_immutability aktif!<br/>Slug 'andi-siti' terkunci permanen.
    DB-->>API: Updated

    Note over API,NextISR: Trigger Revalidasi On-Demand ISR
    API->>NextISR: POST /api/revalidate { tag: "event-andi-siti" } (x-revalidate-secret)
    NextISR-->>API: 200 OK { revalidated: true }

    API-->>UI: 200 OK { isPublished: true, liveUrl: "https://inveeta.com/andi-siti" }
    UI-->>Host: Tampilkan Modal Sukses & URL Undangan Live
```

#### Aturan & Validasi Bisnis:
1. **Fase Draft (Step 1–4)**:
   - Field `is_published` bernilai `false`.
   - Host bebas mengubah `slug`, tanggal, nama pengantin, dan urutan sesi.
   - Pengecekan slug menggunakan validasi ganda: format regex (`^[a-z0-9]+(?:-[a-z0-9]+)*$`), larangan kata kunci sistem (*reserved slugs*), dan ketersediaan unik di database.
2. **Fase Finalisasi (Publish)**:
   - Evaluasi prasyarat publikasi:
     - Minimal 1 sesi acara telah didefinisikan (`sessions.length >= 1`).
     - Nama mempelai pria dan wanita tidak boleh kosong.
     - `eventDate` dan `rsvpDeadline` terisi lengkap dengan offset zona waktu valid.
     - Template terpilih valid dan terdaftar di `TEMPLATE_REGISTRY`.
   - Begitu `is_published = true`, trigger PostgreSQL `trg_enforce_slug_immutability` aktif. Mutasi field `slug` pada pemanggilan `PATCH /events/:id` selanjutnya akan ditolak secara mutlak oleh database engine.
   - API secara sinkron memanggil webhook Next.js ISR untuk membersihkan cache halaman statis `event-${slug}`.

---

### 11.2 RSVP: Validasi Kuota, Deadline Zona Waktu & Transaksi DB (Anti Race Condition Multi-Sesi)

Alur RSVP merupakan titik paling kritis terhadap kegagalan konkurensi (*race condition*), di mana seorang tamu dapat membuka tautan personal di dua perangkat bersamaan dan mencoba mengirimkan jumlah pax yang melebihi kuota.

```mermaid
sequenceDiagram
    autonumber
    actor Guest as Tamu Browser (apps/invitation)
    participant API as Hono Backend (apps/api)
    participant DB as PostgreSQL (packages/db)
    participant Bus as AppEventBus
    participant SSE as SSEChannelHub (apps/dashboard)

    Guest->>API: POST /api/v1/public/rsvp<br/>{ eventId, guestId, sessions: [{ eventSessionId, status: "attending", actualPax: 2 }], notes: "..." }
    
    Note over API,DB: Transaksi Atomik Database (BEGIN TRANSACTION)
    API->>DB: SELECT id, rsvp_deadline, time_zone FROM events WHERE id = $1
    DB-->>API: Event Record

    Note over API: 1. Penegakan Batas Waktu:<br/>NOW() <= rsvpDeadline (UTC Milidetik)
    alt Waktu Server > rsvpDeadline
        API-->>Guest: 400 Bad Request (RSVP_DEADLINE_EXCEEDED)
    end

    Note over API,DB: 2. Kunci Baris Tamu (Pencegahan Race Condition Konkuren)
    API->>DB: SELECT max_pax FROM guests WHERE id = $2 AND event_id = $1 FOR UPDATE
    DB-->>API: Guest Record (Row Locked)

    Note over API,DB: 3. Looping Batch Sesi (Atomic Multi-Session)
    loop Setiap Sesi dalam sessions
        API->>DB: Verifikasi Alokasi Sesi (guest_session_allocations)
        DB-->>API: Valid
        API->>DB: Cek Proteksi Kunci Manual Override (rsvps)
        DB-->>API: is_manual_override: false
        Note over API: Evaluasi Kuota Pax: actualPax <= maxPax
        API->>DB: INSERT INTO rsvps (...) ON CONFLICT (guest_id, event_session_id) DO UPDATE ...
        DB-->>API: Upsert Success
    end
    Note over API,DB: COMMIT TRANSACTION

    Note over API,SSE: 4. Siaran Realtime ke Dashboard Host
    API->>Bus: publish("rsvp.updated", { guestId, sessions, ... })
    Bus->>SSE: broadcast("rsvp.updated", payload)
    SSE-->>Host: Push Update Live ke Dashboard Host

    API-->>Guest: 200 OK { success: true, guestId, sessions: [...] }
```

#### Aturan & Validasi Bisnis:
1. **Evaluasi Deadline Absolut**: Waktu server dibandingkan langsung dengan `event.rsvpDeadline`. Karena keduanya berbasis stempel waktu ISO 8601 dengan offset zona waktu disimpan pada kolom `TIMESTAMPTZ`, evaluasi matematis `new Date() > new Date(event.rsvpDeadline)` akurat hingga tingkat milidetik tanpa terpengaruh perbedaan zona waktu lokal perangkat tamu.
2. **Kunci Baris Eksklusif (`FOR UPDATE`)**: Pernyataan `SELECT ... FROM guests WHERE id = $1 FOR UPDATE` mengunci baris data tamu selama transaksi berlangsung. Jika tamu mengirimkan 2 permintaan RSVP secara simultan dari dua tab browser, permintaan kedua akan diblokir antre sampai transaksi pertama selesai, mencegah pelipatgandaan pax (*duplicate pax race condition*).
3. **Fleksibilitas Edit Berulang**: Tamu diperbolehkan mengubah konfirmasi kehadiran berkali-kali sebelum batas deadline terlewati. Eksekusi `ON CONFLICT (guest_id, event_session_id) DO UPDATE` memperbarui status kehadiran dan jumlah `actualPax` secara idempotensial.
4. **Multi-Sesi Batch Atomik**: Form konfirmasi kehadiran di antarmuka tamu merangkum seluruh sesi yang dialokasikan (mis. Akad dan Resepsi) ke dalam 1 payload pengiriman (`sessions: Array<{ eventSessionId, status, actualPax }>`). Seluruh sesi dievaluasi dan di-upsert dalam blok `BEGIN ... COMMIT` tunggal. Jika alokasi salah satu sesi tidak valid atau melebihi kuota, seluruh transaksi di-rollback secara otomatis, mencegah kondisi inkonsistensi parsial.

---

### 11.3 Override Manual oleh Host & Audit Log

Host memiliki otoritas tertinggi untuk menyesuaikan status RSVP tamu secara manual langsung dari dashboard (misalnya tamu mengonfirmasi via telepon bahwa ia hanya bisa hadir 1 orang dari kuota 2 orang).

```mermaid
sequenceDiagram
    autonumber
    actor Host as Host (Dashboard Browser)
    participant API as Hono Backend (apps/api)
    participant DB as PostgreSQL (packages/db)
    participant Bus as AppEventBus
    participant SSE as SSEChannelHub

    Host->>API: PATCH /api/v1/manage/events/:id/guests/:guestId/override<br/>{ sessionId: "ses_1", status: "attending", actualPax: 1, notes: "Konfirmasi per telepon", lockGuestForm: true }
    
    Note over API: Verifikasi Hak Akses:<br/>requireAuth & requireEventOwner
    API->>DB: BEGIN TRANSACTION
    
    API->>DB: SELECT max_pax FROM guests WHERE id = $guestId AND event_id = $eventId
    DB-->>API: maxPax: 2

    Note over API: Validasi: actualPax (1) <= maxPax (2)

    API->>DB: INSERT INTO rsvps (id, guest_id, event_session_id, event_id, status, actual_pax, notes, is_manual_override, updated_at)<br/>VALUES (...)<br/>ON CONFLICT (guest_id, event_session_id) DO UPDATE SET<br/>status = EXCLUDED.status,<br/>actual_pax = EXCLUDED.actual_pax,<br/>notes = EXCLUDED.notes,<br/>is_manual_override = true,<br/>updated_at = NOW()
    DB-->>API: Updated Record
    API->>DB: COMMIT TRANSACTION

    API->>Bus: publish("rsvp.updated", { guestId, status: "attending", actualPax: 1, isManualOverride: true })
    Bus->>SSE: broadcast("rsvp.updated")

    API-->>Host: 200 OK { success: true, isManualOverride: true }

    Note over Guest,API: Efek pada Formulir Tamu:
    actor Guest as Tamu Browser
    Guest->>API: POST /api/v1/public/rsvp (Tamu mencoba submit mandiri)
    API->>DB: Check is_manual_override
    DB-->>API: is_manual_override == true
    API-->>Guest: 403 Forbidden ("Status kehadiran Anda telah disesuaikan langsung oleh penyelenggara acara.")
```

#### Aturan & Validasi Bisnis:
1. **Audit Trailing**: Setiap mutasi manual oleh Host ditandai dengan flag permanen `is_manual_override = true` pada tabel `rsvps`, dan teks catatan (`notes`) ditambahkan keterangan konteks penyesuaian oleh Host.
2. **Penguncian Formulir Tamu (*Guest Lockout*)**: Jika `is_manual_override = true`, tamu dilarang menimpa data tersebut melalui tautan personal. Endpoint publik `GET .../guests/:token` mengembalikan `isRsvpLocked: true` dengan alasan `HOST_OVERRIDE`, dan antarmuka formulir di frontend tamu dinonaktifkan secara interaktif (*read-only state*).

---

### 11.4 Moderasi Buku Ucapan (Hide/Delete), Revalidasi & Realtime Event

Untuk mencegah tampilan ucapan bernada kasar, spam iklan, atau salah ketik yang mengganggu di layar undangan tamu, Host disediakan fitur moderasi realtime.

```mermaid
sequenceDiagram
    autonumber
    actor Host as Host (Dashboard)
    participant API as Hono Backend (apps/api)
    participant DB as PostgreSQL (packages/db)
    participant Bus as AppEventBus
    participant SSE as SSEChannelHub
    actor Guest as Tamu Browser (apps/invitation)

    Note over Host,Guest: Skenario 1: Sembunyikan Ucapan (Soft Moderation)
    Host->>API: PATCH /api/v1/manage/events/:id/wishes/:wishId/visibility { isHidden: true }
    API->>DB: UPDATE wishes SET is_hidden = true WHERE id = $wishId AND event_id = $id
    DB-->>API: Updated
    API->>Bus: publish("wish.moderated", { wishId, isHidden: true })
    Bus->>SSE: broadcast("wish.moderated", { wishId, isHidden: true })
    SSE-->>Guest: Client Island menghapus elemen ucapan dari DOM secara visual
    API-->>Host: 200 OK { isHidden: true }

    Note over Host,Guest: Skenario 2: Hapus Permanen Ucapan (Hard Delete)
    Host->>API: DELETE /api/v1/manage/events/:id/wishes/:wishId
    API->>DB: DELETE FROM wishes WHERE id = $wishId AND event_id = $id
    DB-->>API: Deleted
    API->>Bus: publish("wish.deleted", { wishId })
    Bus->>SSE: broadcast("wish.deleted", { wishId })
    SSE-->>Guest: Client Island menghapus elemen ucapan dari DOM
    API-->>Host: 200 OK { success: true }
```

#### Aturan & Validasi Bisnis:
1. **Penyaringan Selektif Query Publik**: Endpoint publik `GET /public/wishes/:eventId` memiliki klausa permanen `WHERE is_hidden = false`. Ucapan yang disembunyikan seketika tidak akan pernah terkirim ke pengunjung baru atau pembacaan infinite-scroll.
2. **Sinkronisasi Realtime Tanpa Revalidasi ISR**: Karena buku ucapan di `apps/invitation` beroperasi sebagai Client Component Island yang terhubung ke SSE Hub, aksi *hide* atau *delete* memancarkan event `wish.moderated` / `wish.deleted`. Elemen pesan seketika lenyap dari layar seluruh tamu yang sedang membuka undangan tanpa memicu revalidasi HTML statis CDN Vercel.

---

### 11.5 Distribusi Pesan WhatsApp (Substitusi Variabel & URL Encoding `wa.me`)

Sesuai PRD §2.4, Inveeta MVP tidak menggunakan WhatsApp Business API berbayar (*no automated broadcast*), melainkan penyediaan deep-link manual yang efisien bagi Host untuk mengirimkan undangan via aplikasi WhatsApp personal atau WhatsApp Web.

```mermaid
flowchart TD
    Template["Template Pesan Mentah (waMessageTemplates)<br/>'Halo {nama}, kami mengundang Anda ke acara {acara}... Tautan: {link}'"]
    GuestData["Data Tamu & Acara (PostgreSQL)<br/>name: 'Bpk. Rahmat & Keluarga'<br/>phone: '081234567890'<br/>token: 'k7X9qL2p0m'"]
    
    GuestData --> Normalizer["1. Normalisasi Nomor WhatsApp<br/>packages/shared/src/utils/phone.ts<br/>'0812...' -> '6281234567890'"]
    Template & GuestData --> Engine["2. Template Substitution Engine<br/>Substitusi: {nama}, {link}, {acara}, {tanggal}"]
    
    Engine --> RawMsg["Pesan Bersih Terformat (UTF-8)"]
    RawMsg --> Encoder["3. URL Percent-Encoder<br/>encodeURIComponent(rawMessage)"]
    Normalizer & Encoder --> DeepLink["4. Output Deep-Link Siap Pakai<br/>https://wa.me/6281234567890?text=Halo%20Bpk.%20Rahmat..."]
```

#### Spesifikasi Algoritma Substitusi & Format Deep-Link:
1. **Daftar Variabel Dinamis Resmi**:
   - `{nama}` $\rightarrow$ Nama lengkap tamu (`guest.name`).
   - `{link}` $\rightarrow$ Tautan personal unik (`https://inveeta.com/{slug}/{guest.token}`).
   - `{acara}` $\rightarrow$ Judul acara pernikahan (`event.title`).
   - `{tanggal}` $\rightarrow$ Format tanggal ramah bahasa Indonesia (`formatDate(event.eventDate)`).
2. **Normalisasi Nomor Telepon Standar Internasional**:
   - Format Indonesia diawali angka `08` atau `+628` dikonversi seragam menjadi `628...` tanpa simbol tambah (`+`), spasi, atau tanda minus (`-`):
     ```typescript
     export function normalizeWhatsAppNumber(phone: string): string {
       const cleaned = phone.replace(/[^0-9]/g, '');
       if (cleaned.startsWith('0')) return '62' + cleaned.slice(1);
       if (cleaned.startsWith('62')) return cleaned;
       return cleaned;
     }
     ```
3. **Encoding URL**: Pesan hasil substitusi diproses melalui `encodeURIComponent()` untuk menjamin karakter baris baru (`\n`), spasi, dan tanda baca diterjemahkan dengan aman ke dalam parameter query `?text=...`.

---

### 11.6 Ekspor Data Rekap Tamu & RSVP (Excel .xlsx & CSV)

Host dapat mengunduh seluruh data tamu dan status RSVP ke format spreadsheet kapan saja untuk kebutuhan koordinasi dengan vendor katering, wedding organizer (WO), dan pencetakan buku tamu fisik.

```mermaid
sequenceDiagram
    autonumber
    actor Host as Host (Dashboard Browser)
    participant API as Hono Backend (apps/api)
    participant DB as PostgreSQL (packages/db)

    Host->>API: GET /api/v1/manage/events/:id/export/xlsx
    Note over API: Guard: requireAuth & requireEventOwner
    
    API->>DB: Query seluruh tamu, alokasi sesi, dan jawaban RSVP
    DB-->>API: Array of GuestRecords (250 - 2.000 baris)

    Note over API: Pembentukan Spreadsheet via Library 'exceljs':<br/>- Streaming Writer: ExcelJS.stream.xlsx.WorkbookWriter<br/>- Header tebal dengan warna tema branding<br/>- Auto-fit lebar kolom & Data validation status<br/>- Aliran data langsung ke Response Stream (Zero Heap Spike)
    
    API->>API: workbook.commit() (Streaming chunks)
    
    API-->>Host: 200 OK Stream Response<br/>Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet<br/>Content-Disposition: attachment; filename="rekap-tamu-andi-siti.xlsx"
```

#### Keputusan Arsitektur: Streaming Writer vs In-Memory Buffer:
1. **Evaluasi Skala Data & Proteksi RAM VPS (1–2 GB)**:
   - Acara pernikahan tipikal memiliki 250 hingga 2.000 tamu.
   - Menggunakan in-memory workbook (`workbook.xlsx.writeBuffer()`) berpotensi memicu lonjakan memori heap hingga $30 - 50\text{ MB}$ saat banyak sel diberi *formatting*, *borders*, dan *formulas*. Pada VPS berspesifikasi 1–2 GB RAM yang menjalankan API, PostgreSQL, dan Caddy secara bersamaan, beberapa proses ekspor konkuren berisiko memicu *Out-Of-Memory (OOM) Killer*.
2. **Implementasi Excel (.xlsx) Streaming**:
   - Menggunakan mode streaming **`new ExcelJS.stream.xlsx.WorkbookWriter({ stream: passThroughStream })`**.
   - Setiap baris data tamu yang dibaca dari kursor PostgreSQL langsung ditulis dan di-commit per baris (`worksheet.addRow(...).commit()`).
   - Konsumsi memori RAM tetap konstan ($< 5\text{ MB}$) terlepas dari berapa pun jumlah tamu yang diekspor, menjamin stabilitas VPS secara mutlak.
3. **Implementasi CSV (.csv)**:
   - Menggunakan **Text Streaming** langsung ke respons HTTP Hono (`c.streamText()`) dengan penyisipan karakter **UTF-8 Byte Order Mark (BOM: `\uFEFF`)** di awal file. Penambahan UTF-8 BOM menjamin karakter khusus (tanda petik, nama beraksen, simbol) terbuka dengan format kolom rapi saat file dibuka langsung menggunakan Microsoft Excel di komputer Windows.

---

## 12. Shared Package (`packages/shared`)

Paket `packages/shared` merupakan jantung konsistensi tipe dan logika bisnis Inveeta. Paket ini bersifat independen tanpa ketergantungan runtime ke database (`packages/db`), Node.js internal, maupun browser DOM, sehingga dapat di-import secara aman oleh seluruh aplikasi (`apps/api`, `apps/invitation`, `apps/dashboard`, serta aplikasi Phase 2).

### 12.1 Struktur Organisasi Direktori
```
packages/shared/
├── src/
│   ├── schemas/              # Single source of truth skema Zod
│   │   ├── auth.schema.ts
│   │   ├── event.schema.ts
│   │   ├── session.schema.ts
│   │   ├── guest.schema.ts
│   │   ├── rsvp.schema.ts
│   │   ├── wish.schema.ts
│   │   ├── media.schema.ts
│   │   └── template.schema.ts
│   ├── dto/                  # TypeScript Types hasil inferensi Zod
│   │   ├── api.dto.ts        # Response Envelope (Success, Error, Meta)
│   │   ├── event.dto.ts
│   │   ├── guest.dto.ts
│   │   ├── rsvp.dto.ts
│   │   └── metrics.dto.ts
│   ├── constants/            # Nilai konstanta & enum aplikasi
│   │   ├── limits.ts         # Batas ukuran file, max pax, panjang string
│   │   ├── reservedSlugs.ts  # Kata kunci URL yang dilarang
│   │   └── categories.ts     # Kategori tamu, status RSVP, template tiers
│   ├── utils/                # Fungsi utilitas murni (Pure functions)
│   │   ├── slugify.ts        # Generator slug URL-safe
│   │   ├── dateFormat.ts     # Formatter tanggal & konversi timezone
│   │   ├── phone.ts          # Normalisasi nomor WhatsApp
│   │   ├── token.ts          # CSPRNG generator token 128-bit
│   │   └── id.ts             # ID generator nanoid seragam
│   ├── templates/            # Registry statis metadata template
│   │   ├── types.ts
│   │   └── registry/
│   │       ├── minimalist.ts
│   │       ├── rustic.ts
│   │       ├── heritage.ts
│   │       └── index.ts
│   └── index.ts              # Entrypoint ekspor utama paket
├── package.json
└── tsconfig.json
```

---

### 12.2 Katalog Konstanta, Batasan Sistem & Reserved Slugs

#### A. Batasan Sistem (`packages/shared/src/constants/limits.ts`)
```typescript
export const SYSTEM_LIMITS = {
  // Kuota Media Storage Cloudflare R2
  MEDIA: {
    MAX_PHOTO_SIZE_BYTES: 2 * 1024 * 1024,   // 2 MB
    MAX_AUDIO_SIZE_BYTES: 10 * 1024 * 1024,  // 10 MB
    MAX_QRIS_SIZE_BYTES: 2 * 1024 * 1024,    // 2 MB
    ALLOWED_PHOTO_MIMES: ['image/jpeg', 'image/png', 'image/webp'] as const,
    ALLOWED_AUDIO_MIMES: ['audio/mpeg', 'audio/mp4', 'audio/x-m4a'] as const,
    PRESIGNED_URL_TTL_SECONDS: 600,          // 10 Menit
  },
  // Kuota Tamu & RSVP
  GUESTS: {
    DEFAULT_MAX_PAX: 2,
    ABSOLUTE_MAX_PAX: 20,
    TOKEN_ENTROPY_BYTES: 16,                 // 128-bit entropi
    TOKEN_LENGTH_CHARS: 22,                  // Base64URL
  },
  // Rate Limiting Anti-Spam Buku Ucapan
  WISHES: {
    MIN_NAME_LENGTH: 2,
    MAX_NAME_LENGTH: 50,
    MIN_MESSAGE_LENGTH: 5,
    MAX_MESSAGE_LENGTH: 500,
    COOLDOWN_PER_IP_SECONDS: 30,
    MAX_PER_10_MINUTES: 5,
  },
} as const;
```

#### B. Daftar Kata Kunci URL Terlarang (`packages/shared/src/constants/reservedSlugs.ts`)
Slug berikut dilarang digunakan oleh Host untuk mencegah benturan rute internal Next.js dan sub-path API:

```typescript
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'admin',
  'api',
  'app',
  'dashboard',
  'auth',
  'login',
  'register',
  'signup',
  'signin',
  'signout',
  'logout',
  'settings',
  'profile',
  'account',
  'public',
  'manage',
  'realtime',
  'stream',
  'cdn',
  'static',
  'assets',
  'favicon',
  'robots',
  'sitemap',
  'support',
  'help',
  'terms',
  'privacy',
  'pricing',
  'templates',
  'scanner',
  'photobooth',
  'live',
  'inveeta',
]);
```

---

### 12.3 Katalog Utilitas Bersama (Pure Utility Functions)

#### A. Generator Slug URL-Safe (`packages/shared/src/utils/slugify.ts`)
```typescript
/**
 * Mengubah string judul menjadi format URL-safe kebab-case.
 * Contoh: "Andi & Siti's Wedding! 2026" -> "andi-sitis-wedding-2026"
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Ganti spasi dengan tanda hubung
    .replace(/[^\w\-]+/g, '')       // Hapus seluruh karakter non-kata kecuali minus
    .replace(/\-\-+/g, '-')         // Ganti minus berulang dengan minus tunggal
    .replace(/^-+/, '')             // Hapus minus di awal
    .replace(/-+$/, '');            // Hapus minus di akhir
}
```

#### B. Pemformat Tanggal & Zona Waktu Indonesia (`packages/shared/src/utils/dateFormat.ts`)
```typescript
export type IndonesiaTimeZone = 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura';

const TIME_ZONE_LABEL_MAP: Record<IndonesiaTimeZone, string> = {
  'Asia/Jakarta': 'WIB',
  'Asia/Makassar': 'WITA',
  'Asia/Jayapura': 'WIT',
};

/**
 * Format string ISO 8601 ke dalam format ramah bahasa Indonesia dengan zona waktu akurat.
 * Menggunakan standar IANA Identifier untuk kompatibilitas native Intl.DateTimeFormat tanpa RangeError.
 * Contoh output: "Sabtu, 12 Desember 2026 • 19:00 WIB"
 */
export function formatEventDateTime(
  isoDateString: string,
  timeZone: IndonesiaTimeZone = 'Asia/Jakarta',
  includeTime = true
): string {
  const date = new Date(isoDateString);
  const label = TIME_ZONE_LABEL_MAP[timeZone] || 'WIB';

  const datePart = new Intl.DateTimeFormat('id-ID', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

  if (!includeTime) return datePart;

  const timePart = new Intl.DateTimeFormat('id-ID', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  return `${datePart} • ${timePart} ${label}`;
}
```

---

### 12.4 Aturan Versioning Skema & Kompatibilitas Mundur

Karena seluruh aplikasi berada dalam satu monorepo TypeScript (*Single-Version Policy*):
1. **Sinkronisasi Tipe Monorepo**: Setiap pembaruan skema Zod di `packages/shared` akan langsung divalidasi oleh kompiler TypeScript ke seluruh aplikasi (`apps/api`, `apps/invitation`, `apps/dashboard`) saat perintah `pnpm turbo typecheck` dieksekusi di CI/CD.
2. **Prinsip *Tolerant Reader* pada Endpoint Publik**:
   - Seluruh penambahan field baru pada skema publik DTO (`PublicEventDTO`, `PersonalizedGuestContextDTO`) **wajib bersifat opsional** (`z.optional()`).
   - Browser tamu yang membuka halaman dengan versi JavaScript lama atau cache Edge CDN Vercel yang belum kedaluwarsa tidak akan mengalami *runtime crash* saat menerima respons dengan atribut tambahan dari API yang telah diperbarui.

---

## 13. Keamanan & Kepatuhan Privasi

### 13.1 Strategi Rate Limiting Terpadu

Untuk melindungi server VPS berdaya hemat (\$5–\$10/bulan) dari serangan *Denial-of-Service* (DoS), *brute-force*, dan spamming buku ucapan, Inveeta mengimplementasikan strategi rate limiting berlapis di level reverse proxy dan aplikasi.

```mermaid
graph TD
    Client["Client Request"] --> Caddy["Caddy Reverse Proxy<br/>(Rate limit koneksi & bandwidth)"]
    Caddy --> Trust["Trusted Proxy Header<br/>(X-Forwarded-For diekstrak)"]
    Trust --> HonoRateLimit["Hono In-Memory Sliding Window<br/>(LRU Store maks 10.000 IP)"]
    HonoRateLimit -->|Pass| EndpointHandler["Domain Endpoint Handlers"]
    HonoRateLimit -->|Exceeded| Block["429 Too Many Requests<br/>(Retry-After Header)"]
```

#### A. Pemilihan Storage: In-Memory Sliding Window vs Redis
Pada fase MVP untuk solo developer:
- **Keputusan**: Menggunakan **In-Memory Sliding Window Rate Limiter** yang terintegrasi di dalam proses Node.js Hono dengan LRU Cache Store (maksimum 10.000 entri IP aktif).
- **Rasional**:
  1. *Zero Overhead*: Tidak memerlukan container Redis tambahan di VPS, menghemat 100–150 MB memori RAM yang sangat berharga.
  2. *Latensi Sub-Milidetik*: Pengecekan limit dilakukan di memori internal Node.js ($< 0.05\text{ ms}$).
  3. *Single Node Architecture*: Karena backend API dijalankan sebagai kontainer tunggal di VPS, in-memory store bersifat 100% konsisten.
- **Pembersihan Memori Otomatis**: IP yang tidak aktif selama periode window otomatis dibersihkan oleh algoritma LRU, mencegah kebocoran memori (*memory leak*).

#### B. Ekstraksi IP Asli dari Balik Reverse Proxy (*Trusted Proxy*)
Karena seluruh trafik masuk melalui Caddy reverse proxy, Hono dikonfigurasi untuk mengekstrak IP klien dari header `X-Forwarded-For` yang divalidasi:
```typescript
// apps/api/src/middlewares/rateLimiter.ts
import { rateLimiter } from 'hono-rate-limiter';

export const createStrictRateLimiter = (windowMs: number, max: number, message: string) => {
  return rateLimiter({
    windowMs,
    limit: max,
    standardHeaders: 'draft-6',
    keyGenerator: (c) => {
      // Mengambil IP asli dari header yang diteruskan oleh Caddy
      return c.req.header('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    },
    handler: (c) => {
      return c.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message,
          },
        },
        429
      );
    },
  });
};

// Rate limiter spesifik ucapan: 1 submit per 30 detik
export const wishRateLimiter = createStrictRateLimiter(
  30 * 1000,
  1,
  'Anda terlalu cepat mengirim ucapan. Silakan tunggu 30 detik sebelum mengirim kembali.'
);
```

---

### 13.2 Sanitasi Input, Pencegahan XSS & Header Keamanan HTTP

#### A. Sanitasi Teks Buku Ucapan (Anti-XSS & Anti-Defacement)
Ucapan tamu yang ditampilkan di layar publik wajib disanitasi sebelum disimpan ke basis data menggunakan parser HTML bertipe strik (`sanitize-html`):

```typescript
// apps/api/src/modules/wishes/service.ts
import sanitizeHtml from 'sanitize-html';

export function sanitizeWishText(rawMessage: string): string {
  return sanitizeHtml(rawMessage, {
    allowedTags: [],       // Hapus seluruh tag HTML (<script>, <iframe>, <a>, <div>, dll)
    allowedAttributes: {}, // Hapus seluruh atribut HTML (onclick, onerror, onload)
    disallowedTagsMode: 'discard',
  }).trim();
}
```

#### B. Header Keamanan HTTP (*Security Headers Middleware*)
`apps/api` dan `apps/invitation` menerapkan header keamanan ketat:

```typescript
// apps/api/src/middlewares/securityHeaders.ts
import { secureHeaders } from 'hono/secure-headers';

export const securityHeadersMiddleware = secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline diizinkan khusus hydration Next.js
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "https://cdn.inveeta.com", "data:"],
    mediaSrc: ["'self'", "https://cdn.inveeta.com"],
    connectSrc: ["'self'", "https://api.inveeta.com", "https://inveeta.com"],
    frameAncestors: ["'none'"], // Mencegah clickjacking
  },
  strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
  xXssProtection: '1; mode=block',
});
```

---

### 13.3 Manajemen Rahasia & Variabel Lingkungan (*Secret Management*)

1. **Prinsip *No Hardcoded Secrets***:
   - Dilarang keras menuliskan password database, API key, atau secret token langsung di dalam kode sumber.
   - File `.env` dan `.env.local` didaftarkan secara mutlak di `.gitignore`.
2. **Injeksi Rahasia Terisolasi**:
   - **Environment VPS (Docker)**: Variabel sensitif disuntikkan melalui file `.env.production` di root server VPS yang hanya dapat dibaca oleh user `root` (`chmod 600 .env.production`).
   - **Environment Vercel**: Variabel frontend disuntikkan secara aman melalui portal dashboard Vercel Project Settings dengan enkripsi at-rest.
3. **Pemisahan Environtment Variable Publik vs Privat**:
   - Variabel yang boleh diekspos ke browser wajib menggunakan prefix eksplisit (`NEXT_PUBLIC_` untuk Next.js, `VITE_` untuk Vite). Variabel tanpa prefix dianggap privat dan tidak akan pernah diikutsertakan ke dalam client bundle.

---

### 13.4 Kepatuhan UU Pelindungan Data Pribadi (UU PDP No. 27 Tahun 2022)

Sebagai platform yang mengelola data pribadi masyarakat Indonesia (nama, nomor telepon WhatsApp, relasi keluarga), Inveeta dirancang patuh terhadap regulasi UU PDP:

1. **Prinsip Minimalisasi Pengumpulan Data**:
   - Sistem hanya mencatat nomor telepon untuk kebutuhan pengiriman deep-link undangan, tanpa mengumpulkan data lokasi GPS, riwayat perangkat, atau kontak buku telepon tamu.
2. **Zero Exposure Nomor Telepon**:
   - Nomor WhatsApp tamu **tidak pernah** dikembalikan ke endpoint publik mana pun (`GET /events/:slug` maupun `GET /events/:slug/guests/:token`).
3. **Hak Penghapusan Data Pribadi (*Right to Erasure*)**:
   - Host dapat menghapus seluruh acara beserta data tamu, RSVP, ucapan, dan foto kapan saja melalui tombol "Hapus Acara" di dashboard. Operasi `DELETE /manage/events/:id` melakukan penghapusan kaskade (`ON DELETE CASCADE`) di PostgreSQL dan memicu antrean pembersihan file fisik di Cloudflare R2 secara permanen.
4. **Kebijakan Retensi Acara**:
   - Data acara yang telah selesai $\ge 90\text{ hari}$ tanpa aktivitas login Host akan dikategorikan sebagai arsip dan dapat dibersihkan secara bertahap setelah pemberitahuan email ke Host.

---

## 14. Infrastruktur & Deployment

### 14.1 Topologi Arsitektur Sistem

Arsitektur Inveeta memanfaatkan sinergi antara **Edge Serverless (Vercel)** untuk front-end berkecepatan tinggi dan **Dockerized VPS (Linux)** untuk backend yang ekonomis dan terprediksi:

```mermaid
graph TD
    subgraph "Global Internet / Users"
        UserGuests["Tamu Undangan<br/>(Mobile 4G/WiFi)"]
        UserHost["Host Pengantin<br/>(Dashboard Desktop/PWA)"]
    end

    subgraph "Cloudflare Edge Network"
        CFDNS["Cloudflare DNS & Proxy<br/>inveeta.com / *.inveeta.com"]
        CFR2["Cloudflare R2 Bucket<br/>(cdn.inveeta.com - Zero Egress)"]
    end

    subgraph "Vercel Edge Platform"
        VercelInv["Vercel Project 1: apps/invitation<br/>inveeta.com (Next.js 15 ISR)"]
        VercelDash["Vercel Project 2: apps/dashboard<br/>app.inveeta.com (Vite React PWA)"]
    end

    subgraph "VPS Linux ($5-$10/mo - Ubuntu 24.04 LTS)"
        subgraph "Docker Compose Network (inveeta-net)"
            CaddyProxy["Caddy Reverse Proxy<br/>(:80, :443 Automatic TLS)"]
            APIContainer["Hono Node.js API Container<br/>(:3000 internal)"]
            PostgresContainer["PostgreSQL 16 Alpine Container<br/>(:5432 internal - Terisolasi)"]
            VolPG[("Docker Volume<br/>postgres_data")]
        end
    end

    UserGuests -->|HTTPS| CFDNS
    UserHost -->|HTTPS| CFDNS

    CFDNS -->|Root / [slug]| VercelInv
    CFDNS -->|Subdomain app.| VercelDash
    CFDNS -->|Subdomain cdn.| CFR2
    CFDNS -->|Subdomain api.| CaddyProxy

    CaddyProxy -->|HTTP reverse_proxy| APIContainer
    APIContainer -->|TCP Drizzle Pool| PostgresContainer
    PostgresContainer --- VolPG

    VercelInv -->|HTTPS Hono RPC| CaddyProxy
    APIContainer -->|Webhook Revalidate| VercelInv
    APIContainer -->|S3 Presign & Head| CFR2
```

---

### 14.2 Matriks DNS, Subdomain & Konfigurasi TLS

Seluruh DNS domain dikelola melalui Cloudflare DNS:

| Host / Subdomain | Tipe Rekord | Target / Nilai | Proxy Status | Fungsi Layanan |
|---|:---:|---|:---:|---|
| `inveeta.com` | `CNAME` | `cname.vercel-dns.com` | DNS Only (Gray Cloud) | Frontend Undangan Tamu (`apps/invitation`) |
| `app.inveeta.com` | `CNAME` | `cname.vercel-dns.com` | DNS Only (Gray Cloud) | Frontend Dashboard Host (`apps/dashboard`) |
| `api.inveeta.com` | `A` | `[IP_PUBLIC_VPS]` | DNS Only (Gray Cloud)* | Backend API Hono & Better Auth |
| `cdn.inveeta.com` | `CNAME` | `[R2_PUBLIC_ENDPOINT]` | Proxied (Orange Cloud) | Media Storage Cloudflare R2 |

*\*Catatan*: `api.inveeta.com` menggunakan status *DNS Only* agar Caddy di VPS dapat menerbitkan sertifikat TLS Let's Encrypt secara mandiri melalui HTTP-01 / TLS-ALPN-01 challenge tanpa intervensi proxy ganda Cloudflare.

---

### 14.3 Matriks Variabel Lingkungan (Environment Variables)

| Aplikasi | Nama Variabel | Kebutuhan | Deskripsi & Contoh Nilai |
|---|---|:---:|---|
| **`apps/api`** | `DATABASE_URL` | Rahasia | `postgresql://user:pass@postgres:5432/inveeta_db` |
| | `BETTER_AUTH_SECRET` | Rahasia | 32-byte acak untuk enkripsi cookie/sesi |
| | `BETTER_AUTH_URL` | Publik | `https://api.inveeta.com` |
| | `GOOGLE_CLIENT_ID` | Rahasia | Client ID OAuth Google Cloud Console |
| | `GOOGLE_CLIENT_SECRET` | Rahasia | Client Secret OAuth Google |
| | `RESEND_API_KEY` | Rahasia | API Key Resend untuk email transaksional |
| | `R2_ACCOUNT_ID` | Rahasia | Cloudflare Account ID |
| | `R2_ACCESS_KEY_ID` | Rahasia | Cloudflare R2 S3 Access Key |
| | `R2_SECRET_ACCESS_KEY` | Rahasia | Cloudflare R2 S3 Secret Access Key |
| | `R2_BUCKET_NAME` | Konfigurasi | `inveeta-storage` |
| | `REVALIDATION_SECRET` | Rahasia | Shared secret untuk memicu Next.js ISR |
| | `INVITATION_APP_URL` | Konfigurasi | `https://inveeta.com` |
| | `CORS_ALLOWED_ORIGINS` | Konfigurasi | `https://inveeta.com,https://app.inveeta.com` |
| **`apps/invitation`**| `API_INTERNAL_URL` | Konfigurasi | `https://api.inveeta.com` (Target Hono RPC) |
| | `REVALIDATION_SECRET` | Rahasia | Shared secret penerima webhook revalidasi |
| **`apps/dashboard`** | `VITE_API_URL` | Konfigurasi | `https://api.inveeta.com` (Target client RPC) |

---

### 14.4 Pipeline CI/CD (GitHub Actions + Turborepo Remote Cache)

```mermaid
flowchart TD
    Push["Developer Push to 'main'"] --> CI["GitHub Actions Pipeline"]
    
    subgraph "CI Job: Quality & Build Checks"
        Lint["pnpm turbo lint"]
        Typecheck["pnpm turbo typecheck"]
        Test["pnpm turbo test"]
        Build["pnpm turbo build (with Turbo Remote Cache)"]
    end
    
    CI --> Lint & Typecheck & Test
    Lint & Typecheck & Test --> Build
    
    subgraph "Deployment Phase"
        Build --> DeployVercel["Vercel GitHub Integration<br/>Auto deploy apps/invitation & apps/dashboard"]
        Build --> DeployVPS["GitHub Actions SSH to VPS<br/>- docker compose pull api<br/>- docker compose run migrate<br/>- docker compose up -d api"]
    end
```

#### Alur Eksekusi Migrasi Database & Strategi Rollback:
1. **Migrasi Otomatis saat Deploy**:
   - Pada alur deploy VPS, skrip migrasi Drizzle dijalankan sebelum kontainer aplikasi baru diaktifkan:
     ```bash
     docker compose run --rm api pnpm db:migrate
     ```
   - Jika migrasi gagal, proses deploy dibatalkan seketika tanpa mematikan kontainer aplikasi versi sebelumnya (*zero-downtime abort*).
2. **Strategi Rollback Cepat**:
   - Image Docker di-tag menggunakan SHA commit Git unik (`ghcr.io/naridza/inveeta-api:sha-abc1234`).
   - Rollback dilakukan dengan memperbarui file `.env` di VPS ke SHA versi stabil sebelumnya dan mengeksekusi `docker compose up -d api` ($< 10\text{ detik}$).

---

### 14.5 Strategi Backup & Restore PostgreSQL

Data pernikahan merupakan memori hidup sekali seumur hidup bagi pengguna; kehilangan data adalah kegagalan fatal.

#### A. Skrip Backup Terjadwal Otomatis (`scripts/backup-db.sh`)
Skrip cron dijalankan setiap hari pada pukul **02:00 WIB** di server VPS:
1. Mengeksekusi `pg_dump` dengan format kustom terkompresi (`-Fc`).
2. Mengenkripsi file dump menggunakan GPG dengan symmetric passphrase.
3. Mengunggah file backup ke Cloudflare R2 bucket terpisah (`inveeta-backups/database/`).
4. Menghapus backup lokal yang berusia $> 3\text{ hari}$.

```bash
#!/bin/bash
set -e
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="/tmp/inveeta_backup_${TIMESTAMP}.dump"

# Dump database dari container postgres
docker compose exec -T postgres pg_dump -U inveeta_user -Fc inveeta_db > $BACKUP_FILE

# Upload langsung ke Cloudflare R2 via AWS CLI
aws s3 cp $BACKUP_FILE s3://inveeta-backups/database/inveeta_${TIMESTAMP}.dump \
    --endpoint-url https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com

rm -f $BACKUP_FILE
echo "Backup database sukses diunggah ke Cloudflare R2: inveeta_${TIMESTAMP}.dump"
```

#### B. Kebijakan Retensi (*Retention Policy*):
- **Backup Harian**: Disimpan selama **7 hari** terakhir.
- **Backup Mingguan**: Disimpan selama **4 minggu** terakhir.
- **Backup Bulanan**: Disimpan selama **3 bulan** terakhir.

#### C. SOP Pengujian Pemulihan (*Monthly Restore Drill*):
Setiap tanggal 1 awal bulan, developer menjalankan prosedur uji restore pada database staging lokal:
```bash
# Uji restore ke database lokal terisolasi
createdb -h localhost -U postgres inveeta_restore_test
pg_restore -h localhost -U postgres -d inveeta_restore_test -v /path/to/latest_backup.dump
```
Memverifikasi integritas baris data `events`, `guests`, dan `rsvps` untuk memastikan file dump tidak korup.

---

## 15. Observabilitas & Operasional

### 15.1 Logging Terstruktur (Structured JSON Logging)

Backend `apps/api` menggunakan logger terstruktur berbasis JSON (mis. `pino`) untuk memudahkan pencarian log (*grepping*) dan integrasi log collector di masa depan.

#### Format Standar Baris Log:
```json
{
  "level": "info",
  "time": "2026-10-15T19:35:01.120Z",
  "requestId": "req_0192e2b4-5678",
  "method": "POST",
  "url": "/api/v1/public/rsvp",
  "status": 200,
  "durationMs": 42.5,
  "clientIp": "180.252.10.4",
  "eventId": "evt_abc123",
  "msg": "RSVP submission processed successfully"
}
```

#### Sensor Privasi (*PII Masking*):
Logger secara otomatis menyensor data pribadi:
- Nilai kunci `password`, `token`, `secret` diganti string `[REDACTED]`.
- Nomor telepon disensor 4 digit tengah: `0812****7890`.

---

### 15.2 Pelacakan Error & Crash Reporting

1. **Sentry SDK Integration**:
   - `apps/api`: `@sentry/node` menangkap seluruh *unhandled exceptions* dan error dengan status HTTP 500.
   - `apps/invitation` & `apps/dashboard`: `@sentry/react` menangkap error JavaScript sisi browser via Error Boundary.
2. **Context Enrichment**:
   - Setiap event error di Sentry disuntikkan tag `requestId`, `nodeVersion`, dan `environment` (production/staging) untuk mempermudah reproduksi bug oleh solo developer.

---

### 15.3 Health Check & Uptime Monitoring

#### A. Endpoint Probe Liveness & Readiness (`GET /health`)
```typescript
// apps/api/src/routes/health.ts
import { Hono } from 'hono';
import { db } from '@inveeta/db';
import { sql } from 'drizzle-orm';

export const healthRoute = new Hono().get('/health', async (c) => {
  try {
    // Probe Readiness: Verifikasi konektivitas pool PostgreSQL
    await db.execute(sql`SELECT 1`);

    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      db: 'connected',
    });
  } catch (err: any) {
    return c.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        db: 'disconnected',
        error: err.message,
      },
      503
    );
  }
});
```

#### B. Pemantauan Uptime Eksternal (Better Stack / UptimeRobot)
Pemeriksaan ketersediaan otomatis dijalankan dari luar server:
- Probe 1: Ping `https://api.inveeta.com/health` tiap **60 detik**.
- Probe 2: Ping `https://inveeta.com` tiap **60 detik**.
- Notifikasi alert dikirimkan seketika via Telegram Bot dan Push Notification jika server tidak merespons dalam 3 kali percobaan beruntun.

---

### 15.4 Runbook Operasional Darurat (*Emergency Runbooks*)

#### Runbook 1: Restart Container API & Caddy saat Memory Spike
```bash
# Masuk ke server VPS via SSH
ssh root@api.inveeta.com
cd /app/inveeta/docker

# Restart aman kontainer API tanpa mengganggu database PostgreSQL
docker compose restart api
docker compose logs -f --tail=50 api
```

#### Runbook 2: Rotasi Rahasia Cepat (*Secret Key Compromise*)
Jika `BETTER_AUTH_SECRET` atau `REVALIDATION_SECRET` terkompromikan:
1. Generate secret 32-byte baru: `openssl rand -base64 32`.
2. Perbarui file `.env.production` di server VPS.
3. Perbarui variabel di dashboard Vercel Project Settings.
4. Restart kontainer API: `docker compose up -d api`.
5. Trigger Redeploy di Vercel untuk sinkronisasi secret frontend.

---

## 16. Strategi Pengujian (Testing Pyramid)

Untuk solo developer, strategi pengujian harus memberikan rasio efisiensi tertinggi: **cakupan maksimal dengan waktu pemeliharaan minimal**.

```mermaid
graph TD
    subgraph "Piramida Pengujian Inveeta"
        E2E["E2E Tests (Playwright)<br/>Alur Kritis: Wizard 5 Langkah & Tamu RSVP<br/>Cakupan: ~10%"]
        Integration["Integration Tests (Vitest + Postgres)<br/>Endpoint Hono RPC, Drizzle Relations, Transaksi Lock<br/>Cakupan: ~30%"]
        Unit["Unit Tests (Vitest)<br/>Skema Zod, Helper Murni, Normalisasi, Error Handler<br/>Cakupan: ~60%"]
    end
```

---

### 16.1 Rincian Lapisan Pengujian

#### A. Unit Tests (Vitest — Fokus Kecepatan & Validasi)
- **Target**: `packages/shared` dan modul utilitas API.
- **Kasus Uji**:
  - Validasi ketat skema Zod (mis. string tanpa timezone offset ditolak, nominal pax negatif ditolak, MIME type ilegal ditolak).
  - Pembangkitan token CSPRNG menghasilkan entropi $\ge 128\text{-bit}$.
  - Normalisasi format nomor telepon WhatsApp (`08...` $\rightarrow$ `628...`).
  - Pemformat tanggal ramah pengguna dengan konversi zona waktu IANA WIB, WITA, WIT.

#### B. Integration Tests (Vitest + PostgreSQL Test Container)
- **Target**: `apps/api` (Service & Repository Layer).
- **Kasus Uji Kritis**:
  - *Race Condition Lock*: Simulasi 5 request concurrent mengirimkan RSVP untuk satu tamu; sistem harus mengantrekan request dan memastikan kuota `maxPax` tidak pernah dilipatgandakan.
  - *Deadline Enforcement*: Memastikan submission RSVP ditolak seketika saat waktu server melewati `rsvpDeadline`.
  - *Slug Immutability Trigger*: Memverifikasi trigger PostgreSQL memblokir update slug saat `is_published = true`.
  - *Same-Tier Rule*: Memverifikasi penolakan pergantian template ke tier yang berbeda.

#### C. End-to-End Tests (Playwright — Fokus User Flow Kritis)
- **Alur 1 (Host Wizard)**: Host login $\rightarrow$ isi Step 1–4 $\rightarrow$ upload foto $\rightarrow$ pilih template $\rightarrow$ publish $\rightarrow$ verifikasi halaman undangan live dapat diakses di `inveeta.com/{slug}`.
- **Alur 2 (Tamu Personalized RSVP)**: Tamu membuka tautan `/[slug]/[token]` $\rightarrow$ verifikasi nama muncul di cover $\rightarrow$ isi konfirmasi hadir 2 pax $\rightarrow$ submit $\rightarrow$ verifikasi status tersimpan dan ucapan muncul di buku ucapan.

---

### 16.2 Beban Pengujian Kinerja (*Load Testing via k6*)

Untuk memvalidasi pemenuhan target PRD §1.3 (KPI Performa):
1. **Skenario 1: Pembukaan Undangan Massal (2.000 req/jam puncak)**:
   - k6 script mensimulasikan 500 virtual users (VUs) membuka `inveeta.com/andi-siti` secara bersamaan.
   - Kriteria Lolos: Cache hit CDN Vercel $\ge 95\%$, latensi p95 $\le 300\text{ ms}$, error rate $0\%$.
2. **Skenario 2: Beban Realtime SSE (200 Koneksi Simultan)**:
   - k6 script membuka 200 koneksi SSE berumur panjang ke `/api/v1/realtime/events/:id/stream` di VPS.
   - Kriteria Lolos: Penggunaan RAM Node.js bertambah $< 50\text{ MB}$, zero *MaxListenersExceededWarning*, broadcast pesan terdistribusi ke 200 klien dalam waktu $< 100\text{ ms}$.

---

### 16.3 Quality Gate CI/CD
Pipeline GitHub Actions akan **menggagalkan build (Fail the Build)** jika:
1. Terdapat *type error* TypeScript di salah satu package (`pnpm turbo typecheck`).
2. Terdapat kegagalan unit test atau integrasi test (`pnpm turbo test`).
3. Skor Google Lighthouse pada halaman undangan publik:
   - Performance $< 90$
   - Accessibility (a11y) $< 90$
   - Best Practices $< 90$
   - SEO $< 90$

---

## 17. Developer Experience & Konvensi

### 17.1 Setup Lingkungan Pengembangan Lokal (*Local Quickstart*)

Pengembang baru dapat menjalankan seluruh sistem di komputer lokal hanya dalam 3 langkah:

```bash
# 1. Kloning repositori dan instal dependensi monorepo
git clone https://github.com/naridza/inveeta.git
cd inveeta
pnpm install

# 2. Nyalakan database PostgreSQL lokal via Docker Compose
docker compose -f docker-compose.dev.yml up -d

# 3. Jalankan migrasi database dan masukkan dummy data contoh
pnpm db:migrate
pnpm db:seed

# 4. Jalankan seluruh aplikasi secara bersamaan
pnpm dev
```

Layanan lokal akan aktif pada:
- `http://localhost:3000` — `apps/invitation` (Next.js 15)
- `http://localhost:5173` — `apps/dashboard` (Vite React PWA)
- `http://localhost:4000` — `apps/api` (Hono Node.js)

---

### 17.2 Standar Konvensi Kode & Formatting

1. **Linter & Formatter**: Dikelola secara terpadu menggunakan konfigurasi ESLint + Prettier modern di root monorepo.
2. **Konvensi Penamaan Berkas & Simbol**:
   - Berkas komponen React: `PascalCase.tsx` (mis. `CoverSection.tsx`).
   - Berkas rute, service, utilitas: `kebab-case.ts` (mis. `rate-limiter.ts`, `api-client.ts`).
   - Tipe & Interface TypeScript: `PascalCase` (mis. `PublicEventDTO`).
   - Variabel & Fungsi: `camelCase` (mis. `calculateTotalPax()`).

---

### 17.3 Alur Git & Kebijakan Branch (*Git Workflow*)

- **Trunk-Based Development**: Branch `main` merupakan representasi lingkungan produksi yang selalu siap di-deploy.
- **Short-Lived Feature Branches**:
  - `feat/nama-fitur`: Penambahan kapabilitas baru.
  - `fix/nama-bug`: Perbaikan kesalahan kode.
  - `chore/dependensi`: Pembaruan paket pustaka.
- **Conventional Commits**: Format pesan commit wajib terstruktur:
  - `feat(api): tambahkan verifikasi 2-fase presign media r2`
  - `fix(invitation): cegah duplikasi request http di generateMetadata`
  - `docs(tdd): lengkapi arsitektur sse event bus`

---

## 18. Kesiapan Phase 2 (Extension Points)

Prinsip arsitektur Inveeta MVP adalah **memungkinkan penambahan modul Phase 2 tanpa refactoring pada modul yang telah berjalan**.

### 18.1 Titik Ekstensi Konkret per Modul Phase 2

```mermaid
graph TD
    subgraph "Fondasi Arsitektur MVP (Siap Pakai)"
        DB[("PostgreSQL Schema<br/>guests.token 128-bit, check-in fields")]
        Bus["AppEventBus Singleton<br/>(In-Memory Dispatcher)"]
        MediaMod["Generic Media Module<br/>(Presigned R2 Upload)"]
        Tier["Template Tier Field<br/>(free / premium / exclusive)"]
    end

    subgraph "Aplikasi Phase 2 (Ekstensi Tanpa Refactor)"
        ScannerApp["apps/scanner<br/>(PWA QR Scanner - Offline Sync)"]
        LiveDisplayApp["apps/live-display<br/>(WebSocket Display Screen)"]
        PhotoboothApp["apps/photobooth<br/>(Direct Guest Photo Upload)"]
        BillingMod["Billing & Payment Domain<br/>(Midtrans / Xendit Gateway)"]
    end

    DB -.->|Payload QR Code & Sync| ScannerApp
    Bus -.->|WebSocket Adapter Attach| LiveDisplayApp
    MediaMod -.->|Slot 'photobooth' Upload| PhotoboothApp
    Tier -.->|Paywall Tier Upgrade| BillingMod
```

#### 1. `apps/scanner` (PWA Offline-First QR Check-In):
- **Fondasi MVP**: Token tamu 128-bit (`guests.token`) diformat menjadi QR Code di tautan undangan personal. Skema tabel `guests` telah dilengkapi kolom cadangan: `checked_in_at` (timestamptz) dan `check_in_session_id` (text).
- **Titik Ekstensi**: Tambahkan endpoint batch sync `POST /api/v1/manage/events/:id/guests/sync-checkin` di API untuk menerima antrean data check-in offline dari IndexedDB scanner.

#### 2. `apps/live-display` (Layar Proyektor Panggung):
- **Fondasi MVP**: Logika pengiriman event di backend diisolasi oleh `AppEventBus`.
- **Titik Ekstensi**: Tambahkan file adapter `apps/api/src/modules/realtime/websocket.ts` yang mengikat event bus ke server WebSocket (RFC 6455). Klien layar proyektor dapat terhubung dua arah tanpa mengubah baris kode apa pun di `wishesService` atau `rsvpService`.

#### 3. `apps/photobooth` (Unggah Foto Tamu di Lokasi Acara):
- **Fondasi MVP**: Endpoint `POST /media/presign` dan `POST /media/confirm` bersifat generik terhadap parameter `slotIdentifier` dan `mediaType`.
- **Titik Ekstensi**: Tambahkan jenis `mediaType: 'photobooth'` pada enum skema Drizzle dan izinkan upload dari tamu terverifikasi token.

#### 4. Domain Billing & Monetisasi:
- **Fondasi MVP**: Field `templateTier` pada tabel `events` dan metadata template sudah terikat enum (`free`, `premium`, `exclusive`).
- **Titik Ekstensi**: Tambahkan folder modul baru `apps/api/src/modules/billing/` untuk menangani webhook pembayaran (Midtrans/Xendit) yang mengubah status `templateTier` sebuah acara setelah transaksi berhasil.

---

### 18.2 Matriks: Hal yang Disiapkan di MVP vs Hal yang Sengaja Ditunda

| Area / Modul | Siap di Fondasi MVP (Done) | Sengaja Ditunda ke Phase 2 (Non-Goals) |
|---|---|---|
| **Check-In Acara** | Kolom `checked_in_at` & QR code token 128-bit | Aplikasi antarmuka kamera scanner PWA & IndexedDB sync |
| **Layar Proyektor** | Abstraksi `AppEventBus` & SSE stream ucapan live | WebSocket transport adapter & animasi transisi layar panggung |
| **Media Tamu** | Generik presigned URL R2 scope per acara | Frontend galeri photobooth & moderasi foto tamu massal |
| **Monetisasi** | Field `templateTier` & validasi pergantian same-tier | Integrasi payment gateway, invoice PDF, sistem langganan |
| **Notifikasi WA** | Deep link URL `wa.me` dengan substitusi variabel | Otomatisasi pengiriman broadcast via WhatsApp Business API |
| **Impor Tamu** | Entri satuan dengan token unik & alokasi sesi | Upload berkas spreadsheet Excel/CSV massal dengan parser antrean |

---

## 19. Rencana Implementasi (Implementation Plan)

Rencana implementasi teknis menyeluruh, pemetaan milestone produk (M0–M4), rincian tugas teknis (*actionable tasks*), jalur kritis ketergantungan (*critical path*), serta kriteria penerimaan (*Definition of Done*) per milestone telah dipisahkan secara terstruktur ke dalam dokumen mandiri:

👉 **[docs/IMPLEMENTATION_PLAN.md](file:///c:/Users/Ridzuan/Documents/Naridza%20Studio/dev/inveetabynrdz/docs/IMPLEMENTATION_PLAN.md)**

### Ringkasan Eksekutif Milestone Teknis:

| Milestone | Durasi | Target Utama | Indikator Keberhasilan (DoD Kunci) |
|---|:---:|---|---|
| **M0: Fondasi & Scaffolding** | Minggu 1–2 | Setup monorepo pnpm + Turbo, Drizzle schema, Better Auth, skeleton API Hono, dan pipeline CI/CD. | CI passing, migrasi DB sukses, `/health` connected, auth cookie `.inveeta.com` aktif. |
| **M1: Inisiasi Acara & Wizard** | Minggu 3–5 | Wizard 5 langkah, penyimpanan draft bertahap, publikasi acara, penguncian slug, upload R2 2-fase. | Host berhasil publish acara, slug terkunci via trigger DB, file media terverifikasi di R2. |
| **M2: Undangan Publik & RSVP** | Minggu 6–8 | Next.js 15 ISR on-demand, Islands Architecture, OG image statis, form RSVP atomik, buku ucapan SSE. | LCP $\le 2.5\text{s}$, preview WA muncul $\le 300\text{ KB}$, transaksi lock RSVP kebal race condition. |
| **M3: Dashboard Host & Distribusi** | Minggu 9–11 | Dashboard PWA, manajemen tamu, manual override RSVP, template & link generator WA, ekspor Excel/CSV. | Host dapat kelola 100+ tamu, form personal terkunci saat override, unduh Excel rapi via `exceljs`. |
| **M4: Hardening, Test & Beta** | Minggu 12 | Load test k6 (2.000 req/acara & 200 SSE), audit keamanan/XSS, backup & restore drill, pilot 3–5 acara nyata. | Lolos uji beban tanpa 500/504, script backup R2 sukses diuji restore, zero bug kritis di Sentry. |

---

## 20. Risiko Teknis, Keputusan & Open Questions

### 20.1 Rekod Keputusan Arsitektur (Architectural Decision Records - ADR)

Bagian ini mendokumentasikan keputusan arsitektural fundamental yang diambil selama penyusunan TDD beserta konteks, alternatif yang ditolak, dan konsekuensinya:

#### ADR-001: Pemilihan Monorepo TypeScript & Decoupled Monolith (pnpm + Turborepo)
* **Status**: **DITERIMA**
* **Konteks**: Sebagai *solo developer*, mengelola banyak repositori Git terpisah (multi-repo) menimbulkan friksi sinkronisasi tipe data, duplikasi skema validasi, dan alur CI/CD yang terfragmentasi.
* **Keputusan**: Menggabungkan seluruh aplikasi (`apps/*`) dan paket bersama (`packages/*`) dalam satu monorepo menggunakan **pnpm Workspaces** dan **Turborepo**.
* **Konsekuensi**: 
  - ✅ Berbagi skema Zod dan DTO tanpa overhead build/publish ke package registry privat.
  - ✅ `pnpm turbo typecheck` memverifikasi kompatibilitas tipe end-to-end secara serentak.
  - ⚠️ Menuntut disiplin matriks dependensi (frontend dilarang keras mengimpor `packages/db`).

#### ADR-002: Pemilihan Node.js + Hono & Zero-Codegen Hono RPC (`hc<AppType>`)
* **Status**: **DITERIMA**
* **Konteks**: Diperlukan framework backend yang sangat ringan, berkinerja tinggi, mematuhi standar Web Fetch API, serta menyediakan integrasi type-safe ke frontend tanpa ketergantungan pada *codegen tools* yang rapuh seperti tRPC atau OpenAPI generator.
* **Keputusan**: Menggunakan **Hono** di atas Node.js runtime untuk `apps/api` dan mengekspor tipe `AppType` ke frontend via klien RPC bawaan Hono (`hc`).
* **Konsekuensi**:
  - ✅ *Zero Codegen*: Perubahan endpoint di backend seketika tercermin pada autocomplete TypeScript di frontend tanpa langkah kompilasi perantara.
  - ✅ Ekosistem Hono kaya middleware modern (Zod validator, CORS, security headers, rate limiter).
  - ⚠️ Komposisi rute chaining di `apps/api/src/index.ts` harus dijaga agar tidak memecah inferensi tipe kompilator TypeScript.

#### ADR-003: Akses Database Eksklusif Satu Pintu via API (API-Only DB Access)
* **Status**: **DITERIMA** *(Merevisi opsi awal "Next.js Membaca Database Langsung")*
* **Konteks**: Pada awal perancangan PRD, dipertimbangkan opsi Next.js membaca database PostgreSQL langsung untuk kebutuhan SSR undangan guna memangkas satu hop jaringan. Namun, mengekspos PostgreSQL di VPS ke internet publik (agar bisa diakses Vercel Edge/Serverless) membuka celah keamanan serius (serangan brute-force port 5432) dan berisiko menghabiskan *connection pool* database saat lonjakan traffic (*connection exhaustion*).
* **Keputusan**: PostgreSQL dikunci total di dalam jaringan Docker internal VPS (`inveeta-net`) tanpa port publik. **`apps/api` adalah satu-satunya klien database**. `apps/invitation` mengambil data melalui Hono RPC publik dengan caching agresif Next.js 15 On-Demand ISR (`force-cache` + tags).
* **Konsekuensi**:
  - ✅ Database PostgreSQL aman 100% dari internet publik.
  - ✅ Hop jaringan Vercel $\rightarrow$ VPS dinetralkan oleh ISR caching di Vercel Edge CDN (cache hit $\ge 95\%$, API hanya dipanggil saat revalidasi atau cache miss pertama).

#### ADR-004: Server-Sent Events (SSE) untuk MVP Dibanding WebSocket
* **Status**: **DITERIMA**
* **Konteks**: Kebutuhan komunikasi realtime pada MVP bersifat satu arah dari server ke klien: penyiaran ucapan baru (`wish.created`) dan pembaruan kartu metrik kehadiran di dashboard Host (`rsvp.updated`).
* **Keputusan**: Menggunakan **Server-Sent Events (SSE)** berbasis HTTP standar di atas abstraksi internal `AppEventBus`.
* **Konsekuensi**:
  - ✅ Beroperasi di atas koneksi HTTP/1.1 dan HTTP/2 standar tanpa overhead handshake bidirectional WebSocket (RFC 6455).
  - ✅ Dukungan bawaan browser untuk auto-reconnect dan transmisi header `Last-Event-ID`.
  - ✅ Arsitektur `AppEventBus` memungkinkan penambahan transport adapter WebSocket pada Phase 2 (`apps/live-display`) tanpa refactoring kode service domain.

#### ADR-005: Cloudflare R2 dengan Verifikasi 2-Fase Presigned PUT
* **Status**: **DITERIMA**
* **Konteks**: Server VPS Linux ekonomis (\$5–\$10/bulan) akan mengalami kehabisan memori (*Out-Of-Memory Crash*) jika harus menampung upload file foto berukuran besar (8–15 MB) dari ratusan pengguna bersamaan.
* **Keputusan**: Klien mengunggah file biner langsung ke **Cloudflare R2** via Presigned PUT URL. Backend API hanya menerbitkan presigned URL bertarget dan memverifikasi keberadaan file fisik via S3 `HeadObjectCommand` pada fase konfirmasi.
* **Konsekuensi**:
  - ✅ Beban bandwidth dan memori VPS adalah **$0\text{ MB}$** untuk seluruh proses transfer media.
  - ✅ Bebas biaya transfer data keluar (**\$0 Egress**) berkat infrastruktur Cloudflare R2.
  - ⚠️ Memerlukan background job harian untuk membersihkan file yatim (*orphan*) yang diunggah ke R2 tetapi tidak pernah dikonfirmasi oleh pengguna.

#### ADR-006: Struktur Tag ISR Caching Per Acara (Bukan Per Tamu)
* **Status**: **DITERIMA** *(Menjawab Open Question PRD §5.4)*
* **Konteks**: PRD mempertanyakan apakah tag revalidasi dibuat spesifik per tamu (`event-${slug}-${token}`) atau per acara (`event-${slug}`).
* **Keputusan**: Tag revalidasi ditetapkan **Per Acara (`event-${slug}`)**. Personalisasi tamu dimuat secara dinamis di sisi browser melalui Client Component Island (`GET /public/events/:slug/guests/:token`).
* **Konsekuensi**:
  - ✅ Mencegah pembuatan 2.000 halaman statis terduplikasi per acara di Edge CDN Vercel (*zero cache bloat*).
  - ✅ Invalidasi cache on-demand menjadi sangat sederhana: satu panggilan tag membersihkan seluruh cache halaman acara.

#### ADR-007: Better Auth dengan Session Cookie Subdomain (`.inveeta.com`)
* **Status**: **DITERIMA**
* **Konteks**: Pemisahan antarmuka dashboard Host (`app.inveeta.com`) dan backend API (`api.inveeta.com`) membutuhkan sesi autentikasi yang aman tanpa kerentanan pencurian token (XSS) pada `localStorage`.
* **Keputusan**: Menggunakan **Better Auth** dengan konfigurasi cookie `HttpOnly`, `SameSite=Lax`, `Secure=true`, dan domain `.inveeta.com`.
* **Konsekuensi**:
  - ✅ Browser secara otomatis menyertakan session cookie pada setiap permintaan lintas subdomain dari `app.inveeta.com` ke `api.inveeta.com`.
  - ✅ Kebal mutlak terhadap serangan ekstraksi token melalui skrip XSS.
  - ⚠️ Menuntut konfigurasi CORS ketat dengan `credentials: true`.

#### ADR-008: Schema-Driven Template Engine Dibanding Visual Builder Bebas
* **Status**: **DITERIMA**
* **Konteks**: Fitur visual drag-and-drop template builder menuntut biaya pengembangan ribuan jam kerja dan menghasilkan kode HTML/CSS yang rentan rusak di berbagai ukuran layar ponsel tamu.
* **Keputusan**: Seluruh template didefinisikan sebagai skema kode statis di `packages/shared`, di mana kustomisasi Host dibatasi pada parameter yang aman: palet warna, tipografi, susunan urutan seksi, dan penyembunyian seksi opsional.
* **Konsekuensi**:
  - ✅ Sangat ramah solo developer: template baru dapat ditambahkan hanya dalam 1–2 jam menggunakan developer checklist.
  - ✅ Menjamin tampilan visual selalu responsif dan presisi di layar ponsel pintar tamu.

---

### 20.2 Matriks Risiko Teknis & Rencana Mitigasi

Berikut adalah matriks risiko komprehensif yang mengintegrasikan tolok ukur PRD §5.2 dan temuan audit arsitektur TDD:

| Risiko Teknis | Tingkat Risiko | Dampak Potensial | Strategi Mitigasi Terverifikasi di TDD |
|---|:---:|---|---|
| **1. Lonjakan Traffic Cache Miss Tembus ke VPS** | Sedang | VPS overload saat ribuan tamu serentak membuka link undangan baru. | Abstraksi fetcher dibungkus `React.cache()` untuk mencegah double-fetch; header `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` menjamin CDN Vercel menyerap $\ge 95\%$ request. |
| **2. Putusnya Koneksi Streaming SSE pada Jaringan Seluler** | Sedang | Tamu atau Host tidak menerima ucapan/metrik baru secara realtime. | Heartbeat `: ping\n\n` tiap 15 detik mencegah silent TCP drop; mekanisme reconnect via `Last-Event-ID` menjemput pesan yang tertinggal dari database PostgreSQL. |
| **3. Race Condition & Pelipatgandaan Kuota Pax RSVP** | Sedang | Dua tab browser tamu submit bersamaan melampaui kapasitas katering acara. | Transaksi database atomik dengan baris terkunci: `SELECT ... FROM guests WHERE id = $1 FOR UPDATE`; validasi `actualPax <= maxPax` dieksekusi di dalam transaksi. |
| **4. Kebocoran Nomor WhatsApp (Pelanggaran UU PDP)** | Tinggi | Nomor telepon tamu dicuri pihak ketiga melalui scraping endpoint publik. | *Zero-Exposure PII Policy*: Endpoint publik `/public/events/:slug` dan `/public/events/:slug/guests/:token` tidak pernah mengembalikan kolom nomor WhatsApp ke browser. |
| **5. Timeout Bot Crawler WhatsApp pada Preview Undangan** | Sedang | Link undangan yang dibagikan di grup chat tidak memunculkan gambar preview. | Menolak `@vercel/og` dinamis yang lambat; menggunakan gambar statis terkompresi Cloudflare R2 ($1200 \times 630$, $\le 300\text{ KB}$) yang di-serve $< 80\text{ ms}$. |
| **6. Penumpukan File Yatim (*Ghost Media Bloat*) di R2** | Rendah | Biaya penyimpanan membengkak akibat upload yang tidak pernah dikonfirmasi. | Verifikasi 2-Fase (HeadObject); background cron job harian menghapus objek bertag `pending_confirmation` berusia $> 24\text{ jam}$. |
| **7. Kegagalan Tunggal (*Single Point of Failure*) VPS Linux** | Sedang | Downtime layanan API dan database jika VPS crash. | Backup otomatis harian `pg_dump -Fc` terenkripsi ke Cloudflare R2; konfigurasi `restart: always` pada Docker Compose; SOP restore bulanan teruji. |
| **8. Pergeseran Jam (*Time Drift*) pada Batas RSVP** | Sedang | Tamu terkunci prematur atau terlambat akibat beda zona waktu WIB/WITA/WIT. | Skema Zod mewajibkan ISO 8601 dengan offset eksplisit; kolom DB bertipe `TIMESTAMPTZ`; perbandingan waktu dievaluasi absolut pada milidetik UTC. |

---

### 20.3 Status Open Questions (Daftar Pertanyaan Terbuka & Resolusi)

Seluruh pertanyaan terbuka (*open questions*) yang dicantumkan pada PRD §5.4 telah dianalisis dan **diselesaikan secara tuntas 100%** di dalam dokumen TDD ini:

| # | Pertanyaan Terbuka dari PRD §5.4 | Status Resolusi | Lokasi Solusi di TDD | Ringkasan Keputusan Solusi |
|---|---|:---:|---|---|
| **1** | **Desain Endpoint Publik SSR Undangan**<br/>(Payload per slug vs per token, field yang ditampilkan). | **RESOLVED** | [Bagian 5.2.C](file:///c:/Users/Ridzuan/Documents/Naridza%20Studio/dev/inveetabynrdz/docs/TDD.md#52c-analisis-perbandingan-payload-endpoint-publik-per-slug-vs-per-token-resolusi-open-question-prd-54) | Pemisahan tegas: `/events/:slug` hanya mengembalikan data shell acara umum (zero data tamu); `/events/:slug/guests/:token` mengembalikan konteks tamu personal (nama, kuota, alokasi sesi, status override). Nomor telepon disembunyikan mutlak. |
| **2** | **Struktur Tag Revalidasi Caching**<br/>(Per acara vs per tamu; autentikasi endpoint revalidate). | **RESOLVED** | [Bagian 7.1.A](file:///c:/Users/Ridzuan/Documents/Naridza%20Studio/dev/inveetabynrdz/docs/TDD.md#71a-struktur-tag-revalidasi-per-acara-vs-per-tamu-resolusi-open-question-prd-54) & [7.2.A](file:///c:/Users/Ridzuan/Documents/Naridza%20Studio/dev/inveetabynrdz/docs/TDD.md#72a-proteksi-webhook-revalidasi-appsinvitationsrcappapirevalidateroutets) | Tag ditetapkan **Per Acara (`event-${slug}`)** untuk mencegah cache churn 2.000 halaman per acara di Vercel CDN. Personalisasi tamu di-hydrate secara dinamis di browser. Endpoint revalidate dilindungi shared secret `x-revalidate-secret`. |
| **3** | **Generator Gambar Open Graph WhatsApp**<br/>(Statis cover vs dinamis `ImageResponse`). | **RESOLVED** | [Bagian 7.3](file:///c:/Users/Ridzuan/Documents/Naridza%20Studio/dev/inveetabynrdz/docs/TDD.md#73-pembuatan-open-graph-og-image-whatsapp-le-300-kb) | Menggunakan gambar cover statis terkompresi di Cloudflare R2 ($\le 300\text{ KB}$, $1200 \times 630\text{ px}$) untuk mencegah cold-start timeout bot WhatsApp yang sering terjadi pada `@vercel/og`. |
| **4** | **Metode Akses Database SSR `apps/invitation`**<br/>(Direct DB vs Selalu via API). | **RESOLVED** | [Bagian 3.3.B](file:///c:/Users/Ridzuan/Documents/Naridza%20Studio/dev/inveetabynrdz/docs/TDD.md#33b-integrasi-data-ssr-selalu-via-api-hono-rpc) & [ADR-003](file:///c:/Users/Ridzuan/Documents/Naridza%20Studio/dev/inveetabynrdz/docs/TDD.md#adr-003-akses-database-eksklusif-satu-pintu-via-api-api-only-db-access) | Ditetapkan **Selalu via API** (Hono RPC). Database PostgreSQL dikunci di private network VPS; zero public port. Kinerja hop jaringan diamankan oleh On-Demand ISR Edge Caching Vercel. |
| **5** | **Penanganan Inkonsistensi Zona Waktu Acara**<br/>(Pencegahan drift jam WIB, WITA, WIT). | **RESOLVED** | [Bagian 4.3.D](file:///c:/Users/Ridzuan/Documents/Naridza%20Studio/dev/inveetabynrdz/docs/TDD.md#43d-standarisasi-datetime-iso-8601--offset-zona-waktu) & [Bagian 12.3.B](file:///c:/Users/Ridzuan/Documents/Naridza%20Studio/dev/inveetabynrdz/docs/TDD.md#123b-pemformat-tanggal--zona-waktu-indonesia-packagessharedsrcutilsdateformatts) | Validasi Zod mewajibkan string ISO 8601 dengan offset eksplisit (`z.string().datetime({ offset: true })`). Disimpan pada kolom PostgreSQL bertipe `TIMESTAMPTZ`. Formatter bersama menangani konversi IANA timezone `Asia/Jakarta`, `Asia/Makassar`, dan `Asia/Jayapura`. |

> [!NOTE]
> **Kesimpulan Kesiapan Arsitektur**: Dengan diselesaikannya seluruh Bagian 0 hingga 20 pada [docs/TDD.md](file:///c:/Users/Ridzuan/Documents/Naridza%20Studio/dev/inveetabynrdz/docs/TDD.md) serta dokumen [docs/IMPLEMENTATION_PLAN.md](file:///c:/Users/Ridzuan/Documents/Naridza%20Studio/dev/inveetabynrdz/docs/IMPLEMENTATION_PLAN.md), tidak ada lagi celah teknis, ketidakpastian desain, maupun utang arsitektural (*Zero Architectural Debt*). Seluruh spesifikasi siap diimplementasikan secara langsung ke dalam kode program monorepo pada Milestone M0.
