import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { id } from '@payloadcms/translations/languages/id'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { withStaffHiddenGlobals, withStaffPanelVisibility } from './access/panel-visibility'
import { F2_ADMIN_VIEWS, F3_ADMIN_VIEWS } from './admin/config'
import { v1Endpoints } from './api/v1'
import { Attendances } from './collections/Attendances'
import { ApprovalRules } from './collections/ApprovalRules'
import { Approvals } from './collections/Approvals'
import { AuditLogs } from './collections/AuditLogs'
import { Banks } from './collections/Banks'
import { BudgetLines } from './collections/BudgetLines'
import { CashAccounts } from './collections/CashAccounts'
import { CashEntries } from './collections/CashEntries'
import { CashInSources } from './collections/CashInSources'
import { Clients } from './collections/Clients'
import { CostCenters } from './collections/CostCenters'
import { Devices } from './collections/Devices'
import { DocumentSequences } from './collections/DocumentSequences'
import { EmployeeBankAccounts } from './collections/EmployeeBankAccounts'
import { Employees } from './collections/Employees'
import { ExpenseCategories } from './collections/ExpenseCategories'
import { ExpenseLineSnapshots } from './collections/ExpenseLineSnapshots'
import { ExpenseRequests } from './collections/ExpenseRequests'
import { Holidays } from './collections/Holidays'
import { MEDIA_COLLECTIONS } from './collections/media'
import { NotificationTemplates } from './collections/NotificationTemplates'
import { Notifications } from './collections/Notifications'
import { PeriodClosings } from './collections/PeriodClosings'
import { Projects } from './collections/Projects'
import { ProjectStages } from './collections/ProjectStages'
import { ReceiptFlags } from './collections/ReceiptFlags'
import { Receipts } from './collections/Receipts'
import { Settlements } from './collections/Settlements'
import { StageTemplates } from './collections/StageTemplates'
import { TeamAssignments } from './collections/TeamAssignments'
import { Transfers } from './collections/Transfers'
import { Uoms } from './collections/Uoms'
import { Users } from './collections/Users'
import { Vehicles } from './collections/Vehicles'
import { Vendors } from './collections/Vendors'
import { WebSessions } from './collections/WebSessions'
import { WorkSchedules } from './collections/WorkSchedules'
import { CompanySettings } from './globals/CompanySettings'
import { tasks } from './jobs/tasks'
import { smtpEmailAdapter } from './email/adapter'
import { getEnv, parseSmtpEnv, readSecret } from './lib/env'
import { loggerOptions } from './lib/logger'
import { MAX_UPLOAD_BYTES } from './collections/media/factory'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// Outbound SMTP only when SMTP_* is fully configured (all-or-nothing, validated here because the
// adapter is built with the config); otherwise Payload's console adapter (dev/tests/migrate).
const smtp = parseSmtpEnv(process.env)

// ADR 0004: one sharp instance (the one passed to buildConfig), concurrency 1 (RAM budget).
sharp.concurrency(1)

export const MASTER_COLLECTIONS = [
  Employees,
  EmployeeBankAccounts,
  Banks,
  Clients,
  Vendors,
  Projects,
  ProjectStages,
  StageTemplates,
  BudgetLines,
  ExpenseCategories,
  CashInSources,
  CashAccounts,
  TeamAssignments,
  WorkSchedules,
  Holidays,
  ApprovalRules,
  NotificationTemplates,
  Uoms,
  Vehicles,
  CostCenters,
  DocumentSequences,
]

/** F2 business documents (T1–T8, period closing). */
export const FLOW_COLLECTIONS = [
  ExpenseRequests,
  ExpenseLineSnapshots,
  Approvals,
  Receipts,
  ReceiptFlags,
  Transfers,
  Settlements,
  CashEntries,
  PeriodClosings,
]

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    components: {
      beforeLogin: ['@/components/SsoLoginButton#SsoLoginButton'],
      logout: { Button: '@/components/LogoutButton#LogoutButton' },
      // F2 work views (approval inbox, transfer queue, LPJ verification) + nav badges.
      afterNavLinks: ['@/admin/components/F2NavLinks#F2NavLinks'],
      // F3: role dashboards (Beranda), reports, global audit log.
      views: { ...F2_ADMIN_VIEWS, ...F3_ADMIN_VIEWS },
    },
    timezones: { defaultTimezone: 'Asia/Makassar' },
    // Default 'gravatar' sends md5(email) to www.gravatar.com (privacy + CSP img-src), spike f.
    avatar: 'default',
    meta: { titleSuffix: ' — ProyekKas DRMS' },
  },
  // F2c: staff-only users see only their requests, receipts, notifications and profile.
  collections: withStaffPanelVisibility([Users, ...MASTER_COLLECTIONS, ...FLOW_COLLECTIONS, Attendances, Notifications, Devices, WebSessions, AuditLogs, ...MEDIA_COLLECTIONS]),
  globals: withStaffHiddenGlobals([CompanySettings]),
  // Admin UI in Bahasa Indonesia (ADR 0001 §5; @payloadcms/translations/languages/id @3.90.1).
  i18n: { supportedLanguages: { id }, fallbackLanguage: 'id' },
  graphQL: { disable: true },
  maxDepth: 3,
  defaultDepth: 1,
  telemetry: false,
  logger: { options: loggerOptions() },
  // Build-time placeholder only; the runtime value is validated by getEnv() in onInit.
  secret: readSecret('PAYLOAD_SECRET'),
  db: postgresAdapter({
    pool: {
      connectionString: readSecret('DATABASE_URL'),
      max: Number(process.env.DATABASE_POOL_MAX ?? 6),
      idleTimeoutMillis: 30_000,
    },
    // ADR 0001 §7 / 0006 §6: never push; migrations run as the owner role in a one-shot container.
    push: false,
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  sharp,
  // ADR 0004 §2: ≤ 8 MiB per file, 5 files, request ≤ 10 MiB (Traefik buffering-pk/AppSec 10 MiB).
  upload: { limits: { fileSize: MAX_UPLOAD_BYTES, files: 5, fields: 30 }, requestSizeLimit: 10 * 1024 * 1024 },
  endpoints: v1Endpoints,
  email: smtp ? smtpEmailAdapter(smtp) : undefined,
  jobs: {
    tasks,
    // The worker process (dist/worker.mjs) calls handleSchedules() + run(); no autoRun in web.
    deleteJobOnComplete: false,
    // REST /api/payload-jobs/{run,handle-schedules,cancel} default to "any logged-in user": jobs
    // are queued by server code and run ONLY by the worker via the Local API (which bypasses
    // this access), so the HTTP surface is closed (e.g. no sendEmail runs inside the web process).
    access: { run: () => false, queue: () => false, cancel: () => false },
  },
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  onInit: async (payload) => {
    if (process.env.PK_SKIP_ENV_CHECK !== 'true') getEnv() // fail fast on invalid env
    payload.logger.info({ msg: 'payload initialised', pid: process.pid, tz: Intl.DateTimeFormat().resolvedOptions().timeZone })
  },
})
