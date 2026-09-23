import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * F2a DB-level guards (ADR 0005, ADR 0006 §2, architecture G1/G3/G4/G5/G6), run as <prefix>_owner.
 * Additive only (new functions/triggers/constraints on the NEW F2a tables, one new table) — safe
 * for staging data. Every guard compares values (`OLD IS DISTINCT FROM NEW`, jsonb minus a column
 * whitelist) because a Payload UPDATE writes every column (F1 spike c).
 *
 * 1. expense_requests: content FREEZE outside Draft / Revisi Nota — BEFORE UPDATE whitelist guard
 *    + `content_hash` (md5 of lines + requesters) set on every transition out of an editable
 *    status; DEFERRED constraint triggers on the parent and on the two child tables Payload
 *    rewrites (`expense_requests_lines`, `expense_requests_rels`) re-check the hash and
 *    `grand_total = Σ lines.total` at commit. approved_amount only on pending_approval → approved
 *    and equal to grand_total (G3).
 * 2. Class A append-only: approvals, expense_line_snapshots (+ server time), G1 in the DB
 *    (requester/creator can never decide; one decision per level; one decision position per person).
 * 3. Class B: receipts (editable window), receipt_flags, transfers (amount = approved amount,
 *    period lock, void only), cash_entries (ADR 0005 §4–§6: immutable posted rows, descriptive
 *    edits only for manual rows in open periods, void columns once), period_closings.
 * 4. Period lock `pk_cash_lock_date()` = last day of the latest CLOSED period.
 * 5. idempotency_keys (G15), media owner columns immutable once set, uuid immutability for the
 *    new tables, CHECK constraints, grants (DELETE only on rewritten child tables + key purge).
 */
