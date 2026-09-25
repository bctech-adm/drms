import React from 'react'

import { cellText } from '@/domain/reports/export'
import type { Column, FilterField, Table } from '@/domain/reports/registry'
import { BUDGET_LABELS, niceMax, periodLabel, shortRupiah, type BudgetTone } from '@/domain/reports/rules'
import { formatRupiah } from '@/lib/money'

/**
 * Server-rendered building blocks of the F3 dashboards/reports (wireframes §0): no client JS, no
 * chart library. Charts are inline SVG with <title> tooltips (native hover) + a data table in
 * <details> (accessible); colours are the web-starter theme tokens (--pk-*, set per light/dark
 * mode in (payload)/custom.scss from src/theme/tokens.ts): in = trust blue, out = CTA orange (a
 * CVD-safe blue/orange pair); status is never colour alone.
 * All text goes through React escaping. `data-pk-*` attributes are stable UAT selectors.
 */
export const F3_STYLE = `
.pk-f3 { --pk-in: var(--pk-primary); --pk-out: var(--pk-accent); --pk-grid: var(--pk-border); --pk-muted: var(--pk-muted-fg);
  --pk-ok: var(--pk-tone-ok-text); --pk-warn: var(--pk-tone-warn-text); --pk-bad: var(--pk-tone-bad-text); --pk-none: var(--theme-elevation-500); }
.pk-f3 .pk-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin: 0 0 20px; }
.pk-f3 .pk-tile { border: 1px solid var(--pk-border); border-radius: var(--style-radius-l); padding: 14px 16px; background: var(--pk-card); box-shadow: var(--pk-shadow); }
.pk-f3 .pk-tile h3 { margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--pk-muted); }
.pk-f3 .pk-big { font-family: var(--pk-font-heading); font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 4px; font-variant-numeric: tabular-nums; }
.pk-f3 .pk-tile p { margin: 2px 0; font-size: 13px; }
.pk-f3 .pk-tile a.pk-more { display: inline-block; margin-top: 6px; font-size: 12px; }
.pk-f3 section.pk-block { margin: 0 0 24px; }
.pk-f3 section.pk-block > h2 { font-family: var(--pk-font-heading); font-size: 17px; margin: 0 0 10px; }
.pk-f3 .pk-scroll { overflow-x: auto; }
.pk-f3 table.pk-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.pk-f3 .pk-table th { text-align: left; border-bottom: 2px solid var(--pk-border); padding: 6px 8px; white-space: nowrap; color: var(--pk-muted-fg); font-weight: 600; }
.pk-f3 .pk-table td { border-bottom: 1px solid var(--pk-border); padding: 6px 8px; vertical-align: top; }
.pk-f3 .pk-table .n { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.pk-f3 .pk-table tfoot td { font-weight: 700; border-top: 2px solid var(--pk-border); }
.pk-f3 .pk-badge { display: inline-flex; align-items: center; gap: 4px; padding: 1px 7px; border-radius: 8px; font-size: 11px; font-weight: 600; border: 1px solid currentColor; }
.pk-f3 .pk-badge.ok { color: var(--pk-ok); } .pk-f3 .pk-badge.warn { color: var(--pk-warn); } .pk-f3 .pk-badge.over { color: var(--pk-bad); } .pk-f3 .pk-badge.none { color: var(--pk-none); }
.pk-f3 .pk-empty { color: var(--pk-muted); }
.pk-f3 .pk-note { color: var(--pk-muted); font-size: 12px; margin: 4px 0; }
.pk-f3 .pk-legend { display: flex; gap: 16px; font-size: 12px; margin: 4px 0; }
.pk-f3 .pk-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; vertical-align: -1px; }
.pk-f3 svg.pk-chart { width: 100%; height: auto; max-height: 280px; }
.pk-f3 svg.pk-chart text { fill: var(--pk-muted); font-size: 11px; }
.pk-f3 svg.pk-chart .grid { stroke: var(--pk-grid); stroke-width: 1; }
.pk-f3 svg.pk-chart .in { fill: var(--pk-in); } .pk-f3 svg.pk-chart .out { fill: var(--pk-out); }
.pk-f3 svg.pk-chart a:hover rect, .pk-f3 svg.pk-chart a:focus rect { opacity: .8; }
.pk-f3 form.pk-filter { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: flex-end; margin: 0 0 12px; padding: 12px; border: 1px solid var(--pk-border); border-radius: var(--style-radius-l); background: var(--pk-card); }
.pk-f3 form.pk-filter label { display: flex; flex-direction: column; font-size: 12px; gap: 2px; }
.pk-f3 form.pk-filter input, .pk-f3 form.pk-filter select { font-size: 13px; padding: 4px 6px; min-width: 140px; background: var(--theme-input-bg, var(--theme-elevation-0)); color: var(--theme-text); border: 1px solid var(--pk-input); border-radius: var(--style-radius-s); }
.pk-f3 form.pk-filter select[multiple] { min-height: 90px; }
.pk-f3 .pk-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 0 0 12px; font-size: 13px; }
.pk-f3 .pk-btn { display: inline-block; padding: 6px 14px; border-radius: var(--style-radius-m); border: 1px solid var(--pk-input); text-decoration: none; background: var(--pk-card); color: var(--theme-text); font-size: 13px; font-weight: 600; cursor: pointer; }
.pk-f3 .pk-btn:hover { border-color: var(--pk-primary); color: var(--pk-primary); }
.pk-f3 .pk-btn.primary { background: var(--pk-primary); border-color: var(--pk-primary); color: var(--pk-on-primary); }
.pk-f3 .pk-btn.primary:hover { background: var(--pk-primary-hover); color: var(--pk-on-primary); }
.pk-f3 .pk-tabs { display: flex; gap: 8px; margin: 0 0 16px; flex-wrap: wrap; }
.pk-f3 .pk-tabs a { padding: 5px 12px; border-radius: 999px; border: 1px solid var(--pk-input); text-decoration: none; font-size: 13px; }
.pk-f3 .pk-tabs a[aria-current="page"] { background: var(--pk-primary); border-color: var(--pk-primary); color: var(--pk-on-primary); }
.pk-f3 .pk-placeholder { border: 1px dashed var(--pk-input); border-radius: var(--style-radius-l); padding: 12px; color: var(--pk-muted); font-size: 13px; }
@media (max-width: 767px) { .pk-f3 .pk-secondary { display: none; } }
`

