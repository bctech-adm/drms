'use client'
import { FieldLabel, useField } from '@payloadcms/ui'
import type { JSONFieldClientComponent } from 'payload'
import React from 'react'

/**
 * Read-only renderer for `json` fields. Payload's default JSON field loads the Monaco editor from
 * cdn.jsdelivr.net (@payloadcms/ui CodeEditor), which the nonce-strict CSP blocks (user decision
 * 2026-09-23: no json/code editors in the admin). Audit values are stored wrapped as `{ v: … }`.
 * React escapes the text; no HTML is injected.
 */
export const ReadOnlyJson: JSONFieldClientComponent = ({ field, path }) => {
  const { value } = useField<unknown>({ path })
  const unwrapped =
    value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 1 && 'v' in value
      ? (value as { v: unknown }).v
      : value
  const text = unwrapped === undefined || unwrapped === null ? '—' : JSON.stringify(unwrapped, null, 2)
  return (
    <div className="field-type pk-readonly-json">
      <FieldLabel label={field?.label} path={path} />
      <pre className="pk-readonly-json__value">{text}</pre>
    </div>
  )
}

export default ReadOnlyJson
