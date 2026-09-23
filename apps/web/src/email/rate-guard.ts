import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

/**
 * Outbound mail guard. The platform mailbox (no-reply@bimacreative.tech) is limited by the mail
 * server to 30 messages/hour with a burst of 10; exceeding it gets the mailbox blocked. Web and
 * worker are separate processes → the bucket lives in Postgres (`mail_rate_buckets`, migration
 * …_email), one row per mailbox, updated atomically with a single upsert (row lock).
 *
 * Token bucket: capacity MAIL_BURST, refill MAIL_PER_HOUR per hour. In ANY rolling hour at most
 * MAIL_BURST + MAIL_PER_HOUR = 29 messages leave the app (< 30), and a burst never exceeds 5
 * (< 10) — safe whether the server counts with a fixed window or a leaky bucket.
 * One token per RECIPIENT (to + cc + bcc), so a multi-recipient message cannot bypass the limit.
 *
 * Only the app's own sends are counted. Keycloak (realm SMTP) must use a different mailbox or
 * share the budget knowingly.
 */
export const MAIL_BURST = 5
export const MAIL_PER_HOUR = 24

export class EmailRateLimitedError extends Error {
  constructor() {
    super('Outbound email rate limit reached (mailbox budget); retry later')
    this.name = 'EmailRateLimitedError'
  }
}

type Executor = { execute: (q: ReturnType<typeof sql>) => Promise<unknown> }

/**
 * Takes `n` tokens for `mailbox`; false (nothing taken) when the bucket has fewer than `n`.
 * Runs on its own pooled connection (autocommit), never inside the caller's transaction, so a
 * rolled-back request cannot "refund" a mail that was actually handed to the server.
 */
export async function takeMailTokens(
  db: Executor,
  mailbox: string,
  n = 1,
  opts: { burst?: number; perHour?: number } = {},
): Promise<boolean> {
  const burst = opts.burst ?? MAIL_BURST
  const perSecond = (opts.perHour ?? MAIL_PER_HOUR) / 3600
  if (!Number.isInteger(n) || n < 1 || n > burst) return false
  const key = mailbox.toLowerCase()
  const res = (await db.execute(sql`
    INSERT INTO mail_rate_buckets AS b (mailbox, tokens, updated_at)
    VALUES (${key}, ${burst - n}, clock_timestamp())
    ON CONFLICT (mailbox) DO UPDATE
      SET tokens = LEAST(${burst}::float8, b.tokens + EXTRACT(EPOCH FROM (clock_timestamp() - b.updated_at)) * ${perSecond}::float8) - ${n},
          updated_at = clock_timestamp()
      WHERE LEAST(${burst}::float8, b.tokens + EXTRACT(EPOCH FROM (clock_timestamp() - b.updated_at)) * ${perSecond}::float8) >= ${n}
    RETURNING tokens`)) as { rows?: unknown[] }
  return (res.rows?.length ?? 0) > 0
}

/** Guard bound to Payload's base (non-transactional) drizzle instance. */
export function payloadMailGuard(payload: Payload): (mailbox: string, n: number) => Promise<boolean> {
  return (mailbox, n) => takeMailTokens(payload.db.drizzle as unknown as Executor, mailbox, n)
}
