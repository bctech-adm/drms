# ProyekKas — Laporan QA E9 (Sprint S3): ZAP baseline, load test, restore drill

- **Tanggal:** 2026-09-26, 23:08–23:30 WIB · **Penguji:** agen QA (Claude) atas permintaan Lead ProyekKas
- **Target:** staging `https://drms-kas.staging.bimacreative.tech` (Traefik v3 + CrowdSec bouncer/AppSec, Keycloak realm
  `drms-staging`), image `ghcr.io/bctech-adm/proyekkas-web:0.2.1-stg-13b1f05` (web `drms-pk-stg` 384 MiB, worker
  `drms-pk-stg-worker` 192 MiB), DB `pk_drms_stg` di container `postgres` (cluster bersama DB prod).
  Container web/worker di-(re)deploy 23:06 WIB (sebelum pengujian; `RestartCount=0`, tidak ada OOM selama pengujian).
- **Dasar AC:** `plans/fase1-golive.md` §E9 dan §6 (aturan RAM web > 80% limit ≈ 307 MiB → flag).
- **Alat:** ZAP 2.17.0 (`zaproxy/zap-stable@sha256:781a2bda…`), k6 v2.3.0 (`grafana/k6@sha256:e66db15b…`),
  restic 0.19.1 + `/opt/infra/scripts/restore.sh` (infra ADR 0006), PostgreSQL 16.15, CrowdSec v1.8.1.
- **Bukti mentah:** `s3-e9-evidence/` (laporan ZAP Markdown + cek header manual). Skrip k6:
  `apps/web/tests/load/q34-mix.js` (+ `fixtures/`).

## 0. Ringkasan

| AC E9 | Hasil | Status |
|---|---|---|
| Tidak ada temuan HIGH/CRITICAL terbuka | ZAP baseline pasif (2 run, tanpa login): **0 FAIL, 0 High**; 1 Medium (CSP `style-src 'unsafe-inline'` = deviasi yang sudah diterima user 2026-09-23), sisanya Low/Info. Pemindaian **terautentikasi tidak bisa** (tidak ada kredensial uji, §1.3). | **PASS untuk permukaan tanpa login**; permukaan terautentikasi belum dipindai |
| Load test p95 < 2 s pada aksi utama (Q-34: 30 lapangan + 5 kantor, termasuk unggah foto/selfie) | **DIBLOKIR**: kredensial akun uji staging tidak tercatat di repo/infra (§2.1). Yang bisa dijalankan: campuran Q-34 **tanpa login** (35 VU, ±10 menit): semua jalur p95 ≤ 109 ms, error 0%, 0× 429. | **TIDAK TERVERIFIKASI** (aksi utama butuh login) |
| RAM puncak web/worker < 80% limit | Selama run tanpa login: web **111,7 / 384 MiB (29,1%)**, worker **69,9 / 192 MiB (36,4%)**. Jalur sharp (resize foto/selfie) **belum** terbebani. | PASS sebagian (tanpa beban unggah terautentikasi) |
| Restore drill `pk_drms_restoretest` (DB + media) < 4 jam, jumlah baris & checksum media cocok | RTO terukur **6,1 s** (DB 5,1 s + media 0,7 s + verifikasi 0,3 s); **68 tabel / 2 078 baris cocok**, **58 sequence cocok**, **46 file media sha256 + owner/mode cocok**. DB uji & direktori sementara dihapus. | **PASS** |

**Keputusan yang dibutuhkan (Lead/user)** — lihat §2.5: sediakan kredensial uji staging untuk load test terautentikasi
(idealnya ≥ 30 akun lapangan fiktif + 5 kantor tanpa OTP, atau cara TOTP), lalu jalankan ulang `MODE=auth`.

## 1. ZAP baseline (pasif)

### 1.1 Persiapan CrowdSec (sebelum scan/load)

- `docker exec crowdsec cscli decisions list` sebelum uji: hanya `34.84.88.4` (pihak luar, `http-probing`,
  `http-sensitive-files`, `appsec-native`) — bukan dari VPS.
