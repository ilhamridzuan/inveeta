# Panduan Pengujian Manual API Inveeta via Postman

Dokumen ini memandu Anda untuk menguji seluruh endpoint backend **Inveeta API** secara manual menggunakan Postman atau Bruno.

---

## 🚀 Langkah 1: Jalankan Server API Lokal

Pastikan container PostgreSQL aktif dan jalankan server API:

```bash
# Dari root direktori /inveeta
pnpm --filter @inveeta/api dev
```
Server akan aktif di: `http://localhost:3000`.

---

## 📥 Langkah 2: Impor Koleksi ke Postman

1. Buka aplikasi **Postman** (atau **Bruno** / **Insomnia**).
2. Klik tombol **Import** di kiri atas.
3. Pilih file:  
   [`docs/postman/inveeta.postman_collection.json`](file:///c:/Users/Ridzuan/Documents/Naridza%20Studio/dev/inveetabynrdz/inveeta/docs/postman/inveeta.postman_collection.json)
4. Koleksi bernama **"Inveeta API (Development & Testing)"** akan muncul di daftar koleksi Anda.

---

## 🔄 Langkah 3: Urutan Eksekusi Skenario Pengujian

Koleksi telah dilengkapi dengan *auto-variable capture* (variabel seperti `eventId`, `presignedUploadUrl`, dan session cookie tersimpan otomatis antar request):

### 1. Folder `00. Health & Probe`
- Jalankan **Health Check (Database & Server)** $\rightarrow$ Memastikan database PostgreSQL terhubung (`{"status": "healthy", "database": "connected"}`).

### 2. Folder `01. Authentication (Better Auth)`
- Jalankan **1. Sign Up (Register Host Baru)** $\rightarrow$ Mendaftarkan user baru `host@inveeta.com`.
- Jalankan **2. Sign In (Login)** $\rightarrow$ Postman akan otomatis menyimpan session cookie di header.
- Jalankan **3. Get Active Session** $\rightarrow$ Memverifikasi bahwa data host terotentikasi.

### 3. Folder `02. Public Endpoints`
- Jalankan **1. Check Slug - Available** $\rightarrow$ Menghasilkan `{ isAvailable: true }`.
- Jalankan **2. Check Slug - Reserved Keyword** $\rightarrow$ Menghasilkan `{ isAvailable: false, reason: "RESERVED_KEYWORD" }`.
- Jalankan **3. Check Slug - Format Invalid** $\rightarrow$ Menghasilkan `{ isAvailable: false, reason: "INVALID_FORMAT" }`.

### 4. Folder `03. Host Events Lifecycle & Wizard`
- Jalankan **1. Inisiasi Draft Acara** $\rightarrow$ Otomatis menyimpan `eventId` ke variabel koleksi.
- Jalankan **2. Get List My Events** $\rightarrow$ Menampilkan daftar acara milik host.
- Jalankan **3. Get Event Detail by ID** $\rightarrow$ Menampilkan struktur draft acara.
- Jalankan bertahap:
  - **4. Wizard Step 1: Info Dasar & Tanggal**
  - **5. Wizard Step 2: Sesi Acara & Peta Lokasi**
  - **6. Wizard Step 3: Mempelai & Kisah Cinta**
  - **7. Wizard Step 4: Rekening Amplop & Foto**
  - **8. Wizard Step 5: Template & Warna Tema**
- Jalankan **9. Publikasikan Acara** $\rightarrow$ Mengubah status acara menjadi live (`isPublished: true`).
- Jalankan **10. Uji Coba Mutasi Slug Pasca Publish** $\rightarrow$ **Membuktikan Trigger PostgreSQL bekerja**: Request akan ditolak dengan HTTP 400 Bad Request (`SLUG_IMMUTABLE`).

### 5. Folder `04. Cloudflare R2 Media Upload`
- Jalankan **1. Request Presigned PUT URL** $\rightarrow$ Mendapatkan URL upload bertanda tangan kriptografis dari Cloudflare R2.
- Jalankan **2. Direct Upload PUT ke Cloudflare R2** $\rightarrow$ Mengunggah file langsung ke bucket R2 (bukan ke VPS).
- Jalankan **3. Confirm Upload & Simpan ke DB** $\rightarrow$ Backend memverifikasi fisik file di R2 via `HeadObjectCommand` lalu mencatatnya ke PostgreSQL.
- Jalankan **4. Delete Media dari R2 & DB** $\rightarrow$ Menghapus objek fisik di R2 dan menghapus baris tabel di basis data.

---

> [!TIP]
> **Variabel Koleksi**: Jika ingin mengganti host URL, email, atau password uji coba, Anda dapat mengubahnya di tab **Variables** pada root koleksi di Postman.
