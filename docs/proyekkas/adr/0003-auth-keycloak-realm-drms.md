# ADR 0003 — Authentication & identity: Keycloak realm `drms`, OIDC for web and APK

- **Status:** accepted (user, GATE F0 2026-09-23); revised 2026-09-23 after the F1 spike (user-approved, see Revision history)
- **Date:** 2026-09-23
- **Author:** Analyst/Architect — Phase 0
- **Related:** brief §2 #3; `/opt/infra/CLAUDE.md` §3.2 (login), §3.6; `/opt/infra/identity/keycloak/*`
  (read-only); `/opt/infra/traefik/dynamic/platform/auth.yml`; `/opt/src/control-plane/README.md` §Auth;
  ADR 0001; `../architecture.md` §7 (authz), §11 (threat model); mobile ADR `0010-*.md` (other agent)

## Context

### Observed (read-only, 2026-09-23)
- Keycloak `26.7.4` (optimized image), `KC_HOSTNAME=https://auth.bimacreative.tech`,
  `KC_HOSTNAME_ADMIN=https://auth.bimacreative.tech:8443`, `KC_PROXY_HEADERS=xforwarded`, `KC_CACHE=local`,
  on networks `proxy` + `db` (`/opt/infra/identity/keycloak/docker-compose.yml`).
- Existing realms `platform`, `platform-staging` (`realm-export/*.json`). `platform` settings:
  `accessTokenLifespan 300`, `ssoSessionIdleTimeout 1800`, `ssoSessionMaxLifespan 36000`,
  `offlineSessionIdleTimeout 2592000`, `revokeRefreshToken false`, `bruteForceProtected true`,
  `resetPasswordAllowed false`, password policy `length(12) … passwordHistory(5)`.
  Default client-scope mappers: `realm roles` → claim `realm_access.roles` (access token),
  `client roles` → `resource_access.${client_id}.roles`, `sub` mapper in scope `basic`.
- Traefik `auth.yml`: `/admin` and `/realms/master/` **only via `ipallowlist-admin`** (SSH tunnel);
  router `auth-login` applies **`ratelimit-login` = 10 req/min/IP, burst 10** to
  `^/realms/[^/]+/protocol/openid-connect/(auth|token)$` and login-actions.
- control-plane: Auth.js v5 beta, confidential client, PKCE S256, roles from client roles; README notes
  server→Keycloak calls through the public URL hit `ratelimit-login`.
- Payload 3.90.1: `auth.strategies[]`, `disableLocalStrategy`, sessions array on the user doc
  (`sessionsFieldConfig`), exports `addSessionToUser`, `generatePayloadCookie` (`payload/shared`),
  `jwtSign`, `getFieldsToSign`, `executeAuthStrategies` (`payload`); built-in JWT strategy rejects
  collections with `disableLocalStrategy` (`auth/strategies/jwt.ts` L160) (ADR 0001 sources).

### Keycloak 26.7.4 facts used (fetched 2026-09-23)
- OIDC endpoints `/realms/{realm}/protocol/openid-connect/{auth,token,logout,userinfo,revoke,certs}`,
  `/logout/backchannel-logout`; revoke = RFC 7009 — `docs/documentation/server_admin/topics/sso-protocols/
  con-server-oidc-uri-endpoints.adoc` @ tag `26.7.4` (raw.githubusercontent.com).
- Public clients need no secret; must use strict redirect URIs + HTTPS (`con-oidc-auth-flows.adoc` L27–28);
  back-channel logout supported (L378–384); "Revoke Refresh Token" option (L89).
