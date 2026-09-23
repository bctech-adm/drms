import type { PayloadRequest, Where } from 'payload'

import { hasRole, userId } from '@/access/roles'
import { resolveScope } from '@/access/scope'
import { actorContext, loadVisible, type RequestDoc } from '@/domain/expense/common'
import { createDraft, resubmitAsDraft, updateDraft } from '@/domain/expense/drafts'
import { detail, listItem } from '@/domain/expense/dto'
import { addReceipt, editReceipt, rejectReceipt, removeReceipt, resubmitReceipts, reviewFlag, verifyAllReceipts, verifyReceipt } from '@/domain/expense/receipts'
import { allowedActions } from '@/domain/expense/state'
import { recordTransfer, voidTransfer } from '@/domain/expense/transfers'
import { acknowledge, approve, cancel, complete, reject, submit, withdraw } from '@/domain/expense/workflow'
import { receiptsComplete, requestLpjRevision, settle, submitLpj, verifyLpj } from '@/domain/expense/lpj'
import { requestHistory } from '@/domain/history'

import { HttpError, json, v1 } from '../http'
import {
  EmptyBody,
  ExpenseRequestCreate,
  ExpenseRequestUpdate,
  FlagReviewBody,
  ListQuery,
  LpjSubmitBody,
  RevisionBody,
  SettleBody,
  ReasonBody,
  ReceiptCreate,
  ReceiptUpdate,
  RejectBody,
  SignBody,
  TransferCreate,
} from '../schemas-flow'

/** Architecture §6.5: submit/approve 30/min per user. */
const ACTION_LIMIT: [number, number] = [30, 60_000]

function idParam(params: Record<string, string>, name = 'id'): number {
  const v = params[name] ?? ''
  if (!/^\d{1,10}$/.test(v)) throw new HttpError(404, 'Not Found')
  return Number(v)
}

const ok = async (req: PayloadRequest, id: number, status = 200) => json(await detail(req, id), status)

// ---------------------------------------------------------------- list / detail / history

function decodeCursor(c: string | undefined): number | undefined {
  if (!c) return undefined
  const n = Number(Buffer.from(c, 'base64url').toString('utf8'))
  if (!Number.isSafeInteger(n) || n <= 0) throw new HttpError(400, 'Bad Request', { detail: 'cursor tidak valid.' })
  return n
}
const encodeCursor = (id: number) => Buffer.from(String(id)).toString('base64url')

/**
 * GET /expense-requests?scope=mine|team|inbox|all — always within the caller's read access
 * (own / team / all per role, architecture §7.1). `inbox` = waiting for the caller's
 * acknowledge/approve decision (US-26 approval inbox data).
 */
export const listRequestsEndpoint = v1({
  path: '/expense-requests',
  method: 'get',
  handler: async ({ req }) => {
    const q = ListQuery.safeParse(Object.fromEntries(req.searchParams.entries()))
    if (!q.success) throw new HttpError(400, 'Bad Request', { errors: q.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) })
    const { scope, status, type, limit, cursor } = q.data
    const and: Where[] = []
    const uid = userId(req)!
    const s = await resolveScope(req)
    if (scope === 'mine') {
      const own: Where[] = [{ createdBy: { equals: uid } }]
      if (s.employeeId !== null) own.push({ requesters: { in: [s.employeeId] } })
      and.push({ or: own })
    }
    if (scope === 'team' && hasRole(req, 'pk-pm') && !hasRole(req, 'pk-finance', 'pk-owner', 'pk-admin')) {
      const team: Where[] = []
      if (s.teamProjects.length) team.push({ project: { in: s.teamProjects } })
      if (s.teamCostCenters.length) team.push({ costCenter: { in: s.teamCostCenters } })
      if (team.length === 0) return json({ items: [], nextCursor: null })
      and.push({ or: team })
    }
    if (scope === 'inbox') and.push({ status: { in: ['pending_ack', 'pending_approval'] } })
    if (status) and.push({ status: { in: status.split(',') } })
    if (type) and.push({ type: { equals: type } })
    const after = decodeCursor(cursor)
    if (after !== undefined) and.push({ id: { less_than: after } })
    let docs: RequestDoc[] = []
    try {
      const res = await req.payload.find({
        collection: 'expense-requests',
        where: and.length ? { and } : undefined,
        sort: '-id',
        limit: scope === 'inbox' ? 200 : limit + 1,
        depth: 0,
        user: req.user,
        overrideAccess: false, // caller's read scope
        req,
      })
      docs = res.docs as unknown as RequestDoc[]
    } catch (err) {
      if ((err as { status?: number }).status === 403) return json({ items: [], nextCursor: null })
      throw err
    }
    if (scope === 'inbox') {
      const mine: RequestDoc[] = []
      for (const d of docs) {
        const acts = allowedActions(await actorContext(req, d))
        if (acts.includes('approve') || acts.includes('acknowledge')) mine.push(d)
      }
      docs = mine
    }
    const page = docs.slice(0, limit)
    const next = docs.length > limit && scope !== 'inbox' ? encodeCursor(page[page.length - 1]!.id) : null
    return json({ items: page.map((d) => listItem(d)), nextCursor: next })
  },
})

