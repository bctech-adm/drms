import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { submit } from '@/domain/expense/workflow'
import { normalizePlate } from '@/domain/plates'
import { FORM_228 } from '@/seed/form-fixture'

import { getTestPayload, installFakeKeycloak, sqlAs } from './helpers'
import { api, asUser, makeFlowUser, png, upload, type FlowUser } from './flow-world'
import { DEFAULT_APPROVAL_RULES } from '@/seed/data'
import { seed } from '@/seed/seed'

/**
 * F2 acceptance fixture: the client's form 228/PB-DRMS/20/IX/2026 (FORM_228, fictional names of
 * seed/data.ts) reproduced end to end through the real API: number + date registered historically
 * WITHOUT touching the live PB counter, grand total Rp 1.447.500, the three expected flags, then
 * Diketahui → Approval → Finance receipt verification → transfer (KK posted) → Selesai.
 */
type Ids = Record<string, number>
const emp: Ids = {}
const m: Ids = {}
let citra: FlowUser, budiH: FlowUser, sari: FlowUser, finance: FlowUser
let requestId: number
let lineIds: string[] = []
let counterBefore: number | null

afterAll(async () => {
  await (await getTestPayload()).destroy()
})

async function idOf(collection: 'employees' | 'uoms' | 'expense-categories' | 'cost-centers' | 'vehicles' | 'employee-bank-accounts', field: string, value: string) {
  const p = await getTestPayload()
  const r = await p.find({ collection, where: { [field]: { equals: value } }, limit: 1, depth: 0, overrideAccess: true /* SYSTEM-READ: fixture */ })
  return r.docs[0]!.id as number
}

beforeAll(async () => {
  const p = await getTestPayload()
  installFakeKeycloak()
  await seed(p)
  for (const c of ['EMP-001', 'EMP-002', 'EMP-003', 'EMP-004', 'EMP-005']) emp[c] = await idOf('employees', 'code', c)
  citra = await makeFlowUser(['pk-admin'], 'citra', emp['EMP-003']!)
  budiH = await makeFlowUser(['pk-pm'], 'budi-hartono', emp['EMP-004']!)
  sari = await makeFlowUser(['pk-owner'], 'sari', emp['EMP-005']!)
  finance = await makeFlowUser(['pk-finance'], 'finance-228', null)
  m.cc = await idOf('cost-centers', 'code', FORM_228.costCenterCode)
  // Q-07 default: "Diketahui Oleh" = the cost center's manager (Budi Hartono on the form).
  await p.update({ collection: 'cost-centers', id: m.cc, data: { manager: budiH.id }, overrideAccess: true /* SYSTEM-WRITE: fixture */ })
  // The seeded default rule (Q-31 Owner-only, Q-07 Diketahui required) scoped to OPS-PB so that
  // generic rules created by other test files sharing the DB cannot win the tie.
  const def = (await p.find({ collection: 'approval-rules', where: { name: { equals: DEFAULT_APPROVAL_RULES[0].name } }, limit: 1, depth: 0, overrideAccess: true /* SYSTEM-READ: fixture */ })).docs[0]!
  await p.create({
    collection: 'approval-rules',
    data: { ...DEFAULT_APPROVAL_RULES[0], steps: [...DEFAULT_APPROVAL_RULES[0].steps], name: 'Form 228 — default untuk OPS-PB', costCenter: m.cc, priority: 1 } as never,
    overrideAccess: true, // SYSTEM-WRITE: fixture
  })
  expect(def.acknowledge).toBe('required')
  m.bank = await idOf('employee-bank-accounts', 'accountNo', FORM_228.bankAccountNo)
  m.vehicle = await idOf('vehicles', 'plateNo', normalizePlate('DA 1234 XY'))
  for (const c of ['BLN', 'KMR']) m[`uom:${c}`] = await idOf('uoms', 'code', c)
  for (const c of ['BBM', 'INAP', 'KSM']) m[`cat:${c}`] = await idOf('expense-categories', 'code', c)
  const cnt = await sqlAs('app', "SELECT next_value FROM document_sequence_counters WHERE doc_type = 'expense_request'")
  counterBefore = cnt.rows[0]?.next_value ?? null
})