const NEW_UUID_TABLES = ['expense_requests', 'receipts', 'transfers', 'cash_entries']
const OWNER_MEDIA = ['media_receipts', 'media_transfer_proofs', 'media_attachments']

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $pk$
    BEGIN
      IF current_user !~ '_owner$' THEN
        RAISE EXCEPTION 'migrations must run as the <prefix>_owner role (current_user=%)', current_user;
      END IF;
    END
    $pk$;

    -- ---------------------------------------------------------------- helpers
    CREATE OR REPLACE FUNCTION pk_expense_editable(st text) RETURNS boolean LANGUAGE sql IMMUTABLE AS $fn$
      SELECT st IN ('draft', 'receipt_revision')
    $fn$;

    CREATE OR REPLACE FUNCTION pk_receipts_editable(typ text, st text) RETURNS boolean LANGUAGE sql IMMUTABLE AS $fn$
      SELECT CASE WHEN typ = 'reimburse' THEN st IN ('draft', 'receipt_revision')
                  ELSE st IN ('transferred', 'receipts_complete', 'lpj_revision') END
    $fn$;

    CREATE OR REPLACE FUNCTION pk_expense_content_hash(rid integer) RETURNS text LANGUAGE sql STABLE AS $fn$
      SELECT md5(
        coalesce((SELECT string_agg(concat_ws('|', l.id, coalesce(l.description, ''), coalesce(l.qty::text, ''),
                                              coalesce(l.uom_id::text, ''), coalesce(l.unit_price::text, ''),
                                              coalesce(l.total::text, ''), coalesce(l.category_id::text, ''),
                                              coalesce(l.vehicle_id::text, ''), coalesce(l.notes, '')),
                                    E'\n' ORDER BY l._order)
                  FROM expense_requests_lines l WHERE l._parent_id = rid), '')
        || E'\n#requesters#' ||
        coalesce((SELECT string_agg(r.employees_id::text, ',' ORDER BY r."order")
                  FROM expense_requests_rels r WHERE r.parent_id = rid AND r.path = 'requesters'), '')
      )
    $fn$;

    CREATE OR REPLACE FUNCTION pk_cash_lock_date() RETURNS date LANGUAGE sql STABLE AS $fn$
      SELECT (max(to_date(period || '-01', 'YYYY-MM-DD')) + interval '1 month' - interval '1 day')::date
      FROM period_closings WHERE status = 'closed'
    $fn$;

    -- ---------------------------------------------------------------- 1. expense_requests
    CREATE OR REPLACE FUNCTION pk_expense_requests_guard() RETURNS trigger LANGUAGE plpgsql AS $fn$
    DECLARE
      wl text[] := ARRAY['status', 'updated_at', 'current_level', 'approved_amount', 'content_hash',
                         'transferred_total', 'cancel_reason', 'reject_reason'];
    BEGIN
      IF pk_expense_editable(OLD.status::text) THEN
        IF NOT pk_expense_editable(NEW.status::text) THEN
          NEW.content_hash := pk_expense_content_hash(NEW.id); -- freeze point (re-checked at commit)
        END IF;
      ELSE
        IF (to_jsonb(OLD) - wl) IS DISTINCT FROM (to_jsonb(NEW) - wl) THEN
          RAISE EXCEPTION 'expense_requests %: content is locked in status %', OLD.id, OLD.status USING ERRCODE = '42501';
        END IF;
        IF NEW.content_hash IS DISTINCT FROM OLD.content_hash AND NOT pk_expense_editable(NEW.status::text) THEN
          RAISE EXCEPTION 'expense_requests %: content_hash is immutable while locked', OLD.id USING ERRCODE = '42501';
        END IF;
        IF pk_expense_editable(NEW.status::text) THEN
          NEW.content_hash := NULL; -- withdraw / receipt revision: content editable again
        END IF;
      END IF;
      IF NEW.approved_amount IS DISTINCT FROM OLD.approved_amount THEN
        IF NOT (OLD.status = 'pending_approval' AND NEW.status = 'approved') THEN
          RAISE EXCEPTION 'expense_requests %: approved_amount changes only on approval (G3)', OLD.id USING ERRCODE = '42501';
        END IF;
      END IF;
      IF NEW.status = 'approved' AND OLD.status = 'pending_approval' AND NEW.approved_amount IS DISTINCT FROM NEW.grand_total THEN
        RAISE EXCEPTION 'expense_requests %: approved_amount must equal grand_total', OLD.id USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    END
    $fn$;
    CREATE TRIGGER expense_requests_guard BEFORE UPDATE ON expense_requests
      FOR EACH ROW EXECUTE FUNCTION pk_expense_requests_guard();

    CREATE OR REPLACE FUNCTION pk_expense_frozen_check() RETURNS trigger LANGUAGE plpgsql AS $fn$
    DECLARE
      rid integer;
      r record;
      lines_total numeric;
    BEGIN
      IF TG_TABLE_NAME = 'expense_requests' THEN
        rid := NEW.id;
      ELSIF TG_TABLE_NAME = 'expense_requests_lines' THEN
        rid := CASE WHEN TG_OP = 'DELETE' THEN OLD._parent_id ELSE NEW._parent_id END;
      ELSE
        rid := CASE WHEN TG_OP = 'DELETE' THEN OLD.parent_id ELSE NEW.parent_id END;
      END IF;
      SELECT status::text AS status, content_hash, grand_total INTO r FROM expense_requests WHERE id = rid;
      IF NOT FOUND THEN RETURN NULL; END IF;
      SELECT coalesce(sum(total), 0) INTO lines_total FROM expense_requests_lines WHERE _parent_id = rid;
      IF coalesce(r.grand_total, 0) <> lines_total THEN
        RAISE EXCEPTION 'expense_requests %: grand_total % <> sum of lines %', rid, r.grand_total, lines_total USING ERRCODE = '23514';
      END IF;
      IF NOT pk_expense_editable(r.status) AND (r.content_hash IS NULL OR r.content_hash <> pk_expense_content_hash(rid)) THEN
        RAISE EXCEPTION 'expense_requests %: lines/requesters are locked in status %', rid, r.status USING ERRCODE = '42501';
      END IF;
      RETURN NULL;
    END
    $fn$;
    CREATE CONSTRAINT TRIGGER expense_requests_frozen AFTER INSERT OR UPDATE ON expense_requests
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pk_expense_frozen_check();
    CREATE CONSTRAINT TRIGGER expense_requests_lines_frozen AFTER INSERT OR UPDATE OR DELETE ON expense_requests_lines
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pk_expense_frozen_check();
    CREATE CONSTRAINT TRIGGER expense_requests_rels_frozen AFTER INSERT OR UPDATE OR DELETE ON expense_requests_rels
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pk_expense_frozen_check();

    CREATE TRIGGER expense_requests_protect BEFORE UPDATE ON expense_requests
      FOR EACH ROW EXECUTE FUNCTION pk_protect_columns('doc_no', 'created_by_id', 'resubmit_of_id', 'client_uuid');

    ALTER TABLE expense_requests
      ADD CONSTRAINT expense_requests_project_xor CHECK (project_id IS NULL OR cost_center_id IS NULL),
      ADD CONSTRAINT expense_requests_dates CHECK (
        (request_date IS NULL OR request_date ~ '^\\d{4}-\\d{2}-\\d{2}$') AND (needed_date IS NULL OR needed_date ~ '^\\d{4}-\\d{2}-\\d{2}$')
        AND (period_from IS NULL OR period_from ~ '^\\d{4}-\\d{2}-\\d{2}$') AND (period_to IS NULL OR period_to ~ '^\\d{4}-\\d{2}-\\d{2}$')),
      ADD CONSTRAINT expense_requests_amounts CHECK (
        (grand_total IS NULL OR (grand_total >= 0 AND grand_total = trunc(grand_total)))
        AND (approved_amount IS NULL OR (approved_amount >= 0 AND approved_amount = trunc(approved_amount))));
    ALTER TABLE expense_requests_lines
      ADD CONSTRAINT expense_requests_lines_total CHECK (total IS NULL OR (total > 0 AND total = trunc(total))),
      ADD CONSTRAINT expense_requests_lines_unit_price CHECK (unit_price IS NULL OR (unit_price >= 0 AND unit_price = trunc(unit_price))),
      ADD CONSTRAINT expense_requests_lines_qty CHECK (qty IS NULL OR qty > 0);

    -- ---------------------------------------------------------------- 2. Class A
    CREATE OR REPLACE FUNCTION pk_approvals_before_insert() RETURNS trigger LANGUAGE plpgsql AS $fn$
    DECLARE
      creator integer;
    BEGIN
      NEW.decided_at := clock_timestamp();
      IF NEW.position IN ('diketahui', 'approval') THEN
        SELECT created_by_id INTO creator FROM expense_requests WHERE id = NEW.request_id;
        IF NEW.actor_id IS NULL OR NEW.actor_id = creator OR EXISTS (
             SELECT 1 FROM expense_requests_rels r JOIN users u ON u.employee_id = r.employees_id
             WHERE r.parent_id = NEW.request_id AND r.path = 'requesters' AND u.id = NEW.actor_id) THEN
          RAISE EXCEPTION 'approvals: requester/creator cannot hold a decision position (G1)' USING ERRCODE = '42501';
        END IF;
      END IF;
      RETURN NEW;
    END
    $fn$;
    CREATE TRIGGER approvals_before_insert BEFORE INSERT ON approvals FOR EACH ROW EXECUTE FUNCTION pk_approvals_before_insert();
    CREATE TRIGGER approvals_no_update BEFORE UPDATE OR DELETE ON approvals FOR EACH ROW EXECUTE FUNCTION pk_reject_mutation();
    CREATE TRIGGER approvals_no_truncate BEFORE TRUNCATE ON approvals FOR EACH STATEMENT EXECUTE FUNCTION pk_reject_mutation();
    CREATE UNIQUE INDEX approvals_one_decision_per_level ON approvals (request_id, cycle, position, level)
      WHERE decision IN ('acknowledged', 'approved', 'rejected');
    CREATE UNIQUE INDEX approvals_one_position_per_person ON approvals (request_id, cycle, actor_id)
      WHERE position IN ('diketahui', 'approval');

    CREATE OR REPLACE FUNCTION pk_snapshot_time() RETURNS trigger LANGUAGE plpgsql AS $fn$
    BEGIN
      NEW.taken_at := clock_timestamp();
      RETURN NEW;
    END
    $fn$;
    CREATE TRIGGER expense_line_snapshots_time BEFORE INSERT ON expense_line_snapshots FOR EACH ROW EXECUTE FUNCTION pk_snapshot_time();
    CREATE TRIGGER expense_line_snapshots_no_update BEFORE UPDATE OR DELETE ON expense_line_snapshots FOR EACH ROW EXECUTE FUNCTION pk_reject_mutation();
    CREATE TRIGGER expense_line_snapshots_no_truncate BEFORE TRUNCATE ON expense_line_snapshots FOR EACH STATEMENT EXECUTE FUNCTION pk_reject_mutation();

    -- ---------------------------------------------------------------- 3. Class B
    CREATE OR REPLACE FUNCTION pk_receipts_guard() RETURNS trigger LANGUAGE plpgsql AS $fn$
    DECLARE
      r record;
      wl text[] := ARRAY['status', 'reject_reason', 'verified_by_id', 'verified_at', 'updated_at'];
    BEGIN
      SELECT type::text AS type, status::text AS status INTO r FROM expense_requests WHERE id = NEW.request_id;
      IF TG_OP = 'INSERT' THEN
        IF NOT pk_receipts_editable(r.type, r.status) THEN
          RAISE EXCEPTION 'receipts: request % (%) does not accept receipts', NEW.request_id, r.status USING ERRCODE = '42501';
        END IF;
        RETURN NEW;
      END IF;
      IF pk_receipts_editable(r.type, r.status) THEN RETURN NEW; END IF;
      IF (to_jsonb(OLD) - wl) IS DISTINCT FROM (to_jsonb(NEW) - wl) OR NEW.status::text NOT IN ('pending', 'valid', 'rejected') THEN
        RAISE EXCEPTION 'receipts %: only verification columns may change in status %', OLD.id, r.status USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    END
    $fn$;
    CREATE TRIGGER receipts_guard BEFORE INSERT OR UPDATE ON receipts FOR EACH ROW EXECUTE FUNCTION pk_receipts_guard();
    CREATE TRIGGER receipts_protect BEFORE UPDATE ON receipts
      FOR EACH ROW EXECUTE FUNCTION pk_protect_columns('request_id', 'image_id', 'image_sha256', 'created_by_id');
    ALTER TABLE receipts
      ADD CONSTRAINT receipts_amount CHECK (amount > 0 AND amount = trunc(amount)),
      ADD CONSTRAINT receipts_date CHECK (receipt_date ~ '^\\d{4}-\\d{2}-\\d{2}$');

    CREATE OR REPLACE FUNCTION pk_receipt_flags_guard() RETURNS trigger LANGUAGE plpgsql AS $fn$
    DECLARE
      wl text[] := ARRAY['status', 'reviewed_by_id', 'reviewed_at', 'review_note', 'resolved_at', 'updated_at'];
    BEGIN
      IF (to_jsonb(OLD) - wl) IS DISTINCT FROM (to_jsonb(NEW) - wl) OR OLD.status = 'resolved'
         OR (OLD.status = 'reviewed' AND NEW.status = 'open') THEN
        RAISE EXCEPTION 'receipt_flags %: identity is immutable; status only open → reviewed → resolved', OLD.id USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    END
    $fn$;
    CREATE TRIGGER receipt_flags_guard BEFORE UPDATE ON receipt_flags FOR EACH ROW EXECUTE FUNCTION pk_receipt_flags_guard();

    CREATE OR REPLACE FUNCTION pk_transfers_guard() RETURNS trigger LANGUAGE plpgsql AS $fn$
    DECLARE
      r record;
      lock_d date := pk_cash_lock_date();
      wl text[] := ARRAY['status', 'void_reason', 'voided_by_id', 'voided_at', 'cash_entry_id', 'updated_at'];
    BEGIN
      IF TG_OP = 'INSERT' THEN
        IF lock_d IS NOT NULL AND NEW.transfer_date::date <= lock_d THEN
          RAISE EXCEPTION 'transfers: period of % is closed (lock date %)', NEW.transfer_date, lock_d USING ERRCODE = '42501';
        END IF;
        IF NEW.kind IN ('advance', 'reimburse') THEN
          SELECT type::text AS type, status::text AS status, approved_amount INTO r FROM expense_requests WHERE id = NEW.request_id;
          IF r.approved_amount IS NULL OR NEW.amount <> r.approved_amount THEN
            RAISE EXCEPTION 'transfers: amount must equal the approved amount (G3)' USING ERRCODE = '42501';
          END IF;
          IF NOT ((r.type = 'advance' AND r.status = 'approved') OR (r.type = 'reimburse' AND r.status = 'receipts_verified')) THEN
            RAISE EXCEPTION 'transfers: request % is not in the transfer queue (%)', NEW.request_id, r.status USING ERRCODE = '42501';
          END IF;
        END IF;
        IF NEW.status <> 'posted' OR NEW.void_reason IS NOT NULL THEN
          RAISE EXCEPTION 'transfers: new transfers are posted' USING ERRCODE = '42501';
        END IF;
        RETURN NEW;
      END IF;
      IF (to_jsonb(OLD) - wl) IS DISTINCT FROM (to_jsonb(NEW) - wl)
         OR (OLD.cash_entry_id IS NOT NULL AND NEW.cash_entry_id IS DISTINCT FROM OLD.cash_entry_id)
         OR (OLD.status = 'void' AND (to_jsonb(OLD) - 'updated_at') IS DISTINCT FROM (to_jsonb(NEW) - 'updated_at'))
         OR (NEW.status = 'void' AND NEW.void_reason IS NULL)
         OR (NEW.status = 'posted' AND (NEW.void_reason IS NOT NULL OR NEW.voided_at IS NOT NULL)) THEN
        RAISE EXCEPTION 'transfers %: posted transfers are immutable (void only)', OLD.id USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    END
    $fn$;
    CREATE TRIGGER transfers_guard BEFORE INSERT OR UPDATE ON transfers FOR EACH ROW EXECUTE FUNCTION pk_transfers_guard();
    ALTER TABLE transfers
      ADD CONSTRAINT transfers_amount CHECK (amount > 0 AND amount = trunc(amount)),
      ADD CONSTRAINT transfers_date CHECK (transfer_date ~ '^\\d{4}-\\d{2}-\\d{2}$');

    CREATE OR REPLACE FUNCTION pk_cash_entries_guard() RETURNS trigger LANGUAGE plpgsql AS $fn$
    DECLARE
      lock_d date := pk_cash_lock_date();
      descr text[] := ARRAY['description', 'category_id', 'cash_in_source_id', 'project_id', 'cost_center_id', 'vehicle_id', 'proof_id'];
      voidc text[] := ARRAY['status', 'void_reason', 'voided_by_id', 'voided_at', 'reversed_by_id'];
      o jsonb := to_jsonb(OLD);
      n jsonb := to_jsonb(NEW);
      k text;
      descr_changed boolean := false;
    BEGIN
      IF TG_OP = 'INSERT' THEN
        NEW.period := substr(NEW.entry_date, 1, 7);
        NEW.posted_at := clock_timestamp();
        IF lock_d IS NOT NULL AND NEW.entry_date::date <= lock_d THEN
          RAISE EXCEPTION 'cash_entries: period of % is closed (lock date %)', NEW.entry_date, lock_d USING ERRCODE = '42501';
        END IF;
        IF NEW.status <> 'posted' OR NEW.void_reason IS NOT NULL OR NEW.reversed_by_id IS NOT NULL THEN
          RAISE EXCEPTION 'cash_entries: new entries are posted' USING ERRCODE = '42501';
        END IF;
        RETURN NEW;
      END IF;
      -- posted rows: amount/direction/account/date/number/source never change (void + new entry)
      IF (o - descr - voidc - 'updated_at') IS DISTINCT FROM (n - descr - voidc - 'updated_at') THEN
        RAISE EXCEPTION 'cash_entries %: posted entries are immutable (void + new entry)', OLD.id USING ERRCODE = '42501';
      END IF;
      FOREACH k IN ARRAY descr LOOP
        IF (o -> k) IS DISTINCT FROM (n -> k) THEN descr_changed := true; END IF;
      END LOOP;
      IF descr_changed AND (OLD.source_type <> 'manual' OR OLD.status <> 'posted' OR NEW.status <> 'posted'
                            OR (lock_d IS NOT NULL AND OLD.entry_date::date <= lock_d)) THEN
        RAISE EXCEPTION 'cash_entries %: only manual posted entries of an open period can be edited', OLD.id USING ERRCODE = '42501';
      END IF;
      IF (o -> 'status') IS DISTINCT FROM (n -> 'status') OR (o -> 'void_reason') IS DISTINCT FROM (n -> 'void_reason')
         OR (o -> 'voided_by_id') IS DISTINCT FROM (n -> 'voided_by_id') OR (o -> 'voided_at') IS DISTINCT FROM (n -> 'voided_at')
         OR (o -> 'reversed_by_id') IS DISTINCT FROM (n -> 'reversed_by_id') THEN
        IF NOT (OLD.status = 'posted' AND NEW.status = 'void' AND NEW.void_reason IS NOT NULL AND OLD.void_reason IS NULL
                AND OLD.source_type <> 'reversal') THEN
          RAISE EXCEPTION 'cash_entries %: only posted → void (with reason) is allowed', OLD.id USING ERRCODE = '42501';
        END IF;
      END IF;
      RETURN NEW;
    END
    $fn$;
    CREATE TRIGGER cash_entries_guard BEFORE INSERT OR UPDATE ON cash_entries FOR EACH ROW EXECUTE FUNCTION pk_cash_entries_guard();
    ALTER TABLE cash_entries
      ADD CONSTRAINT cash_entries_amount CHECK (amount > 0 AND amount = trunc(amount)),
      ADD CONSTRAINT cash_entries_date CHECK (entry_date ~ '^\\d{4}-\\d{2}-\\d{2}$'),
      ADD CONSTRAINT cash_entries_project_xor CHECK (project_id IS NULL OR cost_center_id IS NULL),
      ADD CONSTRAINT cash_entries_reversal CHECK ((source_type = 'reversal') = (reversal_of_id IS NOT NULL));
    CREATE UNIQUE INDEX cash_entries_one_reversal ON cash_entries (reversal_of_id) WHERE reversal_of_id IS NOT NULL;

    CREATE OR REPLACE FUNCTION pk_period_closings_guard() RETURNS trigger LANGUAGE plpgsql AS $fn$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        NEW.closed_at := clock_timestamp();
        IF NEW.status <> 'closed' THEN RAISE EXCEPTION 'period_closings: new rows are closed' USING ERRCODE = '42501'; END IF;
        RETURN NEW;
      END IF;
      IF NOT (OLD.status = 'closed' AND NEW.status = 'reopened' AND NEW.reopen_reason IS NOT NULL)
         OR (to_jsonb(OLD) - ARRAY['status', 'reopened_by_id', 'reopened_at', 'reopen_reason', 'updated_at'])
            IS DISTINCT FROM (to_jsonb(NEW) - ARRAY['status', 'reopened_by_id', 'reopened_at', 'reopen_reason', 'updated_at']) THEN
        RAISE EXCEPTION 'period_closings %: only closed → reopened (with reason)', OLD.id USING ERRCODE = '42501';
      END IF;
      NEW.reopened_at := clock_timestamp();
      RETURN NEW;
    END
    $fn$;
    CREATE TRIGGER period_closings_guard BEFORE INSERT OR UPDATE ON period_closings FOR EACH ROW EXECUTE FUNCTION pk_period_closings_guard();
    ALTER TABLE period_closings ADD CONSTRAINT period_closings_period CHECK (period ~ '^\\d{4}-(0[1-9]|1[0-2])$');
    CREATE UNIQUE INDEX period_closings_one_closed ON period_closings (period) WHERE status = 'closed';

    -- ---------------------------------------------------------------- 5. idempotency (G15)
    CREATE TABLE idempotency_keys (
      user_id      integer     NOT NULL,
      key          text        NOT NULL CHECK (key ~ '^[0-9a-f-]{36}$'),
      method       text        NOT NULL,
      path         text        NOT NULL,
      request_hash text        NOT NULL,
      status_code  integer,
      response     jsonb,
      created_at   timestamptz NOT NULL DEFAULT now(),
      expires_at   timestamptz NOT NULL,
      PRIMARY KEY (user_id, key)
    );
    CREATE INDEX idempotency_keys_expires_idx ON idempotency_keys (expires_at);
  `)

  for (const t of NEW_UUID_TABLES) {
    await db.execute(sql.raw(`CREATE TRIGGER ${t}_uuid_immutable BEFORE UPDATE ON ${t} FOR EACH ROW EXECUTE FUNCTION pk_protect_columns('uuid');`))
  }
  for (const t of OWNER_MEDIA) {
    await db.execute(sql.raw(`CREATE TRIGGER ${t}_owner_protect BEFORE UPDATE ON ${t} FOR EACH ROW EXECUTE FUNCTION pk_protect_columns('owner_doc_type', 'owner_doc_id');`))
  }

  await db.execute(sql`
    DO $pk$
    DECLARE
      app_role text := regexp_replace(current_user, '_owner$', '_app');
    BEGIN
      EXECUTE format('REVOKE UPDATE, DELETE, TRUNCATE ON approvals, expense_line_snapshots FROM %I', app_role);
      EXECUTE format('GRANT DELETE ON expense_requests_lines, expense_requests_rels, idempotency_keys TO %I', app_role);
    END
    $pk$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  for (const t of OWNER_MEDIA) await db.execute(sql.raw(`DROP TRIGGER IF EXISTS ${t}_owner_protect ON ${t};`))
  for (const t of NEW_UUID_TABLES) await db.execute(sql.raw(`DROP TRIGGER IF EXISTS ${t}_uuid_immutable ON ${t};`))
  await db.execute(sql`
    DROP TABLE IF EXISTS idempotency_keys;
    DROP TRIGGER IF EXISTS period_closings_guard ON period_closings;
    DROP TRIGGER IF EXISTS cash_entries_guard ON cash_entries;
    DROP TRIGGER IF EXISTS transfers_guard ON transfers;
    DROP TRIGGER IF EXISTS receipt_flags_guard ON receipt_flags;
    DROP TRIGGER IF EXISTS receipts_protect ON receipts;
    DROP TRIGGER IF EXISTS receipts_guard ON receipts;
    DROP TRIGGER IF EXISTS expense_line_snapshots_no_truncate ON expense_line_snapshots;
    DROP TRIGGER IF EXISTS expense_line_snapshots_no_update ON expense_line_snapshots;
    DROP TRIGGER IF EXISTS expense_line_snapshots_time ON expense_line_snapshots;
    DROP TRIGGER IF EXISTS approvals_no_truncate ON approvals;
    DROP TRIGGER IF EXISTS approvals_no_update ON approvals;
    DROP TRIGGER IF EXISTS approvals_before_insert ON approvals;
    DROP TRIGGER IF EXISTS expense_requests_protect ON expense_requests;
    DROP TRIGGER IF EXISTS expense_requests_rels_frozen ON expense_requests_rels;
    DROP TRIGGER IF EXISTS expense_requests_lines_frozen ON expense_requests_lines;
    DROP TRIGGER IF EXISTS expense_requests_frozen ON expense_requests;
    DROP TRIGGER IF EXISTS expense_requests_guard ON expense_requests;
    DROP FUNCTION IF EXISTS pk_period_closings_guard();
    DROP FUNCTION IF EXISTS pk_cash_entries_guard();
    DROP FUNCTION IF EXISTS pk_transfers_guard();
    DROP FUNCTION IF EXISTS pk_receipt_flags_guard();
    DROP FUNCTION IF EXISTS pk_receipts_guard();
    DROP FUNCTION IF EXISTS pk_snapshot_time();
    DROP FUNCTION IF EXISTS pk_approvals_before_insert();
    DROP FUNCTION IF EXISTS pk_expense_frozen_check();
    DROP FUNCTION IF EXISTS pk_expense_requests_guard();
    DROP FUNCTION IF EXISTS pk_cash_lock_date();
    DROP FUNCTION IF EXISTS pk_expense_content_hash(integer);
    DROP FUNCTION IF EXISTS pk_receipts_editable(text, text);
    DROP FUNCTION IF EXISTS pk_expense_editable(text);
  `)
}
