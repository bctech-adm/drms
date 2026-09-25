import type { PayloadRequest } from 'payload'

import { relId } from '@/access/roles'
import { DEFAULT_TZ, localDateInTz } from '@/lib/time'

import type { TimeVerdict } from './clock'

/**
 * F4 slice of attendance (US-01/US-02, ADR 0010 decision 8): server-authoritative checks of one
 * `attendance.check_in` / `attendance.check_out` sync item. Pure helpers are exported for unit tests.
 */

export type AttendanceKind = 'check_in' | 'check_out'

/** GPS accuracy added to the geofence radius is capped (a 2 km "accuracy" must not widen the fence). */
export const ACCURACY_ALLOWANCE_CAP_M = 50

/** Great-circle distance in metres (haversine, mean Earth radius 6 371 008.8 m). */
export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_008.8
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLng = rad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** Inside when distance ≤ radius + min(accuracy, cap). */
export function insideGeofence(distanceM: number, radiusM: number, accuracyM: number | null | undefined): boolean {
  const allowance = Math.min(Math.max(accuracyM ?? 0, 0), ACCURACY_ALLOWANCE_CAP_M)
  return distanceM <= radiusM + allowance
}

/**
 * The time that counts (QM-3 proposal): online → server receive time; offline with a trusted monotonic
 * estimate → the estimate; otherwise the device clock, flagged DEVICE_TIME_ONLY for PM review.
 */
export function attendanceTimeOf(verdict: TimeVerdict, deviceTime: string, receivedAt: Date): { time: Date; flags: string[] } {
  if (verdict.timeTrust === 'server') return { time: receivedAt, flags: [] }
  if (verdict.timeTrust === 'estimated' && verdict.estimatedTime) return { time: new Date(verdict.estimatedTime), flags: [] }
  return { time: new Date(deviceTime), flags: ['DEVICE_TIME_ONLY'] }
}

export function localDateString(instant: Date, timeZone: string = DEFAULT_TZ): string {
  const d = localDateInTz(instant, timeZone)
  const two = (n: number) => String(n).padStart(2, '0')
  return `${d.year}-${two(d.month)}-${two(d.day)}`
}

/** Is `employee` assigned to `project` on `localDate` (team-assignments, start/end inclusive)? */
export async function isAssigned(req: PayloadRequest, employee: number, project: number, localDate: string): Promise<boolean> {
  const res = await req.payload.find({
    collection: 'team-assignments',
    where: { and: [{ employee: { equals: employee } }, { project: { equals: project } }] },
    depth: 0,
    pagination: false,
    overrideAccess: true, // SYSTEM-READ: assignment check of the caller's own employee
    req,
  })
  return (res.docs as Array<{ startDate?: string | null; endDate?: string | null }>).some((a) => {
    const start = a.startDate ? a.startDate.slice(0, 10) : null
    const end = a.endDate ? a.endDate.slice(0, 10) : null
    return (!start || start <= localDate) && (!end || end >= localDate)
  })
}

type AttendanceRow = { id: number; kind: AttendanceKind; attendanceTime: string }

/** Today's rows of this employee at this project (for the one-per-day rules). */
export async function dayRows(req: PayloadRequest, employee: number, project: number, localDate: string): Promise<AttendanceRow[]> {
  const res = await req.payload.find({
    collection: 'attendances',
    where: { and: [{ employee: { equals: employee } }, { project: { equals: project } }, { localDate: { equals: localDate } }] },
    depth: 0,
    pagination: false,
    sort: 'attendanceTime',
    overrideAccess: true, // SYSTEM-READ: duplicate check of the caller's own attendance
    req,
  })
  return res.docs as unknown as AttendanceRow[]
}

/** Employee linked to the user account (users.employee), or undefined. */
export async function employeeOfUser(req: PayloadRequest, uid: number): Promise<number | undefined> {
  const u = await req.payload.findByID({ collection: 'users', id: uid, depth: 0, overrideAccess: true /* SYSTEM-READ: own employee link */, req, disableErrors: true })
  return relId((u as { employee?: unknown } | null)?.employee)
}
