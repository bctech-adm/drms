/**
 * Period helpers (ADR 0005 §6): periods are 'YYYY-MM'; the lock date is the last day of the latest
 * CLOSED period. Pure module (unit-tested); the DB function pk_cash_lock_date() mirrors lockDate().
 */
export const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/

export function isPeriod(v: unknown): v is string {
  return typeof v === 'string' && PERIOD_RE.test(v)
}

export function periodOf(businessDate: string): string {
  return businessDate.slice(0, 7)
}

/** Last calendar day of a period, 'YYYY-MM-DD'. */
export function periodEnd(period: string): string {
  const [y, m] = period.split('-').map(Number) as [number, number]
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
}

export function lockDate(closedPeriods: readonly string[]): string | null {
  if (closedPeriods.length === 0) return null
  return periodEnd([...closedPeriods].sort().at(-1)!)
}

export function isLocked(businessDate: string, closedPeriods: readonly string[]): boolean {
  const l = lockDate(closedPeriods)
  return l !== null && businessDate <= l
}
