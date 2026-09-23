import { randomUUID } from 'node:crypto'

import { decodeJwt } from 'jose'
import { describe, expect, it } from 'vitest'

import { createHttpKeycloakAdmin, KeycloakAdminError } from '@/auth/keycloak-admin'

/**
 * Runs src/auth/keycloak-admin.ts against a REAL throwaway Keycloak 26.7.4 (apps/web/test-env,
 * profile kc, realm from test-env/kc-setup.sh) with the least-privilege service account.
 * Env: PK_KC_BASE (e.g. http://pk-f1-keycloak:8080), PK_KC_SA_SECRET, PK_KC_USER_PASSWORD.
 */
const base = process.env.PK_KC_BASE!
const realm = 'pk-f1'
const kc = createHttpKeycloakAdmin({ baseUrl: base, realm, clientId: 'proyekkas-admin-api', clientSecret: process.env.PK_KC_SA_SECRET! })

async function passwordGrant(scope: string) {
  const res = await fetch(`${base}/realms/${realm}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'password', client_id: 'proyekkas-mobile', username: 'kc.session', password: process.env.PK_KC_USER_PASSWORD!, scope }),
  })
  expect(res.status).toBe(200)
  return (await res.json()) as { access_token: string; refresh_token: string }
}

/** Refresh; returns the status and the ROTATED refresh token (realm revokeRefreshToken=true). */
async function refreshFull(token: string): Promise<{ status: number; next: string }> {
  const res = await fetch(`${base}/realms/${realm}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', client_id: 'proyekkas-mobile', refresh_token: token }),
  })
  const body = (await res.json().catch(() => ({}))) as { refresh_token?: string }
  return { status: res.status, next: body.refresh_token ?? token }
}
const refresh = async (token: string) => (await refreshFull(token)).status

describe('Keycloak 26.7.4 Admin REST (real server)', () => {
  const email = `kc-${randomUUID().slice(0, 8)}@drms.test`
  let id = ''

  it('create → find by exact email (Location header id)', async () => {
    id = await kc.createUser({ email, firstName: 'Kc Test', enabled: true })
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    expect(await kc.findUserByEmail(email)).toEqual({ id, enabled: true })
    expect(await kc.findUserByEmail(`x${email}`)).toBeNull()
  })

  it('realm role mappings: add, read, remove (RoleRepresentation lookup by name)', async () => {
    await kc.addRealmRoles(id, ['pk-staff', 'pk-pm'])
    expect((await kc.getRealmRoles(id)).filter((r) => r.startsWith('pk-')).sort()).toEqual(['pk-pm', 'pk-staff'])
    await kc.removeRealmRoles(id, ['pk-pm'])
    expect((await kc.getRealmRoles(id)).filter((r) => r.startsWith('pk-'))).toEqual(['pk-staff'])
  })

  it('disable / enable and email change', async () => {
    await kc.updateUser(id, { enabled: false })
    expect((await kc.findUserByEmail(email))?.enabled).toBe(false)
    await kc.updateUser(id, { enabled: true, firstName: 'Kc Renamed' })
    expect((await kc.findUserByEmail(email))?.enabled).toBe(true)
  })

  it('execute-actions-email fails without realm SMTP (the app treats it as non-fatal)', async () => {
    await expect(kc.executeActionsEmail(id, ['UPDATE_PASSWORD'])).rejects.toBeInstanceOf(KeycloakAdminError)
  })

  it('offline session of a device: DELETE ?isOffline=true ends it (refresh → 400); online variant → absent', async () => {
    const t = await passwordGrant('openid offline_access')
    const sid = decodeJwt(t.access_token).sid as string
    expect(sid).toBeTruthy()
    expect(await refresh(t.refresh_token)).toBe(200)
    const t2 = await passwordGrant('openid offline_access')
    const sid2 = decodeJwt(t2.access_token).sid as string
    expect(await kc.deleteSession(sid2, true)).toBe(true)
    expect(await kc.deleteSession(sid2, true)).toBe(false) // 404 → false
    expect(await refresh(t2.refresh_token)).toBe(400)
  })

  it('online session: DELETE (isOffline=false) ends it', async () => {
    const t = await passwordGrant('openid')
    const sid = decodeJwt(t.access_token).sid as string
    expect(await kc.deleteSession(sid, false)).toBe(true)
    expect(await refresh(t.refresh_token)).toBe(400)
  })

  it('user logout + revoke mobile consent (offline tokens) — deactivation path', async () => {
    const kcUser = (await kc.findUserByEmail('kc.session@drms.test'))!
    await kc.logoutUser(kcUser.id) // 204 (ends online sessions; spike b: offline sessions survive it)
    const t = await passwordGrant('openid offline_access')
    await kc.revokeConsent(kcUser.id, 'proyekkas-mobile')
    expect(await refresh(t.refresh_token)).toBe(400)
  })

  it('delete user (compensation path)', async () => {
    await kc.deleteUser(id)
    expect(await kc.findUserByEmail(email)).toBeNull()
    await kc.deleteUser(id) // 404 tolerated
  })
})
