import { APIError, ValidationError, type CollectionAfterChangeHook, type CollectionBeforeChangeHook, type CollectionConfig, type Field } from 'payload'

import { relId, userId } from '@/access/roles'
import { fieldNever, rolesAllowed } from '@/access/policies'
import { normalizeValue, reasonOnChange, withAudit } from '@/audit/hooks'
import { writeAudit, type AuditRow } from '@/audit/writer'
import { denyDeleteLogged, requestReadAccess, requestUpdateAccess } from '@/domain/expense/access'
import { grandTotal, validateLines, type LineInput } from '@/domain/expense/lines'
import { diffLines, type AuditLine } from '@/domain/expense/line-audit'
import { isBusinessDate, isContentEditable, REQUEST_STATUSES, STATUS_LABELS, type RequestStatus } from '@/domain/expense/types'
import { rupiahField, uuidField } from '@/fields/common'
import { requestMeta } from '@/lib/request-meta'
import { forceDeferredChecks } from '@/lib/system-tx'

/**
 * T1 Pengajuan biaya (requirements v1.1 §7 T1; architecture §4.3, §5.1/§5.2).
 *
 * IMMUTABILITY DESIGN (F1 finding: Payload deletes and re-inserts every array / hasMany row on
 * EVERY parent update):
 * - `lines` (array → `expense_requests_lines`) and `requesters` (hasMany → `expense_requests_rels`)
 *   are ordinary Payload children while the request is content-editable (Draft, Revisi Nota).
 * - On every transition out of an editable status the DB trigger `pk_expense_requests_guard`
 *   stores `content_hash` = md5 over lines + requesters (SQL `pk_expense_content_hash`) and, while
 *   locked, rejects any change of the header columns (whitelist: status + workflow counters).
 * - DEFERRED constraint triggers on the parent and both child tables re-check at COMMIT that a
 *   locked request's children still hash to `content_hash` and that `grand_total = Σ lines.total`
 *   → Payload's delete+re-insert of identical rows passes, any real change fails the commit
 *   (even as raw SQL with the app role).
 * - The domain service also writes a Class A snapshot (`expense-line-snapshots`) at submit and at
 *   approval (audit/PDF trail).
 * Status changes only through the domain service (`context.pkTransition`), guard G6.
 */

const system = { create: fieldNever, update: fieldNever }
const ro = { readOnly: true }
const jsonView = { readOnly: true, components: { Field: '@/components/ReadOnlyJson#ReadOnlyJson' } }

const businessDate = (name: string, label: string, extra: Partial<Field> = {}): Field =>
  ({
    name,
    type: 'text',
    label,
    maxLength: 10,
    admin: { description: 'Format YYYY-MM-DD (zona waktu perusahaan).' },
    validate: (v: unknown) => (v === null || v === undefined || v === '' || isBusinessDate(v) ? true : 'Tanggal harus YYYY-MM-DD.'),
    ...extra,
  }) as Field

type Doc = Record<string, unknown> & { id?: number; status?: RequestStatus; lines?: LineInput[] }

const beforeChange: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req, context }) => {
  const d = data as Doc
  const prev = (originalDoc ?? {}) as Doc
  const transition = context?.pkTransition === true

  if (operation === 'create') {
    if (!transition) {
      d.status = 'draft'
      const uid = userId(req)
      if (uid === undefined) throw new APIError('Unauthorized', 401)
      d.createdBy = uid // "Dibuat Oleh" is always the logged-in user (US-41)
      d.source = requestMeta(req).source
      d.approvalCycle = 0
      d.transferredTotal = 0
    }
    const reqs = Array.isArray(d.requesters) ? d.requesters : []
    const emp = relId((req.user as { employee?: unknown } | null)?.employee)
    if (reqs.length === 0 && emp !== undefined) d.requesters = [emp] // default: the creator's own employee
  }

  if (operation === 'update') {
    const nextStatus = (d.status ?? prev.status) as RequestStatus
    if (nextStatus !== prev.status && !transition) throw new APIError('Status hanya berubah lewat aksi (submit/approve/…).', 403, null, true)
    if (!transition && prev.status && !isContentEditable(prev.status)) {
      throw new APIError(`Pengajuan berstatus "${STATUS_LABELS[prev.status]}" tidak dapat diubah.`, 409, null, true)
    }
    if (!transition && prev.status === 'receipt_revision') {
      // "Revisi Nota": only line amounts/descriptions and notes may change (type, scope,
      // requesters and bank account were approved and stay).
      const changed = Object.keys(d).filter(
        (k) => !['lines', 'notes', 'changeReason'].includes(k) && JSON.stringify(normalizeValue(d[k])) !== JSON.stringify(normalizeValue(prev[k])),
      )
      if (changed.length > 0) throw new APIError(`Saat Revisi Nota hanya baris item yang dapat diubah (${changed.join(', ')}).`, 409, null, true)
    }
  }

  const project = relId(d.project !== undefined ? d.project : prev.project)
  const costCenter = relId(d.costCenter !== undefined ? d.costCenter : prev.costCenter)
  if (project !== undefined && costCenter !== undefined) {
    throw new ValidationError({ collection: 'expense-requests', errors: [{ path: 'project', message: 'Pilih project ATAU pusat biaya, tidak keduanya (US-53).' }], req })
  }

  const lines = (d.lines ?? prev.lines ?? []) as LineInput[]
  const errors = validateLines(lines, { forSubmit: false })
  if (errors.length > 0) throw new ValidationError({ collection: 'expense-requests', errors, req })
  d.grandTotal = grandTotal(lines) // server-computed; any client value is ignored (US-03)
  return data
}

