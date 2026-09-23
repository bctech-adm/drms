/**
 * Approval rule engine (US-34, architecture G2): which `approval-rules` row applies to a request,
 * the snapshot stored on the request at submit (rule changes never affect submitted requests), and
 * step matching. Pure module (unit-tested).
 */
import type { Role } from '@/access/roles'

import type { RequestType } from './types'

export type AckMode = 'required' | 'optional' | 'none'
export type AckBy = 'scope_manager' | 'role' | 'user'
export type SignMode = 'required' | 'optional' | 'none'

export type RuleInput = {
  id: number
  name: string
  active?: boolean | null
  docType: string
  requestType: 'any' | RequestType
  minAmount: number
  maxAmount?: number | null
  category?: number | null
  project?: number | null
  costCenter?: number | null
  priority?: number | null
  acknowledge: AckMode
  acknowledgeBy?: AckBy | null
  acknowledgeRole?: Role | null
  acknowledgeUser?: number | null
  signDiajukan?: SignMode | null
  signDibuat?: SignMode | null
  steps: Array<{ level: number; approverRole?: Role | null; approverUser?: number | null }>
}

export type RequestFacts = {
  type: RequestType
  grandTotal: number
  categoryIds: number[]
  projectId?: number | null
  costCenterId?: number | null
}

export type ApprovalSnapshot = {
  ruleId: number
  ruleName: string
  acknowledge: AckMode
  acknowledgeBy: AckBy
  /** Resolved acknowledger (scope_manager / user); null with acknowledgeBy = 'role'. */
  acknowledgerUserId: number | null
  acknowledgeRole: Role | null
  signDiajukan: SignMode
  signDibuat: SignMode
  steps: Array<{ level: number; approverRole: Role | null; approverUserId: number | null }>
}

function specificity(r: RuleInput): number {
  return (r.category ? 1 : 0) + (r.project ? 1 : 0) + (r.costCenter ? 1 : 0) + (r.requestType !== 'any' ? 1 : 0)
}

export function ruleMatches(r: RuleInput, f: RequestFacts): boolean {
  if (r.active === false) return false
  if (r.docType !== 'expense_request') return false
  if (r.requestType !== 'any' && r.requestType !== f.type) return false
  if (f.grandTotal < r.minAmount) return false
  if (r.maxAmount !== null && r.maxAmount !== undefined && f.grandTotal > r.maxAmount) return false
  if (r.category && !f.categoryIds.includes(r.category)) return false
  if (r.project && r.project !== f.projectId) return false
  if (r.costCenter && r.costCenter !== f.costCenterId) return false
  return true
}

/**
 * Best matching rule: lowest `priority` first, then the most specific (category/project/cost
 * center/request type), then the highest `minAmount` (the narrower amount band), then lowest id.
 */
export function selectRule(rules: readonly RuleInput[], f: RequestFacts): RuleInput | null {
  const candidates = rules.filter((r) => ruleMatches(r, f))
  candidates.sort(
    (a, b) =>
      (a.priority ?? 100) - (b.priority ?? 100) ||
      specificity(b) - specificity(a) ||
      b.minAmount - a.minAmount ||
      a.id - b.id,
  )
  return candidates[0] ?? null
}

/** Steps must be levels 1..n without gaps/duplicates, each with a role or a user. */
export function stepsError(steps: RuleInput['steps']): string | null {
  if (steps.length === 0) return 'Aturan approval harus punya minimal 1 level.'
  const levels = [...steps].map((s) => s.level).sort((a, b) => a - b)
  for (let i = 0; i < levels.length; i++) if (levels[i] !== i + 1) return 'Level approval harus berurutan 1..n tanpa duplikat.'
  if (steps.some((s) => !s.approverRole && !s.approverUser)) return 'Setiap level approval butuh peran atau user approver.'
  return null
}

export function buildSnapshot(r: RuleInput, acknowledgerUserId: number | null): ApprovalSnapshot {
  const err = stepsError(r.steps)
  if (err) throw new Error(err)
  return {
    ruleId: r.id,
    ruleName: r.name,
    acknowledge: r.acknowledge,
    acknowledgeBy: r.acknowledgeBy ?? 'scope_manager',
    acknowledgerUserId,
    acknowledgeRole: r.acknowledgeRole ?? null,
    signDiajukan: r.signDiajukan ?? 'required',
    signDibuat: r.signDibuat ?? 'required',
    steps: [...r.steps]
      .sort((a, b) => a.level - b.level)
      .map((s) => ({ level: s.level, approverRole: s.approverRole ?? null, approverUserId: s.approverUser ?? null })),
  }
}

export type Caller = { id: number; roles: readonly Role[] }

/** G2: caller matches the approval step (a named user wins over the role). */
export function matchesStep(step: ApprovalSnapshot['steps'][number] | undefined, caller: Caller): boolean {
  if (!step) return false
  if (step.approverUserId !== null) return step.approverUserId === caller.id
  return step.approverRole !== null && caller.roles.includes(step.approverRole)
}

/** Caller may give "Diketahui" (US-42): the resolved user, or any holder of the role. */
export function matchesAcknowledger(s: ApprovalSnapshot, caller: Caller): boolean {
  if (s.acknowledge === 'none') return false
  if (s.acknowledgerUserId !== null) return s.acknowledgerUserId === caller.id
  return s.acknowledgeBy === 'role' && s.acknowledgeRole !== null && caller.roles.includes(s.acknowledgeRole)
}

export function lastLevel(s: ApprovalSnapshot): number {
  return s.steps.reduce((m, x) => Math.max(m, x.level), 0)
}

/**
 * US-26 budget impact: committed amount of the project (approved and later, excluding this
 * request) vs budget. Cost centers have no budget in the first release (Q-24 default) → null.
 */
export function budgetImpact(budget: number | null | undefined, committedOthers: number, amount: number): { before: number | null; after: number | null } {
  if (!budget || budget <= 0) return { before: null, after: null }
  const pct = (v: number) => Math.round((v / budget) * 10000) / 100
  return { before: pct(committedOthers), after: pct(committedOthers + amount) }
}
