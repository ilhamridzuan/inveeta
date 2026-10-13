# AGENTS.md — Inveeta Coding Standards & Agent Guardrails

Dokumen ini adalah pedoman mutlak (*constitution*) bagi seluruh AI Agent yang beroperasi di codebase **Inveeta (`inveetabynrdz`)**. Aturan ini dirancang untuk menjaga integritas arsitektur, keamanan data, efisiensi performa, dan konsistensi tipe end-to-end selama siklus implementasi *vibe coding*.

---

## 1. Prinsip Utama Vibe Coding di Inveeta (North Star)

1. **Kepatuhan Single Source of Truth**:
   - Spesifikasi produk merujuk ke `docs/PRD.md`.
   - Arsitektur, skema basis data, dan kontrak API merujuk ke `docs/TDD.md`.
   - Tahapan eksekusi dan dependensi merujuk ke `docs/IMPLEMENTATION_PLAN.md`.
   - **DILARANG** mengarang asumsi arsitektur baru, mengubah skema tabel, atau memodifikasi kontrak DTO tanpa menyelaraskannya dengan PRD dan TDD.
2. **Filosofi Solo Developer**:
   - Pragmatis, minim *boilerplate*, *zero over-engineering*, dan hindari instalasi dependensi pihak ketiga baru yang tidak tercatat di TDD.
3. **Type-Safety End-to-End**:
   - Seluruh aliran data dari PostgreSQL $\rightarrow$ Hono API $\rightarrow$ Hono RPC Client $\rightarrow$ React UI **wajib** bertipe statis (*zero `any`*, *zero untyped responses*).

---

## 2. Batasan Arsitektur Monorepo (Turborepo & pnpm)

```
inveetabynrdz/
├── apps/
│   ├── api/            # Hono Backend (Node.js di VPS Docker)
│   ├── invitation/     # Next.js 15 App Router (Vercel CDN)
│   └── dashboard/      # Vite React PWA (Vercel SPA)
└── packages/
    ├── db/             # Drizzle ORM Schema, Migrations, Postgres Client
    └── shared/         # Zod Schemas, DTO Types, Constants, Utilities
```

1. **Isolasi Database (Database Access Boundary)**:
   - **HANYA** `apps/api` yang diizinkan mengimpor `packages/db` dan melakukan query ke PostgreSQL.
   - `apps/invitation` dan `apps/dashboard` **DILARANG KERAS** mengimpor `packages/db`, mendefinisikan SQL, atau membuka koneksi basis data langsung. Seluruh akses data melalui `apps/api` via Hono RPC.
2. **Independensi `packages/shared`**:
   - Paket `packages/shared` bersifat murni (*pure TypeScript*). **DILARANG** menambahkan dependensi ke database driver, DOM browser, atau Node.js internal modules di dalamnya.
3. **Disiplin Skrip & Build**:
   - Setiap kode baru wajib lulus verifikasi typecheck monorepo:
     ```bash
     pnpm turbo typecheck
     ```

---

## 3. Lima Jebakan Teknis Kritis (The 5 Golden Traps)

Pastikan kode yang ditulis memenuhi 5 protokol mitigasi berikut:

### ⚠️ Jebakan 1: Transaksi Batch RSVP Wajib Di-looping di Service Layer
- **Aturan**: Kontrak `SubmitRsvpInput` menerima array sesi:
  ```typescript
  sessions: Array<{ eventSessionId: string; status: 'attending' | 'declined'; actualPax: number }>
  ```
- **Implementasi**: Di dalam `await db.transaction(async (tx) => { ... })`:
  1. Ambil data event dan verifikasi batas waktu (`NOW() <= event.rsvpDeadline`).
  2. Kunci baris tamu: `SELECT ... FROM guests WHERE id = $guestId FOR UPDATE`.
  3. Lakukan looping: `for (const sessionItem of input.sessions)`.
  4. Untuk tiap iterasi:
     - Verifikasi alokasi di `guestSessionAllocations`.
     - Tolak jika `rsvps.isManualOverride === true`.
     - Verifikasi kuota: `sessionItem.actualPax <= guest.maxPax`.
     - Upsert ke `rsvps` dengan `onConflictDoUpdate({ target: [guestId, eventSessionId] })`.
  5. Jika ada 1 sesi yang gagal, seluruh transaksi **wajib ROLLBACK total**.

