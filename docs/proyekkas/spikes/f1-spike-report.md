# F1 spike report: Payload CMS go/no-go

- **Date:** 2026-09-23 · **Author:** nextjs-developer · **Branch:** `feat/nextjs-f1-spikes` (from `develop`)
- **Stack under test:** `payload`/`@payloadcms/{next,ui,db-postgres,translations}` **3.90.1**, `next` **16.3.6**,
  `react` 19.3.0, `graphql` 16.14.2, `sharp` 0.35.4, `jose` 6.2.12, `openid-client` 6.8.8, `zod` 4.6.5,
  Node **24.21.0** (`node:24.21.0-alpine@sha256:ebfe2f90…`, same pin as control-plane). Versions checked against
  `registry.npmjs.org` in this session; `npm ls` confirmed a single `payload@3.90.1`, `next@16.3.6`,
  `drizzle-orm@0.45.2`, `graphql@16.14.2`.
- **Throwaway infrastructure:** compose project `pk-spike` (`apps/web/spike/docker-compose.spike.yml`),
  `postgres:16.15-bookworm` with `log_statement=all`, `quay.io/keycloak/keycloak:26.7.4` in `start-dev` with
  realm `drms-spike` (its own bootstrap admin), no published ports, `mem_limit` on every container. Everything
  was torn down at the end (§RAM cap and teardown).
- **Evidence scripts** (committed, re-runnable): `apps/web/spike/scripts/{c-audit.ts,d-numbering.ts,ab-auth.mjs,f-csp.mjs,g-load.mjs,seed.ts}`,
  `apps/web/spike/kc-bootstrap.sh`, `apps/web/spike/ram-sampler.sh`.

## Verdict

