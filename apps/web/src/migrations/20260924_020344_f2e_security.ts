import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * F2e DB-level guard (UAT fix 5, G1 pattern of `pk_approvals_before_insert`), run as
 * <prefix>_owner. ADDITIVE / staging-safe: two new BEFORE UPDATE triggers that only look at the
 * row being changed — existing (already verified/reviewed) rows are never re-checked unless the
 * verifier / reviewer or the decision itself changes.
 *
 * - receipts: a receipt may not be marked valid/rejected (`verified_by_id`) by a user who is the
 *   creator or one of the requesters of its request (Finance self-verification).
 * - receipt_flags: a flag may not be reviewed (`reviewed_by_id`) by such a user.
 *
 * `pk_request_involves(request, user)` mirrors the domain `involvedUserIds` (creator + users whose
 * employee is a requester).
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

    CREATE OR REPLACE FUNCTION pk_request_involves(rid integer, uid integer) RETURNS boolean LANGUAGE sql STABLE AS $fn$
      SELECT EXISTS (SELECT 1 FROM expense_requests e WHERE e.id = rid AND e.created_by_id = uid)
          OR EXISTS (SELECT 1 FROM expense_requests_rels r JOIN users u ON u.employee_id = r.employees_id
                     WHERE r.parent_id = rid AND r.path = 'requesters' AND u.id = uid)
    $fn$;

    CREATE OR REPLACE FUNCTION pk_receipts_self_verify_guard() RETURNS trigger LANGUAGE plpgsql AS $fn$
    BEGIN
      IF NEW.verified_by_id IS NOT NULL AND NEW.status::text IN ('valid', 'rejected')
         AND (NEW.verified_by_id IS DISTINCT FROM OLD.verified_by_id OR NEW.status IS DISTINCT FROM OLD.status)
         AND pk_request_involves(NEW.request_id, NEW.verified_by_id) THEN
        RAISE EXCEPTION 'receipts %: requester/creator cannot verify receipts of their own request (G1)', OLD.id USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    END
    $fn$;
    CREATE TRIGGER receipts_self_verify_guard BEFORE UPDATE ON receipts FOR EACH ROW EXECUTE FUNCTION pk_receipts_self_verify_guard();

    CREATE OR REPLACE FUNCTION pk_receipt_flags_self_review_guard() RETURNS trigger LANGUAGE plpgsql AS $fn$
    BEGIN
      IF NEW.reviewed_by_id IS NOT NULL AND NEW.status::text = 'reviewed'
         AND (NEW.reviewed_by_id IS DISTINCT FROM OLD.reviewed_by_id OR NEW.status IS DISTINCT FROM OLD.status)
         AND pk_request_involves(NEW.request_id, NEW.reviewed_by_id) THEN
        RAISE EXCEPTION 'receipt_flags %: requester/creator cannot review flags of their own request (G1)', OLD.id USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    END
    $fn$;
    CREATE TRIGGER receipt_flags_self_review_guard BEFORE UPDATE ON receipt_flags FOR EACH ROW EXECUTE FUNCTION pk_receipt_flags_self_review_guard();
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TRIGGER IF EXISTS receipt_flags_self_review_guard ON receipt_flags;
    DROP FUNCTION IF EXISTS pk_receipt_flags_self_review_guard();
    DROP TRIGGER IF EXISTS receipts_self_verify_guard ON receipts;
    DROP FUNCTION IF EXISTS pk_receipts_self_verify_guard();
    DROP FUNCTION IF EXISTS pk_request_involves(integer, integer);
  `)
}