### ⚠️ Jebakan 2: Disiplin Islands & Anti-Cache Bloat pada `app/[slug]/[token]/page.tsx`
- **Aturan**: Segmen `[token]` **TIDAK BOLEH** di-cache per varian HTML statis di Vercel Edge CDN (2.000 file HTML per acara akan menguras kuota cache disk).
- **Implementasi**:
  1. `app/[slug]/[token]/page.tsx` **WAJIB** menyertakan:
     ```typescript
     export const dynamic = 'force-dynamic';
     ```
  2. Komponen Server `page.tsx` hanya bertindak sebagai shell statis yang mengambil data umum acara dari Next.js Data Cache via tag `events-${slug}`.
  3. Detail personal tamu (nama, amplop sapaan, alokasi sesi, form RSVP) **DILARANG** di-query saat kompilasi SSR HTML Vercel. Seluruh data personal **wajib di-hydrate di browser** oleh Client Component Island (`GuestGreetingIsland`, `RsvpInteractiveForm`) melalui endpoint:
     ```
     GET /api/v1/public/events/:slug/guests/:token
     ```

### ⚠️ Jebakan 3: Presigned PUT Content-Type Lock pada Cloudflare R2
- **Aturan**: AWS S3 SDK mengunci header `ContentType` ke dalam tanda tangan kriptografis URL saat membuat Presigned URL.
- **Implementasi**:
  1. Backend `POST /api/v1/manage/media/presign` menerima `mimeType` (misal: `image/webp`).
  2. Frontend `apps/dashboard` saat mengeksekusi `fetch(uploadUrl, { method: 'PUT', ... })` **WAJIB** menyertakan header `Content-Type` yang **identik mutlak** dengan `mimeType` yang didaftarkan:
     ```typescript
     await fetch(uploadUrl, {
       method: 'PUT',
       headers: { 'Content-Type': presignResult.mimeType },
       body: compressedFileBlob,
     });
     ```
  3. Dilarang mengubah ekstensi atau membiarkan browser mengisi `Content-Type` default secara otomatis agar tidak memicu `403 SignatureDoesNotMatch`.

### ⚠️ Jebakan 4: Anti-Thundering Herd & Reconnection Jitter pada SSE
- **Aturan**: Saat API restart di VPS, ratusan koneksi klien SSE terputus serentak dan berisiko menyerbu server pada milidetik yang sama (*thundering herd*).
- **Implementasi**:
  1. **Server Bounding (`apps/api`)**: Query pemulihan data tertinggal via header `Last-Event-ID` **wajib dibatasi keras**:
     ```typescript
     .limit(20)
     ```
  2. **Client-Side Jitter (`apps/invitation` & `apps/dashboard`)**: Hook `useSSE` **wajib** menyuntikkan *randomized jitter delay* antara **1 hingga 5 detik**:
     ```typescript
     const jitter = Math.floor(Math.random() * 4000) + 1000;
     const totalDelay = baseBackoffDelay + jitter;
     setTimeout(reconnect, totalDelay);
     ```

### ⚠️ Jebakan 5: Ekspor Excel Wajib Streaming Writer (Anti Memory Heap Spike)
- **Aturan**: VPS produksi memiliki RAM 1–2 GB. Menggunakan `workbook.xlsx.writeBuffer()` di memori untuk ratusan data tamu berisiko memicu lonjakan memori (30–50 MB RAM) dan *Out-Of-Memory (OOM)*.
- **Implementasi**:
  1. Pada `GET /api/v1/manage/events/:id/export/xlsx`, gunakan mode streaming:
     ```typescript
     import ExcelJS from 'exceljs';
     import { PassThrough } from 'stream';

     const passThrough = new PassThrough();
     const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: passThrough });
     const worksheet = workbook.addWorksheet('Rekap Tamu');
     // Tulis header & baris data tamu per commit
     worksheet.addRow(...).commit();
     await worksheet.commit();
     await workbook.commit();
     ```
  2. Ekspor CSV (`GET .../export/csv`) menggunakan `c.streamText()` dengan penyisipan karakter **UTF-8 BOM (`\uFEFF`)** di awal byte stream.

---

## 4. Standar Backend & API (`apps/api`)

1. **Prefix Routing Resmi**:
   - Seluruh endpoint API **wajib** di-mount dengan prefix:
     - `/api/v1/public/*` $\rightarrow$ Endpoint tamu & publik.
     - `/api/v1/manage/*` $\rightarrow$ Endpoint manajemen host (terautentikasi).
     - `/api/v1/realtime/*` $\rightarrow$ Endpoint SSE streaming.
     - `/api/auth/*` $\rightarrow$ Better Auth handler.
2. **Pola Method Chaining Hono RPC**:
   - Seluruh sub-router Hono **wajib** dirangkai menggunakan chaining agar tipe terekspor utuh:
     ```typescript
     export const eventsRoute = new Hono()
       .get('/:slug', handlerGet)
       .post('/', handlerCreate);
     
     // Di entrypoint utama:
     export const app = new Hono()
       .route('/api/v1/public/events', eventsRoute);
     
     export type AppType = typeof app;
     ```
3. **Format Envelope Respons Standar**:
   - Berhasil:
     ```json
     { "success": true, "data": { ... } }
     ```
   - Gagal:
     ```json
     {
       "success": false,
       "error": {
         "code": "VALIDATION_ERROR",
         "message": "Deskripsi ramah pengguna",
         "details": []
       }
     }
     ```
