import type { Payload, TypedUser } from 'payload'
import Link from 'next/link'
import React from 'react'

import { isStaffOnly, rolesOf } from '@/access/roles'

/**
 * admin.components.afterNavLinks: entries of the F2 work views with badge counts (US-19 "badge
 * jumlah antrian"). Counts respect the user's read access (overrideAccess:false).
 * F2c: staff-only users get the requester shortcuts instead (own requests, new request, profile
 * signature); the approval/finance views are not linked for them. F2d: "Profil & tanda tangan" for
 * every panel role (Owner signs approvals); the Antrian Transfer badge also counts Reimburse
 * receipts waiting for Finance verification (same view).
 */
export async function F2NavLinks({ payload, user }: { payload: Payload; user?: TypedUser }) {
  if (!user) return null
  const roles = rolesOf(user)
  const box: React.CSSProperties = { margin: '12px 0', paddingTop: 8, borderTop: '1px solid var(--theme-elevation-100)' }
  const plain: React.CSSProperties = { display: 'block', padding: '4px 0', textDecoration: 'none' }
  // Creating requests: Staff/PM/Admin/Finance (collection create access, Q-09). The profile (own
  // signature, US-43) is linked for EVERY panel role — Owner approves and needs a signature too.
  const creator = roles.some((r) => r === 'pk-staff' || r === 'pk-pm' || r === 'pk-admin' || r === 'pk-finance')
  const requesterLinks = (
    <>
      {creator ? (
        <Link href="/admin/collections/expense-requests/create" style={plain}>
          + Buat pengajuan
        </Link>
      ) : null}
      <Link href={`/admin/collections/users/${user.id}`} style={plain} data-pk-nav-link="profile">
        Profil &amp; tanda tangan
      </Link>
    </>
  )
  if (isStaffOnly(user)) {
    return (
      <div style={box} data-pk-nav="staff">
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Pengajuan saya</div>
        <Link href="/admin/collections/expense-requests" style={plain}>
          Daftar pengajuan
        </Link>
        {requesterLinks}
      </div>
    )
  }
  const office = roles.includes('pk-finance') || roles.includes('pk-owner')
  let transfers = 0
  let lpj = 0
  if (office) {
    const [t, l] = await Promise.all([
      payload.count({
        collection: 'expense-requests',
        where: {
          or: [
            { and: [{ type: { equals: 'advance' } }, { status: { equals: 'approved' } }] },
            { and: [{ type: { equals: 'reimburse' } }, { status: { in: ['approved', 'receipts_verified'] } }] },
          ],
        },
        user,
        overrideAccess: false,
      }),
      payload.count({ collection: 'expense-requests', where: { status: { in: ['lpj_submitted', 'lpj_verified'] } }, user, overrideAccess: false }),
    ])
    transfers = t.totalDocs
    lpj = l.totalDocs
  }
  const link: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '4px 0', textDecoration: 'none' }
  const pill: React.CSSProperties = { background: 'var(--theme-error-500)', color: '#fff', borderRadius: 10, padding: '0 7px', fontSize: 11, fontWeight: 700 }
  return (
    <div style={box}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Alur kerja</div>
      <Link href="/admin/persetujuan" style={link}>
        Persetujuan
      </Link>
      {office ? (
        <>
          <Link href="/admin/antrian-transfer" style={link}>
            Antrian Transfer {transfers > 0 ? <span style={pill}>{transfers}</span> : null}
          </Link>
          <Link href="/admin/verifikasi-lpj" style={link}>
            Verifikasi LPJ {lpj > 0 ? <span style={pill}>{lpj}</span> : null}
          </Link>
        </>
      ) : null}
      {requesterLinks}
    </div>
  )
}

export default F2NavLinks
