/**
 * Next.js 16 proxy (formerly middleware): per-request nonce + CSP + request id for pages
 * (admin, auth routes). Authorization is NOT done here (Payload strategies/access).
 * API responses (/api/**) get their request id in the Payload layer (src/lib/request-meta.ts).
 */
import { NextResponse, type NextRequest } from 'next/server'

import { buildCsp, generateNonce } from '@/lib/csp'

const REQUEST_ID = /^[A-Za-z0-9._-]{8,64}$/

export function proxy(request: NextRequest) {
  const nonce = generateNonce()
  const idp = process.env.OIDC_ISSUER ? new URL(process.env.OIDC_ISSUER).origin : undefined
  const csp = buildCsp(nonce, { isDev: process.env.NODE_ENV === 'development', formActionOrigins: idp ? [idp] : [] })
  const incoming = request.headers.get('x-request-id')
  const requestId = incoming && REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID()

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('x-request-id', requestId)
  requestHeaders.set('Content-Security-Policy', csp)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('X-Request-Id', requestId)
  return response
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