export const getRequestEndpoint = v1({
  path: '/expense-requests/:id',
  method: 'get',
  transactional: true, // consistent snapshot; budget query uses the request transaction handle
  handler: async ({ req, params }) => {
    const id = idParam(params)
    await loadVisible(req, id)
    return ok(req, id)
  },
})

/**
 * GET /expense-requests/{id}/history — "Riwayat" (US-35): audit rows of the request and its
 * satellites (receipts, transfers, LPJ; cash entries for Finance/Owner/Admin) with who / when /
 * old → new / source + device.
 */
export const historyEndpoint = v1({
  path: '/expense-requests/:id/history',
  method: 'get',
  transactional: true,
  handler: async ({ req, params }) => {
    const id = idParam(params)
    await loadVisible(req, id)
    const rows = await requestHistory(req, id)
    return json({
      items: rows.map((a) => ({
        serverTime: a.serverTime,
        action: a.action,
        field: a.field,
        lineNo: a.lineNo,
        oldValue: a.oldValue,
        newValue: a.newValue,
        statusFrom: a.statusFrom,
        statusTo: a.statusTo,
        reason: a.reason,
        userId: a.userId,
        userName: a.userName,
        source: a.source,
        appVersion: a.appVersion,
        deviceId: a.deviceId,
        docType: a.docType,
        docNo: a.docNo,
      })),
    })
  },
})

/** GET /transfer-queue — US-19: Uang Muka "Disetujui", Reimburse "Nota Terverifikasi", by needed date. */
export const transferQueueEndpoint = v1({
  path: '/transfer-queue',
  method: 'get',
  roles: ['pk-finance', 'pk-owner'],
  handler: async ({ req }) => {
    const res = await req.payload.find({
      collection: 'expense-requests',
      where: {
        or: [
          { and: [{ type: { equals: 'advance' } }, { status: { equals: 'approved' } }] },
          { and: [{ type: { equals: 'reimburse' } }, { status: { equals: 'receipts_verified' } }] },
        ],
      },
      sort: 'neededDate',
      limit: 500,
      depth: 0,
      user: req.user,
      overrideAccess: false, // Finance/Owner read all
      req,
    })
    const items = []
    for (const d of res.docs as unknown as RequestDoc[]) {
      const flags = await req.payload.count({
        collection: 'receipt-flags',
        where: { and: [{ request: { equals: d.id } }, { status: { equals: 'open' } }] },
        overrideAccess: true, // SYSTEM-READ: open flag count (US-19 column)
        req,
      })
      items.push(listItem(d, { openWarningFlags: flags.totalDocs }))
    }
    return json({ items, nextCursor: null })
  },
})

// ---------------------------------------------------------------- drafts

export const createRequestEndpoint = v1({
  path: '/expense-requests',
  method: 'post',
  body: ExpenseRequestCreate,
  rateLimit: ACTION_LIMIT,
  transactional: true,
  idempotent: true,
  handler: async ({ req, body }) => {
    const { doc, created } = await createDraft(req, body)
    return ok(req, doc.id, created ? 201 : 200)
  },
})

