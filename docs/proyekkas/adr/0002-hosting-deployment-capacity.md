# ADR 0002 — Hosting, deployment, repo layout, jobs and capacity

- **Status:** accepted (user, GATE F0 2026-09-23); revised 2026-09-23 after the F1 spike (user-approved) and the F1 foundation / staging deploy (see Revision history)
- **Date:** 2026-09-23
- **Author:** Analyst/Architect — Phase 0
- **Related:** `/opt/infra/CLAUDE.md` §3.1, §3.5, §3.7, §4; platform ADR `/opt/infra/docs/adr/0004-capacity.md`
  (client budget ≈ 2 568 MiB), `0006-backup.md`; `/opt/src/control-plane/{docker-compose.yml,Dockerfile,README.md}`;
  `/usr/local/sbin/infra-deploy`; ADR 0001, 0004, 0006 (this folder); `../architecture.md` §3, §13

## Context

Observed 2026-09-23 (read-only):
- Host: 15 992 MiB RAM, `free -m` available 13 049 MiB, disk `/` 27 G used / 193 G (`free -m`, `df -h /`).
- `docker stats --no-stream`: odoo-pool-a 283.9 MiB, odoo-staging 204.8 MiB, keycloak 480.2 MiB,
  postgres 193.9 MiB, control-plane 56.9 MiB (limit 384m), control-plane-worker 28.2 MiB (limit 256m),
  traefik 38.3 MiB, crowdsec 80.0 MiB. Networks: `proxy`, `db`, `odoo-edge`, `crowdsec`.
- Platform ADR 0004 §Decision 2: **≈ 2 568 MiB** left for *all* client workloads (upper-bound planning
  on `mem_limit`), and recommends planning ≤ 4 small client web containers until measured.
- control-plane pattern (read): one image, three commands (web `node server.js`, worker, one-shot migrate),
  `node:24.21.0-alpine@sha256:ebfe2f90…`, uid 1001, `read_only: true`, `tmpfs`, `cap_drop: [ALL]`,
  `no-new-privileges`, json-file logs 10m×3, web on `db`+`proxy`, worker on `db` only.
- `infra-deploy <stack>` (read): validates stack name, requires root-owned compose not group/other
  writable, runs `docker compose pull && up -d --remove-orphans` under `/opt/infra/<stack>`. It has **no
  migration step** and no health-gated rollback yet ("ditambahkan di task CI/CD").
- Compose spec supports `depends_on.condition: service_completed_successfully`
  (`raw.githubusercontent.com/compose-spec/compose-spec/main/05-services.md` L420).
- sharp 0.35.4 prebuilt binaries support Linux x64 **musl ≥ 1.2.5** (sharp `docs/.../install.md` @v0.35.4);
  the running node:24 alpine image has **musl 1.2.6**, Alpine 3.24.2 (`docker exec control-plane` read-only).
  sharp docs: musl-based systems are unaffected by the glibc allocator fragmentation issue.
- Payload Jobs: `autoRun` is for dedicated servers; `payload jobs:run` bin; Local API
  `payload.jobs.run()` / `handleSchedules()` (ADR 0001 sources).
- No measured RAM figure for a Payload 3 admin app exists in this session → all app RAM numbers below
  are **ESTIMATE**.

## Decision

### 1. Repository layout (monorepo `proyekkas`, already at `/opt/src/proyekkas`)

```
proyekkas/
  apps/web/            Next.js 16.3.6 + Payload 3.90.1 (admin, /api/v1, jobs worker entry)
    src/collections/   Payload collections (one file per slug)
    src/domain/        framework-neutral services: state machines, guards, numbering, ledger
    src/api/v1/        custom endpoints + zod schemas (OpenAPI source)
    src/jobs/          Payload tasks/workflows
    src/pdf/           @react-pdf/renderer templates (ADR 0008)
    src/migrations/    Payload/Drizzle migrations + raw SQL (roles, triggers — ADR 0006)
  apps/mobile/         Flutter APK (flutter-developer; ADR 0010)
  packages/api-contract/  generated openapi.json (committed, diffed in CI) + generated Dart client
  deploy/              compose templates (prod, staging), .env.example — rendered into /opt/infra/…
  docs/proyekkas/      requirements, architecture, ADRs
```
No npm workspace coupling to `apps/mobile`; `packages/api-contract` is the only shared artifact.

