/**
 * Jobs worker OUTSIDE Next.js (ADR 0002 §2/§4): imports the Payload config directly
 * (docs local-api/outside-nextjs) and loops handleSchedules() + run().
 * Bundled by scripts/build-worker.mjs → dist/worker.mjs.
 */
import { writeFileSync } from 'node:fs'

import { getPayload } from 'payload'

import config from '../payload.config'

const INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS ?? 30_000)
const HEARTBEAT = process.env.WORKER_HEARTBEAT_FILE

async function main() {
  const payload = await getPayload({ config })
  let stopping = false
  const stop = () => {
    stopping = true
  }
  process.on('SIGTERM', stop)
  process.on('SIGINT', stop)
  payload.logger.info({ msg: 'worker started', intervalMs: INTERVAL_MS, tz: Intl.DateTimeFormat().resolvedOptions().timeZone })
  while (!stopping) {
    try {
      const sched = await payload.jobs.handleSchedules({ allQueues: true })
      const run = await payload.jobs.run({ allQueues: true, limit: 10 })
      payload.logger.info({
        msg: 'worker tick',
        queued: sched.queued.map((q) => ({ task: q.taskConfig?.slug, waitUntil: q.waitUntil })),
        skipped: sched.skipped.length,
        ran: run.jobStatus ? Object.keys(run.jobStatus).length : 0,
      })
      if (HEARTBEAT) writeFileSync(HEARTBEAT, String(Date.now()))
    } catch (err) {
      payload.logger.error({ msg: 'worker tick failed', err })
    }
    await new Promise((r) => setTimeout(r, INTERVAL_MS))
  }
  await payload.destroy()
  process.exit(0)
}

void main()
