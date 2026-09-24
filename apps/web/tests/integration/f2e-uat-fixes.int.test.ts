import { randomUUID } from 'node:crypto'

import { createLocalReq } from 'payload'
import { renderToString } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { ResubmitOfField } from '@/admin/components/ResubmitOfField'
import { WorkflowPanel } from '@/admin/components/WorkflowPanel'
import { addDays } from '@/domain/expense/types'
import { buildPdfData } from '@/pdf/data'

import { auditRows, getTestPayload, sqlAs, sqlError } from './helpers'
import { api, asUser, draftBody, makeFlowUser, makeWorld, png, sysCreate, upload, type FlowUser, type World } from './flow-world'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }))

/**
 * F2e — final-UAT fixes:
 * 1. "Diketahui Oleh" fallback (user decision option a): PM / penanggung jawab is a requester or
 *    the creator → submit OK, "Diketahui" delegated to an Owner (else Admin), never the person who
 *    must also approve; G1 negatives; audit + timeline + PDF record the delegation.
 * 2. "Pengajuan ulang dari" shows the old request's NUMBER + title (panel banner + form field).
 * 5. Finance cannot verify receipts / review flags on its own request (domain 403 + audited
 *    denied attempt + DB trigger).
 */
let w: World
let accPm: number
let ccOwnerApprover: number
const E = '/api/v1/expense-requests'
const key = () => ({ 'Idempotency-Key': randomUUID() })
const yesterday = () => addDays(new Date().toISOString().slice(0, 10), -1)

beforeAll(async () => {
  w = await makeWorld('FE')
  // The world's PM is also the MANAGER of the world's cost center (Q-07 acknowledger) → a request
  // with the PM as "Diajukan Oleh" on that cost center is the UAT case.
  const bank = (await sqlAs('app', "SELECT id FROM banks WHERE code = 'MANDIRI'")).rows[0].id as number
  accPm = await sysCreate('employee-bank-accounts', { employee: w.emp.pm, bank, accountNo: `8${Date.now() % 1e9}3`, accountHolder: 'FE PM', isDefault: true })
  // Second cost center (same manager) whose rule names the world's Owner as THE approver.
  ccOwnerApprover = await sysCreate('cost-centers', { code: 'FE-CC2', name: 'FE Ops 2', manager: w.users.pm.id })
  await sysCreate('approval-rules', {
    docType: 'expense_request',
    requestType: 'any',
    priority: 5,
    costCenter: ccOwnerApprover,
    acknowledge: 'required',
    acknowledgeBy: 'scope_manager',
    active: true,
    name: 'FE rule approver = named Owner',
    minAmount: 0,
    steps: [{ level: 1, approverUser: w.users.owner.id }],
  })
})

afterAll(async () => {
  await (await getTestPayload()).destroy()
})

/** Draft by `creator` (Admin/Finance, Q-09) for the PM as requester on a cost center; submitted. */
async function pmRequest(creator: FlowUser, costCenterId: number, submitStatus = 200) {
  const d = await api('POST', E, creator, draftBody(w, { projectId: undefined, costCenterId, requesterIds: [w.emp.pm], bankAccountId: accPm }), key())
  expect(d.status, JSON.stringify(d.body)).toBe(201)
  const s = await api('POST', `${E}/${d.body.id}/submit`, creator, {}, key())
  expect(s.status, JSON.stringify(s.body)).toBe(submitStatus)
  return { id: d.body.id as number, submit: s }
}

async function panelHtml(user: FlowUser, id: number): Promise<string> {
  const req = await createLocalReq({ user: { ...user, collection: 'users' } as never }, await getTestPayload())
  const el = await WorkflowPanel({ req, id, operation: 'update' } as never)
  return el ? renderToString(el) : ''
}

/** Temporarily deactivates every active user of `role` except `keep` (restored afterwards). */
async function onlyActive<T>(role: string, keep: number[], fn: () => Promise<T>): Promise<T> {
  const r = await sqlAs('app', `SELECT u.id FROM users u JOIN users_roles r ON r.parent_id = u.id WHERE r.value = $1 AND u.active AND NOT (u.id = ANY($2::int[]))`, [role, keep])
  const ids = r.rows.map((x) => x.id as number)
  if (ids.length) await sqlAs('app', 'UPDATE users SET active = false WHERE id = ANY($1::int[])', [ids])
  try {
    return await fn()
  } finally {
    if (ids.length) await sqlAs('app', 'UPDATE users SET active = true WHERE id = ANY($1::int[])', [ids])
  }
}

