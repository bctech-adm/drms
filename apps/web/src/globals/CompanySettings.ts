import type { GlobalConfig } from 'payload'

import { anyRole } from '@/access/roles'
import { rolesAllowed } from '@/access/policies'
import { withGlobalAudit } from '@/audit/hooks'
import { percentField, rupiahField } from '@/fields/common'
import { DEFAULT_TZ, isValidTimeZone } from '@/lib/time'

const intField = (name: string, label: string, def: number, min: number, max: number) => ({
  name,
  type: 'number' as const,
  label,
  defaultValue: def,
  min,
  max,
  required: true,
  validate: (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? true : `Bilangan bulat ${min}–${max}.`),
})

/**
 * Setting perusahaan (requirements v1.1 §6, architecture §4.2). Read by every role (the APK gets a
 * subset via /api/v1/me); updated by Admin and Owner. Server-side resize targets are code config
 * per media collection (ADR 0004 §2); `imageTargets` here are the DEVICE-side targets for the APK.
 */
export const CompanySettings: GlobalConfig = withGlobalAudit(
  {
    slug: 'company-settings',
    label: 'Setting perusahaan',
    admin: { group: 'Sistem' },
    access: { read: anyRole, update: rolesAllowed('pk-admin', 'pk-owner') },
    fields: [
      { name: 'name', type: 'text', label: 'Nama perusahaan', required: true, defaultValue: 'PT Double Rezki Makmur Sejahtera', maxLength: 160 },
      {
        name: 'shortCode',
        type: 'text',
        label: 'Kode singkat',
        required: true,
        defaultValue: 'DRMS',
        maxLength: 16,
        validate: (v: unknown) => (typeof v === 'string' && /^[A-Z0-9]{2,16}$/.test(v) ? true : 'Huruf besar/angka, 2–16 karakter (token {COMPANY}).'),
      },
      { name: 'logo', type: 'upload', relationTo: 'media-company', label: 'Logo' },
      { name: 'pdfHeader', type: 'textarea', label: 'Kop PDF', maxLength: 1000 },
      { name: 'address', type: 'textarea', label: 'Alamat', maxLength: 500 },
      { name: 'phone', type: 'text', label: 'Telepon', maxLength: 32 },
      {
        name: 'timezone',
        type: 'text',
        label: 'Zona waktu',
        required: true,
        defaultValue: DEFAULT_TZ,
        validate: (v: unknown) => (typeof v === 'string' && isValidTimeZone(v) ? true : 'Zona waktu IANA tidak valid.'),
        admin: { description: 'Proses server memakai env TZ (cron, tanggal bisnis); ubah keduanya bersamaan.' },
      },
      intField('defaultGeofenceRadiusM', 'Radius geofence default (m)', 100, 10, 5000),
      intField('lateReportDays', 'Batas hari laporan progress terlambat', 3, 1, 60),
      {
        type: 'row',
        fields: [
          { ...percentField('budgetWarnPct', 'Ambang anggaran kuning (%)'), defaultValue: 85, required: true },
          { ...intField('budgetOverPct', 'Ambang anggaran merah (%)', 100, 1, 1000) },
        ],
      },
      {
        type: 'row',
        fields: [
          { ...percentField('progressWarnGapPct', 'Selisih progress vs anggaran kuning (%)'), defaultValue: 0, required: true },
          { ...percentField('progressBadGapPct', 'Selisih progress vs anggaran merah (%)'), defaultValue: 8, required: true },
        ],
      },
      { ...rupiahField('receiptRoundingTolerance', 'Toleransi pembulatan nota per baris (Rp)', { required: true }), defaultValue: 1000 },
      intField('receiptMaxAgeDays', 'Batas umur nota (hari)', 30, 1, 365),
      intField('reimburseAutoCloseDays', 'Tutup otomatis reimburse (hari)', 30, 1, 365),
      {
        name: 'minAppVersion',
        type: 'text',
        label: 'Versi APK minimum',
        maxLength: 32,
        validate: (v: unknown) => (v === null || v === undefined || v === '' || (typeof v === 'string' && /^\d+\.\d+\.\d+$/.test(v)) ? true : 'Format x.y.z'),
      },
      // F4 app version gate (GET /api/v1/app/config, ADR 0010 decision 13): shown by the APK
      // before login; minAppVersion is also enforced on every authenticated call (426).
      {
        name: 'latestAppVersion',
        type: 'text',
        label: 'Versi APK terbaru',
        maxLength: 32,
        validate: (v: unknown) => (v === null || v === undefined || v === '' || (typeof v === 'string' && /^\d+\.\d+\.\d+$/.test(v)) ? true : 'Format x.y.z'),
      },
      {
        name: 'appDownloadUrl',
        type: 'text',
        label: 'URL unduh APK',
        maxLength: 500,
        admin: { description: 'https://… (APK side-load). Kosong = aplikasi menampilkan "hubungi admin".' },
        validate: (v: unknown) => (v === null || v === undefined || v === '' || (typeof v === 'string' && /^https:\/\/[^\s"'<>]+$/.test(v)) ? true : 'Harus URL https://'),
      },
      {
        name: 'syncExpenseDraftsEnabled',
        type: 'checkbox',
        label: 'Sinkronisasi draft pengajuan dari APK (offline) aktif',
        defaultValue: true,
        admin: { description: 'Nonaktif → item offline ditolak FEATURE_DISABLED (ADR 0010 rollback).' },
      },
      intField('offlineMaxAgeDays', 'Umur maksimal sesi offline APK (hari)', 30, 1, 30),
      {
        name: 'imageTargets',
        type: 'group',
        label: 'Target resize foto di perangkat (px, sisi terpanjang)',
        fields: [
          intField('receiptsMaxPx', 'Nota', 2000, 640, 4000),
          intField('selfiesMaxPx', 'Selfie', 720, 320, 2000),
          intField('transferProofsMaxPx', 'Bukti transfer', 1600, 640, 4000),
          intField('progressPhotosMaxPx', 'Foto progress', 1600, 640, 4000),
          intField('jpegQuality', 'Kualitas JPEG', 80, 50, 95),
        ],
      },
    ],
  },
  { docType: 'company_settings' },
)
