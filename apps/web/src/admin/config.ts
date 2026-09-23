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