describe('F2e acknowledger fallback (Q-07/Q-08, option a)', () => {
  it('PM as requester on his cost center: submit OK, "Diketahui" delegated to Owner; requester cannot acknowledge; Owner acknowledges; a DIFFERENT Owner approves', async () => {
    const { id, submit } = await pmRequest(w.users.admin, w.costCenter)
    expect(submit.body.status).toBe('pending_ack')
    expect(submit.body.approvalRule).toMatchObject({
      acknowledge: 'required',
      acknowledgerUserId: null,
      acknowledgeDelegatedTo: 'owner',
      acknowledgeDelegationReason: 'PM/penanggung jawab adalah pemohon/pembuat (Q-07/Q-08)',
    })
    const snap = (await sqlAs('app', 'SELECT approval_snapshot AS s FROM expense_requests WHERE id = $1', [id])).rows[0].s
    expect(snap.acknowledgeDelegateUserIds).toEqual(expect.arrayContaining([w.users.owner.id, w.users.owner2.id]))
    expect(snap.acknowledgeOriginalUserId).toBe(w.users.pm.id)
    const delegated = (await auditRows('expense_request', id)).find((r) => r.action === 'acknowledge_delegated')
    expect(delegated?.reason).toBe('PM/penanggung jawab adalah pemohon/pembuat (Q-07/Q-08)')
    expect(delegated?.new_value?.v).toMatchObject({ delegatedTo: 'owner' })

    // timeline: "Giliran: Owner — Diketahui (dilimpahkan)"
    const html = await panelHtml(w.users.admin, id)
    expect(html.replace(/<!-- -->/g, '')).toMatch(/Giliran: <strong>Owner<\/strong> — Diketahui \(dilimpahkan\)/)

    // G1: the PM (requester) may not acknowledge — 403 and an audited denied attempt
    const denied = await api('POST', `${E}/${id}/acknowledge`, w.users.pm, {}, key())
    expect(denied.status).toBe(403)
    expect((await auditRows('expense_request', id)).some((r) => r.action === 'access_denied' && r.field === 'acknowledge' && r.user_id === String(w.users.pm.id))).toBe(true)
    // neither may the creator (Admin), nor Finance (not a delegate)
    expect((await api('POST', `${E}/${id}/acknowledge`, w.users.admin, {}, key())).status).toBe(403)
    expect((await api('POST', `${E}/${id}/acknowledge`, w.users.finance, {}, key())).status).toBe(403)

    const inbox = await api('GET', '/api/v1/approvals/inbox', w.users.owner)
    expect(inbox.body.items.find((x: { id: number }) => x.id === id)).toMatchObject({ step: 'acknowledge' })
    const ack = await api('POST', `${E}/${id}/acknowledge`, w.users.owner, {}, key())
    expect(ack.status, JSON.stringify(ack.body)).toBe(200)
    expect(ack.body).toMatchObject({ status: 'pending_approval', currentLevel: 1 })
    const ackAudit = (await auditRows('expense_request', id)).find((r) => r.action === 'acknowledge')
    expect(ackAudit?.new_value?.v).toMatchObject({ delegatedTo: 'owner' })
    expect(ackAudit?.reason).toMatch(/dilimpahkan ke Owner/)

    // the acknowledging Owner cannot also approve (G1 one position per person); another Owner can
    expect((await api('POST', `${E}/${id}/approve`, w.users.owner, {}, key())).status).toBe(403)
    const ok = await api('POST', `${E}/${id}/approve`, w.users.owner2, {}, key())
    expect(ok.status, JSON.stringify(ok.body)).toBe(200)
    expect(ok.body.status).toBe('approved')

    // PDF "Diketahui Oleh": the actual person + "(dilimpahkan)"
    const pdf = await asUser(w.users.owner, (req) => buildPdfData(req, id, { internal: false, printedBy: 'test' }))
    const box = pdf.signatures.find((s) => s.label === 'Diketahui Oleh')
    const ackName = ack.body.approvals.find((a: { position: string }) => a.position === 'diketahui').actorName as string
    expect(box?.names).toBe(`${ackName} (dilimpahkan)`)
    expect(ok.body.approvals.find((a: { position: string }) => a.position === 'diketahui').actorId).toBe(w.users.owner.id)
  })

  it('rule names an Owner as THE approver: that Owner is not a delegate (acknowledge ≠ approve); another Owner acknowledges, the named Owner approves', async () => {
    const { id, submit } = await pmRequest(w.users.admin, ccOwnerApprover)
    expect(submit.body.approvalRule).toMatchObject({ acknowledgeDelegatedTo: 'owner', steps: [{ level: 1, approverUserId: w.users.owner.id }] })
    const snap = (await sqlAs('app', 'SELECT approval_snapshot AS s FROM expense_requests WHERE id = $1', [id])).rows[0].s
    expect(snap.acknowledgeDelegateUserIds).not.toContain(w.users.owner.id)
    expect(snap.acknowledgeDelegateUserIds).toContain(w.users.owner2.id)
    expect((await api('POST', `${E}/${id}/acknowledge`, w.users.owner, {}, key())).status).toBe(403)
    expect((await api('POST', `${E}/${id}/acknowledge`, w.users.owner2, {}, key())).status).toBe(200)
    const ok = await api('POST', `${E}/${id}/approve`, w.users.owner, {}, key())
    expect(ok.status, JSON.stringify(ok.body)).toBe(200)
    expect(ok.body.status).toBe('approved')
  })

  it('only one eligible Owner and he is the approver → delegated to an Admin; the Admin acknowledges, the Owner approves', async () => {
    await onlyActive('pk-owner', [w.users.owner.id], async () => {
      const { id, submit } = await pmRequest(w.users.finance, ccOwnerApprover)
      expect(submit.body.approvalRule).toMatchObject({ acknowledgeDelegatedTo: 'admin' })
      expect((await api('POST', `${E}/${id}/acknowledge`, w.users.owner, {}, key())).status).toBe(403)
      expect((await api('POST', `${E}/${id}/acknowledge`, w.users.finance, {}, key())).status).toBe(403) // creator
      expect((await panelHtml(w.users.finance, id)).replace(/<!-- -->/g, '')).toMatch(/Giliran: <strong>Admin<\/strong> — Diketahui \(dilimpahkan\)/)
      expect((await api('POST', `${E}/${id}/acknowledge`, w.users.admin, {}, key())).status).toBe(200)
      expect((await api('POST', `${E}/${id}/approve`, w.users.admin, {}, key())).status).toBe(403) // not the approver anyway
      const ok = await api('POST', `${E}/${id}/approve`, w.users.owner, {}, key())
      expect(ok.status, JSON.stringify(ok.body)).toBe(200)
    })
  })

  it('nobody can take over (single Owner is the approver, no eligible Admin) → the 409 stays, with a clear message', async () => {
    await onlyActive('pk-owner', [w.users.owner.id], () =>
      onlyActive('pk-admin', [], async () => {
        const { submit } = await pmRequest(w.users.finance, ccOwnerApprover, 409)
        expect(JSON.stringify(submit.body)).toMatch(/Diketahui Oleh.*tidak dapat ditentukan.*Owner\/Admin/)
      }),
    )
  })

  it('PM not involved → unchanged: PM acknowledges, no delegation', async () => {
    const d = await api('POST', E, w.users.staffA, draftBody(w, { projectId: undefined, costCenterId: w.costCenter }), key())
    expect(d.status, JSON.stringify(d.body)).toBe(201)
    const s = await api('POST', `${E}/${d.body.id}/submit`, w.users.staffA, {}, key())
    expect(s.body.approvalRule).toMatchObject({ acknowledgerUserId: w.users.pm.id, acknowledgeDelegatedTo: null })
    expect((await api('POST', `${E}/${d.body.id}/acknowledge`, w.users.owner, {}, key())).status).toBe(403)
    expect((await api('POST', `${E}/${d.body.id}/acknowledge`, w.users.pm, {}, key())).status).toBe(200)
  })
})

