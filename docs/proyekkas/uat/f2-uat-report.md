# ProyekKas F2 — UAT report (staging)

- **Date:** 2026-09-24 · **Target:** `https://drms-kas.staging.bimacreative.tech` (realm `drms-staging`)
- **Final build under test:** `proyekkas-web:0.1.0-stg-e9c07ab` (`develop` `e9c07ab`, web + worker)
- **Accounts:** fictional UAT accounts only (`*.uji@proyekkas.test`: Staff Uji, PM Uji, Finance Uji, Owner Uji),
  linked by the UAT seed (`apps/web/src/seed/uat.ts`). No credentials are recorded in this repository.
- **Result:** F2 flows pass end-to-end; the two remaining FAILs are one by-design item and one wording item
  (no security impact). See §3.

## 1. Method

End-to-end browser suite with **Playwright** (`@playwright/test` 1.63.0), driving the real admin panel and
`/api/v1` against staging through Keycloak SSO (password + TOTP required actions). The suite currently lives
**outside this public repository for now** (Lead workspace; its runtime inputs include per-run account
secrets, which must never enter the repo).

- One worker, sequential, **no retries** (a retry would repeat state changes on staging).
- Traces, videos and automatic screenshots **off** (they would capture typed passwords/TOTP); the step
  recorder takes explicit screenshots with secret fields masked.
- Paced for the platform limits: 400 ms per action, ≥ 10 s between logins, ≤ 6 login requests/min (Traefik
  login rate limit is per shared hairpin IP).
- Each run writes a Markdown/JSON report with every HTTP ≥ 400, WAF-like 403s, 429s and a counter of retries
  for the Payload row-skeleton race.

Scenarios: 0 accounts/profile signature · 1 Reimburse form-228 (3 lines, Rp 1.447.500, flags, Diketahui →
approve → Finance receipt verification → transfer → done, PDF, Riwayat) · 2 reject + resubmit · 3 Uang Muka
with LPJ revision, verification and refund · 4 request on behalf (Q-09) with delegated "Diketahui" ·
5 negative authz (masters hidden from Staff, self-decision, approved amount, hard delete, noise 403s).

## 2. Runs

| Run | Time (WIB) | Build | Result | Findings → action |
|---|---|---|---|---|
| 1 | 07:52–08:00 | `59ba0a4` | 14 PASS · 7 FAIL · 36 not run | (a) CrowdSec AppSec **CRS 911100** (allowed methods) blocked Payload admin saves via `PATCH /api/<collection>/<id>` → 403 → infra: narrow exclusion of 911100 only, PATCH/DELETE, `/api/`, drms-kas hosts (infra commit `3e049dc`, `security/crowdsec/appsec-configs/drms-payload-crs-exclusions.yaml`; CRS body inspection stays on). (b) Create-form **row race** in Payload 3.90.1: a line row added while the previous form-state request is pending stays a skeleton → test waits for form state; UI hint above "Baris item" (F2d). |
| 2 | 08:08–08:17 | `59ba0a4` | 23 PASS · 5 FAIL · 29 not run | No approval rules on staging → submit 409 "Tidak ada aturan approval…" → base seed re-run with the real master data. |
| 3 | 08:41–08:50 | `c11907a` (F2d)¹ | **50 PASS** · 3 FAIL | 1.3b by design (Q-04, see §3); 2.5 resubmit showed only the old title, not its number → F2e; 4.1 submit 409, no fallback acknowledger (PM is requester) → F2e delegation rule. |
| 4 | 09:31–09:40 | `e9c07ab` (F2e) | **56 PASS · 2 FAIL · 1 NOT TESTABLE** (+1 info) | see §3 |

¹ Inferred from the staging image build time (08:30 WIB); runs 1–2 ran on the image deployed at 07:14 WIB.

Run 4 traffic: **2,135 requests** (app 2,043, Keycloak 92), **0 × 429**, **0 WAF 403**, **0 race-retries**.
Staff `403 POST /api/approval-rules` noise from the request form: **13 → 0** (office-only fields hidden, F2e).
All HTTP ≥ 400 in run 4 were expected negative tests, plus one 409 on submit in 4.1 because the Finance test
account had no signature yet (uploaded, retried — PASS).

## 3. Run 4 — open items

| Step | Result | Assessment |
|---|---|---|
| 1.3b "receipt dated after request date" flag | FAIL | **By design (Q-04).** `requestDate` is the server submit date (2026-09-24); the form-228 receipts are dated 20–21/09, i.e. before it, so `date_after_request` cannot fire. The flag is covered by the form-228 integration fixture with its historical date. Client answer to Q-04 still open. |
| 5.2-approve: PM POSTs `approve` on a request where PM is requester | FAIL (409, expected 403) | **Still refused, status unchanged; no security impact.** The request was in "Menunggu Diketahui", so the state check (approve not allowed in `pending_ack`) answers 409 before the G1 self-decision guard (403). 5.2-acknowledge on the same request → 403 (G1; the service also writes an `access_denied` audit row — covered by `f2e-uat-fixes.int`, not queried on staging). Wording/order item carried to F6. |
| 4.2 Admin gives the delegated "Diketahui" | NOT TESTABLE | The only Admin account on staging is the user's own; not used by the suite. Delegation itself verified in 4.1: "Giliran: Admin — Diketahui (dilimpahkan)", Riwayat row `acknowledge_delegated` (Owner not eligible because the only Owner is the approver). Needs an "Admin Uji" test account. |

Verified in run 4 among others: form-228 grand total Rp 1.447.500, flags Rp 124 difference (info) and BBM
unit "bulan"; Finance verifies Reimburse receipts in **Antrian Transfer** (3 valid, 8 flags reviewed) →
transfer → done; PDF printed; resubmit shows **"Pengajuan ulang dari 233/PB-DRMS/24/IX/2026 — …"**; LPJ
revision → verify → refund KM; Finance creator of 4.1 sees no verification buttons; Staff gets 404 on master
collections; Finance cannot change the approved amount (REST and `/api/v1` PATCH → 403); DELETE of request
and transfer → 403 for every role.

## 4. Not covered here

Delegated acknowledge by an Admin (4.2); APK flows (F4); load/ZAP (F6). Unit/integration coverage of the F2e
rules: `apps/web/tests/{unit,integration}/f2e-uat-fixes*.ts`, `f2d-*`.
