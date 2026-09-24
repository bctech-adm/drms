import type { PayloadRequest } from 'payload'

import { approvalInbox } from '@/domain/expense/queues'

import { auditLogPage } from './audit-log'
import {
  accountMonthFlows,
  advancesWithoutLpj,
  cashBalances,
  cashFlowMonthly,
  costCenterMonth,
  inSequence,
  lastClosedPeriod,
  lpjSummary,
  masterGaps,
  ownRequests,
  pendingApprovals,
  projectBudgets,
  reportContext,
  requestRows,
  STAFF_ACTION_STATUSES,
  teamMonth,
  transferQueueSummary,
  visibleAccounts,
} from './kpi'
import { addMonths, firstDay, lastDay } from './rules'
import { ownScope, teamScope, type ReportScope } from './scope'

/**
 * Data of the role dashboards (wireframes §1–§4a). One function per layout, shared by the admin
 * "Beranda" view and GET /api/v1/dashboard/{owner,finance,pm,me}. Call inside a transaction.
 * Every number is a KPI of kpi-definitions.md; click targets are built by the view (C9).
 */
const ALL: ReportScope = { kind: 'all' }

/** "Menunggu saya" (K-10): the caller's approval inbox (G1/G2 + delegation, F2). */
async function waitingForMe(req: PayloadRequest): Promise<number> {
  return (await approvalInbox(req)).items.length
}

export async function ownerDashboard(req: PayloadRequest, opts: { months?: number; accountId?: number } = {}) {
  const ctx = await reportContext(req)
  const months = opts.months === 6 ? 6 : 12
  const flowRange = { from: addMonths(ctx.month, -(months - 1)), to: ctx.month, accountId: opts.accountId }
  const [balances, monthOps, pending, mine, lpj, flows, projects, costCenters, queue] = await inSequence(
    () => cashBalances(req, ctx.today),
    () => accountMonthFlows(req, ctx.month, 'operational'),
    () => pendingApprovals(req, ALL),
    () => waitingForMe(req),
    () => lpjSummary(req, ALL, firstDay(ctx.month), lastDay(ctx.month)),
    () => cashFlowMonthly(req, flowRange, 'operational'),
    () => projectBudgets(req, ALL),
    () => costCenterMonth(req, ALL, ctx.month),
    () => transferQueueSummary(req),
  )
  const running = projects.filter((p) => p.status === 'berjalan')
  const count = (t: string) => running.filter((p) => p.tone === t).length
  return {
    asOf: ctx.today,
    month: ctx.month,
    cash: {
      total: balances.total,
      accounts: visibleAccounts(balances.accounts).map((a) => ({ id: a.id, name: a.name, active: a.active, balance: a.balance })),
      monthIn: [...monthOps.values()].reduce((s, x) => s + x.masuk, 0),
      monthOut: [...monthOps.values()].reduce((s, x) => s + x.keluar, 0),
    },
    budget: { running: running.length, over: count('over'), warn: count('warn'), ok: count('ok'), none: count('none') },
    completeness: {
      ratioDone: lpj.ratio.done,
      ratioTotal: lpj.ratio.total,
      withoutLpj: lpj.withoutLpj.count,
      overdue: lpj.overdue.count,
      reimburseToVerify: lpj.reimburseToVerify,
      openWarnings: lpj.openWarnings,
    },
    approvals: { count: pending.count, sum: pending.sum, waitingForMe: mine, oldestDays: pending.oldestDays },
    cashFlow: { basis: 'K-02b' as const, months, rows: flows.map((f) => ({ period: f.period, masuk: f.masuk, keluar: f.keluar })) },
    projects,
    costCenters: costCenters.filter((c) => c.total !== 0 || c.fromRequests !== 0 || c.manualOut !== 0 || c.manualIn !== 0),
    transferQueue: queue,
  }
}

export async function financeDashboard(req: PayloadRequest) {
  const ctx = await reportContext(req)
  const [queue, lpj, balances, monthBook, flows, lastClosed] = await inSequence(
    () => transferQueueSummary(req),
    () => lpjSummary(req, ALL, firstDay(ctx.month), lastDay(ctx.month)),
    () => cashBalances(req, ctx.today),
    () => accountMonthFlows(req, ctx.month, 'book'),
    () => cashFlowMonthly(req, { from: addMonths(ctx.month, -5), to: ctx.month }, 'book'),
    () => lastClosedPeriod(req),
  )
  return {
    asOf: ctx.today,
    month: ctx.month,
    transferQueue: queue,
    reimburseToVerify: { count: queue.reimburseToVerify, warnings: queue.reimburseToVerifyWarnings },
    lpjToVerify: lpj.lpjToVerify,
    lpjToSettle: lpj.lpjToSettle,
    accounts: visibleAccounts(balances.accounts).map((a) => ({ id: a.id, name: a.name, active: a.active, balance: a.balance, monthIn: monthBook.get(a.id)?.masuk ?? 0, monthOut: monthBook.get(a.id)?.keluar ?? 0 })),
    cashTotal: balances.total,
    advancesWithoutLpj: lpj.rows,
    lpjDueDays: ctx.lpjDueDays,
    cashFlow: { basis: 'K-02a' as const, months: 6, rows: flows.map((f) => ({ period: f.period, masuk: f.masuk, keluar: f.keluar, koreksi: f.koreksi })) },
    lastClosedPeriod: lastClosed,
    nextClosable: addMonths(ctx.month, -1),
  }
}

export async function pmDashboard(req: PayloadRequest) {
  const ctx = await reportContext(req)
  const scope = await teamScope(req)
  const [mine, month, lpjRows, projects, costCenters, latest] = await inSequence(
    () => waitingForMe(req),
    () => teamMonth(req, scope, ctx.month),
    () => advancesWithoutLpj(req, scope),
    () => projectBudgets(req, scope),
    () => costCenterMonth(req, scope, ctx.month),
    () => requestRows(req, scope, { from: '0000-01-01', to: '9999-12-31' }, { limit: 10 }),
  )
  return {
    asOf: ctx.today,
    month: ctx.month,
    hasScope: scope.kind === 'team' && (scope.projects.length > 0 || scope.costCenters.length > 0),
    waitingForMe: mine,
    teamMonth: month,
    lpj: { withoutLpj: lpjRows.length, overdue: lpjRows.filter((r) => r.overdue).length, lpjDueDays: ctx.lpjDueDays },
    projects,
    costCenters,
    latest,
    attendance: { available: false as const, phase: 'F5' },
    progressReports: { available: false as const, phase: 'F5' },
  }
}

export async function staffDashboard(req: PayloadRequest) {
  const scope = await ownScope(req)
  const [actions, latest] = await inSequence(() => ownRequests(req, scope, { statuses: STAFF_ACTION_STATUSES, limit: 20 }), () => ownRequests(req, scope, { limit: 10 }))
  return { actions, latest }
}

export async function adminDashboard(req: PayloadRequest) {
  const ctx = await reportContext(req)
  const [gaps, audit] = await inSequence(() => masterGaps(req), () => auditLogPage(req, { from: addDaysSafe(ctx.today, -30), to: ctx.today }, { limit: 20 }))
  return { gaps, latestAudit: audit.rows }
}

function addDaysSafe(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}
