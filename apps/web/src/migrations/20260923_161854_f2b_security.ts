import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * F2b DB-level guards (ADR 0005 §3, ADR 0006 §2, architecture §5.1/§5.3, G3/G5/G6), run as
 * <prefix>_owner. ADDITIVE / staging-safe: new triggers and CHECKs on the two NEW tables
 * (settlements, notifications), `CREATE OR REPLACE` of two existing guard functions (same
 * behaviour for existing rows, extended for the new column / transfer kind) and one CHECK on
 * cash_entries that no existing row can violate (no settlement_refund rows exist before F2b).
 *
 * 1. expense_requests guard: `verified_receipts_total` joins the whitelist of workflow columns that
 *    may change while the content is locked (set on LPJ verification only).
 * 2. settlements (Class B): status graph draft → submitted ⇄ revision, submitted → verified →
 *    settled; identity immutable; column groups only change on their own transition; settled rows
 *    frozen; verified difference = transferred − verified receipts; settled row must point to a
 *    posted refund KM / shortfall transfer of exactly the difference (or none when 0).
 * 3. transfers guard: `lpj_shortfall` only for an Uang Muka in "LPJ Terverifikasi" whose LPJ is
 *    verified as shortfall, amount = −difference (G3 for the settlement), one per request.
 * 4. cash_entries: settlement_refund rows are cash-IN linked to the request, amount = the verified
 *    LPJ surplus, request in "LPJ Terverifikasi".
 * 5. notifications: identity columns immutable once set, `read_at` once set stays (no "unread"),
 *    no DELETE (default grants), uuid immutable.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $pk$
    BEGIN
      IF current_user !~ '_owner$' THEN
        RAISE EXCEPTION 'migrations must run as the <prefix>_owner role (current_user=%)', current_user;
      END IF;
    END
    $pk$;

    -- ---------------------------------------------------------------- 1. expense_requests
    CREATE OR REPLACE FUNCTION pk_expense_requests_guard() RETURNS trigger LANGUAGE plpgsql AS $fn$
    DECLARE
      wl text[] := ARRAY['status', 'updated_at', 'current_level', 'approved_amount', 'content_hash',
                         'transferred_total', 'cancel_reason', 'reject_reason', 'verified_receipts_total'];
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
      IF NEW.verified_receipts_total IS DISTINCT FROM OLD.verified_receipts_total
         AND NOT (OLD.status = 'lpj_submitted' AND NEW.status IN ('lpj_verified', 'completed')) THEN
        RAISE EXCEPTION 'expense_requests %: verified_receipts_total changes only on LPJ verification', OLD.id USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    END
    $fn$;

    -- ---------------------------------------------------------------- 2. settlements
    CREATE OR REPLACE FUNCTION pk_settlements_guard() RETURNS trigger LANGUAGE plpgsql AS $fn$
    DECLARE
      r record;
      o jsonb;
      n jsonb;
      submit_cols text[] := ARRAY['usage_notes', 'transferred_total', 'receipts_total', 'difference', 'submit_count',
                                  'submitted_at', 'submitted_by_id', 'doc_no'];
      verify_cols text[] := ARRAY['transferred_total', 'verified_receipts_total', 'difference', 'settlement_type',
                                  'verified_at', 'verified_by_id'];
      settle_cols text[] := ARRAY['settled_at', 'settled_by_id', 'refund_cash_entry_id', 'shortfall_transfer_id'];
      always text[] := ARRAY['status', 'updated_at'];
      allowed text[];
      ce record;
      tr record;
    BEGIN
      SELECT type::text AS type, status::text AS status INTO r FROM expense_requests WHERE id = NEW.request_id;
      IF TG_OP = 'INSERT' THEN
        IF r.type IS DISTINCT FROM 'advance' THEN
          RAISE EXCEPTION 'settlements: LPJ exists only for Uang Muka (request %)', NEW.request_id USING ERRCODE = '42501';
        END IF;
        IF NEW.status <> 'draft' OR NEW.doc_no IS NOT NULL OR NEW.settled_at IS NOT NULL OR NEW.verified_at IS NOT NULL
           OR NEW.refund_cash_entry_id IS NOT NULL OR NEW.shortfall_transfer_id IS NOT NULL THEN
          RAISE EXCEPTION 'settlements: new LPJ rows are drafts' USING ERRCODE = '42501';
        END IF;
        RETURN NEW;
      END IF;

      o := to_jsonb(OLD);
      n := to_jsonb(NEW);
      IF OLD.status = 'settled' AND (o - 'updated_at') IS DISTINCT FROM (n - 'updated_at') THEN
        RAISE EXCEPTION 'settlements %: settled LPJ is immutable', OLD.id USING ERRCODE = '42501';
      END IF;
      IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
           (OLD.status = 'draft' AND NEW.status = 'submitted') OR (OLD.status = 'submitted' AND NEW.status IN ('revision', 'verified'))
           OR (OLD.status = 'revision' AND NEW.status = 'submitted') OR (OLD.status = 'verified' AND NEW.status = 'settled')) THEN
        RAISE EXCEPTION 'settlements %: status % → % not allowed', OLD.id, OLD.status, NEW.status USING ERRCODE = '42501';
      END IF;
      allowed := always;
      IF NEW.status = 'submitted' AND OLD.status IN ('draft', 'revision') THEN allowed := allowed || submit_cols; END IF;
      IF NEW.status = 'revision' AND OLD.status = 'submitted' THEN allowed := allowed || ARRAY['finance_notes']; END IF;
      IF NEW.status = 'verified' AND OLD.status = 'submitted' THEN allowed := allowed || verify_cols; END IF;
      IF NEW.status = 'settled' AND OLD.status = 'verified' THEN allowed := allowed || settle_cols; END IF;
      IF (o - allowed) IS DISTINCT FROM (n - allowed) THEN
        RAISE EXCEPTION 'settlements %: columns outside the % transition cannot change', OLD.id, NEW.status USING ERRCODE = '42501';
      END IF;

      IF NEW.status = 'verified' AND OLD.status = 'submitted' THEN
        IF NEW.verified_receipts_total IS NULL OR NEW.transferred_total IS NULL
           OR NEW.difference IS DISTINCT FROM NEW.transferred_total - NEW.verified_receipts_total
           OR NEW.settlement_type IS DISTINCT FROM (CASE WHEN NEW.difference > 0 THEN 'refund' WHEN NEW.difference < 0 THEN 'shortfall' ELSE 'none' END)::enum_settlements_settlement_type THEN
          RAISE EXCEPTION 'settlements %: verified totals are inconsistent', OLD.id USING ERRCODE = '23514';
        END IF;
      END IF;

      IF NEW.status = 'settled' AND OLD.status = 'verified' THEN
        IF NEW.settlement_type = 'none' THEN
          IF NEW.difference <> 0 OR NEW.refund_cash_entry_id IS NOT NULL OR NEW.shortfall_transfer_id IS NOT NULL THEN
            RAISE EXCEPTION 'settlements %: nothing to settle expected', OLD.id USING ERRCODE = '23514';
          END IF;
        ELSIF NEW.settlement_type = 'refund' THEN
          SELECT direction::text AS direction, amount, source_type::text AS source_type, expense_request_id, status::text AS status
            INTO ce FROM cash_entries WHERE id = NEW.refund_cash_entry_id;
          IF NOT FOUND OR NEW.shortfall_transfer_id IS NOT NULL OR ce.direction <> 'in' OR ce.source_type <> 'settlement_refund'
             OR ce.status <> 'posted' OR ce.expense_request_id IS DISTINCT FROM NEW.request_id OR ce.amount <> NEW.difference THEN
            RAISE EXCEPTION 'settlements %: refund must be a posted KM of exactly the surplus', OLD.id USING ERRCODE = '23514';
          END IF;
        ELSE
          SELECT kind::text AS kind, amount, request_id, status::text AS status INTO tr FROM transfers WHERE id = NEW.shortfall_transfer_id;
          IF NOT FOUND OR NEW.refund_cash_entry_id IS NOT NULL OR tr.kind <> 'lpj_shortfall' OR tr.status <> 'posted'
             OR tr.request_id IS DISTINCT FROM NEW.request_id OR tr.amount <> -NEW.difference THEN
            RAISE EXCEPTION 'settlements %: shortfall must be a posted transfer of exactly the shortfall', OLD.id USING ERRCODE = '23514';
          END IF;
        END IF;
      END IF;
      RETURN NEW;
    END
    $fn$;
    CREATE TRIGGER settlements_guard BEFORE INSERT OR UPDATE ON settlements FOR EACH ROW EXECUTE FUNCTION pk_settlements_guard();
    CREATE TRIGGER settlements_protect BEFORE UPDATE ON settlements
      FOR EACH ROW EXECUTE FUNCTION pk_protect_columns('doc_no', 'request_id', 'uuid', 'refund_cash_entry_id', 'shortfall_transfer_id');
    ALTER TABLE settlements
      ADD CONSTRAINT settlements_amounts CHECK (
        (transferred_total IS NULL OR (transferred_total >= 0 AND transferred_total = trunc(transferred_total)))
        AND (receipts_total IS NULL OR (receipts_total >= 0 AND receipts_total = trunc(receipts_total)))
        AND (verified_receipts_total IS NULL OR (verified_receipts_total >= 0 AND verified_receipts_total = trunc(verified_receipts_total)))
        AND (difference IS NULL OR difference = trunc(difference))),
      ADD CONSTRAINT settlements_revision_note CHECK (status <> 'revision' OR length(coalesce(finance_notes, '')) >= 3),
      ADD CONSTRAINT settlements_submitted_no CHECK (status = 'draft' OR doc_no IS NOT NULL);

    -- ---------------------------------------------------------------- 3. transfers
    CREATE OR REPLACE FUNCTION pk_transfers_guard() RETURNS trigger LANGUAGE plpgsql AS $fn$
    DECLARE
      r record;
      s record;
      lock_d date := pk_cash_lock_date();
      wl text[] := ARRAY['status', 'void_reason', 'voided_by_id', 'voided_at', 'cash_entry_id', 'updated_at'];
    BEGIN
      IF TG_OP = 'INSERT' THEN
        IF lock_d IS NOT NULL AND NEW.transfer_date::date <= lock_d THEN
          RAISE EXCEPTION 'transfers: period of % is closed (lock date %)', NEW.transfer_date, lock_d USING ERRCODE = '42501';
        END IF;
        SELECT type::text AS type, status::text AS status, approved_amount INTO r FROM expense_requests WHERE id = NEW.request_id;
        IF NEW.kind IN ('advance', 'reimburse') THEN
          IF r.approved_amount IS NULL OR NEW.amount <> r.approved_amount THEN
            RAISE EXCEPTION 'transfers: amount must equal the approved amount (G3)' USING ERRCODE = '42501';
          END IF;
          IF NOT ((r.type = 'advance' AND r.status = 'approved') OR (r.type = 'reimburse' AND r.status = 'receipts_verified')) THEN
            RAISE EXCEPTION 'transfers: request % is not in the transfer queue (%)', NEW.request_id, r.status USING ERRCODE = '42501';
          END IF;
        ELSIF NEW.kind = 'lpj_shortfall' THEN
          SELECT status::text AS status, settlement_type::text AS settlement_type, difference INTO s FROM settlements WHERE request_id = NEW.request_id;
          IF r.type IS DISTINCT FROM 'advance' OR r.status IS DISTINCT FROM 'lpj_verified' OR s.status IS DISTINCT FROM 'verified'
             OR s.settlement_type IS DISTINCT FROM 'shortfall' OR NEW.amount <> -s.difference THEN
            RAISE EXCEPTION 'transfers: shortfall transfer must equal the verified LPJ shortfall (G3)' USING ERRCODE = '42501';
          END IF;
          IF EXISTS (SELECT 1 FROM transfers t WHERE t.request_id = NEW.request_id AND t.kind = 'lpj_shortfall' AND t.status = 'posted') THEN
            RAISE EXCEPTION 'transfers: request % already has a shortfall transfer', NEW.request_id USING ERRCODE = '42501';
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

    -- ---------------------------------------------------------------- 4. cash_entries (LPJ refund)
    CREATE OR REPLACE FUNCTION pk_cash_entries_refund_check() RETURNS trigger LANGUAGE plpgsql AS $fn$
    DECLARE
      r record;
      s record;
    BEGIN
      IF NEW.source_type <> 'settlement_refund' THEN RETURN NEW; END IF;
      SELECT type::text AS type, status::text AS status INTO r FROM expense_requests WHERE id = NEW.expense_request_id;
      SELECT status::text AS status, settlement_type::text AS settlement_type, difference INTO s FROM settlements WHERE request_id = NEW.expense_request_id;
      IF r.type IS DISTINCT FROM 'advance' OR r.status IS DISTINCT FROM 'lpj_verified' OR s.status IS DISTINCT FROM 'verified'
         OR s.settlement_type IS DISTINCT FROM 'refund' OR NEW.amount <> s.difference THEN
        RAISE EXCEPTION 'cash_entries: LPJ refund must equal the verified LPJ surplus' USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    END
    $fn$;
    CREATE TRIGGER cash_entries_refund_check BEFORE INSERT ON cash_entries FOR EACH ROW EXECUTE FUNCTION pk_cash_entries_refund_check();
    ALTER TABLE cash_entries
      ADD CONSTRAINT cash_entries_refund_shape CHECK (source_type <> 'settlement_refund' OR (direction = 'in' AND expense_request_id IS NOT NULL));

    -- ---------------------------------------------------------------- 5. notifications
    CREATE TRIGGER notifications_protect BEFORE UPDATE ON notifications
      FOR EACH ROW EXECUTE FUNCTION pk_protect_columns('user_id', 'event', 'title', 'body', 'doc_type', 'doc_id', 'doc_no', 'read_at', 'uuid', 'created_at');
    CREATE TRIGGER settlements_uuid_immutable BEFORE UPDATE ON settlements FOR EACH ROW EXECUTE FUNCTION pk_protect_columns('uuid');
    CREATE INDEX notifications_user_unread_idx ON notifications (user_id, id DESC) WHERE read_at IS NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS notifications_user_unread_idx;
    DROP TRIGGER IF EXISTS settlements_uuid_immutable ON settlements;
    DROP TRIGGER IF EXISTS notifications_protect ON notifications;
    ALTER TABLE cash_entries DROP CONSTRAINT IF EXISTS cash_entries_refund_shape;
    DROP TRIGGER IF EXISTS cash_entries_refund_check ON cash_entries;
    DROP FUNCTION IF EXISTS pk_cash_entries_refund_check();
    DROP TRIGGER IF EXISTS settlements_protect ON settlements;
    DROP TRIGGER IF EXISTS settlements_guard ON settlements;
    DROP FUNCTION IF EXISTS pk_settlements_guard();
  `)
  // Restore the F2a bodies (copied verbatim from 20260923_133050_f2a_security.ts): the previous
  // migration's down() drops expense_requests.verified_receipts_total referenced by the F2b body.
  await db.execute(sql`
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
  `)
}
