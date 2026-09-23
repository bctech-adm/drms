/**
 * Indonesian vehicle plates (US-51): stored normalised without separators, upper case
 * (`DA 1234 XY` → `DA1234XY`), displayed as `<region> <number> <suffix>`.
 */
export const PLATE_RE = /^[A-Z]{1,2}[0-9]{1,4}[A-Z]{0,3}$/

export function normalizePlate(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function formatPlate(normalized: string): string {
  const m = /^([A-Z]{1,2})([0-9]{1,4})([A-Z]{0,3})$/.exec(normalized)
  if (!m) return normalized
  return [m[1], m[2], m[3]].filter(Boolean).join(' ')
}
