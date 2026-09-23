import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // ADR 0006 §1 — default privileges BEFORE any table exists (spike c: they must live at the top
  // of the first Payload migration; a separate earlier migration fails because
  // payload_migrations does not exist yet). Runs as <prefix>_owner; app/ro role names are derived
  // from current_user (pk_drms_owner → pk_drms_app/pk_drms_ro, pk_drms_stg_owner → pk_drms_stg_*).
  // DELETE is never a default (explicit per table in 20260923_103219_security).
  await db.execute(sql`
    DO $pk$
    DECLARE
      owner_role text := current_user;
      app_role text := regexp_replace(current_user, '_owner$', '_app');
      ro_role text := regexp_replace(current_user, '_owner$', '_ro');
    BEGIN
      IF owner_role !~ '_owner$' THEN
        RAISE EXCEPTION 'migrations must run as the <prefix>_owner role (current_user=%)', owner_role;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
        RAISE EXCEPTION 'app role % does not exist', app_role;
      END IF;
      EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE ON TABLES TO %I', owner_role, app_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I', owner_role, app_role);
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ro_role) THEN
        EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT ON TABLES TO %I', owner_role, ro_role);
      END IF;
    END
    $pk$;
  `)
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_roles" AS ENUM('pk-staff', 'pk-pm', 'pk-finance', 'pk-owner', 'pk-admin');
  CREATE TYPE "public"."enum_employee_bank_accounts_verification_status" AS ENUM('unverified', 'verified');
  CREATE TYPE "public"."enum_projects_status" AS ENUM('perencanaan', 'berjalan', 'ditunda', 'selesai', 'arsip');
  CREATE TYPE "public"."enum_cash_accounts_kind" AS ENUM('cash', 'bank');
  CREATE TYPE "public"."enum_team_assignments_role_in_project" AS ENUM('pm', 'staff', 'mandor');
  CREATE TYPE "public"."enum_approval_rules_steps_approver_role" AS ENUM('pk-staff', 'pk-pm', 'pk-finance', 'pk-owner', 'pk-admin');
  CREATE TYPE "public"."enum_approval_rules_doc_type" AS ENUM('expense_request', 'budget_addendum');
  CREATE TYPE "public"."enum_approval_rules_request_type" AS ENUM('any', 'advance', 'reimburse');
  CREATE TYPE "public"."enum_approval_rules_acknowledge" AS ENUM('required', 'optional', 'none');
  CREATE TYPE "public"."enum_approval_rules_acknowledge_role" AS ENUM('pk-staff', 'pk-pm', 'pk-finance', 'pk-owner', 'pk-admin');
  CREATE TYPE "public"."enum_notification_templates_channel" AS ENUM('push', 'inapp', 'both');
  CREATE TYPE "public"."enum_cost_centers_type" AS ENUM('operational', 'department');
  CREATE TYPE "public"."enum_document_sequences_doc_type" AS ENUM('expense_request', 'transfer', 'settlement', 'cash_in', 'cash_out', 'progress_report', 'budget_addendum', 'reversal');
  CREATE TYPE "public"."enum_document_sequences_reset_policy" AS ENUM('never', 'yearly', 'monthly');
  CREATE TYPE "public"."enum_devices_platform" AS ENUM('android');
  CREATE TYPE "public"."enum_devices_status" AS ENUM('active', 'revoked', 'lost');
  CREATE TYPE "public"."enum_audit_logs_action" AS ENUM('create', 'update', 'status_change', 'deactivate', 'reactivate', 'delete_attempt', 'void', 'view_sensitive', 'login', 'logout', 'login_failed', 'session_revoked', 'role_change', 'role_sync', 'device_register', 'device_revoke', 'number_issued', 'export', 'print', 'sign', 'acknowledge', 'flag_raised', 'flag_reviewed', 'sync_odoo', 'sync_offline', 'period_close', 'period_reopen', 'schema_maintenance');
  CREATE TYPE "public"."enum_audit_logs_source" AS ENUM('web', 'apk', 'system', 'job');
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'auditDailyAnchor');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'auditDailyAnchor');
  CREATE TABLE "users_roles" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_users_roles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"name" varchar,
  	"employee_id" integer,
  	"phone" varchar,
  	"signature_id" integer,
  	"keycloak_sub" varchar,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "employees" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"nickname" varchar,
  	"position" varchar,
  	"phone" varchar,
  	"face_ref_photo_id" integer,
  	"odoo_employee_ref" varchar,
  	"active" boolean DEFAULT true,
  	"uuid" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "employee_bank_accounts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"employee_id" integer NOT NULL,
  	"bank_id" integer NOT NULL,
  	"account_no" varchar NOT NULL,
  	"account_holder" varchar NOT NULL,
  	"label" varchar,
  	"is_default" boolean DEFAULT false,
  	"verification_status" "enum_employee_bank_accounts_verification_status" DEFAULT 'unverified' NOT NULL,
  	"active" boolean DEFAULT true,
  	"uuid" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "banks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"active" boolean DEFAULT true,
  	"uuid" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "clients" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"contact" varchar,
  	"phone" varchar,
  	"address" varchar,
  	"odoo_partner_ref" varchar,
  	"active" boolean DEFAULT true,
  	"uuid" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "vendors" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"contact" varchar,
  	"npwp" varchar,
  	"address" varchar,
  	"odoo_partner_ref" varchar,
  	"active" boolean DEFAULT true,
  	"uuid" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "projects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"client_id" integer,
  	"address" varchar,
  	"lat" numeric,
  	"lng" numeric,
  	"radius_m" numeric,
  	"pm_id" integer,
  	"budget" numeric,
  	"start_date" timestamp(3) with time zone,
  	"target_date" timestamp(3) with time zone,
  	"status" "enum_projects_status" DEFAULT 'perencanaan' NOT NULL,
  	"odoo_analytic_ref" varchar,
  	"uuid" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "project_stages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"project_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"weight_pct" numeric,
  	"sequence" numeric NOT NULL,
  	"progress_pct" numeric DEFAULT 0,
  	"uuid" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "stage_templates_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"weight_pct" numeric NOT NULL,
  	"sequence" numeric NOT NULL
  );
  
  CREATE TABLE "stage_templates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "budget_lines" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"project_id" integer NOT NULL,
  	"category_id" integer NOT NULL,
  	"amount" numeric NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "expense_categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"coa_code" varchar,
  	"default_uom_id" integer,
  	"requires_vehicle" boolean DEFAULT false,
  	"active" boolean DEFAULT true,
  	"uuid" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "expense_categories_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"uoms_id" integer
  );
  
  CREATE TABLE "cash_in_sources" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"coa_code" varchar,
  	"active" boolean DEFAULT true,
  	"uuid" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cash_accounts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"kind" "enum_cash_accounts_kind" DEFAULT 'bank' NOT NULL,
  	"bank_id" integer,
  	"account_no" varchar,
  	"account_holder" varchar,
  	"opening_balance" numeric,
  	"odoo_journal_code" varchar,
  	"active" boolean DEFAULT true,
  	"uuid" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "team_assignments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"employee_id" integer NOT NULL,
  	"project_id" integer,
  	"cost_center_id" integer,
  	"role_in_project" "enum_team_assignments_role_in_project" DEFAULT 'staff' NOT NULL,
  	"start_date" timestamp(3) with time zone,
  	"end_date" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "work_schedules" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"start_time" varchar NOT NULL,
  	"end_time" varchar NOT NULL,
  	"late_tolerance_min" numeric DEFAULT 15,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "holidays" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"date" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "approval_rules_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"level" numeric NOT NULL,
  	"approver_role" "enum_approval_rules_steps_approver_role",
  	"approver_user_id" integer
  );
  
  CREATE TABLE "approval_rules" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"doc_type" "enum_approval_rules_doc_type" DEFAULT 'expense_request' NOT NULL,
  	"request_type" "enum_approval_rules_request_type" DEFAULT 'any' NOT NULL,
  	"min_amount" numeric NOT NULL,
  	"max_amount" numeric,
  	"category_id" integer,
  	"project_id" integer,
  	"cost_center_id" integer,
  	"priority" numeric DEFAULT 100,
  	"acknowledge" "enum_approval_rules_acknowledge" DEFAULT 'optional' NOT NULL,
  	"acknowledge_role" "enum_approval_rules_acknowledge_role",
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "notification_templates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"body" varchar NOT NULL,
  	"channel" "enum_notification_templates_channel" DEFAULT 'both' NOT NULL,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "uoms" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"category" varchar,
  	"odoo_uom_ref" varchar,
  	"active" boolean DEFAULT true,
  	"uuid" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "vehicles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"plate_no" varchar NOT NULL,
  	"plate_display" varchar,
  	"type" varchar NOT NULL,
  	"brand_model" varchar,
  	"cost_center_id" integer,
  	"project_id" integer,
  	"odoo_fleet_ref" varchar,
  	"active" boolean DEFAULT true,
  	"uuid" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cost_centers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"type" "enum_cost_centers_type" DEFAULT 'operational' NOT NULL,
  	"manager_id" integer,
  	"odoo_analytic_ref" varchar,
  	"active" boolean DEFAULT true,
  	"uuid" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "document_sequences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"doc_type" "enum_document_sequences_doc_type" NOT NULL,
  	"doc_code" varchar NOT NULL,
  	"pattern" varchar NOT NULL,
  	"reset_policy" "enum_document_sequences_reset_policy" DEFAULT 'monthly' NOT NULL,
  	"padding" numeric DEFAULT 4 NOT NULL,
  	"start_at" numeric DEFAULT 1 NOT NULL,
  	"timezone" varchar DEFAULT 'Asia/Makassar' NOT NULL,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "devices" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"device_id" varchar NOT NULL,
  	"user_id" integer NOT NULL,
  	"platform" "enum_devices_platform" DEFAULT 'android' NOT NULL,
  	"model" varchar,
  	"app_version" varchar,
  	"fcm_token" varchar,
  	"keycloak_sid" varchar,
  	"status" "enum_devices_status" DEFAULT 'active' NOT NULL,
  	"revoke_reason" varchar,
  	"registered_at" timestamp(3) with time zone,
  	"last_seen_at" timestamp(3) with time zone,
  	"revoked_at" timestamp(3) with time zone,
  	"revoked_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "web_sessions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"id_hash" varchar NOT NULL,
  	"user_id" integer NOT NULL,
  	"keycloak_sid" varchar,
  	"id_token_hint" varchar,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"revoked_at" timestamp(3) with time zone,
  	"revoke_reason" varchar,
  	"ip" varchar,
  	"user_agent" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "audit_logs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"server_time" timestamp(3) with time zone,
  	"event_id" varchar NOT NULL,
  	"tx_id" numeric,
  	"request_id" varchar,
  	"doc_type" varchar NOT NULL,
  	"doc_id" varchar,
  	"doc_no" varchar,
  	"action" "enum_audit_logs_action" NOT NULL,
  	"field" varchar,
  	"line_no" numeric,
  	"old_value" jsonb,
  	"new_value" jsonb,
  	"status_from" varchar,
  	"status_to" varchar,
  	"reason" varchar,
  	"user_id" numeric,
  	"user_roles" varchar,
  	"source" "enum_audit_logs_source",
  	"app_version" varchar,
  	"ip" varchar,
  	"device_id" varchar,
  	"lat" numeric,
  	"lng" numeric,
  	"device_time" timestamp(3) with time zone
  );
  
  CREATE TABLE "media_receipts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"uploaded_by_id" integer,
  	"received_at" timestamp(3) with time zone,
  	"owner_doc_type" varchar,
  	"owner_doc_id" varchar,
  	"sha256_original" varchar,
  	"original_width" numeric,
  	"original_height" numeric,
  	"original_size" numeric,
  	"captured_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumb_url" varchar,
  	"sizes_thumb_width" numeric,
  	"sizes_thumb_height" numeric,
  	"sizes_thumb_mime_type" varchar,
  	"sizes_thumb_filesize" numeric,
  	"sizes_thumb_filename" varchar
  );
  
  CREATE TABLE "media_transfer_proofs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"uploaded_by_id" integer,
  	"received_at" timestamp(3) with time zone,
  	"owner_doc_type" varchar,
  	"owner_doc_id" varchar,
  	"sha256_original" varchar,
  	"original_width" numeric,
  	"original_height" numeric,
  	"original_size" numeric,
  	"captured_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumb_url" varchar,
  	"sizes_thumb_width" numeric,
  	"sizes_thumb_height" numeric,
  	"sizes_thumb_mime_type" varchar,
  	"sizes_thumb_filesize" numeric,
  	"sizes_thumb_filename" varchar
  );
  
  CREATE TABLE "media_selfies" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"uploaded_by_id" integer,
  	"received_at" timestamp(3) with time zone,
  	"owner_doc_type" varchar,
  	"owner_doc_id" varchar,
  	"sha256_original" varchar,
  	"original_width" numeric,
  	"original_height" numeric,
  	"original_size" numeric,
  	"captured_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "media_progress_photos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"uploaded_by_id" integer,
  	"received_at" timestamp(3) with time zone,
  	"owner_doc_type" varchar,
  	"owner_doc_id" varchar,
  	"sha256_original" varchar,
  	"original_width" numeric,
  	"original_height" numeric,
  	"original_size" numeric,
  	"captured_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumb_url" varchar,
  	"sizes_thumb_width" numeric,
  	"sizes_thumb_height" numeric,
  	"sizes_thumb_mime_type" varchar,
  	"sizes_thumb_filesize" numeric,
  	"sizes_thumb_filename" varchar
  );
  
  CREATE TABLE "media_signatures" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"uploaded_by_id" integer,
  	"received_at" timestamp(3) with time zone,
  	"owner_doc_type" varchar,
  	"owner_doc_id" varchar,
  	"sha256_original" varchar,
  	"original_width" numeric,
  	"original_height" numeric,
  	"original_size" numeric,
  	"captured_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "media_company" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"uploaded_by_id" integer,
  	"received_at" timestamp(3) with time zone,
  	"owner_doc_type" varchar,
  	"owner_doc_id" varchar,
  	"sha256_original" varchar,
  	"original_width" numeric,
  	"original_height" numeric,
  	"original_size" numeric,
  	"captured_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "media_attachments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"uploaded_by_id" integer,
  	"received_at" timestamp(3) with time zone,
  	"owner_doc_type" varchar,
  	"owner_doc_id" varchar,
  	"sha256_original" varchar,
  	"original_width" numeric,
  	"original_height" numeric,
  	"original_size" numeric,
  	"captured_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumb_url" varchar,
  	"sizes_thumb_width" numeric,
  	"sizes_thumb_height" numeric,
  	"sizes_thumb_mime_type" varchar,
  	"sizes_thumb_filesize" numeric,
  	"sizes_thumb_filename" varchar
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"meta" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"employees_id" integer,
  	"employee_bank_accounts_id" integer,
  	"banks_id" integer,
  	"clients_id" integer,
  	"vendors_id" integer,
  	"projects_id" integer,
  	"project_stages_id" integer,
  	"stage_templates_id" integer,
  	"budget_lines_id" integer,
  	"expense_categories_id" integer,
  	"cash_in_sources_id" integer,
  	"cash_accounts_id" integer,
  	"team_assignments_id" integer,
  	"work_schedules_id" integer,
  	"holidays_id" integer,
  	"approval_rules_id" integer,
  	"notification_templates_id" integer,
  	"uoms_id" integer,
  	"vehicles_id" integer,
  	"cost_centers_id" integer,
  	"document_sequences_id" integer,
  	"devices_id" integer,
  	"media_receipts_id" integer,
  	"media_transfer_proofs_id" integer,
  	"media_selfies_id" integer,
  	"media_progress_photos_id" integer,
  	"media_signatures_id" integer,
  	"media_company_id" integer,
  	"media_attachments_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "company_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar DEFAULT 'PT Double Rezki Makmur Sejahtera' NOT NULL,
  	"short_code" varchar DEFAULT 'DRMS' NOT NULL,
  	"logo_id" integer,
  	"pdf_header" varchar,
  	"address" varchar,
  	"phone" varchar,
  	"timezone" varchar DEFAULT 'Asia/Makassar' NOT NULL,
  	"default_geofence_radius_m" numeric DEFAULT 100 NOT NULL,
  	"late_report_days" numeric DEFAULT 3 NOT NULL,
  	"budget_warn_pct" numeric DEFAULT 85 NOT NULL,
  	"budget_over_pct" numeric DEFAULT 100 NOT NULL,
  	"progress_warn_gap_pct" numeric DEFAULT 0 NOT NULL,
  	"progress_bad_gap_pct" numeric DEFAULT 8 NOT NULL,
  	"receipt_rounding_tolerance" numeric DEFAULT 1000 NOT NULL,
  	"receipt_max_age_days" numeric DEFAULT 30 NOT NULL,
  	"reimburse_auto_close_days" numeric DEFAULT 30 NOT NULL,
  	"min_app_version" varchar,
  	"offline_max_age_days" numeric DEFAULT 30 NOT NULL,
  	"image_targets_receipts_max_px" numeric DEFAULT 2000 NOT NULL,
  	"image_targets_selfies_max_px" numeric DEFAULT 720 NOT NULL,
  	"image_targets_transfer_proofs_max_px" numeric DEFAULT 1600 NOT NULL,
  	"image_targets_progress_photos_max_px" numeric DEFAULT 1600 NOT NULL,
  	"image_targets_jpeg_quality" numeric DEFAULT 80 NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_jobs_stats" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"stats" jsonb,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users_roles" ADD CONSTRAINT "users_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_signature_id_media_signatures_id_fk" FOREIGN KEY ("signature_id") REFERENCES "public"."media_signatures"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "employees" ADD CONSTRAINT "employees_face_ref_photo_id_media_selfies_id_fk" FOREIGN KEY ("face_ref_photo_id") REFERENCES "public"."media_selfies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "employee_bank_accounts" ADD CONSTRAINT "employee_bank_accounts_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "employee_bank_accounts" ADD CONSTRAINT "employee_bank_accounts_bank_id_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."banks"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects" ADD CONSTRAINT "projects_pm_id_users_id_fk" FOREIGN KEY ("pm_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "project_stages" ADD CONSTRAINT "project_stages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stage_templates_items" ADD CONSTRAINT "stage_templates_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."stage_templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_default_uom_id_uoms_id_fk" FOREIGN KEY ("default_uom_id") REFERENCES "public"."uoms"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "expense_categories_rels" ADD CONSTRAINT "expense_categories_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."expense_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "expense_categories_rels" ADD CONSTRAINT "expense_categories_rels_uoms_fk" FOREIGN KEY ("uoms_id") REFERENCES "public"."uoms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cash_accounts" ADD CONSTRAINT "cash_accounts_bank_id_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."banks"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "team_assignments" ADD CONSTRAINT "team_assignments_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "approval_rules_steps" ADD CONSTRAINT "approval_rules_steps_approver_user_id_users_id_fk" FOREIGN KEY ("approver_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "approval_rules_steps" ADD CONSTRAINT "approval_rules_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."approval_rules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "approval_rules" ADD CONSTRAINT "approval_rules_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "approval_rules" ADD CONSTRAINT "approval_rules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "approval_rules" ADD CONSTRAINT "approval_rules_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "devices" ADD CONSTRAINT "devices_revoked_by_id_users_id_fk" FOREIGN KEY ("revoked_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "web_sessions" ADD CONSTRAINT "web_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_receipts" ADD CONSTRAINT "media_receipts_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_transfer_proofs" ADD CONSTRAINT "media_transfer_proofs_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_selfies" ADD CONSTRAINT "media_selfies_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_progress_photos" ADD CONSTRAINT "media_progress_photos_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_signatures" ADD CONSTRAINT "media_signatures_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_company" ADD CONSTRAINT "media_company_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_attachments" ADD CONSTRAINT "media_attachments_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_employees_fk" FOREIGN KEY ("employees_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_employee_bank_accounts_fk" FOREIGN KEY ("employee_bank_accounts_id") REFERENCES "public"."employee_bank_accounts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_banks_fk" FOREIGN KEY ("banks_id") REFERENCES "public"."banks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_clients_fk" FOREIGN KEY ("clients_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vendors_fk" FOREIGN KEY ("vendors_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_projects_fk" FOREIGN KEY ("projects_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_project_stages_fk" FOREIGN KEY ("project_stages_id") REFERENCES "public"."project_stages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stage_templates_fk" FOREIGN KEY ("stage_templates_id") REFERENCES "public"."stage_templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_budget_lines_fk" FOREIGN KEY ("budget_lines_id") REFERENCES "public"."budget_lines"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_expense_categories_fk" FOREIGN KEY ("expense_categories_id") REFERENCES "public"."expense_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cash_in_sources_fk" FOREIGN KEY ("cash_in_sources_id") REFERENCES "public"."cash_in_sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cash_accounts_fk" FOREIGN KEY ("cash_accounts_id") REFERENCES "public"."cash_accounts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_team_assignments_fk" FOREIGN KEY ("team_assignments_id") REFERENCES "public"."team_assignments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_work_schedules_fk" FOREIGN KEY ("work_schedules_id") REFERENCES "public"."work_schedules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_holidays_fk" FOREIGN KEY ("holidays_id") REFERENCES "public"."holidays"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_approval_rules_fk" FOREIGN KEY ("approval_rules_id") REFERENCES "public"."approval_rules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_notification_templates_fk" FOREIGN KEY ("notification_templates_id") REFERENCES "public"."notification_templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_uoms_fk" FOREIGN KEY ("uoms_id") REFERENCES "public"."uoms"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vehicles_fk" FOREIGN KEY ("vehicles_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cost_centers_fk" FOREIGN KEY ("cost_centers_id") REFERENCES "public"."cost_centers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_document_sequences_fk" FOREIGN KEY ("document_sequences_id") REFERENCES "public"."document_sequences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_devices_fk" FOREIGN KEY ("devices_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_receipts_fk" FOREIGN KEY ("media_receipts_id") REFERENCES "public"."media_receipts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_transfer_proofs_fk" FOREIGN KEY ("media_transfer_proofs_id") REFERENCES "public"."media_transfer_proofs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_selfies_fk" FOREIGN KEY ("media_selfies_id") REFERENCES "public"."media_selfies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_progress_photos_fk" FOREIGN KEY ("media_progress_photos_id") REFERENCES "public"."media_progress_photos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_signatures_fk" FOREIGN KEY ("media_signatures_id") REFERENCES "public"."media_signatures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_company_fk" FOREIGN KEY ("media_company_id") REFERENCES "public"."media_company"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_attachments_fk" FOREIGN KEY ("media_attachments_id") REFERENCES "public"."media_attachments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_logo_id_media_company_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media_company"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "users_roles_order_idx" ON "users_roles" USING btree ("order");
  CREATE INDEX "users_roles_parent_idx" ON "users_roles" USING btree ("parent_id");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "users_employee_idx" ON "users" USING btree ("employee_id");
  CREATE INDEX "users_signature_idx" ON "users" USING btree ("signature_id");
  CREATE UNIQUE INDEX "users_keycloak_sub_idx" ON "users" USING btree ("keycloak_sub");
  CREATE INDEX "users_active_idx" ON "users" USING btree ("active");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "employees_code_idx" ON "employees" USING btree ("code");
  CREATE INDEX "employees_face_ref_photo_idx" ON "employees" USING btree ("face_ref_photo_id");
  CREATE INDEX "employees_active_idx" ON "employees" USING btree ("active");
  CREATE UNIQUE INDEX "employees_uuid_idx" ON "employees" USING btree ("uuid");
  CREATE INDEX "employees_updated_at_idx" ON "employees" USING btree ("updated_at");
  CREATE INDEX "employees_created_at_idx" ON "employees" USING btree ("created_at");
  CREATE INDEX "employee_bank_accounts_employee_idx" ON "employee_bank_accounts" USING btree ("employee_id");
  CREATE INDEX "employee_bank_accounts_bank_idx" ON "employee_bank_accounts" USING btree ("bank_id");
  CREATE INDEX "employee_bank_accounts_active_idx" ON "employee_bank_accounts" USING btree ("active");
  CREATE UNIQUE INDEX "employee_bank_accounts_uuid_idx" ON "employee_bank_accounts" USING btree ("uuid");
  CREATE INDEX "employee_bank_accounts_updated_at_idx" ON "employee_bank_accounts" USING btree ("updated_at");
  CREATE INDEX "employee_bank_accounts_created_at_idx" ON "employee_bank_accounts" USING btree ("created_at");
  CREATE UNIQUE INDEX "banks_code_idx" ON "banks" USING btree ("code");
  CREATE INDEX "banks_active_idx" ON "banks" USING btree ("active");
  CREATE UNIQUE INDEX "banks_uuid_idx" ON "banks" USING btree ("uuid");
  CREATE INDEX "banks_updated_at_idx" ON "banks" USING btree ("updated_at");
  CREATE INDEX "banks_created_at_idx" ON "banks" USING btree ("created_at");
  CREATE INDEX "clients_active_idx" ON "clients" USING btree ("active");
  CREATE UNIQUE INDEX "clients_uuid_idx" ON "clients" USING btree ("uuid");
  CREATE INDEX "clients_updated_at_idx" ON "clients" USING btree ("updated_at");
  CREATE INDEX "clients_created_at_idx" ON "clients" USING btree ("created_at");
  CREATE INDEX "vendors_active_idx" ON "vendors" USING btree ("active");
  CREATE UNIQUE INDEX "vendors_uuid_idx" ON "vendors" USING btree ("uuid");
  CREATE INDEX "vendors_updated_at_idx" ON "vendors" USING btree ("updated_at");
  CREATE INDEX "vendors_created_at_idx" ON "vendors" USING btree ("created_at");
  CREATE UNIQUE INDEX "projects_code_idx" ON "projects" USING btree ("code");
  CREATE INDEX "projects_client_idx" ON "projects" USING btree ("client_id");
  CREATE INDEX "projects_pm_idx" ON "projects" USING btree ("pm_id");
  CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");
  CREATE UNIQUE INDEX "projects_uuid_idx" ON "projects" USING btree ("uuid");
  CREATE INDEX "projects_updated_at_idx" ON "projects" USING btree ("updated_at");
  CREATE INDEX "projects_created_at_idx" ON "projects" USING btree ("created_at");
  CREATE INDEX "project_stages_project_idx" ON "project_stages" USING btree ("project_id");
  CREATE UNIQUE INDEX "project_stages_uuid_idx" ON "project_stages" USING btree ("uuid");
  CREATE INDEX "project_stages_updated_at_idx" ON "project_stages" USING btree ("updated_at");
  CREATE INDEX "project_stages_created_at_idx" ON "project_stages" USING btree ("created_at");
  CREATE INDEX "stage_templates_items_order_idx" ON "stage_templates_items" USING btree ("_order");
  CREATE INDEX "stage_templates_items_parent_id_idx" ON "stage_templates_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "stage_templates_name_idx" ON "stage_templates" USING btree ("name");
  CREATE INDEX "stage_templates_active_idx" ON "stage_templates" USING btree ("active");
  CREATE INDEX "stage_templates_updated_at_idx" ON "stage_templates" USING btree ("updated_at");
  CREATE INDEX "stage_templates_created_at_idx" ON "stage_templates" USING btree ("created_at");
  CREATE INDEX "budget_lines_project_idx" ON "budget_lines" USING btree ("project_id");
  CREATE INDEX "budget_lines_category_idx" ON "budget_lines" USING btree ("category_id");
  CREATE INDEX "budget_lines_updated_at_idx" ON "budget_lines" USING btree ("updated_at");
  CREATE INDEX "budget_lines_created_at_idx" ON "budget_lines" USING btree ("created_at");
  CREATE UNIQUE INDEX "project_category_idx" ON "budget_lines" USING btree ("project_id","category_id");
  CREATE UNIQUE INDEX "expense_categories_code_idx" ON "expense_categories" USING btree ("code");
  CREATE INDEX "expense_categories_default_uom_idx" ON "expense_categories" USING btree ("default_uom_id");
  CREATE INDEX "expense_categories_active_idx" ON "expense_categories" USING btree ("active");
  CREATE UNIQUE INDEX "expense_categories_uuid_idx" ON "expense_categories" USING btree ("uuid");
  CREATE INDEX "expense_categories_updated_at_idx" ON "expense_categories" USING btree ("updated_at");
  CREATE INDEX "expense_categories_created_at_idx" ON "expense_categories" USING btree ("created_at");
  CREATE INDEX "expense_categories_rels_order_idx" ON "expense_categories_rels" USING btree ("order");
  CREATE INDEX "expense_categories_rels_parent_idx" ON "expense_categories_rels" USING btree ("parent_id");
  CREATE INDEX "expense_categories_rels_path_idx" ON "expense_categories_rels" USING btree ("path");
  CREATE INDEX "expense_categories_rels_uoms_id_idx" ON "expense_categories_rels" USING btree ("uoms_id");
  CREATE UNIQUE INDEX "cash_in_sources_code_idx" ON "cash_in_sources" USING btree ("code");
  CREATE INDEX "cash_in_sources_active_idx" ON "cash_in_sources" USING btree ("active");
  CREATE UNIQUE INDEX "cash_in_sources_uuid_idx" ON "cash_in_sources" USING btree ("uuid");
  CREATE INDEX "cash_in_sources_updated_at_idx" ON "cash_in_sources" USING btree ("updated_at");
  CREATE INDEX "cash_in_sources_created_at_idx" ON "cash_in_sources" USING btree ("created_at");
  CREATE UNIQUE INDEX "cash_accounts_name_idx" ON "cash_accounts" USING btree ("name");
  CREATE INDEX "cash_accounts_bank_idx" ON "cash_accounts" USING btree ("bank_id");
  CREATE INDEX "cash_accounts_active_idx" ON "cash_accounts" USING btree ("active");
  CREATE UNIQUE INDEX "cash_accounts_uuid_idx" ON "cash_accounts" USING btree ("uuid");
  CREATE INDEX "cash_accounts_updated_at_idx" ON "cash_accounts" USING btree ("updated_at");
  CREATE INDEX "cash_accounts_created_at_idx" ON "cash_accounts" USING btree ("created_at");
  CREATE INDEX "team_assignments_employee_idx" ON "team_assignments" USING btree ("employee_id");
  CREATE INDEX "team_assignments_project_idx" ON "team_assignments" USING btree ("project_id");
  CREATE INDEX "team_assignments_cost_center_idx" ON "team_assignments" USING btree ("cost_center_id");
  CREATE INDEX "team_assignments_updated_at_idx" ON "team_assignments" USING btree ("updated_at");
  CREATE INDEX "team_assignments_created_at_idx" ON "team_assignments" USING btree ("created_at");
  CREATE UNIQUE INDEX "work_schedules_name_idx" ON "work_schedules" USING btree ("name");
  CREATE INDEX "work_schedules_active_idx" ON "work_schedules" USING btree ("active");
  CREATE INDEX "work_schedules_updated_at_idx" ON "work_schedules" USING btree ("updated_at");
  CREATE INDEX "work_schedules_created_at_idx" ON "work_schedules" USING btree ("created_at");
  CREATE UNIQUE INDEX "holidays_date_idx" ON "holidays" USING btree ("date");
  CREATE INDEX "holidays_updated_at_idx" ON "holidays" USING btree ("updated_at");
  CREATE INDEX "holidays_created_at_idx" ON "holidays" USING btree ("created_at");
  CREATE INDEX "approval_rules_steps_order_idx" ON "approval_rules_steps" USING btree ("_order");
  CREATE INDEX "approval_rules_steps_parent_id_idx" ON "approval_rules_steps" USING btree ("_parent_id");
  CREATE INDEX "approval_rules_steps_approver_user_idx" ON "approval_rules_steps" USING btree ("approver_user_id");
  CREATE INDEX "approval_rules_category_idx" ON "approval_rules" USING btree ("category_id");
  CREATE INDEX "approval_rules_project_idx" ON "approval_rules" USING btree ("project_id");
  CREATE INDEX "approval_rules_cost_center_idx" ON "approval_rules" USING btree ("cost_center_id");
  CREATE INDEX "approval_rules_active_idx" ON "approval_rules" USING btree ("active");
  CREATE INDEX "approval_rules_updated_at_idx" ON "approval_rules" USING btree ("updated_at");
  CREATE INDEX "approval_rules_created_at_idx" ON "approval_rules" USING btree ("created_at");
  CREATE UNIQUE INDEX "notification_templates_event_idx" ON "notification_templates" USING btree ("event");
  CREATE INDEX "notification_templates_active_idx" ON "notification_templates" USING btree ("active");
  CREATE INDEX "notification_templates_updated_at_idx" ON "notification_templates" USING btree ("updated_at");
  CREATE INDEX "notification_templates_created_at_idx" ON "notification_templates" USING btree ("created_at");
  CREATE UNIQUE INDEX "uoms_code_idx" ON "uoms" USING btree ("code");
  CREATE INDEX "uoms_active_idx" ON "uoms" USING btree ("active");
  CREATE UNIQUE INDEX "uoms_uuid_idx" ON "uoms" USING btree ("uuid");
  CREATE INDEX "uoms_updated_at_idx" ON "uoms" USING btree ("updated_at");
  CREATE INDEX "uoms_created_at_idx" ON "uoms" USING btree ("created_at");
  CREATE UNIQUE INDEX "vehicles_plate_no_idx" ON "vehicles" USING btree ("plate_no");
  CREATE INDEX "vehicles_cost_center_idx" ON "vehicles" USING btree ("cost_center_id");
  CREATE INDEX "vehicles_project_idx" ON "vehicles" USING btree ("project_id");
  CREATE INDEX "vehicles_active_idx" ON "vehicles" USING btree ("active");
  CREATE UNIQUE INDEX "vehicles_uuid_idx" ON "vehicles" USING btree ("uuid");
  CREATE INDEX "vehicles_updated_at_idx" ON "vehicles" USING btree ("updated_at");
  CREATE INDEX "vehicles_created_at_idx" ON "vehicles" USING btree ("created_at");
  CREATE UNIQUE INDEX "cost_centers_code_idx" ON "cost_centers" USING btree ("code");
  CREATE INDEX "cost_centers_manager_idx" ON "cost_centers" USING btree ("manager_id");
  CREATE INDEX "cost_centers_active_idx" ON "cost_centers" USING btree ("active");
  CREATE UNIQUE INDEX "cost_centers_uuid_idx" ON "cost_centers" USING btree ("uuid");
  CREATE INDEX "cost_centers_updated_at_idx" ON "cost_centers" USING btree ("updated_at");
  CREATE INDEX "cost_centers_created_at_idx" ON "cost_centers" USING btree ("created_at");
  CREATE UNIQUE INDEX "document_sequences_doc_type_idx" ON "document_sequences" USING btree ("doc_type");
  CREATE INDEX "document_sequences_active_idx" ON "document_sequences" USING btree ("active");
  CREATE INDEX "document_sequences_updated_at_idx" ON "document_sequences" USING btree ("updated_at");
  CREATE INDEX "document_sequences_created_at_idx" ON "document_sequences" USING btree ("created_at");
  CREATE UNIQUE INDEX "devices_device_id_idx" ON "devices" USING btree ("device_id");
  CREATE INDEX "devices_user_idx" ON "devices" USING btree ("user_id");
  CREATE INDEX "devices_keycloak_sid_idx" ON "devices" USING btree ("keycloak_sid");
  CREATE INDEX "devices_status_idx" ON "devices" USING btree ("status");
  CREATE INDEX "devices_revoked_by_idx" ON "devices" USING btree ("revoked_by_id");
  CREATE INDEX "devices_updated_at_idx" ON "devices" USING btree ("updated_at");
  CREATE INDEX "devices_created_at_idx" ON "devices" USING btree ("created_at");
  CREATE UNIQUE INDEX "web_sessions_id_hash_idx" ON "web_sessions" USING btree ("id_hash");
  CREATE INDEX "web_sessions_user_idx" ON "web_sessions" USING btree ("user_id");
  CREATE INDEX "web_sessions_keycloak_sid_idx" ON "web_sessions" USING btree ("keycloak_sid");
  CREATE INDEX "web_sessions_updated_at_idx" ON "web_sessions" USING btree ("updated_at");
  CREATE INDEX "web_sessions_created_at_idx" ON "web_sessions" USING btree ("created_at");
  CREATE INDEX "audit_logs_server_time_idx" ON "audit_logs" USING btree ("server_time");
  CREATE INDEX "audit_logs_event_id_idx" ON "audit_logs" USING btree ("event_id");
  CREATE INDEX "audit_logs_doc_no_idx" ON "audit_logs" USING btree ("doc_no");
  CREATE INDEX "media_receipts_uploaded_by_idx" ON "media_receipts" USING btree ("uploaded_by_id");
  CREATE INDEX "media_receipts_owner_doc_type_idx" ON "media_receipts" USING btree ("owner_doc_type");
  CREATE INDEX "media_receipts_owner_doc_id_idx" ON "media_receipts" USING btree ("owner_doc_id");
  CREATE INDEX "media_receipts_sha256_original_idx" ON "media_receipts" USING btree ("sha256_original");
  CREATE INDEX "media_receipts_updated_at_idx" ON "media_receipts" USING btree ("updated_at");
  CREATE INDEX "media_receipts_created_at_idx" ON "media_receipts" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_receipts_filename_idx" ON "media_receipts" USING btree ("filename");
  CREATE INDEX "media_receipts_sizes_thumb_sizes_thumb_filename_idx" ON "media_receipts" USING btree ("sizes_thumb_filename");
  CREATE INDEX "media_transfer_proofs_uploaded_by_idx" ON "media_transfer_proofs" USING btree ("uploaded_by_id");
  CREATE INDEX "media_transfer_proofs_owner_doc_type_idx" ON "media_transfer_proofs" USING btree ("owner_doc_type");
  CREATE INDEX "media_transfer_proofs_owner_doc_id_idx" ON "media_transfer_proofs" USING btree ("owner_doc_id");
  CREATE INDEX "media_transfer_proofs_sha256_original_idx" ON "media_transfer_proofs" USING btree ("sha256_original");
  CREATE INDEX "media_transfer_proofs_updated_at_idx" ON "media_transfer_proofs" USING btree ("updated_at");
  CREATE INDEX "media_transfer_proofs_created_at_idx" ON "media_transfer_proofs" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_transfer_proofs_filename_idx" ON "media_transfer_proofs" USING btree ("filename");
  CREATE INDEX "media_transfer_proofs_sizes_thumb_sizes_thumb_filename_idx" ON "media_transfer_proofs" USING btree ("sizes_thumb_filename");
  CREATE INDEX "media_selfies_uploaded_by_idx" ON "media_selfies" USING btree ("uploaded_by_id");
  CREATE INDEX "media_selfies_owner_doc_type_idx" ON "media_selfies" USING btree ("owner_doc_type");
  CREATE INDEX "media_selfies_owner_doc_id_idx" ON "media_selfies" USING btree ("owner_doc_id");
  CREATE INDEX "media_selfies_sha256_original_idx" ON "media_selfies" USING btree ("sha256_original");
  CREATE INDEX "media_selfies_updated_at_idx" ON "media_selfies" USING btree ("updated_at");
  CREATE INDEX "media_selfies_created_at_idx" ON "media_selfies" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_selfies_filename_idx" ON "media_selfies" USING btree ("filename");
  CREATE INDEX "media_progress_photos_uploaded_by_idx" ON "media_progress_photos" USING btree ("uploaded_by_id");
  CREATE INDEX "media_progress_photos_owner_doc_type_idx" ON "media_progress_photos" USING btree ("owner_doc_type");
  CREATE INDEX "media_progress_photos_owner_doc_id_idx" ON "media_progress_photos" USING btree ("owner_doc_id");
  CREATE INDEX "media_progress_photos_sha256_original_idx" ON "media_progress_photos" USING btree ("sha256_original");
  CREATE INDEX "media_progress_photos_updated_at_idx" ON "media_progress_photos" USING btree ("updated_at");
  CREATE INDEX "media_progress_photos_created_at_idx" ON "media_progress_photos" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_progress_photos_filename_idx" ON "media_progress_photos" USING btree ("filename");
  CREATE INDEX "media_progress_photos_sizes_thumb_sizes_thumb_filename_idx" ON "media_progress_photos" USING btree ("sizes_thumb_filename");
  CREATE INDEX "media_signatures_uploaded_by_idx" ON "media_signatures" USING btree ("uploaded_by_id");
  CREATE INDEX "media_signatures_owner_doc_type_idx" ON "media_signatures" USING btree ("owner_doc_type");
  CREATE INDEX "media_signatures_owner_doc_id_idx" ON "media_signatures" USING btree ("owner_doc_id");
  CREATE INDEX "media_signatures_sha256_original_idx" ON "media_signatures" USING btree ("sha256_original");
  CREATE INDEX "media_signatures_updated_at_idx" ON "media_signatures" USING btree ("updated_at");
  CREATE INDEX "media_signatures_created_at_idx" ON "media_signatures" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_signatures_filename_idx" ON "media_signatures" USING btree ("filename");
  CREATE INDEX "media_company_uploaded_by_idx" ON "media_company" USING btree ("uploaded_by_id");
  CREATE INDEX "media_company_owner_doc_type_idx" ON "media_company" USING btree ("owner_doc_type");
  CREATE INDEX "media_company_owner_doc_id_idx" ON "media_company" USING btree ("owner_doc_id");
  CREATE INDEX "media_company_sha256_original_idx" ON "media_company" USING btree ("sha256_original");
  CREATE INDEX "media_company_updated_at_idx" ON "media_company" USING btree ("updated_at");
  CREATE INDEX "media_company_created_at_idx" ON "media_company" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_company_filename_idx" ON "media_company" USING btree ("filename");
  CREATE INDEX "media_attachments_uploaded_by_idx" ON "media_attachments" USING btree ("uploaded_by_id");
  CREATE INDEX "media_attachments_owner_doc_type_idx" ON "media_attachments" USING btree ("owner_doc_type");
  CREATE INDEX "media_attachments_owner_doc_id_idx" ON "media_attachments" USING btree ("owner_doc_id");
  CREATE INDEX "media_attachments_sha256_original_idx" ON "media_attachments" USING btree ("sha256_original");
  CREATE INDEX "media_attachments_updated_at_idx" ON "media_attachments" USING btree ("updated_at");
  CREATE INDEX "media_attachments_created_at_idx" ON "media_attachments" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_attachments_filename_idx" ON "media_attachments" USING btree ("filename");
  CREATE INDEX "media_attachments_sizes_thumb_sizes_thumb_filename_idx" ON "media_attachments" USING btree ("sizes_thumb_filename");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_employees_id_idx" ON "payload_locked_documents_rels" USING btree ("employees_id");
  CREATE INDEX "payload_locked_documents_rels_employee_bank_accounts_id_idx" ON "payload_locked_documents_rels" USING btree ("employee_bank_accounts_id");
  CREATE INDEX "payload_locked_documents_rels_banks_id_idx" ON "payload_locked_documents_rels" USING btree ("banks_id");
  CREATE INDEX "payload_locked_documents_rels_clients_id_idx" ON "payload_locked_documents_rels" USING btree ("clients_id");
  CREATE INDEX "payload_locked_documents_rels_vendors_id_idx" ON "payload_locked_documents_rels" USING btree ("vendors_id");
  CREATE INDEX "payload_locked_documents_rels_projects_id_idx" ON "payload_locked_documents_rels" USING btree ("projects_id");
  CREATE INDEX "payload_locked_documents_rels_project_stages_id_idx" ON "payload_locked_documents_rels" USING btree ("project_stages_id");
  CREATE INDEX "payload_locked_documents_rels_stage_templates_id_idx" ON "payload_locked_documents_rels" USING btree ("stage_templates_id");
  CREATE INDEX "payload_locked_documents_rels_budget_lines_id_idx" ON "payload_locked_documents_rels" USING btree ("budget_lines_id");
  CREATE INDEX "payload_locked_documents_rels_expense_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("expense_categories_id");
  CREATE INDEX "payload_locked_documents_rels_cash_in_sources_id_idx" ON "payload_locked_documents_rels" USING btree ("cash_in_sources_id");
  CREATE INDEX "payload_locked_documents_rels_cash_accounts_id_idx" ON "payload_locked_documents_rels" USING btree ("cash_accounts_id");
  CREATE INDEX "payload_locked_documents_rels_team_assignments_id_idx" ON "payload_locked_documents_rels" USING btree ("team_assignments_id");
  CREATE INDEX "payload_locked_documents_rels_work_schedules_id_idx" ON "payload_locked_documents_rels" USING btree ("work_schedules_id");
  CREATE INDEX "payload_locked_documents_rels_holidays_id_idx" ON "payload_locked_documents_rels" USING btree ("holidays_id");
  CREATE INDEX "payload_locked_documents_rels_approval_rules_id_idx" ON "payload_locked_documents_rels" USING btree ("approval_rules_id");
  CREATE INDEX "payload_locked_documents_rels_notification_templates_id_idx" ON "payload_locked_documents_rels" USING btree ("notification_templates_id");
  CREATE INDEX "payload_locked_documents_rels_uoms_id_idx" ON "payload_locked_documents_rels" USING btree ("uoms_id");
  CREATE INDEX "payload_locked_documents_rels_vehicles_id_idx" ON "payload_locked_documents_rels" USING btree ("vehicles_id");
  CREATE INDEX "payload_locked_documents_rels_cost_centers_id_idx" ON "payload_locked_documents_rels" USING btree ("cost_centers_id");
  CREATE INDEX "payload_locked_documents_rels_document_sequences_id_idx" ON "payload_locked_documents_rels" USING btree ("document_sequences_id");
  CREATE INDEX "payload_locked_documents_rels_devices_id_idx" ON "payload_locked_documents_rels" USING btree ("devices_id");
  CREATE INDEX "payload_locked_documents_rels_media_receipts_id_idx" ON "payload_locked_documents_rels" USING btree ("media_receipts_id");
  CREATE INDEX "payload_locked_documents_rels_media_transfer_proofs_id_idx" ON "payload_locked_documents_rels" USING btree ("media_transfer_proofs_id");
  CREATE INDEX "payload_locked_documents_rels_media_selfies_id_idx" ON "payload_locked_documents_rels" USING btree ("media_selfies_id");
  CREATE INDEX "payload_locked_documents_rels_media_progress_photos_id_idx" ON "payload_locked_documents_rels" USING btree ("media_progress_photos_id");
  CREATE INDEX "payload_locked_documents_rels_media_signatures_id_idx" ON "payload_locked_documents_rels" USING btree ("media_signatures_id");
  CREATE INDEX "payload_locked_documents_rels_media_company_id_idx" ON "payload_locked_documents_rels" USING btree ("media_company_id");
  CREATE INDEX "payload_locked_documents_rels_media_attachments_id_idx" ON "payload_locked_documents_rels" USING btree ("media_attachments_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "company_settings_logo_idx" ON "company_settings" USING btree ("logo_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_roles" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "employees" CASCADE;
  DROP TABLE "employee_bank_accounts" CASCADE;
  DROP TABLE "banks" CASCADE;
  DROP TABLE "clients" CASCADE;
  DROP TABLE "vendors" CASCADE;
  DROP TABLE "projects" CASCADE;
  DROP TABLE "project_stages" CASCADE;
  DROP TABLE "stage_templates_items" CASCADE;
  DROP TABLE "stage_templates" CASCADE;
  DROP TABLE "budget_lines" CASCADE;
  DROP TABLE "expense_categories" CASCADE;
  DROP TABLE "expense_categories_rels" CASCADE;
  DROP TABLE "cash_in_sources" CASCADE;
  DROP TABLE "cash_accounts" CASCADE;
  DROP TABLE "team_assignments" CASCADE;
  DROP TABLE "work_schedules" CASCADE;
  DROP TABLE "holidays" CASCADE;
  DROP TABLE "approval_rules_steps" CASCADE;
  DROP TABLE "approval_rules" CASCADE;
  DROP TABLE "notification_templates" CASCADE;
  DROP TABLE "uoms" CASCADE;
  DROP TABLE "vehicles" CASCADE;
  DROP TABLE "cost_centers" CASCADE;
  DROP TABLE "document_sequences" CASCADE;
  DROP TABLE "devices" CASCADE;
  DROP TABLE "web_sessions" CASCADE;
  DROP TABLE "audit_logs" CASCADE;
  DROP TABLE "media_receipts" CASCADE;
  DROP TABLE "media_transfer_proofs" CASCADE;
  DROP TABLE "media_selfies" CASCADE;
  DROP TABLE "media_progress_photos" CASCADE;
  DROP TABLE "media_signatures" CASCADE;
  DROP TABLE "media_company" CASCADE;
  DROP TABLE "media_attachments" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "company_settings" CASCADE;
  DROP TABLE "payload_jobs_stats" CASCADE;
  DROP TYPE "public"."enum_users_roles";
  DROP TYPE "public"."enum_employee_bank_accounts_verification_status";
  DROP TYPE "public"."enum_projects_status";
  DROP TYPE "public"."enum_cash_accounts_kind";
  DROP TYPE "public"."enum_team_assignments_role_in_project";
  DROP TYPE "public"."enum_approval_rules_steps_approver_role";
  DROP TYPE "public"."enum_approval_rules_doc_type";
  DROP TYPE "public"."enum_approval_rules_request_type";
  DROP TYPE "public"."enum_approval_rules_acknowledge";
  DROP TYPE "public"."enum_approval_rules_acknowledge_role";
  DROP TYPE "public"."enum_notification_templates_channel";
  DROP TYPE "public"."enum_cost_centers_type";
  DROP TYPE "public"."enum_document_sequences_doc_type";
  DROP TYPE "public"."enum_document_sequences_reset_policy";
  DROP TYPE "public"."enum_devices_platform";
  DROP TYPE "public"."enum_devices_status";
  DROP TYPE "public"."enum_audit_logs_action";
  DROP TYPE "public"."enum_audit_logs_source";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";`)
}
