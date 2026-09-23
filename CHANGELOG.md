# Changelog

All notable changes to ProyekKas are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

F2a (expense request core) merged to `develop` (`c8c1af6`); F2b (LPJ/settlement, PDF, admin views,
notifications, file endpoint) in progress.

### Added
- **F2a expense request flow** (`apps/web`): collections `expense-requests` (+ lines), `approval-rules`,
  `approvals`, `expense-line-snapshots`, `receipts`, `receipt-flags`, `transfers`, `cash-entries`,
  `period-closings`; T1 state machines (advance, reimburse incl. "Nota Terverifikasi (Antri Transfer)",
  "Menunggu Diketahui", withdraw); approval rules (default Owner-only; "Diketahui" required, Q-07);
  receipts with validation flags; transfers posting exactly one KK; manual cash in/out; void/reversal
  numbered in the KM/KK series; monthly closing and Owner-only re-open of the latest closed period;
  `/api/v1` expense-request, cash and media endpoints + OpenAPI; `Idempotency-Key` (table `idempotency_keys`,
  72 h; required for the APK); historical number registration for the form-228 fixture without touching the
  live counter; audit actions `approve`, `reject`, `verify`.

### Changed
- ADR 0001, 0002, 0005, 0006, 0007, `architecture.md` (§5.2, G6, §9.1) and `phase-plan.md` updated with the
  F2a outcomes (Revision history in each; statuses stay accepted). Business dates stored as text `YYYY-MM-DD`.
- Build: `next build` skips its own type check (`typescript.ignoreBuildErrors`) because it OOMs at the 2 GiB
  build cap; `npm run typecheck` remains a required CI gate before the image build.
- **Onboarding/staging prerequisite:** set the PM on every project and the manager on every cost center —
  with the default approval rule, submit returns 409 until the "Diketahui Oleh" party can be resolved.

### Fixed
- Image uploads to `media-transfer-proofs`, `media-attachments` and `media-progress-photos` always failed:
  the WebP thumbnail was rejected by the collections' `mimeTypes`; these now use a JPEG thumbnail.

### Security
- DB guards (F2a security migration): request content frozen outside Draft/Revisi Nota via `content_hash` +
  DEFERRED constraint triggers (child tables `expense_requests_lines/_rels` keep DELETE only for Payload's
  rewrite); `approvals` and `expense_line_snapshots` append-only (Class A, G1 in the DB); Class B guards on
  receipts, transfers (amount = approved amount), cash entries and period closings; period lock trigger.
- Payload 3.90.1 swallows COMMIT errors (`@payloadcms/drizzle` `commitTransaction`) → deferred checks are
  forced inside every app-owned transaction so a violation fails the request instead of silently rolling back.

## [0.1.0] - 2026-09-23

F0 design + F1 foundation (GATE F1 approved by the user 2026-09-23). Staging runs image `0.1.0-stg-f8529e6`
at `https://drms-kas.staging.bimacreative.tech`; first admin login (password + TOTP) and real SMTP delivery verified.

### Added
- **F0 discovery & design** (GATE F0 approved by user 2026-09-23): requirements v1.1, open client questions,
  traceability matrix, `docs/proyekkas/architecture.md`, ADR 0001–0011 (accepted), phase plan F0–F7
  (`docs/proyekkas/`). Recorded user decisions: build outside Odoo on Payload CMS 3; DB names
  `pk_drms`/`pk_drms_stg`; hostnames `drms-kas.bimacreative.tech` / `drms-kas.staging.bimacreative.tech`;
  expense-request numbering never resets (start 229); receipt originals discarded after resize; 14-day
  offline session idle.
- **F1 spike week** (`apps/web`, report `docs/proyekkas/spikes/f1-spike-report.md`): Payload 3.90.1 +
  Next 16.3.6 scaffold (npm workspaces), OIDC-only admin login (`oidcSession`), `mobileBearer` on
  `/api/v1/me`, append-only `audit_logs` migrations, in-transaction numbering, jobs worker bundled outside
  Next (`dist/worker.mjs`), nonce CSP proxy, receipt resize (≤ 2000 px JPEG q82, `sha256Original`),
  production Dockerfile (webpack build). Spike-only code (`apps/web/spike/**`, `spike-*` collections/tasks)
  is to be removed in F1.
