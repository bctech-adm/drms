import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

import { Device, DeviceRegister, DeviceRevoke, Health, Masters, MastersQuery, Me, Problem, Ready, TestEmailQueued } from './schemas'

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
