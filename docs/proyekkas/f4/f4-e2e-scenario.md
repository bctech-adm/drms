# Skenario uji E2E F4 — HP Android fisik vs staging

Dokumen ini adalah naskah uji untuk **gerbang penerimaan F4** (`phase-plan.md` §F4):

> E2E di HP Android fisik terhadap staging: buat → setujui (Owner di HP) → transfer (web) → nota → LPJ;
> absen offline tersinkron dengan tanda "offline" dan waktu server; perangkat yang dicabut terblokir ≤ 1 request;
> APK bertanda tangan; tidak ada rahasia di APK (pemindaian statis).

- **Server:** `https://drms-kas.staging.bimacreative.tech` (web: `/admin`). Zona waktu tampilan: WITA (Asia/Makassar).
- **Akun uji (fiktif):** `staff.uji@proyekkas.test`, `pm.uji@proyekkas.test`, `finance.uji@proyekkas.test`,
  `owner.uji@proyekkas.test`, dan akun **Admin** milik Anda. Kata sandi sesuai yang Anda simpan untuk staging.
  Jangan memakai data pribadi klien.
- **APK:** build staging dari branch `feat/f4b-mobile-completion` (artefak CI `proyekkas-staging-release-apk`,
  file `app-arm64-v8a-staging-release.apk` untuk kebanyakan HP). Aplikasi bernama **ProyekKas STG**.
- **Format uang:** `Rp 1.447.500` (titik ribuan, tanpa desimal).
- **Cara mengisi:** isi kolom **PASS/FAIL** dan **Catatan** (jam, tangkapan layar, pesan error apa adanya).
  Bila satu langkah FAIL, lanjutkan langkah berikutnya yang tidak bergantung padanya dan catat nomornya.

> Semua akun uji dapat dicoba di **satu HP** (keluar → masuk dengan akun lain). Keluar dari aplikasi otomatis
> mencabut perangkat di server; saat masuk lagi HP didaftarkan ulang dengan ID baru. Itu normal.

## 0. Persiapan (Admin, di web) — sekali sebelum uji

| No | Langkah | Aktor & perangkat | Hasil yang diharapkan | PASS/FAIL | Catatan |
|---|---|---|---|---|---|
| 0.1 | Pastikan staging sudah di-deploy dengan migrasi F4b (tanyakan ke infra lead: `f4b_device_integrity`, `f4b_attendance`, `f4b_attendance_security`). | Admin, laptop | Menu **Proyek → Absensi** muncul di panel admin. | | |
| 0.2 | Buka **Setting perusahaan**. Centang **"Absensi dari APK (termasuk offline) aktif"**. Pastikan **Versi APK minimum** kosong atau ≤ versi APK uji. Simpan (isi alasan bila diminta). | Admin, laptop | Tersimpan tanpa error. | | |
| 0.3 | Buka project uji (mis. **"Project Uji F4"**; buat bila belum ada). Isi **Latitude**, **Longitude** = titik tempat Anda akan berdiri saat uji absen (ambil dari Google Maps: tekan lama di peta → salin koordinat), **Radius geofence (m)** = `100`. Simpan. | Admin, laptop | Project tersimpan dengan titik & radius. | | |
| 0.4 | **Penugasan tim**: tambahkan `Staff Uji` ke project uji (peran Staff, tanggal mulai hari ini atau kosong). Pastikan `PM Uji` adalah PM project tersebut. | Admin, laptop | Penugasan tersimpan. | | |
| 0.5 | Periksa **Aturan approval** untuk Uang Muka: "Diketahui" oleh PM, Approval oleh Owner (sesuai uji F2). | Admin, laptop | Aturan aktif sesuai. | | |
| 0.6 | Pasang APK uji di HP (hapus versi lama bila perlu). Izinkan pemasangan dari sumber ini. | Anda, HP | Ikon **ProyekKas STG** muncul. | | |

## A. Masuk & perangkat

| No | Langkah | Aktor & perangkat | Hasil yang diharapkan | PASS/FAIL | Catatan |
|---|---|---|---|---|---|
| A.1 | Buka aplikasi. Masuk dengan `staff.uji@proyekkas.test`. | Staff Uji, HP | Beranda Staff tampil: tombol besar **Ajukan Uang Muka**, **Ajukan Reimburse**, **Pengajuan Saya**, **Absensi**, ikon lonceng di kanan atas. Tidak ada pesan error. | | |
| A.2 | Di web: **Pengguna & Akses → Perangkat**. Buka perangkat terbaru milik Staff Uji. | Admin, laptop | Status **Aktif**, model HP & versi aplikasi terisi, **Integritas diperiksa** berisi jam hari ini. Bila HP ter-root, **Risiko integritas** tercentang (tidak memblokir). | | |