describe('form 228/PB-DRMS/20/IX/2026 (F2 acceptance fixture)', () => {
  it('Citra (Admin) creates the draft on behalf of "Budi, Doni" (Q-09), grand total Rp 1.447.500 server-side', async () => {
    const r = await api('POST', '/api/v1/expense-requests', citra, {
      type: FORM_228.type,
      title: FORM_228.title,
      costCenterId: m.cc,
      requesterIds: FORM_228.requesterCodes.map((c) => emp[c]),
      bankAccountId: m.bank,
      lines: FORM_228.lines.map((l) => ({
        description: l.description,
        qty: l.qty,
        uomId: l.uomCode ? m[`uom:${l.uomCode}`] : null,
        unitPrice: l.unitPrice,
        total: l.total,
        categoryId: m[`cat:${l.categoryCode}`],
        vehicleId: l.vehiclePlate ? m.vehicle : null,
      })),
    })
    expect(r.status, JSON.stringify(r.body)).toBe(201)
    requestId = r.body.id
    lineIds = r.body.lines.map((l: { id: string }) => l.id)
    expect(r.body).toMatchObject({ status: 'draft', docNo: null, grandTotal: FORM_228.grandTotal, createdBy: { id: citra.id } })
    expect(r.body.requesters.map((x: { name: string }) => x.name)).toEqual(['Budi', 'Doni Pratama'])
    expect(r.body.lines.map((l: { unitPriceDisplay: number | null }) => l.unitPriceDisplay)).toEqual([600_000, 339_000, null])
  })

  it('receipts are attached per line (Reimburse: required before submit, US-38)', async () => {
    for (const [i, rc] of FORM_228.receipts.entries()) {
      const img = await upload('/api/v1/media/receipts', citra, await png(9000 + i, 3000, 2000))
      expect(img.status).toBe(201)
      expect(Math.max(img.body.width, img.body.height)).toBeLessThanOrEqual(2000) // resized, original discarded
      const r = await api('POST', `/api/v1/expense-requests/${requestId}/receipts`, citra, {
        lineId: lineIds[rc.line],
        receiptNo: rc.receiptNo,
        vendorName: rc.vendorName,
        receiptDate: rc.receiptDate,
        receiptTime: rc.receiptTime,
        amount: rc.amount,
        taxAmount: rc.taxAmount,
        imageId: img.body.id,
      })
      expect(r.status, JSON.stringify(r.body)).toBe(201)
    }
  })

  it('submitted with the historical number/date; live PB counter untouched', async () => {
    const doc = await asUser(citra, (req) => submit(req, requestId, { historical: { seq: FORM_228.seq, requestDate: FORM_228.requestDate } }))
    expect(doc.docNo).toBe(FORM_228.docNo)
    expect(doc.requestDate).toBe('2026-09-20')
    expect(doc.status).toBe('pending_ack')
    const cnt = await sqlAs('app', "SELECT next_value FROM document_sequence_counters WHERE doc_type = 'expense_request'")
    expect(cnt.rows[0]?.next_value ?? null).toBe(counterBefore)
  })

  it('detail shows the form: number, Rp 1.447.500, transfer box, signatures Diajukan (Budi, diwakili) + Dibuat (Citra)', async () => {
    const r = await api('GET', `/api/v1/expense-requests/${requestId}`, citra)
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({
      docNo: '228/PB-DRMS/20/IX/2026',
      grandTotal: 1_447_500,
      bank: { bankName: 'Bank Mandiri', accountNo: '1234567890123', accountHolder: 'Doni Pratama' },
      approvalRule: { acknowledge: 'required', acknowledgerUserId: budiH.id },
    })
    const signed = r.body.approvals.map((a: { position: string; decision: string; onBehalf: boolean; employeeId: number | null }) => [a.position, a.decision, a.onBehalf, a.employeeId])
    expect(signed).toEqual(
      expect.arrayContaining([
        ['dibuat', 'signed', false, null],
        ['diajukan', 'signed', true, emp['EMP-001']],
      ]),
    )
  })

  it('flags: hotel Rp 124 → info (tolerance Rp 1.000, Q-14); receipts 21/09 after 20/09; BBM "bulan" unusual', async () => {
    const r = await api('GET', `/api/v1/expense-requests/${requestId}`, finance)
    const flags = r.body.flags as Array<{ kind: string; level: string; lineNo: number; receiptId: number | null; message: string }>
    const amount = flags.filter((f) => f.kind === 'amount_diff')
    expect(amount).toEqual([expect.objectContaining({ lineNo: 2, level: 'info' })])
    expect(amount[0]!.message).toContain('Rp 124')
    const dates = flags.filter((f) => f.kind === 'date_after_request')
    expect(dates.map((f) => f.lineNo).sort()).toEqual([1, 3]) // BBM + meal 21/09; hotel 20/09 not flagged
    expect(flags.filter((f) => f.kind === 'uom_suspicious')).toEqual([expect.objectContaining({ lineNo: 1, level: 'warning' })])
    expect(flags).toHaveLength(4)
    expect(r.body.openWarningFlags).toBe(3)
  })

  it('Diketahui (Budi Hartono) → Approval (Sari, Owner): cost center has no budget (Q-24), open flags recorded', async () => {
    expect((await api('POST', `/api/v1/expense-requests/${requestId}/approve`, sari, {})).status).toBe(409) // Diketahui first
    const ack = await api('POST', `/api/v1/expense-requests/${requestId}/acknowledge`, budiH, {})
    expect(ack.status, JSON.stringify(ack.body)).toBe(200)
    expect(ack.body.status).toBe('pending_approval')
    const ok = await api('POST', `/api/v1/expense-requests/${requestId}/approve`, sari, {})
    expect(ok.status, JSON.stringify(ok.body)).toBe(200)
    expect(ok.body).toMatchObject({ status: 'approved', approvedAmount: 1_447_500, budget: { basis: 'none', pctBefore: null } })
    const appr = ok.body.approvals.find((a: { position: string }) => a.position === 'approval')
    expect(appr).toMatchObject({ actorId: sari.id, decision: 'approved', openFlags: 3, budgetPctBefore: null })
  })

  it('Finance verifies receipts + reviews warnings → "Nota Terverifikasi", transfers Rp 1.447.500 (KK posted), requester closes', async () => {
    const d = (await api('GET', `/api/v1/expense-requests/${requestId}`, finance)).body
    expect((await api('POST', `/api/v1/expense-requests/${requestId}/verify-receipts`, finance, {})).status).toBe(409) // receipts pending
    for (const rc of d.receipts) expect((await api('POST', `/api/v1/expense-requests/${requestId}/receipts/${rc.id}/verify`, finance, {})).status).toBe(200)
    expect((await api('POST', `/api/v1/expense-requests/${requestId}/verify-receipts`, finance, {})).status).toBe(409) // warnings open
    for (const f of d.flags.filter((x: { level: string }) => x.level === 'warning')) {
      expect((await api('POST', `/api/v1/expense-requests/${requestId}/flags/${f.id}/review`, finance, { note: 'dicek, wajar' })).status).toBe(200)
    }
    const v = await api('POST', `/api/v1/expense-requests/${requestId}/verify-receipts`, finance, {})
    expect(v.status, JSON.stringify(v.body)).toBe(200)
    expect(v.body.statusLabel).toBe('Nota Terverifikasi (Antri Transfer)')

    const p = await getTestPayload()
    const acct = (await p.find({ collection: 'cash-accounts', where: { name: { equals: 'Bank Operasional' } }, limit: 1, overrideAccess: true /* SYSTEM-READ */ })).docs[0]!.id
    const proof = await upload('/api/v1/media/transfer-proofs', finance, await png(9100))
    expect(proof.status, JSON.stringify(proof.body)).toBe(201)
    const t = await api('POST', `/api/v1/expense-requests/${requestId}/transfer`, finance, { cashAccountId: acct, bankRef: 'MDR-228-001', proofMediaId: proof.body.id })
    expect(t.status, JSON.stringify(t.body)).toBe(201)
    expect(t.body.request).toMatchObject({ status: 'transferred', transferredTotal: 1_447_500 })
    expect(t.body.cashEntryNo).toMatch(/^KK\/\d{4}\/\d{4}$/)
    const kk = await sqlAs('app', 'SELECT direction, amount::int, source_type, expense_request_id, cost_center_id FROM cash_entries WHERE id = $1', [t.body.cashEntryId])
    expect(kk.rows[0]).toEqual({ direction: 'out', amount: 1_447_500, source_type: 'transfer', expense_request_id: requestId, cost_center_id: m.cc })

    const budi = await makeFlowUser(['pk-staff'], 'budi', emp['EMP-001']!)
    const done = await api('POST', `/api/v1/expense-requests/${requestId}/complete`, budi, {})
    expect(done.status, JSON.stringify(done.body)).toBe(200)
    expect(done.body.status).toBe('completed')
  })

  it('duplicate receipt (US-50): the Soto receipt TX0101.0001.000123 / Rp 170.500 reused → flag pointing to 228', async () => {
    const r = await api('POST', '/api/v1/expense-requests', citra, {
      type: 'reimburse',
      title: 'Makan siang lagi',
      costCenterId: m.cc,
      requesterIds: [emp['EMP-002']],
      bankAccountId: m.bank,
      lines: [{ description: 'Makan siang', total: 170_500, categoryId: m['cat:KSM'] }],
    })
    expect(r.status).toBe(201)
    const img = await upload('/api/v1/media/receipts', citra, await png(7777))
    const add = await api('POST', `/api/v1/expense-requests/${r.body.id}/receipts`, citra, {
      lineId: r.body.lines[0].id,
      receiptNo: 'TX0101.0001.000123',
      vendorName: 'Soto "Mas Joko" Banjarmasin',
      receiptDate: '2026-09-21',
      amount: 170_500,
      imageId: img.body.id,
    })
    expect(add.status).toBe(201)
    const dup = add.body.flags.find((f: { kind: string }) => f.kind === 'duplicate')
    expect(dup).toMatchObject({ level: 'warning', relatedRequestId: requestId })
    expect(dup.message).toContain('228/PB-DRMS/20/IX/2026')
  })
})