export function F3Root({ children, name }: { children: React.ReactNode; name: string }) {
  return (
    <div className="pk-f3" data-pk-view={name}>
      <style>{F3_STYLE}</style>
      {children}
    </div>
  )
}

export const rpx = (v: number | null | undefined) => (v === null || v === undefined ? '—' : formatRupiah(v))

export function Tile({ title, id, children, href, more }: { title: string; id: string; children: React.ReactNode; href?: string; more?: string }) {
  return (
    <div className="pk-tile" data-pk-tile={id}>
      <h3>{title}</h3>
      {children}
      {href ? (
        <a className="pk-more" href={href}>
          {more ?? 'Lihat rincian →'}
        </a>
      ) : null}
    </div>
  )
}

export function Big({ children, id, href }: { children: React.ReactNode; id?: string; href?: string }) {
  const inner = (
    <p className="pk-big" data-pk-kpi={id}>
      {children}
    </p>
  )
  return href ? (
    <a href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
      {inner}
    </a>
  ) : (
    inner
  )
}

const TONE_ICON: Record<BudgetTone, string> = { ok: '●', warn: '▲', over: '■', none: '○' }

export function BudgetBadge({ tone }: { tone: BudgetTone }) {
  return (
    <span className={`pk-badge ${tone}`} data-pk-budget={tone}>
      <span aria-hidden>{TONE_ICON[tone]}</span>
      {BUDGET_LABELS[tone]}
    </span>
  )
}

export function Empty({ text }: { text: string }) {
  return <p className="pk-empty">{text}</p>
}

export function Placeholder({ text, id }: { text: string; id: string }) {
  return (
    <div className="pk-placeholder" data-pk-placeholder={id}>
      {text}
    </div>
  )
}

/**
 * Paired Masuk/Keluar bars per month on ONE Rupiah axis (K-02). Each bar links to the Rekap Kas
 * of that month (C9) and carries a <title> tooltip; the table below repeats every number.
 */
