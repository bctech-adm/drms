/**
 * Expense request lines (requirements v1.1 §7 T1 table, US-37, architecture §4.1).
 * User decision 2026-09-23 (Q-05 answered): line `total` is the PRIMARY, user-entered value (may be
 * rounded from the receipt); `unitPrice` is informational only and NEVER used to compute or check
 * the total; `grandTotal` = Σ line totals, server-computed. Pure module (unit-tested).
 */

export type LineInput = {
  id?: string | null
  description?: string | null
  qty?: number | null
  uom?: number | null
  unitPrice?: number | null
  total?: number | null
  notes?: string | null
  category?: number | null
  vehicle?: number | null
}

export type LineError = { path: string; message: string }

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v)

/** ≤ 3 decimals (e.g. 24,80 L), > 0. */
export function isValidQty(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= 1e9 && Math.abs(Math.round(v * 1000) - v * 1000) < 1e-6
}

/**
 * `forSubmit` adds the completeness rules (min 1 line, category, total > 0). Drafts may be
 * incomplete but never carry malformed values. Vehicle-required categories are checked by the
 * service (needs master data).
 */
export function validateLines(lines: readonly LineInput[], opts: { forSubmit: boolean }): LineError[] {
  const errors: LineError[] = []
  if (opts.forSubmit && lines.length === 0) errors.push({ path: 'lines', message: 'Minimal 1 baris item.' })
  if (lines.length > 200) errors.push({ path: 'lines', message: 'Maksimal 200 baris item.' })
  lines.forEach((l, i) => {
    const p = (f: string) => `lines.${i}.${f}`
    const desc = typeof l.description === 'string' ? l.description.trim() : ''
    if (opts.forSubmit && desc.length === 0) errors.push({ path: p('description'), message: 'Uraian wajib diisi.' })
    if (desc.length > 500) errors.push({ path: p('description'), message: 'Uraian maksimal 500 karakter.' })
    if (l.qty !== null && l.qty !== undefined && !isValidQty(l.qty)) errors.push({ path: p('qty'), message: 'Jumlah harus > 0 (maks. 3 desimal).' })
    if (l.qty !== null && l.qty !== undefined && (l.uom === null || l.uom === undefined)) {
      errors.push({ path: p('uom'), message: 'Satuan wajib bila jumlah diisi.' })
    }
    if (l.unitPrice !== null && l.unitPrice !== undefined && !(isInt(l.unitPrice) && l.unitPrice >= 0)) {
      errors.push({ path: p('unitPrice'), message: 'Harga satuan harus bilangan bulat Rupiah ≥ 0.' })
    }
    if (l.total === null || l.total === undefined) {
      if (opts.forSubmit) errors.push({ path: p('total'), message: 'Total baris wajib diisi.' })
    } else if (!(isInt(l.total) && l.total > 0 && l.total <= 1e13)) {
      errors.push({ path: p('total'), message: 'Total baris harus bilangan bulat Rupiah > 0.' })
    }
    if (opts.forSubmit && (l.category === null || l.category === undefined)) errors.push({ path: p('category'), message: 'Kategori wajib diisi.' })
    if (typeof l.notes === 'string' && l.notes.length > 500) errors.push({ path: p('notes'), message: 'Keterangan maksimal 500 karakter.' })
  })
  return errors
}

/** Σ line totals (server-side; any client-sent grand total is ignored). */
export function grandTotal(lines: readonly LineInput[]): number {
  return lines.reduce((s, l) => s + (isInt(l.total) ? l.total : 0), 0)
}

/** Display-only unit price: the entered value, else total ÷ qty rounded (US-37). */
export function displayUnitPrice(l: Pick<LineInput, 'unitPrice' | 'qty' | 'total'>): number | null {
  if (isInt(l.unitPrice)) return l.unitPrice
  if (isInt(l.total) && isValidQty(l.qty)) return Math.round(l.total / l.qty)
  return null
}
