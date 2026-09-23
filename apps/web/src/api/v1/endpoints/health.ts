import { constants } from 'node:fs'
import { access } from 'node:fs/promises'

import { sql } from '@payloadcms/db-postgres'

import { headOf, json, v1 } from '../http'

/** Liveness: process up, no dependencies (container healthcheck). */
export const healthEndpoint = v1({
  path: '/health',
  method: 'get',
  auth: 'public',
  handler: async () => json({ status: 'ok' }),
})

/** Readiness (architecture §12): DB `SELECT 1` + media dir writable. No details leaked. */
export const readyEndpoint = v1({
  path: '/health/ready',
  method: 'get',
  auth: 'public',
  handler: async ({ req }) => {
    let db = false
    let media = false
    try {
      await req.payload.db.drizzle.execute(sql`SELECT 1`)
      db = true
    } catch {
      db = false
    }
    try {
      await access(process.env.MEDIA_DIR ?? '/data/media', constants.W_OK)
      media = true
    } catch {
      media = false
    }
    const ok = db && media
    return json({ status: ok ? 'ok' : 'degraded', checks: { db, media } }, ok ? 200 : 503)
  },
})

/** HEAD /api/v1/health and /api/v1/health/ready: same status as GET, no body (uptime monitors). */
export const healthHeadEndpoint = headOf(healthEndpoint)
export const readyHeadEndpoint = headOf(readyEndpoint)
