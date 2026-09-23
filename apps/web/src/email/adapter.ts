import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'
import type { EmailAdapter, Payload, SendEmailOptions } from 'payload'

import type { SmtpConfig } from '@/lib/env'

import { EmailRateLimitedError, payloadMailGuard } from './rate-guard'

/**
 * Outbound email (Payload email adapter, @payloadcms/email-nodemailer 3.90.1).
 *
 * Mail server (infra, 2026-09-23): mail.bimacreative.tech, 587 STARTTLS (TLS required before AUTH)
 * or 465 implicit TLS; username = full mailbox address; From MUST be that mailbox (display name
 * allowed); 30 messages/hour per mailbox, burst 10 → see ./rate-guard.ts.
 *
 * - TLS always: port 465 → implicit TLS, any other port → STARTTLS with `requireTLS` (nodemailer
 *   refuses to AUTH/send over plaintext). Certificate verification stays ON (rejectUnauthorized),
 *   TLS ≥ 1.2, SNI = host. A throwaway CA for tests comes in via NODE_EXTRA_CA_CERTS, never by
 *   relaxing verification.
 * - From is FORCED to `<SMTP_FROM_NAME> <SMTP_FROM_ADDRESS>` (= SMTP_USER); `sender`/`envelope`
 *   overrides are dropped, whatever the caller passes.
 * - Every send takes tokens from the shared DB bucket first; when empty it throws
 *   EmailRateLimitedError (jobs retry with backoff — see jobs/tasks.ts sendEmail).
 * - skipVerify: no SMTP round-trip at boot (a slow/unreachable mail server must not delay web or
 *   worker start-up); the admin test mail (POST /api/v1/admin/test-email) is the check.
 *
 * Without SMTP_* (dev, tests, migrate/seed) payload.config.ts passes no adapter → Payload's
 * console adapter, unchanged behaviour.
 */
export function smtpTransportOptions(cfg: SmtpConfig): SMTPTransport.Options {
  const implicitTls = cfg.port === 465
  return {
    host: cfg.host,
    port: cfg.port,
    secure: implicitTls,
    requireTLS: !implicitTls,
    auth: { user: cfg.user, pass: cfg.password },
    ...(cfg.ehloName ? { name: cfg.ehloName } : {}),
    tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2', servername: cfg.host },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  }
}

type Address = string | { address: string; name?: string }
function countRecipients(v: unknown): number {
  if (v === undefined || v === null || v === '') return 0
  if (Array.isArray(v)) return v.reduce<number>((n, x) => n + countRecipients(x), 0)
  if (typeof v === 'string') return v.split(',').filter((s) => s.trim() !== '').length
  return typeof (v as Address) === 'object' ? 1 : 0
}

export function recipientCount(message: SendEmailOptions): number {
  const m = message as { to?: unknown; cc?: unknown; bcc?: unknown }
  return countRecipients(m.to) + countRecipients(m.cc) + countRecipients(m.bcc)
}

type Guard = (mailbox: string, n: number) => Promise<boolean>

/** Wraps an initialised adapter: rate guard first, then a forced From. Exported for unit tests. */
export function guardAdapter(inner: ReturnType<EmailAdapter>, cfg: SmtpConfig, guard: Guard): ReturnType<EmailAdapter> {
  const from = { name: cfg.fromName, address: cfg.fromAddress }
  return {
    ...inner,
    defaultFromAddress: cfg.fromAddress,
    defaultFromName: cfg.fromName,
    sendEmail: async (message) => {
      const n = Math.max(1, recipientCount(message))
      if (!(await guard(cfg.user, n))) throw new EmailRateLimitedError()
      const { sender: _sender, envelope: _envelope, ...rest } = message as SendEmailOptions & { sender?: unknown; envelope?: unknown }
      return inner.sendEmail({ ...rest, from } as SendEmailOptions)
    },
  }
}

export async function smtpEmailAdapter(cfg: SmtpConfig, guardFor: (payload: Payload) => Guard = payloadMailGuard): Promise<EmailAdapter> {
  const init = await nodemailerAdapter({
    defaultFromAddress: cfg.fromAddress,
    defaultFromName: cfg.fromName,
    skipVerify: true,
    transportOptions: smtpTransportOptions(cfg),
  })
  return ({ payload }) => guardAdapter(init({ payload }), cfg, guardFor(payload))
}