- Parser `crowdsecurity/whitelists` aktif (`/etc/crowdsec/parsers/s02-enrich/whitelists.yaml`, IP privat). Lalu lintas
  dari host ke `drms-kas.staging…` (hairpin ke IP publik VPS) tiba di Traefik sebagai **`10.100.0.1`** (gateway network
  `proxy`, `docs/03-operations/crowdsec.md`) → alert AppSec tetap tercatat tetapi **tanpa decision/ban**.
- Rate limit Traefik per IP sumber berlaku untuk **semua VU bersama** (satu IP hairpin): `ratelimit-pk-api` 20/s burst 40
  (`/api/v1`), `ratelimit-default` 50/s burst 100, `ratelimit-login` 10/menit (`/auth/*`), token Keycloak DRMS 60/menit
  burst 30. Beban Q-34 berjeda (≈ 4,3 req/s total) jauh di bawahnya.
- Sesudah semua uji: `cscli decisions list` tetap hanya `34.84.88.4`; `cscli alerts list --since 30m` berisi 9 alert
  AppSec dari `10.100.0.1` (probe manual §1.4: TRACE/TRACK/PROPFIND, `/.git/HEAD`, `/.env`, path traversal) — **alert
  saja, tanpa decision**. Tidak ada decision yang perlu dihapus.

### 1.2 Perintah

```bash
S=<scratch>; mkdir -p $S/zap && chmod 777 $S/zap
# run 1: dari root
docker run -d --name e9qa-zap-unauth --network host -v $S/zap:/zap/wrk:rw zaproxy/zap-stable \
  zap-baseline.py -t https://drms-kas.staging.bimacreative.tech/ -m 3 -r unauth.html -J unauth.json -w unauth.md -I
# run 2: dari halaman login panel, + AJAX spider (root = 404 sehingga spider run 1 hanya menemukan sedikit URL)
docker run -d --name e9qa-zap-admin --network host -v $S/zap:/zap/wrk:rw zaproxy/zap-stable \
  zap-baseline.py -t https://drms-kas.staging.bimacreative.tech/admin/login -m 3 -j -r admin.html -J admin.json -w admin.md -I
docker rm e9qa-zap-unauth e9qa-zap-admin
```

Run 2: 37 URL; kedua run `FAIL-NEW: 0 · WARN-NEW: 4/5 · PASS: 63/62`. Laporan: `s3-e9-evidence/zap-baseline-*.md`.

### 1.3 Pemindaian terautentikasi — tidak dijalankan

Kata sandi akun uji `*.uji@proyekkas.test` sengaja tidak dicatat (`uat/fase1/README.md` §Akun uji: "fasilitator
membagikannya secara terpisah"; `f4/f4-e2e-scenario.md`: "kata sandi sesuai yang Anda simpan"; `uat/f2-uat-report.md`:
suite Playwright + secret per-run di workspace Lead, di luar repo). Sesuai instruksi, QA **tidak** mereset password dan
**tidak** membuat user Keycloak. Akun juga memakai TOTP (F2 UAT: required action password + TOTP), sehingga cookie/bearer
untuk ZAP butuh login interaktif oleh pemegang akun. → Jalankan ulang dengan `-z "-config replacer…"` (header
`Authorization: Bearer <token proyekkas-mobile>` + `X-Device-Id`) atau cookie sesi web setelah kredensial tersedia.

### 1.4 Triase temuan

