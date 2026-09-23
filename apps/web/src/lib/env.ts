import { readFileSync } from 'node:fs'

import { z } from 'zod'

/**
 * Boot-time environment validation (fail fast). Error messages contain variable NAMES only,
 * never values. No secrets in NEXT_PUBLIC_* (assertNoPublicSecrets).
 *
 * Secrets may be given as `<NAME>_FILE` (path of a file holding the value, e.g. a Compose
 * `secrets:` mount); the file content is used with trailing newlines stripped. Setting both
 * `<NAME>` and `<NAME>_FILE` is an error.
 */
export const FILE_SECRETS = [
  'DATABASE_URL',
  'PAYLOAD_SECRET',
  'OIDC_WEB_CLIENT_SECRET',
  'KC_ADMIN_CLIENT_SECRET',
] as const

const postgresUrl = z.string().regex(/^postgres(ql)?:\/\/\S+$/, 'must be a postgres:// URL')
const httpUrl = z.url({ protocol: /^https?$/, message: 'must be an http(s) URL' })
const bool = z.enum(['true', 'false']).default('false').transform((v) => v === 'true')
const clientId = z.string().regex(/^[A-Za-z0-9._-]{1,64}$/)

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
    DATABASE_URL: postgresUrl,
    /** Pool size per process. Staging app role has CONNECTION LIMIT 10 → web 5 + worker 3 + seed 2 (≥ 2: a tx holds one). */
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(20).default(6),
    PAYLOAD_SECRET: z.string().min(32, 'min 32 chars'),
    APP_URL: httpUrl,
    OIDC_ISSUER: httpUrl,
    /** Optional internal base URL of Keycloak for OIDC back-channel calls (staging: unset = public issuer). */
    OIDC_INTERNAL_URL: httpUrl.optional(),
    OIDC_WEB_CLIENT_ID: clientId,
    OIDC_WEB_CLIENT_SECRET: z.string().min(16),
    OIDC_MOBILE_CLIENT_ID: clientId,
    /**
     * Keycloak Admin REST base URL (without /admin), kept separate from the issuer even when the
     * value is equal: the admin path is reachable only via a dedicated internal network
     * (infra decision 2026-09-23), never via hairpin.
     */
    KC_ADMIN_BASE_URL: httpUrl.optional(),
    /** Realm for the Admin API; default = realm of OIDC_ISSUER. */
    KC_REALM: z.string().regex(/^[A-Za-z0-9._-]{1,64}$/).optional(),
    KC_ADMIN_CLIENT_ID: clientId.default('proyekkas-admin-api'),
    KC_ADMIN_CLIENT_SECRET: z.string().min(16).optional(),
    /** Only for plain-http throwaway environments. Refused when APP_URL is https. */
    AUTH_COOKIE_INSECURE: bool,
    MEDIA_DIR: z.string().startsWith('/').default('/data/media'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  })
  .superRefine((env, ctx) => {
    if (env.AUTH_COOKIE_INSECURE && env.APP_URL.startsWith('https://')) {
      ctx.addIssue({ code: 'custom', path: ['AUTH_COOKIE_INSECURE'], message: 'not allowed with https APP_URL' })
    }
    if (env.NODE_ENV === 'production' && !env.AUTH_COOKIE_INSECURE) {
      for (const key of ['APP_URL', 'OIDC_ISSUER'] as const) {
        if (!env[key].startsWith('https://')) {
          ctx.addIssue({ code: 'custom', path: [key], message: 'https required in production' })
        }
      }
    }
    if (!/\/realms\/[^/]+$/.test(env.OIDC_ISSUER.replace(/\/$/, ''))) {
      ctx.addIssue({ code: 'custom', path: ['OIDC_ISSUER'], message: 'must look like <base>/realms/<realm>' })
    }
    if (env.KC_ADMIN_BASE_URL && !env.KC_ADMIN_CLIENT_SECRET) {
      ctx.addIssue({ code: 'custom', path: ['KC_ADMIN_CLIENT_SECRET'], message: 'required when KC_ADMIN_BASE_URL is set' })
    }
  })

export type Env = z.infer<typeof envSchema>

const SECRET_LIKE = /(SECRET|PASSWORD|PASSWD|TOKEN|PRIVATE|DATABASE|_KEY$|^KEY)/i

export function assertNoPublicSecrets(source: Record<string, string | undefined>): void {
  const offenders = Object.keys(source).filter(
    (k) => k.startsWith('NEXT_PUBLIC_') && SECRET_LIKE.test(k.slice('NEXT_PUBLIC_'.length)),
  )
  if (offenders.length > 0) {
    throw new Error(`Invalid env: public variables look like secrets: ${offenders.join(', ')}`)
  }
}

type FileReader = (path: string) => string

/** Returns a copy of `source` with every `<NAME>_FILE` of FILE_SECRETS resolved into `<NAME>`. */
export function resolveFileSecrets(
  source: Record<string, string | undefined>,
  read: FileReader = (p) => readFileSync(p, 'utf8'),
): Record<string, string | undefined> {
  const out = { ...source }
  for (const name of FILE_SECRETS) {
    const file = source[`${name}_FILE`]
    if (!file) continue
    if (source[name]) throw new Error(`Invalid env: both ${name} and ${name}_FILE are set`)
    let value: string
    try {
      value = read(file)
    } catch {
      throw new Error(`Invalid env: ${name}_FILE is not readable`)
    }
    out[name] = value.replace(/[\r\n]+$/, '')
  }
  return out
}

/** Single secret at config build time (PAYLOAD_SECRET/DATABASE_URL); '' when absent (next build). */
export function readSecret(name: (typeof FILE_SECRETS)[number]): string {
  try {
    return (
      resolveFileSecrets({ [name]: process.env[name], [`${name}_FILE`]: process.env[`${name}_FILE`] })[name] ?? ''
    )
  } catch {
    return ''
  }
}

export function parseEnv(source: Record<string, string | undefined>): Env {
  assertNoPublicSecrets(source)
  const resolved = resolveFileSecrets(source)
  const result = envSchema.safeParse(resolved)
  if (!result.success) {
    const msg = result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')
    throw new Error(`Invalid env: ${msg}`)
  }
  return result.data
}

let cache: Env | undefined
/** Lazy + memoised so `next build` does not need runtime secrets. */
export function getEnv(): Env {
  cache ??= parseEnv(process.env)
  return cache
}

/** Test seam: drop the memoised env (tests change process.env between suites). */
export function resetEnvCache(): void {
  cache = undefined
}