describe('F2e "Pengajuan ulang dari" shows the old number', () => {
  it('resubmitted draft: panel banner and form field show "<docNo> — <title>" of the rejected request', async () => {
    const d = await api('POST', E, w.users.staffA, draftBody(w, { title: 'Material gudang FE' }), key())
    const id = d.body.id as number
    const s = await api('POST', `${E}/${id}/submit`, w.users.staffA, {}, key())
    const docNo = s.body.docNo as string
    expect(docNo).toMatch(/\/PB-DRMS\//)
    expect((await api('POST', `${E}/${id}/reject`, w.users.pm, { reason: 'Lengkapi rincian material' }, key())).status).toBe(200)
    const r = await api('POST', `${E}/${id}/resubmit`, w.users.staffA, {}, key())
    expect(r.status, JSON.stringify(r.body)).toBe(201)
    expect(r.body.resubmitOf).toEqual({ id, docNo, title: 'Material gudang FE' })
    const html = (await panelHtml(w.users.staffA, r.body.id)).replace(/<!-- -->/g, '')
    expect(html).toContain(`data-pk-resubmit-of="${id}"`)
    expect(html).toContain(`Pengajuan ulang dari <a href="/admin/collections/expense-requests/${id}"><strong>${docNo}</strong></a> — Material gudang FE`)
    const req = await createLocalReq({ user: { ...w.users.staffA, collection: 'users' } as never }, await getTestPayload())
    const field = await ResubmitOfField({ req, data: { resubmitOf: id } } as never)
    expect(renderToString(field!)).toContain(`${docNo} — Material gudang FE`)
    // a viewer without read access sees only the id
    const other = await createLocalReq({ user: { ...w.users.staffB, collection: 'users' } as never }, await getTestPayload())
    expect(renderToString((await ResubmitOfField({ req: other, data: { resubmitOf: id } } as never))!)).not.toContain(docNo)
  })
})

describe('F2e Finance self-involvement guard on receipt verification (Reimburse)', () => {
  it('Finance who created the request cannot mark valid / reject / review flags / verify all (403, audited); another Finance can; DB refuses self-verification', async () => {
    const creatorFinance = w.users.finance
    const otherFinance = await makeFlowUser(['pk-finance'], 'FE-finance2', null)
    const d = await api('POST', E, creatorFinance, draftBody(w, { type: 'reimburse' }), key()) // on behalf of Staff A (Q-09)
    expect(d.status, JSON.stringify(d.body)).toBe(201)
    const id = d.body.id as number
    for (const [i, amount] of [600_000, 140_000].entries()) {
      const img = await upload('/api/v1/media/receipts', creatorFinance, await png())
      const rc = await api('POST', `${E}/${id}/receipts`, creatorFinance, { lineId: d.body.lines[i].id, receiptNo: `FE-${id}-${i}`, vendorName: `Toko FE ${i}`, receiptDate: yesterday(), amount, imageId: img.body.id }, key())
      expect(rc.status, JSON.stringify(rc.body)).toBe(201)
    }
    expect((await api('POST', `${E}/${id}/submit`, creatorFinance, {}, key())).status).toBe(200)
    expect((await api('POST', `${E}/${id}/acknowledge`, w.users.pm, {}, key())).status).toBe(200)
    const a = await api('POST', `${E}/${id}/approve`, w.users.owner, {}, key())
    expect(a.body.status).toBe('approved')
    const receipt = a.body.receipts[0] as { id: number }
    const flag = (a.body.flags as Array<{ id: number; status: string; level: string }>).find((f) => f.status === 'open')!

    const self = await api('GET', `${E}/${id}`, creatorFinance)
    expect(self.body.allowedActions).not.toEqual(expect.arrayContaining(['receipt_verify']))
    for (const [path, body] of [
      [`receipts/${receipt.id}/verify`, {}],
      [`receipts/${receipt.id}/reject`, { reason: 'Tidak sah' }],
      [`flags/${flag.id}/review`, {}],
      ['verify-receipts', {}],
    ] as const) {
      const r = await api('POST', `${E}/${id}/${path}`, creatorFinance, body, key())
      expect(r.status, path).toBe(403)
      expect(JSON.stringify(r.body)).toMatch(/Finance tidak dapat/)
    }
    const denied = (await auditRows('expense_request', id)).filter((r) => r.action === 'access_denied')
    expect(denied.map((r) => r.field).sort()).toEqual(['receipt_reject', 'receipt_verify', 'review_flag', 'verify_receipts'])
    expect(denied.every((r) => r.user_id === String(creatorFinance.id))).toBe(true)
    // nothing changed
    const after = await api('GET', `${E}/${id}`, otherFinance)
    expect(after.body.status).toBe('approved')
    expect(after.body.receipts.every((x: { status: string }) => x.status === 'pending')).toBe(true)
    expect(after.body.allowedActions).toEqual(expect.arrayContaining(['receipt_verify', 'receipt_reject', 'verify_receipts', 'review_flag']))

    // DB level (app role, raw SQL): the creator / a requester cannot be the verifier or reviewer
    const e1 = await sqlError('app', "UPDATE receipts SET status = 'valid', verified_by_id = $1 WHERE id = $2", [creatorFinance.id, receipt.id])
    expect(e1?.code).toBe('42501')
    const e2 = await sqlError('app', "UPDATE receipts SET status = 'valid', verified_by_id = $1 WHERE id = $2", [w.users.staffA.id, receipt.id])
    expect(e2?.code).toBe('42501')
    const e3 = await sqlError('app', "UPDATE receipt_flags SET status = 'reviewed', reviewed_by_id = $1 WHERE id = $2", [creatorFinance.id, flag.id])
    expect(e3?.code).toBe('42501')

    // another Finance verifies normally
    expect((await api('POST', `${E}/${id}/receipts/${receipt.id}/verify`, otherFinance, {}, key())).status).toBe(200)
    expect((await api('POST', `${E}/${id}/flags/${flag.id}/review`, otherFinance, { note: 'ok' }, key())).status).toBe(200)
  })
})
