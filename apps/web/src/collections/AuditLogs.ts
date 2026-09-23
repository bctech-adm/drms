import type { CollectionConfig, Field } from 'payload'

import { denyAll } from '@/access/roles'
import { byRole } from '@/access/policies'
import { AUDIT_ACTIONS } from '@/audit/writer'

const ro = { readOnly: true }
const jsonView = { readOnly: true, components: { Field: '@/components/ReadOnlyJson#ReadOnlyJson' } }

/**
 * Class A append-only audit log (ADR 0006 §2–§3): FLAT collection (no arrays/hasMany/localized/
 * versions — Payload would rewrite child rows with DELETE). DB: no UPDATE/DELETE/TRUNCATE for the
 * app role + reject triggers + `server_time` forced by trigger (migration …_security).
 * Read: Finance/Owner/Admin all (requirements §4). Staff/PM "own/team documents" arrives with
 * the business documents in F2 (per-document "Riwayat" tab via /api/v1/.../history).
 */
const fields: Field[] = [
  { name: 'serverTime', type: 'date', label: 'Waktu server', index: true, admin: { ...ro, date: { pickerAppearance: 'dayAndTime' } } },
  { name: 'eventId', type: 'text', required: true, index: true, admin: ro },
  { name: 'txId', type: 'number', admin: ro },
  { name: 'requestId', type: 'text', admin: ro },
  { name: 'docType', type: 'text', label: 'Jenis dokumen', required: true, admin: ro },
  { name: 'docId', type: 'text', label: 'ID dokumen', admin: ro },
  { name: 'docNo', type: 'text', label: 'No. dokumen', index: true, admin: ro },
  { name: 'action', type: 'select', label: 'Aksi', required: true, options: AUDIT_ACTIONS.map((a) => ({ label: a, value: a })), admin: ro },
  { name: 'field', type: 'text', label: 'Field', admin: ro },
  { name: 'lineNo', type: 'number', label: 'Baris', admin: ro },
  { name: 'oldValue', type: 'json', label: 'Nilai lama', admin: jsonView },
  { name: 'newValue', type: 'json', label: 'Nilai baru', admin: jsonView },
  { name: 'statusFrom', type: 'text', label: 'Status dari', admin: ro },
  { name: 'statusTo', type: 'text', label: 'Status ke', admin: ro },
  { name: 'reason', type: 'text', label: 'Alasan', admin: ro },
  { name: 'userId', type: 'number', label: 'User ID', admin: ro },
  { name: 'userRoles', type: 'text', label: 'Peran', admin: ro },
  {
    name: 'source',
    type: 'select',
    label: 'Sumber',
    options: ['web', 'apk', 'system', 'job'].map((s) => ({ label: s, value: s })),
    admin: ro,
  },
  { name: 'appVersion', type: 'text', label: 'Versi aplikasi', admin: ro },
  { name: 'ip', type: 'text', label: 'IP', admin: ro },
  { name: 'deviceId', type: 'text', label: 'ID perangkat', admin: ro },
  { name: 'lat', type: 'number', admin: ro },
  { name: 'lng', type: 'number', admin: ro },
  { name: 'deviceTime', type: 'date', label: 'Waktu perangkat', admin: ro },
]

export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  labels: { singular: 'Audit log', plural: 'Audit log' },
  admin: {
    group: 'Sistem',
    defaultColumns: ['serverTime', 'action', 'docType', 'docId', 'field', 'userId', 'source'],
    listSearchableFields: ['docNo', 'docId', 'docType'],
  },
  access: {
    read: byRole({ 'pk-admin': true, 'pk-owner': true, 'pk-finance': true }),
    create: denyAll, // only SYSTEM-WRITE via writeAudit()
    update: denyAll,
    delete: denyAll,
  },
  defaultSort: '-serverTime',
  lockDocuments: false,
  timestamps: false,
  fields,
}
