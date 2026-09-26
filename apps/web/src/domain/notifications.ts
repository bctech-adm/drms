import type { PayloadRequest } from 'payload'

import { relId, userId, type Role } from '@/access/roles'
import { formatRupiah } from '@/lib/money'

import type { ApprovalSnapshot } from './expense/rules'
import { REQUEST_TYPE_LABELS, statusLabel, type RequestStatus, type RequestType } from './expense/types'

/**
 * In-app notifications on T1/T5 status transitions (requirements v1.1 US-05 "push … di setiap
 * perpindahan status ke semua pemohon", US-19/US-26/US-41; ADR 0011 §5). Called from the
 * expense-requests afterChange hook → same transaction as the transition (no notification without
 * the change, and vice versa). Recipients are computed server-side by role + scope; the actor is
 * never notified about their own action. Text: `notification-templates` row of the event when
 * active (placeholders {docNo} {title} {amount} {status} {type}), else the defaults below.
 *
 * Push (FCM) arrives in F4: rows are written with pushStatus `skipped` unless PUSH_FCM_ENABLED=true,
 * in which case they are `pending` for the F4 dispatcher job (ADR 0011 §5 pipeline hook).
 */
export type NotifyEvent =
  | 'expense.pending_ack'
  | 'expense.pending_approval'
  | 'expense.approved'
  | 'expense.rejected'
  | 'expense.cancelled'
  | 'expense.receipt_revision'
  | 'expense.receipts_verified'
  | 'expense.transfer_queue'
  | 'expense.receipts_to_verify'
  | 'expense.transferred'
  | 'expense.lpj_submitted'
  | 'expense.lpj_revision'
  | 'expense.lpj_verified'
  | 'expense.completed'

const DEFAULTS: Record<NotifyEvent, { title: string; body: string }> = {
  // ADR 0013 §10: "Diketahui" is the Direktur's approval; recipients = active Direktur (pk-owner)
  // holders minus requester/creator. pending_approval → active Finance holders (never the PM).
  'expense.pending_ack': { title: 'Persetujuan Direktur: {docNo}', body: '{docNo} menunggu persetujuan Anda sebagai Direktur: {type} "{title}" {amount}.' },
  'expense.pending_approval': { title: 'Menunggu Approval: {docNo}', body: '{type} "{title}" {amount} menunggu persetujuan Anda.' },
  'expense.approved': { title: 'Disetujui: {docNo}', body: 'Pengajuan "{title}" {amount} disetujui.' },
  'expense.rejected': { title: 'Ditolak: {docNo}', body: 'Pengajuan "{title}" ditolak. Lihat alasan di detail pengajuan.' },
  'expense.cancelled': { title: 'Dibatalkan: {docNo}', body: 'Pengajuan "{title}" dibatalkan.' },
  'expense.receipt_revision': { title: 'Revisi Nota: {docNo}', body: 'Finance menolak nota pada pengajuan "{title}". Perbaiki nota lalu kirim ulang.' },
  'expense.receipts_verified': { title: 'Nota terverifikasi: {docNo}', body: 'Nota pengajuan "{title}" terverifikasi; menunggu transfer.' },
  'expense.transfer_queue': { title: 'Antri transfer: {docNo}', body: '{type} "{title}" {amount} siap ditransfer.' },
  'expense.receipts_to_verify': { title: 'Verifikasi nota: {docNo}', body: 'Reimburse "{title}" {amount} disetujui; nota menunggu verifikasi Finance.' },
  'expense.transferred': { title: 'Dana ditransfer: {docNo}', body: 'Dana pengajuan "{title}" telah ditransfer.' },
  'expense.lpj_submitted': { title: 'LPJ diajukan: {docNo}', body: 'LPJ pengajuan "{title}" menunggu verifikasi Finance.' },
  'expense.lpj_revision': { title: 'LPJ perlu revisi: {docNo}', body: 'Finance meminta revisi LPJ "{title}". Lihat catatan revisi.' },
  'expense.lpj_verified': { title: 'LPJ terverifikasi: {docNo}', body: 'LPJ "{title}" terverifikasi; menunggu penyelesaian selisih.' },
  'expense.completed': { title: 'Selesai: {docNo}', body: 'Pengajuan "{title}" selesai.' },
}

