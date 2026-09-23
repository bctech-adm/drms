import { createHash } from 'node:crypto'

import * as client from 'openid-client'
import { EncryptJWT, jwtDecrypt } from 'jose'

import { getEnv } from '@/lib/env'

/**
 * Server-side calls to Keycloak go to the INTERNAL base URL (ADR 0003 §6) while the issuer stays
 * public: every back-channel request URL that starts with the public origin is rewritten.
 */
export function rewriteToInternal(url: string): string {
  const env = getEnv()
  if (!env.OIDC_INTERNAL_URL) return url
  const pub = new URL(env.OIDC_ISSUER).origin
  return url.startsWith(pub) ? env.OIDC_INTERNAL_URL.replace(/\/$/, '') + url.slice(pub.length) : url
}

const internalFetch: client.CustomFetch = (url, options) => fetch(rewriteToInternal(url), options as RequestInit)

let configPromise: Promise<client.Configuration> | undefined

export function getWebOidcConfig(): Promise<client.Configuration> {
  configPromise ??= (async () => {
    const env = getEnv()
    const execute = env.OIDC_ISSUER.startsWith('http://') ? [client.allowInsecureRequests] : []
    const cfg = await client.discovery(
      new URL(env.OIDC_ISSUER),
      env.OIDC_WEB_CLIENT_ID,
      undefined,
      client.ClientSecretBasic(env.OIDC_WEB_CLIENT_SECRET),
      { [client.customFetch]: internalFetch, execute },
    )
    return cfg
  })().catch((err: unknown) => {
    configPromise = undefined
    throw err
  })
  return configPromise
}

export function redirectUri(): string {
  return new URL('/auth/callback', getEnv().APP_URL).toString()
}

type OidcTx = { state: string; nonce: string; verifier: string; returnTo: string }

function txKey(): Uint8Array {
  // Derived key for the short-lived login-transaction cookie (A256GCM, dir).
  return createHash('sha256').update(`pk-oidc-tx:${getEnv().PAYLOAD_SECRET}`).digest()
}

export async function sealTx(tx: OidcTx): Promise<string> {
  return new EncryptJWT({ ...tx })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .encrypt(txKey())
}

export async function openTx(value: string): Promise<OidcTx> {
  const { payload } = await jwtDecrypt(value, txKey(), { maxTokenAge: '10m' })
  const { state, nonce, verifier, returnTo } = payload as Record<string, unknown>
  if (typeof state !== 'string' || typeof nonce !== 'string' || typeof verifier !== 'string') {
    throw new Error('invalid oidc tx')
  }
  return { state, nonce, verifier, returnTo: typeof returnTo === 'string' ? returnTo : '/admin' }
}

/** Only same-app relative paths are allowed as post-login targets (open-redirect guard). */
export function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/admin'
  return value
}
