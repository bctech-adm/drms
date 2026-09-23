import { describe, expect, it } from 'vitest'

import { createHttpKeycloakAdmin, realmOf, seg } from '@/auth/keycloak-admin'

type Call = { url: string; method: string; body?: string }

function fakeFetch(responses: Array<(c: Call) => Response | undefined>) {
  const calls: Call[] = []
  const f = (async (input: string | URL | Request, init?: RequestInit) => {
    const c: Call = { url: String(input), method: init?.method ?? 'GET', body: typeof init?.body === 'string' ? init.body : undefined }
    calls.push(c)
    for (const r of responses) {
      const res = r(c)
      if (res) return res
    }
    return new Response(null, { status: 500 })
  }) as typeof fetch
  return { f, calls }
}

const token = (c: Call) =>
  c.url.endsWith('/protocol/openid-connect/token') ? Response.json({ access_token: 't0k', expires_in: 300 }) : undefined

describe('keycloak admin client (infra admin router constraints)', () => {
  it('builds ${KC_ADMIN_BASE_URL}/admin/realms/<realm>/… with the slash after the realm and the realm token endpoint', async () => {
    const { f, calls } = fakeFetch([
      token,
      (c) => (c.url.endsWith('/role-mappings/realm/available') ? Response.json([{ id: 'r1', name: 'pk-staff' }, { id: 'r2', name: 'pk-pm' }]) : undefined),
      (c) => (c.method === 'GET' && c.url.endsWith('/role-mappings/realm') ? Response.json([]) : undefined),
      (c) => (c.method === 'POST' && c.url.endsWith('/role-mappings/realm') ? new Response(null, { status: 204 }) : undefined),
      (c) => (c.method === 'POST' && c.url.endsWith('/admin/realms/drms-staging/users') ? new Response(null, { status: 201, headers: { Location: 'https://auth.example.test/admin/realms/drms-staging/users/0b6a1c1e-1111-4222-8333-444455556666' } }) : undefined),
    ])
    const kc = createHttpKeycloakAdmin({ baseUrl: 'https://auth.example.test/', realm: 'drms-staging', clientId: 'proyekkas-admin-api', clientSecret: 'x'.repeat(20), fetchImpl: f })
    const id = await kc.createUser({ email: 'a@drms.test', enabled: true })
    expect(id).toBe('0b6a1c1e-1111-4222-8333-444455556666')
    await kc.addRealmRoles(id, ['pk-staff'])
    expect(calls[0]?.url).toBe('https://auth.example.test/realms/drms-staging/protocol/openid-connect/token')
    const adminCalls = calls.slice(1).map((c) => c.url)
    expect(adminCalls).toEqual([
      'https://auth.example.test/admin/realms/drms-staging/users',
      'https://auth.example.test/admin/realms/drms-staging/users/0b6a1c1e-1111-4222-8333-444455556666/role-mappings/realm/available',
      'https://auth.example.test/admin/realms/drms-staging/users/0b6a1c1e-1111-4222-8333-444455556666/role-mappings/realm',
      'https://auth.example.test/admin/realms/drms-staging/users/0b6a1c1e-1111-4222-8333-444455556666/role-mappings/realm',
    ])
    expect(JSON.parse(calls.at(-1)?.body ?? '[]')).toEqual([{ id: 'r1', name: 'pk-staff' }])
    expect(adminCalls.some((u) => u.includes('/roles/'))).toBe(false) // needs view-realm → 403 for the SA
    for (const u of adminCalls) {
      expect(u).toMatch(/\/admin\/realms\/drms-staging\//) // never ".../drms-staging" without the slash
      expect(new URL(u).pathname).not.toContain('%')
    }
  })

  it('refuses path segments that would need percent-encoding (never encodes them)', async () => {
    expect(() => seg('../master')).toThrow(/unsafe/)
    expect(() => seg('a/b')).toThrow(/unsafe/)
    expect(() => seg('a%2Fb')).toThrow(/unsafe/)
    expect(seg('UqEkZ48dkdd0YgE6RLS7_oCg')).toBe('UqEkZ48dkdd0YgE6RLS7_oCg')
    const { f, calls } = fakeFetch([token])
    const kc = createHttpKeycloakAdmin({ baseUrl: 'https://kc', realm: 'drms', clientId: 'c', clientSecret: 'x'.repeat(20), fetchImpl: f })
    await expect(kc.deleteSession('sid/../../x', true)).rejects.toThrow(/unsafe/)
    expect(calls.filter((c) => c.url.includes('/admin/'))).toHaveLength(0)
  })

  it('retries 429 with backoff, then succeeds; deleteSession 404 → false', async () => {
    let n = 0
    const sleeps: number[] = []
    const { f } = fakeFetch([
      token,
      (c) => {
        if (!c.url.includes('/sessions/')) return undefined
        n++
        return n < 3 ? new Response(null, { status: 429, headers: { 'Retry-After': '1' } }) : new Response(null, { status: 404 })
      },
    ])
    const kc = createHttpKeycloakAdmin({ baseUrl: 'https://kc', realm: 'drms', clientId: 'c', clientSecret: 'x'.repeat(20), fetchImpl: f, sleep: async (ms) => void sleeps.push(ms) })
    expect(await kc.deleteSession('abc', true)).toBe(false)
    expect(n).toBe(3)
    expect(sleeps).toEqual([1000, 1000])
  })

  it('error messages never contain ids, tokens or bodies', async () => {
    const { f } = fakeFetch([token, () => new Response('{"secret":"leak"}', { status: 403 })])
    const kc = createHttpKeycloakAdmin({ baseUrl: 'https://kc', realm: 'drms', clientId: 'c', clientSecret: 'x'.repeat(20), fetchImpl: f })
    await expect(kc.logoutUser('0b6a1c1e-1111-4222-8333-444455556666')).rejects.toThrow('keycloak admin POST /users/:id/logout → 403')
  })

  it('derives the realm from the issuer', () => {
    expect(realmOf('https://auth.bimacreative.tech/realms/drms-staging')).toBe('drms-staging')
    expect(() => realmOf('https://auth.bimacreative.tech/')).toThrow()
  })
})
