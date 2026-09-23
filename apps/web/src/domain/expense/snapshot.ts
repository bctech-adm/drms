import { sql } from '@payloadcms/db-postgres'
import type { PayloadRequest } from 'payload'

import { relId } from '@/access/roles'
import { getRequestTx } from '@/lib/tx'

import { fail, ids, type RequestDoc } from './common'
import { displayUnitPrice } from './lines'
import { buildSnapshot, selectRule, type ApprovalSnapshot, type RuleInput } from './rules'

/**
 * Rule resolution at submit / re-approval (US-34, G2) + acknowledger resolution (Q-07 default:
 * PM of the project or manager of the cost center; Q-08 default: a requester or the creator can
 * never be "Diketahui Oleh" nor approver).
 */
export async function selectAndSnapshot(req: PayloadRequest, doc: RequestDoc): Promise<{ rule: RuleInput; snapshot: ApprovalSnapshot }> {
  const res = await req.payload.find({
    collection: 'approval-rules',
    where: { and: [{ active: { equals: true } }, { docType: { equals: 'expense_request' } }] },
    depth: 0,
    pagination: false,
    overrideAccess: true, // SYSTEM-READ: approval rules
    req,
  })
  const rules: RuleInput[] = (res.docs as unknown as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as number,
    name: r.name as string,
    active: r.active as boolean,
    docType: r.docType as string,
    requestType: r.requestType as RuleInput['requestType'],
    minAmount: (r.minAmount as number) ?? 0,
    maxAmount: (r.maxAmount as number | null) ?? null,
    category: relId(r.category) ?? null,
    project: relId(r.project) ?? null,
    costCenter: relId(r.costCenter) ?? null,
    priority: (r.priority as number | null) ?? 100,
    acknowledge: (r.acknowledge as RuleInput['acknowledge']) ?? 'none',
    acknowledgeBy: (r.acknowledgeBy as RuleInput['acknowledgeBy']) ?? 'scope_manager',
    acknowledgeRole: (r.acknowledgeRole as RuleInput['acknowledgeRole']) ?? null,
    acknowledgeUser: relId(r.acknowledgeUser) ?? null,
    signDiajukan: (r.signDiajukan as RuleInput['signDiajukan']) ?? 'required',
    signDibuat: (r.signDibuat as RuleInput['signDibuat']) ?? 'required',
    steps: ((r.steps as Array<Record<string, unknown>>) ?? []).map((s) => ({
      level: s.level as number,
      approverRole: (s.approverRole as RuleInput['steps'][number]['approverRole']) ?? null,
      approverUser: relId(s.approverUser) ?? null,
    })),
  }))
  const projectId = relId(doc.project) ?? null
  const costCenterId = relId(doc.costCenter) ?? null
  const rule = selectRule(rules, {
    type: doc.type,
    grandTotal: doc.grandTotal ?? 0,
    categoryIds: (doc.lines ?? []).map((l) => relId(l.category)).filter((x): x is number => x !== undefined),
    projectId,
    costCenterId,
  })
  if (!rule) fail(409, 'Tidak ada aturan approval yang berlaku untuk pengajuan ini (US-34). Hubungi Admin.')

  const excluded = await involvedUserIds(req, doc)
  let ackUser: number | null = null
  if (rule.acknowledge !== 'none') {
    if (rule.acknowledgeBy === 'user') ackUser = rule.acknowledgeUser ?? null
    else if ((rule.acknowledgeBy ?? 'scope_manager') === 'scope_manager') {
      if (projectId) {
        const p = await req.payload.findByID({ collection: 'projects', id: projectId, depth: 0, overrideAccess: true /* SYSTEM-READ: PM (Q-07) */, req })
        ackUser = relId(p.pm) ?? null
      } else if (costCenterId) {
        const c = await req.payload.findByID({ collection: 'cost-centers', id: costCenterId, depth: 0, overrideAccess: true /* SYSTEM-READ: manager (Q-07) */, req })
        ackUser = relId(c.manager) ?? null
      }
    }
    if (ackUser !== null && excluded.has(ackUser)) ackUser = null // Q-08: never self-acknowledge
    if (rule.acknowledge === 'required' && rule.acknowledgeBy !== 'role' && ackUser === null) {
      fail(
        409,
        'Pihak "Diketahui Oleh" tidak dapat ditentukan: PM project / penanggung jawab pusat biaya belum diatur atau termasuk pemohon/pembuat (Q-07, Q-08). Hubungi Admin.',
      )
    }
  }
  for (const s of rule.steps) {
    if (s.approverUser && excluded.has(s.approverUser)) fail(409, 'Approver pada aturan approval adalah pemohon/pembuat pengajuan ini (G1). Hubungi Admin.')
  }
  return { rule, snapshot: buildSnapshot(rule, ackUser) }
}

