# F0 Brief — shared context for all Phase 0 agents (written by Lead, 2026-09-23)

Read this file fully before starting. It overrides the Odoo-centric parts of
`reference/prompt-lead-proyekkas.md`.

## 1. Inputs
- `reference/proyekkas-kebutuhan-pengembangan.md` — requirements v1.0 (M01–M15, 5 roles, US-01..US-35, 18 masters, T1–T12, audit log §8, NFR §9).
- `reference/prompt-lead-proyekkas.md` — original lead prompt; section "Temuan tambahan dari form asli klien" items 1–10 are MANDATORY additions. Its Odoo architecture section is SUPERSEDED by §3 below.
- `reference/contoh-form-pengajuan-biaya-drms.jpg` — real client form "228/PB-DRMS/20/IX/2026" (view it). Seed/test case: 3 lines, grand total Rp 1.447.500:
  1. BBM Hilux Banjarmasin-Palangka, 1 "bulan", Rp 600.000 (receipt: Pertamina 21/09/2026 11:42, 24,80 L × 24.200, plate DA1234XY)
  2. Penginapan, 2 kamar, total 677.000 = user rounding of the hotel bill 676.876 (unit price 339.000 is display only; line total is the user-entered primary value — user decision 2026-09-23) (receipt: POP! Hotel Traveloka Rp 676.876 = 2 × 338.438, bought 20 Sep 2026)
  3. Makan siang Rp 170.500 (receipt: Soto "Mas Joko" 21/09/26 10:47, 170.500 incl. pajak restoran 15.500)
  Signatures: Diajukan Oleh "Budi, Doni" · Dibuat Oleh "Citra" · Diketahui Oleh "Budi Hartono" · Approval "sari". Transfer box: Mandiri, Doni Pratama, 1234567890123.
- `proyekkas-prototipe.html` was NOT provided. Do not invent its contents; mark dashboard layout details as "prototype not available".

## 2. User decisions (binding)
1. ProyekKas is built OUTSIDE Odoo. Scope = admin web (CRUD administration, "CMS" = admin page) + Android APK. Purpose emphasis: mobile progress monitoring, but the requirements doc scope (cash control incl.) still applies unless flagged as open question.
2. DRMS will likely migrate to Odoo after this phase → data must be mirrored to Odoo (one-way, CMS → Odoo) to ease transition. Design schema Odoo-friendly from day 1.
3. Keycloak: separate realm `drms`.
4. File storage: local volume first (no MinIO / S3 until needed). Images MUST be resized/compressed (device-side AND server-side) to save disk. Keep an S3-compatible abstraction so switching later is config-only.
5. Coordinate with other Claude sessions only when work overlaps (shared Keycloak, Traefik, Postgres cluster, backup, Odoo pool). Phase 0 = documents only; do NOT change any running service, container, DB, or file outside `/opt/src/proyekkas`.
6. Language: code, commits, technical docs (architecture, ADRs, plans) in ENGLISH. Business requirements doc v1.1 and client questions in BAHASA INDONESIA (same as v1.0). All UI text Bahasa Indonesia. Rupiah format `Rp 1.447.500`. Default TZ `Asia/Makassar`, configurable.

## 3. Architecture direction (Lead proposal — ADRs must validate or challenge with evidence)
- **Backend + admin**: Payload CMS 3 (`payload` 3.90.1, MIT, published 2026-09-18) inside a Next.js app. Verified: `@payloadcms/next@3.90.1` peer `next >=16.3.3 <17`; platform pins `next@16.3.6`, Node 24 (alpine). DB adapter `@payloadcms/db-postgres@3.90.1` (Drizzle-based). `sharp@0.35.4` Apache-2.0 for image processing.
  - Payload admin panel = CRUD admin for Admin/Finance/Owner. Custom dashboard views/pages for role dashboards.
  - Business logic (state machines, guards) server-side in Payload hooks/access control + custom endpoints/services. Never trust UI.
