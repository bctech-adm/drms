import type { PayloadRequest } from 'payload'

import { relId, userId } from '@/access/roles'
import { assertAccount, currentLockDate, postEntry } from '@/domain/cash/ledger'
import { allocateDocNo } from '@/domain/numbering-db'
import { parseBusinessDate } from '@/domain/numbering'

import { actorContext, fail, loadRaw, loadVisible, requireAction, requireActionAudited, today, updateRequest, type RequestDoc } from './common'
import { claimMedia, receiptsOf, recomputeFlags } from './receipts'
import { settlementOf, type SettlementStatus, type SettlementType } from './settlement-rules'
import { isBusinessDate } from './types'

/**
 * T5 LPJ & settlement service (requirements v1.1 §7 T5, US-08/US-21/US-22; architecture §5.1,
 * §5.3; ADR 0005 §3). Uang Muka only — the state table rejects every LPJ action on Reimburse.
 * Every function runs inside the caller's request transaction (row lock on the request first),
 * writes through Local API with SYSTEM-WRITE after the guards, and relies on the DB triggers
 * (pk_settlements_guard, pk_transfers_guard, pk_cash_entries_guard) as the last line of defence.
 */
export type SettlementDoc = {
  id: number
  docNo?: string | null
  request: unknown
  status: SettlementStatus
  usageNotes?: string | null
  transferredTotal?: number | null
  receiptsTotal?: number | null
  verifiedReceiptsTotal?: number | null
  difference?: number | null
  settlementType?: SettlementType | null
  financeNotes?: string | null
  submitCount?: number | null
  submittedAt?: string | null
  verifiedAt?: string | null
  settledAt?: string | null
  refundCashEntry?: unknown
  shortfallTransfer?: unknown
}

export async function settlementOfRequest(req: PayloadRequest, requestId: number): Promise<SettlementDoc | null> {
  const res = await req.payload.find({
    collection: 'settlements',
    where: { request: { equals: requestId } },
    limit: 1,
    depth: 0,
    overrideAccess: true, // SYSTEM-READ: LPJ of a request the caller may read (checked by loadVisible)
    req,
  })
  return (res.docs[0] as unknown as SettlementDoc | undefined) ?? null
}

async function updateSettlement(req: PayloadRequest, id: number, data: Record<string, unknown>, reason?: string): Promise<SettlementDoc> {
  if (reason) req.context.auditReason = reason
  return (await req.payload.update({
    collection: 'settlements',
    id,
    data: data as never,
    depth: 0,
    overrideAccess: true, // SYSTEM-WRITE: LPJ transition after guards (DB: pk_settlements_guard)
    req,
  })) as unknown as SettlementDoc
}

async function requireSettlement(req: PayloadRequest, requestId: number, status: SettlementStatus[]): Promise<SettlementDoc> {
  const s = await settlementOfRequest(req, requestId)
  if (!s) fail(409, 'LPJ belum dibuat untuk pengajuan ini.')
  if (!status.includes(s.status)) fail(409, `LPJ berstatus ${s.status}; aksi tidak dapat dilakukan.`)
  return s
}

const sum = (xs: Array<{ amount: number }>) => xs.reduce((a, r) => a + r.amount, 0)

/**
 * POST …/receipts-complete — "Ditransfer" → "Nota Lengkap" (architecture §5.1 DT → NL):
 * requester side declares the receipts complete (min 1 active receipt); the LPJ document is
 * created in Draft with the transferred total.
 */
export async function receiptsComplete(req: PayloadRequest, id: number): Promise<RequestDoc> {
  const doc = await loadVisible(req, id, { lock: true })
  requireAction(await actorContext(req, doc), 'receipts_complete')
  const active = await receiptsOf(req, id, true)
  if (active.length === 0) fail(409, 'Unggah minimal 1 nota sebelum menandai nota lengkap.')
  const raw = await loadRaw(req, id)
  if (!(await settlementOfRequest(req, id))) {
    await req.payload.create({
      collection: 'settlements',
      data: { request: id, status: 'draft', transferredTotal: raw.transferredTotal ?? 0, submitCount: 0 } as never,
      depth: 0,
      overrideAccess: true, // SYSTEM-WRITE: LPJ draft created with "Nota Lengkap" (architecture §5.3)
      req,
    })
  }
  return updateRequest(req, id, { status: 'receipts_complete' })
}

/**
 * POST …/lpj/submit — "Nota Lengkap" | "LPJ Revisi" → "LPJ Diajukan" (US-08). Usage description
 * required at the first submit (kept on resubmit unless sent again). Totals: receipts total =
 * Σ active receipts (pending + valid), provisional difference = transferred − receipts total.
 * LPJ number allocated at the FIRST submit (ADR 0007). Flags recomputed (architecture §5.6).
 */