### 2. Containers (one image `ghcr.io/<org>/proyekkas-web:<semver>`, several commands)

| Service | Env | Command | Networks | mem_limit | cpus | Notes |
|---|---|---|---|---:|---:|---|
| `drms-pk-web` | prod | `node server.js` | `proxy`, `db` | **640m** | 0.75 | Next standalone + Payload admin + `/api/v1`; sharp resize; synchronous single-doc PDF (ADR 0008) |
| `drms-pk-worker` | prod | `node dist/worker.mjs` (loop: `payload.jobs.handleSchedules()` + `payload.jobs.run()`) | `db`, `proxy`* | **320m** | 0.25 | notifications/FCM, reminders cron, Odoo outbox (ADR 0009), report exports. *`proxy` only for egress to FCM/Odoo/Keycloak — if egress can be done without `proxy`, drop it |
| `drms-pk-migrate` | prod | `payload migrate` (image target `migrate`, full deps + tsx) | `db` | 384m | 0.5 | one-shot, `restart: "no"`; web/worker `depends_on: {drms-pk-migrate: {condition: service_completed_successfully}}` |
| ~~`drms-pk-stg`~~ | staging | ~~`node server.js` with Payload `autoRun` jobs in-process~~ | — | ~~512m~~ | — | **superseded by §7** (F1 foundation): staging runs separate web + worker like prod |
| `drms-pk-stg-migrate` | staging | as prod migrate | `db` | 384m | 0.5 | one-shot |

> The staging topology **as deployed** is in §7; the rows above are the F0 decision.

Worker entry (**verified in the F1 spike**, report §e): `node apps/web/dist/worker.mjs` — an esbuild bundle
(`apps/web/scripts/build-worker.mjs`) of `src/worker/index.ts`, which imports `payload.config.ts` directly and
loops `payload.jobs.handleSchedules({allQueues:true})` + `payload.jobs.run({allQueues:true, limit:10})` every
30 s, writing a heartbeat file. It runs from the **runner image** (no tsx, no Next server), resolving externals
(`sharp`, `pg-native`, `drizzle-kit`, `next`, `react`, …) from the standalone `node_modules`. Healthcheck =
heartbeat file age < 90 s. Env **`TZ=Asia/Makassar`** on the worker (and on the web, §7), see §4.
Throughput at the default 10 jobs / 30 s tick ≈ 20 jobs/min → tune `limit`/interval in F1. The fallback
(`payload jobs:run --cron` from the migrate image) is no longer needed.

Hardening (every service, per CLAUDE.md §3.5, copied from control-plane): `restart: unless-stopped`
(migrate: `"no"`), `user: "1001:1001"`, `read_only: true`, `tmpfs: /tmp` (+ `/app/.next/cache` on web),
`cap_drop: [ALL]`, `security_opt: [no-new-privileges:true]`, json-file 10m×3, healthcheck (web:
`GET /api/v1/health`; worker: heartbeat file like control-plane), `mem_limit`/`cpus`, no published ports.
`NODE_OPTIONS=--max-old-space-size=<~70% of limit>` (web 448, worker 224, stg 352 — ESTIMATE, tune in F1).
Media volumes (ADR 0004): `drms_pk_media_prod` → `/data/media` (rw) on web+worker; `drms_pk_media_stg`.

### 3. Placement on host

- **Network (infra, live 2026-09-23):** the web containers join the dedicated edge network
  **`drms-kas-edge`** (`10.100.7.0/24`, gateway `10.100.7.1`, not `--internal` so the app has egress), whose
  only other member is `traefik` — **not** `proxy` (infra runbook `/opt/infra/docs/runbooks/proyekkas-drms-onboarding.md`
  §Langkah 0, infra `main` commit `c557c28`). The app does **not** reach `keycloak:8080`; see ADR 0003 §6.
  The table in §2 still says `proxy` for readability of the F0 decision; read it as `drms-kas-edge`. Egress
  network for the worker (FCM/Keycloak/Odoo): **resolved in F1** — the worker joins `drms-kas-edge` too, plus
  `drms-kc-admin-stg` for the Keycloak Admin API (§7).
