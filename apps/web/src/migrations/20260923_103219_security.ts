import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * ADR 0006 (+ F1 spike c refinements) and ADR 0007, run as <prefix>_owner:
 * 1. payload_migrations: owner-only writes.
 * 2. Class A `audit_logs`: no UPDATE/DELETE/TRUNCATE for the app role, reject triggers for
 *    everyone (incl. owner via normal DML), `server_time` forced by trigger, NOT NULL, indexes.
 * 3. Explicit DELETE grants ONLY where Payload rewrites rows (array / hasMany child tables of
 *    MUTABLE collections: every parent update deletes + re-inserts them — spike c) and Payload
 *    internals (payload_locked_documents* get `delete … where false` on every update — spike c).
 *    tests/integration/db-security.int.test.ts diffs this list against the catalog.
 * 4. `pk_protect_columns(col, …)`: immutable-once-set columns. Payload UPDATE writes EVERY column
 *    (spike c) → compare `OLD.col IS DISTINCT FROM NEW.col` per protected column, not
 *    `BEFORE UPDATE OF col` (which would fire on every update).
 * 5. ADR 0007 `document_sequence_counters` (not a collection): no DELETE, next_value monotonic.
 */
const DELETE_GRANTS = [
  'users_roles',
  'stage_templates_items',
  'expense_categories_rels',
  'approval_rules_steps',
  'payload_kv',
  'payload_jobs',
  'payload_jobs_log',
  'payload_locked_documents',
  'payload_locked_documents_rels',
  'payload_preferences',
  'payload_preferences_rels',
]