4. **Better Auth Configuration**:
   - `trustedOrigins` **wajib** mencakup domain resmi: `https://inveeta.com`, `https://app.inveeta.com`, dan dev origins.
   - Primary key pada semua tabel auth (`users`, `sessions`, `accounts`, `verifications`) **wajib** memiliki default generator `.$defaultFn(() => generateId())`.
5. **Standarisasi Zona Waktu (Standard IANA Identifiers)**:
   - Nilai kolom `timeZone` **wajib** menggunakan identifier IANA:
     ```typescript
     'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura'
     ```
   - **DILARANG** menggunakan singkatan non-standar `'WIB'`, `'WITA'`, `'WIT'` pada level basis data atau Zod schema. Pemetaan ke label `'WIB'` hanya dilakukan di lapisan visual formatter `formatEventDateTime()`.
6. **Rate Limiting Ketat pada Endpoint Ucapan**:
   - `POST /api/v1/public/wishes`: Maksimal 1 ucapan per 30 detik per IP dan 5 ucapan per 10 menit per IP. Pesan disaring anti-XSS (`allowedTags: []`).

---

## 5. Standar Frontend Undangan (`apps/invitation` - Next.js 15)

1. **Next.js 15 Fetching & Tag Caching**:
   - Karena default `fetch` di Next.js 15 adalah `no-store`, pemanggilan API publik untuk data acara **wajib** menyertakan opsi cache dan tag:
     ```typescript
     const res = await honoClient.api.v1.public.events[':slug'].$get(
       { param: { slug } },
       {
         init: {
           cache: 'force-cache',
           next: { tags: [`events-${slug}`] },
         },
       }
     );
     ```
   - Fungsi fetcher dibungkus dengan `React.cache()` untuk mencegah request ganda antara `generateMetadata()` dan render halaman.
2. **Metadata Open Graph WhatsApp**:
   - **DILARANG** membuat rute `opengraph-image.tsx`.
   - Gunakan fungsi `generateMetadata()` yang merujuk langsung ke URL cover foto terkompresi R2 (`event.ogImageUrl` / WebP < 300 KB).
3. **Autoplay Audio Policy Workaround**:
   - Pemutaran musik latar **tidak boleh** langsung dipanggil saat mount komponen.
   - Musik latar dipicu saat tamu menekan tombol "Buka Undangan" pada cover pembuka.
4. **Islands Architecture**:
   - Komponen berat (foto cover, biodata pengantin, galeri) adalah Server Components (0 KB Client JS).
   - Komponen interaktif (BGM controller, form RSVP, live wishes SSE) adalah Client Components (`'use client'`).

---

## 6. Standar Frontend Dashboard (`apps/dashboard` - Vite React SPA)

1. **Autentikasi & Cookie Subdomain**:
   - Menggunakan Better Auth Client SDK (`createAuthClient`).
   - Session cookie di-share di level root domain `.inveeta.com`.
2. **Kompresi Gambar Pra-Upload (Client-Side Pre-Compression)**:
   - Sebelum meminta presigned URL, kompres file gambar kamera (8–15 MB) di browser menggunakan Canvas API:
     - Maksimal lebar 1920 piksel.
     - Format target: `image/webp`, kualitas 85%.
     - Ukuran target: $\le 600\text{ KB}$.
3. **Penyimpanan State Realtime**:
   - Gunakan TanStack Query (React Query) untuk sinkronisasi state REST API.
   - Sambungkan event SSE (`rsvp.updated`, `metrics.updated`) ke React Query Cache untuk melakukan *cache invalidation* atau *optimistic update* instan.

---

## 7. Protokol Kualitas Kode & Larangan Keras (Strict Anti-Patterns)

1. ❌ **Dilarang Menggunakan `any`**: Selalu gunakan generic type atau inferensi skema Zod `z.infer<typeof schema>`.
2. ❌ **Dilarang Non-Null Assertion Buta (`!`)**: Lakukan pengecekan `if (!data) throw new NotFoundError(...)` daripada membubuhkan tanda seru tanpa verifikasi.
3. ❌ **Dilarang Hardcoded String Rahasia**: Seluruh secret, JWT key, S3 access key, dan API key wajib dibaca dari `process.env` yang tervalidasi skema Zod di `env.ts`.
4. ❌ **Dilarang Membocorkan Data Tamu**: Endpoint publik `GET /api/v1/public/events/:slug` **tidak boleh** mengembalikan nomor telepon tamu, daftar tamu lain, atau catatan privat Host (Kepatuhan UU PDP).
5. ❌ **Dilarang Mengubah Nama File Tanpa Izin**: Ikuti konvensi penamaan kebab-case untuk file modul (`event.schema.ts`, `auth.middleware.ts`, `image-loader.ts`).