## B. Buat pengajuan (Staff, HP)

| No | Langkah | Aktor & perangkat | Hasil yang diharapkan | PASS/FAIL | Catatan |
|---|---|---|---|---|---|
| B.1 | Aktifkan **mode pesawat**. Tekan **Ajukan Uang Muka**. Isi judul "Uji F4 — pembelian material", pilih **Project Uji F4**, tanggal dibutuhkan, rekening. Tambah 2 baris: "Semen 10 sak" Rp 650.000 dan "Pasir 1 rit" Rp 797.500. **Simpan**. | Staff Uji, HP (offline) | Pesan "Draft disimpan dan akan dikirim saat online." Total pratinjau **Rp 1.447.500**. Tombol **Ajukan** nonaktif dengan tulisan "Butuh koneksi internet". | | |
| B.2 | Matikan mode pesawat. Tunggu ± 10 detik (atau buka **Antrean kirim** → **Kirim sekarang**). | Staff Uji, HP | Draft terkirim (status antrean **Terkirim**). | | |
| B.3 | Buka draft → **Ajukan** → konfirmasi (tanda tangan profil). | Staff Uji, HP | Pengajuan mendapat nomor dokumen (format `…/PB-DRMS/…`), status **Menunggu Diketahui**. Bagian **Giliran** menunjukkan PM. | | |

## C. Diketahui PM

| No | Langkah | Aktor & perangkat | Hasil yang diharapkan | PASS/FAIL | Catatan |
|---|---|---|---|---|---|
| C.1 | Keluar. Masuk sebagai `pm.uji@proyekkas.test`. Buka **Menunggu Persetujuan** (inbox) → pengajuan B.3 → **Diketahui** → Konfirmasi (tanda tangan profil). | PM Uji, HP | Status berubah menjadi **Menunggu Approval**; Giliran = Owner. | | |

## D. Approval Owner di HP (dengan tanda tangan)

| No | Langkah | Aktor & perangkat | Hasil yang diharapkan | PASS/FAIL | Catatan |
|---|---|---|---|---|---|
| D.1 | Keluar. Masuk sebagai `owner.uji@proyekkas.test`. Beranda Owner menampilkan **Menunggu Persetujuan** dengan angka. | Owner Uji, HP | Angka inbox ≥ 1. | | |
| D.2 | Buka pengajuan dari inbox. Periksa: jenis, baris item, total **Rp 1.447.500**, dampak anggaran "% sekarang → % bila disetujui" (merah bila > 85 %). | Owner Uji, HP | Semua informasi tampil dalam Bahasa Indonesia. | | |
| D.3 | **Setujui** → pilih **Tanda tangan di layar** → gambar tanda tangan → **Konfirmasi**. | Owner Uji, HP | Pesan "Keputusan tersimpan." Status **Disetujui**; Giliran = "Finance — antri transfer". | | |
| D.4 | (Negatif) Coba **Tolak** pengajuan lain tanpa alasan. | Owner Uji, HP | Ditolak dengan pesan "Alasan wajib diisi (minimal 3 karakter)." | | |

## E. Transfer (Finance, web)

| No | Langkah | Aktor & perangkat | Hasil yang diharapkan | PASS/FAIL | Catatan |
|---|---|---|---|---|---|
| E.1 | Masuk web sebagai `finance.uji@proyekkas.test` → **Antrian Transfer** → pengajuan D.3 → isi akun kas, ref. bank (mis. `UJI-F4-001`), unggah bukti transfer (gambar fiktif) → simpan. | Finance Uji, laptop | Status **Ditransfer**; nomor transfer terbit. | | |

## F. Status transfer terlihat di HP (Staff)

| No | Langkah | Aktor & perangkat | Hasil yang diharapkan | PASS/FAIL | Catatan |
|---|---|---|---|---|---|
| F.1 | Di HP: keluar, masuk sebagai Staff Uji. Lihat ikon **lonceng**. | Staff Uji, HP | Ada angka notifikasi belum dibaca (maks. ± 2 menit, atau tarik layar ke bawah di Beranda). | | |
| F.2 | Buka lonceng → notifikasi transfer → ketuk. | Staff Uji, HP | Notifikasi jadi terbaca; detail pengajuan terbuka. | | |
| F.3 | Di detail, bagian **Transfer dari Finance**. | Staff Uji, HP | Tampil "Uang muka · Rp 1.447.500", nomor transfer · tanggal, "Ref. bank: UJI-F4-001", label **Tercatat**, dan "Total ditransfer: Rp 1.447.500". | | |

