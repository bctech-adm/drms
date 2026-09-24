import type { Config } from 'payload'

/** pino LoggerOptions as typed by Payload's `logger` option (no direct pino dependency). */
type LoggerOptions = Extract<NonNullable<Config['logger']>, { options: unknown }>['options']

/** pino numeric level of `error` (pino levels: trace 10 … error 50, fatal 60). */
const ERROR_LEVEL = 50

/**
 * An expected, client-caused failure: Payload/API errors are `isOperational` with an HTTP `status`
 * (APIError, Forbidden, NotFound, ValidationError, our domain `fail()` …). A status < 500 is a 4xx
 * the caller caused (403 access, 404, 409 guard) — operational noise, not a server fault.
 */
export function isOperationalClientError(v: unknown): boolean {
  const e = (v && typeof v === 'object' && 'err' in v ? (v as { err: unknown }).err : v) as { isOperational?: unknown; status?: unknown } | null | undefined
  return !!e && typeof e === 'object' && e.isOperational === true && typeof e.status === 'number' && e.status < 500
}

type LogFn = (...args: unknown[]) => void

/**
 * pino `hooks.logMethod` (F2e UAT): Payload logs every error that reaches its REST route handler
 * (`logError`, level by error NAME: `APIError` → error even for our 403/404/409) at `error`. An
 * operational 4xx is re-emitted at `warn`; real 5xx (and anything without an HTTP status) stay
 * `error`. Applies to every `payload.logger.error(...)` call, ours included.
 */
export function demoteOperationalClientErrors(this: { warn: LogFn }, args: unknown[], method: LogFn, level: number): void {
  if (level === ERROR_LEVEL && isOperationalClientError(args[0])) return this.warn(...args)
  return method.apply(this, args)
}

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
    hooks: { logMethod: demoteOperationalClientErrors as never },
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
