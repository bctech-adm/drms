import type { Config } from 'payload'

/** pino LoggerOptions as typed by Payload's `logger` option (no direct pino dependency). */
type LoggerOptions = Extract<NonNullable<Config['logger']>, { options: unknown }>['options']

/**
 * Payload `logger` option (payload/dist/utilities/logger.js @3.90.1: `{ options }` → `pino(options)`,
 * i.e. plain JSON lines on stdout — the Payload default is pino-pretty, unsuitable for Loki).
 * Docker json-file → Alloy → Loki (architecture §12). No tokens, cookies or bodies in logs.
 */
export function loggerOptions(env: Record<string, string | undefined> = process.env): LoggerOptions {
  const level = env.LOG_LEVEL ?? (env.NODE_ENV === 'test' ? 'warn' : 'info')
  return {
    level,
    base: { service: env.SERVICE_NAME ?? 'proyekkas-web' },
    messageKey: 'msg',
    // ISO time instead of epoch ms (readable in Grafana without a transform).
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
    formatters: { level: (label: string) => ({ level: label }) },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'headers.authorization',
        'headers.cookie',
        '*.accessToken',
        '*.refreshToken',
        '*.idToken',
        '*.client_secret',
        '*.accountNo',
      ],
      censor: '[redacted]',
    },
  }
}
