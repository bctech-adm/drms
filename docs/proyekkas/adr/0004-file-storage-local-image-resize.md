# ADR 0004 — File storage: local volume now, S3-compatible later; server-side image resize

- **Status:** accepted (user, GATE F0 2026-09-23) 
- **Date:** 2026-09-23
- **Author:** Analyst/Architect — Phase 0
- **Related:** brief §2 #4; requirements v1.0 §9 ("File"); `/opt/infra/docs/adr/0006-backup.md`;
  `/opt/infra/scripts/backup.sh`, `/opt/infra/scripts/lib/restic-common.sh`; ADR 0001, 0002, 0008;
  `../architecture.md` §9; mobile ADR `0010-*.md` (device-side compression)

## Context

### Verified (Payload tag v3.90.1, fetched 2026-09-23)
- Upload collection options (`docs/upload/overview.mdx`): `staticDir`, `imageSizes`, `resizeOptions`,
  `formatOptions` (`{format, options}`), `trimOptions`, `constructorOptions`, `withMetadata`,
  `mimeTypes`, `adminThumbnail`, `crop`, `focalPoint`, `pasteURL` (default **enabled**; `false` disables),
  `filesRequiredOnCreate`, `disableLocalStorage`, `handlers`, `modifyResponseHeaders`,
  `allowRestrictedFileTypes`, `bulkUpload`, `hideRemoveFile`, `filenameCompoundIndex`.
- Global upload limits (`upload.limits`, Busboy): defaults `requestSizeLimit` 50 MiB, `fileSize` 20 MiB,
  `files` 3, `fields` 20, `fieldSize` 1 MiB; `useTempFiles` to stream to disk instead of RAM.
- Source `packages/payload/src/uploads/generateFileData.ts`: when any of `resizeOptions|formatOptions|
  trimOptions|constructorOptions` is set, the **uploaded original itself** is processed:
  `sharp(...).rotate()` (EXIF auto-orient) → `.resize(resizeOptions)` → `.toFormat(...)` → `.trim(...)`;
  metadata only kept when `withMetadata` is set (`optionallyAppendMetadata.ts`). ⇒ **the unprocessed
  original is not stored.**
- sharp 0.35.4 (`docs/src/content/docs/api-output.md`, `api-resize.md`, tag `v0.35.4`): default output
  strips all metadata incl. EXIF/ICC (converted to sRGB) unless `keepMetadata()`; `jpeg` options
  `quality` (default 80), `mozjpeg` (bool); `webp` `quality` (80), `effort` (0–6, default 4);
  `png` `compressionLevel` (6), `palette`, `quality`, `effort`; resize `fit` `inside`,
  `withoutEnlargement`.
- File access: "All files … automatically support the `read` Access Control function from the Collection"
  (`docs/upload/overview.mdx` §Access Control) — files are served through Payload, not a public dir.
- Storage adapters: `@payloadcms/storage-s3@3.90.1` exists (MIT; deps `@aws-sdk/client-s3`, `lib-storage`,
  `s3-request-presigner`, `@payloadcms/plugin-cloud-storage@3.90.1`) — registry. Options `signedDownloads`
  (presigned URLs, per collection, `shouldUseSignedURL`), `clientUploads`, `disablePayloadAccessControl`,
  `generateFileURL` (`docs/upload/storage-adapters.mdx`). **No signed-URL feature for local disk.**
- PDF engine (ADR 0008) `@react-pdf/image@3.1.2` accepts only **JPEG, PNG, SVG** (`isValidFormat` in
  `lib/index.js`) → images embedded in PDFs must be JPEG/PNG.
- CrowdSec AppSec in Traefik: `crowdsecAppsecBodyLimit: 10485760` (10 MiB) (`/opt/infra/traefik/dynamic/
  middlewares/crowdsec.yml`) → keep any single request ≤ 10 MiB (behaviour above the limit not verified).
- Backup: `backup.sh` dumps **all** DBs dynamically but only backs up volumes listed in
  `FILESTORE_VOLUMES=(odoo_pool_a_data odoo_staging_data)` and expects a `filestore/` subdir
  (`restic-common.sh` L19, `backup.sh` L58–65) → ProyekKas media would **not** be backed up today.

## Decision