export async function submitLpj(req: PayloadRequest, id: number, input: { usageNotes?: string | null }) {
  const doc = await loadVisible(req, id, { lock: true })
  requireAction(await actorContext(req, doc), 'lpj_submit')
  const s = await requireSettlement(req, id, ['draft', 'revision'])
  const usageNotes = (input.usageNotes ?? '').trim() || s.usageNotes || ''
  if (usageNotes.length < 3) fail(400, 'Uraian penggunaan dana wajib diisi.', [{ path: 'usageNotes', message: 'Wajib diisi.' }])
  const active = await receiptsOf(req, id, true)
  if (active.length === 0) fail(409, 'LPJ membutuhkan minimal 1 nota.')
  const raw = await loadRaw(req, id)
  const transferred = raw.transferredTotal ?? 0
  const receiptsTotal = sum(active)
  let docNo = s.docNo ?? null
  if (!docNo) docNo = (await allocateDocNo(req, 'settlement', { date: parseBusinessDate(await today(req)), docId: String(s.id) })).docNo
  await updateSettlement(req, s.id, {
    docNo,
    status: 'submitted',
    usageNotes: usageNotes.slice(0, 2000),
    transferredTotal: transferred,
    receiptsTotal,
    difference: transferred - receiptsTotal,
    submitCount: (s.submitCount ?? 0) + 1,
    submittedAt: new Date().toISOString(),
    submittedBy: userId(req),
  })
  const updated = await updateRequest(req, id, { status: 'lpj_submitted' })
  await recomputeFlags(req, id)
  return updated
}

/** POST …/lpj/request-revision — Finance, note required (US-21, G7) → "LPJ Revisi". */
export async function requestLpjRevision(req: PayloadRequest, id: number, note: string) {
  const doc = await loadVisible(req, id, { lock: true })
  await requireActionAudited(req, await actorContext(req, doc), 'lpj_request_revision', doc)
  const s = await requireSettlement(req, id, ['submitted'])
  await updateSettlement(req, s.id, { status: 'revision', financeNotes: note }, note)
  return updateRequest(req, id, { status: 'lpj_revision' }, note)
}

/**
 * POST …/lpj/verify — Finance (US-21): every active receipt decided (valid or rejected; none
 * pending), verified total = Σ valid receipts, difference = transferred − verified. Difference 0
 * → settled immediately and "Selesai"; otherwise "LPJ Terverifikasi" waiting for the settlement.
 */
export async function verifyLpj(req: PayloadRequest, id: number) {
  const doc = await loadVisible(req, id, { lock: true })
  await requireActionAudited(req, await actorContext(req, doc), 'lpj_verify', doc)
  const s = await requireSettlement(req, id, ['submitted'])
  const receipts = await receiptsOf(req, id)
  const pending = receipts.filter((r) => r.status === 'pending')
  if (pending.length > 0) fail(409, `Masih ada ${pending.length} nota yang belum diputuskan (valid/tolak).`)
  const raw = await loadRaw(req, id)
  const transferred = raw.transferredTotal ?? 0
  const verified = sum(receipts.filter((r) => r.status === 'valid'))
  const st = settlementOf(transferred, verified)
  const now = new Date().toISOString()
  await updateSettlement(req, s.id, {
    status: 'verified',
    transferredTotal: transferred,
    verifiedReceiptsTotal: verified,
    difference: st.difference,
    settlementType: st.type,
    verifiedAt: now,
    verifiedBy: userId(req),
  })
  if (st.type === 'none') {
    await updateSettlement(req, s.id, { status: 'settled', settledAt: now, settledBy: userId(req) })
    return updateRequest(req, id, { status: 'completed', verifiedReceiptsTotal: verified })
  }
  return updateRequest(req, id, { status: 'lpj_verified', verifiedReceiptsTotal: verified })
}

export type SettleInput = {
  cashAccountId: number
  /** Refund: date of the KM entry; shortfall: transfer date. Default today (company TZ). */
  date?: string
  /** Shortfall: bank reference of the transfer (required). */
  bankRef?: string
  /** Shortfall: media-transfer-proofs id (required). Refund: media-attachments id (optional, US-23). */
  proofMediaId?: number | null
  /** Optional echo; must equal the computed settlement amount (Finance cannot change it). */
  amount?: number
}

/**
 * POST …/settle — Finance (US-22), "LPJ Terverifikasi" → "Selesai":
 * - surplus (difference > 0): KM "Pengembalian LPJ" cash-in of the difference (ADR 0005 §3,
 *   sourceType settlement_refund, proof optional — architecture §5.1 note);
 * - shortfall (difference < 0): T3 transfer `lpj_shortfall` of the difference to the request's
 *   bank snapshot + automatic KK (proof + bank reference required, like US-20).
 * Amount is always computed server-side; the period lock applies (G5, DB-enforced).
 */
