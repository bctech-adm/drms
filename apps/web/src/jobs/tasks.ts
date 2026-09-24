import { sql } from '@payloadcms/db-postgres'
import type { TaskConfig } from 'payload'

import { autoCloseReimburse } from '@/domain/expense/auto-close'

/**
 * Daily audit anchor (architecture §11 "daily audit hash anchor (optional)", ADR 0006 §5 first
 * step): logs yesterday's audit row count and the highest audit id to stdout → Loki, an external
 * record that later tampering with `audit_logs` would contradict. Read-only.
 *
 * Cron is evaluated in the PROCESS timezone (spike e: ScheduleConfig has no timezone; Cron is
 * built without one) → the worker runs with TZ=Asia/Makassar, so 00:05 = 00:05 WITA.
 */
export const auditDailyAnchorTask: TaskConfig<{
  input: Record<string, never>
  output: { day: string; rows: number; maxId: number }
}> = {
  slug: 'auditDailyAnchor',
  schedule: [{ cron: '5 0 * * *', queue: 'default' }],
  inputSchema: [],
  outputSchema: [
    { name: 'day', type: 'text', required: true },
    { name: 'rows', type: 'number', required: true },
    { name: 'maxId', type: 'number', required: true },
  ],
  handler: async ({ req }) => {
    const tz = process.env.TZ || 'Asia/Makassar'
    const res = (await req.payload.db.drizzle.execute(sql`
      SELECT ((now() AT TIME ZONE ${tz}) - interval '1 day')::date::text AS day,
             count(*) FILTER (
               WHERE (server_time AT TIME ZONE ${tz})::date = ((now() AT TIME ZONE ${tz}) - interval '1 day')::date
             )::int AS rows,
             coalesce(max(id), 0)::bigint::text AS max_id
      FROM audit_logs`)) as unknown as { rows: Array<{ day: string; rows: number; max_id: string }> }
    const r = res.rows[0] ?? { day: '', rows: 0, max_id: '0' }
    const output = { day: r.day, rows: Number(r.rows), maxId: Number(r.max_id) }
    req.payload.logger.info({ msg: 'audit daily anchor', ...output })
    return { output }
  },
}

/**
 * Outbound email to ONE app user, ALWAYS through the queue → sent by the worker (not in the web
 * request): SMTP latency/outages never block a request, and a send refused by the mailbox rate
 * guard (EmailRateLimitedError, src/email/rate-guard.ts) or a transient SMTP error is retried with
 * exponential backoff (150 s base, 6 attempts ≈ 2.6 h) instead of being lost.
 * The input holds the USER ID, not the address: Payload logs the job input on task errors, and
 * addresses must not end up in logs/Loki (PII); the address is resolved when sending. Inactive or
 * address-less users are skipped. From is forced by the adapter; without SMTP (dev) Payload's
 * console adapter logs the mail instead.
 */
export const sendEmailTask: TaskConfig<{
  input: { userId: number; subject: string; text: string }
  output: { messageId: string }
}> = {
  slug: 'sendEmail',
  inputSchema: [
    { name: 'userId', type: 'number', required: true },
    { name: 'subject', type: 'text', required: true, maxLength: 200 },
    { name: 'text', type: 'textarea', required: true, maxLength: 20_000 },
  ],
  outputSchema: [{ name: 'messageId', type: 'text' }],
  retries: { attempts: 6, backoff: { type: 'exponential', delay: 150_000 } },
  handler: async ({ input, req, job }) => {
    const user = await req.payload
      .findByID({ collection: 'users', id: input.userId, depth: 0, select: { email: true, active: true }, overrideAccess: true /* SYSTEM-READ: recipient address */, req })
      .catch(() => null)
    if (!user?.email || user.active === false) {
      req.payload.logger.warn({ msg: 'email skipped (user missing, inactive or without address)', jobId: job.id, userId: input.userId })
      return { output: { messageId: '' } }
    }
    const info = (await req.payload.sendEmail({ to: user.email, subject: input.subject, text: input.text })) as
      | { messageId?: string }
      | undefined
    const messageId = typeof info?.messageId === 'string' ? info.messageId : ''
    req.payload.logger.info({ msg: 'email sent', jobId: job.id, userId: input.userId, messageId })
    return { output: { messageId } }
  },
}

/**
 * Reimburse auto-close (architecture §5.2 DT → SE "auto after N days", §11 jobs; setting
 * reimburseAutoCloseDays). Daily 01:15 in the process TZ (Asia/Makassar, see auditDailyAnchor).
 * Idempotent: only requests still "Ditransfer" whose latest transfer is ≥ N days old are closed.
 */
export const reimburseAutoCloseTask: TaskConfig<{
  input: Record<string, never>
  output: { closed: number }
}> = {
  slug: 'reimburseAutoClose',
  schedule: [{ cron: '15 1 * * *', queue: 'default' }],
  inputSchema: [],
  outputSchema: [{ name: 'closed', type: 'number', required: true }],
  handler: async ({ req }) => {
    const ids = await autoCloseReimburse(req.payload)
    req.payload.logger.info({ msg: 'reimburse auto-close', closed: ids.length, ids })
    return { output: { closed: ids.length } }
  },
}

export const tasks = [auditDailyAnchorTask, sendEmailTask, reimburseAutoCloseTask]
