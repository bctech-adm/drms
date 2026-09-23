import { APIError, type CollectionConfig } from 'payload'

import { ROLES, ROLE_LABELS, denyAll } from '@/access/roles'
import { byRole, rolesAllowed } from '@/access/policies'
import { reasonOnAnyUpdate, withAudit } from '@/audit/hooks'
import { stepsError } from '@/domain/expense/rules'
import { activeField, rupiahField } from '@/fields/common'

const roleOptions = ROLES.map((r) => ({ label: ROLE_LABELS[r], value: r }))

/**
 * Aturan approval (US-34): amount range, request type, signature positions ("Diajukan Oleh" /
 * "Dibuat Oleh" signatures, "Diketahui Oleh" required/optional/none + who; approval levels 1..n),
 * optional category/project/cost center. Engine: src/domain/expense/rules.ts (rule resolved and
 * SNAPSHOTTED on the request at submit — later rule changes never affect submitted requests).
 * Every change requires a reason (requirements §8). Admin C/R/U, Owner R/U, Finance R.
 */
export const ApprovalRules: CollectionConfig = withAudit(
  {
    slug: 'approval-rules',
    labels: { singular: 'Aturan approval', plural: 'Aturan approval' },
    admin: { useAsTitle: 'name', group: 'Keuangan', defaultColumns: ['name', 'docType', 'requestType', 'minAmount', 'maxAmount', 'active'] },
    access: {
      read: byRole({ 'pk-admin': true, 'pk-owner': true, 'pk-finance': true }),
      create: rolesAllowed('pk-admin'),
      update: byRole({ 'pk-admin': true, 'pk-owner': true }),
      delete: denyAll,
    },
    hooks: {
      beforeChange: [
        ({ data, originalDoc }) => {
          const min = (data.minAmount ?? originalDoc?.minAmount ?? 0) as number
          const max = (data.maxAmount ?? originalDoc?.maxAmount ?? null) as number | null
          if (max !== null && max < min) throw new APIError('Nominal maksimum harus ≥ minimum.', 400, null, true)
          const steps = (data.steps ?? originalDoc?.steps ?? []) as Array<{ level: number; approverRole?: never; approverUser?: never }>
          const err = stepsError(steps)
          if (err) throw new APIError(err, 400, null, true)
          const ackBy = data.acknowledgeBy ?? originalDoc?.acknowledgeBy ?? 'scope_manager'
          if (ackBy === 'role' && !(data.acknowledgeRole ?? originalDoc?.acknowledgeRole)) throw new APIError('Pilih peran "Diketahui Oleh".', 400, null, true)
          if (ackBy === 'user' && !(data.acknowledgeUser ?? originalDoc?.acknowledgeUser)) throw new APIError('Pilih user "Diketahui Oleh".', 400, null, true)
          return data
        },
      ],
    },
    fields: [
      { name: 'name', type: 'text', label: 'Nama aturan', required: true, maxLength: 128 },
      {
        name: 'docType',
        type: 'select',
        label: 'Dokumen',
        required: true,
        defaultValue: 'expense_request',
        options: [
          { label: 'Pengajuan biaya', value: 'expense_request' },
          { label: 'Addendum RAB', value: 'budget_addendum' },
        ],
      },
      {
        name: 'requestType',
        type: 'select',
        label: 'Jenis pengajuan',
        required: true,
        defaultValue: 'any',
        options: [
          { label: 'Semua', value: 'any' },
          { label: 'Uang Muka', value: 'advance' },
          { label: 'Reimburse', value: 'reimburse' },
        ],
      },
      rupiahField('minAmount', 'Nominal minimum (Rp)', { required: true }),
      rupiahField('maxAmount', 'Nominal maksimum (Rp, kosong = tanpa batas)'),
      { name: 'category', type: 'relationship', relationTo: 'expense-categories', label: 'Kategori (opsional)' },
      { name: 'project', type: 'relationship', relationTo: 'projects', label: 'Project (opsional)' },
      { name: 'costCenter', type: 'relationship', relationTo: 'cost-centers', label: 'Pusat biaya (opsional)' },
      { name: 'priority', type: 'number', label: 'Prioritas', defaultValue: 100, min: 0, admin: { description: 'Angka kecil dievaluasi lebih dulu.' } },
      {
        name: 'acknowledge',
        type: 'select',
        label: 'Diketahui Oleh',
        required: true,
        defaultValue: 'optional',
        options: [
          { label: 'Wajib', value: 'required' },
          { label: 'Opsional', value: 'optional' },
          { label: 'Tidak dipakai', value: 'none' },
        ],
      },
      {
        name: 'acknowledgeBy',
        type: 'select',
        label: 'Pengisi "Diketahui Oleh"',
        required: true,
        defaultValue: 'scope_manager',
        options: [
          { label: 'PM project / penanggung jawab pusat biaya (Q-07)', value: 'scope_manager' },
          { label: 'Peran tertentu', value: 'role' },
          { label: 'User tertentu', value: 'user' },
        ],
      },
      { name: 'acknowledgeRole', type: 'select', label: 'Peran "Diketahui Oleh"', options: roleOptions },
      { name: 'acknowledgeUser', type: 'relationship', relationTo: 'users', label: 'User "Diketahui Oleh"' },
      {
        name: 'signDiajukan',
        type: 'select',
        label: 'Tanda tangan "Diajukan Oleh"',
        required: true,
        defaultValue: 'required',
        options: [
          { label: 'Wajib', value: 'required' },
          { label: 'Opsional', value: 'optional' },
          { label: 'Tidak dipakai', value: 'none' },
        ],
      },
      {
        name: 'signDibuat',
        type: 'select',
        label: 'Tanda tangan "Dibuat Oleh"',
        required: true,
        defaultValue: 'required',
        options: [
          { label: 'Wajib', value: 'required' },
          { label: 'Opsional', value: 'optional' },
          { label: 'Tidak dipakai', value: 'none' },
        ],
      },
      {
        name: 'steps',
        type: 'array',
        label: 'Level approval',
        minRows: 1,
        fields: [
          { name: 'level', type: 'number', label: 'Level', required: true, min: 1 },
          { name: 'approverRole', type: 'select', label: 'Peran approver', options: roleOptions },
          { name: 'approverUser', type: 'relationship', relationTo: 'users', label: 'Approver (user tertentu)' },
        ],
      },
      activeField(),
    ],
  },
  { docType: 'approval_rule', reasonRules: [reasonOnAnyUpdate] },
)
