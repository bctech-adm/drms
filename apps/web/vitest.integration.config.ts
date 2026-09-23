import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const alias = {
  '@payload-config': fileURLToPath(new URL('./src/payload.config.ts', import.meta.url)),
  '@': fileURLToPath(new URL('./src', import.meta.url)),
}

/**
 * Integration tests against a THROWAWAY Postgres (apps/web/test-env, CI service container):
 * global setup resets the schema and runs all migrations as the OWNER role; tests run as the
 * APP role (grants/triggers are part of what is tested). Required env:
 * PK_TEST_DATABASE_URL (app), PK_TEST_DATABASE_URL_OWNER, PK_TEST_DATABASE_URL_RO.
 */
const appUrl = process.env.PK_TEST_DATABASE_URL ?? ''

export default defineConfig({
  resolve: { alias },
  test: {
    include: ['tests/integration/**/*.int.test.ts'],
    environment: 'node',
    globalSetup: ['tests/integration/global-setup.ts'],
    fileParallelism: false,
    pool: 'forks',
    testTimeout: 120_000,
    hookTimeout: 120_000,
    env: {
      NODE_ENV: 'test',
      TZ: 'Asia/Makassar',
      DATABASE_URL: appUrl,
      DATABASE_POOL_MAX: '10',
      PAYLOAD_SECRET: 'integration-test-secret-not-used-anywhere-else-0123',
      APP_URL: 'http://localhost:3000',
      OIDC_ISSUER: 'http://kc.pk-f1.test/realms/drms-test',
      OIDC_WEB_CLIENT_ID: 'proyekkas-web',
      OIDC_WEB_CLIENT_SECRET: 'integration-test-client-secret',
      OIDC_MOBILE_CLIENT_ID: 'proyekkas-mobile',
      AUTH_COOKIE_INSECURE: 'true',
      MEDIA_DIR: '/tmp/pk-f1-media-test',
      LOG_LEVEL: 'error',
    },
  },
})
