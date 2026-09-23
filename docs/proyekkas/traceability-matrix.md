# ProyekKas — Traceability Matrix (US → module → collections → API → screen → phase → test)

Date: 2026-09-23 · Source: `requirements-v1.1.md` (US-01..US-59), collection slugs from `f0-brief.md` §3.

Conventions:
- **Collections**: Payload collection slugs as proposed in `f0-brief.md` §3 (ADR may refine). `media-*` = upload collections split by resize policy.
- **API**: `/api/v1/...` = custom domain-action endpoint. Paths listed in `f0-brief.md` §3 are marked (brief); all others are **proposed** by the Analyst and must be confirmed by the API ADR. "Payload REST" = Payload's generated `/api/<slug>` CRUD; whether the APK may call it is undecided (brief §3) → such rows carry **TBD-architecture**.
- **Screen**: `web admin` = Payload admin panel (CRUD); `web dashboard` = custom Next.js pages/views; `APK` = Flutter app.
- **Phase** (assumed, pending Lead's phase plan): F1 foundation (auth, users/roles, masters, audit log, numbering, media) · F2 core request flow (T1–T8, approvals/signatures, PDF, receipt validation, period closing) · F3 web dashboards/reports/export · F4 APK · F5 project/progress/attendance/vehicle reports (T9–T12) · F6 hardening/UAT/release · F7 post-release (Odoo mirror, OCR). A story whose server logic lands in F2 but whose APK screen lands in F4 is listed as "F2 (API) / F4 (APK)".
- **Test type**: unit (service/hook logic), API (HTTP-level incl. negative authz tests), e2e (Playwright web / Flutter integration), manual (UAT/visual).
- Any mapping marked **TBD-architecture** depends on a decision the architecture/ADR agent owns.

| US | Module | Roles | Payload collections | API | Screen | Phase | Test type |
|---|---|---|---|---|---|---|---|
| US-01 | M11 | Staff | `attendances`, `projects`, `media-selfies`, `devices`, `audit-logs` | `POST /api/v1/attendance/check-in` (brief), `POST /api/v1/attendance/check-out` (proposed) | APK | F5 (API) / F4 (APK) | unit (geofence, 1×/day), API, e2e (APK), manual (mock location) |
| US-02 | M11 | Staff | `attendances`, `devices` | `POST /api/v1/sync/batch` (brief) | APK | F4 | unit (offline merge), API, e2e (airplane-mode) |
| US-03 | M03 | Staff, PM, Admin | `expense-requests` (+`lines`), `projects`, `cost-centers`, `employee-bank-accounts`, `expense-categories`, `uoms` | Payload REST `POST /api/expense-requests` (draft) **TBD-architecture**; `POST /api/v1/expense-requests/{id}/submit` (brief) | APK, web dashboard | F2 (API) / F4 (APK) | unit (grand total, project XOR cost center), API (validation errors), e2e |
| US-04 | M03 | Staff, Admin (creator) | `expense-requests`, `approvals`, `audit-logs` | `POST /api/v1/expense-requests/{id}/withdraw`, `/cancel` (proposed); draft edit via Payload REST **TBD-architecture** | APK, web dashboard | F2 / F4 | unit (state guard), API (edit after decision → rejected) |
| US-05 | M03, M12 | Staff | `expense-requests`, `notifications`, `devices` | `GET /api/v1/expense-requests/{id}` (proposed, includes timeline) | APK, web dashboard | F2 / F4 | API, e2e, manual (push) |
| US-06 | M03 | Staff | `expense-requests` | `POST /api/v1/expense-requests/{id}/resubmit` (proposed; clones into new draft) | APK, web dashboard | F2 / F4 | unit (clone incl. lines/requesters), API |
| US-07 | M06 | Staff | `receipts`, `media-receipts`, `expense-requests` | `POST /api/v1/expense-requests/{id}/receipts` (proposed) or Payload upload REST **TBD-architecture** | APK, web dashboard | F2 / F4 | unit (resize, totals), API, e2e |
| US-08 | M06 | Staff | `settlements`, `receipts` | `POST /api/v1/expense-requests/{id}/lpj/submit` (brief `/lpj/submit`) | APK, web dashboard | F2 / F4 | unit (Uang Muka only), API |
| US-09 | M11 | Staff | `attendances` | `GET /api/v1/attendance/me?month=` (proposed) | APK | F5 / F4 | API, e2e |
| US-10 | M09 | PM | `progress-reports`, `project-stages`, `media-progress-photos` | `POST /api/v1/progress-reports` (proposed) | APK, web dashboard | F5 | unit (weight × % recompute, ≤5 photos), API, e2e |
| US-11 | M09, M12 | PM | `progress-reports`, `notifications`, `company-settings` | job/cron (pg-boss or Payload Jobs — **TBD-architecture**) | APK | F5 | unit (N-day rule), manual |
| US-12 | M02, M08 | PM, Owner | `projects`, `project-stages`, `cash-entries`, `expense-requests` | `GET /api/v1/dashboard/pm` (proposed) | web dashboard, APK | F3 / F4 | unit (colour thresholds), e2e |
| US-13 | M11 | PM | `attendances`, `team-assignments` | `GET /api/v1/attendance/team-today` (proposed) | APK, web dashboard | F5 | API (team scope), e2e |
| US-14 | M11 | PM | `attendances`, `media-selfies` | `POST /api/v1/attendance/on-behalf` (proposed) | APK | F5 | unit, API (non-team member → rejected) |
| US-15 | M11 | PM | `attendance-corrections`, `attendances`, `audit-logs` | `POST /api/v1/attendance/{id}/correct` (proposed) | web dashboard, APK | F5 | unit (reason required), API |
| US-16 | M10 | PM, Owner, Admin | `team-assignments`, `employees` | Payload REST `/api/team-assignments` (web admin) | web admin, web dashboard | F5 | API (PM scope), e2e |
| US-17 | M03 | PM | `expense-requests` | `GET /api/v1/expense-requests?scope=team` (proposed) | APK, web dashboard | F2 / F4 | API (other PM's project → 403/empty; approve → rejected) |
| US-18 | M08 | PM | `budget-addenda`, `approvals` | `POST /api/v1/budget-addenda` (proposed), `/submit` | web dashboard | F5 | unit, API |
| US-19 | M05 | Finance | `expense-requests` | `GET /api/v1/transfer-queue` (proposed) | web dashboard | F2 / F3 | API (both request types), e2e |
| US-20 | M05, M07 | Finance | `transfers`, `cash-entries`, `media-transfer-proofs`, `cash-accounts` | `POST /api/v1/expense-requests/{id}/transfer` (brief) | web dashboard | F2 | unit (auto cash-out, no delete), API (amount ≠ approved → rejected) |
| US-21 | M06 | Finance | `settlements`, `receipts` | `POST /api/v1/settlements/{id}/verify`, `/request-revision` (proposed) | web dashboard | F2 | unit, API |
| US-22 | M06, M07 | Finance | `settlements`, `cash-entries`, `transfers` | `POST /api/v1/expense-requests/{id}/settle` (brief `/settle`) | web dashboard | F2 | unit (surplus → cash-in, deficit → reimburse transfer), API |
| US-23 | M07 | Finance | `cash-entries`, `cash-accounts`, `cash-in-sources`, `expense-categories` | `POST /api/v1/cash-entries` (proposed) | web dashboard | F2 | unit, API (closed period → rejected) |
| US-24 | M07 | Finance | `cash-reversals`, `cash-entries`, `audit-logs` | `POST /api/v1/cash-entries/{id}/void` (brief) | web dashboard | F2 | unit (reversal entry), API (hard delete → rejected) |
| US-25 | M13 | Finance, Owner | `cash-entries`, `expense-requests` (lines), `cost-centers` | `GET /api/v1/reports/cash-summary` + export (proposed) | web dashboard | F3 | unit (aggregation by line category), e2e (Excel download) |
| US-26 | M04 | Owner | `approvals`, `expense-requests`, `receipts`, `media-signatures` | `POST /api/v1/expense-requests/{id}/approve`, `/reject` (brief) | APK, web dashboard | F2 / F4 | unit (budget impact), API (requester approves own → rejected), e2e |
| US-27 | M02 | Owner | `cash-entries`, `cash-accounts`, `expense-requests`, `settlements` | `GET /api/v1/dashboard/owner` (proposed) | web dashboard, APK | F3 / F4 | API, e2e; layout: prototype not available → manual |
| US-28 | M02, M13 | Owner | `cash-entries` | `GET /api/v1/reports/cash-monthly` (proposed) | web dashboard | F3 | unit, e2e |
| US-29 | M08 | Owner | `projects`, `project-stages`, `stage-templates` | Payload REST `/api/projects` (web admin) + archive action `POST /api/v1/projects/{id}/archive` (proposed) | web admin | F1 (masters) / F5 (stages) | unit (weights = 100%), API (delete with transactions → rejected) |
| US-30 | M08 | Owner | `budget-addenda`, `approvals`, `projects` | `POST /api/v1/budget-addenda/{id}/approve` (proposed) | web dashboard, APK | F5 | unit, API |
| US-31 | M09 | Owner | `progress-reports`, `media-progress-photos` | `GET /api/v1/progress-reports` (proposed) | web dashboard, APK | F5 | API, e2e |
| US-32 | M01, M14 | Admin | `users`, `employees`, `devices` + Keycloak realm `drms` | Payload REST `/api/users` (web admin); Keycloak Admin API for disable/revoke **TBD-architecture** | web admin | F1 | API (inactive user → login rejected), e2e |
| US-33 | M14 | Admin, Finance | all master collections | Payload REST `/api/<slug>` (web admin) | web admin | F1 | unit (in-use → delete rejected), API |
| US-34 | M14, M04 | Admin | `approval-rules` | Payload REST `/api/approval-rules` (web admin) | web admin | F1 (master) / F2 (engine) | unit (rule resolution, snapshot), API |
| US-35 | M15 | All | `audit-logs` | `GET /api/v1/audit-logs?doc_type=&doc_id=` (proposed) | web dashboard, APK | F1 (writer) / F3 (UI) | unit (append-only, DB-level update/delete rejected), API |
| US-36 | M03 | Staff, PM, Admin | `expense-requests` | `POST /api/v1/expense-requests/{id}/submit` (brief) | APK, web dashboard | F2 / F4 | unit (type-specific state machine), API (type change after submit → rejected) |
| US-37 | M03 | Staff, PM, Admin | `expense-requests` (`lines`), `uoms`, `expense-categories`, `vehicles` | draft save via Payload REST **TBD-architecture** / `/api/v1` | APK, web dashboard | F2 / F4 | unit (seed grand total 1.447.500; line total user-entered, unit price informational — Q-05 answered), API |
| US-38 | M03, M06 | Staff | `receipts`, `media-receipts`, `expense-requests` | `POST /api/v1/expense-requests/{id}/submit` (brief) | APK, web dashboard | F2 / F4 | API (Reimburse line without receipt → rejected), e2e |
| US-39 | M06 | Finance | `receipts`, `expense-requests` | `POST /api/v1/expense-requests/{id}/receipts/verify`, `/request-receipt-revision` (proposed) | web dashboard | F2 | unit (open flags block "Nota Terverifikasi"), API |
| US-40 | M03 | Staff, Admin | `expense-requests`, `employees` | submit (brief) | APK, web dashboard | F2 / F4 | unit (requester set), API (any requester approves → rejected) |
| US-41 | M03 | Admin, Finance (per Q-09) | `expense-requests`, `users` | Payload REST create **TBD-architecture**; submit (brief) | web admin or web dashboard **TBD-architecture** | F2 | API (client-supplied creator ignored), unit |
| US-42 | M04 | PM / cost-center head (per Q-07) | `approvals`, `approval-rules`, `media-signatures` | `POST /api/v1/expense-requests/{id}/acknowledge` (proposed) | APK, web dashboard | F2 / F4 | unit (step ordering), API (non-designated user → rejected) |
| US-43 | M04, M01 | All signers | `approvals`, `media-signatures`, `users` | multipart on approve/acknowledge (proposed) | APK, web dashboard | F2 / F4 | unit (snapshot immutability), API, manual (draw on screen) |
| US-44 | M03 | Staff, Admin | `employee-bank-accounts`, `banks`, `expense-requests` | submit (brief) | APK, web dashboard | F2 / F4 | API (non-requester account → rejected), unit (snapshot) |
| US-45 | M14 | Admin | `document-sequences` | Payload REST `/api/document-sequences` (web admin); number issued inside submit | web admin | F1 | unit (token rendering → `228/PB-DRMS/20/IX/2026`), API (50 parallel submits → unique numbers) |
| US-46 | M16 | Finance, Owner, Admin, PM, Staff | `expense-requests`, `approvals`, `receipts`, `media-receipts`, `company-settings` | `GET /api/v1/expense-requests/{id}/pdf` (proposed); PDF engine **TBD-architecture** | web dashboard (+ APK per Q-16) | F2 | unit (content/totals), manual (visual vs client form), API (authz) |
| US-47 | M06 | Finance | `receipts`, `expense-requests`, `company-settings` | computed on submit/receipt upload (proposed service) | web dashboard, APK | F2 | unit (seed: Rp 124 → info at tolerance 1.000) |
| US-48 | M06 | Finance | `receipts`, `expense-requests` | same service as US-47 | web dashboard | F2 | unit (seed: 21/09 receipts flagged, 20/09 hotel not) |
| US-49 | M06, M14 | Finance, Admin | `uoms`, `expense-categories`, `expense-requests` | same service; `uoms` via Payload REST (web admin) | web admin, web dashboard | F1 (master) / F2 (flag) | unit (seed: BBM "bulan" flagged) |
| US-50 | M06 | Finance | `receipts`, `media-receipts` | same service | web dashboard | F2 | unit + API (re-upload Soto TX0101.0001.000123 → flag) |
| US-51 | M17 | Admin | `vehicles`, `expense-requests` (`lines`) | Payload REST `/api/vehicles` (web admin) | web admin, APK (picker) | F1 | unit (plate normalisation, uniqueness), API |
| US-52 | M17, M13 | Owner, Finance | `expense-requests` (`lines`), `cash-entries`, `vehicles` | `GET /api/v1/reports/vehicle-costs` (proposed) | web dashboard | F5 | unit (seed DA1234XY = Rp 600.000), e2e (export) |
| US-53 | M03, M14 | Staff, PM, Admin | `cost-centers`, `expense-requests`, `team-assignments` | Payload REST `/api/cost-centers` (web admin); submit (brief) | web admin, APK, web dashboard | F1 (master) / F2 (link) | API (both/neither set → rejected), unit |
| US-54 | M19 | Staff, Finance | `receipts`, `media-receipts` | `POST /api/v1/receipts/ocr` (proposed); OCR engine **TBD-architecture** | APK, web dashboard | F7 | manual (accuracy report on 3 seed receipts) |
| US-55 | M14 | Admin | all master collections, `users` | Payload REST `/api/<slug>` | web admin | F1 | API (negative authz per role), e2e |
| US-56 | M01 | All | `users`, `devices` + Keycloak realm `drms` | OIDC Auth Code + PKCE; revocation mechanism **TBD-architecture** | web admin, web dashboard, APK | F1 (web) / F4 (APK) | e2e (login), API (revoked session → rejected), manual |
| US-57 | M06, M09, M11 | All uploaders | `media-receipts`, `media-selfies`, `media-transfer-proofs`, `media-progress-photos`, `media-signatures`, `media-company-logo` | upload endpoints (above) | APK, web admin | F1 (server resize) / F4 (device resize) | unit (4000×3000 → ≤ target, EXIF GPS stripped), manual (legibility) |
| US-58 | M18 | Admin, Owner, Finance | `odoo-outbox` + all mapped collections | worker → Odoo 19 JSON-2 `POST /json/2/<model>/<method>` (brief); Odoo model mapping **TBD-architecture** | web admin (sync status) | F1 (outbox schema) / F7 (worker) | unit (outbox in same tx), API/integration (idempotent resend) against Odoo staging |
| US-59 | M04 | Owner, approvers | `approvals`, `receipts`, `expense-requests` | `GET /api/v1/expense-requests/{id}` (proposed) | APK, web dashboard | F2 / F4 | API (flag count stored on decision), e2e |

Coverage check: US-01..US-35 (v1.0) and US-36..US-59 (v1.1) each appear exactly once above.
