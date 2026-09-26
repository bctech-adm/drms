# Runbook — Pencabutan perangkat (HP hilang, HP diganti, karyawan keluar)

- **Status:** draf E12 · **Tanggal:** 2026-09-26 · **Basis:** `develop` @ `c468bbe` (`collections/Devices.ts`,
  `domain/devices.ts`, `domain/users-sync.ts`, APK `features/auth`), ADR 0003, ADR 0010, US-32, US-56.
- **Pelaksana:** **Admin** atau **Direktur** (web). Pengguna sendiri bisa "mencabut" HP-nya dengan **Keluar** di APK.
- **Tempat:** web, grup menu **Pengguna & Akses → Perangkat** (`/admin/collections/devices`) dan **Pengguna**.

## Kapan dipakai

| Situasi | Tindakan | Bagian |
|---|---|---|
| HP karyawan hilang / dicuri | Cabut perangkat, status **Hilang** | A |
| Karyawan ganti HP (HP lama masih ada) | Minta karyawan **Keluar** di HP lama; bila tidak bisa, cabut status **Dicabut** | A |
| Karyawan keluar / akun tidak boleh dipakai lagi | Nonaktifkan **pengguna** (semua perangkat & sesi web ikut dicabut) | B |
| HP terdeteksi root/emulator | Tinjau; cabut bila mencurigakan | C |

## A. Cabut satu perangkat

1. Web → **Pengguna & Akses → Perangkat** → cari nama pengguna → buka perangkat berstatus **Aktif** (lihat model HP,
   versi aplikasi, "Terakhir terlihat").
2. Ubah **Status** = **Dicabut** (atau **Hilang**) → isi **alasan** (wajib, mis. "HP hilang dilaporkan 26/09") → **Simpan**.
   Status ini **satu arah**: perangkat yang sudah dicabut tidak bisa diaktifkan lagi ("Status perangkat yang dicabut
   tidak dapat diubah.").
3. Hasil: sesi Keycloak perangkat itu diakhiri; permintaan berikutnya dari HP tersebut ditolak dan aplikasi kembali ke
   layar **Masuk** dengan pesan "Perangkat ini sudah dicabut dari akun Anda oleh Admin/Direktur…" (uji F4 J.2:
   ≤ 1 request).
4. Verifikasi: **Audit Log** → filter jenis dokumen `device` → ada baris `device_revoke` dengan alasan.
5. Bila karyawan memakai HP baru: cukup **Masuk** di HP baru → perangkat baru terdaftar otomatis (ID lain).

**Data offline di HP yang dicabut:** antrean yang belum terkirim (draft pengajuan, absen offline, laporan progress)
**tidak ikut terkirim** setelah pencabutan — data itu tetap terenkripsi di HP. Bila HP masih di tangan karyawan dan
datanya penting, minta karyawan membuka **Antrean kirim → Kirim sekarang** *sebelum* dicabut. HP hilang: anggap data
antrean hilang; karyawan mengulang input dari HP baru.

## B. Nonaktifkan pengguna (karyawan keluar)

1. Web → **Pengguna & Akses → Pengguna** → buka pengguna → hilangkan centang **Aktif** → isi alasan → **Simpan**.
2. Sistem otomatis: akun Keycloak dinonaktifkan dan sesi diakhiri, akses aplikasi Android dicabut, **semua perangkat**
   pengguna berstatus dicabut ("Pengguna dinonaktifkan"), sesi web dicabut, audit `session_revoked`.
3. Periksa pekerjaan yang masih atas nama pengguna itu:
   - Bila pengguna adalah **Direktur** atau **Finance**: pastikan masih ada pemegang peran yang sama yang aktif; bila
     tidak, pengajuan baru akan ditolak "Tidak ada pengguna aktif untuk posisi … Hubungi Admin." (risiko R4 / G1-5).
   - Bila pengguna adalah **PM**: ganti **Project Manager** di project terkait (Direktur) dan akhiri **Penugasan tim**.
   - Uang muka yang belum LPJ: Finance menindaklanjuti (laporan **Kelengkapan Nota/LPJ**).
4. Data karyawan (**Karyawan**) dinonaktifkan terpisah bila perlu (alasan wajib); riwayat pengajuan dan absensi tetap.

## C. HP ditandai root / emulator

Di **Perangkat**, kolom **Risiko integritas** tercentang dan APK menampilkan kartu merah "HP ini terdeteksi di-root
atau berupa emulator…". Ini **tidak** memblokir otomatis. Admin memutuskan: minta karyawan memakai HP lain, lalu cabut
perangkat (A).

## Catatan

- Keluar (logout) di APK juga mencabut perangkat di server (alasan "Keluar dari aplikasi"); saat masuk lagi HP
  mendapat ID perangkat baru. Ini normal.
- Pencabutan tidak menghapus password. Bila dicurigai password bocor, Admin juga mereset password di Keycloak
  (`/opt/infra/docs/03-operations/keycloak.md`).
- Push FCM belum aktif; saat E8 aktif, pencabutan juga menghapus token push (**menyusul**).
