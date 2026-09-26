# Skenario uji E2E F4 — HP Android fisik vs staging

> **Revisi 2026-09-26 (E3-a, `plans/fase1-golive.md` §E1 AC-10 & §E3):** alur approval baru ADR 0013 —
> **Direktur** (peran `pk-owner`, dulu "Owner") memberi **"Diketahui" = persetujuan**, lalu **Finance** memberi
> **Approval**; **PM hanya memantau** (tanpa inbox, tanpa tombol keputusan). Ditambah langkah kesetaraan APK
> (tarik kembali / batalkan / ajukan ulang, daftar tim PM, Riwayat, ringkasan KPI Beranda) dan sinkron latar
> belakang (WorkManager). Bagian yang berubah: 0.5, B.3, C, D, J.2; bagian baru: M–R.

Dokumen ini adalah naskah uji untuk **gerbang penerimaan F4** (`phase-plan.md` §F4):

> E2E di HP Android fisik terhadap staging: buat → setujui (Direktur lalu Finance di HP) → transfer (web) → nota → LPJ;
> absen offline tersinkron dengan tanda "offline" dan waktu server; perangkat yang dicabut terblokir ≤ 1 request;
> APK bertanda tangan; tidak ada rahasia di APK (pemindaian statis).

- **Server:** `https://drms-kas.staging.bimacreative.tech` (web: `/admin`). Zona waktu tampilan: WITA (Asia/Makassar).
- **Akun uji (fiktif):** `staff.uji@proyekkas.test`, `pm.uji@proyekkas.test`, `finance.uji@proyekkas.test`,
  `owner.uji@proyekkas.test` (= **Direktur**, peran `pk-owner`), dan akun **Admin** milik Anda. Kata sandi sesuai
  yang Anda simpan untuk staging. Jangan memakai data pribadi klien.
- **APK:** build staging dari branch `feat/mobile-e1-e3` (artefak CI `proyekkas-staging-release-apk`, file
  `app-arm64-v8a-staging-release.apk` untuk kebanyakan HP; bila secret kunci staging belum ada:
  `proyekkas-staging-debug-apk`, file `app-staging-debug.apk`). Aplikasi bernama **ProyekKas STG**.
  Login di dalam aplikasi (username + kata sandi, ADR 0012).
- **Server:** staging harus sudah menjalankan `develop` dengan E1 (migrasi `e1_approval_direktur_finance`) — cek:
  detail pengajuan baru berstatus **"Menunggu Diketahui (Direktur)"**.
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
| 0.5 | Periksa **Aturan approval** aktif (ADR 0013): "Diketahui" oleh **Direktur** (`pk-owner`, wajib), Approval level 1 oleh **Finance** (`pk-finance`). Pastikan pengajuan staging lama yang masih `Menunggu Diketahui/Approval` sudah diselesaikan atau dibatalkan (ADR 0013 "Data migration"). | Admin, laptop | Aturan aktif sesuai; tidak ada pengajuan lama yang menunggu PM. | | |
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
| B.3 | Buka draft → **Ajukan** → konfirmasi (tanda tangan profil). | Staff Uji, HP | Pengajuan mendapat nomor dokumen (format `…/PB-DRMS/…`), status **Menunggu Diketahui (Direktur)**. **Giliran** = "Direktur — persetujuan (Diketahui)". **Posisi tanda tangan**: Diajukan ✓, Dibuat ✓, **Diketahui (Direktur)** (giliran), **Approval (Finance)**. | | |

## C. PM hanya memantau (tanpa keputusan)

| No | Langkah | Aktor & perangkat | Hasil yang diharapkan | PASS/FAIL | Catatan |
|---|---|---|---|---|---|
| C.1 | Keluar. Masuk sebagai `pm.uji@proyekkas.test`. Lihat Beranda dan menu bawah. | PM Uji, HP | **Tidak ada** tombol/tab **Menunggu Persetujuan**. Beranda menampilkan **Pantauan tim** (kartu "Pengajuan tim bulan ini", "Uang muka tim belum LPJ", "Realisasi anggaran project saya"). Tombol Ajukan Uang Muka/Reimburse tetap ada. | | |
| C.2 | **Pengajuan** → tab **Tim**. | PM Uji, HP | Baris "Pantauan tim — hanya lihat…" dan pengajuan B.3 ada di daftar. | | |
| C.3 | Buka pengajuan B.3 dari tab Tim. | PM Uji, HP | Detail tampil; **tidak ada** tombol Setujui/Tolak. Giliran = Direktur. | | |

## D. Persetujuan Direktur ("Diketahui") lalu Approval Finance di HP (dengan tanda tangan)

