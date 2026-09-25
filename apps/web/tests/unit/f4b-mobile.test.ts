import { describe, expect, it } from 'vitest'

import { buildOpenApiDocument } from '@/api/v1/openapi'
import { DeviceRegister } from '@/api/v1/schemas'
import { integrityRisk } from '@/domain/devices'

/** F4b pure parts: device integrity signals (ADR 0010 decision 10). */
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