| # | Sumber | Temuan | Risiko ZAP | Triase | Severity akhir | Tindak lanjut |
|---|---|---|---|---|---|---|
| Z-1 | ZAP 10055 | CSP `style-src 'self' 'unsafe-inline'` (semua halaman HTML) | Medium | True positive, **deviasi diterima** (keputusan user 2026-09-23, Payload admin butuh inline style); `script-src` memakai nonce, tanpa `unsafe-inline`/`unsafe-eval`, `object-src 'none'`, `frame-ancestors 'none'` | Low (diterima) | Tidak ada; tetap tercatat di ASVS 5.3.3/14.4.3. |
| Z-2 | ZAP 90004 | `Cross-Origin-Resource-Policy` tidak ada pada aset `/_next/static/*` dan font | Low | True positive, dampak kecil (aset publik tanpa data) | Low | Opsional: `Cross-Origin-Resource-Policy: same-origin` di `next.config.ts` `headers()` (nextjs). |
| Z-3 | ZAP 90004 | `Cross-Origin-Embedder-Policy` tidak ada di `/admin/login` | Low | Informasional untuk aplikasi ini (tidak memakai `SharedArrayBuffer`/isolasi lintas origin); COOP `same-origin` sudah ada | Info | Tidak perlu. |
| Z-4 | ZAP 10019 | `Content-Type` tidak ada pada respons 302 `/admin` (gate E9) | Info | True positive, body 72 byte teks redirect; tanpa dampak keamanan | Info | Opsional (nextjs). |
| Z-5 | ZAP 10049 / 10109 | Konten non-storable / storable; "Modern Web Application" | Info | Informasional: HTML `no-store`, aset hash `max-age=31536000` — sesuai harapan | Info | — |
| M-1 | Manual | HSTS `max-age=604800` (7 hari), tanpa `includeSubDomains` (middleware Traefik `security-headers`) | — | True positive vs ASVS 14.4.5 (contoh ASVS `max-age=15724800; includeSubDomains`) | Low | [infra] naikkan `stsSeconds` ≥ 15 552 000 (180 hari) untuk prod (E10), pertimbangkan `includeSubDomains` setelah semua subdomain HTTPS. |
| M-2 | Manual | TLS: hanya 1.2/1.3 (TLS 1.0/1.1 ditolak), tetapi TLS 1.2 masih menerima suite CBC-SHA/non-PFS (`ECDHE-RSA-AES128-SHA`, `AES128-SHA256`) — default Traefik | — | True positive (ASVS 9.1.2 "cipher kuat") | Low | [infra] `tls.options` default: `minVersion VersionTLS12` + daftar `cipherSuites` hanya AEAD/ECDHE (platform-wide, perlu keputusan infra Lead). |
| M-3 | Manual | REST generik Payload `/api/<slug>` (mis. `/api/users`, `/api/users/me`) tanpa header `Cache-Control` | — | True positive (G-08 terkonfirmasi); `/api/v1` sudah `no-store`, HTML admin `private, no-cache, no-store` | Low | nextjs: `Cache-Control: no-store` untuk `/api/:path*` di `next.config.ts` `headers()`. |
| M-4 | Manual | `/api/*` mengirim `Access-Control-Allow-Headers/Methods` (default Payload) tetapi **tanpa** `Access-Control-Allow-Origin`, termasuk untuk `Origin: https://evil.example` | — | False positive untuk CORS (browser menolak tanpa ACAO) | Info | — |
| M-5 | Manual | Akses REST generik tanpa sesi (403) dicatat app sebagai `warn` lengkap dengan stack trace | — | Log noise, bukan kebocoran (tidak ada token/body/PII) | Info | Opsional: log 401/403 tanpa stack (nextjs). |

