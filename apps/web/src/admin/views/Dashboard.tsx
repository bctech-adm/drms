import { Gutter } from '@payloadcms/ui'
import type { AdminViewServerProps, PayloadRequest } from 'payload'
import Link from 'next/link'
import React from 'react'

import { rolesOf, type Role } from '@/access/roles'
import { statusLabel } from '@/domain/expense/types'
import { adminDashboard, financeDashboard, ownerDashboard, pmDashboard, staffDashboard } from '@/domain/reports/dashboards'
import { lastDay } from '@/domain/reports/rules'
import { withReqTransaction } from '@/lib/system-tx'

import { Big, BudgetBadge, CashFlowChart, Empty, F3Root, Placeholder, rpx, Tile } from './f3-ui'

/**
 * "Beranda" — replaces Payload's default dashboard (admin.components.views.dashboard, verified in
 * @payloadcms/next 3.90.1 views/Dashboard: rendered inside the default template, receives
 * initPageResult + searchParams). Layout by role, Owner > Finance > PM > Admin > Staff; further
 * roles appear as tabs (?peran=…). Server-rendered; every number links to the list/report that
 * produces it (C9). A failing widget shows its own error, the others still render (wireframes §0).
 */
type Layout = 'owner' | 'finance' | 'pm' | 'admin' | 'staff'
const ORDER: Array<[Layout, Role]> = [
  ['owner', 'pk-owner'],
  ['finance', 'pk-finance'],
  ['pm', 'pk-pm'],
  ['admin', 'pk-admin'],
  ['staff', 'pk-staff'],
]
const LABEL: Record<Layout, string> = { owner: 'Owner', finance: 'Finance', pm: 'PM', admin: 'Admin', staff: 'Staff' }

const ER = '/admin/collections/expense-requests'
const where = (q: Record<string, string>) => new URLSearchParams(q).toString()
const rekapKasMonth = (period: string) => `/admin/laporan/rekap-kas?${where({ dari: period, sampai: period })}`

export async function Dashboard(props: AdminViewServerProps) {
  const req = props.initPageResult.req
  const user = req.user
  const roles = rolesOf(user)
  const layouts = ORDER.filter(([, r]) => roles.includes(r)).map(([l]) => l)
  const sp = (props.searchParams ?? {}) as Record<string, string | string[] | undefined>
  const asked = typeof sp.peran === 'string' ? (sp.peran as Layout) : undefined
  const layout: Layout | undefined = asked && layouts.includes(asked) ? asked : layouts[0]
  return (
    <Gutter>
      <F3Root name={`beranda-${layout ?? 'none'}`}>
        <h1 style={{ margin: '24px 0 12px' }}>Beranda{layout ? ` · ${LABEL[layout]}` : ''}</h1>
        {layouts.length > 1 ? (
          <nav className="pk-tabs" aria-label="Tampilan peran">
            {layouts.map((l) => (
              <a key={l} href={`/admin?peran=${l}`} aria-current={l === layout ? 'page' : undefined} data-pk-role-tab={l}>
                {LABEL[l]}
              </a>
            ))}
          </nav>
        ) : null}
        {!layout ? <Empty text="Akun Anda belum punya peran ProyekKas. Hubungi Admin." /> : await render(layout, req, sp)}
      </F3Root>
    </Gutter>
  )
}

async function render(layout: Layout, req: PayloadRequest, sp: Record<string, string | string[] | undefined>) {
  try {
    switch (layout) {
      // awaited here (not rendered as <Owner/>) so a failing query is caught by this try
      case 'owner':
        return await Owner({ req, months: sp.bulan === '6' ? 6 : 12 })
      case 'finance':
        return await Finance({ req })
      case 'pm':
        return await Pm({ req })
      case 'admin':
        return await Admin({ req })
      default:
        return await Staff({ req })
    }
  } catch (err) {
    const id = String((req.context as { pkRequestId?: string }).pkRequestId ?? '')
    req.payload.logger.error({ msg: 'dashboard failed', layout, err: (err as Error).message })
    return <Empty text={`Data tidak dapat dimuat${id ? ` (kode permintaan ${id})` : ''}.`} />
  }
}

// ---------------------------------------------------------------- Owner (wireframe §1)