type Doc = {
  id: number
  docNo?: string | null
  type: RequestType
  status: RequestStatus
  title: string
  grandTotal?: number | null
  approvedAmount?: number | null
  requesters?: unknown[] | null
  createdBy?: unknown
  currentLevel?: number | null
  approvalSnapshot?: ApprovalSnapshot | null
}

async function usersWithRole(req: PayloadRequest, role: Role): Promise<number[]> {
  const res = await req.payload.find({
    collection: 'users',
    where: { and: [{ roles: { in: [role] } }, { active: { equals: true } }] },
    depth: 0,
    pagination: false,
    select: { email: true },
    overrideAccess: true, // SYSTEM-READ: notification recipients by role
    req,
  })
  return res.docs.map((d) => d.id as number)
}

/** "Diajukan Oleh" employees' active user accounts + "Dibuat Oleh". */
async function people(req: PayloadRequest, doc: Doc): Promise<number[]> {
  const empIds = (doc.requesters ?? []).map((r) => relId(r)).filter((x): x is number => x !== undefined)
  const out = new Set<number>()
  const creator = relId(doc.createdBy)
  if (creator !== undefined) out.add(creator)
  if (empIds.length > 0) {
    const res = await req.payload.find({
      collection: 'users',
      where: { and: [{ employee: { in: empIds } }, { active: { equals: true } }] },
      depth: 0,
      pagination: false,
      select: { email: true },
      overrideAccess: true, // SYSTEM-READ: requester accounts (Q-28: employees without account get nothing)
      req,
    })
    for (const u of res.docs) out.add(u.id as number)
  }
  return [...out]
}

async function stepUsers(req: PayloadRequest, doc: Doc, kind: 'ack' | 'approval'): Promise<number[]> {
  const snap = doc.approvalSnapshot
  if (!snap) return []
  let ids: number[] = []
  if (kind === 'ack') {
    if (snap.acknowledgerUserId !== null) ids = [snap.acknowledgerUserId]
    else if (snap.acknowledgeBy === 'role' && snap.acknowledgeRole) ids = await usersWithRole(req, snap.acknowledgeRole)
  } else {
    const step = snap.steps.find((s) => s.level === (doc.currentLevel ?? 1))
    if (step?.approverUserId) ids = [step.approverUserId]
    else if (step?.approverRole) ids = await usersWithRole(req, step.approverRole)
  }
  // G1: requesters/creator can never decide → never asked to.
  const excluded = new Set(await people(req, doc))
  return ids.filter((x) => !excluded.has(x))
}

