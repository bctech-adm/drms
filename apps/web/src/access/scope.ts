import type { PayloadRequest, Where } from 'payload'

import { DEFAULT_TZ, startOfLocalDay } from '@/lib/time'

import { relId, userId } from './roles'

/**
 * Scope data of the current user (architecture §7.1), resolved once per request and cached in
 * `req.context.pkScope`:
 * - team      = projects with `pm = user`, or active `team-assignments` (roleInProject = pm) of
 *               user.employee; cost centers with `manager = user` or a pm assignment;
 * - assigned  = projects / cost centers of any active `team-assignments` of user.employee.
 */
export type Scope = {
  userId: number
  employeeId: number | null
  teamProjects: number[]
  assignedProjects: number[]
  teamCostCenters: number[]
  assignedCostCenters: number[]
}

const EMPTY: Omit<Scope, 'userId'> = {
  employeeId: null,
  teamProjects: [],
  assignedProjects: [],
  teamCostCenters: [],
  assignedCostCenters: [],
}

type AssignmentRow = { project?: unknown; costCenter?: unknown; roleInProject?: unknown }

export async function resolveScope(req: PayloadRequest): Promise<Scope> {
  const cached = req.context?.pkScope as Scope | undefined
  const uid = userId(req)
  if (cached && cached.userId === uid) return cached
  if (uid === undefined) return { userId: -1, ...EMPTY }

  const employeeId = relId((req.user as { employee?: unknown }).employee) ?? null
  const now = new Date()
  const today = startOfLocalDay(now, process.env.TZ || DEFAULT_TZ)

  // SYSTEM-READ (overrideAccess): access functions must not recurse into access control.
  const [pmProjects, managedCostCenters, assignments] = await Promise.all([
    req.payload.find({
      collection: 'projects',
      where: { pm: { equals: uid } },
      depth: 0,
      pagination: false,
      select: { code: true },
      overrideAccess: true, // SYSTEM-READ: scope resolution
      req,
    }),
    req.payload.find({
      collection: 'cost-centers',
      where: { manager: { equals: uid } },
      depth: 0,
      pagination: false,
      select: { code: true },
      overrideAccess: true, // SYSTEM-READ: scope resolution
      req,
    }),
    employeeId === null
      ? Promise.resolve({ docs: [] as AssignmentRow[] })
      : req.payload.find({
          collection: 'team-assignments',
          where: {
            and: [
              { employee: { equals: employeeId } },
              { or: [{ startDate: { exists: false } }, { startDate: { less_than_equal: now.toISOString() } }] },
              { or: [{ endDate: { exists: false } }, { endDate: { greater_than_equal: today.toISOString() } }] },
            ],
          },
          depth: 0,
          pagination: false,
          select: { project: true, costCenter: true, roleInProject: true },
          overrideAccess: true, // SYSTEM-READ: scope resolution
          req,
        }),
  ])

  const team = new Set<number>(pmProjects.docs.map((d) => d.id as number))
  const assigned = new Set<number>()
  const teamCc = new Set<number>(managedCostCenters.docs.map((d) => d.id as number))
  const assignedCc = new Set<number>()
  for (const a of assignments.docs as AssignmentRow[]) {
    const p = relId(a.project)
    const c = relId(a.costCenter)
    if (p !== undefined) {
      assigned.add(p)
      if (a.roleInProject === 'pm') team.add(p)
    }
    if (c !== undefined) {
      assignedCc.add(c)
      if (a.roleInProject === 'pm') teamCc.add(c)
    }
  }
  const scope: Scope = {
    userId: uid,
    employeeId,
    teamProjects: [...team].sort((a, b) => a - b),
    assignedProjects: [...new Set([...assigned, ...team])].sort((a, b) => a - b),
    teamCostCenters: [...teamCc].sort((a, b) => a - b),
    assignedCostCenters: [...new Set([...assignedCc, ...teamCc])].sort((a, b) => a - b),
  }
  req.context.pkScope = scope
  return scope
}

/** `{ field: { in: ids } }`, or `false` when there is nothing in scope (never an empty IN). */
export function inIds(field: string, ids: readonly number[]): Where | false {
  return ids.length > 0 ? { [field]: { in: [...ids] } } : false
}
