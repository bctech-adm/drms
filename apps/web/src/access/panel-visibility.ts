import type { CollectionConfig, GlobalConfig } from 'payload'

import { isStaffOnly } from './roles'

/**
 * F2c: admin-panel visibility for the restricted staff panel. `admin.hidden` removes an entity from
 * the nav, dashboard and its list/edit ROUTES (@payloadcms/next 3.90.1 views/List + views/Document
 * return notFound for hidden entities; drawers opened from a relationship/upload field keep working
 * because DocumentDrawer/ListDrawer default `overrideEntityVisibility = true`). It does NOT affect
 * the REST/Local API — data access stays with the access functions (defence in depth, not a guard).
 *
 * Staff-only users see just these collections (own requests, their receipts, their notifications,
 * their own profile). Everything else — masters, finance, system, media libraries — is hidden.
 */
export const STAFF_VISIBLE_COLLECTIONS: readonly string[] = ['expense-requests', 'receipts', 'notifications', 'users']

type HiddenFn = (args: { user: unknown }) => boolean
type HiddenOpt = boolean | ((args: { user: never }) => boolean) | undefined

function combine(existing: HiddenOpt): HiddenFn {
  return ({ user }) => {
    if (isStaffOnly(user)) return true
    if (typeof existing === 'function') return existing({ user: user as never })
    return existing === true
  }
}

export function withStaffPanelVisibility(collections: CollectionConfig[]): CollectionConfig[] {
  return collections.map((c) => (STAFF_VISIBLE_COLLECTIONS.includes(c.slug) ? c : { ...c, admin: { ...c.admin, hidden: combine(c.admin?.hidden) } }))
}

export function withStaffHiddenGlobals(globals: GlobalConfig[]): GlobalConfig[] {
  return globals.map((g) => ({ ...g, admin: { ...g.admin, hidden: combine(g.admin?.hidden) } }))
}
