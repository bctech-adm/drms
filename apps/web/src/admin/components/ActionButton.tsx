'use client'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

/**
 * Posts one /api/v1 action with the admin cookie session (same-origin fetch: the session strategy
 * checks Origin on unsafe methods) and refreshes the server-rendered view. Optional reason/note
 * prompt (G7: reject, revision, cancel). The server re-checks every action; this is UI only.
 */
export type ActionButtonProps = {
  url: string
  label: string
  body?: Record<string, unknown>
  prompt?: { field: string; message: string }
  confirm?: string
  variant?: 'primary' | 'secondary'
}

export async function postJson(url: string, body: unknown): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  const data = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, data }
}

export function problemText(data: unknown, status: number): string {
  const p = (data ?? {}) as { title?: string; detail?: string; errors?: Array<{ path?: string; message?: string }> }
  const errs = (p.errors ?? []).map((e) => `${e.path ? `${e.path}: ` : ''}${e.message ?? ''}`).join('; ')
  return [p.detail ?? p.title ?? `HTTP ${status}`, errs].filter(Boolean).join(' — ')
}

export function ActionButton({ url, label, body, prompt, confirm, variant = 'secondary' }: ActionButtonProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = async () => {
    setError(null)
    const payload: Record<string, unknown> = { ...(body ?? {}) }
    if (prompt) {
      const v = window.prompt(prompt.message)
      if (v === null) return
      payload[prompt.field] = v.trim()
    } else if (confirm && !window.confirm(confirm)) return
    setBusy(true)
    try {
      const r = await postJson(url, payload)
      if (!r.ok) setError(problemText(r.data, r.status))
      else router.refresh()
    } catch {
      setError('Gagal menghubungi server.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, marginRight: 6 }}>
      <button type="button" className={`btn btn--style-${variant} btn--size-small`} style={{ margin: 0 }} disabled={busy} onClick={run}>
        {busy ? 'Memproses…' : label}
      </button>
      {error ? <span style={{ color: 'var(--theme-error-500)', fontSize: 12, maxWidth: 320 }}>{error}</span> : null}
    </span>
  )
}

export default ActionButton
