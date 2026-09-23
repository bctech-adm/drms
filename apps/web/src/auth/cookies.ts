import { createHash, randomBytes } from 'node:crypto'

/** `__Host-` prefix requires Secure + Path=/ + no Domain (RFC 6265bis). Insecure only in http spikes. */
export function sessionCookieName(insecure: boolean): string {
  return insecure ? 'pk_session' : '__Host-pk_session'
}

export function oidcTxCookieName(insecure: boolean): string {
  return insecure ? 'pk_oidc_tx' : '__Host-pk_oidc_tx'
}

export function newSessionId(): string {
  return randomBytes(32).toString('base64url') // 256 bit
}

export function hashSessionId(id: string): string {
  return createHash('sha256').update(id, 'utf8').digest('hex')
}

export function serializeCookie(
  name: string,
  value: string,
  opts: { maxAge: number; insecure: boolean; sameSite?: 'Lax' | 'Strict' },
): string {
  const parts = [`${name}=${value}`, 'Path=/', 'HttpOnly', `SameSite=${opts.sameSite ?? 'Lax'}`, `Max-Age=${opts.maxAge}`]
  if (!opts.insecure) parts.push('Secure')
  return parts.join('; ')
}

export function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx < 0) continue
    if (part.slice(0, idx).trim() === name) return part.slice(idx + 1).trim()
  }
  return undefined
}