export async function settle(req: PayloadRequest, id: number, input: SettleInput) {
  const doc = await loadVisible(req, id, { lock: true })
  await requireActionAudited(req, await actorContext(req, doc), 'settle', doc)
  const s = await requireSettlement(req, id, ['verified'])
  const raw = await loadRaw(req, id)
  const st = settlementOf(s.transferredTotal ?? 0, s.verifiedReceiptsTotal ?? 0)
  if (input.amount !== undefined && input.amount !== st.amount) fail(409, `Nominal penyelesaian harus ${st.amount} (dihitung server).`)
  const todayDate = await today(req)
  const date = input.date ?? todayDate
  if (!isBusinessDate(date)) fail(400, 'Tanggal harus YYYY-MM-DD.')
  if (date > todayDate) fail(400, 'Tanggal tidak boleh di masa depan.')
  await assertAccount(req, input.cashAccountId)
  const lock = await currentLockDate(req)
  if (lock && date <= lock) fail(409, `Periode ${date.slice(0, 7)} sudah ditutup (tutup buku s/d ${lock}).`)
  const lpjNo = s.docNo ?? ''
  const label = `${lpjNo} — ${raw.docNo ?? ''} ${raw.title}`.slice(0, 900)
  const data: Record<string, unknown> = { status: 'settled', settledAt: new Date().toISOString(), settledBy: userId(req) }
  let transferredTotal = raw.transferredTotal ?? 0
  let refundEntry: { id: number; entryNo: string } | null = null
  let shortfall: { id: number; docNo: string; cashEntryId: number; cashEntryNo: string } | null = null

  if (st.type === 'refund') {
    const source = await req.payload.find({
      collection: 'cash-in-sources',
      where: { code: { equals: 'LPJ' } },
      limit: 1,
      depth: 0,
      overrideAccess: true, // SYSTEM-READ: master "Pengembalian LPJ" (seed/data.ts)
      req,
    })
    const sourceId = (source.docs[0] as { id: number } | undefined)?.id
    if (!sourceId) fail(409, 'Sumber kas masuk "Pengembalian LPJ" (kode LPJ) belum ada di master.')
    if (input.proofMediaId) await claimMedia(req, 'media-attachments', input.proofMediaId, id)
    const entry = await postEntry(req, {
      direction: 'in',
      entryDate: date,
      cashAccountId: input.cashAccountId,
      amount: st.amount,
      cashInSourceId: sourceId,
      projectId: relId(raw.project) ?? null,
      costCenterId: relId(raw.costCenter) ?? null,
      description: `Pengembalian LPJ ${label}`,
      proofId: input.proofMediaId ?? null,
      sourceType: 'settlement_refund',
      expenseRequestId: id,
    })
    data.refundCashEntry = entry.id
    refundEntry = { id: entry.id, entryNo: entry.entryNo }
  } else if (st.type === 'shortfall') {
    const bankRef = (input.bankRef ?? '').trim()
    if (!bankRef) fail(400, 'Nomor referensi bank wajib diisi untuk transfer kekurangan.', [{ path: 'bankRef', message: 'Wajib.' }])
    if (!input.proofMediaId) fail(400, 'Bukti transfer wajib untuk transfer kekurangan.', [{ path: 'proofMediaId', message: 'Wajib.' }])
    if (!raw.bankSnapshot?.accountNo) fail(409, 'Rekening tujuan belum tersimpan pada pengajuan.')
    const { docNo } = await allocateDocNo(req, 'transfer', { date: parseBusinessDate(date) })
    await claimMedia(req, 'media-transfer-proofs', input.proofMediaId, id)
    const transfer = (await req.payload.create({
      collection: 'transfers',
      data: {
        docNo,
        request: id,
        kind: 'lpj_shortfall',
        cashAccount: input.cashAccountId,
        amount: st.amount,
        destination: { ...raw.bankSnapshot },
        bankRef,
        proof: input.proofMediaId,
        transferDate: date,
        postedBy: userId(req),
        status: 'posted',
      } as never,
      depth: 0,
      overrideAccess: true, // SYSTEM-WRITE: shortfall transfer after guards (DB: amount = LPJ shortfall)
      req,
    })) as unknown as { id: number; docNo: string }
    const categories = [...new Set((raw.lines ?? []).map((l) => relId(l.category)).filter((x): x is number => x !== undefined))]
    const entry = await postEntry(req, {
      direction: 'out',
      entryDate: date,
      cashAccountId: input.cashAccountId,
      amount: st.amount,
      categoryId: categories.length === 1 ? categories[0] : null,
      projectId: relId(raw.project) ?? null,
      costCenterId: relId(raw.costCenter) ?? null,
      description: `Transfer kekurangan LPJ ${docNo} — ${label}`.slice(0, 1000),
      sourceType: 'transfer',
      expenseRequestId: id,
      transferId: transfer.id,
    })
    await req.payload.update({
      collection: 'transfers',
      id: transfer.id,
      data: { cashEntry: entry.id } as never,
      depth: 0,
      overrideAccess: true, // SYSTEM-WRITE: link the KK entry (DB: cash_entry_id set once)
      req,
    })
    data.shortfallTransfer = transfer.id
    transferredTotal += st.amount
    shortfall = { id: transfer.id, docNo: transfer.docNo, cashEntryId: entry.id, cashEntryNo: entry.entryNo }
  }

  const settlement = await updateSettlement(req, s.id, data)
  const request = await updateRequest(req, id, { status: 'completed', transferredTotal })
  return { settlement, request, refundEntry, shortfall, type: st.type, amount: st.amount }
}
