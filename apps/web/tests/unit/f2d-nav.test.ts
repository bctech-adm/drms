import type { Payload, TypedUser } from 'payload'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { F2NavLinks } from '@/admin/components/F2NavLinks'
import type { Role } from '@/access/roles'

/**
 * F2d (UAT): every panel role that signs reaches its own profile ("Profil & tanda tangan") from
 * the nav — Owner included (approvals need the profile signature, US-43). Server-rendered with a
 * stub payload (badge counts only).
 */
const payload = { count: async () => ({ totalDocs: 2 }) } as unknown as Payload

async function nav(roles: Role[], id = 42): Promise<string> {
  const el = await F2NavLinks({ payload, user: { id, roles, collection: 'users' } as unknown as TypedUser })
  return el ? renderToString(el) : ''
}

describe('F2NavLinks — profile link for every signing role', () => {
  it('Owner gets "Profil & tanda tangan" to their own user (and no "Buat pengajuan")', async () => {
    const html = await nav(['pk-owner'], 7)
    expect(html).toContain('Profil &amp; tanda tangan')
    expect(html).toContain('href="/admin/collections/users/7"')
    expect(html).not.toContain('Buat pengajuan')
    expect(html).toContain('Antrian Transfer')
  })

  it.each([['pk-staff'], ['pk-pm'], ['pk-finance'], ['pk-admin'], ['pk-owner']] as Array<[Role]>)('%s → profile link', async (role) => {
    const html = await nav([role])
    expect(html).toContain('data-pk-nav-link="profile"')
    expect(html).toContain('href="/admin/collections/users/42"')
  })

  it('creators keep "+ Buat pengajuan"', async () => {
    for (const r of ['pk-staff', 'pk-pm', 'pk-finance', 'pk-admin'] as Role[]) expect(await nav([r])).toContain('Buat pengajuan')
  })
})