async function Owner({ req, months }: { req: PayloadRequest; months: 6 | 12 }) {
  const d = await withReqTransaction(req, () => ownerDashboard(req, { months }))
  return (
    <>
      <p className="pk-note">Per {d.asOf} (WITA). Warna anggaran dari Komitmen.</p>
      <div className="pk-tiles">
        <Tile title="Menunggu persetujuan" id="approvals" href="/admin/persetujuan" more="Buka Persetujuan →">
          {d.approvals.count === 0 ? (
            <Empty text="Tidak ada pengajuan yang menunggu. ✓" />
          ) : (
            <>
              <Big id="k10-count" href={`${ER}?${where({ 'where[status][in]': 'pending_ack,pending_approval' })}`}>
                {d.approvals.count} pengajuan
              </Big>
              <p data-pk-kpi="k10-sum">{rpx(d.approvals.sum)}</p>
              <p data-pk-kpi="k10-mine">{d.approvals.waitingForMe} menunggu saya</p>
              {d.approvals.oldestDays !== null ? <p>tertua {d.approvals.oldestDays} hari</p> : null}
            </>
          )}
        </Tile>
        <Tile title="Saldo kas" id="cash" href={rekapKasMonth(d.month)} more="Laporan Rekap Kas →">
          {d.cash.accounts.length === 0 ? (
            <Empty text="Belum ada akun kas. Admin/Finance menambah di Master Data › Akun kas/bank." />
          ) : (
            <>
              <Big id="k01-total">{rpx(d.cash.total)}</Big>
              {d.cash.accounts.map((a) => (
                <p key={a.id} data-pk-account={a.id}>
                  {a.name}
                  {a.active ? '' : ' (nonaktif)'}: {rpx(a.balance)}
                </p>
              ))}
              <p data-pk-kpi="k02b-month">
                Bulan ini: +{rpx(d.cash.monthIn)} / −{rpx(d.cash.monthOut)}
              </p>
            </>
          )}
        </Tile>
        <Tile title="Kelengkapan nota/LPJ" id="completeness" href="/admin/laporan/kelengkapan" more="Laporan Kelengkapan →">
          <Big id="k12g">
            {d.completeness.ratioDone} dari {d.completeness.ratioTotal} uang muka sudah LPJ
          </Big>
          <p data-pk-kpi="k12b">{d.completeness.overdue > 0 ? `⚠ ${d.completeness.overdue} LPJ terlambat` : 'Tidak ada LPJ terlambat'}</p>
          <p data-pk-kpi="k12a">{d.completeness.withoutLpj} uang muka belum LPJ</p>
          <p data-pk-kpi="k12e">{d.completeness.reimburseToVerify} nota reimburse menunggu verifikasi</p>
          <p data-pk-kpi="k12f">{d.completeness.openWarnings} flag peringatan terbuka</p>
        </Tile>
        <Tile title="Anggaran terpakai (komitmen)" id="budget" href="#anggaran" more="Tabel anggaran ↓">
          {d.budget.running === 0 ? (
            <Empty text="Belum ada project berjalan dengan RAB." />
          ) : (
            <>
              <Big id="k08-running">{d.budget.running} project berjalan</Big>
              <p>
                <BudgetBadge tone="over" /> {d.budget.over}
              </p>
              <p>
                <BudgetBadge tone="warn" /> {d.budget.warn}
              </p>
              <p>
                <BudgetBadge tone="ok" /> {d.budget.ok}
              </p>
              {d.budget.none ? (
                <p>
                  <BudgetBadge tone="none" /> {d.budget.none}
                </p>
              ) : null}
            </>
          )}
        </Tile>
      </div>

      <section className="pk-block">
        <h2>Arus kas bulanan (tanpa transaksi yang di-void)</h2>
        <nav className="pk-tabs" aria-label="Rentang grafik">
          <Link href="/admin?peran=owner&bulan=12" aria-current={d.cashFlow.months === 12 ? 'page' : undefined}>
            12 bulan
          </Link>
          <Link href="/admin?peran=owner&bulan=6" aria-current={d.cashFlow.months === 6 ? 'page' : undefined}>
            6 bulan
          </Link>
          <a href={`/admin/laporan/rekap-kas`}>Tampilkan koreksi void (Rekap Kas) →</a>
        </nav>
        <CashFlowChart id="owner-cashflow" rows={d.cashFlow.rows} hrefOf={rekapKasMonth} />
        <p className="pk-note">Grafik operasional (K-02b): transaksi yang di-void dan jurnal baliknya disembunyikan. Laporan resmi = Rekap Kas.</p>
      </section>

      <section className="pk-block" id="anggaran">
        <h2>Anggaran project</h2>
        <ProjectTable projects={d.projects} empty="Belum ada project." />
      </section>

      <div className="pk-tiles">
        <Tile title="Pusat biaya bulan ini" id="cost-centers">
          {d.costCenters.length === 0 ? (
            <Empty text="Belum ada biaya pusat biaya bulan ini." />
          ) : (
            d.costCenters.map((c) => (
              <p key={c.id} data-pk-cost-center={c.id}>
                <a href={`/admin/laporan/rekap-kas?${where({ pusat: String(c.id), dari: d.month, sampai: d.month })}`}>
                  {c.code} {c.name}
                </a>
                : {rpx(c.total)}
              </p>
            ))
          )}
        </Tile>
        <Tile title="Antrian transfer (lihat saja)" id="transfer-queue" href="/admin/antrian-transfer" more="Antrian Transfer →">
          {d.transferQueue.count === 0 ? (
            <Empty text="Antrian transfer kosong." />
          ) : (
            <>
              <Big id="k11-count">
                {d.transferQueue.count} · {rpx(d.transferQueue.sum)}
              </Big>
              <p>{d.transferQueue.overdue} lewat tanggal dibutuhkan</p>
            </>
          )}
        </Tile>
      </div>
    </>
  )
}

