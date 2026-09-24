import { z } from 'zod'

/**
 * F3 dashboards & reports (docs/proyekkas/f3/kpi-definitions.md, wireframes.md). Amounts are
 * integer Rupiah; business dates 'YYYY-MM-DD' (company TZ); periods 'YYYY-MM'.
 */
const rp = z.number().int().meta({ description: 'Rupiah (integer)' })
const pct = z.number().nullable().meta({ description: 'Percent, 2 decimals; null = no budget' })
const tone = z.enum(['none', 'ok', 'warn', 'over']).meta({ description: 'K-08 colour: Tanpa RAB / Aman / Waspada / Lewat RAB (Komitmen basis)' })

export const ReportCode = z.enum(['rekap-kas', 'buku-kas', 'pengeluaran-kategori', 'anggaran-project', 'rekap-pengajuan', 'kelengkapan', 'biaya-kendaraan', 'audit-log'])
export const ReportFormat = z.enum(['csv', 'xlsx', 'pdf'])

export const ProjectBudget = z.object({
  id: z.number().int(),
  code: z.string(),
  name: z.string(),
  status: z.string(),
  budget: rp.nullable(),
  committed: rp.meta({ description: 'K-07 Komitmen' }),
  committedCount: z.number().int(),
  pct: pct.meta({ description: 'K-08 % komitmen / RAB' }),
  tone,
  disbursedNet: rp.meta({ description: 'K-05 Dicairkan bersih' }),
  realized: rp.meta({ description: 'K-06 Realisasi terverifikasi' }),
  pctDisbursed: pct,
  pctRealized: pct,
})

const CashFlowPoint = z.object({ period: z.string(), masuk: rp, keluar: rp, koreksi: rp.optional() })
const CostCenterMonth = z.object({ id: z.number().int(), code: z.string(), name: z.string(), fromRequests: rp, manualOut: rp, manualIn: rp, total: rp.meta({ description: 'K-15' }) })
const TransferQueueSummary = z.object({ count: z.number().int(), sum: rp, overdue: z.number().int(), reimburseToVerify: z.number().int(), reimburseToVerifyWarnings: z.number().int() })
const AdvanceWithoutLpj = z.object({
  id: z.number().int(),
  docNo: z.string().nullable(),
  title: z.string(),
  requesters: z.string(),
  scopeName: z.string(),
  status: z.string(),
  transferredTotal: rp,
  firstTransfer: z.string().nullable(),
  ageDays: z.number().int().nullable(),
  overdue: z.boolean().meta({ description: 'K-12b: age > company-settings.lpjDueDays' }),
})

export const OwnerDashboard = z.object({
  asOf: z.string(),
  month: z.string(),
  cash: z.object({ total: rp, accounts: z.array(z.object({ id: z.number().int(), name: z.string(), active: z.boolean(), balance: rp })), monthIn: rp, monthOut: rp }),
  budget: z.object({ running: z.number().int(), over: z.number().int(), warn: z.number().int(), ok: z.number().int(), none: z.number().int() }),
  completeness: z.object({ ratioDone: z.number().int(), ratioTotal: z.number().int(), withoutLpj: z.number().int(), overdue: z.number().int(), reimburseToVerify: z.number().int(), openWarnings: z.number().int() }),
  approvals: z.object({ count: z.number().int(), sum: rp, waitingForMe: z.number().int(), oldestDays: z.number().int().nullable() }),
  cashFlow: z.object({ basis: z.literal('K-02b'), months: z.number().int(), rows: z.array(CashFlowPoint) }),
  projects: z.array(ProjectBudget),
  costCenters: z.array(CostCenterMonth),
  transferQueue: TransferQueueSummary,
})

export const FinanceDashboard = z.object({
  asOf: z.string(),
  month: z.string(),
  transferQueue: TransferQueueSummary,
  reimburseToVerify: z.object({ count: z.number().int(), warnings: z.number().int() }),
  lpjToVerify: z.number().int(),
  lpjToSettle: z.object({ count: z.number().int(), refund: rp, shortfall: rp }),
  accounts: z.array(z.object({ id: z.number().int(), name: z.string(), active: z.boolean(), balance: rp, monthIn: rp, monthOut: rp })),
  cashTotal: rp,
  advancesWithoutLpj: z.array(AdvanceWithoutLpj),
  lpjDueDays: z.number().int(),
  cashFlow: z.object({ basis: z.literal('K-02a'), months: z.number().int(), rows: z.array(CashFlowPoint) }),
  lastClosedPeriod: z.string().nullable(),
  nextClosable: z.string(),
})

