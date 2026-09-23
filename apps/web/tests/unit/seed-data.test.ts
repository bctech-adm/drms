import { describe, expect, it } from 'vitest'

import { DEFAULT_SEED_DATA, loadSeedData, SeedDataSchema } from '@/seed/data'

describe('seed data (SEED_DATA_FILE)', () => {
  it('default (fictional) data matches the schema', () => {
    expect(SeedDataSchema.safeParse(DEFAULT_SEED_DATA).success).toBe(true)
    expect(loadSeedData({})).toEqual(DEFAULT_SEED_DATA)
    expect(loadSeedData({ SEED_DATA_FILE: '  ' })).toEqual(DEFAULT_SEED_DATA)
  })

  it('loads and validates a JSON file of the same shape', () => {
    const custom = { ...DEFAULT_SEED_DATA, employees: [...DEFAULT_SEED_DATA.employees, { code: 'EMP-099', name: 'Contoh Karyawan' }] }
    const read = (p: string) => {
      expect(p).toBe('/run/secrets/seed_data')
      return JSON.stringify(custom)
    }
    expect(loadSeedData({ SEED_DATA_FILE: '/run/secrets/seed_data' }, read).employees).toHaveLength(DEFAULT_SEED_DATA.employees.length + 1)
  })

  it('rejects unreadable, non-JSON, wrong-shape and dangling references without echoing content', () => {
    const env = { SEED_DATA_FILE: '/x.json' }
    expect(() => loadSeedData(env, () => { throw new Error('ENOENT') })).toThrow(/not readable or not valid JSON/)
    expect(() => loadSeedData(env, () => 'secret-value{')).toThrow(/not readable or not valid JSON/)
    expect(() => loadSeedData(env, () => JSON.stringify({ ...DEFAULT_SEED_DATA, extra: 1 }))).toThrow(/does not match/)
    const badAcc = { ...DEFAULT_SEED_DATA, employeeBankAccounts: [{ employee: 'EMP-404', bank: 'MANDIRI', accountNo: '12AB', accountHolder: 'X', isDefault: true }] }
    let msg = ''
    try {
      loadSeedData(env, () => JSON.stringify(badAcc))
    } catch (e) {
      msg = (e as Error).message
    }
    expect(msg).toMatch(/employeeBankAccounts\.0\.accountNo/)
    expect(msg).toMatch(/employeeBankAccounts\.0\.employee: unknown employee code/)
    expect(msg).not.toMatch(/12AB/)
    const badVeh = { ...DEFAULT_SEED_DATA, vehicles: [{ plateNo: 'DA 1 A', type: 'Hilux', costCenter: 'NOPE' }] }
    expect(() => loadSeedData(env, () => JSON.stringify(badVeh))).toThrow(/vehicles\.0\.costCenter/)
  })
})