- Compose + `.env` (600) at **`/opt/infra/web/clients/drms-proyekkas/`** (prod) and
  **`/opt/infra/staging/drms-proyekkas/`** (staging). Reason: CLAUDE.md §3.1 places client web apps under
  `web/clients/<slug>/`, and `infra-deploy`'s `STACK_RE` (`^seg(/seg){0,2}$`) accepts at most 3 path
  segments — a nested `web/clients/drms/proyekkas` (4 segments) would be rejected. `/opt/infra/web/` does
  not exist yet (observed). Final path = infra-engineer decision.
- Databases in the shared cluster: **`pk_drms` / `pk_drms_stg` exist** (infra runbook Langkah 1, verified by
  Lead 2026-09-23) with roles `pk_drms{,_stg}_{owner,app,ro}` (ADR 0006 §1).
- Keycloak realms **`drms` / `drms-staging` imported** in the existing Keycloak (ADR 0003; verified by Lead
  2026-09-23).
- Traefik file-provider routes in `/opt/infra/traefik/dynamic/clients/drms-proyekkas-staging.yml` (live:
  routers `drms-pk-stg-{auth,api-v1,api-rest,web}`, cert `le-http-staging`) and
  `drms-proyekkas-kc-token.yml` (router `auth-drms-token`); prod routers follow once the prod A record exists
  (architecture §3.3). Hostnames (user 2026-09-23): prod `drms-kas.bimacreative.tech`, staging `drms-kas.staging.bimacreative.tech` (architecture §3.2).

### 4. Jobs / cron: Payload Jobs Queue (not pg-boss)

Tasks: `notify.push` (FCM, ADR 0011), `notify.inapp`, `reminder.lateProgressReport` (daily, N days from
company-settings, default 3), `reminder.missingReceipts`, `reminder.budgetThreshold` (85%/100%),
`attendance.autoCloseOpenDays`, `pdf.batchExport`, `report.excelExport`, `odoo.outboxDispatch` (ADR 0009),
`media.orphanSweep`, `idempotency.purge`. Schedules via task `schedule: [{cron, queue}]`, executed only by
the worker's `handleSchedules()` (never both bin and autoRun — docs warn about duplicate queuing).
Cron times evaluated in **Asia/Makassar**. **Verified in F1** (spike §e): Payload 3.90.1 schedules have **no
timezone option** (`ScheduleConfig` = `cron`, `queue`, `hooks`; `handleSchedules` builds `new Cron(cron, {sloppyRanges:true})`
without a timezone), so cron is evaluated in the **process TZ** → the worker (web and worker both set `TZ`)
runs with `TZ=Asia/Makassar` and cron expressions are written in WITA. Observed: `'0 0 * * *'` →
`2026-09-23T16:00:00Z` with `TZ=Asia/Makassar`, `2026-09-24T00:00:00Z` with `TZ=UTC`.

### 5. CI/CD (GitHub Actions + GHCR, per CLAUDE.md §3.7)

`lint → typecheck → unit (Vitest) → integration (Postgres service container: migrations + role/trigger
tests + access tests) → Playwright e2e (staging-like) → Semgrep, gitleaks, Hadolint, Trivy (fail on
CRITICAL), npm audit → build image (targets runner + migrate) → push GHCR (tag + digest) → deploy`.
- `develop` → staging auto: `ssh -p 2221 deploy@host sudo infra-deploy staging/drms-proyekkas`.
- `main` → prod with GitHub environment approval.
- APK: Flutter job builds debug + signed release APK as workflow artifact (ADR 0010).
- OpenAPI drift check: regenerate `packages/api-contract/openapi.json`, fail if uncommitted diff.
- **Image build:** `next build --webpack` + `experimental.webpackMemoryOptimizations: true` (F1 spike §g).
  The Next 16 default (Turbopack) was OOM-killed (exit 137) at 1 536 MiB and 1 900 MiB cgroup caps;
  webpack succeeded under 1 900 MiB (sampled peaks 1 074–1 589 MiB, ≈ 5 min). The CI runner or any VPS-side
  build environment needs **≥ 2 GiB**.
