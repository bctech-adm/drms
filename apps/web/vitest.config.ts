import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const alias = {
  '@payload-config': fileURLToPath(new URL('./src/payload.config.ts', import.meta.url)),
  '@': fileURLToPath(new URL('./src', import.meta.url)),
}

export default defineConfig({
  resolve: { alias },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
})