/** Events + recipients of one transition (pure mapping; recipients resolved lazily). */
export function eventsFor(prev: { status: RequestStatus; currentLevel?: number | null } | null, doc: Doc): Array<{ event: NotifyEvent; to: 'people' | 'finance' | 'ack' | 'approval' }> {
  const changed = !prev || prev.status !== doc.status
  if (!changed) {
    // multi-level approval: next level is waiting
    if (doc.status === 'pending_approval' && prev && prev.currentLevel !== doc.currentLevel) return [{ event: 'expense.pending_approval', to: 'approval' }]
    return []
  }
  switch (doc.status) {
    case 'pending_ack':
      return [{ event: 'expense.pending_ack', to: 'ack' }]
    case 'pending_approval':
      return [{ event: 'expense.pending_approval', to: 'approval' }]
    case 'approved':
      if (prev?.status === 'receipt_revision' || prev?.status === 'receipts_verified' || prev?.status === 'transferred') {
        return doc.type === 'advance' ? [{ event: 'expense.transfer_queue', to: 'finance' }] : [{ event: 'expense.receipts_to_verify', to: 'finance' }]
      }
      return [
        { event: 'expense.approved', to: 'people' },
        doc.type === 'advance' ? { event: 'expense.transfer_queue', to: 'finance' } : { event: 'expense.receipts_to_verify', to: 'finance' },
      ]
    case 'rejected':
      return [{ event: 'expense.rejected', to: 'people' }]
    case 'cancelled':
      return [{ event: 'expense.cancelled', to: 'people' }]
    case 'receipt_revision':
      return [{ event: 'expense.receipt_revision', to: 'people' }]
    case 'receipts_verified':
      return [
        { event: 'expense.receipts_verified', to: 'people' },
        { event: 'expense.transfer_queue', to: 'finance' },
      ]
    case 'transferred':
      return [{ event: 'expense.transferred', to: 'people' }]
    case 'lpj_submitted':
      return [{ event: 'expense.lpj_submitted', to: 'finance' }]
    case 'lpj_revision':
      return [{ event: 'expense.lpj_revision', to: 'people' }]
    case 'lpj_verified':
      return [{ event: 'expense.lpj_verified', to: 'people' }]
    case 'completed':
      return [{ event: 'expense.completed', to: 'people' }]
    default:
      return [] // draft (withdraw), receipts_complete: nobody to inform
  }
}

export function renderTemplate(tpl: string, doc: Doc): string {
  const vars: Record<string, string> = {
    docNo: doc.docNo ?? `#${doc.id}`,
    title: doc.title,
    amount: formatRupiah(doc.approvedAmount ?? doc.grandTotal ?? 0),
    status: statusLabel(doc.type, doc.status),
    type: REQUEST_TYPE_LABELS[doc.type],
  }
  return tpl.replace(/\{(docNo|title|amount|status|type)\}/g, (_, k: string) => vars[k] ?? '')
}

async function template(req: PayloadRequest, event: NotifyEvent): Promise<{ title: string; body: string }> {
  const res = await req.payload.find({
    collection: 'notification-templates',
    where: { and: [{ event: { equals: event } }, { active: { equals: true } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true, // SYSTEM-READ: admin-maintained texts
    req,
  })
  const t = res.docs[0] as { title?: string; body?: string; channel?: string } | undefined
  return t?.title && t.body ? { title: t.title, body: t.body } : DEFAULTS[event]
}

export function pushEnabled(): boolean {
  return process.env.PUSH_FCM_ENABLED === 'true'
}

/** Creates the in-app rows of one transition. Returns the number of rows written. */
export async function notifyTransition(req: PayloadRequest, prev: { status: RequestStatus; currentLevel?: number | null } | null, doc: Doc): Promise<number> {
  const events = eventsFor(prev, doc)
  if (events.length === 0) return 0
  const actor = userId(req)
  let finance: number[] | null = null
  let written = 0
  const done = new Set<string>()
  for (const e of events) {
    let to: number[] = []
    if (e.to === 'people') to = await people(req, doc)
    else if (e.to === 'finance') to = finance ??= await usersWithRole(req, 'pk-finance')
    else to = await stepUsers(req, doc, e.to)
    const t = await template(req, e.event)
    for (const uid of to) {
      if (uid === actor || done.has(`${e.event}:${uid}`)) continue
      done.add(`${e.event}:${uid}`)
      await req.payload.create({
        collection: 'notifications',
        data: {
          user: uid,
          event: e.event,
          title: renderTemplate(t.title, doc).slice(0, 160),
          body: renderTemplate(t.body, doc).slice(0, 1000),
          docType: 'expense_request',
          docId: String(doc.id),
          docNo: doc.docNo ?? null,
          pushStatus: pushEnabled() ? 'pending' : 'skipped',
        } as never,
        depth: 0,
        overrideAccess: true, // SYSTEM-WRITE: in-app notification of a committed-together transition
        req,
      })
      written++
    }
  }
  return written
}
