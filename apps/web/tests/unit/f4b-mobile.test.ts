import { describe, expect, it } from 'vitest'

import { buildOpenApiDocument } from '@/api/v1/openapi'
import { DeviceRegister } from '@/api/v1/schemas'
import { integrityRisk } from '@/domain/devices'
import { parseEnv } from '@/lib/env'

/** F4b pure parts: device integrity signals (ADR 0010 decision 10), push flag guard (ADR 0011). */
const base = {
  DATABASE_URL: 'postgres://u:p@h:5432/d',
  PAYLOAD_SECRET: 'x'.repeat(40),
  APP_URL: 'https://drms-kas.staging.bimacreative.tech',
  OIDC_ISSUER: 'https://auth.bimacreative.tech/realms/drms-staging',
  OIDC_WEB_CLIENT_ID: 'proyekkas-web',
  OIDC_WEB_CLIENT_SECRET: 'y'.repeat(20),
  OIDC_MOBILE_CLIENT_ID: 'proyekkas-mobile',
}
const clean = { rooted: false, emulator: false, developerMode: false, adbEnabled: false }

describe('device integrity (ADR 0010 decision 10)', () => {
  it('risk = rooted, emulator or a mocked GPS fix; developer options / USB debugging alone are not a risk', () => {
    expect(integrityRisk(clean)).toBe(false)
    expect(integrityRisk({ ...clean, developerMode: true, adbEnabled: true })).toBe(false)
    expect(integrityRisk({ ...clean, mockLocation: null })).toBe(false)
    expect(integrityRisk({ ...clean, rooted: true })).toBe(true)
    expect(integrityRisk({ ...clean, emulator: true })).toBe(true)
    expect(integrityRisk({ ...clean, mockLocation: true })).toBe(true)
  })

  it('register body: integrity optional, strict, booleans only', () => {
    const id = '5b0c2f7e-2d1a-4e0b-8f5e-7a9d3c1b2e44'
    expect(DeviceRegister.safeParse({ deviceId: id, platform: 'android' }).success).toBe(true)
    expect(DeviceRegister.safeParse({ deviceId: id, platform: 'android', integrity: clean }).success).toBe(true)
    expect(DeviceRegister.safeParse({ deviceId: id, platform: 'android', integrity: { ...clean, mockLocation: null } }).success).toBe(true)
    expect(DeviceRegister.safeParse({ deviceId: id, platform: 'android', integrity: { ...clean, rooted: 'yes' } }).success).toBe(false)
    expect(DeviceRegister.safeParse({ deviceId: id, platform: 'android', integrity: { ...clean, extra: true } }).success).toBe(false)
    expect(DeviceRegister.safeParse({ deviceId: id, platform: 'android', integrity: { rooted: false } }).success).toBe(false)
  })

  it('OpenAPI documents DeviceIntegrity and the Problem code (DEVICE_REVOKED)', () => {
    const doc = buildOpenApiDocument('0.0.0') as unknown as { components: { schemas: Record<string, { properties?: Record<string, unknown> }> } }
    expect(doc.components.schemas.DeviceIntegrity).toBeDefined()
    expect(Object.keys(doc.components.schemas.Problem?.properties ?? {})).toContain('code')
    expect(Object.keys(doc.components.schemas.Device?.properties ?? {})).toEqual(expect.arrayContaining(['integrityRisk', 'integrityCheckedAt']))
  })
})

describe('PUSH_FCM_ENABLED (ADR 0011, Q-44)', () => {
  it('defaults to false; true is refused at boot while no FCM dispatcher exists; junk is refused', () => {
    expect(parseEnv(base).PUSH_FCM_ENABLED).toBe(false)
    expect(parseEnv({ ...base, PUSH_FCM_ENABLED: 'false' }).PUSH_FCM_ENABLED).toBe(false)
    expect(() => parseEnv({ ...base, PUSH_FCM_ENABLED: 'true' })).toThrow(/PUSH_FCM_ENABLED/)
    expect(() => parseEnv({ ...base, PUSH_FCM_ENABLED: 'yes' })).toThrow(/PUSH_FCM_ENABLED/)
  })
})