/** §8 T1 "baris item ditambah/diubah/dihapus", "pemohon diubah" — one audit row per change with line_no. */
const auditLines: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req, context }) => {
  if (context?.audit === false) return doc
  const rows: AuditRow[] = diffLines(
    operation === 'create' ? [] : ((previousDoc?.lines ?? []) as AuditLine[]),
    (doc.lines ?? []) as AuditLine[],
  ).map((c) => ({
    action: c.kind === 'added' ? 'create' : 'update',
    docType: 'expense_request',
    docId: String(doc.id),
    docNo: doc.docNo ?? undefined,
    field: c.field,
    lineNo: c.lineNo,
    oldValue: c.oldValue,
    newValue: c.newValue,
    reason: typeof req.context?.auditReason === 'string' ? req.context.auditReason : undefined,
  }))
  await writeAudit(req, rows)
  // Run the deferred freeze checks NOW (Payload's commit swallows COMMIT errors, see
  // lib/system-tx.ts) so a violation fails this operation with a real error.
  await forceDeferredChecks(req)
  return doc
}

export const ExpenseRequests: CollectionConfig = withAudit(
  {
    slug: 'expense-requests',
    labels: { singular: 'Pengajuan biaya', plural: 'Pengajuan biaya' },
    admin: {
      useAsTitle: 'title',
      group: 'Keuangan',
      defaultColumns: ['docNo', 'type', 'title', 'status', 'grandTotal', 'createdBy', 'updatedAt'],
      listSearchableFields: ['docNo', 'title'],
    },
    access: {
      read: requestReadAccess,
      // Q-09 default: Staff/PM for themselves, Admin and Finance also on behalf of requesters.
      create: rolesAllowed('pk-staff', 'pk-pm', 'pk-admin', 'pk-finance'),
      update: requestUpdateAccess,
      delete: denyDeleteLogged('expense_request'),
    },
    hooks: { beforeChange: [beforeChange], afterChange: [auditLines] },
    fields: [
      { name: 'docNo', type: 'text', label: 'Nomor', unique: true, index: true, access: system, admin: { ...ro, position: 'sidebar' } },
      {
        name: 'type',
        type: 'select',
        label: 'Jenis',
        required: true,
        options: [
          { label: 'Uang Muka', value: 'advance' },
          { label: 'Reimburse', value: 'reimburse' },
        ],
      },
      {
        name: 'status',
        type: 'select',
        label: 'Status',
        required: true,
        defaultValue: 'draft',
        index: true,
        options: REQUEST_STATUSES.map((s) => ({ label: STATUS_LABELS[s], value: s })),
        access: system,
        admin: { ...ro, position: 'sidebar' },
      },
      { name: 'title', type: 'text', label: 'Judul / subjek', required: true, maxLength: 200 },
      { name: 'project', type: 'relationship', relationTo: 'projects', label: 'Project', index: true },
      { name: 'costCenter', type: 'relationship', relationTo: 'cost-centers', label: 'Pusat biaya', index: true },
      businessDate('requestDate', 'Tanggal pengajuan (server)', { access: system, admin: { ...ro, position: 'sidebar' } }),
      businessDate('neededDate', 'Tanggal dibutuhkan'),
      businessDate('periodFrom', 'Periode kegiatan dari (opsional, Q-04)'),
      businessDate('periodTo', 'Periode kegiatan sampai'),
      { name: 'notes', type: 'textarea', label: 'Keterangan', maxLength: 2000 },
      { name: 'requesters', type: 'relationship', relationTo: 'employees', hasMany: true, label: 'Diajukan Oleh', admin: { isSortable: true } },
      { name: 'createdBy', type: 'relationship', relationTo: 'users', label: 'Dibuat Oleh', index: true, access: system, admin: { ...ro, position: 'sidebar' } },
      { name: 'bankAccount', type: 'relationship', relationTo: 'employee-bank-accounts', label: 'Rekening tujuan' },
      {
        name: 'bankSnapshot',
        type: 'group',
        label: 'Rekening tujuan (snapshot saat diajukan)',
        access: system,
        admin: ro,
        fields: [
          { name: 'bankName', type: 'text', label: 'Bank' },
          { name: 'accountNo', type: 'text', label: 'Nomor rekening' },
          { name: 'accountHolder', type: 'text', label: 'Atas nama' },
        ],
      },
      {
        name: 'lines',
        type: 'array',
        label: 'Baris item',
        labels: { singular: 'Baris', plural: 'Baris' },
        fields: [
          { name: 'description', type: 'text', label: 'Uraian', maxLength: 500 },
          {
            type: 'row',
            fields: [
              { name: 'qty', type: 'number', label: 'Jumlah', min: 0 },
              { name: 'uom', type: 'relationship', relationTo: 'uoms', label: 'Satuan' },
              { name: 'unitPrice', type: 'number', label: 'Harga satuan (informatif)', min: 0 },
              { name: 'total', type: 'number', label: 'Total (Rp)', min: 0 },
            ],
          },
          {
            type: 'row',
            fields: [
              { name: 'category', type: 'relationship', relationTo: 'expense-categories', label: 'Kategori' },
              { name: 'vehicle', type: 'relationship', relationTo: 'vehicles', label: 'Kendaraan' },
            ],
          },
          { name: 'notes', type: 'text', label: 'Keterangan', maxLength: 500 },
        ],
      },
      { ...rupiahField('grandTotal', 'Grand total (Rp)'), access: system, admin: { ...ro, position: 'sidebar' } },
      { ...rupiahField('approvedAmount', 'Nominal disetujui (Rp)'), access: system, admin: { ...ro, position: 'sidebar' } },
      { ...rupiahField('transferredTotal', 'Total ditransfer (Rp)'), access: system, admin: { ...ro, position: 'sidebar' } },
      { name: 'attachments', type: 'upload', relationTo: 'media-attachments', hasMany: true, label: 'Lampiran umum' },
      { name: 'approvalRule', type: 'relationship', relationTo: 'approval-rules', label: 'Aturan approval', access: system, admin: ro },
      { name: 'approvalSnapshot', type: 'json', label: 'Snapshot aturan approval', access: system, admin: jsonView },
      { name: 'approvalCycle', type: 'number', label: 'Siklus approval', defaultValue: 0, access: system, admin: { ...ro, hidden: true } },
      { name: 'currentLevel', type: 'number', label: 'Level approval berjalan', access: system, admin: ro },
      { name: 'submittedAt', type: 'date', label: 'Diajukan (server)', access: system, admin: { ...ro, date: { pickerAppearance: 'dayAndTime' } } },
      { name: 'contentHash', type: 'text', label: 'Hash isi terkunci', access: system, admin: { ...ro, hidden: true } },
      { name: 'resubmitOf', type: 'relationship', relationTo: 'expense-requests', label: 'Pengajuan ulang dari', access: system, admin: ro },
      { name: 'cancelReason', type: 'text', label: 'Alasan batal', access: system, admin: ro },
      { name: 'rejectReason', type: 'text', label: 'Alasan ditolak', access: system, admin: ro },
      { name: 'clientUuid', type: 'text', label: 'Client UUID (APK offline)', unique: true, index: true, access: { update: fieldNever }, admin: { ...ro, hidden: true } },
      {
        name: 'source',
        type: 'select',
        label: 'Sumber',
        options: ['web', 'apk', 'system', 'job'].map((s) => ({ label: s, value: s })),
        access: system,
        admin: { ...ro, position: 'sidebar' },
      },
      uuidField(),
    ],
  },
  {
    docType: 'expense_request',
    // lines: per-line rows (auditLines); docNo: `number_issued` row written by allocateDocNo().
    exclude: ['lines', 'docNo', 'contentHash', 'approvalSnapshot', 'currentLevel', 'approvalCycle', 'submittedAt'],
    docNo: (doc) => (typeof doc.docNo === 'string' ? doc.docNo : undefined),
    reasonRules: [reasonOnChange(['cancelReason'], 'Alasan wajib diisi saat membatalkan.')],
    actionFor: (c) => (c.field === 'status' ? 'status_change' : undefined),
  },
)
