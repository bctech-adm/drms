import type { CollectionConfig } from 'payload'

import { denyAll } from '@/access/roles'
import { anyOf, byRole, ownUser, teamProjects } from '@/access/policies'
import { withAudit } from '@/audit/hooks'

import { ro } from './fields-f2'

/** Read-only JSON without Monaco (CSP, config-guards.test.ts). */
const jsonView = { readOnly: true, components: { Field: '@/components/ReadOnlyJson#ReadOnlyJson' } }

/**
 * Attendance check-in / check-out from the APK (F4 slice of US-01/US-02; ADR 0010 decisions 7/8).
 * Written ONLY by the sync service (`POST /api/v1/sync/batch`, items `attendance.check_in` /
 * `attendance.check_out`) after the server-side checks: own employee, assigned project with a
 * geofence, distance ≤ radius + GPS accuracy (capped), no mocked location, own selfie, one check-in
 * and one check-out per employee/project/local date. Nothing is editable (create/update/delete are
 * closed for HTTP; the DB role cannot UPDATE/DELETE either — migration f4b_attendance_security).
 * Corrections (T10), PM on-behalf, schedules/late minutes, recap and cost-center geofences are F5.
 *
 * Times: `receivedAt` = DB/server clock (authoritative, audit). `attendanceTime` = the time that
 * counts (QM-3 proposal): server time online, else the server estimate from the monotonic clock,
 * else the device clock flagged `DEVICE_TIME_ONLY` for PM review.
 */
export const Attendances: CollectionConfig = withAudit(
  {
    slug: 'attendances',
    labels: { singular: 'Absensi', plural: 'Absensi' },
    admin: {
      group: 'Proyek',
      useAsTitle: 'localDate',
      defaultColumns: ['employee', 'kind', 'project', 'localDate', 'attendanceTime', 'offline', 'timeTrust', 'distanceM'],
    },
    access: {
      read: byRole({
        'pk-admin': true,
        'pk-owner': true,
        'pk-finance': true,
        'pk-pm': anyOf(teamProjects('project'), ownUser('user')),
        'pk-staff': ownUser('user'),
      }),
      create: denyAll,
      update: denyAll,
      delete: denyAll,
    },
    fields: [
      { name: 'employee', type: 'relationship', relationTo: 'employees', label: 'Karyawan', required: true, index: true, admin: ro },
      { name: 'user', type: 'relationship', relationTo: 'users', label: 'Akun', required: true, index: true, admin: ro },
      {
        name: 'kind',
        type: 'select',
        label: 'Jenis',
        required: true,
        options: [
          { label: 'Masuk', value: 'check_in' },
          { label: 'Pulang', value: 'check_out' },
        ],
        admin: ro,
      },
      { name: 'project', type: 'relationship', relationTo: 'projects', label: 'Project', required: true, index: true, admin: ro },
      { name: 'localDate', type: 'text', label: 'Tanggal (zona perusahaan)', required: true, index: true, admin: ro },
      { name: 'attendanceTime', type: 'date', label: 'Jam absensi', required: true, admin: { ...ro, date: { pickerAppearance: 'dayAndTime' } } },
      { name: 'receivedAt', type: 'date', label: 'Diterima server', required: true, admin: { ...ro, date: { pickerAppearance: 'dayAndTime' } } },
      { name: 'deviceTime', type: 'date', label: 'Jam HP', admin: { ...ro, date: { pickerAppearance: 'dayAndTime' } } },
      { name: 'estimatedTime', type: 'date', label: 'Perkiraan server', admin: { ...ro, date: { pickerAppearance: 'dayAndTime' } } },
      {
        name: 'timeTrust',
        type: 'select',
        label: 'Sumber jam',
        required: true,
        options: [
          { label: 'Server (online)', value: 'server' },
          { label: 'Perkiraan server', value: 'estimated' },
          { label: 'Jam HP saja', value: 'device_only' },
        ],
        admin: ro,
      },
      { name: 'offline', type: 'checkbox', label: 'Offline', defaultValue: false, index: true, admin: ro },
      { name: 'lat', type: 'number', label: 'Latitude', required: true, admin: ro },
      { name: 'lng', type: 'number', label: 'Longitude', required: true, admin: ro },
      { name: 'accuracyM', type: 'number', label: 'Akurasi GPS (m)', admin: ro },
      { name: 'distanceM', type: 'number', label: 'Jarak ke titik project (m)', required: true, admin: ro },
      { name: 'selfie', type: 'upload', relationTo: 'media-selfies', label: 'Selfie', required: true, admin: ro },
      { name: 'device', type: 'relationship', relationTo: 'devices', label: 'Perangkat', admin: ro },
      { name: 'flags', type: 'json', label: 'Tanda', admin: jsonView },
      { name: 'clientUuid', type: 'text', label: 'ID offline', required: true, unique: true, index: true, admin: { ...ro, hidden: true } },
    ],
  },
  { docType: 'attendance' },
)
