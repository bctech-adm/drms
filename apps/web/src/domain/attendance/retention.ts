import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import { retentionCutoff } from './schedule'

/**
 * E6 — selfie retention (Q-33, UU No. 27/2022 PDP). Hook for the deletion step: selects the selfies
 * whose upload (`received_at`, DB/server clock) is older than `selfieRetentionMonths` months.
 * Face reference photos (`employees.face_ref_photo`, same media collection) are never candidates.
 * The attendance rows keep their data (time, GPS, distance) — only the image file goes.
 *
 * Deletion itself is NOT done yet (plan fase1-golive E6, sprint S2): the job reports the count.
 */
export type RetentionPlan = { months: number; cutoff: string; candidates: number; oldestReceivedAt: string | null; sampleIds: number[] }

export async function selfieRetentionPlan(payload: Payload, now: Date = new Date()): Promise<RetentionPlan> {
  const s = (await payload.findGlobal({ slug: 'company-settings', depth: 0, overrideAccess: true /* SYSTEM-READ: retention period (job) */ })) as {
    selfieRetentionMonths?: number | null
  }
  const months = typeof s.selfieRetentionMonths === 'number' && s.selfieRetentionMonths >= 1 ? s.selfieRetentionMonths : 12
  const cutoff = retentionCutoff(now, months)
  const res = (await payload.db.drizzle.execute(sql`
    SELECT count(*)::int AS n, min(m.received_at) AS oldest,
           (array_agg(m.id ORDER BY m.received_at, m.id))[1:20] AS sample
    FROM media_selfies m
    WHERE m.received_at < ${cutoff.toISOString()}::timestamptz
      AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.face_ref_photo_id = m.id)`)) as unknown as {
    rows: Array<{ n: number; oldest: string | Date | null; sample: number[] | null }>
  }
  const r = res.rows[0] ?? { n: 0, oldest: null, sample: null }
  return {
    months,
    cutoff: cutoff.toISOString(),
    candidates: Number(r.n),
    oldestReceivedAt: r.oldest ? new Date(r.oldest).toISOString() : null,
    sampleIds: (r.sample ?? []).map(Number),
  }
}