/** table → columns immutable once non-null (besides every `uuid` column, handled generically). */
const PROTECTED: Record<string, string[]> = {
  users: ['keycloak_sub'],
  devices: ['device_id', 'user_id', 'registered_at'],
  web_sessions: ['id_hash', 'user_id', 'keycloak_sid'],
  document_sequences: ['doc_type'],
  project_stages: ['project_id'],
  budget_lines: ['project_id', 'category_id'],
  media_receipts: ['filename', 'sha256_original', 'uploaded_by_id', 'received_at'],
  media_transfer_proofs: ['filename', 'sha256_original', 'uploaded_by_id', 'received_at'],
  media_selfies: ['filename', 'sha256_original', 'uploaded_by_id', 'received_at'],
  media_progress_photos: ['filename', 'sha256_original', 'uploaded_by_id', 'received_at'],
  media_signatures: ['filename', 'sha256_original', 'uploaded_by_id', 'received_at'],
  media_company: ['filename', 'sha256_original', 'uploaded_by_id', 'received_at'],
  media_attachments: ['filename', 'sha256_original', 'uploaded_by_id', 'received_at'],
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION pk_reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $fn$
    BEGIN
      RAISE EXCEPTION 'append-only table %: % rejected', TG_TABLE_NAME, TG_OP USING ERRCODE = '42501';
    END
    $fn$;

    CREATE OR REPLACE FUNCTION pk_audit_server_time() RETURNS trigger LANGUAGE plpgsql AS $fn$
    BEGIN
      NEW.server_time := clock_timestamp(); -- ignore any client/app value (ADR 0006 §2)
      RETURN NEW;
    END
    $fn$;

    CREATE OR REPLACE FUNCTION pk_protect_columns() RETURNS trigger LANGUAGE plpgsql AS $fn$
    DECLARE
      col text;
      o jsonb := to_jsonb(OLD);
      n jsonb := to_jsonb(NEW);
    BEGIN
      FOREACH col IN ARRAY TG_ARGV LOOP
        IF (o -> col) IS NOT NULL AND (o -> col) <> 'null'::jsonb AND (o -> col) IS DISTINCT FROM (n -> col) THEN
          RAISE EXCEPTION 'column %.% is immutable', TG_TABLE_NAME, col USING ERRCODE = '42501';
        END IF;
      END LOOP;
      RETURN NEW;
    END
    $fn$;

    CREATE OR REPLACE FUNCTION pk_counter_monotonic() RETURNS trigger LANGUAGE plpgsql AS $fn$
    BEGIN
      IF NEW.next_value < OLD.next_value OR NEW.doc_type <> OLD.doc_type OR NEW.period_key <> OLD.period_key THEN
        RAISE EXCEPTION 'document_sequence_counters: next_value may only increase' USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    END
    $fn$;

    -- Class A: audit_logs
    ALTER TABLE audit_logs ALTER COLUMN server_time SET NOT NULL;
    CREATE TRIGGER audit_logs_no_update BEFORE UPDATE OR DELETE ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION pk_reject_mutation();
    CREATE TRIGGER audit_logs_no_truncate BEFORE TRUNCATE ON audit_logs
      FOR EACH STATEMENT EXECUTE FUNCTION pk_reject_mutation();
    CREATE TRIGGER audit_logs_time BEFORE INSERT ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION pk_audit_server_time();
    CREATE INDEX audit_logs_doc_idx ON audit_logs (doc_type, doc_id, server_time);
    CREATE INDEX audit_logs_user_idx ON audit_logs (user_id, server_time);
    CREATE INDEX audit_logs_action_idx ON audit_logs (action, server_time);

    -- ADR 0007 counters
    CREATE TABLE document_sequence_counters (
      doc_type   text    NOT NULL,
      period_key text    NOT NULL,
      next_value integer NOT NULL CHECK (next_value > 0),
      PRIMARY KEY (doc_type, period_key)
    );
    CREATE TRIGGER document_sequence_counters_monotonic BEFORE UPDATE ON document_sequence_counters
      FOR EACH ROW EXECUTE FUNCTION pk_counter_monotonic();
    CREATE TRIGGER document_sequence_counters_no_delete BEFORE DELETE ON document_sequence_counters
      FOR EACH ROW EXECUTE FUNCTION pk_reject_mutation();
    CREATE TRIGGER document_sequence_counters_no_truncate BEFORE TRUNCATE ON document_sequence_counters
      FOR EACH STATEMENT EXECUTE FUNCTION pk_reject_mutation();
  `)

  for (const [table, cols] of Object.entries(PROTECTED)) {
    const args = cols.map((c) => `'${c}'`).join(', ')
    await db.execute(
      sql.raw(`CREATE TRIGGER ${table}_protect BEFORE UPDATE ON ${table} FOR EACH ROW EXECUTE FUNCTION pk_protect_columns(${args});`),
    )
  }

  await db.execute(sql`
    DO $pk$
    DECLARE
      app_role text := regexp_replace(current_user, '_owner$', '_app');
      t record;
    BEGIN
      IF current_user !~ '_owner$' THEN
        RAISE EXCEPTION 'migrations must run as the <prefix>_owner role (current_user=%)', current_user;
      END IF;
      -- every mirrored table's uuid is immutable once set (architecture §4.1)
      FOR t IN SELECT c.table_name FROM information_schema.columns c
               WHERE c.table_schema = 'public' AND c.column_name = 'uuid' LOOP
        EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION pk_protect_columns(%L)',
                       t.table_name || '_uuid_immutable', t.table_name, 'uuid');
      END LOOP;
      EXECUTE format('REVOKE ALL ON payload_migrations FROM %I', app_role);
      EXECUTE format('GRANT SELECT ON payload_migrations TO %I', app_role);
      EXECUTE format('REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM %I', app_role);
      EXECUTE format('REVOKE DELETE, TRUNCATE ON document_sequence_counters FROM %I', app_role);
    END
    $pk$;
  `)
  await db.execute(
    sql.raw(`DO $pk$ BEGIN EXECUTE format('GRANT DELETE ON ${DELETE_GRANTS.join(', ')} TO %I', regexp_replace(current_user, '_owner$', '_app')); END $pk$;`),
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  for (const table of Object.keys(PROTECTED)) {
    await db.execute(sql.raw(`DROP TRIGGER IF EXISTS ${table}_protect ON ${table};`))
  }
  await db.execute(sql`
    DO $pk$
    DECLARE t record;
    BEGIN
      FOR t IN SELECT c.table_name FROM information_schema.columns c
               WHERE c.table_schema = 'public' AND c.column_name = 'uuid' LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', t.table_name || '_uuid_immutable', t.table_name);
      END LOOP;
    END
    $pk$;
    DROP TABLE IF EXISTS document_sequence_counters;
    DROP INDEX IF EXISTS audit_logs_doc_idx;
    DROP INDEX IF EXISTS audit_logs_user_idx;
    DROP INDEX IF EXISTS audit_logs_action_idx;
    DROP TRIGGER IF EXISTS audit_logs_time ON audit_logs;
    DROP TRIGGER IF EXISTS audit_logs_no_truncate ON audit_logs;
    DROP TRIGGER IF EXISTS audit_logs_no_update ON audit_logs;
    DROP FUNCTION IF EXISTS pk_counter_monotonic();
    DROP FUNCTION IF EXISTS pk_protect_columns();
    DROP FUNCTION IF EXISTS pk_audit_server_time();
    DROP FUNCTION IF EXISTS pk_reject_mutation();
  `)
}
