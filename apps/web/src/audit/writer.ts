import { randomUUID } from 'node:crypto'

import { sql } from '@payloadcms/db-postgres'
import type { PayloadRequest } from 'payload'

import { rolesOf } from '@/access/roles'
import { requestMeta } from '@/lib/request-meta'
import { getRequestTx } from '@/lib/tx'

/** Values of `audit_logs.action` (ADR 0006 §3 + requirements v1.1 §8). Postgres enum via select. */
export const AUDIT_ACTIONS = [
  'create',
  'update',
  'status_change',
  'deactivate',
  'reactivate',
  'delete_attempt',
  'void',
  'view_sensitive',
  'login',
  'logout',
  'login_failed',
  'session_revoked',
  'role_change',
  'role_sync',
  'device_register',
  'device_revoke',
  'number_issued',
  'export',
  'print',
  'sign',
  'acknowledge',
  'flag_raised',
  'flag_reviewed',
  'sync_odoo',
  'sync_offline',
  'period_close',
  'period_reopen',
  'schema_maintenance',
  'email_test',
] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export type AuditRow = {
  action: AuditAction
  docType: string
  docId?: string
  docNo?: string
  field?: string
  lineNo?: number
  oldValue?: unknown
  newValue?: unknown
  statusFrom?: string
  statusTo?: string
  reason?: string
}

type UserLike = { id?: unknown; roles?: unknown } | null | undefined

/**
 * Writes audit rows through Payload in the SAME transaction as the business change (`req`),
 * ADR 0006 §4. Requires an active transaction: without one each row would commit on its own
 * and a failing business write could leave orphan audit rows (or the reverse).
 * `server_time` is set by the DB trigger; any value passed here is ignored.
 */
export async function writeAudit(req: PayloadRequest, rows: AuditRow[], user?: UserLike): Promise<void> {
  if (rows.length === 0) return
  const tx = await getRequestTx(req) // throws when there is no transaction
  const r = (await tx.execute(sql`SELECT txid_current()::text AS tx`)) as unknown as { rows: Array<{ tx: string }> }
  const txId = Number(r.rows[0]?.tx)
  const meta = requestMeta(req)
  const u = user === undefined ? (req.user as UserLike) : user
  const uid = typeof u?.id === 'number' ? u.id : typeof u?.id === 'string' && /^\d+$/.test(u.id) ? Number(u.id) : undefined
  const roles = rolesOf(u).join(',')
  const eventId = randomUUID()
  for (const row of rows) {
    await req.payload.create({
      collection: 'audit-logs',
      data: {
        eventId,
        txId,
        requestId: meta.requestId,
        docType: row.docType,
        docId: row.docId,
        docNo: row.docNo,
        action: row.action,
        field: row.field,
        lineNo: row.lineNo,
        // Payload json fields reject bare strings (JSON.parse) → always wrap (spike finding c.4).
        oldValue: row.oldValue === undefined ? undefined : ({ v: row.oldValue } as never),
        newValue: row.newValue === undefined ? undefined : ({ v: row.newValue } as never),
        statusFrom: row.statusFrom,
        statusTo: row.statusTo,
        reason: row.reason,
        userId: uid,
        userRoles: roles || undefined,
        source: meta.source,
        appVersion: meta.appVersion,
        ip: meta.ip,
        deviceId: meta.deviceId,
      },
      req,
      depth: 0,
      // No `context` option here: Local API merges it into the SHARED req.context
      // (utilities/createLocalReq.js getRequestContext), which would leak into later operations.
      overrideAccess: true, // SYSTEM-WRITE: append-only audit (collection create access is false)
    })
  }
}