export const updateRequestEndpoint = v1({
  path: '/expense-requests/:id',
  method: 'patch',
  body: ExpenseRequestUpdate,
  rateLimit: ACTION_LIMIT,
  transactional: true,
  handler: async ({ req, body, params }) => {
    const id = idParam(params)
    await updateDraft(req, id, body)
    return ok(req, id)
  },
})

// ---------------------------------------------------------------- transitions

type Handler<B> = (req: PayloadRequest, id: number, body: B) => Promise<unknown>

function action<B>(path: string, schema: import('zod').ZodType<B>, fn: Handler<B>, opts: { status?: number; returnsNewId?: boolean } = {}) {
  return v1({
    path: `/expense-requests/:id/${path}`,
    method: 'post',
    body: schema,
    rateLimit: ACTION_LIMIT,
    transactional: true,
    idempotent: true,
    handler: async ({ req, body, params }) => {
      const id = idParam(params)
      const res = await fn(req, id, body as B)
      const target = opts.returnsNewId ? (res as { id: number }).id : id
      return ok(req, target, opts.status ?? 200)
    },
  })
}

export const submitEndpoint = action('submit', SignBody, (req, id, b) => submit(req, id, { signatureMediaId: b.signatureMediaId }))
export const withdrawEndpoint = action('withdraw', ReasonBody, (req, id, b) => {
  req.context.auditReason = b.reason
  return withdraw(req, id, b.reason)
})
export const cancelEndpoint = action('cancel', ReasonBody, (req, id, b) => {
  req.context.auditReason = b.reason
  return cancel(req, id, b.reason)
})
export const resubmitEndpoint = action('resubmit', EmptyBody, (req, id) => resubmitAsDraft(req, id), { status: 201, returnsNewId: true })
export const acknowledgeEndpoint = action('acknowledge', SignBody, (req, id, b) => acknowledge(req, id, { signatureMediaId: b.signatureMediaId }))
export const approveEndpoint = action('approve', SignBody, (req, id, b) => approve(req, id, { signatureMediaId: b.signatureMediaId }))
export const rejectEndpoint = action('reject', RejectBody, (req, id, b) => {
  req.context.auditReason = b.reason
  return reject(req, id, b.reason, { signatureMediaId: b.signatureMediaId })
})
export const completeEndpoint = action('complete', EmptyBody, (req, id) => complete(req, id))

// ---------------------------------------------------------------- receipts (T4)

export const addReceiptEndpoint = action('receipts', ReceiptCreate, (req, id, b) => addReceipt(req, id, b), { status: 201 })

export const editReceiptEndpoint = v1({
  path: '/expense-requests/:id/receipts/:rid',
  method: 'patch',
  body: ReceiptUpdate,
  rateLimit: ACTION_LIMIT,
  transactional: true,
  handler: async ({ req, body, params }) => {
    const id = idParam(params)
    await editReceipt(req, id, idParam(params, 'rid'), body)
    return ok(req, id)
  },
})

function receiptAction<B>(path: string, schema: import('zod').ZodType<B>, fn: (req: PayloadRequest, id: number, rid: number, body: B) => Promise<unknown>) {
  return v1({
    path: `/expense-requests/:id/receipts/:rid/${path}`,
    method: 'post',
    body: schema,
    rateLimit: ACTION_LIMIT,
    transactional: true,
    idempotent: true,
    handler: async ({ req, body, params }) => {
      const id = idParam(params)
      await fn(req, id, idParam(params, 'rid'), body as B)
      return ok(req, id)
    },
  })
}

export const removeReceiptEndpoint = receiptAction('remove', ReasonBody, (req, id, rid, b) => removeReceipt(req, id, rid, b.reason))
export const verifyReceiptEndpoint = receiptAction('verify', EmptyBody, (req, id, rid) => verifyReceipt(req, id, rid))
export const rejectReceiptEndpoint = receiptAction('reject', ReasonBody, (req, id, rid, b) => rejectReceipt(req, id, rid, b.reason))
export const resubmitReceiptsEndpoint = action('receipts-resubmit', EmptyBody, (req, id) => resubmitReceipts(req, id))
export const verifyReceiptsEndpoint = action('verify-receipts', EmptyBody, (req, id) => verifyAllReceipts(req, id))

