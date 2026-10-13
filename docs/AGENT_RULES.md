# Inveeta Coding Standards & Agent Guardrails (Vibe Coding)

> **Catatan**: Dokumen ini merupakan salinan resmi dari [AGENTS.md](file:///c:/Users/Ridzuan/Documents/Naridza%20Studio/dev/inveetabynrdz/AGENTS.md) yang berada di *root workspace*. AI Agent di Antigravity otomatis memuat aturan ini pada setiap interaksi.

Lihat isi lengkap aturan pada:
👉 [AGENTS.md](file:///c:/Users/Ridzuan/Documents/Naridza%20Studio/dev/inveetabynrdz/AGENTS.md)

### Ringkasan Poin Kritis:
1. **Prinsip Utama**: Single source of truth merujuk ke PRD, TDD, dan Implementation Plan.
2. **Boundary Database**: Hanya `apps/api` yang boleh import `packages/db`. Frontend dilarang sentuh database langsung.
3. **5 Jebakan Teknis**:
   - Transaksi batch RSVP wajib looping di service layer (`tx` rollback total jika ada 1 sesi gagal).
   - Rute personal `app/[slug]/[token]/page.tsx` wajib `force-dynamic` dan data tamu di-hydrate via Client Island (zero CDN cache bloat).
   - Header `Content-Type` pada S3 presigned PUT R2 wajib identik persis dengan MIME saat presign (anti 403 Signature error).
   - Reconnect SSE wajib menggunakan random jitter (1–5 detik) dan query catch-up dibatasi `.limit(20)` (anti thundering herd).
   - Ekspor Excel wajib streaming via `ExcelJS.stream.xlsx.WorkbookWriter` (anti heap spike pada RAM 1–2 GB).
4. **Backend**: Routing prefix `/api/v1/public/*`, `/api/v1/manage/*`, `/api/v1/realtime/*`, Hono method chaining, Better Auth `trustedOrigins` + `generateId()`, IANA Timezone (`Asia/Jakarta`).
5. **Frontend**: Next.js 15 tagged caching `events-${slug}`, `React.cache()` deduplication, WebP pre-upload compression di browser.
