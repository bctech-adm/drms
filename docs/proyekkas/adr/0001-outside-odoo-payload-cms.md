# ADR 0001 — Build ProyekKas outside Odoo on Payload CMS 3 (Next.js)

- **Status:** accepted (user, GATE F0 2026-09-23); revised 2026-09-23 after the F1 spike (user-approved, see Revision history)
- **Date:** 2026-09-23
- **Author:** Analyst/Architect — Phase 0
- **Related:** `../f0-brief.md` §2–§3; `/opt/infra/CLAUDE.md` §0, §3, §3.6; `/opt/infra/docs/adr/0001-stack.md`
  (Next 16.3.6 / Node 24 alpine); ADR 0002–0008 in this folder; `../architecture.md`;
  Odoo-mirror ADR `0009-*.md` (written by another agent)

## Context

User decision #1 (brief §2): ProyekKas is built **outside Odoo** (admin web + Android APK), with a
later one-way mirror to Odoo (#2). The Lead proposed Payload CMS 3 inside a Next.js app. This ADR
validates that proposal against evidence gathered in this session (all fetched 2026-09-23).

### Verified facts

| Fact | Source (fetched / read this session) |
|---|---|
| `payload@3.90.1` = npm `latest`, MIT, published 2026-09-18T18:40Z; engines `node ^18.20.2 \|\| >=20.9.0`; peer `graphql ^16.8.1` | `https://registry.npmjs.org/payload` and `/payload/3.90.1` |
| `@payloadcms/next@3.90.1` peer `next >=15.2.9 <15.3.0 \|\| … \|\| >=16.3.3 <17.0.0`, `payload 3.90.1`, `graphql ^16.8.1` → **`next@16.3.6` satisfies** | `https://registry.npmjs.org/@payloadcms/next/3.90.1` |
| `@payloadcms/ui@3.90.1` peer `react`/`react-dom` `^19.0.1 \|\| ^19.1.2 \|\| ^19.2.1` → **`react@19.3.0` (used by control-plane) satisfies `^19.2.1`** | `https://registry.npmjs.org/@payloadcms/ui/3.90.1`; `/opt/src/control-plane/package.json` |
| `@payloadcms/db-postgres@3.90.1` deps: `drizzle-orm 0.45.2`, `drizzle-kit 0.31.7`, `pg 8.20.0`, `@payloadcms/drizzle 3.90.1` (exact pins, differ from control-plane's drizzle 0.45.3 — separate app, no conflict) | `https://registry.npmjs.org/@payloadcms/db-postgres/3.90.1` |
| `graphql` dist-tags: `latest` = **17.0.2**, `latest-16` = **16.14.2** → must pin `graphql@16.14.2` (peer `^16.8.1`), even with GraphQL disabled | `https://registry.npmjs.org/graphql` |
| Indonesian admin UI: `packages/translations/src/languages/id.ts` exports `id: Language` (`dateFNSKey: 'id'`); package exports `./languages/*` → import `@payloadcms/translations/languages/id`; config key `i18n.supportedLanguages`, `i18n.fallbackLanguage` | GitHub `payloadcms/payload` tag `v3.90.1` (tag object `30f5388`), files `packages/translations/src/languages/id.ts`, `docs/configuration/i18n.mdx`; registry `@payloadcms/translations/3.90.1` `exports` |
| External auth: `auth.strategies[]` (`name`, `authenticate({payload, headers, canSetHeaders, isGraphQL, req})` → `{user, responseHeaders?}`); `auth.disableLocalStrategy`; `auth.useSessions` default `true` | `docs/authentication/custom-strategies.mdx`, `docs/authentication/overview.mdx` @v3.90.1 |
| With `disableLocalStrategy`, the built-in JWT strategy refuses the collection (`auth/strategies/jwt.ts` L160) and the Login view hides `<LoginForm>` but still renders `admin.components.beforeLogin` / `afterLogin` (`packages/next/src/views/Login/index.tsx` L67–100) → an "SSO login" button can be injected | source @v3.90.1 |
| Admin customization: `admin.components.views` (root/collection/global/document views), `beforeLogin`, `afterLogin`, `logout.Button`, `admin.routes` (`login`, `logout`, `inactivity`), `admin.timezones.defaultTimezone` | `docs/custom-components/custom-views.mdx`, `root-components.mdx`, `docs/admin/overview.mdx` @v3.90.1 |
| Access control functions return `boolean` or a `Where` query (collection `create/read/update/delete/readVersions/admin/unlock`) | `docs/access-control/collections.mdx` @v3.90.1 |
| Hooks (collection): `beforeOperation, beforeValidate, beforeChange, afterChange, beforeRead, afterRead, beforeDelete, afterDelete, afterOperation, afterError, beforeLogin, afterLogin, afterLogout, afterMe, afterRefresh, afterForgotPassword, refresh, me`; root hook `afterError` | `docs/hooks/collections.mdx`, `docs/hooks/overview.mdx` @v3.90.1 |
| Transactions: all data-changing operations run in a transaction; hooks join it by passing `req`; `payload.db.beginTransaction/commitTransaction` | `docs/database/transactions.mdx` @v3.90.1 |
| **Local API default `overrideAccess: true`** — must pass `overrideAccess: false` + `user` to enforce access | `docs/local-api/overview.mdx` L75, `docs/local-api/access-control.mdx` @v3.90.1 |
| Versions/drafts, trash (soft delete, `deletedAt`), document locking (`lockDocuments`) exist | `docs/versions/overview.mdx`, `docs/trash/overview.mdx`, `docs/admin/locked-documents.mdx` @v3.90.1 |
| Postgres adapter options: `pool`, `push` (dev only by default), `migrationDir`, `idType` (`serial`/`uuid`), `transactionOptions`, `disableCreateDatabase`, `beforeSchemaInit`/`afterSchemaInit`, `schemaName` (experimental) | `docs/database/postgres.mdx` @v3.90.1 |
| Migrations: `payload migrate`, `migrate:create`, `migrate:status`, `migrate:down`…; option `prodMigrations` (run at init); bin uses tsx | `docs/database/migrations.mdx`, `docs/local-api/outside-nextjs.mdx`, `packages/payload/src/bin/index.ts` @v3.90.1 |
| `number` field → Postgres column type `numeric`, Drizzle `mode: 'number'` (JS double) | `packages/drizzle/src/schema/traverseFields.ts` L744–751, `postgres/schema/buildDrizzleTable.ts` L78–79 @v3.90.1 |
| Simple (single, non-polymorphic) relationship → `<name>_id` FK column on the main table; `hasMany`/polymorphic → `_rels` table | `packages/drizzle/src/schema/traverseFields.ts` L928–960 @v3.90.1 |
| Updates **delete and re-insert** child rows of arrays/relationships (`deleteWhere` in `upsertRow`) | `packages/drizzle/src/upsertRow/index.ts`, `deleteExistingArrayRows.ts` @v3.90.1 |
| Jobs Queue built in (`payload.jobs.queue/run/handleSchedules`, `autoRun`, `payload jobs:run` bin, task `schedule` cron, concurrency keys); internal `payload-jobs` collection | `docs/jobs-queue/*.mdx`, `packages/payload/src/queues/localAPI.ts` @v3.90.1 |
| GraphQL can be disabled: `graphQL.disable: true` | `docs/production/preventing-abuse.mdx` L35 |
| **No official OpenAPI generator** in Payload 3 (no match for "openapi" in docs/ or core packages; `@payloadcms/plugin-openapi` → HTTP 404 on npm) | grep over tag sources; `https://registry.npmjs.org/@payloadcms/plugin-openapi` |
| Release cadence: 3.84.0 (2026-04-22) → 3.85.0 (05-26) → 3.86.0 (07-10) → 3.87.0 (07-31) → 3.88.0 (08-11) → 3.89.0 (09-10) → 3.90.0/3.90.1 (09-18): ≈ monthly minors | `https://registry.npmjs.org/payload` `time` |
| **`4.0.0-canary.36` exists (dist-tag `canary`)** → a major 4.x is in development | same |
| Repo `payloadcms/payload`: license MIT, pushed 2026-09-23, ~44.9k stars | `https://api.github.com/repos/payloadcms/payload` |

## Decision

1. **Outside Odoo (confirmed).** Build ProyekKas as a standalone app; Odoo later receives a one-way mirror
   (ADR 0009, other agent). Schema is Odoo-friendly from day 1 (integer Rupiah, UoM master, analytic via
   project/cost-center, COA code on categories — see `../architecture.md` §4 and ADR 0005).
2. **Payload CMS `3.90.1` inside Next.js `16.3.6`, React `19.3.0`, Node 24 alpine** (same base as
   control-plane). Pin exact: `payload`, `@payloadcms/next`, `@payloadcms/ui`, `@payloadcms/db-postgres`,
   `@payloadcms/translations` = `3.90.1`; `graphql@16.14.2`; `sharp@0.35.4`.
   Rich text (`@payloadcms/richtext-lexical`) **not used** (no rich-text fields needed).
3. **Payload is used as**: data model + migrations (Drizzle/Postgres), admin CRUD for Admin/Finance/Owner,
   access control (`Where`-returning functions), hooks for invariants and audit, upload handling with
   sharp, Jobs Queue. **Business transitions** (submit/approve/transfer/LPJ/settle/void/close period) live
   in a domain service layer invoked from custom endpoints under `/api/v1/*` and custom admin views —
   never via generic field edits (status fields have `update` field-access `false`; see architecture §7).
4. **Auth** via custom strategies with `disableLocalStrategy: true` (ADR 0003). Admin login view shows an
   injected "Masuk dengan akun DRMS (SSO)" button through `admin.components.beforeLogin`.
5. **Admin UI in Bahasa Indonesia**: `i18n.supportedLanguages: { id }`, `fallbackLanguage: 'id'`;
   `admin.timezones.defaultTimezone: 'Asia/Makassar'` (configurable, company-settings).
6. **GraphQL disabled** (`graphQL.disable: true`); `graphql` still installed to satisfy peer deps.
7. **Schema migrations**: `push` only on developer machines; staging/prod use committed migrations run by
   a one-shot `migrate` container with the DB **owner** role (not `prodMigrations` at app start — the app
   role has no DDL rights; ADR 0006).
8. **Guard rails for Payload footguns** (enforced by lint rule / code review / tests):
   - every Local API call in request context passes `overrideAccess: false, user: req.user` unless it is a
     reviewed system write (marked `// SYSTEM-WRITE: reason`);
   - collections holding business data: `access.delete: () => false`; no `trash` (soft delete is not
     needed — deactivation via `active` flag / archive status);
   - money fields validated as safe integers (JS number from `numeric` column);
   - **no `json` / `code` field editors in the admin** (user decision 2026-09-23): `@payloadcms/ui` 3.90.1 loads
     the Monaco editor from `https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs` with no config hook
     (F1 spike report §f), which the admin CSP blocks (architecture §3.3). Fields that hold JSON (e.g.
     `users.roles`, `audit-logs.oldValue/newValue`) get read-only custom field components;
   - `admin.avatar: 'default'` (the default `gravatar` sends `md5(email)` to `www.gravatar.com`; spike §f);
   - **every upload collection gets the remote-URL guard hook** (`beforeOperation`: reject REST create/update
     without a multipart file). `pasteURL: false` is **not sufficient** in 3.90.1: a REST create with JSON
     `{filename,url}` still makes Payload fetch the URL server-side (SSRF; spike §h, source
     `collections/operations/create.js`). Implemented as a shared factory in F1.
9. **Upgrade policy**: stay on 3.x; take minor updates monthly via staging (Renovate/Dependabot PR);
   evaluate 4.x only after GA + migration guide + one minor patch release (new ADR).

## Alternatives

| Alternative | Rejected because (evidence) |
|---|---|
| **Odoo addon** (`drms_proyekkas`, original lead prompt) | User decision #1 (brief §2) — superseded. Would also consume Odoo pool worker capacity (platform ADR 0004: ≈18 concurrent users for the whole pool). Kept as migration target (ADR 0009). |
| **Custom Next.js admin + Drizzle** (control-plane pattern) | Fully controllable and lighter, but ~23 master + 14 transaction collections need list/filter/edit/relationship pickers/upload UIs; building them by hand is estimated at +15–25 person-days vs Payload's generated admin (ESTIMATE). Remains the fallback if the F1 auth spike fails (see Rollback). |
| **Directus** (`@directus/api` 39.2.0) | License is **"Monospace Sustainable Core License 1.0 (MSCL-1.0-GPL)"** — source-available, not OSI (license file `raw.githubusercontent.com/directus/directus/main/license`; GitHub API `spdx_id: NOASSERTION`) → fails `/opt/infra/CLAUDE.md` §0.10 accepted-license list. |
| **Strapi** (`@strapi/strapi` 5.54.0) | CE is MIT but repo mixes an `ee/` directory under a separate license (`LICENSE` on `develop`). Separate Node server (not inside Next.js) → second process/RAM next to any web frontend; admin SSO availability in CE **UNVERIFIED** in this session. No advantage over Payload for this stack. |
| **pg-boss** for jobs (as control-plane) | Works (`pg-boss@12.33.6`, MIT, engines `node >=22.12.0`, registry), but Payload Jobs Queue already runs in the same DB and exposes Local API + `req` inside tasks; one queue system is enough. Decision recorded in ADR 0002 §Jobs. |

## Consequences

- (+) Admin CRUD, list filters, relationship pickers, uploads + resize, i18n (id), per-field access and
  hooks come for free → effort concentrated on domain flows, APK and reports.
- (+) Same runtime family as control-plane (Next 16 / Node 24 alpine / Postgres), reusable CI & hardening.
- (−) OIDC-only login needs a custom strategy + custom routes (not an off-the-shelf Payload feature); the
  F1 spike is a go/no-go gate (phase-plan F1).
- (−) No built-in OpenAPI → `/api/v1` documented from our own zod schemas (architecture §6).
- (−) Payload's automatic REST (`/api/<slug>`) exposes every collection → access functions are
  security-critical; Traefik strips `Authorization` on non-`/api/v1` paths (architecture §6.1).
- (−) `numeric` → JS double: safe for Rupiah integers (< 2^53) but must never hold fractional currency.
- (−) Payload 4 in canary → a major upgrade will come; cost UNVERIFIED (no 4.x migration guide read).
- (−) ~~RAM of a Payload admin app is **not measured** here~~ → measured in the F1 spike (ADR 0002 §6: web
  idle 108 / light-load peak 205 MiB, worker idle 47 / peak 51 MiB).
- (−) Payload admin needs `style-src 'unsafe-inline'` (styles only; scripts stay nonce-strict) — architecture §3.3.
- (−) The production image must be built with `next build --webpack` (Turbopack OOM at 1.9 GiB; ADR 0002 §5).

## Security implications

- Access control lives in code; mandatory negative tests per role/scope (phase-plan F1/F2 gates).
- Local API `overrideAccess` default = true is the main privilege-escalation risk → rule 8 above + Semgrep
  custom rule (QA) flagging Local API calls without `overrideAccess`.
- GraphQL disabled reduces attack surface; `maxDepth` set low (e.g. 3) — option verified in
  `docs/production/preventing-abuse.mdx`.
- Upload endpoints: `mimeTypes` allow-list, `pasteURL: false` (option verified in `docs/upload/overview.mdx`)
  **plus the mandatory remote-URL guard hook** (Decision 8): the F1 spike showed that `pasteURL: false`
  alone does not stop the server-side fetch of `{filename,url}` on REST create (Payload's `safeFetch` blocks
  only private/internal IPs, so public URLs would be fetched).
- License: all Payload packages MIT (registry) — compatible with §0.10.

## Rollback

The F1 spike gate was **passed** (GO for Payload 3.90.1, user 2026-09-23), so the fallback below is no longer
expected to be used; it stays documented until the end of F1. Before F2 starts, if the F1 spike fails (OIDC strategy + admin, audit append-only with Payload writes,
numbering in-transaction) the fallback is **custom Next.js admin + Drizzle** (control-plane pattern). The
domain service layer, zod schemas, `/api/v1` contract, DB design and ADRs 0003–0008 are framework-neutral
and are kept; only admin screens are rebuilt. After F2, rollback cost grows sharply (re-implement admin).

## Proposed CLAUDE.md changes (need user approval; author does not edit)

1. §3 table, row "Web/Control plane": add "Client apps may use **Payload CMS 3** (MIT) on the same Next.js
   16 / Node 24 base — ProyekKas ADR 0001".
2. §3.6 Next.js: add "Payload Local API calls must set `overrideAccess: false` + `user` in request context".

## Revision history

- **2026-09-23 (F0 gate):** accepted by user.
- **2026-09-23 (F1 spike, user-approved):** F1 spike gate passed — **Payload 3.90.1 = GO** (user decision;
  evidence `../spikes/f1-spike-report.md` §Verdict, spikes a–h). Decision 8 extended: no `json`/`code` field
  editors in the admin (user decision: Monaco loads from jsdelivr), `admin.avatar: 'default'`, mandatory
  remote-URL guard hook on every upload collection (`pasteURL:false` insufficient in 3.90.1). Consequences
  updated with measured RAM, admin CSP (`style-src 'unsafe-inline'`, user decision) and the webpack build.
  Rollback note: fallback not triggered.
