import { APIError, type CollectionBeforeOperationHook, type CollectionConfig } from 'payload'

import { PANEL_ROLES, ROLES, ROLE_LABELS, denyAll, hasRole, relId, userId, userRoles } from '@/access/roles'
import { byRole, fieldRoles, ownUser, rolesAllowed } from '@/access/policies'
import { revokeCurrentWebSession } from '@/auth/sessions'
import { mobileBearerStrategy, oidcSessionStrategy } from '@/auth/strategies'
import { reasonOnDeactivate, withAudit } from '@/audit/hooks'
import { compensateKeycloak, deactivationAfterChange, keycloakSyncBeforeChange } from '@/domain/users-sync'

type UserExtras = { _pkSessionExp?: number }

const adminOnly = { create: fieldRoles('pk-admin'), update: fieldRoles('pk-admin') }

/** Fields only an Admin may change (Keycloak-synced identity, roles, scope link, active flag). */
const ADMIN_FIELDS = ['email', 'name', 'roles', 'employee', 'phone', 'active', 'keycloakSub'] as const

function norm(field: string, v: unknown): unknown {
  if (field === 'roles') return Array.isArray(v) ? [...v].map(String).sort() : []
  if (field === 'employee') return relId(v) ?? null
  if (field === 'email' && typeof v === 'string') return v.trim().toLowerCase()
  return v === undefined || v === '' ? null : v
}

/**
 * F2c self-service profile (beforeOperation: sees the RAW input before field access strips it):
 * a non-admin caller (overrideAccess:false) may update ONLY their own row (collection access) and
 * only the `signature` — any attempt to change an admin field is a 403 instead of a silent drop
 * (the admin form re-sends the unchanged read-only values, which pass). The signature must be a
 * `media-signatures` row the caller uploaded (same resize/SSRF guards as every upload, see
 * collections/media/factory.ts) — never someone else's image. Admin keeps managing everyone.
 */
export const selfProfileGuard: CollectionBeforeOperationHook = async ({ args, operation, overrideAccess, req }) => {
  if (operation !== 'update' || overrideAccess || !req.user || hasRole(req, 'pk-admin')) return args
  const a = args as { id?: number | string; data?: Record<string, unknown> }
  const data = a.data ?? {}
  const uid = userId(req)
  if (a.id === undefined || Number(a.id) !== uid) throw new APIError('Anda hanya dapat mengubah profil Anda sendiri.', 403, null, true)
  const current = (await req.payload.findByID({ collection: 'users', id: uid, depth: 0, overrideAccess: true /* SYSTEM-READ: own row, diff below */, req })) as unknown as Record<string, unknown>
  const changed = ADMIN_FIELDS.filter((f) => f in data && JSON.stringify(norm(f, data[f])) !== JSON.stringify(norm(f, current[f])))
  if (changed.length > 0) throw new APIError(`Hanya Admin yang dapat mengubah: ${changed.join(', ')}.`, 403, null, true)
  const sig = relId(data.signature)
  if (sig !== undefined && sig !== relId(current.signature)) {
    const m = await req.payload
      .findByID({ collection: 'media-signatures', id: sig, depth: 0, overrideAccess: true /* SYSTEM-READ: ownership checked below */, req })
      .catch(() => null)
    if (!m || relId(m.uploadedBy) !== uid) throw new APIError('Tanda tangan harus gambar yang Anda unggah sendiri.', 403, null, true)
  }
  return args
}

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
      // F2c: everyone may update their OWN row — field access limits that to `signature`.
      update: byRole({
        'pk-admin': true,
        'pk-owner': ownUser('id'),
        'pk-finance': ownUser('id'),
        'pk-pm': ownUser('id'),
        'pk-staff': ownUser('id'),
      }),
      delete: denyAll,
    },
    hooks: {
      beforeOperation: [selfProfileGuard],
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
      { name: 'email', type: 'email', label: 'Email', required: true, unique: true, access: adminOnly },
      { name: 'name', type: 'text', label: 'Nama', maxLength: 128, access: adminOnly },
      {
        name: 'roles',
        type: 'select',
        label: 'Peran',
        hasMany: true,
        options: ROLES.map((r) => ({ label: ROLE_LABELS[r], value: r })),
        access: { update: fieldRoles('pk-admin'), create: fieldRoles('pk-admin') },
        admin: { description: 'Disinkronkan ke realm role Keycloak.' },
      },
      { name: 'employee', type: 'relationship', relationTo: 'employees', label: 'Karyawan', unique: true, access: adminOnly },
      { name: 'phone', type: 'text', label: 'No. HP', maxLength: 32, access: adminOnly },
      {
        name: 'signature',
        type: 'upload',
        relationTo: 'media-signatures',
        label: 'Tanda tangan',
        admin: {
          description:
            'PNG tanda tangan Anda (latar putih/transparan). Dipakai otomatis saat mengirim/menyetujui pengajuan (US-43). Klik "Buat Baru" untuk mengunggah, lalu Simpan.',
        },
      },
      {
        name: 'keycloakSub',
        type: 'text',
        label: 'ID Keycloak (sub)',
        unique: true,
        index: true,
        access: { update: () => false },
        admin: { readOnly: true, position: 'sidebar', description: 'Diisi otomatis dari Keycloak.' },
      },
      { name: 'active', type: 'checkbox', label: 'Aktif', defaultValue: true, index: true, access: adminOnly, admin: { position: 'sidebar' } },
    ],
  },
  {
    docType: 'user',
    reasonRules: [reasonOnDeactivate],
    actionFor: (c, op, ctx) => (op === 'update' && c.field === 'roles' ? (ctx.roleSync === true ? 'role_sync' : 'role_change') : undefined),
  },
)
