import { describe, expect, it } from 'vitest'

import { hashSessionId, newSessionId, readCookie, serializeCookie, sessionCookieName } from '@/auth/cookies'
import { safeReturnTo } from '@/auth/oidc'
import { diffFields, normalizeValue } from '@/audit/hooks'
import { buildCsp } from '@/lib/csp'
import { parseEnv, resolveFileSecrets } from '@/lib/env'

const baseEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgres://u:p@db:5432/pk',
  PAYLOAD_SECRET: 'x'.repeat(40),
  APP_URL: 'https://drms-kas.example.test',
  OIDC_ISSUER: 'https://auth.example.test/realms/drms',
  OIDC_WEB_CLIENT_ID: 'proyekkas-web',
  OIDC_WEB_CLIENT_SECRET: 's'.repeat(20),
  OIDC_MOBILE_CLIENT_ID: 'proyekkas-mobile',
}

describe('env', () => {
  it('accepts a valid production env', () => {
    expect(parseEnv(baseEnv).AUTH_COOKIE_INSECURE).toBe(false)
  })
  it('refuses insecure cookies with https and http issuers in production', () => {
    expect(() => parseEnv({ ...baseEnv, AUTH_COOKIE_INSECURE: 'true' })).toThrow(/AUTH_COOKIE_INSECURE/)
    expect(() => parseEnv({ ...baseEnv, OIDC_ISSUER: 'http://auth/realms/drms' })).toThrow(/OIDC_ISSUER/)
  })
  it('never prints secret values and rejects NEXT_PUBLIC secrets', () => {
    try {
      parseEnv({ ...baseEnv, PAYLOAD_SECRET: 'short-secret-value' })
    } catch (e) {
      expect((e as Error).message).not.toContain('short-secret-value')
    }
    expect(() => parseEnv({ ...baseEnv, NEXT_PUBLIC_API_TOKEN: 'x' })).toThrow(/public/)
  })
})

describe('session cookie', () => {
  it('uses __Host- prefix + Secure unless explicitly insecure', () => {
    expect(sessionCookieName(false)).toBe('__Host-pk_session')
    const c = serializeCookie('__Host-pk_session', 'v', { maxAge: 10, insecure: false })
    expect(c).toContain('Secure')
    expect(c).toContain('HttpOnly')
    expect(c).toContain('SameSite=Lax')
    expect(c).toContain('Path=/')
    expect(c).not.toContain('Domain')
  })
  it('generates 256-bit ids and stores only a hash', () => {
    const id = newSessionId()
    expect(Buffer.from(id, 'base64url')).toHaveLength(32)
    expect(hashSessionId(id)).toMatch(/^[0-9a-f]{64}$/)
    expect(hashSessionId(id)).not.toContain(id)
  })
  it('parses cookies', () => {
    expect(readCookie('a=1; pk_session=abc; b=2', 'pk_session')).toBe('abc')
    expect(readCookie(null, 'x')).toBeUndefined()
  })
})

describe('open redirect guard', () => {
  it('allows only local paths', () => {
    expect(safeReturnTo('/admin/collections/uoms')).toBe('/admin/collections/uoms')
    expect(safeReturnTo('//evil.test')).toBe('/admin')
    expect(safeReturnTo('https://evil.test')).toBe('/admin')
    expect(safeReturnTo('/\\evil.test')).toBe('/admin')
    expect(safeReturnTo(null)).toBe('/admin')
  })
})

describe('csp (user decision 2026-09-23)', () => {
  it('scripts nonce-strict WITHOUT strict-dynamic; styles unsafe-inline only; IdP in form-action', () => {
    const csp = buildCsp('n0nce', { isDev: false, formActionOrigins: ['https://auth.example.test'] })
    expect(csp).toContain("script-src 'self' 'nonce-n0nce'; ")
    expect(csp).not.toContain('strict-dynamic')
    expect(csp).toContain("style-src 'self' 'unsafe-inline'")
    expect(csp).not.toMatch(/style-src[^;]*nonce/) // a nonce would disable 'unsafe-inline'
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/)
    expect(csp).not.toContain('unsafe-eval')
    expect(csp).not.toContain('jsdelivr')
    expect(csp).toContain("form-action 'self' https://auth.example.test")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("object-src 'none'")
  })
  it('allows eval only in development (Next dev overlay)', () => {
    expect(buildCsp('n', { isDev: true })).toContain("'unsafe-eval'")
  })
})

describe('audit diff', () => {
  it('emits one entry per changed tracked field only', () => {
    expect(diffFields(['a', 'b', 'c'], { a: 1, b: 'x', c: null }, { a: 2, b: 'x', c: undefined, d: 9 })).toEqual([
      { field: 'a', oldValue: 1, newValue: 2 },
    ])
    expect(diffFields(['a', 'b'], undefined, { a: 'v', b: null })).toEqual([{ field: 'a', oldValue: undefined, newValue: 'v' }])
  })
  it('compares populated relationships by id and objects independent of key order', () => {
    expect(diffFields(['r'], { r: 5 }, { r: { id: 5, updatedAt: 'x', name: 'n' } })).toEqual([])
    expect(diffFields(['g'], { g: { a: 1, b: 2 } }, { g: { b: 2, a: 1 } })).toEqual([])
    expect(normalizeValue([{ id: 1, createdAt: 'x' }, 2])).toEqual([1, 2])
  })
})

describe('file secrets (*_FILE)', () => {
  it('resolves <NAME>_FILE, strips trailing newline, refuses both forms', () => {
    const read = (p: string) => (p === '/run/secrets/s' ? 'topsecret\n' : '')
    expect(resolveFileSecrets({ OIDC_WEB_CLIENT_SECRET_FILE: '/run/secrets/s' }, read).OIDC_WEB_CLIENT_SECRET).toBe('topsecret')
    expect(() => resolveFileSecrets({ PAYLOAD_SECRET: 'a', PAYLOAD_SECRET_FILE: '/x' }, read)).toThrow(/both/)
    expect(() =>
      resolveFileSecrets({ KC_ADMIN_CLIENT_SECRET_FILE: '/missing' }, () => {
        throw new Error('ENOENT /missing topsecret')
      }),
    ).toThrow(/^Invalid env: KC_ADMIN_CLIENT_SECRET_FILE is not readable$/)
  })
  it('requires the admin client secret when KC_ADMIN_BASE_URL is set', () => {
    expect(() => parseEnv({ ...baseEnv, KC_ADMIN_BASE_URL: 'https://auth.example.test' })).toThrow(/KC_ADMIN_CLIENT_SECRET/)
    expect(parseEnv({ ...baseEnv, KC_ADMIN_BASE_URL: 'https://auth.example.test', KC_ADMIN_CLIENT_SECRET: 'k'.repeat(20) }).KC_ADMIN_CLIENT_ID).toBe('proyekkas-admin-api')
  })
})
