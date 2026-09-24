/**
 * Rupiah display `Rp 1.447.500` (requirements v1.1 §9). Manual grouping instead of Intl currency
 * style (architecture §16 item 11: Intl separator output is UNVERIFIED on the alpine ICU build).
 */
export function formatRupiah(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  const digits = String(Math.abs(Math.trunc(amount)))
  return `${sign}Rp ${digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}
