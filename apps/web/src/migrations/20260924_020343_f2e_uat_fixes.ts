import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * F2e (UAT fixes): two new `audit_logs.action` values — `acknowledge_delegated` ("Diketahui"
 * delegated to Owner/Admin at submit, Q-07/Q-08 fallback) and `access_denied` (a self-involvement
 * guard refused an action; recorded in its own transaction). ADDITIVE / staging-safe: existing rows
 * are untouched (ALTER TYPE … ADD VALUE only).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TYPE "public"."enum_audit_logs_action" ADD VALUE IF NOT EXISTS 'acknowledge_delegated';
  ALTER TYPE "public"."enum_audit_logs_action" ADD VALUE IF NOT EXISTS 'access_denied';`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Hand-written no-op: Postgres cannot drop enum values, and re-creating the type (the generated
  // down) fails as soon as an audit row uses a new value — audit_logs is append-only (ADR 0006), so
  // those rows can be neither changed nor removed. The two extra values are harmless without F2e.
  await db.execute(sql`SELECT 1`)
}