export function CashFlowChart({ rows, hrefOf, id }: { rows: Array<{ period: string; masuk: number; keluar: number }>; hrefOf: (period: string) => string; id: string }) {
  if (rows.every((r) => r.masuk === 0 && r.keluar === 0)) return <Empty text="Belum ada transaksi kas di rentang ini." />
  const W = 720
  const H = 240
  const left = 56
  const bottom = 24
  const top = 8
  const plotH = H - bottom - top
  const max = niceMax(Math.max(...rows.map((r) => Math.max(r.masuk, r.keluar))))
  const band = (W - left - 8) / rows.length
  const bar = Math.max(3, Math.min(18, (band - 10) / 2))
  const y = (v: number) => top + plotH - (v / max) * plotH
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max)
  const rect = (x: number, v: number, cls: string, label: string, period: string) => {
    const h = Math.max(0, (v / max) * plotH)
    const r = Math.min(4, bar / 2, h)
    const yy = top + plotH - h
    // rounded data-end, square at the baseline
    const d = h <= 0 ? '' : `M${x},${top + plotH} V${yy + r} Q${x},${yy} ${x + r},${yy} H${x + bar - r} Q${x + bar},${yy} ${x + bar},${yy + r} V${top + plotH} Z`
    return (
      <a href={hrefOf(period)} key={`${cls}-${period}`}>
        <title>{`${periodLabel(period)} · ${label} ${formatRupiah(v)}`}</title>
        <rect x={x - 1} y={top} width={bar + 2} height={plotH} fill="transparent" />
        {d ? <path d={d} className={cls} /> : null}
      </a>
    )
  }
  return (
    <div data-pk-chart={id}>
      <div className="pk-legend">
        <span>
          <i style={{ background: 'var(--pk-in)' }} />
          Masuk
        </span>
        <span>
          <i style={{ background: 'var(--pk-out)' }} />
          Keluar
        </span>
      </div>
      <svg className="pk-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Grafik kas masuk dan keluar per bulan">
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={left} x2={W - 4} y1={y(t)} y2={y(t)} />
            <text x={left - 6} y={y(t) + 4} textAnchor="end">
              {shortRupiah(t)}
            </text>
          </g>
        ))}
        {rows.map((r, i) => {
          const x0 = left + i * band + (band - (bar * 2 + 2)) / 2
          return (
            <g key={r.period}>
              {rect(x0, r.masuk, 'in', 'Masuk', r.period)}
              {rect(x0 + bar + 2, r.keluar, 'out', 'Keluar', r.period)}
              <text x={left + i * band + band / 2} y={H - 6} textAnchor="middle">
                {periodLabel(r.period).split(' ')[0]}
              </text>
            </g>
          )
        })}
      </svg>
      <details>
        <summary style={{ fontSize: 12 }}>Tabel angka</summary>
        <div className="pk-scroll">
          <table className="pk-table" data-pk-table={`${id}-data`}>
            <thead>
              <tr>
                <th>Bulan</th>
                <th className="n">Masuk</th>
                <th className="n">Keluar</th>
                <th className="n">Selisih</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.period}>
                  <td>
                    <a href={hrefOf(r.period)}>{periodLabel(r.period)}</a>
                  </td>
                  <td className="n">{rpx(r.masuk)}</td>
                  <td className="n">{rpx(r.keluar)}</td>
                  <td className="n">{rpx(r.masuk - r.keluar)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

const isNum = (c: Column) => c.type === 'money' || c.type === 'int' || c.type === 'pct'

/** Report table (screen): secondary columns hidden on phones, first column links (C9). */
export function ReportTable({ t, id }: { t: Table; id: string }) {
  if (t.rows.length === 0) return <Empty text={t.empty ?? 'Tidak ada data untuk filter ini.'} />
  return (
    <div className="pk-scroll">
      <table className="pk-table" data-pk-table={id}>
        <thead>
          <tr>
            {t.columns.map((c) => (
              <th key={c.key} className={`${isNum(c) ? 'n' : ''} ${c.primary ? '' : 'pk-secondary'}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {t.rows.map((r, i) => (
            <tr key={i}>
              {t.columns.map((c, ci) => {
                const text = cellText(r.cells[c.key] ?? null, c.type)
                const cls = `${isNum(c) ? 'n' : ''} ${c.primary ? '' : 'pk-secondary'}`
                if (c.key === 'status' && typeof r.cells.status === 'string' && t.key === 'project') {
                  const tone = (Object.entries(BUDGET_LABELS).find(([, l]) => l === r.cells.status)?.[0] ?? 'none') as BudgetTone
                  return (
                    <td key={c.key} className={cls}>
                      <BudgetBadge tone={tone} />
                    </td>
                  )
                }
                return (
                  <td key={c.key} className={cls}>
                    {ci === 0 && r.href ? <a href={r.href}>{text || '—'}</a> : text}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
        {t.totals ? (
          <tfoot>
            <tr>
              {t.columns.map((c) => (
                <td key={c.key} className={`${isNum(c) ? 'n' : ''} ${c.primary ? '' : 'pk-secondary'}`}>
                  {cellText(t.totals![c.key] ?? null, c.type)}
                </td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  )
}

/** Plain GET filter form (no client JS); `keep` = hidden params preserved (e.g. the role tab). */
export function FilterForm({ fields, action, keep = {} }: { fields: FilterField[]; action: string; keep?: Record<string, string> }) {
  return (
    <form method="get" action={action} className="pk-filter" data-pk-filter>
      {Object.entries(keep).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {fields.map((f) => (
        <label key={f.name}>
          {f.label}
          {f.kind === 'select' ? (
            <select name={f.name} defaultValue={String(f.value)}>
              <option value="">Semua</option>
              {f.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : f.kind === 'multiselect' ? (
            <select name={f.name} multiple defaultValue={Array.isArray(f.value) ? f.value : []}>
              {f.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input type={f.kind === 'text' ? 'text' : f.kind} name={f.name} defaultValue={String(f.value)} maxLength={60} />
          )}
        </label>
      ))}
      <button type="submit" className="pk-btn primary" data-pk-action="apply">
        Terapkan
      </button>
      <a className="pk-btn" href={action} data-pk-action="reset">
        Reset
      </a>
    </form>
  )
}