export const reviewFlagEndpoint = v1({
  path: '/expense-requests/:id/flags/:fid/review',
  method: 'post',
  body: FlagReviewBody,
  rateLimit: ACTION_LIMIT,
  transactional: true,
  idempotent: true,
  handler: async ({ req, body, params }) => {
    const id = idParam(params)
    await reviewFlag(req, id, idParam(params, 'fid'), body.note)
    return ok(req, id)
  },
})

// ---------------------------------------------------------------- transfers (T3) + void (T8)

export const transferEndpoint = v1({
  path: '/expense-requests/:id/transfer',
  method: 'post',
  roles: ['pk-finance'],
  body: TransferCreate,
  rateLimit: ACTION_LIMIT,
  transactional: true,
  idempotent: true,
  handler: async ({ req, body, params }) => {
    const id = idParam(params)
    const r = await recordTransfer(req, id, body)
    const t = r.transfer as { id: number; docNo: string }
    return json({ request: await detail(req, id), transferId: t.id, transferDocNo: t.docNo, cashEntryId: r.cashEntry.id, cashEntryNo: r.cashEntry.entryNo }, 201)
  },
})

export const voidTransferEndpoint = v1({
  path: '/expense-requests/:id/transfers/:tid/void',
  method: 'post',
  roles: ['pk-finance'],
  body: ReasonBody,
  rateLimit: ACTION_LIMIT,
  transactional: true,
  idempotent: true,
  handler: async ({ req, body, params }) => {
    const id = idParam(params)
    await voidTransfer(req, id, idParam(params, 'tid'), body.reason)
    return ok(req, id)
  },
})

// ---------------------------------------------------------------- T5 LPJ & settlement (Uang Muka)

export const receiptsCompleteEndpoint = action('receipts-complete', EmptyBody, (req, id) => receiptsComplete(req, id))
export const lpjSubmitEndpoint = action('lpj/submit', LpjSubmitBody, (req, id, b) => submitLpj(req, id, { usageNotes: b.usageNotes }))
export const lpjRevisionEndpoint = action('lpj/request-revision', RevisionBody, (req, id, b) => {
  req.context.auditReason = b.note
  return requestLpjRevision(req, id, b.note)
})
export const lpjVerifyEndpoint = action('lpj/verify', EmptyBody, (req, id) => verifyLpj(req, id))

export const settleEndpoint = v1({
  path: '/expense-requests/:id/settle',
  method: 'post',
  roles: ['pk-finance'],
  body: SettleBody,
  rateLimit: ACTION_LIMIT,
  transactional: true,
  idempotent: true,
  handler: async ({ req, body, params }) => {
    const id = idParam(params)
    const r = await settle(req, id, body)
    return json({
      request: await detail(req, id),
      settlementType: r.type,
      amount: r.amount,
      refundCashEntryId: r.refundEntry?.id ?? null,
      refundCashEntryNo: r.refundEntry?.entryNo ?? null,
      shortfallTransferId: r.shortfall?.id ?? null,
      shortfallTransferNo: r.shortfall?.docNo ?? null,
      shortfallCashEntryId: r.shortfall?.cashEntryId ?? null,
    })
  },
})

export const EXPENSE_ENDPOINTS = [
  listRequestsEndpoint,
  createRequestEndpoint,
  getRequestEndpoint,
  updateRequestEndpoint,
  historyEndpoint,
  transferQueueEndpoint,
  submitEndpoint,
  withdrawEndpoint,
  cancelEndpoint,
  resubmitEndpoint,
  acknowledgeEndpoint,
  approveEndpoint,
  rejectEndpoint,
  completeEndpoint,
  addReceiptEndpoint,
  editReceiptEndpoint,
  removeReceiptEndpoint,
  verifyReceiptEndpoint,
  rejectReceiptEndpoint,
  resubmitReceiptsEndpoint,
  verifyReceiptsEndpoint,
  reviewFlagEndpoint,
  transferEndpoint,
  voidTransferEndpoint,
  receiptsCompleteEndpoint,
  lpjSubmitEndpoint,
  lpjRevisionEndpoint,
  lpjVerifyEndpoint,
  settleEndpoint,
]

