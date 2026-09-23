import { randomUUID } from 'node:crypto'

import type { PayloadRequest } from 'payload'

export type AuditSource = 'web' | 'apk' | 'system' | 'job'

export type RequestMeta = {
  source: AuditSource
  ip?: string
  deviceId?: string
  appVersion?: string
  requestId: string
}

const REQUEST_ID = /^[A-Za-z0-9._-]{8,64}$/
const IP = /^[0-9A-Fa-f:.]{3,45}$/
const APP_VERSION = /^[0-9A-Za-z.+-]{1,32}$/

type UserExtras = { _strategy?: string; _pkDevice?: { deviceId?: string } }

/**
 * Request metadata for audit rows (ADR 0006 §4). Traefik is the only ingress and replaces
 * X-Forwarded-For/X-Real-Ip from untrusted peers, so the first hop is the client address.
 * `deviceId` only comes from a VERIFIED device (mobileBearer), never from a raw header.
 */
export function requestMeta(req: PayloadRequest): RequestMeta {
  const ctx = (req.context ?? {}) as Record<string, unknown>
  let requestId = ctx.pkRequestId as string | undefined
  if (!requestId) {
    const incoming = req.headers?.get('x-request-id')
    requestId = incoming && REQUEST_ID.test(incoming) ? incoming : randomUUID()
    if (req.context) req.context.pkRequestId = requestId
  }
  const user = req.user as (UserExtras & object) | null
  const forced = ctx.auditSource as AuditSource | undefined
  const source: AuditSource =
    forced ?? (user?._strategy === 'mobileBearer' ? 'apk' : user?._strategy === 'oidcSession' ? 'web' : 'system')
  const realIp = req.headers?.get('x-real-ip') ?? req.headers?.get('x-forwarded-for')?.split(',')[0]?.trim()
  const appVersion = req.headers?.get('x-app-version') ?? undefined
  return {
    source,
    ip: realIp && IP.test(realIp) ? realIp : undefined,
    deviceId: user?._pkDevice?.deviceId,
    appVersion: source === 'apk' && appVersion && APP_VERSION.test(appVersion) ? appVersion : undefined,
    requestId,
  }
}
