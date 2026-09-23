import { APIError, type Endpoint, type PayloadRequest } from 'payload'
import type { z } from 'zod'

import { hasRole, type Role } from '@/access/roles'
import { requestMeta } from '@/lib/request-meta'
import { takeToken } from '@/lib/rate-limit'
import { withReqTransaction } from '@/lib/system-tx'

/** RFC 9457 problem details (architecture §6.2). Never echoes internals. */
export function problem(status: number, title: string, extra: Record<string, unknown> = {}): Response {
  return Response.json(
    { type: 'about:blank', title, status, ...extra },
    { status, headers: { 'Content-Type': 'application/problem+json', 'Cache-Control': 'no-store' } },
  )
}

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly title: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(title)
  }
}

/** Compares dotted numeric versions ("1.2.10" > "1.2.9"). */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(/[.+-]/).map((x) => Number.parseInt(x, 10) || 0)
  const pb = b.split(/[.+-]/).map((x) => Number.parseInt(x, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d < 0 ? -1 : 1
  }
  return 0
}

let minVersionCache: { value: string | null; at: number } | undefined
/** Test seam. */
export function resetMinVersionCache(): void {
  minVersionCache = undefined
}
async function minAppVersion(req: PayloadRequest): Promise<string | null> {
  if (minVersionCache && Date.now() - minVersionCache.at < 60_000) return minVersionCache.value
  const s = await req.payload.findGlobal({ slug: 'company-settings', depth: 0, overrideAccess: true /* SYSTEM-READ */, req })
  minVersionCache = { value: s.minAppVersion || null, at: Date.now() }
  return minVersionCache.value
}

export type V1Options<B extends z.ZodType | undefined> = {
  path: string
  method: 'get' | 'post'
  /** 'public' = no authentication (health only). Default: any authenticated user. */
  auth?: 'public' | 'user'
  roles?: Role[]
  body?: B
  /** Per-user token bucket: [requests, windowMs]. */
  rateLimit?: [number, number]
  /** Run the handler inside ONE DB transaction on this req (mutations). */
  transactional?: boolean
  handler: (ctx: {
    req: PayloadRequest
    body: B extends z.ZodType ? z.infer<B> : undefined
    params: Record<string, string>
  }) => Promise<Response>
}

/**
 * Root custom endpoint under /api/v1 (architecture §6.1). Payload docs: "custom endpoints are not
 * authenticated by default" → every handler goes through this wrapper: auth + role check,
 * APK minimum version (426), rate limit, zod body validation, transaction, problem+json errors.
 */
export function v1<B extends z.ZodType | undefined = undefined>(opts: V1Options<B>): Endpoint {
  return {
    path: `/v1${opts.path}`,
    method: opts.method,
    handler: async (req) => {
      try {
        if (opts.auth !== 'public') {
          if (!req.user) return problem(401, 'Unauthorized')
          if (opts.roles && !hasRole(req, ...opts.roles)) return problem(403, 'Forbidden')
          const meta = requestMeta(req)
          if (meta.source === 'apk') {
            const min = await minAppVersion(req)
            const have = req.headers.get('x-app-version')
            if (min && (!have || compareVersions(have, min) < 0)) {
              return problem(426, 'Upgrade Required', { minAppVersion: min })
            }
          }
          if (opts.rateLimit) {
            const [n, windowMs] = opts.rateLimit
            const uid = (req.user as { id?: number }).id
            if (!takeToken(`v1:${opts.method}:${opts.path}:${uid}`, n, windowMs)) return problem(429, 'Too Many Requests')
          }
        }
        let body: unknown = undefined
        if (opts.body) {
          let raw: unknown
          try {
            raw = await req.json?.()
          } catch {
            return problem(400, 'Bad Request', { detail: 'Body harus JSON.' })
          }
          const parsed = opts.body.safeParse(raw)
          if (!parsed.success) {
            return problem(400, 'Bad Request', {
              errors: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
            })
          }
          body = parsed.data
        }
        const params = Object.fromEntries(Object.entries(req.routeParams ?? {}).map(([k, v]) => [k, String(v)]))
        const run = () => opts.handler({ req, body: body as never, params })
        return opts.transactional ? await withReqTransaction(req, run) : await run()
      } catch (err) {
        if (err instanceof HttpError) return problem(err.status, err.title, err.extra)
        if (err instanceof APIError && err.status < 500) {
          return problem(err.status, err.isPublic ? err.message : 'Request rejected')
        }
        req.payload.logger.error({ msg: 'v1 handler failed', path: opts.path, err: (err as Error).message })
        return problem(500, 'Internal Server Error')
      }
    },
  }
}