## G. Nota (Staff, HP)

| No | Langkah | Aktor & perangkat | Hasil yang diharapkan | PASS/FAIL | Catatan |
|---|---|---|---|---|---|
| G.1 | Di detail, bagian **Nota & LPJ** → **Tambah nota (kamera)** → pilih baris 1 → foto nota fiktif (kertas bertulisan) → isi vendor "Toko Uji", nomor, tanggal, jumlah **Rp 650.000** → **Simpan**. | Staff Uji, HP | Pesan "Mengunggah nota…" lalu "Nota tersimpan." Nota muncul di baris 1 dengan status **Menunggu verifikasi** dan thumbnail. | | |
| G.2 | **Tambah nota dari galeri** untuk baris 2 (Rp 797.376). | Staff Uji, HP | Nota tersimpan di baris 2. | | |
| G.3 | Tambah nota salah di baris 2, lalu tekan ikon **hapus** di nota itu → alasan "salah foto" → Konfirmasi. | Staff Uji, HP | "Nota dihapus."; nota hilang dari daftar. | | |
| G.4 | (Kompresi) Di web (Finance/Admin) buka **Nota** → salah satu nota G.1 → lihat gambar. | Finance Uji, laptop | Gambar terbaca; sisi terpanjang ≤ 1600 px (diperkecil di HP, EXIF/GPS tidak ikut). | | |
| G.5 | Aktifkan mode pesawat, buka detail lagi. | Staff Uji, HP | Tombol nota/LPJ nonaktif dengan "Butuh koneksi internet"; ikon hapus nota tidak tampil. Matikan mode pesawat lagi. | | |

## H. LPJ (Staff HP ↔ Finance web)

| No | Langkah | Aktor & perangkat | Hasil yang diharapkan | PASS/FAIL | Catatan |
|---|---|---|---|---|---|
| H.1 | **Nota sudah lengkap** → Konfirmasi. | Staff Uji, HP | "Tersimpan."; status **Nota Lengkap**; muncul tombol **Kirim LPJ**. | | |
| H.2 | **Kirim LPJ** → kosongkan keterangan → Konfirmasi. | Staff Uji, HP | Ditolak di HP: "Wajib diisi (minimal 3 karakter)." | | |
| H.3 | Isi "Pembelian semen dan pasir untuk uji F4" → Konfirmasi. | Staff Uji, HP | Status **LPJ Diajukan**; bagian **LPJ** menampilkan status Diajukan, total nota, keterangan. | | |
| H.4 | Web Finance → **Verifikasi LPJ** → minta revisi dengan catatan "Foto nota semen buram". | Finance Uji, laptop | Status **LPJ Revisi**. | | |
| H.5 | Di HP buka detail (tarik untuk muat ulang). | Staff Uji, HP | Kartu **Catatan Finance**: "Foto nota semen buram". Tombol **Kirim ulang LPJ** tersedia; nota bisa ditambah/dihapus. | | |
| H.6 | Tambah foto nota semen baru, hapus yang lama, **Kirim ulang LPJ**. | Staff Uji, HP | Status **LPJ Diajukan** lagi. | | |
| H.7 | Web Finance → verifikasi nota & LPJ, lalu selesaikan selisih (Rp 124: dikembalikan ke kas). | Finance Uji, laptop | Status **Selesai** (atau **LPJ Terverifikasi** lalu **Selesai** setelah penyelesaian). Di HP bagian LPJ menampilkan "Sisa dana dikembalikan ke kas". | | |

## I. Absen offline (Staff, HP) — di lokasi project uji

