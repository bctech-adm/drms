import type { CollectionConfig } from 'payload'

import { denyAll } from '@/access/roles'
import { byRole, rolesAllowed } from '@/access/policies'
import { reasonOnChange, reasonOnDeactivate, withAudit } from '@/audit/hooks'
import { activeField, rupiahField, uuidField } from '@/fields/common'

/** Akun kas/bank perusahaan. Finance C/R/U, Owner R/U, Admin C/R/U (requirements §4 "Master data"). */
export const CashAccounts: CollectionConfig = withAudit(
  {
    slug: 'cash-accounts',
    labels: { singular: 'Akun kas/bank', plural: 'Akun kas/bank' },
    admin: { useAsTitle: 'name', group: 'Keuangan', defaultColumns: ['name', 'kind', 'accountNo', 'active'] },
    access: {
      read: byRole({ 'pk-admin': true, 'pk-finance': true, 'pk-owner': true }),
      create: rolesAllowed('pk-admin', 'pk-finance'),
      update: byRole({ 'pk-admin': true, 'pk-finance': true, 'pk-owner': true }),
      delete: denyAll,
    },
    fields: [
      { name: 'name', type: 'text', label: 'Nama akun', required: true, unique: true, maxLength: 128 },
      {
        name: 'kind',
        type: 'select',
        label: 'Jenis',
        required: true,
        defaultValue: 'bank',
        options: [
          { label: 'Kas', value: 'cash' },
          { label: 'Bank', value: 'bank' },
        ],
      },
      { name: 'bank', type: 'relationship', relationTo: 'banks', label: 'Bank' },
      { name: 'accountNo', type: 'text', label: 'Nomor rekening', maxLength: 34 },
      { name: 'accountHolder', type: 'text', label: 'Atas nama', maxLength: 128 },
      rupiahField('openingBalance', 'Saldo awal (Rp)'),
      { name: 'odooJournalCode', type: 'text', label: 'Kode jurnal Odoo', maxLength: 16 },
      activeField(),
      uuidField(),
    ],
  },
  {
    docType: 'cash_account',
    reasonRules: [reasonOnDeactivate, reasonOnChange(['openingBalance'], 'Alasan wajib diisi saat mengubah saldo awal.')],
  },
)
