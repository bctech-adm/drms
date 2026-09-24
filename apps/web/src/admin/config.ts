/**
 * Admin wiring of the F2 custom views (architecture §8, phase plan F2): paths are strings resolved
 * through the generated import map (payload generate:importmap). No React import here — collection
 * configs are also loaded by the worker and the OpenAPI generator.
 */
export const RIWAYAT_TAB = {
  riwayat: {
    Component: '@/admin/views/RiwayatView#RiwayatView',
    path: '/riwayat' as const,
    tab: { label: 'Riwayat', href: '/riwayat', order: 900 },
  },
}

export const F2_ADMIN_VIEWS = {
  approvalInbox: { Component: '@/admin/views/ApprovalInbox#ApprovalInbox', path: '/persetujuan' as const, meta: { title: 'Persetujuan' } },
  transferQueue: { Component: '@/admin/views/TransferQueue#TransferQueue', path: '/antrian-transfer' as const, meta: { title: 'Antrian Transfer' } },
  lpjVerification: { Component: '@/admin/views/LpjVerification#LpjVerification', path: '/verifikasi-lpj' as const, meta: { title: 'Verifikasi LPJ' } },
}

/**
 * F3 (wireframes §0): `dashboard` replaces the admin homepage (Payload 3.90.1
 * admin.components.views.dashboard, rendered inside the default template); the other views are
 * custom root views wrapped by Shell. `/laporan` must be exact, else it prefix-matches
 * `/laporan/<kode>` (isPathMatchingRoute: non-exact = prefix).
 */
export const F3_ADMIN_VIEWS = {
  dashboard: { Component: '@/admin/views/Dashboard#Dashboard' },
  reports: { Component: '@/admin/views/Reports#ReportsIndex', path: '/laporan' as const, exact: true, meta: { title: 'Laporan' } },
  report: { Component: '@/admin/views/Reports#ReportView', path: '/laporan/:kode' as const, meta: { title: 'Laporan' } },
  auditLog: { Component: '@/admin/views/Reports#AuditLogView', path: '/audit-log' as const, exact: true, meta: { title: 'Audit Log' } },
}
