import type { CollectionConfig } from 'payload'

import { anyRole, denyAll } from '@/access/roles'
import { byRole, rolesAllowed } from '@/access/policies'
import { reasonOnDeactivate, withAudit } from '@/audit/hooks'
import { activeField } from '@/fields/common'

const HHMM = /^([01][0-9]|2[0-3]):[0-5][0-9]$/
const hhmm = (v: unknown) => (typeof v === 'string' && HHMM.test(v) ? true : 'Format jam HH:MM (00:00–23:59).')

/** Jadwal kerja (rekap absensi, Q-30). Admin C/R/U, Owner R/U, all R. */
export const WorkSchedules: CollectionConfig = withAudit(
  {
    slug: 'work-schedules',
    labels: { singular: 'Jadwal kerja', plural: 'Jadwal kerja' },
    admin: { useAsTitle: 'name', group: 'Master Data', defaultColumns: ['name', 'startTime', 'endTime', 'lateToleranceMin', 'active'] },
    access: {
      read: anyRole,
      create: rolesAllowed('pk-admin'),
      update: byRole({ 'pk-admin': true, 'pk-owner': true }),
      delete: denyAll,
    },
    fields: [
      { name: 'name', type: 'text', label: 'Nama', required: true, unique: true, maxLength: 64 },
      { name: 'startTime', type: 'text', label: 'Jam masuk', required: true, validate: hhmm },
      { name: 'endTime', type: 'text', label: 'Jam pulang', required: true, validate: hhmm },
      { name: 'lateToleranceMin', type: 'number', label: 'Toleransi terlambat (menit)', min: 0, max: 240, defaultValue: 15 },
      activeField(),
    ],
  },
  { docType: 'work_schedule', reasonRules: [reasonOnDeactivate] },
)