Cek manual lain (semua sesuai harapan, detail `s3-e9-evidence/manual-header-checks.txt`): `X-Frame-Options: DENY`,
`nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP, `X-Request-Id`; **tidak ada** header `Server`/`X-Powered-By`;
`/.git/HEAD`, `/.git/config`, `/.env`, `/package.json` → 403 (WAF), `/server.js` → 404; TRACE/TRACK/PROPFIND/PUT/DELETE
ke `/admin/login` → 403 (WAF), OPTIONS → 400; `/api/v1/*` 401 = `application/problem+json` generik, rute tak dikenal = 404 JSON Payload `Route not found` (tanpa stack);
parameter ganda `?version=1.0.0&version=abc` → nilai terakhir dipakai lalu divalidasi zod (400).

**Kesimpulan ZAP:** tidak ada HIGH/CRITICAL pada permukaan tanpa login. 3 Low (M-1, M-2 infra; M-3 nextjs) + 1 Low
diterima (Z-1).

## 2. Load test (k6)

### 2.1 Blocker kredensial

Mode terautentikasi (password grant client `proyekkas-mobile`, realm `drms-staging`, ADR 0012 — staging saja) **tidak
dijalankan**: kredensial akun uji tidak tersedia di lokasi yang terdokumentasi (lihat §1.3). Selain itu, walaupun
kata sandi tersedia:

1. **Hanya 4–6 akun uji** (Staff, PM, Finance, Direktur, Admin, Finance 2). 30 VU lapangan yang berbagi 1 akun Staff akan
   terkena rate limit **per user** di aplikasi (`/sync/batch` 12/menit, unggah 60/menit — `v1()` `rateLimit`) → 429
   buatan yang tidak mewakili 30 orang. Q-34 butuh **≥ 30 akun lapangan fiktif** (+ 5 kantor) yang ditugaskan ke
   PRJ-UJI-01 — membuat user Keycloak/app = keputusan Lead/user (bukan wewenang QA).
2. Bila akun ber-TOTP, password grant butuh parameter `totp` per login (kode 30 s) → akun load test sebaiknya tanpa OTP
   di realm staging, atau Lead menyediakan kode saat run.
3. Prasyarat data: `syncAttendanceEnabled` & `syncProgressReportsEnabled` aktif, `PROJECT_ID`/`STAGE_ID` PRJ-UJI-01,
   titik geofence (`LAT`/`LNG`).

### 2.2 Skenario (skrip `apps/web/tests/load/q34-mix.js`)

| Grup | VU | `MODE=auth` (disiapkan, belum dijalankan) | `MODE=anon` (dijalankan) |
|---|---:|---|---|
| Lapangan | 30 | login sekali/VU + token reuse (refresh), register device, `/me`, `/masters`, lalu acak: 35% selfie (`POST /media/selfies`, 84 KB, 720×960) + `attendance.check_in` via `/sync/batch`; 30% 1–3 foto progress (`POST /media/progress-photos`, 295 KB, 1600×1200) + `progress_report.draft_upsert`; 35% draft pengajuan + `draft_delete` (bersih sendiri) + daftar pengajuan; jeda 20–40 s | `GET /api/v1/health`, `GET /api/v1/app/config` (publik, baca DB), `GET /api/v1/masters` (401), `POST /api/v1/media/selfies` multipart 84–295 KB tanpa token (401, lewat `buffering-pk` + parser multipart) |
| Kantor | 5 | `/dashboard/finance`, `/dashboard/owner`, `/approvals/inbox`, `/transfer-queue`, `/reports/{rekap-kas,rekap-pengajuan,anggaran-project,absensi}` | `GET /admin` (gate 302), `GET /admin/login` (SSR panel Payload ≈ 56 KB), `GET /api/v1/approvals/inbox` (401) |

Profil: ramp 1 menit → tahan 8 menit → turun 30 s (≈ 10 menit total), batas Q-34 (tidak dinaikkan). Gambar uji
sintetis (gradasi + noise, dibuat dengan `sharp` dari image app), ukuran mengikuti target kompresi APK
(`apps/mobile/lib/core/media/compress_plan.dart`: foto ≤ 400 KB/1600 px, selfie ≤ 150 KB/720 px).

```bash
S=<scratch>/k6; mkdir -p $S/out && chmod 777 $S/out
docker run -d --name e9qa-k6-anon --network host \
  -v /opt/src/proyekkas-wt/e9qa/apps/web/tests/load:/load:ro -v $S/out:/out:rw -e MODE=anon \
  grafana/k6 run --quiet /load/q34-mix.js
# pemantau (tiap 5 s): docker stats drms-pk-stg, worker, postgres, traefik, crowdsec, keycloak, odoo-pool-a,
# web-expomedia-prod, control-plane + /proc/loadavg + probe prod https://cp.bimacreative.tech/ dan
# https://auth.bimacreative.tech/realms/platform/.well-known/openid-configuration
# Nanti (auth): -e MODE=auth -e FIELD_USERS='[…]' -e OFFICE_USERS='[…]' -e PROJECT_ID= -e STAGE_ID= -e LAT= -e LNG=
```

### 2.3 Hasil `MODE=anon` (23:14:59–23:24:50 WIB)

2 566 request (4,35 req/s), 674 iterasi, **checks 100%**, `act_errors` 0%, **HTTP 429: 0**, 403 WAF: 0.
(`http_req_failed` 46,5% = status 401/302 yang memang diharapkan.)

| Aksi | n | p50 | p95 | maks |
|---|---:|---:|---:|---:|
| `GET /api/v1/health` | 508 | 10 ms | 25 ms | 112 ms |
| `GET /api/v1/app/config` (publik, DB) | 508 | 11 ms | 27 ms | 212 ms |
| `GET /admin/login` (SSR panel) | 178 | 44 ms | **109 ms** | 562 ms |
| `GET /admin` → 302 | 178 | 8 ms | 15 ms | 75 ms |
| API tanpa token → 401 | 686 | 10 ms | 25 ms | 65 ms |
| Unggah multipart tanpa token → 401 | 508 | 20 ms | 46 ms | 304 ms |
| Aksi utama terautentikasi (check-in, progress + foto, draft, dashboard, inbox, laporan) | 0 | — | — | — (blocker §2.1) |

### 2.4 Sumber daya (sampel 5 s, 87 sampel)

| Container | Awal | Puncak | % limit | CPU puncak |
|---|---:|---:|---:|---:|
| `drms-pk-stg` (web, 384 MiB) | 91,2 MiB | **111,7 MiB** | **29,1%** (ambang flag 307 MiB) | 33% |
| `drms-pk-stg-worker` (192 MiB) | 59,1 MiB | **69,9 MiB** | **36,4%** | 8% |
| `postgres` (2 GiB) | 204,6 MiB | 212,4 MiB | 10,4% | 13% |
| `traefik` (256 MiB) | 71,0 MiB | 102,6 MiB | 40,1% | 13% |
| `crowdsec` (384 MiB) | 115,6 MiB | 150,6 MiB | 39,2% | 31% |
| `keycloak` / `odoo-pool-a` / `web-expomedia-prod` / `control-plane` | — | tidak berubah berarti | ≤ 31% | ≤ 26% |

Load average host (4 vCPU) maks **1,85**. Probe prod (174 sampel): semua 200/307, p50 44 ms, p95 77 ms, maks 201 ms →
**tidak ada degradasi prod**, run tidak perlu dibatalkan. Log app selama run: tidak ada `error`, tidak ada token/
`Authorization`/password (ASVS 7.1.2 — sampel kecil).

**Catatan:** RAM web tanpa beban sharp jauh di bawah ambang. Spike F1 (ADR 0002 §6) mencatat puncak 205 MiB untuk 10 VU +
foto 12 MP; jalur unggah terautentikasi (resize foto progress/selfie) adalah risiko RAM utama yang **belum** diukur di E9.

### 2.5 Yang dibutuhkan untuk menutup AC load test

1. Lead/user: sediakan akun uji staging untuk beban (usulan: 30 akun lapangan fiktif `lapangan01…30.uji@proyekkas.test`
   + 5 kantor, peran sesuai, ditugaskan ke PRJ-UJI-01, **tanpa OTP** di realm staging atau dengan cara TOTP yang disepakati)
   dan serahkan kredensial lewat env run (bukan repo).
2. Admin staging: aktifkan `syncAttendanceEnabled` + `syncProgressReportsEnabled`; catat `PROJECT_ID`, `STAGE_ID`, titik
   geofence.
3. QA: `MODE=auth` sesuai §2.2 sambil memantau RAM; bila web > 307 MiB → flag sesuai §6 rencana (naik 512 MiB setelah
   persetujuan user, atau resize dipindah ke worker).
4. Data uji yang akan tercipta: absensi (1 check-in/akun/hari), laporan progress + foto, draft pengajuan yang langsung
   dibatalkan. Laporan progress tidak bisa dihapus lewat app (by design) → dicatat, data staging fiktif.

Data uji yang dibuat run ini: **tidak ada** (semua request anon ditolak sebelum menulis data).

## 3. Restore drill (DB + media)

### 3.1 Langkah & perintah

1. Snapshot keadaan live (jumlah baris per tabel semua skema non-sistem, sha256 semua file media volume
   `drms_pk_media_stg`).
2. Backup baru memakai tooling platform (prosedur manual resmi `backup.md` §Menjalankan manual):
   `systemctl start restic-backup.service` 23:10:43 → `RESULT status=ok dbs_ok=10` 23:11:02; snapshot
   `c35a41c3` (`db:pk_drms_stg`, 1,344 MiB) dan `38682a6d` (`files`, termasuk volume media).
3. Keadaan live diukur ulang setelah backup → **identik** dengan langkah 1 (staging diam), jadi pembanding sah.
4. Restore terukur (RTO):
   ```bash
   /opt/infra/scripts/restore.sh pk_drms_stg pk_drms_restoretest --snapshot c35a41c3
   #   → RESULT status=ok db=pk_drms_stg target=pk_drms_restoretest snapshot=c35a41c3 seconds=4
   restic restore 38682a6d --target <scratch>/drill/media-restore \
     --include /var/lib/docker/volumes/drms_pk_media_stg/_data      # 56 file/dir, 413 KiB
   ```
5. Verifikasi, lalu `DROP DATABASE pk_drms_restoretest` (dicek: 0 baris di `pg_database`) dan hapus direktori sementara.

### 3.2 Hasil

| Pemeriksaan | Live | Restore | Hasil |
|---|---:|---:|---|
| Tabel (semua skema non-sistem) | 68 | 68 | cocok |
| Total baris (`count(*)` per tabel, dibandingkan per tabel) | 2 078 | 2 078 | **cocok (diff kosong)** |
| Sequence (`pg_sequences.last_value`) | 58 | 58 | cocok |
| File media (sha256 per file) | 46 | 46 | **cocok (diff kosong)** |
| Owner/mode file media | — | — | cocok |

| Waktu | Detik |
|---|---:|
| Restore DB (`restore.sh`, termasuk CREATE DATABASE + `restic dump \| pg_restore`) | 5,1 |
| Restore media (`restic restore`) | 0,7 |
| Verifikasi | 0,3 |
| **Total RTO terukur** | **6,1 s** (≪ 4 jam) |

### 3.3 Catatan & temuan

- R-1 (Low, infra): `restore.sh --filestore` hanya mengenal tata letak Odoo (`<vol>/_data/filestore/<db>`), tidak
  berlaku untuk volume media ProyekKas (root volume) → drill memakai `restic restore --include <root volume>` langsung.
  Usul: opsi `restore.sh --volume <vol> <target_dir>` + cakupan media di `restore-test.sh` (sudah tercatat di
  `backup.md`: "restore-test.sh belum menguji file media").
- R-2 (Info): data staging kecil (1,3 MiB dump, 413 KiB media), jadi RTO ini membuktikan prosedur, **bukan** kapasitas.
  Estimasi prod (`fase1-golive.md` §6): ≈ 0,8 GB media/bulan → ulangi drill pada `pk_drms` + `drms_pk_media_prod` setelah
  go-live (verifikasi backup prod = bagian E9/E10 lain, belum ada karena prod belum di-deploy).
- R-3 (Info): repo restic masih lokal di disk yang sama (`backup.md` §RISIKO) — di luar scope E9 ProyekKas, tetap
  risiko platform (L4 remote belum aktif).
- Langkah ke volume **live** (menyalin media hasil restore ke `drms_pk_media_*`) tidak diuji (destruktif); prosedurnya
  sama dengan `backup.md` §File filestore (salin manual setelah dicek).

## 4. Pembaruan ASVS L1 (bagian ZAP)

Diterapkan di `security/asvs-l1-checklist.md` (§1 metode, baris terkait, §2 ringkasan, §6 celah, §7 pending, §8 baru):

| # | Sebelum | Sesudah | Bukti |
|---|---|---|---|
| 4.3.2 | Terpenuhi (verifikasi ZAP) | Terpenuhi — diverifikasi | `/.git/*`, `/.env`, `/package.json` 403; tanpa listing |
| 5.1.1 | Sebagian | Sebagian | Parameter ganda: nilai terakhir dipakai + zod; tidak seragam dengan `searchParams.get` (nilai pertama) |
| 7.4.1 | Terpenuhi | Terpenuhi — diverifikasi | REST generik & `/api/v1` mengembalikan pesan generik tanpa stack |
| 8.2.1 | Sebagian | Sebagian | HTML admin `no-store`; REST generik tanpa `Cache-Control` (M-3) |
| 9.1.2, 9.1.3 | Sebagian | Sebagian | TLS 1.2/1.3 saja; suite CBC di TLS 1.2 (M-2) |
| 14.3.3 | Sebagian | **Terpenuhi** | Tidak ada `Server`/`X-Powered-By` |
| 14.4.5 | Sebagian | Sebagian | HSTS ada, `max-age=604800`, tanpa `includeSubDomains` (M-1) |
| 14.5.1 | Sebagian | **Terpenuhi** | TRACE/TRACK/PROPFIND/PUT/DELETE di halaman → 403 (WAF), `v1()` terikat metode |
| 14.5.3 | Terpenuhi | Terpenuhi — diverifikasi | Tanpa `Access-Control-Allow-Origin` untuk origin asing |

Ringkasan berubah: Terpenuhi 80 → **82**, Sebagian 25 → **23** (total tetap 127). G-15 hampir tertutup (sisa 5.1.1),
G-08/G-07 terkonfirmasi dengan detail, G-17 tetap terbuka (load test terautentikasi).

## 5. Daftar temuan / bug

| ID | Severity | Pemilik | Ringkas |
|---|---|---|---|
| BLK-1 | **Blocker (proses)** | Lead/user | Tidak ada kredensial uji staging terdokumentasi + hanya ≤ 6 akun (rate limit per user) → load test & ZAP terautentikasi belum bisa |
| M-1 | Low | infra | HSTS 7 hari tanpa `includeSubDomains` |
| M-2 | Low | infra | TLS 1.2 menerima suite CBC/non-PFS |
| M-3 | Low | nextjs | REST generik `/api/<slug>` tanpa `Cache-Control: no-store` |
| R-1 | Low | infra | `restore.sh` tanpa mode restore volume media non-Odoo; `restore-test.sh` tanpa media |
| Z-1 | Low (diterima) | — | CSP `style-src 'unsafe-inline'` |
| Z-2 | Low | nextjs (opsional) | CORP pada aset statis |
| Z-3, Z-4, Z-5, M-4, M-5, R-2, R-3 | Info | — | lihat §1.4, §3.3 |

Tidak ada bug fungsional aplikasi dan tidak ada HIGH/CRITICAL. Tidak ada perubahan pada konfigurasi staging/prod,
Traefik, CrowdSec, Keycloak, atau kode aplikasi.

## 6. Kebersihan

Container `e9qa-zap-unauth`, `e9qa-zap-admin`, `e9qa-k6-anon` dihapus; tidak ada network baru (`--network host`);
DB `pk_drms_restoretest` di-drop; direktori restore media dihapus; tidak ada decision CrowdSec yang dibuat oleh uji ini.
Snapshot restic tambahan 23:10 (`c35a41c3`, `38682a6d`, dan snapshot DB lain dari run yang sama) akan dirapikan oleh
`restic-prune.timer` sesuai retensi 7d/4w/3m.
