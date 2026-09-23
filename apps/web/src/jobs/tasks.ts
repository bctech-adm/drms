import { sql } from '@payloadcms/db-postgres'
import type { TaskConfig } from 'payload'

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

export const tasks = [auditDailyAnchorTask]
