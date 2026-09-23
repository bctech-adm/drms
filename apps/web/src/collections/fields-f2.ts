import type { Field } from 'payload'

import { isBusinessDate } from '@/domain/expense/types'

/**
 * Business date (company TZ, no time) stored as text `YYYY-MM-DD` (+ DB CHECK in the F2a security
 * migration): TZ-free comparisons in SQL (period lock) and in the flag rules.
 */
export function businessDateField(name: string, label: string, extra: Record<string, unknown> = {}): Field {
  return {
    name,
    type: 'text',
    label,
    maxLength: 10,
    validate: (v: unknown) => (v === null || v === undefined || v === '' || isBusinessDate(v) ? true : 'Tanggal harus YYYY-MM-DD.'),
    ...extra,
  } as Field
}

export const SOURCE_OPTIONS = ['web', 'apk', 'system', 'job'].map((s) => ({ label: s, value: s }))
export const ro = { readOnly: true }
