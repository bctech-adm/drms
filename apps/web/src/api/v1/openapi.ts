import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

import { Device, DeviceRegister, DeviceRevoke, Health, Masters, MastersQuery, Me, Problem, Ready, TestEmailQueued } from './schemas'
import * as F from './schemas-flow'

/**
 * Builds the /api/v1 OpenAPI 3.1 document from the zod schemas (architecture §6.4). Pure module
 * (no Payload import) so scripts/gen-openapi.mjs can bundle and run it at build time; the output
 * is committed at packages/api-contract/openapi.json (CI drift check) and served by
 * GET /api/v1/openapi.json.
 */
export function buildOpenApiDocument(version: string) {
  const registry = new OpenAPIRegistry()
  const bearer = registry.registerComponent('securitySchemes', 'bearer', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'Keycloak access token of client proyekkas-mobile (realm drms). Requires header X-Device-Id of a registered active device.',
  })
  const cookie = registry.registerComponent('securitySchemes', 'session', {
    type: 'apiKey',
    in: 'cookie',
    name: '__Host-pk_session',
    description: 'Admin web session (OIDC login via /auth/login).',
  })
  const security = [{ [bearer.name]: [] }, { [cookie.name]: [] }]
  const deviceHeader = z.object({
    'X-Device-Id': z.uuid().meta({ description: 'Registered install id (APK).' }),
    'X-App-Version': z.string().optional().meta({ description: 'APK version; below company minimum → 426.' }),
  })
  const problemResponses = (...codes: number[]) =>
    Object.fromEntries(
      codes.map((c) => [c, { description: 'Problem', content: { 'application/problem+json': { schema: Problem } } }]),
    )

  registry.registerPath({
    method: 'get',
    path: '/health',
    summary: 'Liveness',
    responses: { 200: { description: 'Process up', content: { 'application/json': { schema: Health } } } },
  })
  registry.registerPath({
    method: 'get',
    path: '/health/ready',
    summary: 'Readiness (DB + media volume)',
    responses: {
      200: { description: 'Ready', content: { 'application/json': { schema: Ready } } },
      503: { description: 'Degraded', content: { 'application/json': { schema: Ready } } },
    },
  })
  // HEAD is documented (not left implicit): uptime monitors rely on it, and it is a real
  // endpoint (headOf() in http.ts) — same status as GET, no body.
  registry.registerPath({
    method: 'head',
    path: '/health',
    summary: 'Liveness (HEAD: status only, no body)',
    responses: { 200: { description: 'Process up' } },
  })
  registry.registerPath({
    method: 'head',
    path: '/health/ready',
    summary: 'Readiness (HEAD: status only, no body)',
    responses: { 200: { description: 'Ready' }, 503: { description: 'Degraded' } },
  })
  registry.registerPath({
    method: 'get',
    path: '/me',
    summary: 'Current user, effective roles, employee link and settings subset',
    security,
    request: { headers: deviceHeader },
    responses: { 200: { description: 'Profile', content: { 'application/json': { schema: Me } } }, ...problemResponses(401, 426) },
  })
  registry.registerPath({
    method: 'get',
    path: '/masters',
    summary: 'Master data for the APK (access-filtered, delta sync)',
    security,
    request: { headers: deviceHeader, query: MastersQuery },
    responses: { 200: { description: 'Masters', content: { 'application/json': { schema: Masters } } }, ...problemResponses(400, 401, 426) },
  })
  registry.registerPath({
    method: 'post',
    path: '/devices/register',
    summary: 'Register (or refresh) this APK install; bearer only',
    security: [{ [bearer.name]: [] }],
    request: { headers: deviceHeader, body: { content: { 'application/json': { schema: DeviceRegister } } } },
    responses: {
      200: { description: 'Refreshed', content: { 'application/json': { schema: Device } } },
      201: { description: 'Registered', content: { 'application/json': { schema: Device } } },
      ...problemResponses(400, 401, 403, 409, 426, 429),
    },
  })
  registry.registerPath({
    method: 'post',
    path: '/devices/{id}/revoke',
    summary: 'Revoke a device (own device, or any as Admin/Owner) — ends its Keycloak session',
    security,
    request: {
      headers: deviceHeader,
      params: z.object({ id: z.string().meta({ description: 'Device record id or deviceId (UUID)' }) }),
      body: { content: { 'application/json': { schema: DeviceRevoke } } },
    },
    responses: { 200: { description: 'Revoked', content: { 'application/json': { schema: Device } } }, ...problemResponses(400, 401, 404, 426, 429) },
  })
  registry.registerPath({
    method: 'post',
    path: '/admin/test-email',
    summary: 'Admin only: queue one test email to the caller\'s own address (audited; 3/hour per admin + mailbox budget)',
    security,
    responses: {
      202: { description: 'Queued; sent by the worker', content: { 'application/json': { schema: TestEmailQueued } } },
      ...problemResponses(401, 403, 409, 429, 503),
    },
  })
  registry.registerPath({
    method: 'get',
    path: '/openapi.json',
    summary: 'This document (authentication required outside development)',
    security,
    responses: { 200: { description: 'OpenAPI 3.1 document' }, ...problemResponses(401) },
  })

  // ---- F2a expense-request flow (T1–T4, T6–T8, period closing) ----
  const idem = z.object({
    'X-Device-Id': z.uuid().optional().meta({ description: 'Registered install id (APK).' }),
    'Idempotency-Key': z.uuid().optional().meta({ description: 'Required from the APK; a retry with the same key and body returns the stored response (header Idempotent-Replayed: true); another body → 422.' }),
  })
  const idParams = (...names: string[]) => z.object(Object.fromEntries(names.map((n) => [n, z.string().regex(/^\d+$/)])))
  const jsonBody = (schema: z.ZodType) => ({ content: { 'application/json': { schema } } })
  const res = (code: number, description: string, schema: z.ZodType, errors: number[]) => ({
    [code]: { description, content: { 'application/json': { schema } } },
    ...problemResponses(...errors),
  })
  const detailOk = (errors: number[] = [400, 401, 403, 404, 409, 422, 426, 429]) => res(200, 'Request after the action', F.ExpenseRequestDetail, errors)
  const post = (path: string, summary: string, body: z.ZodType, params: string[], responses: ReturnType<typeof res>) =>
    registry.registerPath({ method: 'post', path, summary, security, request: { headers: idem, params: idParams(...params), body: jsonBody(body) }, responses })

  registry.registerPath({
    method: 'get',
    path: '/expense-requests',
    summary: 'List expense requests in the caller scope (mine | team | inbox | all), cursor paging',
    security,
    request: { headers: deviceHeader, query: F.ListQuery },
    responses: res(200, 'Page', F.ExpenseRequestList, [400, 401, 426]),
  })
  registry.registerPath({
    method: 'post',
    path: '/expense-requests',
    summary: 'Create a Draft (Uang Muka / Reimburse); creator, status and grand total are server-set',
    security,
    request: { headers: idem, body: jsonBody(F.ExpenseRequestCreate) },
    responses: { ...res(201, 'Created', F.ExpenseRequestDetail, [400, 401, 403, 409, 422, 426, 429]), 200: { description: 'Existing draft for this clientUuid', content: { 'application/json': { schema: F.ExpenseRequestDetail } } } },
  })
  registry.registerPath({
    method: 'get',
    path: '/expense-requests/{id}',
    summary: 'Detail: lines, requesters, signatures/approvals, receipts, flags, transfers, budget impact, allowed actions',
    security,
    request: { headers: deviceHeader, params: idParams('id') },
    responses: res(200, 'Detail', F.ExpenseRequestDetail, [401, 404, 426]),
  })
  registry.registerPath({
    method: 'patch',
    path: '/expense-requests/{id}',
    summary: 'Edit a Draft (Reimburse "Revisi Nota": lines only) — creator/requesters only',
    security,
    request: { headers: deviceHeader, params: idParams('id'), body: jsonBody(F.ExpenseRequestUpdate) },
    responses: detailOk(),
  })
  registry.registerPath({
    method: 'get',
    path: '/expense-requests/{id}/history',
    summary: 'Audit history of the request ("Riwayat", US-35)',
    security,
    request: { headers: deviceHeader, params: idParams('id') },
    responses: res(200, 'History', F.History, [401, 404, 426]),
  })
  post('/expense-requests/{id}/submit', 'Submit (number, rule snapshot, signatures Diajukan/Dibuat, flags)', F.SignBody, ['id'], detailOk())
  post('/expense-requests/{id}/withdraw', 'Withdraw to Draft before any decision (reason)', F.ReasonBody, ['id'], detailOk())
  post('/expense-requests/{id}/cancel', 'Cancel (reason)', F.ReasonBody, ['id'], detailOk())
  post('/expense-requests/{id}/resubmit', 'Clone a rejected request into a new Draft (US-06)', F.EmptyBody, ['id'], res(201, 'New draft', F.ExpenseRequestDetail, [401, 403, 404, 409, 422, 426, 429]))
  post('/expense-requests/{id}/acknowledge', '"Diketahui Oleh" (US-42)', F.SignBody, ['id'], detailOk())
  post('/expense-requests/{id}/approve', 'Approve the current level (G1/G2; budget % before → after)', F.SignBody, ['id'], detailOk())
  post('/expense-requests/{id}/reject', 'Reject (reason)', F.RejectBody, ['id'], detailOk())
  post('/expense-requests/{id}/complete', 'Reimburse: Ditransfer → Selesai', F.EmptyBody, ['id'], detailOk())
  post('/expense-requests/{id}/receipts', 'Add a receipt to a line (image from POST /media/receipts)', F.ReceiptCreate, ['id'], res(201, 'Request with receipts and flags', F.ExpenseRequestDetail, [400, 401, 403, 404, 409, 422, 426, 429]))
  registry.registerPath({
    method: 'patch',
    path: '/expense-requests/{id}/receipts/{rid}',
    summary: 'Edit a receipt inside the receipt window',
    security,
    request: { headers: deviceHeader, params: idParams('id', 'rid'), body: jsonBody(F.ReceiptUpdate) },
    responses: detailOk(),
  })
  post('/expense-requests/{id}/receipts/{rid}/remove', 'Remove a receipt (status removed, reason)', F.ReasonBody, ['id', 'rid'], detailOk())
  post('/expense-requests/{id}/receipts/{rid}/verify', 'Finance: receipt valid', F.EmptyBody, ['id', 'rid'], detailOk())
  post('/expense-requests/{id}/receipts/{rid}/reject', 'Finance: receipt rejected (reason) → Revisi Nota', F.ReasonBody, ['id', 'rid'], detailOk())
  post('/expense-requests/{id}/receipts-resubmit', 'Requester: receipts fixed (grand total changed → re-approval)', F.EmptyBody, ['id'], detailOk())
  post('/expense-requests/{id}/verify-receipts', 'Finance: all receipts valid + warnings reviewed → Nota Terverifikasi', F.EmptyBody, ['id'], detailOk())
  post('/expense-requests/{id}/flags/{fid}/review', 'Finance: mark a flag "sudah diperiksa"', F.FlagReviewBody, ['id', 'fid'], detailOk())
  post('/expense-requests/{id}/transfer', 'Finance: record the transfer (amount = approved amount, proof, bank ref) → KK posted', F.TransferCreate, ['id'], res(201, 'Transferred', F.TransferResult, [400, 401, 403, 404, 409, 422, 426, 429]))
  post('/expense-requests/{id}/transfers/{tid}/void', 'Finance: void a transfer (reversal entry, reason)', F.ReasonBody, ['id', 'tid'], detailOk())
  registry.registerPath({
    method: 'get',
    path: '/transfer-queue',
    summary: 'Finance/Owner: Uang Muka "Disetujui" + Reimburse "Nota Terverifikasi", by needed date (US-19)',
    security,
    responses: res(200, 'Queue', F.ExpenseRequestList, [401, 403]),
  })
  registry.registerPath({
    method: 'post',
    path: '/media/{kind}',
    summary: 'Upload a file (multipart field "file"); server resizes images (receipts ≤ 2000 px, original discarded)',
    security,
    request: {
      headers: deviceHeader,
      params: z.object({ kind: F.MediaKindEnum }),
      body: { content: { 'multipart/form-data': { schema: z.object({ file: z.string().meta({ format: 'binary' }) }) } } },
    },
    responses: res(201, 'Uploaded', F.MediaUploaded, [400, 401, 403, 404, 413, 426, 429]),
  })
  registry.registerPath({
    method: 'get',
    path: '/cash-entries',
    summary: 'Finance/Owner/Admin: cash ledger (KM/KK, reversals)',
    security,
    request: { query: F.CashListQuery },
    responses: res(200, 'Page', F.CashEntryList, [400, 401, 403]),
  })
  registry.registerPath({
    method: 'post',
    path: '/cash-entries',
    summary: 'Finance: manual cash in/out (US-23); closed period → 409 (DB-enforced)',
    security,
    request: { headers: idem, body: jsonBody(F.CashEntryCreate) },
    responses: res(201, 'Posted', F.CashEntry, [400, 401, 403, 409, 422, 429]),
  })
  registry.registerPath({
    method: 'patch',
    path: '/cash-entries/{id}',
    summary: 'Finance: edit descriptive fields of a manual entry in an open period (reason)',
    security,
    request: { params: idParams('id'), body: jsonBody(F.CashEntryUpdate) },
    responses: res(200, 'Updated', F.CashEntry, [400, 401, 403, 404, 409, 429]),
  })
  post('/cash-entries/{id}/void', 'Finance: void = reversal entry + original void (T8, reason)', F.ReasonBody, ['id'], res(200, 'Voided', F.VoidResult, [400, 401, 403, 404, 409, 422, 429]))
  registry.registerPath({
    method: 'get',
    path: '/cash-accounts/balances',
    summary: 'Finance/Owner: balance per cash account (opening + in − out)',
    security,
    request: { query: z.object({ asOf: z.string().optional() }) },
    responses: res(200, 'Balances', F.Balances, [401, 403]),
  })
  registry.registerPath({
    method: 'get',
    path: '/period-closings',
    summary: 'Closed periods and the current lock date',
    security,
    responses: res(200, 'Periods', F.PeriodClosingList, [401, 403]),
  })
  post('/period-closings', 'Finance/Owner: close a past month (DB rejects postings dated ≤ lock date)', F.PeriodCloseBody, [], res(201, 'Closed', F.PeriodClosing, [400, 401, 403, 409, 422, 429]))
  registry.registerPath({
    method: 'post',
    path: '/period-closings/{period}/reopen',
    summary: 'Owner: re-open the latest closed period (reason)',
    security,
    request: { headers: idem, params: z.object({ period: z.string().regex(/^\d{4}-\d{2}$/) }), body: jsonBody(F.ReasonBody) },
    responses: res(200, 'Re-opened', F.PeriodClosing, [400, 401, 403, 409, 422, 429]),
  })

  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'ProyekKas API v1',
      version,
      description: 'Versioned contract for the Android APK and admin custom views (architecture §6). Errors: RFC 9457.',
    },
    servers: [{ url: '/api/v1' }],
  })
}
