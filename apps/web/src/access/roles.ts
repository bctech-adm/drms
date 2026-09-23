import type { Access, PayloadRequest } from 'payload'

/** Keycloak realm roles = source of truth for role membership (ADR 0003 §2). */
export const ROLES = ['pk-staff', 'pk-pm', 'pk-finance', 'pk-owner', 'pk-admin'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  'pk-staff': 'Staff lapangan',
  'pk-pm': 'Project Manager',
  'pk-finance': 'Finance',
  'pk-owner': 'Owner',
  'pk-admin': 'Admin',
}

/** Roles allowed into the Payload admin panel (architecture §7.2); Staff uses the APK. */
export const PANEL_ROLES: readonly Role[] = ['pk-admin', 'pk-finance', 'pk-owner', 'pk-pm']

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

export function rolesOf(user: unknown): Role[] {
  const roles = (user as { roles?: unknown } | null | undefined)?.roles
  return Array.isArray(roles) ? roles.filter(isRole) : []
}

export function userRoles(req: Pick<PayloadRequest, 'user'>): Role[] {
  return rolesOf(req.user)
}

export function hasRole(req: Pick<PayloadRequest, 'user'>, ...roles: Role[]): boolean {
  return userRoles(req).some((r) => roles.includes(r))
}

export const hasAnyRole =
  (...roles: Role[]): Access =>
  ({ req }) =>
    hasRole(req, ...roles)

export const denyAll: Access = () => false

/** Any authenticated user with at least one ProyekKas role. */
export const anyRole: Access = ({ req }) => userRoles(req).length > 0

export function userId(req: Pick<PayloadRequest, 'user'>): number | undefined {
  const id = (req.user as { id?: unknown } | null)?.id
  return typeof id === 'number' ? id : undefined
}

/** Relationship value → id (depth 0 id or populated doc). */
export function relId(value: unknown): number | undefined {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'number') {
    return (value as { id: number }).id
  }
  return undefined
}
