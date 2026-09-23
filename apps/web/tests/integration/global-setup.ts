import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import pg from 'pg'

/**
 * Resets the THROWAWAY test database and applies every migration as the OWNER role — the same
 * path as the one-shot migrate container. Refuses to run against anything that is not a
 * dedicated test database (`pk_test*`), so it can never touch pk_drms / pk_drms_stg.
 */
export default async function setup() {
  const owner = process.env.PK_TEST_DATABASE_URL_OWNER
  const app = process.env.PK_TEST_DATABASE_URL
  if (!owner || !app || !process.env.PK_TEST_DATABASE_URL_RO) {
    throw new Error('PK_TEST_DATABASE_URL, PK_TEST_DATABASE_URL_OWNER and PK_TEST_DATABASE_URL_RO are required')
  }
  const db = new URL(owner).pathname.slice(1)
  if (!/^pk_test[a-z0-9_]*$/.test(db)) throw new Error(`refusing to reset non-test database "${db}"`)

  const c = new pg.Client({ connectionString: owner })
  await c.connect()
  try {
    const { rows } = await c.query<{ app: string; ro: string }>(
      "SELECT regexp_replace(current_user, '_owner$', '_app') AS app, regexp_replace(current_user, '_owner$', '_ro') AS ro",
    )
    const { app: appRole, ro: roRole } = rows[0]!
    await c.query('DROP SCHEMA IF EXISTS public CASCADE')
    await c.query('CREATE SCHEMA public')
    await c.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC')
    await c.query(`GRANT USAGE ON SCHEMA public TO ${pg.escapeIdentifier(appRole)}, ${pg.escapeIdentifier(roRole)}`)
  } finally {
    await c.end()
  }

  const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
  execFileSync('npx', ['payload', 'migrate'], {
    cwd: webDir,
    stdio: ['ignore', 'ignore', 'inherit'],
    env: {
      ...process.env,
      DATABASE_URL: owner,
      PAYLOAD_SECRET: 'integration-test-secret-not-used-anywhere-else-0123',
      PK_SKIP_ENV_CHECK: 'true',
      LOG_LEVEL: 'warn',
    },
  })
  const media = '/tmp/pk-f1-media-test'
  rmSync(media, { recursive: true, force: true })
  mkdirSync(media, { recursive: true })
}
