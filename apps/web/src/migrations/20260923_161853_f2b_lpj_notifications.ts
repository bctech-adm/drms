import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_settlements_status" AS ENUM('draft', 'submitted', 'revision', 'verified', 'settled');
  CREATE TYPE "public"."enum_settlements_settlement_type" AS ENUM('none', 'refund', 'shortfall');
  CREATE TYPE "public"."enum_notifications_push_status" AS ENUM('skipped', 'pending', 'sent', 'failed');
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'reimburseAutoClose';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'reimburseAutoClose';
  CREATE TABLE "settlements" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"doc_no" varchar,
  	"request_id" integer NOT NULL,
  	"status" "enum_settlements_status" DEFAULT 'draft' NOT NULL,
  	"usage_notes" varchar,
  	"transferred_total" numeric,
  	"receipts_total" numeric,
  	"verified_receipts_total" numeric,
  	"difference" numeric,
  	"settlement_type" "enum_settlements_settlement_type",
  	"finance_notes" varchar,
  	"submit_count" numeric DEFAULT 0,
  	"submitted_at" timestamp(3) with time zone,
  	"submitted_by_id" integer,
  	"verified_at" timestamp(3) with time zone,
  	"verified_by_id" integer,
  	"settled_at" timestamp(3) with time zone,
  	"settled_by_id" integer,
  	"refund_cash_entry_id" integer,
  	"shortfall_transfer_id" integer,
  	"uuid" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "notifications" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"event" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"body" varchar NOT NULL,
  	"doc_type" varchar,
  	"doc_id" varchar,
  	"doc_no" varchar,
  	"read_at" timestamp(3) with time zone,
  	"push_status" "enum_notifications_push_status" DEFAULT 'skipped' NOT NULL,
  	"uuid" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "expense_requests" ADD COLUMN "verified_receipts_total" numeric;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "settlements_id" integer;
  ALTER TABLE "settlements" ADD CONSTRAINT "settlements_request_id_expense_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."expense_requests"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "settlements" ADD CONSTRAINT "settlements_submitted_by_id_users_id_fk" FOREIGN KEY ("submitted_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "settlements" ADD CONSTRAINT "settlements_verified_by_id_users_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "settlements" ADD CONSTRAINT "settlements_settled_by_id_users_id_fk" FOREIGN KEY ("settled_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "settlements" ADD CONSTRAINT "settlements_refund_cash_entry_id_cash_entries_id_fk" FOREIGN KEY ("refund_cash_entry_id") REFERENCES "public"."cash_entries"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "settlements" ADD CONSTRAINT "settlements_shortfall_transfer_id_transfers_id_fk" FOREIGN KEY ("shortfall_transfer_id") REFERENCES "public"."transfers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "settlements_doc_no_idx" ON "settlements" USING btree ("doc_no");
  CREATE UNIQUE INDEX "settlements_request_idx" ON "settlements" USING btree ("request_id");
  CREATE INDEX "settlements_status_idx" ON "settlements" USING btree ("status");
  CREATE INDEX "settlements_submitted_by_idx" ON "settlements" USING btree ("submitted_by_id");
  CREATE INDEX "settlements_verified_by_idx" ON "settlements" USING btree ("verified_by_id");
  CREATE INDEX "settlements_settled_by_idx" ON "settlements" USING btree ("settled_by_id");
  CREATE INDEX "settlements_refund_cash_entry_idx" ON "settlements" USING btree ("refund_cash_entry_id");
  CREATE INDEX "settlements_shortfall_transfer_idx" ON "settlements" USING btree ("shortfall_transfer_id");
  CREATE UNIQUE INDEX "settlements_uuid_idx" ON "settlements" USING btree ("uuid");
  CREATE INDEX "settlements_updated_at_idx" ON "settlements" USING btree ("updated_at");
  CREATE INDEX "settlements_created_at_idx" ON "settlements" USING btree ("created_at");
  CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");
  CREATE INDEX "notifications_event_idx" ON "notifications" USING btree ("event");
  CREATE INDEX "notifications_doc_id_idx" ON "notifications" USING btree ("doc_id");
  CREATE INDEX "notifications_read_at_idx" ON "notifications" USING btree ("read_at");
  CREATE UNIQUE INDEX "notifications_uuid_idx" ON "notifications" USING btree ("uuid");
  CREATE INDEX "notifications_updated_at_idx" ON "notifications" USING btree ("updated_at");
  CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_settlements_fk" FOREIGN KEY ("settlements_id") REFERENCES "public"."settlements"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_settlements_id_idx" ON "payload_locked_documents_rels" USING btree ("settlements_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "settlements" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "notifications" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "settlements" CASCADE;
  DROP TABLE "notifications" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_settlements_fk";
  
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'auditDailyAnchor', 'sendEmail');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'auditDailyAnchor', 'sendEmail');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "payload_locked_documents_rels_settlements_id_idx";
  ALTER TABLE "expense_requests" DROP COLUMN "verified_receipts_total";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "settlements_id";
  DROP TYPE "public"."enum_settlements_status";
  DROP TYPE "public"."enum_settlements_settlement_type";
  DROP TYPE "public"."enum_notifications_push_status";`)
}