### 1. Storage now: local named volumes via Payload local storage
- Volumes `drms_pk_media_prod`, `drms_pk_media_stg` mounted at `/data/media` (rw) in web + worker.
- One upload collection per resize policy; `staticDir: /data/media/<slug>`; file names = server-generated
  UUIDv4 + extension (via `beforeOperation` renaming `req.file.name` — pattern verified in docs).
- **Abstraction for S3 later:** all app code reads/writes files only through Payload (Local API /
  upload fields) or a thin `FileStore` port (`read(collection, filename)`) used by the PDF renderer.
  Switching = add `@payloadcms/storage-s3@<pinned 3.x>` plugin with `collections: {…}` + env
  (endpoint/bucket/keys) + one-off copy of `/data/media` to the bucket. No schema change.

### 2. Media collections and targets (device compresses first — ADR 0010; server enforces)

| Collection | Content | `mimeTypes` (in) | `resizeOptions` (original) | `formatOptions` | `imageSizes` | Est. stored size |
|---|---|---|---|---|---|---|
| `media-receipts` | receipt photos/screenshots (US-07, reimburse at submit) | image/jpeg, image/png, image/webp, image/heic? (HEIC decode support in prebuilt sharp **UNVERIFIED** → APK sends JPEG) | `{width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true}` | `jpeg {quality: 82, mozjpeg: true}` | `thumb` 320 px webp q70 | ≈ 250–450 KB + 15 KB (ESTIMATE) |
| `media-transfer-proofs` | bank transfer proof (US-20) | image/jpeg, image/png, **application/pdf** (≤ 2 MB) | images: 1600 inside | `jpeg q80` | `thumb` 320 | ≈ 150–300 KB |
| `media-selfies` | attendance selfie (US-01) | image/jpeg | 720 inside | `webp {quality: 70}` | — | ≈ 30–60 KB |
| `media-progress-photos` | progress report photos (≤ 5/report, US-10) | image/jpeg | 1600 inside | `jpeg q78, mozjpeg` (JPEG so PDF reports can embed) | `thumb` 320 webp | ≈ 200–350 KB |
| `media-signatures` | user signature image / on-screen signature (form item 3) | image/png | 800×300 inside | `png {palette: true, compressionLevel: 9}` | — | ≈ 5–20 KB |
| `media-company` | company logo (PDF header) | image/png, image/jpeg | 600 inside | `png` | — | < 100 KB |
| `media-attachments` | other request attachments (quotes, PDFs) | application/pdf, image/jpeg, image/png | images 2000 inside | `jpeg q82` | `thumb` | ≤ 5 MB PDF |

Global: `upload.limits = { fileSize: 8 MiB, files: 5, fields: 30 }`, `requestSizeLimit: 10 MiB`
(fits AppSec 10 MiB); `pasteURL: false`, `crop: false`, `focalPoint: false` on every collection
(prevents SSRF and editing of evidence). `sharp.concurrency(1)` at boot (sharp `docs/src/content/docs/api-utility.md` §concurrency @v0.35.4) — note:
Payload uses the `sharp` instance passed in `buildConfig({ sharp })`, so configure that instance.
Legibility check for receipts: 2000 px long edge ≈ 170 dpi on a 30 cm thermal receipt — expected
legible (ESTIMATE); **F1 acceptance test** with the three receipts in the client form (Pertamina,
Soto Mas Joko, POP! Hotel screenshot) printed via the PDF (ADR 0008).

### 3. Keep or discard the original? → **Discard (Payload default when resizing)**, keep a fingerprint — **accepted by user 2026-09-23** (receipts kept at 2000 px long edge)
- Store `sha256Original` (hash of the bytes as received, computed in `beforeOperation` before sharp),
  `sha256Stored`, original width/height/size, `capturedAt` (device), `receivedAt` (server),
  `capturedLat/Lng` (from APK payload, **not** from EXIF — EXIF is stripped by sharp).
- Duplicate-receipt detection (form item 7) uses `sha256Original` + receipt no/vendor/amount.
- **Flag (client question):** Is the paper receipt the legal original (kept physically), making the
  digital copy a working copy? If DRMS needs pixel-original digital evidence, switch receipts to
  "keep original" = store original in a second, non-resized collection (+≈1–3 MB/photo).

