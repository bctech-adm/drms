/**
 * UAT seed runner (staging only), same image/command style as src/seed/index.ts:
 *   docker compose --profile seed run --rm -e UAT_USERS='[{"email":…,"name":…,"role":"pk-staff","keycloakSub":…},…]' \
 *     drms-pk-stg-seed node /app/node_modules/payload/bin.js run src/seed/uat.ts
 * Requires the base seed. Idempotent; no Keycloak calls; prints a JSON summary (no secrets).
 */
import config from '@payload-config'
import { getPayload } from 'payload'

import { parseUatUsers, seedUat } from './uat-seed'

const payload = await getPayload({ config })
try {
  const report = await seedUat(payload, parseUatUsers(process.env.UAT_USERS))
  payload.logger.info({ msg: 'uat seed done', report })
  process.stdout.write(`${JSON.stringify({ uatSeed: report })}\n`)
} catch (err) {
  payload.logger.error({ msg: 'uat seed failed', err: (err as Error).message })
  process.exitCode = 1
} finally {
  await payload.destroy()
}
process.exit(process.exitCode ?? 0)
