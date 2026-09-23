import type { CollectionConfig } from 'payload'

import { denyAll } from '@/access/roles'
import { assignedProjects, byRole, rolesAllowed, teamProjects } from '@/access/policies'
import { reasonOnChange, withAudit } from '@/audit/hooks'
import { percentField, uuidField } from '@/fields/common'

/**
 * Tahapan project. `progressPct` only changes via progress reports (F5, requirements §1 #7) →
 * update access false for everyone. Weight changes need a reason (G7). Sum-to-100 % check (G11)
 * lands with the stage editor in F5.
 */
export const ProjectStages: CollectionConfig = withAudit(
  {
    slug: 'project-stages',
    labels: { singular: 'Tahapan project', plural: 'Tahapan project' },
    admin: { useAsTitle: 'name', group: 'Proyek', defaultColumns: ['project', 'sequence', 'name', 'weightPct', 'progressPct'] },
    access: {
      read: byRole({
        'pk-admin': true,
        'pk-owner': true,
        'pk-finance': true,
        'pk-pm': teamProjects(),
        'pk-staff': assignedProjects(),
      }),
      create: rolesAllowed('pk-owner'),
      update: byRole({ 'pk-owner': true, 'pk-pm': teamProjects() }),
      delete: denyAll,
    },
    fields: [
      { name: 'project', type: 'relationship', relationTo: 'projects', label: 'Project', required: true, index: true, access: { update: () => false } },
      { name: 'name', type: 'text', label: 'Nama tahapan', required: true, maxLength: 128 },
      percentField('weightPct', 'Bobot (%)'),
      { name: 'sequence', type: 'number', label: 'Urutan', min: 1, required: true },
      { ...percentField('progressPct', 'Progress (%)'), defaultValue: 0, access: { update: () => false }, admin: { readOnly: true } },
      uuidField(),
    ],
  },
  { docType: 'project_stage', reasonRules: [reasonOnChange(['weightPct'], 'Alasan wajib diisi saat mengubah bobot tahapan.')] },
)
