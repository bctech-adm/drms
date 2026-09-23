/**
 * Formatting for the "Pengajuan Biaya" PDF (ADR 0008 §6). Pure module (unit-tested).
 * Rupiah via lib/money (manual grouping, architecture §16 item 11); dates `id-ID` long form from
 * the business date (no TZ shift: 'YYYY-MM-DD' is already the company-TZ date); signature times in
 * the company TZ with the Indonesian zone abbreviation.
 */
import { formatRupiah } from '@/lib/money'

export { formatRupiah }

const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

/** '2026-09-20' → '20 September 2026'. */
export function formatDateLong(businessDate: string | null | undefined): string {
  if (!businessDate || !/^\d{4}-\d{2}-\d{2}$/.test(businessDate)) return ''
  const [y, m, d] = businessDate.split('-').map(Number) as [number, number, number]
  return `${d} ${MONTHS_ID[m - 1]} ${y}`
}

/** '2026-09-21' → '21/09/2026'. */
export function formatDateShort(businessDate: string | null | undefined): string {
  if (!businessDate || !/^\d{4}-\d{2}-\d{2}$/.test(businessDate)) return ''
  const [y, m, d] = businessDate.split('-')
  return `${d}/${m}/${y}`
}

const TZ_ABBR: Record<string, string> = { 'Asia/Jakarta': 'WIB', 'Asia/Pontianak': 'WIB', 'Asia/Makassar': 'WITA', 'Asia/Jayapura': 'WIT' }

/** ISO instant → '20/09/2026 14:05 WITA' in the company timezone. */
export function formatServerTime(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')} ${TZ_ABBR[timeZone] ?? timeZone}`
}

/** Quantity with Indonesian decimal comma, no grouping surprises ('24,8'). Empty for null. */
export function formatQty(q: number | null | undefined): string {
  if (q === null || q === undefined) return ''
  const s = Number.isInteger(q) ? String(q) : String(Math.round(q * 1000) / 1000)
  const [int, frac] = s.split('.')
  const grouped = (int ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return frac ? `${grouped},${frac}` : grouped
}

/** Amount without the currency prefix ('339.000'); empty for null. */
export function formatAmount(v: number | null | undefined): string {
  if (v === null || v === undefined) return ''
  return formatRupiah(v).replace(/^(-?)Rp /, '$1')
}

/**
 * Subtitle "<no urut>-PB <COMPANY>-<judul>" (US-46; form: "228-PB DRMS-Pengajuan Reimburse …").
 * The sequence is the leading number of the document number (`228/PB-DRMS/…`).
 */
export function subtitleOf(docNo: string | null | undefined, companyCode: string, title: string): string {
  const seq = docNo?.match(/^(\d+)/)?.[1]
  return seq ? `${seq}-PB ${companyCode}-${title}` : title
}

/**
 * Standard PDF fonts (Helvetica) use WinAnsi encoding (pdfkit AFM fonts): characters outside it
 * would print as garbage. Indonesian text is Latin-1; replace the few typographic characters that
 * are not in WinAnsi and drop control characters.
 */
export function pdfSafe(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .replace(/[→⇒]/g, '->')
    .replace(/[≤]/g, '<=')
    .replace(/[≥]/g, '>=')
    .replace(/[   ]/g, ' ')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/[^\u0009\u000a\u000d -~ -ÿŒœŠšŸŽžƒˆ˜–—‘’‚“”„†‡•…‰‹›€™]/g, '?')
}