- Required infra changes (coordinate with infra session): migrate ordering via `depends_on` (above) works
  with the current wrapper; **health-gated rollback** in `infra-deploy` is still a TODO of the platform.

### 6. Capacity (limits = F0 ESTIMATE, kept; F1 measurement below)

**Measured in the F1 spike** (report §g; production image, target `runner`, `docker stats` minus inactive file
cache, `/proc/1/status`): web idle **108 MiB** (RSS 176), light-load peak **205 MiB** (10 VUs × 60 s, 1 375 req,
incl. 3 × 12 MP receipt uploads; VmHWM 283 MiB); worker idle **45–47 MiB**, peak **51 MiB** during a 100-job
burst (VmHWM 118 MiB). Peaks are ≤ 32 % (web) and ≤ 16 % (worker) of the limits below → **limits 640/320
kept until the F6 load test**; no reduction before F6. At `cpus: 0.75` latency was CPU-bound (p95 994 ms),
not RAM-bound.

| Item | mem_limit (MiB) | Basis |
|---|---:|---|
| drms-pk-web (prod) | 640 | ESTIMATE: Next+Payload admin SSR + sharp decode of ≤ 12 MP image ≈ 36–48 MB per image in flight; sharp concurrency 1 |
| drms-pk-worker (prod) | 320 | ESTIMATE; control-plane worker idle 28 MiB (measured) + Payload init + export buffers |
| drms-pk-stg (web+jobs) | 512 | ESTIMATE |
| **Steady total** | **1 472** | 57% of the 2 568 MiB client budget |
| migrate one-shot (prod or stg, during deploy only) | +384 | transient → peak 1 856 MiB (72%) |
| Headroom left for other clients | ≈ 1 096 | steady |
| Postgres / Keycloak | 0 new containers | load inside existing limits (2 048 / 1 360 MiB); extra realm heap UNVERIFIED |

**No overrun** at these limits; but **the whole remaining client budget becomes ~57% ProyekKas**. If F1
measurement shows web idle > 400 MiB or p95 > 560 MiB under the F6 load test, apply in order: (a) staging
`mem_limit` 512 → 384 and stop staging outside office hours (needs user OK — platform decision #8 says
staging always-on); (b) move PDF render to worker; (c) escalate to user (platform ADR 0004 §4 threshold).

Disk: see ADR 0004 (≈ 6 GB/year media at assumed volumes) + DB ≈ 0.5–1 GB/year (ESTIMATE); host has 167 G free.

**F1 foundation update (staging deployed with separate web + worker, §7):** the `drms-pk-stg` 512m row above
no longer applies. Staging steady = 640 + 320 = **960 MiB** of limits; with prod planned at 960 MiB the
steady total becomes **1 920 MiB ≈ 75 %** of the 2 568 MiB client budget (+384 MiB transient migrate →
2 304 MiB ≈ 90 %). Measured staging idle (infra Lead, `docker stats`, 2026-09-23 after deploy): web
**82 MiB**, worker **47 MiB** — far below the limits, but the budget is planned on `mem_limit`. Before prod,
revisit the staging limits (reduction step (a) above) with the F6 load-test data.

## 7. Staging as deployed (F1 foundation, 2026-09-23)

