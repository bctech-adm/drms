'use client'
import { useAuth, useDocumentInfo } from '@payloadcms/ui'
import React from 'react'

/**
 * Sidebar "Cetak PDF" of an expense request (M16, US-46): links to the audited API download; the
 * internal copy (validation flags) only for Finance/Owner/Admin (server-enforced as well).
 */
export function PdfLinks() {
  const { id, initialData } = useDocumentInfo()
  const { user } = useAuth()
  const roles = ((user as { roles?: string[] } | null)?.roles ?? []) as string[]
  if (!id || !initialData?.docNo) return null
  const internal = roles.some((r) => r === 'pk-finance' || r === 'pk-owner' || r === 'pk-admin')
  return (
    <div className="field-type" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <a className="btn btn--style-secondary btn--size-small" style={{ margin: 0 }} href={`/api/v1/expense-requests/${id}/pdf`}>
        Cetak PDF Pengajuan Biaya
      </a>
      {internal ? (
        <a className="btn btn--style-secondary btn--size-small" style={{ margin: 0 }} href={`/api/v1/expense-requests/${id}/pdf?variant=internal`}>
          PDF salinan internal (flag)
        </a>
      ) : null}
    </div>
  )
}

export default PdfLinks
