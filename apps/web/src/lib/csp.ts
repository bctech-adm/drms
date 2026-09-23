/**
 * Nonce CSP for the Payload admin + app (pattern: Next 16 guides/content-security-policy.md,
 * control-plane src/lib/csp.ts). User decision 2026-09-23 after spike (f)
 * (docs/proyekkas/spikes/f1-spike-report.md §f):
 * - scripts: nonce-strict, **without** 'strict-dynamic' (it would let @payloadcms/ui's bundled
 *   Monaco loader pull JS from cdn.jsdelivr.net). Consequence: the admin must not render
 *   `json`/`code` field editors — enforced by tests/unit/config-guards.test.ts.
 * - styles: 'unsafe-inline' (Payload admin inserts <style>/style="" at runtime without nonce).
 *   A nonce in style-src would disable 'unsafe-inline' (CSP3), so there is none.
 * - form-action includes the IdP origin: the logout form POST is answered with a 303 to the
 *   Keycloak end-session endpoint and browsers apply form-action to redirects.
 */
export function buildCsp(nonce: string, opts: { isDev: boolean; formActionOrigins?: string[] }): string {
  const formAction = ["'self'", ...(opts.formActionOrigins ?? [])].join(' ')
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${opts.isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    `form-action ${formAction}`,
    "frame-ancestors 'none'",
  ].join('; ')
}

export function generateNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Buffer.from(bytes).toString('base64')
}
