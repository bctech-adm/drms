import config from '@payload-config'
import type { NextRequest } from 'next/server'
import * as client from 'openid-client'
import { getPayload } from 'payload'

import { readCookie, serializeCookie, sessionCookieName } from '@/auth/cookies'
import { getWebOidcConfig } from '@/auth/oidc'
import { revokeWebSession } from '@/auth/sessions'
import { getEnv } from '@/lib/env'
import { withSystemTransaction } from '@/lib/system-tx'

export const dynamic = 'force-dynamic'

/** POST only (no logout CSRF via <img>); Origin must be the app origin. */
export async function POST(request: NextRequest): Promise<Response> {
  const env = getEnv()
  const origin = request.headers.get('origin')
  if (origin !== new URL(env.APP_URL).origin) return new Response('Forbidden', { status: 403 })
  const payload = await getPayload({ config })
  const name = sessionCookieName(env.AUTH_COOKIE_INSECURE)
  const raw = readCookie(request.headers.get('cookie'), name)
  const idTokenHint = raw
    ? await withSystemTransaction(payload, null, (req) => revokeWebSession(req, raw, 'user_logout'))
    : undefined
  const cfg = await getWebOidcConfig()
  const endSession = client.buildEndSessionUrl(cfg, {
    post_logout_redirect_uri: new URL('/admin/login', env.APP_URL).toString(),
    ...(idTokenHint ? { id_token_hint: idTokenHint } : { client_id: env.OIDC_WEB_CLIENT_ID }),
  })
  const headers = new Headers({ Location: endSession.toString(), 'Cache-Control': 'no-store' })
  headers.append('Set-Cookie', serializeCookie(name, '', { maxAge: 0, insecure: env.AUTH_COOKIE_INSECURE }))
  return new Response(null, { status: 303, headers })
}
