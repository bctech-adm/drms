import type { PayloadRequest } from 'payload'
import { beforeEach, describe, expect, it } from 'vitest'

import { headOf, json, v1 } from '@/api/v1/http'
import { resetRateLimits } from '@/lib/rate-limit'

const fakeReq = (user: Record<string, unknown> | null, method: 'GET' | 'HEAD') =>
  ({ user, method, headers: new Headers(), context: {}, routeParams: {}, payload: { logger: { error: () => {} } } }) as unknown as PayloadRequest

const get = v1({
  path: '/head-probe',
  method: 'get',
  roles: ['pk-staff'],
  rateLimit: [2, 60_000],
  handler: async () => json({ status: 'ok' }, 503),
})
const head = headOf(get)

beforeEach(() => resetRateLimits())

describe('headOf (HEAD twin of a v1 GET endpoint)', () => {
  it('same path, method head', () => {
    expect(head).toMatchObject({ path: '/v1/head-probe', method: 'head' })
  })

  it('same status and headers as GET, empty body', async () => {
    const user = { id: 1, roles: ['pk-staff'] }
    const g = await get.handler(fakeReq(user, 'GET'))
    const h = await head.handler(fakeReq(user, 'HEAD'))
    expect(h.status).toBe(g.status)
    expect(h.status).toBe(503)
    expect(h.headers.get('content-type')).toBe(g.headers.get('content-type'))
    expect(h.headers.get('cache-control')).toBe('no-store')
    expect(h.body).toBeNull()
    expect(await h.text()).toBe('')
  })

  it('auth identical to GET: anonymous → 401, wrong role → 403, both without body', async () => {
    for (const [user, status] of [
      [null, 401],
      [{ id: 2, roles: ['pk-pm'] }, 403],
    ] as const) {
      expect((await get.handler(fakeReq(user, 'GET'))).status).toBe(status)
      const h = await head.handler(fakeReq(user, 'HEAD'))
      expect(h.status).toBe(status)
      expect(await h.text()).toBe('')
    }
  })

  it('shares the GET rate-limit bucket (HEAD cannot bypass or double the limit)', async () => {
    const user = { id: 3, roles: ['pk-staff'] }
    expect((await get.handler(fakeReq(user, 'GET'))).status).toBe(503)
    expect((await head.handler(fakeReq(user, 'HEAD'))).status).toBe(503)
    expect((await head.handler(fakeReq(user, 'HEAD'))).status).toBe(429)
    expect((await get.handler(fakeReq(user, 'GET'))).status).toBe(429)
  })

  it('refuses non-GET endpoints', () => {
    const post = v1({ path: '/x', method: 'post', handler: async () => json({}) })
    expect(() => headOf(post)).toThrow(/not a GET endpoint/)
  })
})