/** User ids of the creator and of every requester employee that has an account (G1, Q-08). */
export async function involvedUserIds(req: PayloadRequest, doc: RequestDoc): Promise<Set<number>> {
  const out = new Set<number>()
  const creator = relId(doc.createdBy)
  if (creator !== undefined) out.add(creator)
  const emps = ids(doc.requesters)
  if (emps.length > 0) {
    const users = await req.payload.find({
      collection: 'users',
      where: { employee: { in: emps } },
      depth: 0,
      pagination: false,
      overrideAccess: true, // SYSTEM-READ: requester accounts (G1)
      req,
    })
    for (const u of users.docs) out.add(u.id as number)
  }
  return out
}

/** Class A snapshot of the request content (ADR 0006 §2 `expense_line_snapshots`). */
export async function writeSnapshot(req: PayloadRequest, doc: RequestDoc, reason: 'submit' | 'approve' | 'receipts_resubmit') {
  const tx = await getRequestTx(req)
  const r = (await tx.execute(sql`SELECT content_hash FROM expense_requests WHERE id = ${doc.id}`)) as unknown as { rows: Array<{ content_hash: string | null }> }
  const emps = ids(doc.requesters)
  const names = emps.length
    ? (
        await req.payload.find({ collection: 'employees', where: { id: { in: emps } }, depth: 0, pagination: false, overrideAccess: true /* SYSTEM-READ: snapshot names */, req })
      ).docs.map((e) => ({ id: e.id as number, name: (e as { name: string }).name }))
    : []
  await req.payload.create({
    collection: 'expense-line-snapshots',
    data: {
      request: doc.id,
      cycle: doc.approvalCycle ?? 0,
      reason,
      grandTotal: doc.grandTotal ?? 0,
      contentHash: r.rows[0]?.content_hash ?? null,
      data: {
        docNo: doc.docNo ?? null,
        type: doc.type,
        title: doc.title,
        requestDate: doc.requestDate ?? null,
        project: relId(doc.project) ?? null,
        costCenter: relId(doc.costCenter) ?? null,
        requesters: emps.map((id) => names.find((n) => n.id === id) ?? { id, name: null }),
        createdBy: relId(doc.createdBy) ?? null,
        bank: doc.bankSnapshot ?? null,
        lines: (doc.lines ?? []).map((l, i) => ({
          no: i + 1,
          id: l.id,
          description: l.description ?? null,
          qty: l.qty ?? null,
          uom: relId(l.uom) ?? null,
          unitPrice: l.unitPrice ?? null,
          unitPriceDisplay: displayUnitPrice({ unitPrice: l.unitPrice, qty: l.qty, total: l.total }),
          total: l.total ?? null,
          category: relId(l.category) ?? null,
          vehicle: relId(l.vehicle) ?? null,
          notes: l.notes ?? null,
        })),
      },
    } as never,
    depth: 0,
    overrideAccess: true, // SYSTEM-WRITE: Class A snapshot
    req,
  })
}