| No | Langkah | Aktor & perangkat | Hasil yang diharapkan | PASS/FAIL | Catatan |
|---|---|---|---|---|---|
| D.1 | Keluar. Masuk sebagai `owner.uji@proyekkas.test` (Direktur). | Direktur Uji, HP | Beranda **Ringkasan**: kartu Saldo kas total (dengan garis tren), Pengajuan menunggu ("Diketahui n · Approval n", "n menunggu saya"), Pencairan bulan ini, Realisasi vs anggaran; grafik **Arus kas bulanan** (ketuk satu bulan → angka Masuk/Keluar bulan itu di bawah grafik). Tombol **Menunggu Persetujuan** dengan angka ≥ 1. Angka sama dengan Beranda web Direktur. | | |
| D.2 | Buka inbox → kartu pengajuan B.3. | Direktur Uji, HP | Kartu bertanda **"Persetujuan Direktur (Diketahui)"**; total **Rp 1.447.500**; dampak anggaran "% sekarang → % bila disetujui" dengan bilah (merah + ikon peringatan bila > 85 %); jumlah flag. | | |
| D.3 | Buka pengajuan → **Setujui (Diketahui)** → judul lembar "Setujui sebagai Direktur (Diketahui)" → **Tanda tangan di layar** → gambar → **Konfirmasi**. | Direktur Uji, HP | "Keputusan tersimpan." Status **Menunggu Approval**; Giliran = "Approval (Finance)"; timeline **Diketahui (Direktur)** ✓ nama Direktur. | | |
| D.4 | (Negatif) Pada pengajuan lain yang menunggu Direktur: **Tolak** tanpa alasan. | Direktur Uji, HP | "Alasan wajib diisi (minimal 3 karakter)." | | |
| D.5 | Keluar. Masuk sebagai `finance.uji@proyekkas.test`. | Finance Uji, HP | Beranda **Ringkasan** Finance: Saldo kas total, Antrian transfer, Menunggu verifikasi ("n LPJ · n nota reimburse"), Selisih LPJ; grafik Arus kas. Tombol **Menunggu Persetujuan** ≥ 1. | | |
| D.6 | Inbox → pengajuan B.3 (label "Approval level 1") → **Setujui** → tanda tangan profil → **Konfirmasi**. | Finance Uji, HP | Status **Disetujui**; Giliran = "Finance — antri transfer". Timeline: Diketahui (Direktur) ✓, Approval (Finance) ✓. | | |
| D.7 | (403) Siapkan pengajuan lain yang menunggu Direktur. Masuk sebagai Finance, buka pengajuan itu dari **Pengajuan** (bukan inbox). | Finance Uji, HP | Tidak ada tombol keputusan (bukan giliran Finance). Bila tombol sempat terlihat karena data lama, menekan Konfirmasi menampilkan "Anda tidak dapat memutuskan pengajuan ini. Hanya Direktur (Diketahui) dan Finance (Approval)…" dan detail dimuat ulang — aplikasi tidak error. | | |
| D.8 | (Opsional, aturan lewati G1-2) Direktur Uji membuat pengajuan sendiri di web dan mengajukannya (bila Direktur Uji satu-satunya Direktur). Buka di HP. | Direktur/Finance Uji, HP | Timeline **Diketahui (Direktur)** = "(tidak berlaku — pemohon)"; langsung Menunggu Approval (Finance). | | |

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
| J.2 | Di HP, tarik layar Beranda ke bawah (satu aksi = satu request ke server). | Staff Uji, HP | Aplikasi langsung kembali ke layar **Masuk** dengan pesan: "Perangkat ini sudah dicabut dari akun Anda oleh Admin/Direktur. Silakan masuk kembali atau hubungi Admin." | | |
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

## M. Tarik kembali, batalkan, ajukan ulang (US-04, US-06) — sama dengan web

| No | Langkah | Aktor & perangkat | Hasil yang diharapkan | PASS/FAIL | Catatan |
|---|---|---|---|---|---|
| M.1 | Staff Uji membuat & mengajukan pengajuan baru "Uji M — tarik kembali" (seperti B.1–B.3). Buka detailnya. | Staff Uji, HP | Bagian **Aksi pengajuan**: **Tarik kembali ke Draft** dan **Batalkan pengajuan**. | | |
| M.2 | **Tarik kembali ke Draft** → isi alasan "ok" → Konfirmasi. | Staff Uji, HP | Ditolak di HP: "Wajib diisi (minimal 3 karakter)." | | |
| M.3 | Isi alasan "Salah pilih project" → Konfirmasi. | Staff Uji, HP | "Pengajuan ditarik kembali ke Draft; silakan ubah lalu kirim lagi."; status **Draft**. | | |
| M.4 | Tombol **Ubah & ajukan di HP** → editor terbuka berisi data dari server (nota lama tampil dengan ikon awan "Nota sudah di server"). Ubah judul → **Simpan** → tunggu terkirim → **Ajukan**. | Staff Uji, HP | Status kembali **Menunggu Diketahui (Direktur)**; nomor dokumen sama. | | |
| M.5 | Web (Admin/Direktur) → pengajuan M.1 → tab **Riwayat**. | Admin, laptop | Baris tarik kembali dengan alasan M.3 dan sumber **apk** + versi aplikasi (sama seperti bila dilakukan di web). | | |
| M.6 | Staff Uji: pengajuan lain yang masih menunggu → **Batalkan pengajuan** → alasan "Tidak jadi dibeli". | Staff Uji, HP | "Pengajuan dibatalkan."; status **Dibatalkan**; Riwayat web berisi alasan. | | |
| M.7 | Direktur menolak satu pengajuan Staff dengan alasan. Staff Uji membuka pengajuan yang **Ditolak** → **Ajukan ulang (buat draft baru)** → Konfirmasi. | Staff Uji, HP | "Draft baru dibuat…"; editor terbuka berisi salinan; pengajuan lama tetap **Ditolak**. Simpan → Ajukan → status Menunggu Diketahui (Direktur). | | |

