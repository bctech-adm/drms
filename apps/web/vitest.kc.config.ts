import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

/** Real-Keycloak checks of the Admin REST client (throwaway pk-f1-keycloak; see test-env/kc-setup.sh). */
export default defineConfig({
  resolve: {
    alias: {
      '@payload-config': fileURLToPath(new URL('./src/payload.config.ts', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: { include: ['tests/kc/**/*.kc.test.ts'], environment: 'node', testTimeout: 60_000 },
})