function ProjectTable({ projects, empty, pm }: { projects: Awaited<ReturnType<typeof ownerDashboard>>['projects']; empty: string; pm?: boolean }) {
  if (projects.length === 0) return <Empty text={empty} />
  return (
    <div className="pk-scroll">
      <table className="pk-table" data-pk-table="projects">
        <thead>
          <tr>
            <th>Project</th>
            <th className="n pk-secondary">RAB</th>
            <th className="n pk-secondary">Komitmen</th>
            <th className="n">%</th>
            <th>Status</th>
            {pm ? null : <th className="n pk-secondary">Dicairkan</th>}
            {pm ? null : <th className="n pk-secondary">Realisasi</th>}
            <th className="pk-secondary">Progress fisik</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id} data-pk-project={p.code}>
              <td>
                <a href={`/admin/laporan/anggaran-project?project=${p.id}`}>
                  {p.code} {p.name}
                </a>
              </td>
              <td className="n pk-secondary">{rpx(p.budget)}</td>
              <td className="n pk-secondary">{rpx(p.committed)}</td>
              <td className="n" data-pk-kpi="k08">
                {p.pct === null ? '—' : p.pct.toFixed(2).replace('.', ',')}
              </td>
              <td>
                <BudgetBadge tone={p.tone} />
              </td>
              {pm ? null : <td className="n pk-secondary">{rpx(p.disbursedNet)}</td>}
              {pm ? null : <td className="n pk-secondary">{rpx(p.realized)}</td>}
              <td className="pk-secondary">(F5)</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------- Finance (wireframe §2)

async function Finance({ req }: { req: PayloadRequest }) {
  const d = await withReqTransaction(req, () => financeDashboard(req))
  return (
    <>
      <p className="pk-note">Per {d.asOf} (WITA).</p>
      <div className="pk-tiles">
        <Tile title="Antrian transfer" id="transfer-queue" href="/admin/antrian-transfer" more="Antrian Transfer →">
          {d.transferQueue.count === 0 ? (
            <Empty text="Antrian transfer kosong." />
          ) : (
            <>
              <Big id="k11-count">
                {d.transferQueue.count} · {rpx(d.transferQueue.sum)}
              </Big>
              <p data-pk-kpi="k11-overdue">{d.transferQueue.overdue} lewat tanggal dibutuhkan</p>
            </>
          )}
        </Tile>
        <Tile title="Verifikasi nota reimburse" id="receipts" href="/admin/antrian-transfer" more="Verifikasi nota →">
          {d.reimburseToVerify.count === 0 ? (
            <Empty text="Tidak ada nota reimburse yang menunggu." />
          ) : (
            <>
              <Big id="k12e">{d.reimburseToVerify.count} pengajuan</Big>
              <p>{d.reimburseToVerify.warnings} flag peringatan</p>
            </>
          )}
        </Tile>
        <Tile title="Verifikasi LPJ" id="lpj-verify" href="/admin/verifikasi-lpj" more="Verifikasi LPJ →">
          {d.lpjToVerify === 0 ? <Empty text="Tidak ada LPJ yang menunggu." /> : <Big id="k12c">{d.lpjToVerify} LPJ</Big>}
        </Tile>
        <Tile title="Selesaikan selisih LPJ" id="lpj-settle" href="/admin/verifikasi-lpj" more="Verifikasi LPJ →">
          {d.lpjToSettle.count === 0 ? (
            <Empty text="Tidak ada LPJ yang menunggu." />
          ) : (
            <>
              <Big id="k12d">{d.lpjToSettle.count} LPJ</Big>
              {d.lpjToSettle.refund ? <p>pengembalian {rpx(d.lpjToSettle.refund)}</p> : null}
              {d.lpjToSettle.shortfall ? <p>kekurangan {rpx(d.lpjToSettle.shortfall)}</p> : null}
            </>
          )}
        </Tile>
      </div>

      <section className="pk-block">
        <h2>Uang muka belum LPJ (terlambat &gt; {d.lpjDueDays} hari)</h2>
        {d.advancesWithoutLpj.length === 0 ? (
          <Empty text="Semua uang muka sudah ber-LPJ. ✓" />
        ) : (
          <div className="pk-scroll">
            <table className="pk-table" data-pk-table="advances-without-lpj">
              <thead>
                <tr>
                  <th>Nomor</th>
                  <th className="pk-secondary">Pemohon</th>
                  <th className="n">Nominal</th>
                  <th className="n">Umur</th>
                </tr>
              </thead>
              <tbody>
                {d.advancesWithoutLpj.map((a) => (
                  <tr key={a.id} data-pk-overdue={a.overdue ? 'yes' : 'no'}>
                    <td>
                      <a href={`${ER}/${a.id}`}>{a.docNo ?? `#${a.id}`}</a>
                    </td>
                    <td className="pk-secondary">{a.requesters || '—'}</td>
                    <td className="n">{rpx(a.transferredTotal)}</td>
                    <td className="n">
                      {a.ageDays ?? '—'} hr {a.overdue ? <span className="pk-badge over">⚠ terlambat</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="pk-block">
        <h2>Saldo per akun</h2>
        {d.accounts.length === 0 ? (
          <Empty text="Belum ada akun kas." />
        ) : (
          <div className="pk-scroll">
            <table className="pk-table" data-pk-table="accounts">
              <thead>
                <tr>
                  <th>Akun</th>
                  <th className="n">Saldo</th>
                  <th className="n pk-secondary">Masuk bulan ini</th>
                  <th className="n pk-secondary">Keluar bulan ini</th>
                </tr>
              </thead>
              <tbody>
                {d.accounts.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <a href={`/admin/laporan/rekap-kas?akun=${a.id}`}>
                        {a.name}
                        {a.active ? '' : ' (nonaktif)'}
                      </a>
                    </td>
                    <td className="n">{rpx(a.balance)}</td>
                    <td className="n pk-secondary">{rpx(a.monthIn)}</td>
                    <td className="n pk-secondary">{rpx(a.monthOut)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td className="n" data-pk-kpi="k01-total">
                    {rpx(d.cashTotal)}
                  </td>
                  <td className="pk-secondary" />
                  <td className="pk-secondary" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <section className="pk-block">
        <h2>Arus kas bulanan (buku kas, termasuk koreksi void)</h2>
        <CashFlowChart id="finance-cashflow" rows={d.cashFlow.rows} hrefOf={rekapKasMonth} />
      </section>

      <div className="pk-tiles">
        <Tile title="Tutup buku" id="period-close" href="/admin/collections/period-closings" more="Daftar tutup buku →">
          <p data-pk-kpi="last-closed">{d.lastClosedPeriod ? `Bulan terakhir ditutup: ${d.lastClosedPeriod}` : 'Belum pernah tutup buku.'}</p>
          <p className="pk-note">Bulan yang bisa ditutup: {d.nextClosable} (bulan lampau saja; aksi lewat POST /api/v1/period-closings).</p>
        </Tile>
        <Tile title="Aksi cepat" id="quick">
          <p>
            <Link href="/admin/collections/cash-entries">Kas masuk / keluar</Link>
          </p>
          <p>
            <Link href="/admin/laporan">Laporan</Link>
          </p>
          <p>
            <a href={`${ER}/create`}>Buat pengajuan</a>
          </p>
        </Tile>
      </div>
    </>
  )
}

// ---------------------------------------------------------------- PM (wireframe §3)

async function Pm({ req }: { req: PayloadRequest }) {
  const d = await withReqTransaction(req, () => pmDashboard(req))
  const monthStart = `${d.month}-01`
  return (
    <>
      <p className="pk-note">Per {d.asOf} (WITA). Hanya project/pusat biaya tim Anda.</p>
      <div className="pk-tiles">
        <Tile title='Menunggu "Diketahui" saya' id="waiting-me" href="/admin/persetujuan" more="Buka Persetujuan →">
          {d.waitingForMe === 0 ? <Empty text="Tidak ada pengajuan yang menunggu Anda." /> : <Big id="k10-mine">{d.waitingForMe} pengajuan</Big>}
        </Tile>
        <Tile title="Pengajuan tim bulan ini" id="team-month" href={`${ER}?${where({ 'where[requestDate][greater_than_equal]': monthStart, 'where[requestDate][less_than_equal]': lastDay(d.month) })}`}>
          {d.teamMonth.count === 0 ? (
            <Empty text="Belum ada pengajuan tim bulan ini." />
          ) : (
            <>
              <Big id="k13-month">
                {d.teamMonth.count} · {rpx(d.teamMonth.sum)}
              </Big>
              <p>{d.teamMonth.waiting} menunggu persetujuan</p>
            </>
          )}
        </Tile>
        <Tile title="LPJ tim" id="team-lpj" href="/admin/laporan/kelengkapan" more="Laporan Kelengkapan →">
          {d.lpj.withoutLpj === 0 ? (
            <Empty text="Semua uang muka tim sudah ber-LPJ." />
          ) : (
            <>
              <Big id="k12a">{d.lpj.withoutLpj} belum LPJ</Big>
              <p data-pk-kpi="k12b">{d.lpj.overdue > 0 ? `⚠ ${d.lpj.overdue} terlambat` : 'tidak ada yang terlambat'}</p>
            </>
          )}
        </Tile>
        <Tile title="Kehadiran hari ini" id="attendance">
          <Placeholder id="attendance-f5" text="Tersedia setelah modul absensi (F5, US-13)." />
        </Tile>
      </div>

      <section className="pk-block">
        <h2>Project saya: anggaran vs progress</h2>
        <ProjectTable projects={d.projects} pm empty="Anda belum ditetapkan sebagai PM project mana pun. Hubungi Owner/Admin." />
        <p className="pk-note">Progress fisik, selisih dan warnanya tersedia setelah modul laporan progress (F5).</p>
      </section>

      <section className="pk-block">
        <h2>Pusat biaya saya bulan ini</h2>
        {d.costCenters.length === 0 ? (
          <Empty text="Anda tidak memegang pusat biaya." />
        ) : (
          d.costCenters.map((c) => (
            <p key={c.id} data-pk-cost-center={c.id}>
              <a href={`/admin/laporan/rekap-pengajuan?${where({ pusat: String(c.id), dari: monthStart, sampai: lastDay(d.month) })}`}>
                {c.code} {c.name}
              </a>
              : {rpx(c.total)}
            </p>
          ))
        )}
      </section>

      <section className="pk-block">
        <h2>Pengajuan tim terbaru</h2>
        {d.latest.length === 0 ? (
          <Empty text="Belum ada pengajuan tim." />
        ) : (
          <div className="pk-scroll">
            <table className="pk-table" data-pk-table="team-latest">
              <thead>
                <tr>
                  <th>Nomor</th>
                  <th className="pk-secondary">Judul</th>
                  <th className="pk-secondary">Pemohon</th>
                  <th>Status</th>
                  <th className="n">Grand total</th>
                </tr>
              </thead>
              <tbody>
                {d.latest.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <a href={`${ER}/${r.id}`}>{r.docNo ?? `#${r.id}`}</a>
                    </td>
                    <td className="pk-secondary">{r.title}</td>
                    <td className="pk-secondary">{r.requesters || '—'}</td>
                    <td>{statusLabel(r.type, r.status)}</td>
                    <td className="n">{rpx(r.grandTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p>
          <a href={ER}>Lihat semua →</a>
        </p>
      </section>
      <Placeholder id="progress-f5" text="Laporan progress terakhir: tersedia setelah modul laporan progress (F5, US-31)." />
    </>
  )
}

// ---------------------------------------------------------------- Admin (wireframe §4a)

async function Admin({ req }: { req: PayloadRequest }) {
  const d = await withReqTransaction(req, () => adminDashboard(req))
  const complete = d.gaps.usersIncomplete + d.gaps.projectsWithoutPm + d.gaps.costCentersWithoutManager === 0
  return (
    <>
      <div className="pk-tiles">
        <Tile title="Data master" id="master-gaps">
          {complete ? (
            <Empty text="Data master lengkap ✓" />
          ) : (
            <>
              <p data-pk-kpi="users-incomplete">
                <a href={`/admin/collections/users?${where({ 'where[employee][exists]': 'false' })}`}>{d.gaps.usersIncomplete} user tanpa karyawan/peran</a>
              </p>
              <p data-pk-kpi="projects-without-pm">
                <a href={`/admin/collections/projects?${where({ 'where[pm][exists]': 'false' })}`}>{d.gaps.projectsWithoutPm} project tanpa PM</a>
              </p>
              <p data-pk-kpi="cost-centers-without-manager">
                <a href={`/admin/collections/cost-centers?${where({ 'where[manager][exists]': 'false' })}`}>{d.gaps.costCentersWithoutManager} pusat biaya tanpa penanggung jawab</a>
              </p>
            </>
          )}
        </Tile>
      </div>
      <section className="pk-block">
        <h2>Audit log terbaru</h2>
        {d.latestAudit.length === 0 ? (
          <Empty text="Belum ada aktivitas." />
        ) : (
          <div className="pk-scroll">
            <table className="pk-table" data-pk-table="latest-audit">
              <thead>
                <tr>
                  <th>Waktu (WITA)</th>
                  <th>User</th>
                  <th>Aksi</th>
                  <th className="pk-secondary">Dokumen</th>
                </tr>
              </thead>
              <tbody>
                {d.latestAudit.map((a) => (
                  <tr key={a.id}>
                    <td>{a.localTime}</td>
                    <td>{a.userName ?? (a.userId === null ? 'sistem' : `user#${a.userId}`)}</td>
                    <td>{a.action}</td>
                    <td className="pk-secondary">
                      {a.docType} {a.docNo ?? a.docId ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p>
          <Link href="/admin/audit-log">Audit Log lengkap →</Link>
        </p>
      </section>
    </>
  )
}

// ---------------------------------------------------------------- Staff (wireframe §4, Q-F3-6)

async function Staff({ req }: { req: PayloadRequest }) {
  const d = await withReqTransaction(req, () => staffDashboard(req))
  const user = req.user as { id: number; name?: string | null; email?: string } | null
  const hint: Record<string, string> = {
    draft: 'belum diajukan',
    receipt_revision: 'perbaiki nota',
    transferred: 'unggah nota & kirim LPJ / konfirmasi selesai',
    receipts_complete: 'kirim LPJ',
    lpj_revision: 'perbaiki LPJ',
  }
  return (
    <>
      <p>Halo, {user?.name || user?.email}</p>
      <div className="pk-actions">
        <a className="pk-btn primary" href={`${ER}/create`} data-pk-action="new-request">
          + Buat pengajuan
        </a>
        <a className="pk-btn" href={`/admin/collections/users/${user?.id ?? ''}`}>
          Profil &amp; tanda tangan
        </a>
      </div>
      <section className="pk-block">
        <h2>Perlu tindakan saya</h2>
        {d.actions.length === 0 ? (
          <Empty text="Tidak ada yang perlu Anda kerjakan. ✓" />
        ) : (
          <ul data-pk-list="my-actions">
            {d.actions.map((r) => (
              <li key={r.id}>
                <a href={`${ER}/${r.id}`}>{r.docNo ?? `Draft "${r.title}"`}</a> {statusLabel(r.type, r.status)}: {hint[r.status] ?? ''} (umur {r.ageDays} hr)
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="pk-block">
        <h2>Pengajuan saya</h2>
        {d.latest.length === 0 ? (
          <Empty text="Anda belum punya pengajuan." />
        ) : (
          <div className="pk-scroll">
            <table className="pk-table" data-pk-table="my-requests">
              <thead>
                <tr>
                  <th>Nomor</th>
                  <th>Status</th>
                  <th className="n">Nominal</th>
                </tr>
              </thead>
              <tbody>
                {d.latest.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <a href={`${ER}/${r.id}`}>{r.docNo ?? `Draft "${r.title}"`}</a>
                    </td>
                    <td>{statusLabel(r.type, r.status)}</td>
                    <td className="n">{rpx(r.grandTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

export default Dashboard