| No | Langkah | Aktor & perangkat | Hasil yang diharapkan | PASS/FAIL | Catatan |
|---|---|---|---|---|---|
| I.1 | Berdiri di titik project (≤ 100 m). **Nyalakan GPS**. Aktifkan **mode pesawat** (data mati, GPS tetap nyala). Catat jam sekarang: `__:__ WITA`. | Staff Uji, HP | — | | |
| I.2 | Beranda → **Absensi** → pilih **Project Uji F4** → **Absen masuk**. Izinkan lokasi & kamera bila diminta. Ambil selfie dengan kamera depan. | Staff Uji, HP (offline) | Pesan "Di dalam radius project (… m dari titik)." lalu "Absen tersimpan di HP (offline)…". Riwayat: "Absen masuk · Project Uji F4 · offline · Menunggu". Galeri tidak bisa dipakai untuk selfie. | | |
| I.3 | Tunggu ≥ 5 menit, lalu matikan mode pesawat. Buka **Antrean kirim** → **Kirim sekarang** (atau tunggu otomatis). | Staff Uji, HP | Riwayat absen berubah jadi **Terkirim**. | | |
| I.4 | Web Admin → **Proyek → Absensi** → baris terbaru Staff Uji. | Admin, laptop | **Offline** tercentang; **Sumber jam** = "Perkiraan server"; **Jam absensi** ≈ jam I.1 (bukan jam kirim I.3); **Diterima server** = jam kirim I.3; **Jam HP** terisi; jarak ≤ 100 m; selfie ada. | | |
| I.5 | (Negatif) Tekan **Absen masuk** lagi di hari yang sama (online). | Staff Uji, HP | Terkirim lalu **Ditolak** dengan pesan "Sudah absen masuk di project ini hari ini." | | |
| I.6 | **Absen pulang** (online). | Staff Uji, HP | "Absen tersimpan dan sedang dikirim." → **Terkirim**; di web Sumber jam = "Server (online)". | | |
| I.7 | (Opsional, negatif) Dari lokasi > 150 m dari titik, tekan **Absen masuk** di project lain yang juga diberi titik. | Staff Uji, HP | Di HP: "Anda di luar radius project (… m dari titik)…"; selfie tidak diminta; tidak ada data terkirim. | | |
| I.8 | (Opsional, negatif) Dengan aplikasi lokasi palsu (Opsi pengembang → aplikasi lokasi tiruan), tekan **Absen masuk**. | Staff Uji, HP | "Lokasi palsu (mock location) terdeteksi…"; absen ditolak. | | |

## J. Cabut perangkat (≤ 1 request)

| No | Langkah | Aktor & perangkat | Hasil yang diharapkan | PASS/FAIL | Catatan |
|---|---|---|---|---|---|
| J.1 | HP tetap masuk sebagai Staff Uji di Beranda. Web Admin → **Perangkat** → perangkat aktif Staff Uji → **Status = Dicabut**, alasan "Uji F4 cabut perangkat" → Simpan. | Admin, laptop | Tersimpan; **Dicabut pada** terisi. | | |
| J.2 | Di HP, tarik layar Beranda ke bawah (satu aksi = satu request ke server). | Staff Uji, HP | Aplikasi langsung kembali ke layar **Masuk** dengan pesan: "Perangkat ini sudah dicabut dari akun Anda oleh Admin/Owner. Silakan masuk kembali atau hubungi Admin." | | |
| J.3 | Masuk lagi sebagai Staff Uji. | Staff Uji, HP | Berhasil. Di web ada perangkat **baru** (ID lain) berstatus Aktif; perangkat lama tetap Dicabut. Antrean offline (bila ada) tetap ada. | | |
| J.4 | Web: **Audit Log** → filter jenis dokumen `device`. | Admin, laptop | Ada baris `device_revoke` dengan alasan J.1. | | |

## K. Versi minimum (opsional)

| No | Langkah | Aktor & perangkat | Hasil yang diharapkan | PASS/FAIL | Catatan |
|---|---|---|---|---|---|
| K.1 | Setting perusahaan → **Versi APK minimum** = `9.9.9` → Simpan. Di HP tarik Beranda (tunggu ≤ 1 menit, cache server). | Admin + Staff Uji | HP menampilkan layar **Perbarui aplikasi** (versi sekarang vs minimum); tidak bisa lanjut. | | |
| K.2 | Kosongkan lagi **Versi APK minimum**. Tutup & buka aplikasi. | Admin + Staff Uji | Aplikasi normal kembali. | | |

## L. Bukti non-HP (diisi oleh tim)

| No | Langkah | Aktor & perangkat | Hasil yang diharapkan | PASS/FAIL | Catatan |
|---|---|---|---|---|---|
| L.1 | CI `mobile` job **build APKs**: langkah "Static secret scan of the release APKs". | Tim | Hijau: "APK secret scan: clean …". | | |
| L.2 | CI: langkah "Decode staging keystore" mencetak SHA-256 sertifikat; sama dengan `ANDROID_APP_CERT_SHA256` staging. | Tim | Sama. APK bertanda tangan kunci staging. | | |

## Ringkasan

| Bagian | PASS/FAIL | Catatan |
|---|---|---|
| A. Masuk & perangkat | | |
| B–D. Buat → Diketahui → Approve Owner di HP | | |
| E–F. Transfer (web) & status di HP | | |
| G–H. Nota & LPJ | | |
| I. Absen offline | | |
| J. Cabut perangkat ≤ 1 request | | |
| K. Versi minimum | | |
| L. APK bertanda tangan & bebas rahasia | | |

Diuji oleh: ____________ · Tanggal: ____________ · Model HP / Android: ____________ · Versi APK: ____________