Source: `deploy/staging/docker-compose.yml` (repo) → installed by the infra Lead at
`/opt/infra/staging/drms-proyekkas/` (compose project `drms-proyekkas-stg`), runbook
`/opt/infra/docs/runbooks/proyekkas-drms-onboarding.md` Langkah 5. Live at
**`https://drms-kas.staging.bimacreative.tech`** (Let's Encrypt production certificate; `GET /api/v1/health` 200).

| Service | Image | Command | Networks | mem_limit | cpus | `DATABASE_POOL_MAX` |
|---|---|---|---|---:|---:|---:|
| `drms-pk-stg-migrate` | `PK_MIGRATE_IMAGE` | `payload migrate` (one-shot, `restart: "no"`, **owner** DSN) | `db` | 384m | 0.5 | 2 |
| `drms-pk-stg` (web :3000) | `PK_WEB_IMAGE` | `node server.js` (no `autoRun`) | `drms-kas-edge`, `db`, `drms-kc-admin-stg` | 640m | 0.75 | 5 |
| `drms-pk-stg-worker` | `PK_WEB_IMAGE` | `node apps/web/dist/worker.mjs` | `drms-kas-edge`, `db`, `drms-kc-admin-stg` | 320m | 0.25 | 3 |
| `drms-pk-stg-seed` (profile `seed`, one-shot) | `PK_MIGRATE_IMAGE` | `payload run src/seed/index.ts` (app DSN) | `db` | 384m | 0.5 | 2 |

- web and worker `depends_on: drms-pk-stg-migrate: service_completed_successfully`. The web container name
  `drms-pk-stg` is fixed by the Traefik service URL (`drms-pk-stg:3000`). `NODE_OPTIONS` web 448 / worker 224.
- **DB connections:** `pk_drms_stg_app` has `CONNECTION LIMIT 10` (verified `pg_roles.rolconnlimit`) →
  pools web 5 + worker 3 + seed 2 = 10 ≤ 10 (the migrate pool uses the owner role, limit 2). A pool of
  **1 deadlocks**: a transaction holds its connection while Payload needs a second one (observed in the F1
  image smoke test, compose comment). `DATABASE_POOL_MAX` is validated 1–20 (default 6, `src/lib/env.ts`).
- **Networks:** `drms-kas-edge` = ingress from Traefik + egress; `drms-kc-admin-stg` = Keycloak Admin API
  (ADR 0003 §6); migrate and seed are on `db` only.
- **Secrets:** Compose file secrets under `./secrets/` (never in git), `*_FILE` env vars; the owner DSN only
  in migrate. Compose (non-swarm) ignores `uid/gid/mode` of file secrets → the files must be owned by the
  container uid **1001** (mode 0400).
- **Images: `TEMPORARY(2026-09-23)` built locally on the VPS until GHCR** — tags `proyekkas-{web,migrate}:<ver>-stg-<sha>`
  (first deploy `0.1.0-stg-3b05b83`), no registry digest; switch to `ghcr.io/<org>/proyekkas-{web,migrate}:<tag>@sha256:<digest>`
  once CI publishes (§5; CI does not push images yet).
- **Upgrade:** build/pull a **new tag** (never overwrite a tag) → DB dump (`backup.sh run`) → infra Lead edits
  `PK_WEB_IMAGE`/`PK_MIGRATE_IMAGE` in `.env` → `docker compose up -d` (migrate runs, then web/worker are
  recreated; ≈ 15–20 s downtime). If `deploy/staging/docker-compose.yml` changed, the infra Lead reviews and
  copies it verbatim first.
- **Rollback:** old images are kept → put the previous tags back in `.env` → `docker compose up -d` (migrate
  is a no-op when all migrations are recorded). Non-backward-compatible migration → restore the pre-deploy
  dump (destructive, Lead/user confirmation). Never `down -v`.
- **Follow-up for prod (not blocking staging):** host uid 1001 is the host user **`deploy`**
  (`getent passwd 1001`), so the secret files are owned by `deploy` (mitigated on staging: `deploy` cannot
  traverse the 750 root-owned stack dirs — infra runbook). For prod, run the containers with a uid **not
  mapped to a host user** (the infra pattern of uid 10101) and own the secret files by that uid.
- Differences to the F0 decision: staging no longer combines web + jobs (`autoRun` is not used anywhere;
  the worker is the only job runner, `payload.config.ts`); both web and worker join `drms-kc-admin-stg`.

## Alternatives

| Alternative | Rejected because |
|---|---|
| ~~Separate worker in staging too~~ | F0 rejection (+256–320 MiB) **reversed in F1** (§7): staging now mirrors prod so jobs/cron are tested on the prod layout |
| `prodMigrations` (migrate at web boot) | App role must not own DDL (ADR 0006); concurrent boots race |
| pg-boss (control-plane) | Second queue system; Payload tasks get Local API/`req` natively (ADR 0001) |
| Separate repos web/mobile | Contract drift; monorepo keeps OpenAPI + Dart client in one PR |
| Dedicated Postgres for DRMS | +≈1 GiB RAM; violates platform ADR 0004 alternatives |

## Consequences

- One image → consistent code across web/worker/migrate; migrate image is larger (dev deps + tsx) but
  only runs one-shot.
- ~~Staging runs jobs in-process~~ — superseded (§7): staging runs the same web + worker split as prod, at the
  cost of +448 MiB of limits vs the F0 plan (§6 F1 update).
- RAM budget tight; measurement is an F1 acceptance gate.

## Security implications

- Web is the only service on `proxy` that must accept inbound; worker should be egress-only.
- Egress from containers to FCM/Odoo is not restricted by the platform today (no egress policy) → accepted
  risk, noted for qa-security.
- Secrets only in `.env` (600) / GitHub Secrets: `DATABASE_URL` (app role), `DATABASE_URL_MIGRATE`
  (owner role — only in migrate service env), `PAYLOAD_SECRET`, OIDC client secret, Keycloak service
  account secret, FCM service-account JSON (ADR 0011), media HMAC key.
- Image pinned by tag + digest; Trivy gate.

## Rollback

Deploy: re-point compose image tag to previous digest → `infra-deploy <stack>`. Schema: migrations must be
backward compatible for one release (expand/contract); `payload migrate:down` only for the last migration
and only with DB restore available (ADR 0006 backup of DB before each prod deploy: `restic` ad-hoc dump —
infra coordination). This ADR itself: no system effect until F1.

## Proposed CLAUDE.md changes (need user approval; author does not edit)

None. (Possible platform follow-up: `infra-deploy` health-gated rollback, already planned by platform.)

## Revision history

- **2026-09-23 (F0 gate):** accepted by user.
- **2026-09-23 (F1 spike, user-approved):** Payload 3.90.1 = GO (user). §2 worker entry verified
  (`node apps/web/dist/worker.mjs`, esbuild bundle, heartbeat healthcheck, `TZ=Asia/Makassar`); §3 infra facts
  now live (DBs `pk_drms`/`pk_drms_stg`, realms `drms`/`drms-staging`, network `drms-kas-edge` 10.100.7.0/24
  instead of `proxy`, staging routers `drms-pk-stg-{auth,api-v1,api-rest,web}`; infra `main` `c557c28`,
  runbook `/opt/infra/docs/runbooks/proyekkas-drms-onboarding.md`); §4 cron uses process TZ (no per-schedule
  timezone, verified); §5 webpack build, build env ≥ 2 GiB; §6 measured RAM recorded, limits kept until F6.
- **2026-09-23 (F1 foundation, staging deployed):** new §7 "Staging as deployed" (verified against
  `deploy/staging/docker-compose.yml` and the live `/opt/infra/staging/drms-proyekkas/`): separate web 640m +
  worker 320m + one-shot migrate + seed (profile); web/worker on `drms-kas-edge` + `db` + `drms-kc-admin-stg`,
  migrate/seed on `db` only; pools 5 + 3 + 2 ≤ `pk_drms_stg_app` CONNECTION LIMIT 10 (pool 1 deadlocks);
  images built locally on the VPS (`TEMPORARY` until GHCR); upgrade/rollback by image tag in `.env`; measured
  idle web 82 MiB / worker 47 MiB. §2 staging `autoRun` row superseded; §3 worker egress resolved; §6 budget
  recomputed (1 920 MiB steady ≈ 75 % with prod). Prod follow-up: container uid not mapped to a host user
  (uid 1001 = host `deploy`; infra pattern 10101). Status stays accepted.