- Admin REST (`https://www.keycloak.org/docs-api/26.7.4/rest-api/index.html`):
  `POST /admin/realms/{realm}/users`, `PUT …/users/{user-id}`, `PUT …/users/{user-id}/reset-password`,
  `PUT …/users/{user-id}/execute-actions-email`, `POST …/users/{user-id}/role-mappings/realm`,
  `GET …/users/{user-id}/sessions`, `GET …/users/{user-id}/offline-sessions/{clientUuid}`,
  `POST …/users/{user-id}/logout`, `DELETE /admin/realms/{realm}/sessions/{session}` (query `isOffline`,
  default false), `DELETE …/users/{user-id}/consents/{client}` ("Revoke consent and offline tokens for
  particular client from user"), `POST /admin/realms/{realm}/logout-all`.

## Decision

### 1. Realms and clients
- Realm **`drms`** (prod) and **`drms-staging`** (staging), mirroring the `platform`/`platform-staging`
  convention. Created by **infra-engineer** (shared Keycloak → coordination with infra session), exported
  to `/opt/infra/identity/keycloak/realm-export/drms*.json` (secrets excluded).
- Clients per realm:
  | clientId | Type | Flow | Redirects |
  |---|---|---|---|
  | `proyekkas-web` | confidential | Authorization Code + **PKCE S256** + state + nonce | `https://<pk-host>/auth/callback`; post-logout `https://<pk-host>/admin/login` (exact) |
  | `proyekkas-mobile` | **public** | Authorization Code + **PKCE S256** via system browser (AppAuth-style; library in ADR 0010); scope `openid offline_access` | App Link `https://<pk-host>/app/callback` preferred over custom scheme (claimed HTTPS link prevents scheme hijacking; Android App Links verification = ADR 0010) |
  | `proyekkas-admin-api` | confidential, **service account only** | client_credentials | — ; `fullScopeAllowed: false` + scope mapping `realm-management` + SA client role `realm-management` in realm `drms` only. **Verified F1** (spike §b): `manage-users` alone covers GET users, delete online/offline session, revoke consent and user logout; without the scope mapping every call returns 403. The imported realm export maps `view-users` + `manage-users` (both acceptable; `view-users` optional) |
- Realm settings (as imported, `/opt/infra/identity/keycloak/realm-export/drms{,-staging}.json`): access token
  300 s; SSO idle 30 min / max 10 h (web); offline session idle **14 days** (user 2026-09-23) and offline
  session **max lifespan 30 days** (`offlineSessionMaxLifespanEnabled: true`, `offlineSessionMaxLifespan:
  2592000`; **confirmed by user 2026-09-23** for the `proyekkas-mobile` offline sessions — these are realm
  settings, and `proyekkas-mobile` is the only client using `offline_access`) → a field device must log in
  again at least every 30 days even when used daily; brute force protection on; password policy = platform
  policy; `rememberMe` off; **Revoke Refresh Token = on** (a realm setting in Keycloak, not per client —
  infra runbook; refresh rotation + reuse detection).
- Web client: `frontchannelLogout` off; **back-channel logout disabled** (Lead decision, as imported: no
  `backchannel.logout.url`). The app checks `web-sessions`/`devices` itself on every request (§3–§5), so it
  does not depend on Keycloak calling it. Consequence: a session ended only on the Keycloak side (e.g. by an
  operator in the admin console) does not revoke the matching `web-sessions` row; the row still expires by
  its own `expiresAt`. Session ends initiated in ProyekKas (logout, device revoke, deactivate) go through §5.

### 2. Roles — source of truth
- **Keycloak realm roles** in `drms` = source of truth for *role membership*: `pk-staff`, `pk-pm`,
  `pk-finance`, `pk-owner`, `pk-admin` (multi-role allowed, US-32). Emitted in `realm_access.roles`
  (default mapper, verified in platform export). ID-token inclusion must be enabled on the mapper for the
  web client (platform mapper has `id.token.claim` unset).
- **ProyekKas DB** = source of truth for *scope data* (employee link, team assignments, project PM,
  active flag mirror, signature image, default bank account).
- User & role management happens **in the ProyekKas admin** (Admin role) — Keycloak admin console is not
  reachable for the client (IP allow-list). `users` collection hooks call the Keycloak Admin REST API with
  the `proyekkas-admin-api` service account: create user, set `enabled`, assign/remove realm roles,
  `execute-actions-email` (`UPDATE_PASSWORD`) for onboarding/reset (requires realm SMTP — infra), logout.
  Writes are **Keycloak-first, then DB** inside one service call; on Keycloak failure nothing is saved;
  on DB failure a compensating Keycloak call runs and the event is audited.
- On each login/token use, roles from the token are compared to `users.roles` cache; mismatch → cache
  updated + audit `role_sync`. Authorization decisions use **token roles ∩ `users.active`**.

### 3. Web (admin panel) login — custom Payload strategy
- `users` collection: `auth: { disableLocalStrategy: true, strategies: [oidcSession, mobileBearer], useSessions: … }`
  (`useSessions` irrelevant once local strategy is disabled; our own session table is used).
- Routes (Next.js route handlers, not under `/api/<slug>`):
  `GET /auth/login` → builds Authorization Code + PKCE (S256) + `state` + `nonce` (stored in a
  short-lived, `HttpOnly; Secure; SameSite=Lax` cookie) → redirect to Keycloak.
  `GET /auth/callback` → exchanges code at the token endpoint (confidential), validates ID token
  (`iss`, `aud`=`proyekkas-web`, `azp`, `exp`, `nonce`) with `jose` JWKS, maps `sub` → `users.keycloakSub`
  (must exist and be `active`), creates a row in **`web-sessions`** (random 256-bit id, stored hashed;
  `userId`, Keycloak `sid`, `createdAt`, `expiresAt`, `lastSeenAt`, `ip`, `userAgent`, `revokedAt`), sets
  cookie `__Host-pk_session` (`HttpOnly; Secure; SameSite=Lax; Path=/`), audit `login`.
  `POST /auth/logout` → revoke `web-sessions` row, redirect to Keycloak end-session (`id_token_hint`,
  `post_logout_redirect_uri`).
- Strategy `oidcSession.authenticate({ headers, payload })`: parse cookie → lookup hashed id → reject if
  revoked/expired/user inactive → sliding `lastSeenAt` (throttled) → return `{ user: { collection:
  'users', ...doc } }`. For unsafe methods it also checks `Origin`/`Sec-Fetch-Site` = same-origin (CSRF
  defence in addition to SameSite=Lax).
- Admin UI: `admin.components.beforeLogin` renders the SSO button (verified rendering path);
  `admin.components.logout.Button` → `POST /auth/logout`.
- **Verified in F1** (spike §a, Keycloak 26.7.4 + Payload 3.90.1): login redirect with PKCE S256 + state +
  nonce, callback → `/admin`, `/api/users/me` via `oidcSession`, no Payload JWT cookie ever issued, cross-origin
  POST 403, logout → Keycloak end-session with `id_token_hint`, Keycloak SSO session ended. Still
  **UNVERIFIED** (staging over HTTPS): `__Host-pk_session` + `Secure` (spike ran over http), and Payload's own
  `/api/users/logout` inactivity path → `afterLogout` revoking our session.
- The admin CSP must allow the IdP in `form-action` (`'self' https://auth.bimacreative.tech`), otherwise the
  logout 303 to Keycloak is blocked (spike §f; architecture §3.3).
- Library: **`openid-client@6.8.8`** (MIT, published 2026-09-05, registry) for discovery/PKCE/code exchange,
  **`jose@6.2.12`** (MIT, 2026-09-05) for JWT/JWKS (Payload itself depends on `jose` — registry deps list).
  Auth.js (control-plane) is the alternative; rejected here because Payload needs the session in its own
  strategy, and bridging Auth.js JWE cookies adds a second session format.

### 4. APK — bearer tokens on `/api/v1`
- Strategy `mobileBearer`: only when `Authorization: Bearer` is present; verifies Keycloak **access token**
  locally via JWKS (`/realms/drms/protocol/openid-connect/certs`, cached, `kid` rotation handled by `jose`),
  checks `iss`, `azp`=`proyekkas-mobile`, `exp`/`nbf` (≤ 60 s skew), `typ=Bearer`, algorithm `RS256`. **`aud`
  is not checked**: Keycloak 26.7.4 access tokens carry `aud: "account"` by default, not the client (verified
  F1) — only if an audience mapper is added later may `aud` be enforced. Then requires header
  **`X-Device-Id`** → `devices` row owned by this user, `status=active`, and an active user by `keycloakSub`.
  Returns user. The strategy acts only when `req.pathname` starts with `/api/v1/`.
- Traefik removes `Authorization` on non-`/api/v1` routes (architecture §6.1) so APK tokens cannot drive
  Payload's generic REST. Second layer (verified F1): even if a bearer reaches `/api/<slug>`, it is **never
  authenticated** — Payload answers **403** (access false) or **200 `{user:null}`** on `/api/users/me`, not 401.
- **Verified in F1** (spike §b): real Authorization Code + PKCE on `proyekkas-mobile` → `/api/v1/me` 200;
  missing/unknown device, tampered signature, wrong `azp`, revoked device, inactive user → 401.

### 5. Device registry & remote logout
- `devices`: `deviceId` (UUID generated by the app at install), `user`, `platform`, `model`, `appVersion`,
  `fcmToken` (ADR 0011), `keycloakSid` (from token `sid` claim — **`sid` is present** in Keycloak 26.7.4
  access and ID tokens, verified F1 spike §b and the infra offline import test), `registeredAt`, `lastSeenAt`, `status`
  (`active|revoked|lost`), `revokedAt`, `revokedBy`, `reason`. Registered on first `/api/v1` call after login
  (`POST /api/v1/devices/register`).
- **Remote logout of one device** (Admin/Owner or user self-service): (1) `devices.status=revoked` →
  effective **immediately** for our API (strategy check) — needed because Keycloak revocation does not
  invalidate already-issued self-contained access tokens (≤ 300 s remain valid by signature);
  (2) `DELETE /admin/realms/drms/sessions/{sid}?isOffline=true` to kill the offline session (verified F1: for a
  session created with `offline_access` the plain/online `DELETE` returns **404**; `?isOffline=true` → 204 and
  the refresh token then fails with 400); (3) FCM token cleared; (4) audit `device_revoke` with reason.
- **Logout all of a user / deactivate user**: `PUT users/{id}` `enabled=false` +
  `POST users/{id}/logout` + `DELETE users/{id}/consents/proyekkas-mobile` (revokes offline tokens) +
  all `devices`/`web-sessions` revoked. **Verified F1:** `POST users/{id}/logout` alone does **not** end
  offline sessions (mobile refresh still 200 afterwards); the consent DELETE is required (refresh → 400).
- Web sessions: ~~back-channel logout from Keycloak~~ — disabled (§1); web sessions are revoked by our own
  logout/deactivate paths and expire by `expiresAt`.

### 6. Network path to Keycloak (revised 2026-09-23: public issuer, hairpin)
- Token/JWKS from the APK go through Traefik public routes. The `ratelimit-login` conflict (10/min/IP on
  `/token`, carrier NAT) is **resolved by infra (live)**: router `auth-drms-token` for
  `/realms/{drms,drms-staging}/protocol/openid-connect/token` with middleware `ratelimit-drms-kc-token`
  (average 60/min, burst 30) (`/opt/infra/traefik/dynamic/clients/drms-proyekkas-kc-token.yml`);
  login-actions stay on `ratelimit-login`.
- Server-side calls (code exchange, JWKS, discovery, admin REST) go to the **public issuer
  `https://auth.bimacreative.tech` (hairpin)**, **not** `keycloak:8080`: the web containers are on network
  `drms-kas-edge` (only `traefik` besides them), not on `proxy` (infra runbook
  `/opt/infra/docs/runbooks/proyekkas-drms-onboarding.md`, Lead decision). The server-side token call
  therefore passes `auth-drms-token`. `iss` = the public issuer by construction. (The F1 spike showed that
  the internal URL also yields the public `iss` with hostname v2 — kept as a fact, no longer used.)
- **Open item (UNVERIFIED, F1):** Keycloak Admin REST (`/admin/realms/...`) is behind `ipallowlist-admin`
  (`127.0.0.1/32`, `10.100.0.1/32`) on router `auth-admin` (`/opt/infra/traefik/dynamic/platform/auth.yml`).
  Whether hairpin requests from `drms-kas-edge` (10.100.7.0/24) pass that allow-list has not been tested; if
  not, the `users`/`devices` hooks that call Admin REST (§2, §5) fail with 403. Resolution (infra + Lead)
  needed before those hooks go to staging.

### 7. Inactive users & login failures
- Inactive = Keycloak `enabled=false` (cannot log in) **and** `users.active=false` (strategies reject even
  valid tokens). Deactivation requires a reason (audit, requirements §8).
- Login failures are counted by Keycloak brute-force protection; events can be read via admin events —
  whether we import Keycloak login-failure events into our audit log (`login_failed`) is optional
  (Keycloak event listener config **UNVERIFIED**; propose: poll `GET /admin/realms/{realm}/events` —
  endpoint existence not checked this session → UNVERIFIED).

## Alternatives

| Alternative | Rejected because |
|---|---|
| Payload local auth (email/password) | Violates platform SSO decision (CLAUDE.md §3.2), no device/session control across APK |
| Keycloak as sole session store (introspection per request) | +1 HTTP call/request to Keycloak; introspection through Traefik would hit rate limits; local JWT validation + device table is cheaper |
| Payload JWT cookie after OIDC (keep local strategy, block password login) | Keeps unused password endpoints (`/api/users/login`, forgot-password) alive → larger attack surface |
| Client roles instead of realm roles | Two clients (web, mobile) need the same roles; realm is dedicated to DRMS so realm roles do not leak |
| Custom URL scheme redirect for APK | Scheme hijacking risk; App Links preferred (final choice ADR 0010) |

## Consequences

- Two custom strategies + auth routes are security-critical code → dedicated unit/integration tests and
  qa-security review in F1.
- Keycloak becomes a runtime dependency for user administration; if Keycloak is down, admins cannot
  create users (login also impossible) — acceptable.
- Infra changes: realms/clients and token-endpoint rate-limit rule — **done** (2026-09-23, infra `main`
  `c557c28` + Lead); still open: SMTP for the realm (`execute-actions-email` returns 500 until then — infra
  runbook §Catatan) and Admin REST reachability over the hairpin (§6).
- Client secrets of `proyekkas-web` / `proyekkas-admin-api` are generated by Keycloak at import and stored
  by infra at `/opt/infra/identity/keycloak/secrets/drms{,-staging}-<client>.secret` (never in git); the app
  compose copies them into its `.env` (600).

## Security implications

- Access tokens valid ≤ 300 s even after revocation → closed by `devices`/`web-sessions` checks.
- Service account `manage-users` in realm `drms` can create/disable any `drms` user → secret only in
  web/worker env; its use is audited; scope limited to realm `drms` (realm-management roles are per realm).
- PKCE S256 on both clients; web client confidential; state/nonce validated; cookies `__Host-` prefixed.
- Mobile refresh tokens stored in Android Keystore-backed storage (ADR 0010); rotation on.
- Brute force: Keycloak + Traefik `ratelimit-login` on login-actions.

## Rollback

Remove realm clients / disable realm `drms` (infra). App side: strategies are config; reverting to a
different auth design requires only `users` collection auth config + routes. No data migration.

## Proposed CLAUDE.md changes (need user approval; author does not edit)

1. §3.2 "Login" paragraph: add "Client apps outside Odoo (e.g. ProyekKas/Payload) use a dedicated realm per
   client (`<slug>`, `<slug>-staging`) and custom OIDC strategies — see ProyekKas ADR 0003".

## Revision history

- **2026-09-23 (F0 gate):** accepted by user.
- **2026-09-23 (F1 spike, user-approved):** Payload 3.90.1 = GO (user). Spike §a/§b results recorded:
  access-token checks `iss` + `azp` + `typ=Bearer` + `exp` (not `aud`, which is `account`); `sid` present
  (closes §5 UNVERIFIED); offline device logout needs `DELETE /sessions/{sid}?isOffline=true` (online variant
  404); `POST users/{id}/logout` does not end offline sessions → deactivate also revokes consent
  `proyekkas-mobile`; `proyekkas-admin-api` = `fullScopeAllowed:false` + scope mapping, `manage-users`
  minimal; generic REST with a bearer answers 403 / 200 `{user:null}`, never authenticates. User decision:
  offline session max lifespan **30 days** (with 14-day idle). Infra facts (verified by Lead 2026-09-23):
  realms `drms`/`drms-staging` imported, back-channel logout disabled, app reaches Keycloak via the public
  issuer (hairpin) on network `drms-kas-edge`, router `auth-drms-token`, client secrets under
  `/opt/infra/identity/keycloak/secrets/`. New open item: Admin REST behind `ipallowlist-admin` (§6).