- **F1 foundation** (`develop` `e2bf46b`): masters, users/role sync via the Keycloak Admin API, devices,
  web-sessions, append-only audit + `pk_protect_columns` migrations, numbering with `number_issued` audit,
  media collections, `/api/v1` skeleton + `packages/api-contract/openapi.json`, idempotent seed (fictional
  default data; real data only via `SEED_DATA_FILE` at deploy time, existing rows never overwritten),
  `deploy/staging/` compose, CI workflow. Spike-only code removed.
- **Staging deployed** at `https://drms-kas.staging.bimacreative.tech` (infra Lead,
  `/opt/infra/staging/drms-proyekkas/`): separate web (640m) + worker (320m) + one-shot migrate; images built
  locally on the VPS until GHCR (temporary). Measured idle RAM web 82 MiB, worker 47 MiB.
- **Outbound email (SMTP)**: `@payloadcms/email-nodemailer` 3.90.1 (MIT; nodemailer 9.1.1 MIT-0) configured
  from `SMTP_HOST/PORT/USER/FROM_ADDRESS/FROM_NAME` + `SMTP_PASSWORD_FILE` (all-or-nothing, From must equal
  `SMTP_USER`; STARTTLS required on 587, certificate verification on). From is forced by the adapter. Mailbox
  limit 30/h (burst 10) → DB-backed token bucket `mail_rate_buckets` shared by web + worker (burst 5, 24/h,
  ≤ 29 in any hour). Mails go through the Jobs queue (`sendEmail`, worker, retried with backoff; input holds
  the user id, not the address). `POST /api/v1/admin/test-email` (Admin, own address, audited `email_test`,
  3/h). REST `/api/payload-jobs/*` closed (worker uses the Local API). Without SMTP_* → console adapter.
- Public GitHub repository `bctech-adm/drms`; CI green on the first run (run 35857158248, commit `e2bf46b`).

### Changed
- ADR 0001, 0002, 0003, 0006, 0007 and `architecture.md` revised with the F1 spike results and the user
  decisions of 2026-09-23 (see each document's Revision history): Payload 3.90.1 = GO; admin CSP
  `style-src 'self' 'unsafe-inline'`, scripts nonce-strict without `'strict-dynamic'`, `form-action 'self'
  https://auth.bimacreative.tech`; no `json`/`code` field editors in the admin; Keycloak offline session max
  lifespan 30 days (+ 14-day idle); app reaches Keycloak via the public issuer (hairpin) on network
  `drms-kas-edge`; back-channel logout disabled; cron evaluated in process `TZ=Asia/Makassar`; measured
  RAM (web idle 108 / peak 205 MiB, worker idle 47 / peak 51 MiB), limits kept until F6.
- `phase-plan.md`: F1 spike gate passed; F1 item 7 (infra) done — infra `main` commit `c557c28`.
- ADR 0002, 0003, 0004, 0006, 0007, `architecture.md` and `phase-plan.md` updated with the F1 foundation
  outcomes (Revision history in each): staging topology as deployed (ADR 0002 §7; pools 5 + 3 + 2 ≤
  CONNECTION LIMIT 10); Keycloak role lookup via `role-mappings/realm/available`, service account
  `manage-users` + `view-users` only, Admin API via internal networks `drms-kc-admin[-stg]`, first staging
  admin bootstrap; `action` enum + `user_roles` text; role names derived from `current_user`; counter
  monotonic trigger. Remaining F1: `HEAD` health (in progress), SMTP adapter (pending infra), F1 gate review.

### Fixed
- Docs: company-logo media slug is `media-company` (was `media-company-logo` in `requirements-v1.1.md` and
  `traceability-matrix.md`).

### Security
- **Public-repo sanitization**: client reference inputs (form image, requirements v1.0, lead prompt) removed
  from the tree (held by the project Lead, `docs/proyekkas/reference/README.md`); person names, bank account,
  receipt/transaction numbers, vehicle plate and vendor name in docs/seed/tests replaced by fictional
  pseudonyms (amounts, dates and analyses unchanged). Seed accepts the real master data from an untracked
  JSON file via `SEED_DATA_FILE` (zod-validated, same shape as the default data).
- Every upload collection must carry the remote-URL guard hook: `pasteURL: false` alone does not stop
  Payload 3.90.1 from fetching a remote `{filename,url}` on REST create (SSRF; spike §h).
- `admin.avatar: 'default'` (no gravatar request leaking `md5(email)`).
- APK bearer tokens are never authenticated on Payload generic REST (`/api/<slug>` → 403 or `{user:null}`);
  Traefik strips `Authorization` outside `/api/v1` (staging routers live).
