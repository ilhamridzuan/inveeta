## Ringkasan Perubahan (Summary)
<!-- Jelaskan secara singkat tujuan PR ini dan perubahan apa saja yang dibuat -->

## Tipe Perubahan (Type of Change)
- [ ] `feat`: Penambahan fitur atau kapabilitas baru
- [ ] `fix`: Perbaikan bug atau penanganan error
- [ ] `chore`: Pembaruan tooling, konfigurasi, atau dependensi
- [ ] `docs`: Pembaruan atau penambahan dokumentasi
- [ ] `refactor`: Restrukturisasi kode tanpa mengubah perilaku eksternal

## Paket / Aplikasi Terdampak (Affected Scope)
- [ ] `apps/api`
- [ ] `apps/invitation`
- [ ] `apps/dashboard`
- [ ] `packages/shared`
- [ ] `packages/db`
- [ ] Root / Tooling

## Checklist Kualitas Kode (Definition of Done)
- [ ] `pnpm turbo typecheck` sukses tanpa error tipe (zero `any`).
- [ ] `pnpm turbo build` sukses dengan Turborepo caching.
- [ ] Kepatuhan **AGENTS.md**:
  - [ ] Isolasi DB terjaga (Hanya `apps/api` yang mengimpor `packages/db`).
  - [ ] Tidak ada hardcoded credentials atau bocoran data sensitif (PII).
  - [ ] Penamaan file mematuhi kebab-case standar.
