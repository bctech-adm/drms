import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

import { proxy } from '@/proxy'

/** E9: the Next proxy answers /admin/* without a session with a real 302 (not Payload's 200 shell). */
describe('proxy /admin gate', () => {
  const run = (path: string, cookie?: string) => proxy(new NextRequest(`https://drms-kas.example.test${path}`, { headers: cookie ? { cookie } : {} }))

  it('/admin/collections/... without session → 302 to /admin/login?redirect=…, relative Location, no-store', () => {
    const r = run('/admin/collections/expense-requests/12')
    expect(r.status).toBe(302)
    expect(r.headers.get('location')).toBe('/admin/login?redirect=%2Fadmin%2Fcollections%2Fexpense-requests%2F12')
    expect(r.headers.get('cache-control')).toBe('no-store')
  })

  it('with the session cookie the request continues with CSP + request id', () => {
    const r = run('/admin/collections/expense-requests', '__Host-pk_session=abc')
    expect(r.status).toBe(200)
    expect(r.headers.get('content-security-policy')).toContain("default-src 'self'")
    expect(r.headers.get('x-request-id')).toBeTruthy()
  })

  it('the login page itself is not redirected', () => {
    expect(run('/admin/login').status).toBe(200)
  })
})
