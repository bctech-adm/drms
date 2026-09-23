/**
 * Seed runner: `npx payload run src/seed/index.ts` (migrate image; DATABASE_URL = APP role).
 * Idempotent — safe to re-run against staging. Optional: SEED_ADMIN_EMAIL + SEED_ADMIN_KEYCLOAK_SUB;
 * SEED_DATA_FILE = path of an untracked JSON file with the real master data (default: fictional data).
 */
import config from '@payload-config'
import { getPayload } from 'payload'

import { loadSeedData } from './data'
import { seed } from './seed'

const payload = await getPayload({ config })
try {
  const report = await seed(payload, loadSeedData())
  payload.logger.info({ msg: 'seed done', dataset: process.env.SEED_DATA_FILE?.trim() ? 'SEED_DATA_FILE' : 'default (fictional)', report })
} catch (err) {
  payload.logger.error({ msg: 'seed failed', err: (err as Error).message })
  process.exitCode = 1
} finally {
  await payload.destroy()
}
process.exit(process.exitCode ?? 0)
