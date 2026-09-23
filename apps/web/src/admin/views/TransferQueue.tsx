import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { transferQueue } from '@/domain/expense/queues'
import { withReqTransaction } from '@/lib/system-tx'

import { MoneyForm } from '../components/MoneyForm'
import { Empty, Forbidden, Shell, allowed, badge, docLink, num, rp, table, td, th } from './shared'

/**
 * "Antrian Transfer" (M05, US-19/US-20): Uang Muka "Disetujui (Antri Transfer)" and Reimburse
 * "Nota Terverifikasi (Antri Transfer)", sorted by needed date, open flags shown. Finance records
 * the transfer (cash account, bank reference, proof); the amount is the approved amount (G3).
 */
export async function TransferQueue(props: AdminViewServerProps) {
  const req = props.initPageResult.req
  if (!allowed(req, ['pk-finance', 'pk-owner'])) return <Forbidden props={props} title="Antrian Transfer" roles={['pk-finance', 'pk-owner']} />
  const items = await withReqTransaction(req, () => transferQueue(req))
  const canTransfer = allowed(req, ['pk-finance'])
  const accounts = canTransfer
    ? (
        await req.payload.find({ collection: 'cash-accounts', where: { active: { not_equals: false } }, depth: 0, pagination: false, sort: 'name', user: req.user, overrideAccess: false, req })
      ).docs.map((a) => ({ id: a.id as number, name: a.name as string }))
    : []
  return (
    <Shell props={props} title={`Antrian Transfer (${items.length})`}>
      {items.length === 0 ? (
        <Empty text="Antrian transfer kosong." />
      ) : (
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Dibutuhkan</th>
              <th style={th}>Nomor / Judul</th>
              <th style={th}>Jenis</th>
              <th style={th}>Rekening tujuan</th>
              <th style={{ ...th, textAlign: 'right' }}>Nominal disetujui</th>
              <th style={th}>Flag terbuka</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <React.Fragment key={r.id}>
                <tr>
                  <td style={td}>{r.neededDate ?? '—'}</td>
                  <td style={td}>
                    {docLink(r.id, r.docNo ?? `#${r.id}`)}
                    <div>{r.title}</div>
                    <div style={{ fontSize: 12 }}>{r.scope}</div>
                  </td>
                  <td style={td}>{r.statusLabel}</td>
                  <td style={td}>{r.bank ? `${r.bank.bankName ?? ''} · ${r.bank.accountHolder ?? ''} · ${r.bank.accountNo ?? ''}` : '—'}</td>
                  <td style={num}>{rp(r.approvedAmount)}</td>
                  <td style={td}>{r.flags.warning + r.flags.info > 0 ? <span style={badge(r.flags.warning ? 'warn' : 'muted')}>{r.flags.warning + r.flags.info}</span> : '—'}</td>
                </tr>
                {canTransfer ? (
                  <tr>
                    <td style={td} />
                    <td style={td} colSpan={5}>
                      <MoneyForm
                        url={`/api/v1/expense-requests/${r.id}/transfer`}
                        submitLabel="Catat transfer"
                        cashAccounts={accounts}
                        bankRef="required"
                        proof={{ kind: 'transfer-proofs', required: true }}
                        amountText={`Transfer ${rp(r.approvedAmount)}`}
                      />
                    </td>
                  </tr>
                ) : null}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}
    </Shell>
  )
}

export default TransferQueue