const RequestRow = z.object({
  id: z.number().int(),
  docNo: z.string().nullable(),
  requestDate: z.string().nullable(),
  type: z.enum(['advance', 'reimburse']),
  title: z.string(),
  scopeName: z.string(),
  requesters: z.string(),
  status: z.string(),
  grandTotal: rp,
  approvedAmount: rp.nullable(),
  disbursed: rp,
  refund: rp,
  realized: rp,
  openFlags: z.number().int(),
})

export const PmDashboard = z.object({
  asOf: z.string(),
  month: z.string(),
  hasScope: z.boolean(),
  waitingForMe: z.number().int(),
  teamMonth: z.object({ count: z.number().int(), sum: rp, waiting: z.number().int() }),
  lpj: z.object({ withoutLpj: z.number().int(), overdue: z.number().int(), lpjDueDays: z.number().int() }),
  projects: z.array(ProjectBudget),
  costCenters: z.array(CostCenterMonth),
  latest: z.array(RequestRow),
  attendance: z.object({ available: z.literal(false), phase: z.string() }),
  progressReports: z.object({ available: z.literal(false), phase: z.string() }),
})

const OwnRequest = z.object({ id: z.number().int(), docNo: z.string().nullable(), title: z.string(), type: z.enum(['advance', 'reimburse']), status: z.string(), grandTotal: rp, ageDays: z.number().int() })
export const StaffDashboard = z.object({ actions: z.array(OwnRequest), latest: z.array(OwnRequest) })

export const AdminDashboard = z.object({
  gaps: z.object({ usersIncomplete: z.number().int(), projectsWithoutPm: z.number().int(), costCentersWithoutManager: z.number().int() }),
  latestAudit: z.array(z.record(z.string(), z.unknown())),
})

const Cell = z.union([z.string(), z.number(), z.null()])
const ReportTable = z.object({
  key: z.string(),
  title: z.string(),
  columns: z.array(z.object({ key: z.string(), label: z.string(), type: z.enum(['text', 'money', 'int', 'date', 'datetime', 'pct']), primary: z.boolean().optional(), width: z.number().optional() })),
  rows: z.array(z.record(z.string(), Cell)),
  totals: z.record(z.string(), Cell).nullable(),
})

export const ReportResponse = z.object({
  code: ReportCode,
  title: z.string(),
  kpi: z.string(),
  scope: z.enum(['all', 'team']),
  count: z.number().int(),
  nextCursor: z.string().nullable(),
  main: ReportTable,
  extra: z.array(ReportTable),
  notes: z.array(z.string()),
  formats: z.array(ReportFormat),
})

export const ReportQuery = z
  .object({
    cursor: z.string().optional().meta({ description: 'Keyset cursor (paged reports: buku-kas, rekap-pengajuan, audit-log)' }),
    dari: z.string().optional().meta({ description: 'From: YYYY-MM-DD (rekap-kas: YYYY-MM)' }),
    sampai: z.string().optional().meta({ description: 'To: YYYY-MM-DD (rekap-kas: YYYY-MM)' }),
    project: z.string().optional(),
    pusat: z.string().optional().meta({ description: 'Cost center id' }),
    kategori: z.string().optional(),
    jenis: z.string().optional().meta({ description: 'advance | reimburse (audit-log: document type)' }),
    status: z.string().optional().meta({ description: 'Comma separated request statuses (rekap-pengajuan)' }),
    akun: z.string().optional(),
    kendaraan: z.string().optional(),
    pemohon: z.string().optional(),
    dasar: z.string().optional().meta({ description: 'dicairkan | realisasi (pengeluaran-kategori)' }),
    grup: z.string().optional().meta({ description: 'kategori | lingkup (pengeluaran-kategori)' }),
    user: z.string().optional(),
    aksi: z.string().optional(),
    nodok: z.string().optional(),
    sumber: z.string().optional(),
  })
  .meta({ description: 'Same filters as the web report page; PM filters are intersected with the team scope.' })
