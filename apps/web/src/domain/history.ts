import type { PayloadRequest, Where } from 'payload'

import { hasRole } from '@/access/roles'

/**
 * "Riwayat" (US-35, requirements v1.1 §8 "Tampilan log"): audit rows of a document — who (user +
 * roles), when (server time), what (field old → new, per line), from where (source web/apk/job,
 * app version, device id). For an expense request the satellites are included (receipts,
 * transfers, LPJ, and — for Finance/Owner/Admin who may read the ledger — its cash entries).
 * Callers check read access to the document BEFORE calling (SYSTEM-READ on audit-logs).
 */
export type HistoryRow = {
  id: number
  serverTime: string
  docType: string
  docId: string | null
  docNo: string | null
  action: string
  field: string | null
  lineNo: number | null
  oldValue: unknown
  newValue: unknown
  statusFrom: string | null
  statusTo: string | null
  reason: string | null
  userId: number | null
  userName: string | null
  userRoles: string | null
  source: string | null
  appVersion: string | null
  deviceId: string | null
}

export const unwrapAudit = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) && 'v' in (v as object) ? (v as { v: unknown }).v : (v ?? null))

async function idsOf(req: PayloadRequest, collection: 'receipts' | 'transfers' | 'settlements' | 'cash-entries', field: string, requestId: number): Promise<string[]> {
  const res = await req.payload.find({
    collection,
    where: { [field]: { equals: requestId } },
    depth: 0,
    pagination: false,
    select: { updatedAt: true },
    overrideAccess: true, // SYSTEM-READ: satellites of a request the caller may read
    req,
  })
  return res.docs.map((d) => String(d.id))
}

export async function historyRows(req: PayloadRequest, targets: Array<{ docType: string; ids: string[] }>, limit = 2000): Promise<HistoryRow[]> {
  const or: Where[] = targets.filter((t) => t.ids.length > 0).map((t): Where => ({ and: [{ docType: { equals: t.docType } } as Where, { docId: { in: t.ids } } as Where] }))
  if (or.length === 0) return []
  const res = await req.payload.find({
    collection: 'audit-logs',
    where: or.length === 1 ? or[0] : { or },
    sort: 'id',
    limit,
    depth: 0,
    overrideAccess: true, // SYSTEM-READ: history of documents the caller may read (checked by the caller)
    req,
  })
  const userIds = [...new Set(res.docs.map((a) => a.userId).filter((x): x is number => typeof x === 'number'))]
  const names = new Map<number, string>()
  if (userIds.length > 0) {
    const users = await req.payload.find({
      collection: 'users',
      where: { id: { in: userIds } },
      depth: 1,
      pagination: false,
      select: { name: true, email: true, employee: true },
      overrideAccess: true, // SYSTEM-READ: display names for the history (no other user data exposed)
      req,
    })
    for (const u of users.docs) {
      const emp = u.employee && typeof u.employee === 'object' ? (u.employee as { name?: string }).name : undefined
      names.set(u.id as number, emp || (u.name as string) || `user#${u.id}`)
    }
  }
  return res.docs.map((a) => ({
    id: a.id as number,
    serverTime: (a.serverTime as string) ?? '',
    docType: a.docType as string,
    docId: (a.docId as string) ?? null,
    docNo: (a.docNo as string) ?? null,
    action: a.action as string,
    field: (a.field as string) ?? null,
    lineNo: (a.lineNo as number) ?? null,
    oldValue: unwrapAudit(a.oldValue),
    newValue: unwrapAudit(a.newValue),
    statusFrom: (a.statusFrom as string) ?? null,
    statusTo: (a.statusTo as string) ?? null,
    reason: (a.reason as string) ?? null,
    userId: (a.userId as number) ?? null,
    userName: typeof a.userId === 'number' ? (names.get(a.userId) ?? null) : null,
    userRoles: (a.userRoles as string) ?? null,
    source: (a.source as string) ?? null,
    appVersion: (a.appVersion as string) ?? null,
    deviceId: (a.deviceId as string) ?? null,
  }))
}

/** History of an expense request + satellites (caller must have read access to the request). */
export async function requestHistory(req: PayloadRequest, requestId: number): Promise<HistoryRow[]> {
  const targets = [
    { docType: 'expense_request', ids: [String(requestId)] },
    { docType: 'receipt', ids: await idsOf(req, 'receipts', 'request', requestId) },
    { docType: 'transfer', ids: await idsOf(req, 'transfers', 'request', requestId) },
    { docType: 'settlement', ids: await idsOf(req, 'settlements', 'request', requestId) },
  ]
  if (hasRole(req, 'pk-finance', 'pk-owner', 'pk-admin')) {
    targets.push({ docType: 'cash_entry', ids: await idsOf(req, 'cash-entries', 'expenseRequest', requestId) })
  }
  return historyRows(req, targets)
}
