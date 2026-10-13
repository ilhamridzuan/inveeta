Spesifikasi Kebutuhan Inveeta MVP

1\. Inisiasi Acara (Self-Service)

Autentikasi Pengguna: Pendaftaran dan login via Email dan Password serta Sign in with Google (OAuth).



Alur Pengisian Data: Menggunakan Multi-Step Wizard yang mencakup Info Dasar, Waktu dan Sesi, Lokasi, Aset Media dan Rekening, serta Kustomisasi Visual.



Identifikasi URL (Slug): Digenerate otomatis dari nama acara dengan opsi kustomisasi dan pengecekan ketersediaan langsung. Slug dikunci permanen (immutable) setelah disimpan.



Siklus Hidup Acara: Single-State atau langsung live dan aktif begitu selesai inisiasi.



Kustomisasi Template: Berbasis skema template (schema-driven). Kuota jumlah foto bergantung pada template dengan batas 2 MB per foto. Musik latar diunggah mandiri dalam format audio. Kustomisasi warna dasar dan urutan section fleksibel. Penggantian template di kemudian hari hanya diizinkan untuk paket atau tier yang sama.



2\. Undangan Digital (Guest-Facing)

Interaksi Pembuka dan Audio: Memiliki cover pembuka dengan tombol Buka Undangan untuk trigger pemutaran musik. Floating player mempertahankan status saat jeda (pause).



Multi-Sesi Terfilter: Setiap tamu hanya melihat sesi acara yang dialokasikan untuk mereka berdasarkan token.



Batas Waktu RSVP: Dilengkapi batas waktu tanggal dan jam penutupan yang diatur pemilik. Form RSVP otomatis terkunci setelah melewati waktu tersebut.



Tautan Publik dan Personal: Tautan publik tanpa parameter menonaktifkan form RSVP. Tautan personal menggunakan token acak unik untuk memuat nama tamu dan mengaktifkan form RSVP.



Aturan RSVP: Tamu hanya dapat memilih jumlah kehadiran maksimal sesuai kuota yang dialokasikan. Tamu dapat mengubah konfirmasi berkali-kali sebelum batas waktu penutupan.



Buku Ucapan: Ucapan otomatis tayang langsung di web dengan fitur moderasi sembunyikan atau hapus dari dashboard.



Amplop Digital dan Kado: Mendukung multi rekening bank atau e-wallet dengan tombol salin, satu gambar QRIS statis, dan alamat kado fisik dengan tombol salin. Bersifat informatif tanpa unggah bukti transfer.



Navigasi dan Kalender: Tautan langsung ke Google Maps, Waze, dan Google Calendar URL.



3\. Dashboard PWA Pemilik

Arsitektur PWA: Dapat diinstal ke layar utama ponsel. Memiliki fallback halaman statis saat offline bertuliskan Tidak Ada Koneksi Internet.



Metrik Utama: Menampilkan kartu metrik Total Tamu Diundang, Statistik Status RSVP (Hadir, Tidak Hadir, Pending), dan Total Ucapan Masuk.



Manajemen Tamu: Entri data tamu secara satuan mencakup Nama, Nomor WhatsApp, Kategori (VIP, Keluarga, Reguler), Kuota Maksimal Pax, dan centang alokasi sesi. Menghasilkan token acak unik per tamu.



Filter dan Manual Override: Fitur pencarian nama, filter kategori, dan filter status RSVP. Pemilik dapat mengubah status RSVP dan jumlah kehadiran secara manual.



Distribusi Undangan: Template pesan WhatsApp dapat disunting mandiri dengan variabel dinamis. Tersedia tombol Kirim ke WhatsApp dan Salin Pesan per tamu.



Ekspor Data: Fitur unduh rekap data tamu dan ringkasan metrik dalam format Excel atau CSV.