## N. Riwayat di HP (US-35)

| No | Langkah | Aktor & perangkat | Hasil yang diharapkan | PASS/FAIL | Catatan |
|---|---|---|---|---|---|
| N.1 | Buka detail pengajuan B.3 → ikon **Riwayat** (jam) di kanan atas. | Staff atau Direktur Uji, HP | Daftar terbaru di atas: aksi (mis. "disetujui Direktur (Diketahui)", "disetujui", "status"), jam WITA, oleh siapa, **Field** (+ baris), **Lama → Baru**, **Alasan**, **Sumber** (web/apk + versi + 8 huruf ID perangkat). Isinya sama dengan tab **Riwayat** di web untuk pengajuan yang sama. | | |

## O. Sinkron latar belakang (aplikasi ditutup) — E3-b

| No | Langkah | Aktor & perangkat | Hasil yang diharapkan | PASS/FAIL | Catatan |
|---|---|---|---|---|---|
| O.1 | Staff Uji, **mode pesawat**: buat draft "Uji O — latar belakang" → **Simpan**. Pastikan **Antrean** = 1 menunggu. Catat jam: `__:__`. | Staff Uji, HP | "Draft disimpan dan akan dikirim saat online." | | |
| O.2 | Tutup aplikasi sepenuhnya (geser dari daftar aplikasi terbaru). Matikan mode pesawat. **Jangan buka aplikasi.** Tunggu sampai 20 menit. | Staff Uji, HP | — | | |
| O.3 | Web Admin → **Pengajuan** → cari "Uji O". Catat jam draft muncul: `__:__`. | Admin, laptop | Draft muncul **tanpa membuka aplikasi**, ≤ 15 menit setelah online (batas periodik Android; bisa lebih lama bila penghemat baterai/Doze aktif — catat merek HP & mode baterai). | | |
| O.4 | Buka aplikasi → **Antrean kirim**. | Staff Uji, HP | Item berstatus **Terkirim**; tetap masuk (tidak diminta login ulang). | | |
| O.5 | (Opsional) Ulangi O.1–O.3 pada HP merek kedua milik klien (risiko R10). | Staff Uji, HP 2 | Sama. | | |

## P. Ringkasan KPI & angka sama dengan web (US-27)

| No | Langkah | Aktor & perangkat | Hasil yang diharapkan | PASS/FAIL | Catatan |
|---|---|---|---|---|---|
| P.1 | Bandingkan kartu Beranda HP Direktur dengan Beranda web Direktur pada saat yang sama. | Direktur Uji, HP + laptop | Saldo kas total, jumlah pengajuan menunggu, pencairan bulan ini, % realisasi sama. | | |
| P.2 | Sama untuk Finance (Antrian transfer, Menunggu verifikasi, Selisih LPJ, Saldo kas). | Finance Uji, HP + laptop | Sama. | | |
| P.3 | Tarik Beranda ke bawah dengan mode pesawat aktif. | Direktur Uji, HP | Kartu "Ringkasan belum bisa dimuat" + tombol muat ulang; tombol Beranda lain tetap bisa dipakai. | | |

## Q. Tautan tak dikenal (perbaikan layar kosong)

| No | Langkah | Aktor & perangkat | Hasil yang diharapkan | PASS/FAIL | Catatan |
|---|---|---|---|---|---|
| Q.1 | (Tim, opsional) Buka tautan `id.co.drms.proyekkas:/tidak-ada` dari HP (mis. lewat `adb shell am start -a android.intent.action.VIEW -d …`). | Tim, HP | Layar "Halaman tidak bisa dibuka" dengan tombol **Ke beranda**, bukan layar kosong. | | |

## Ringkasan

| Bagian | PASS/FAIL | Catatan |
|---|---|---|
| A. Masuk & perangkat | | |
| B–D. Buat → PM memantau → Direktur (Diketahui) → Finance (Approval) di HP | | |
| E–F. Transfer (web) & status di HP | | |
| G–H. Nota & LPJ | | |
| I. Absen offline | | |
| J. Cabut perangkat ≤ 1 request | | |
| K. Versi minimum | | |
| L. APK bertanda tangan & bebas rahasia | | |
| M. Tarik kembali / batalkan / ajukan ulang | | |
| N. Riwayat | | |
| O. Sinkron latar belakang (aplikasi ditutup) | | |
| P. KPI Beranda = web | | |
| Q. Tautan tak dikenal | | |

Diuji oleh: ____________ · Tanggal: ____________ · Model HP / Android: ____________ · Versi APK: ____________