- **Mobile**: Flutter APK (Staff, PM, Owner quick approval) → REST API.
- **DB**: new databases `pk_drms` (prod), `pk_drms_stg` (staging) — renamed from `drms_proyekkas_*` because that name matched Odoo dbfilter/pg_hba patterns (ADR 0006) in the shared Postgres 16.15 cluster (container `postgres`, network `db`).
- **Auth**: Keycloak 26.7.4 realm `drms`, OIDC Authorization Code + PKCE for web and APK. Remote logout via Keycloak session revocation.
- **Jobs/cron**: pg-boss (already used by control plane, `pg-boss@12.33.6`) or Payload Jobs Queue — ADR decides.
- **Odoo mirror (later phase)**: outbox table → worker → Odoo 19 JSON-2 API `POST /json/2/<model>/<method>` with bearer API key. Verified in container source `odoo/addons/rpc/controllers/json2.py` (`auth='bearer'`); `/xmlrpc`, `/xmlrpc/2`, `/jsonrpc` deprecated in 19 and scheduled for removal in Odoo 22 (`rpc/controllers/__init__.py`). Modules present in image: `hr_expense`, `project`, `hr_attendance`, `account`, `analytic`, `fleet`, `uom`, `l10n_id`.
- **Push**: FCM (needs ADR — third-party Google service).

### Proposed Payload collection slugs (use these names consistently; ADR may refine)
Masters: `users`, `employees`, `employee-bank-accounts`, `banks`, `clients`, `vendors`, `projects`, `project-stages`, `stage-templates`, `budget-lines`, `expense-categories`, `cash-in-sources`, `cash-accounts`, `team-assignments`, `work-schedules`, `holidays`, `approval-rules`, `notification-templates`, `uoms` [form], `vehicles` [form], `cost-centers` [form], `document-sequences`, global `company-settings`.
Transactions: `expense-requests` (T1, with `lines`), `approvals` (T2, incl. signature position), `transfers` (T3), `receipts` (T4), `settlements` (T5 LPJ), `cash-entries` (T6/T7 ledger, direction in/out), `cash-reversals` (T8), `period-closings`, `attendances` (T9), `attendance-corrections` (T10), `progress-reports` (T11), `budget-addenda` (T12).
System: `audit-logs`, `devices`, `notifications`, `media-*` upload collections (split by resize policy: receipts, selfies, transfer-proofs, progress-photos, signatures, company-logo), `odoo-outbox`.
Custom API namespace for domain actions and mobile: `/api/v1/...` (e.g. `POST /api/v1/expense-requests/{id}/submit`, `/approve`, `/reject`, `/transfer`, `/lpj/submit`, `/settle`, `POST /api/v1/cash-entries/{id}/void`, `POST /api/v1/attendance/check-in`, `POST /api/v1/sync/batch`). ADR on API decides whether Payload's own REST (`/api/<slug>`) is exposed to the APK or only `/api/v1`.

## 4. Environment facts (observed 2026-09-23)
- Host 4 vCPU, 15,6 GiB RAM, disk 193 G (20 G used). Per `/opt/infra/docs/adr/0004-capacity.md` only ≈ 2,5 GiB RAM left for all client workloads.
- Running: traefik v3.7.13, crowdsec v1.8.1, postgres 16.15-bookworm, keycloak 26.7.4 (optimized image `infra/keycloak:26.7.4-optimized`), odoo-pool-a + odoo-staging `odoo:19.0-20260908`, control-plane (Next.js 16.3.6 + next-auth 5.0.0-beta.32 + Drizzle 0.45.3 + pg-boss + zod 4.6.5, Vitest, Playwright), whoami (temp). <!-- gitleaks:allow — version/image-tag list, no credential -->
- Postgres DBs: `demo_demo`, `demo_staging`, `keycloak`, `control_plane`, `datamart`. No DRMS anything exists yet.
- Platform rules: `/opt/infra/CLAUDE.md` (anti-hallucination §0, docker rules §3.5, security baseline §3.6, CI/CD §3.7, capacity §4). Existing ADRs: `/opt/infra/docs/adr/0001..0006`. Backup: restic, `/opt/infra/docs/adr/0006-backup.md`.
- Existing repos have NO git remote configured yet.

## 5. Rules for every agent
- Follow `/opt/infra/CLAUDE.md` §0 strictly. Every version, option name, API, field name must come from something you read/fetched in this session (npm registry, pub.dev API, official docs, GitHub source at the pinned tag, or source inside the running container). Otherwise write **BELUM TERVERIFIKASI** / "UNVERIFIED".
- Read-only on the whole VPS except writing your assigned files under `/opt/src/proyekkas/docs/proyekkas/`. `docker exec ... cat/ls/grep` read-only is fine. No `docker run`, no DB writes.
- Do NOT git commit. Lead commits.
- ADR template: `/opt/infra/docs/_templates/adr.md` (Context, Decision, Alternatives, Consequences, Security implications, Rollback). Status `proposed`.