| # | Spike | Result |
|---|---|---|
| a | OIDC web login, `disableLocalStrategy`, custom session strategy, SSO button, `me`, account view, logout | **GO** |
| b | `mobileBearer` on `/api/v1/me` with a real Keycloak token, `sid`, device check, generic REST refused (+ Lead's admin-API scope test) | **GO** (ADR 0003 wording change: generic REST answers 403 or `{user:null}`, not 401) |
| c | Append-only `audit_logs` as the non-owner role, in the same transaction, no hidden UPDATE/DELETE | **GO** (with ADR 0006 refinements) |
| d | In-transaction numbering, 50-way concurrency, rollback | **GO** |
| e | Payload config + Jobs Queue in a separate worker process, cron timezone | **GO** (no per-schedule timezone: set `TZ`) |
| f | Strict nonce CSP vs Payload admin | **PARTIAL**: works with a documented minimal CSP (`'unsafe-inline'` for styles only). A fully strict CSP breaks the admin styling |
| g | Idle and light-load RAM of the production images | **GO**: well under the ADR 0002 limits. The production build must use webpack (Turbopack OOM) |
| h | Receipt resize (≤ 2000 px, JPEG q82, original discarded, thumbnail, `sha256Original`) | **GO** (plus a required SSRF guard, see §h) |

**Overall: GO for Payload 3.90.1.** No blocker was found. The top issues, all with working mitigations in this branch:
1. Payload admin needs `style-src 'unsafe-inline'`. `'strict-dynamic'` must stay off, because Payload's JSON/code
   field editor (Monaco) loads JS/CSS from `cdn.jsdelivr.net`.
2. `pasteURL: false` does **not** stop server-side fetching of a remote `{filename,url}` on REST create. A guard hook is
   mandatory on every upload collection.
3. The Turbopack production build is OOM-killed at 1.5 and 1.9 GiB caps. Build with `next build --webpack` plus
   `experimental.webpackMemoryOptimizations`.
4. Payload `update` writes every column and rewrites all array/`_rels` child rows. Class B triggers must compare
   values, and Class A/B must stay flat (confirmed).
5. Numbering and audit `txId` depend on `adapter.sessions[await req.transactionID].db`, which is typed but internal
   (not exported as a helper) → keep the integration test on every Payload upgrade.

---

## a) Web login via OIDC (Keycloak) in the Payload admin: GO

**Implementation:** `src/collections/Users.ts` (`auth.disableLocalStrategy: true`, strategies
`[oidcSession, mobileBearer]`, hooks `me`/`refresh`/`afterLogout`), `src/auth/*`, `src/app/(auth)/auth/{login,callback,logout}/route.ts`
(Next route handlers alongside Payload's `(payload)` route group, which resolves architecture §16 item 1),
`src/components/{SsoLoginButton,LogoutButton}.tsx` (via `admin.components.beforeLogin` and `admin.components.logout.Button`).
Sessions: 256-bit random id in an HttpOnly cookie, stored as SHA-256 in `web-sessions` together with the Keycloak `sid`.

**Source facts used** (read in `node_modules` at 3.90.1): strategies run in order and the first `user` wins
(`payload/dist/auth/executeAuthStrategies.js`). REST requests pass `req` with `pathname`
(`utilities/createPayloadRequest.js`). Admin views call strategies **without `req`** (`@payloadcms/next/dist/utilities/initReq.js`).
With `disableLocalStrategy`, the Login view renders `beforeLogin` but not `LoginForm` (`views/Login/index.js`).
`meOperation` takes `exp` from a `hooks.me` result. `refreshOperation` takes the result of `hooks.refresh`, and the
handler only sets a cookie when `setCookie` is true.

**Evidence: scripted flow** (`ab-auth.mjs web`, run in the production image, final build):
```
a1_login_redirect {"status":302,"host":"auth.pk-spike.test:8080","path":"/realms/drms-spike/protocol/openid-connect/auth","pkce":"S256","hasState":true,"hasNonce":true}
a2_after_login    {"final":"http://pk-spike-web:3000/admin/account","status":200,"appCookies":["pk_session"]}
a3_api_users_me   {"status":200,"email":"spike.admin@drms.test","strategy":"oidcSession","exp":1790183823,"collection":"users"}
a4_page /admin/account {"status":200,"hasLogoutForm":true,"title":"Akun - Payload"}   (also /admin, /admin/collections/uoms, …/audit-logs → 200)
a6_refresh        {"status":200,"exp":1790183823,"setCookie":[]}          ← no Payload JWT cookie ever issued
a7_cross_origin_post {"status":403}   a8_same_origin_post_uom {"status":201}   ← Origin check in the strategy
a9_logout         {"status":303,"to":".../realms/drms-spike/protocol/openid-connect/logout","hasIdTokenHint":true,"appCookiesAfter":[]}
a11_me_after_logout {"user":null}
a12_kc_sso_session_after_logout "login form shown → Keycloak SSO session ended (OK)"
```
**Evidence: real browser** (Chromium 152 + playwright-core 1.63.0, `f-csp.mjs`): the login view shows only the SSO button
(`ssoButton:1, passwordField:0`, screenshot `img/f1-admin-login-sso.png`). Clicking it goes through Keycloak and back to
`/admin` with the nav visible. Account view `h1` = `spike.admin@drms.test`. A UoM was created through the admin form
(`/admin/collections/uoms/391`, saved). Submitting the logout form ends at `/admin/login`. Server side: `web_sessions.revoke_reason
= user_logout`, and the session's Keycloak `sid` is no longer in `GET /admin/realms/drms-spike/users/{id}/sessions` (count 0).
Audit rows `login`/`logout` (`doc_type=web_session`) are written in the same transaction as the session row.

**Deviations / not verified**
- The spike ran over plain http, so the cookie was `pk_session` without `Secure` (`AUTH_COOKIE_INSECURE=true`, which
  `src/lib/env.ts` refuses when `APP_URL` is https). `__Host-pk_session` + `Secure` are only unit-tested → verify on
  staging over HTTPS (**UNVERIFIED**).
- Payload's own `/api/users/logout` (inactivity path) → `afterLogout` hook revokes our session: code is present, but
  the path was **not exercised**. The admin inactivity timers driven by `exp` were not observed in the browser (**UNVERIFIED**).
- Logout audit rows from the first runs had `user_id` null. Fixed (`revokeWebSession` passes the session's user) and
  re-run; the committed code carries the fix.

## b) `mobileBearer` + `/api/v1/me`: GO

**Implementation:** `src/auth/strategies.ts` `mobileBearerStrategy`. It only acts when `req.pathname` starts with
`/api/v1/`, so it never runs on generic `/api/<slug>` or in admin views (called without `req`). It checks jose
`jwtVerify` against the JWKS (fetched from the internal URL), `issuer`, `RS256`, 60 s clock tolerance,
`typ==='Bearer'`, `azp==='proyekkas-mobile'`, an active user by `keycloakSub`, and `X-Device-Id` → an active `devices` row.

**Evidence** (real Authorization Code + PKCE S256 on public client `proyekkas-mobile`, scope `openid offline_access`,
code exchanged at the **internal** URL `http://pk-spike-keycloak:8080`):
```
b1_access_token_claims {"iss":"http://auth.pk-spike.test:8080/realms/drms-spike","aud":"account","azp":"proyekkas-mobile","typ":"Bearer","sid":"UqEkZ48dkdd0YgE6RLS7_oCg","sidPresent":true,"exp_minus_iat":300,"refresh_typ":"Offline"}
b2_v1_me_bearer_device   200 {"strategy":"mobileBearer","token":{"sid":"UqEk…","azp":"proyekkas-mobile",…}}
b3 no X-Device-Id 401 · b4 unknown device 401 · b5 tampered signature 401 · b10 wrong azp (service-account token) 401
revoked device (same valid token) 401 · inactive user (same token, active device) 401
b6 /api/users/me with bearer → 200 {"user":null} · b7 /api/audit-logs 403 · b8 /api/spike-docs 403 · b9 POST /api/uoms 403
```
- **`sid` is present** in Keycloak 26.7.4 access tokens and ID tokens (web sessions stored `keycloak_sid`), which closes ADR 0003 §5 UNVERIFIED.
- **Internal back-channel yields the public `iss`**: `KC_HOSTNAME=http://auth.pk-spike.test:8080`, token requested at
  `http://pk-spike-keycloak:8080` → `iss` public. This closes ADR 0003 §6 UNVERIFIED for hostname v2. In the spike the public
  name also resolved inside the network (alias), so the `customFetch` rewrite in `src/auth/oidc.ts` works but its
  network path is not independently proven.
- `aud` is `"account"`, not the client → validate `iss` + `azp` + `typ`, not `aud`, unless an audience mapper is added.
- Generic REST with a bearer never authenticates (strategy scoped to `/api/v1`), but Payload answers **403** (access
  false) or **200 `{user:null}`** (`/me`), not 401. Traefik stripping stays the first layer.

**Lead request: `proyekkas-admin-api` scope.** Five confidential service-account clients were tested
(`ab-auth.mjs admin`/`admin2`), each against fresh sessions of `spike.staff`:

| Client (token realm-management roles) | GET users | PUT realm | master users | DELETE session (online) | DELETE session `?isOffline=true` | DELETE consent `proyekkas-mobile` | POST user logout |
|---|---|---|---|---|---|---|---|
| `fullScopeAllowed=true` + SA roles view+manage (**option 1**) → `[manage-users, view-users, query-groups, query-users]` | 200 | 403 | 403 | 204 | 204 | 204 | 204 |
| `fullScopeAllowed=false`, no scope mapping → `[]` | **403** | 403 | 403 | 403 | 403 | 403 | 403 |
| `fullScopeAllowed=false` + scope mapping realm-management view+manage (**option 2**) → same 4 roles | 200 | 403 | 403 | 204 | 204 | 204 | 204 |
| SA role `manage-users` only → `[manage-users]` | 200 | 403 | 403 | 204 | 204 | 204 | 204 |
| SA role `view-users` only | 200 | 403 | 403 | 403 | 403 | 403 | 403 |

Refresh with the mobile refresh token afterwards: 400 after the online or offline session DELETE and after the consent DELETE.
**Still 200 after `POST users/{id}/logout`**, so user logout does **not** end offline sessions.
For a session created with `offline_access`, the plain (online) `DELETE sessions/{sid}` returned 404, and `?isOffline=true` is required.

**Minimal role set:** `realm-management/manage-users` alone covers delete online/offline session, revoke consent and
user logout (and lets it read users). **Recommended realm-export setting (option 2)** for `proyekkas-admin-api`:
`"publicClient": false, "serviceAccountsEnabled": true, "standardFlowEnabled": false, "directAccessGrantsEnabled": false,
"fullScopeAllowed": false`, `scopeMappings.clientScopeMappings.realm-management = ["manage-users"]` (add `view-users`
only if the explicit role is wanted), service-account user client role `realm-management: manage-users`. With option 2
the token cannot silently gain roles later granted to the service-account user.

## c) Append-only `audit_logs`: GO

**Setup:** `postgres-init/01-roles.sh` creates `pk_drms_owner` (owner, runs migrations) and `pk_drms_app` (NOSUPERUSER …,
CONNECT only). Migrations `src/migrations/20260923_062330_initial.ts` (default privileges SELECT/INSERT/UPDATE + Payload DDL)
and `…_062331_append_only.ts` (REVOKE UPDATE/DELETE/TRUNCATE, `pk_reject_mutation` row and statement triggers,
`server_time` trigger, explicit DELETE grants, counters table) ran via `payload migrate` **as the owner**. The app ran as `pk_drms_app`:
```
RESULT connected_as {"u":"pk_drms_app"}
grants pk_drms_app: audit_logs INSERT,SELECT | uoms INSERT,SELECT,UPDATE | spike_parents_items/_rels DELETE,INSERT,SELECT,UPDATE | payload_migrations SELECT | …
```
**Same transaction + no hidden UPDATE/DELETE** (`c-audit.ts`, postgres statement log; backend pid + `%x` txid):
```
[c1 payload.create uoms]  begin
  insert into "uoms" (…) returning …                      tx=760
  select … from "uoms" where id=$1                         tx=760
  SELECT txid_current()                                    tx=760
  insert into "audit_logs" (…) ×4  (+ select after each)  tx=760
  commit
```
Only `INSERT` and `SELECT` touch `audit_logs`. Audit rows carry `tx_id=760`. Update → one `update` row with
`{"v":"liter"}→{"v":"Liter"}` in the same tx. Atomicity: update + audit inside one transaction, then throw → audit count
5→5 and the uom name unchanged.
```
c4_app_update/delete/truncate  "ERR 42501 permission denied for table audit_logs"
c4_owner_update   "ERR 42501 append-only table audit_logs: UPDATE rejected"   (also DELETE, TRUNCATE)
c4_app_insert_time_forged → server_time stored 2026-09-23 06:26:27.604+00 (not the forged 2000-01-01)
```
**Arrays / relationships** (`spike-parents` with `items` array + `uoms` hasMany):
```
create: insert spike_parents; insert spike_parents_rels (2 rows); insert spike_parents_items (2 rows)   ← INSERT only
update title ONLY: insert … on conflict ("id") do update …;
  delete from "spike_parents_rels" where parent_id=$1 and path in ($2); insert … (2)
  delete from "spike_parents_items" where _parent_id=$1;             insert … (2)
with an append-only trigger on spike_parents_items → update fails:
  "ERR Failed query: delete from "spike_parents_items" where "spike_parents_items"."_parent_id" = $1"
```
**Findings for ADR 0006:**
1. Payload rewrites **all** child rows on **every** parent update, even when the array is unchanged. The "Class A/B must be flat"
   rule is confirmed as mandatory, and child tables of mutable collections need DELETE.
2. `UPDATE` on a flat collection sets **every column** (`set "code"=$1, "name"=$2, …, "created_at"=$7`). Class B guard
   triggers must compare `OLD.col IS DISTINCT FROM NEW.col`. `BEFORE UPDATE OF col` would fire on every update.
3. Every update of a lockable collection runs `delete from "payload_locked_documents" where false`, so
   `payload_locked_documents(_rels)` need DELETE even when nothing is locked (granted).
4. Payload `json` fields reject bare strings, so audit values are stored wrapped as `{"v": …}`.

## d) Numbering in the business transaction: GO

`src/domain/numbering.ts` (pure formatting/period key, unit-tested) and `numbering-db.ts` (`INSERT … ON CONFLICT DO NOTHING`
then `UPDATE … RETURNING next_value-1`) run on the request transaction handle `src/lib/tx.ts`
(`adapter.sessions[await req.transactionID].db`, throws if there is no transaction). The number is allocated in a
`beforeChange` hook of `spike-docs` (UNIQUE `doc_no`). Sequence: pattern `{seq}/PB-{COMPANY}/{DD}/{MM_ROMAN}/{YYYY}`, reset `never`, `startAt` 229, TZ Asia/Makassar.
```
d1_first "229/PB-DRMS/23/IX/2026"
d2_failed_create "rolled back: simulated failure after allocation"  → d2_next_after_rollback "230/PB-DRMS/24/IX/2026"
d3_parallel50 {"fulfilled":50,"rejected":0,"min":231,"max":280,"unique":true,"gapless":true,"ms":414}
d4_parallel50_with_10_failures {"committed":40,"failed":10,"min":281,"max":320,"unique":true,"gapless":true}
d5_all_committed {"count":92,"min":229,"max":320,"gapless":true}
log: [1318] tx=774 UPDATE document_sequence_counters … RETURNING …; [1318] tx=774 insert into "spike_docs" … $1='229/PB-DRMS/23/IX/2026'
```
Unit tests also reproduce the paper form number `228/PB-DRMS/20/IX/2026` and the Makassar day boundary
(`2026-09-22T16:30Z` → day 23). **Gap policy:** no gaps from rollbacks (counter row locked until commit). Gaps can only
come from the audited manual "set next value" (ADR 0007 §6, unchanged). Pool size 10 with 50 concurrent transactions
produced no deadlock (serialised on the counter row).

## e) Worker outside Next: GO

`src/worker/index.ts` imports `payload.config.ts` directly and loops `payload.jobs.handleSchedules({allQueues:true})` +
`payload.jobs.run({allQueues:true, limit:10})` every 30 s with a heartbeat file. It is bundled by esbuild
(`scripts/build-worker.mjs`, externals `sharp`, `pg-native`, `drizzle-kit`, `next`, `react`…, a `createRequire` banner
**aliased** because Payload's bundle already declares `createRequire`) into `apps/web/dist/worker.mjs` (5.4 MB). It runs
from the **runner image** (`node apps/web/dist/worker.mjs`, no tsx, no Next server), resolving externals from the
standalone `node_modules`.
```
payload_jobs: spikeHeartbeat completed 06:47:01, 06:48:02 … (cron '* * * * *'), output {"tz":"Asia/Makassar","pid":1}
worker healthcheck (heartbeat < 90 s): "Up … (healthy)"
```
**Cron timezone:** `ScheduleConfig` has only `cron`, `queue`, `hooks` (`queues/config/types/index.d.ts`), and
`handleSchedules` builds `new Cron(cron, { sloppyRanges: true })` **without a timezone**
(`queues/operations/handleSchedules/index.js` L85), so crons follow the **process TZ**:
`spikeMidnight '0 0 * * *'` → `waitUntil 2026-09-23T16:00:00Z` with `TZ=Asia/Makassar`, and `2026-09-24T00:00:00Z` with `TZ=UTC`.
**Decision:** set `TZ=Asia/Makassar` on the worker (and on staging web with `autoRun`). Throughput at the default
10 jobs / 30 s tick = 20 jobs/min (100-job burst: 45 done after about 2 ticks) → tune `limit`/interval in F1.

## f) Strict CSP vs Payload admin: PARTIAL (works with a minimal documented relaxation)

Headless Chromium 152 loaded 6 admin views, created a record and logged out, collecting `securitypolicyviolation`
events. The nonce is set in `src/proxy.ts`, and Next attaches it to its scripts.

| CSP variant | Admin usable? | Violations |
|---|---|---|
| **strict**: `script-src 'self' 'nonce-…' 'strict-dynamic'; style-src 'self' 'nonce-…'` | functional (record saved) but **visibly broken styling** (`img/f1-admin-dashboard-strict-csp-broken.png`) | 184–198: `style-src-attr` 123–135, `style-src-elem` 47 (runtime `<style>` from Payload chunks/react-select), `img-src` gravatar 14–16. **0 `script-src` violations**. Logout 303 to Keycloak was blocked by `form-action 'self'` (session revoked, redirect not followed) |
| `style-src 'self' 'unsafe-inline'`, `'strict-dynamic'`, `form-action 'self' <IdP>`, avatar default | fully OK | 1: `style-src-elem` `https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs/editor/editor.main.css`. Monaco's **JS from jsdelivr executed** (allowed by `'strict-dynamic'`) |
| **recommended**, same without `'strict-dynamic'` | fully OK (login, 6 views, create, account, logout via Keycloak) (`img/f1-admin-dashboard-csp.png`) | 1: `script-src-elem` blocked `…/monaco-editor@0.55.1/min/vs/loader.js` → JSON field editor on the account page fails to initialise |

**Minimal CSP that works** (implemented as `PK_CSP_MODE=payload`, `PK_CSP_STRICT_DYNAMIC=false`, the default):
```
default-src 'self'; script-src 'self' 'nonce-{n}'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:;
font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self';
form-action 'self' https://auth.bimacreative.tech; frame-ancestors 'none'
```
Required alongside it:
- `admin.avatar: 'default'`. The default `gravatar` sends `md5(email)` to `www.gravatar.com` (privacy leak + CSP).
- **No `json`/`code` field editors in the admin.** `@payloadcms/ui` bundles `@monaco-editor/loader` with
  `paths.vs = https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs` (`@payloadcms/ui/dist/exports/client/chunk-2GZJJKQF.js`),
  and there is no config hook. Use custom read-only field components (e.g. `users.roles`, `audit-logs.old/newValue`) in F1.
- `'unsafe-inline'` for **styles only** is acceptable (no script execution). A nonce in `style-src` would disable
  `'unsafe-inline'`, so it is deliberately absent.

## g) RAM of the production images: GO

Production image `pk-spike/proyekkas-web:spike` (target `runner`, 340 MB, standalone, uid 1001, `read_only`, `cap_drop ALL`).
Measured with `docker stats --no-stream` (cgroup usage minus inactive file cache) + `/proc/1/status` + `memory.peak`.

| Container | ADR 0002 limit | Idle (final image) | Light load | Peak RSS (VmHWM) |
|---|---:|---:|---:|---:|
| web (`node apps/web/server.js`) | 640 MiB | **108 MiB** (RSS 176 MiB) | **205 MiB** peak: 10 VUs × 60 s, 1 375 req (22.9 rps, 0 errors, p50 430 ms / p95 994 ms at `cpus: 0.75`) incl. 3 × 12 MP receipt uploads (sharp) | 283 MiB |
| worker (`node apps/web/dist/worker.mjs`) | 320 MiB | **45–47 MiB** (RSS 115 MiB) | **51 MiB** during a 100-job burst | 118 MiB |
| pk-spike-postgres (throwaway) | n/a | 18–42 MiB | 47 MiB | n/a |
| pk-spike-keycloak (throwaway, dev mode) | n/a | 480–515 MiB | 515 MiB | n/a |

Load mix: `/admin`, `/admin/collections/uoms`, `/admin/collections/audit-logs`, `/api/uoms`, `/api/v1/me`, POST uom (with 3–4
audit rows each). The first load attempt ran unauthenticated by operator error (password env not passed → Keycloak
`invalid_user_credentials`) and was discarded.
**Conclusion:** measured peaks are ≤ 32 % (web) and ≤ 16 % (worker) of the ADR 0002 limits → no revision is forced. The F6
load test remains the gate before any reduction. At `cpus: 0.75`, latency is CPU-bound, not RAM-bound.

**Build finding:** `next build` (Turbopack, the Next 16 default) was **OOM-killed (exit 137) at 1536 MiB and at 1900 MiB** cgroup caps
(`--max-old-space-size` does not bound Turbopack's native memory). `next build --webpack` +
`experimental.webpackMemoryOptimizations: true` (both documented in `next/dist/docs` 16.3.6) succeeded under the 1900 MiB cap
(sampled peaks 1074–1589 MiB, build ≈ 5 min). The CI runner or any VPS-side build must budget about 2 GiB. Webpack warnings in the
build were not inspected (**UNVERIFIED**).

## h) Receipt image resize: GO

`src/collections/MediaReceipts.ts`: `resizeOptions {2000×2000, fit inside, withoutEnlargement}`, `formatOptions jpeg {quality 82, mozjpeg}`,
`thumb` 320 webp q70, `pasteURL/crop/focalPoint false`, `mimeTypes` jpeg/png/webp, UUID filename, `sha256Original` +
original dimensions/size from `beforeOperation` (the hook runs before `generateFileData`, source `collections/operations/create.js`),
`Cache-Control: private, no-store`.
```
form (reference JPG 1152×1211, 185 084 B) → 201, stored 1152×1211 jpeg 149 143 B, exif:false, thumb 305×320 webp 11 604 B
phone (4032×3024 q95 + EXIF GPS, 1 337 361 B) → 201, stored 2000×1500 jpeg 247 201 B, exif:false, thumb 320×240 webp 9 628 B
both: sha256OriginalMatchesInput:true, byteIdenticalToQ82Reencode:true (independent sharp rotate→resize→jpeg{82,mozjpeg} = same bytes)
dir /data/media/media-receipts: only <uuid>.jpg + <uuid>-WxH.webp  → original discarded
GET file (session) 200 private,no-store,nosniff · anonymous 403
```
**Security finding:** `POST /api/media-receipts` with JSON `{"url":"http://169.254.169.254/latest/meta-data","filename":"x.jpg"}`
made Payload **fetch the URL** despite `pasteURL: false` (log: "Blocked unsafe attempt to 169.254.169.254 … private or
internal address"). Source: `create.js` L31-35 derives `externalUploadSource` from `{filename,url}` for every non-`overrideAccess`
create, **before** hooks, and `getExternalFile` then uses `safeFetch` (blocks private IPs only), so public URLs would be fetched.
**Mitigation implemented:** a `beforeOperation` guard rejects REST create/update without a multipart file → final image: `h_pasteURL_ssrf_attempt 400`,
and no fetch in the log. This must be applied to **every** upload collection (factory in F1).
Not verified: HEIC input (sharp reports `heif 1.23.2`, but HEVC decode was not tested). Receipt legibility at 2000 px
(test input is only 1152 px) is **UNVERIFIED**.

---

## RAM cap and teardown (how it was enforced and checked)

- There is no node/npm on the host. Every spike process ran in a mem-limited container. The sum of `mem_limit`s per phase
  never exceeded 2048 MiB: install/tests pg 256 + dev 1024; builds alone at 1536 → 1900 (everything else stopped);
  app pg 256 + kc 768 + web 640 + worker 320 = 1984; load pg + kc + web 640 + dev 256 = 1920; browser pg + kc + web 512 +
  browser 448 = 1984 (limits changed with `docker update`).
- `apps/web/spike/ram-sampler.sh` sampled `docker stats` every ~5 s for all `pk-spike-*` containers + legacy-builder step
  containers (388 samples). **Peak sum = 1589 MiB** (a build step container). The OOM kills show the caps were enforced by the kernel.
  `free -m` at the end: available 12 577 MiB.
- Teardown: `docker compose -p pk-spike … --profile app --profile browser down -v` → containers, volume `pk-spike-media` and
  network `pk-spike-net` removed. `docker ps -a | grep pk-spike` → empty. The spike image, the 2 exited OOM build containers and
  all dangling layers **whose IDs appear in my build logs** were removed. Pre-existing images (`node:24.21.0-alpine`,
  `postgres:16.15-bookworm`, `quay.io/keycloak/keycloak:26.7.4`, …) were kept.
- Observed but not touched: foreign containers `pk-scratch-kc` and `h3-alloytest` (other sessions) and a Docker daemon
  event at ~13:25 (all platform containers re-reported `health: starting`). None of these were caused by this spike.

## Proposed ADR revisions (text proposals; ADRs not edited)

- **ADR 0001 §Decision 8** (add): "Admin must not use `json`/`code` field editors (Monaco loads from jsdelivr); use
  read-only custom field components. `admin.avatar: 'default'`. Every upload collection gets the remote-URL guard hook
  (`pasteURL:false` is insufficient in 3.90.1)."
- **ADR 0002 §2/§6**: "Worker = `node apps/web/dist/worker.mjs` (esbuild bundle of the Payload config, verified in F1),
  healthcheck = heartbeat file, env `TZ=Asia/Makassar`. Measured F1 (production image, light load): web idle 108 / peak 205 MiB
  (VmHWM 283), worker idle 47 / peak 51 MiB (VmHWM 118); limits 640/320 kept until F6. Image builds use `next build --webpack`
  with `experimental.webpackMemoryOptimizations` (Turbopack OOM at 1.9 GiB); the build environment needs ≥ 2 GiB."
  §4: "Payload 3.90.1 schedules have no timezone option; cron is evaluated in the process TZ (verified)."
- **ADR 0003 §4/§5/§1**: "Access token checks: `iss`, `azp`, `typ=Bearer`, `exp` (aud is `account` by default). `sid` is
  present in access and ID tokens (verified 26.7.4). Device remote logout for `offline_access` sessions:
  `DELETE /sessions/{sid}?isOffline=true` (the online variant returns 404). `POST users/{id}/logout` does not end offline
  sessions → deactivate = logout + `DELETE consents/proyekkas-mobile` (verified). `proyekkas-admin-api`: `fullScopeAllowed:false` +
  scope mapping `realm-management: manage-users` + SA role `manage-users` (minimal, verified; without scope mapping everything
  returns 403)." Acceptance wording: "APK bearer on `/api/<slug>` is never authenticated (403, or 200 `{user:null}` on `/me`)".
- **ADR 0006 §2/§4**: "Payload UPDATE writes all columns → Class B triggers compare `OLD IS DISTINCT FROM NEW` per protected
  column. Every parent update deletes and re-inserts all array/`_rels` rows. `payload_locked_documents(_rels)` need DELETE for the
  app role. Audit JSON values are wrapped `{v: …}`." Default privileges are placed at the top of the first
  Payload migration (a separate earlier migration fails because `payload_migrations` does not exist yet, as observed).
- **ADR 0007 §5**: "Preferred path verified: allocation in a `beforeChange` hook / domain service via
  `payload.db.sessions[await req.transactionID].db` (`src/lib/tx.ts`); 50 parallel → unique and gapless; rollback burns
  no number. Keep an integration test (pinned Payload; re-run on upgrade)."
- **Architecture §3.3**: replace "CSP compatibility UNVERIFIED" with the minimal CSP from §f and `form-action` including the IdP origin.

## Files

Scaffold (F1 foundation if GO): root `package.json` (npm workspaces), `.npmrc`, `.gitignore`, `.dockerignore`, `package-lock.json`;
`apps/web/{package.json,next.config.ts,tsconfig.json,eslint.config.mjs,vitest.config.ts,Dockerfile,scripts/build-worker.mjs}`;
`apps/web/src/**` (config, collections, auth, domain, endpoints, jobs, worker, migrations, proxy); `apps/web/tests/unit/*`.
**Spike-only code to delete or replace in F1:** collections `spike-parents`, `spike-docs`, endpoint `/v1/spike/numbered`, tasks
`spikeHeartbeat`/`spikeMidnight`, `apps/web/spike/**`. Note: `kc-bootstrap.sh` was fixed after the run (the Keycloak image
has no `awk`). The scope-mapping and user steps were executed as the equivalent manual `kcadm` commands; the fixed
script itself was not re-run (**UNVERIFIED**).

## Checks (final tree)
```
npm run lint       → eslint --max-warnings=0 .   (no findings)
npm run typecheck  → tsc --noEmit                 (no errors)
npm test           → vitest run: 2 files, 16 tests passed
```
