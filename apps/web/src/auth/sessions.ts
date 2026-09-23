import type { Payload, PayloadRequest } from 'payload'

import { writeAudit } from '@/audit/writer'
import { getEnv } from '@/lib/env'
import { withSystemTransaction } from '@/lib/system-tx'

import { hashSessionId, newSessionId, readCookie, sessionCookieName } from './cookies'

export const SESSION_MAX_AGE_S = 10 * 60 * 60 // = Keycloak SSO max lifespan (ADR 0003 §1)

type UserDoc = { id: number; roles?: unknown }

export async function createWebSession(
  payload: Payload,
  user: UserDoc,
  meta: { keycloakSid?: string; idToken?: string; ip?: string; userAgent?: string },
): Promise<{ id: string; maxAge: number }> {
  const id = newSessionId()
  await withSystemTransaction(payload, { ...user, collection: 'users' } as never, async (req) => {
    const s = await payload.create({
      collection: 'web-sessions',
      data: {
        idHash: hashSessionId(id),
        user: user.id,
        keycloakSid: meta.keycloakSid,
        idTokenHint: meta.idToken,
        expiresAt: new Date(Date.now() + SESSION_MAX_AGE_S * 1000).toISOString(),
        ip: meta.ip,
        userAgent: meta.userAgent?.slice(0, 300),
      },
      req,
      overrideAccess: true, // SYSTEM-WRITE: login
    })
    await writeAudit(req, [{ action: 'login', docType: 'web_session', docId: String(s.id) }], user as never)
  })
  return { id, maxAge: SESSION_MAX_AGE_S }
}

/** Revokes the session whose raw id is `raw` inside `req`'s transaction; returns its id_token hint. */
export async function revokeWebSession(req: PayloadRequest, raw: string, reason: string): Promise<string | undefined> {
  const found = await req.payload.find({
    collection: 'web-sessions',
    where: { idHash: { equals: hashSessionId(raw) } },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true, // SYSTEM-READ
    showHiddenFields: true,
    req,
  })
  const s = found.docs[0]
  if (!s) return undefined
  if (!s.revokedAt) {
    await req.payload.update({
      collection: 'web-sessions',
      id: s.id,
      data: { revokedAt: new Date().toISOString(), revokeReason: reason },
      req,
      overrideAccess: true, // SYSTEM-WRITE: logout
    })
    const userId = typeof s.user === 'object' && s.user ? s.user.id : s.user
    await writeAudit(req, [{ action: 'logout', docType: 'web_session', docId: String(s.id), reason }], { id: userId })
  }
  return (s as { idTokenHint?: string | null }).idTokenHint ?? undefined
}

/** afterLogout hook path (Payload's own /api/users/logout, e.g. inactivity): cookie from req headers. */
export async function revokeCurrentWebSession(req: PayloadRequest, reason: string): Promise<string | undefined> {
  const env = getEnv()
  const raw = readCookie(req.headers.get('cookie'), sessionCookieName(env.AUTH_COOKIE_INSECURE))
  return raw ? revokeWebSession(req, raw, reason) : undefined
}
