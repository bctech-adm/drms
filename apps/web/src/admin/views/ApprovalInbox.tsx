import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { approvalInbox } from '@/domain/expense/queues'
import { withReqTransaction } from '@/lib/system-tx'

import { ActionButton } from '../components/ActionButton'
import { AddendumInboxSection } from './Addendum'
import { Empty, Shell, badge, docLink, num, rp, table, td, th } from './shared'

/**
 * "Persetujuan" (M04, US-26/US-42/US-59): requests waiting for the logged-in user's "Diketahui"
 * (ADR 0013: the Direktur's approval, "Persetujuan Direktur (Diketahui)") or Finance approval — only those the rule snapshot assigns to them (G2) and never their own (G1). Budget
 * impact % before → after (red above company-settings.budgetWarnPct, default 85 %; cost centers
 * "tanpa anggaran", Q-24) and open validation flags. Actions call /api/v1 (profile signature, US-43).
 */
export async function ApprovalInbox(props: AdminViewServerProps) {
  const req = props.initPageResult.req
  const { items, budgetWarnPct } = await withReqTransaction(req, () => approvalInbox(req))
  return (
    <Shell props={props} title="Persetujuan">
      <p style={{ marginTop: 0 }}>
        Pengajuan yang menunggu keputusan Anda. Merah = anggaran project sesudah disetujui melebihi {budgetWarnPct}%.
      </p>
      {items.length === 0 ? (
        <Empty text="Tidak ada pengajuan yang menunggu keputusan Anda." />
      ) : (
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Nomor / Judul</th>
              <th style={th}>Jenis</th>
              <th style={th}>Project / Pusat biaya</th>
              <th style={th}>Diajukan oleh</th>
              <th style={{ ...th, textAlign: 'right' }}>Grand total</th>
              <th style={th}>Dampak anggaran</th>
              <th style={th}>Flag</th>
              <th style={th}>Langkah</th>
              <th style={th}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id}>
                <td style={td}>
                  {docLink(r.id, r.docNo ?? `#${r.id}`)}
                  <div>{r.title}</div>
                </td>
                <td style={td}>{r.typeLabel}</td>
                <td style={td}>{r.scope || '—'}</td>
                <td style={td}>{r.requesters || '—'}</td>
                <td style={num}>{rp(r.grandTotal)}</td>
                <td style={td}>
                  {r.budget.pctBefore === null ? (
                    <span style={badge('muted')}>tanpa anggaran</span>
                  ) : (
                    <span style={badge(r.budget.overWarn ? 'bad' : 'ok')}>
                      {r.budget.pctBefore}% → {r.budget.pctAfter}%
                    </span>
                  )}
                </td>
                <td style={td}>
                  {r.flags.warning > 0 ? <span style={badge('warn')}>{r.flags.warning} peringatan</span> : null}{' '}
                  {r.flags.info > 0 ? <span style={badge('muted')}>{r.flags.info} info</span> : null}
                  {r.flags.warning + r.flags.info === 0 ? '—' : null}
                </td>
                <td style={td}>{r.stepLabel}</td>
                <td style={td}>
                  {r.step === 'acknowledge' ? (
                    // ADR 0013: "Diketahui" is the Direktur's approval → "Setujui" (legacy PM step: "Diketahui").
                    <ActionButton
                      url={`/api/v1/expense-requests/${r.id}/acknowledge`}
                      label={r.decisionFlow ? 'Setujui' : 'Diketahui'}
                      variant="primary"
                      confirm={r.decisionFlow ? `Setujui ${r.docNo} sebesar ${rp(r.grandTotal)} sebagai Direktur (Diketahui)?` : `Tandai ${r.docNo} sudah diketahui?`}
                    />
                  ) : (
                    <ActionButton url={`/api/v1/expense-requests/${r.id}/approve`} label="Setujui" variant="primary" confirm={`Setujui ${r.docNo} sebesar ${rp(r.grandTotal)}?`} />
                  )}
                  <ActionButton url={`/api/v1/expense-requests/${r.id}/reject`} label="Tolak" prompt={{ field: 'reason', message: 'Alasan penolakan (wajib):' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* E5: Addendum RAB waiting for the caller (Direktur "Setujui" / Finance approval). */}
      <AddendumInboxSection req={req} />
    </Shell>
  )
}

export default ApprovalInbox
