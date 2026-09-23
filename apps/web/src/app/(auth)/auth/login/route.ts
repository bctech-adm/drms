import * as client from 'openid-client'
import type { NextRequest } from 'next/server'

import { oidcTxCookieName, serializeCookie } from '@/auth/cookies'
import { getWebOidcConfig, redirectUri, safeReturnTo, sealTx } from '@/auth/oidc'
import { getEnv } from '@/lib/env'

export const dynamic = 'force-dynamic'

/** Starts Authorization Code + PKCE (S256) + state + nonce (ADR 0003 §3). */
export async function GET(request: NextRequest): Promise<Response> {
  const env = getEnv()
  const cfg = await getWebOidcConfig()
  const verifier = client.randomPKCECodeVerifier()
  const state = client.randomState()
  const nonce = client.randomNonce()
  const url = client.buildAuthorizationUrl(cfg, {
    redirect_uri: redirectUri(),
    scope: 'openid',
    code_challenge: await client.calculatePKCECodeChallenge(verifier),
    code_challenge_method: 'S256',
    state,
    nonce,
  })
  const sealed = await sealTx({ state, nonce, verifier, returnTo: safeReturnTo(request.nextUrl.searchParams.get('returnTo')) })
  const headers = new Headers({ Location: url.toString(), 'Cache-Control': 'no-store' })
  headers.append('Set-Cookie', serializeCookie(oidcTxCookieName(env.AUTH_COOKIE_INSECURE), sealed, { maxAge: 600, insecure: env.AUTH_COOKIE_INSECURE }))
  return new Response(null, { status: 302, headers })
}
