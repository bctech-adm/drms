import type { Access } from 'payload'

import { anyRole } from '@/access/roles'
import { byRole, ownUser, rolesAllowed } from '@/access/policies'

import { mediaCollection } from './factory'

/**
 * Upload collections split by resize policy (ADR 0004 §2). Server re-encodes every raster image
 * (auto-orient, resize `inside`, EXIF/GPS stripped); the unprocessed original is discarded
 * (user decision 2026-09-23), only its SHA-256 + dimensions are kept. PDFs are stored as-is.
 *
 * Read access until the owning business documents exist (F2): Finance/Owner/Admin all, others
 * only what they uploaded themselves. F2 replaces this with owner-document-derived Where rules.
 */
const ownOrOffice: Access = byRole({
  'pk-admin': true,
  'pk-owner': true,
  'pk-finance': true,
  'pk-pm': ownUser('uploadedBy'),
  'pk-staff': ownUser('uploadedBy'),
})

const thumb = {
  name: 'thumb',
  width: 320,
  height: 320,
  fit: 'inside' as const,
  withoutEnlargement: true,
  formatOptions: { format: 'webp' as const, options: { quality: 70 } },
}

export const MediaReceipts = mediaCollection({
  slug: 'media-receipts',
  labels: { singular: 'Foto nota', plural: 'Foto nota' },
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  resizeOptions: { width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true },
  formatOptions: { format: 'jpeg', options: { quality: 82, mozjpeg: true } },
  imageSizes: [thumb],
  access: { read: ownOrOffice, create: rolesAllowed('pk-staff', 'pk-pm', 'pk-finance', 'pk-admin') },
})

export const MediaTransferProofs = mediaCollection({
  slug: 'media-transfer-proofs',
  labels: { singular: 'Bukti transfer', plural: 'Bukti transfer' },
  mimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  resizeOptions: { width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true },
  formatOptions: { format: 'jpeg', options: { quality: 80, mozjpeg: true } },
  imageSizes: [thumb],
  maxBytesByMime: { 'application/pdf': 2 * 1024 * 1024 },
  disposition: 'attachment',
  access: { read: ownOrOffice, create: rolesAllowed('pk-finance') },
})

export const MediaSelfies = mediaCollection({
  slug: 'media-selfies',
  labels: { singular: 'Selfie absensi', plural: 'Selfie absensi' },
  mimeTypes: ['image/jpeg'],
  resizeOptions: { width: 720, height: 720, fit: 'inside', withoutEnlargement: true },
  formatOptions: { format: 'webp', options: { quality: 70 } },
  access: { read: ownOrOffice, create: rolesAllowed('pk-staff', 'pk-pm', 'pk-admin') },
})

export const MediaProgressPhotos = mediaCollection({
  slug: 'media-progress-photos',
  labels: { singular: 'Foto progress', plural: 'Foto progress' },
  mimeTypes: ['image/jpeg'],
  resizeOptions: { width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true },
  // JPEG so PDF reports can embed it (@react-pdf/image: JPEG/PNG/SVG only, ADR 0004 §Context).
  formatOptions: { format: 'jpeg', options: { quality: 78, mozjpeg: true } },
  imageSizes: [thumb],
  access: { read: ownOrOffice, create: rolesAllowed('pk-pm', 'pk-owner') },
})

export const MediaSignatures = mediaCollection({
  slug: 'media-signatures',
  labels: { singular: 'Tanda tangan', plural: 'Tanda tangan' },
  mimeTypes: ['image/png'],
  resizeOptions: { width: 800, height: 300, fit: 'inside', withoutEnlargement: true },
  formatOptions: { format: 'png', options: { palette: true, compressionLevel: 9 } },
  access: { read: ownOrOffice, create: anyRole },
})

export const MediaCompany = mediaCollection({
  slug: 'media-company',
  labels: { singular: 'Logo perusahaan', plural: 'Logo perusahaan' },
  mimeTypes: ['image/png', 'image/jpeg'],
  resizeOptions: { width: 600, height: 600, fit: 'inside', withoutEnlargement: true },
  formatOptions: { format: 'png', options: { compressionLevel: 9 } },
  access: { read: anyRole, create: rolesAllowed('pk-admin', 'pk-owner') },
})

export const MediaAttachments = mediaCollection({
  slug: 'media-attachments',
  labels: { singular: 'Lampiran', plural: 'Lampiran' },
  mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  resizeOptions: { width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true },
  formatOptions: { format: 'jpeg', options: { quality: 82, mozjpeg: true } },
  imageSizes: [thumb],
  maxBytesByMime: { 'application/pdf': 5 * 1024 * 1024 },
  disposition: 'attachment',
  access: { read: ownOrOffice, create: rolesAllowed('pk-staff', 'pk-pm', 'pk-finance', 'pk-admin') },
})

export const MEDIA_COLLECTIONS = [
  MediaReceipts,
  MediaTransferProofs,
  MediaSelfies,
  MediaProgressPhotos,
  MediaSignatures,
  MediaCompany,
  MediaAttachments,
]
