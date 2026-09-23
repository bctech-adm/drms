/** Company timezone helpers (default Asia/Makassar; server timestamps stay UTC). */
export const DEFAULT_TZ = 'Asia/Makassar'

export type LocalDate = { year: number; month: number; day: number }

/** Calendar date of an instant in the given IANA timezone. */
export function localDateInTz(instant: Date, timeZone: string): LocalDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return { year: get('year'), month: get('month'), day: get('day') }
}

/** Offset of `timeZone` from UTC at `instant`, in minutes (WITA = +480). */
export function tzOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000)
}

/** UTC instant of 00:00 local time of the local day containing `instant`. */
export function startOfLocalDay(instant: Date, timeZone: string): Date {
  const d = localDateInTz(instant, timeZone)
  const guess = Date.UTC(d.year, d.month - 1, d.day)
  return new Date(guess - tzOffsetMinutes(new Date(guess), timeZone) * 60000)
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}