### 4. Access control on files and time-limited URLs
- Each media collection `read` access returns a `Where` derived from the **owning document's** scope
  (e.g. receipt readable iff the parent expense-request is readable; selfies: own, PM of project, Finance
  for payroll, Owner/Admin). Media docs store `ownerDocType/ownerDocId` + `uploadedBy`.
- Files are fetched via `GET /api/<media-slug>/file/<filename>` (Payload-proxied, cookie auth for web). For
  the APK: `GET /api/v1/files/{collection}/{id}` with bearer (Traefik strips bearer on non-v1 paths).
- **Signed, time-limited URLs** (needed for: notification deep-links, `<img>` in contexts without
  headers): our own HMAC scheme `GET /api/v1/files/{collection}/{id}?exp=<unix>&sig=<base64url(HMAC-SHA256(
  key, collection|id|variant|exp|userId))>`; TTL 5 min; key rotated via env with 2-key overlap; still
  re-checks that `userId` has read access. Payload offers presigned URLs only for S3 (`signedDownloads`).
- Response headers via `modifyResponseHeaders`: `Cache-Control: private, no-store`,
  `X-Content-Type-Options: nosniff`, `Content-Disposition: inline` (PDF `attachment`).

### 5. Disk growth (ESTIMATE — client volumes are open questions)
Assumptions: 30 field staff, 22 workdays/month, 2 selfies/day; 150 expense requests/month × 4 receipts;
150 transfer proofs; 5 active projects × 22 reports × 4 photos.

| Stream | Monthly | Per year |
|---|---:|---:|
| Selfies 1 320 × 45 KB | 59 MB | 0.7 GB |
| Receipts 600 × (400 + 15) KB | 249 MB | 3.0 GB |
| Transfer proofs 150 × 250 KB | 38 MB | 0.45 GB |
| Progress photos 440 × (300 + 15) KB | 139 MB | 1.7 GB |
| **Total media** | **≈ 485 MB** | **≈ 5.8 GB** |
| Generated PDFs | 0 (rendered on demand, not stored; ADR 0008) | — |

Without server/device resize (typical 3–5 MB phone photos) the same volume would be ≈ 8–12× larger.

### 6. Backup (restic, platform ADR 0006)
- DBs `…drms…` are picked up automatically by `backup.sh` (dynamic `pg_database` list).
- **Required infra change:** add a generic `MEDIA_VOLUMES` list (volume root, no `filestore/` subdir) →
  `drms_pk_media_prod` (staging media optional). Order stays: DB dump first, files second.
- Reconciliation job `media.orphanSweep` (weekly) reports DB rows whose file is missing (possible after a
  restore when uploads happened between dump and file snapshot) and files without rows (never auto-delete
  evidence; report only).

## Alternatives

| Alternative | Rejected because |
|---|---|
| MinIO now (original lead prompt) | User decision #4: no MinIO until needed; +RAM (not budgeted) |
| Keep originals + derived sizes | 8–12× disk; EXIF GPS/PII retained; no requirement (pending client answer) |
| Client-side resize only | Server must not trust clients (brief §3); APK bugs/old versions would bloat disk |
| Store WebP for receipts | Not embeddable by `@react-pdf/renderer` (JPEG/PNG only) → extra conversion at PDF time |
| Public static dir + unguessable names | No access control; violates least privilege |

## Consequences

- Deterministic, small files; EXIF (incl. GPS) removed server-side — location evidence comes from explicit
  API fields instead.
- Server CPU spikes on upload (sharp); bounded by sharp concurrency 1 and 10 MiB request cap.
- Loss of the unprocessed original is irreversible for receipts (flagged to client).

## Security implications

- MIME allow-lists + sharp re-encode neutralise most polyglot/malformed-image payloads; PDFs are **not**
  re-encoded → size cap, `Content-Disposition: attachment`, never rendered inline in admin without
  sandbox; ClamAV optional later (CLAUDE.md §3.6 "opsional").
- `pasteURL: false` everywhere (SSRF). Filenames server-generated (path traversal).
- HMAC URL key compromise → attacker still needs a valid `userId` with access (re-check) — defence in depth.

## Rollback

Resize policy is config per collection → revert to previous config (new uploads only; existing files
unchanged). Storage switch to S3 is reversible by copying objects back to the volume and removing the
plugin. Backup change is additive.

## Proposed CLAUDE.md changes (need user approval; author does not edit)

None (backup script change goes to platform ADR 0006 revision by infra-engineer).
