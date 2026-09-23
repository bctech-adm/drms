import { createHash } from 'node:crypto'

import { sql } from '@payloadcms/db-postgres'
import type { PayloadRequest } from 'payload'

import { getRequestTx } from './tx'

/**
 * Idempotency-Key for mutating /api/v1 POSTs (architecture §6.2, G15; the APK retries). Table
 * `idempotency_keys` (F2a security migration), PK (user_id, key), kept 72 h.
 *
 * Inside the business transaction: `INSERT … ON CONFLICT DO NOTHING` claims the key. A concurrent
 * retry blocks on the unique index until the first transaction ends: after COMMIT it sees the row
 * and gets the stored response; after ROLLBACK its own insert succeeds and it runs normally. Only
 * successful (2xx) responses are stored — an error rolls the claim back together with the change.
 */
export const IDEMPOTENCY_TTL_HOURS = 72
export const IDEMPOTENCY_KEY_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function requestHash(method: string, path: string, body: string): string {
  return createHash('sha256').update(`${method.toUpperCase()}\n${path}\n${body}`).digest('hex')
}

export type Claim = { kind: 'new' } | { kind: 'replay'; status: number; body: unknown } | { kind: 'mismatch' }

export async function claimKey(req: PayloadRequest, userId: number, key: string, method: string, path: string, hash: string): Promise<Claim> {
  const tx = await getRequestTx(req)
  const ins = (await tx.execute(sql`
    INSERT INTO idempotency_keys (user_id, key, method, path, request_hash, expires_at)
    VALUES (${userId}, ${key.toLowerCase()}, ${method}, ${path}, ${hash}, now() + make_interval(hours => ${IDEMPOTENCY_TTL_HOURS}))
    ON CONFLICT (user_id, key) DO NOTHING
    RETURNING key`)) as unknown as { rows: unknown[] }
  if (ins.rows.length === 1) return { kind: 'new' }
  const r = (await tx.execute(sql`
    SELECT request_hash, status_code, response FROM idempotency_keys WHERE user_id = ${userId} AND key = ${key.toLowerCase()}`)) as unknown as {
    rows: Array<{ request_hash: string; status_code: number | null; response: unknown }>
  }
  const row = r.rows[0]
  if (!row || row.request_hash !== hash || row.status_code === null) return { kind: 'mismatch' }
  return { kind: 'replay', status: row.status_code, body: row.response }
}

export async function storeResponse(req: PayloadRequest, userId: number, key: string, status: number, body: unknown): Promise<void> {
  const tx = await getRequestTx(req)
  await tx.execute(sql`
    UPDATE idempotency_keys SET status_code = ${status}, response = ${JSON.stringify(body ?? null)}::jsonb
    WHERE user_id = ${userId} AND key = ${key.toLowerCase()}`)
  // Opportunistic purge of expired keys (~2 % of stores; no separate job needed).
  if (Math.random() < 0.02) await tx.execute(sql`DELETE FROM idempotency_keys WHERE expires_at < now()`)
}
