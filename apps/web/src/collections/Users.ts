import type { CollectionConfig } from 'payload'

import { PANEL_ROLES, ROLES, ROLE_LABELS, denyAll, userRoles } from '@/access/roles'
import { byRole, fieldRoles, ownUser, rolesAllowed } from '@/access/policies'
import { revokeCurrentWebSession } from '@/auth/sessions'
import { mobileBearerStrategy, oidcSessionStrategy } from '@/auth/strategies'
import { reasonOnDeactivate, withAudit } from '@/audit/hooks'
import { compensateKeycloak, deactivationAfterChange, keycloakSyncBeforeChange } from '@/domain/users-sync'

type UserExtras = { _pkSessionExp?: number }

/**
 * Users (ADR 0003): identity + credentials live in Keycloak realm `drms`; this collection holds
 * the link (`keycloakSub`), the role mirror, scope data (employee link) and the active flag.
 * Admin C/R/U (synced to Keycloak, Keycloak-first), Owner R, everyone R self.
 */
export const Users: CollectionConfig = withAudit(
  {
    slug: 'users',
    labels: { singular: 'Pengguna', plural: 'Pengguna' },
    admin: { useAsTitle: 'email', group: 'Pengguna & Akses', defaultColumns: ['email', 'name', 'roles', 'employee', 'active'] },
    auth: {
      // Keycloak-only login. No password/forgot/reset endpoints, no Payload JWT (spike a).
      disableLocalStrategy: true,
      strategies: [oidcSessionStrategy, mobileBearerStrategy],
    },
    access: {
      admin: ({ req }) => userRoles(req).some((r) => PANEL_ROLES.includes(r)),
      read: byRole({
        'pk-admin': true,
        'pk-owner': true,
        'pk-finance': ownUser('id'),
        'pk-pm': ownUser('id'),
        'pk-staff': ownUser('id'),
      }),
      create: rolesAllowed('pk-admin'),
      update: byRole({ 'pk-admin': true }),
      delete: denyAll,
    },
    hooks: {
      beforeChange: [keycloakSyncBeforeChange],
      afterChange: [deactivationAfterChange],
      afterError: [async ({ req }) => compensateKeycloak(req)],
      // Admin UI reads `exp` from /me and /refresh-token to schedule its inactivity timers.
      me: [
        ({ args, user }) => {
          const exp = (args.req.user as UserExtras | null)?._pkSessionExp
          return exp ? { user, exp } : undefined
        },
      ],
      refresh: [
        ({ args, user }) => {
          const exp = (args.req.user as UserExtras | null)?._pkSessionExp
          // No Payload JWT cookie is ever issued (setCookie false); session lifetime is ours.
          return { exp: exp ?? 0, refreshedToken: '', setCookie: false, strategy: 'oidcSession', user }
        },
      ],
      afterLogout: [
        async ({ req }) => {
          await revokeCurrentWebSession(req, 'admin_logout')
        },
      ],
    },
    fields: [
      { name: 'email', type: 'email', label: 'Email', required: true, unique: true },
      { name: 'name', type: 'text', label: 'Nama', maxLength: 128 },
      {
        name: 'roles',
        type: 'select',
        label: 'Peran',
        hasMany: true,
        options: ROLES.map((r) => ({ label: ROLE_LABELS[r], value: r })),
        access: { update: fieldRoles('pk-admin'), create: fieldRoles('pk-admin') },
        admin: { description: 'Disinkronkan ke realm role Keycloak.' },
      },
      { name: 'employee', type: 'relationship', relationTo: 'employees', label: 'Karyawan', unique: true },
      { name: 'phone', type: 'text', label: 'No. HP', maxLength: 32 },
      { name: 'signature', type: 'upload', relationTo: 'media-signatures', label: 'Tanda tangan' },
      {
        name: 'keycloakSub',
        type: 'text',
        label: 'ID Keycloak (sub)',
        unique: true,
        index: true,
        access: { update: () => false },
        admin: { readOnly: true, position: 'sidebar', description: 'Diisi otomatis dari Keycloak.' },
      },
      { name: 'active', type: 'checkbox', label: 'Aktif', defaultValue: true, index: true, admin: { position: 'sidebar' } },
    ],
  },
  {
    docType: 'user',
    reasonRules: [reasonOnDeactivate],
    actionFor: (c, op, ctx) => (op === 'update' && c.field === 'roles' ? (ctx.roleSync === true ? 'role_sync' : 'role_change') : undefined),
  },
)
