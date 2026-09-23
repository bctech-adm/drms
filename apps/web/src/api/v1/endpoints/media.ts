import { createReadStream } from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'

import type { CollectionSlug, PayloadRequest } from 'payload'

import { relId, userId } from '@/access/roles'
import { writeAudit } from '@/audit/writer'
import { visibleRequestIds } from '@/domain/expense/access'
import { fileSize, mediaPath } from '@/lib/media-files'
import { withReqTransaction } from '@/lib/system-tx'

import { HttpError, json, v1 } from '../http'
import { FileCollectionEnum, MediaKindEnum } from '../schemas-flow'

const COLLECTION: Record<string, CollectionSlug> = {
  receipts: 'media-receipts',
  'transfer-proofs': 'media-transfer-proofs',
  signatures: 'media-signatures',
  attachments: 'media-attachments',
}

/**
 * POST /api/v1/media/{kind} — multipart upload (field `file`) for the APK and custom views:
 * the collection's create access applies (e.g. transfer proofs: Finance only), the server
 * re-encodes/resizes (receipts ≤ 2000 px, original discarded, sha256 of the original kept —
 * ADR 0004, user decision 2026-09-23) and returns the id to reference in the domain actions
 * (receipts, transfer, signature, attachments). Ownership is linked when the id is used.
 */
export const uploadMediaEndpoint = v1({
  path: '/media/:kind',
  method: 'post',
  multipart: true,
  rateLimit: [60, 60_000],
  transactional: true,
  handler: async ({ req, params }) => {
    const kind = MediaKindEnum.safeParse(params.kind)
    if (!kind.success) throw new HttpError(404, 'Not Found')
    if (!req.file?.data?.length) throw new HttpError(400, 'Bad Request', { detail: 'Field "file" wajib (multipart/form-data).' })
    const doc = (await req.payload.create({
      collection: COLLECTION[kind.data]!,
      data: {},
      file: req.file,
      depth: 0,
      user: req.user,
      overrideAccess: false, // collection create access decides who may upload what
      req,
    })) as unknown as { id: number; mimeType?: string; filesize?: number; width?: number; height?: number; sha256Original?: string }
    return json(
      {
        id: doc.id,
        kind: kind.data,
        mimeType: doc.mimeType ?? null,
        filesize: doc.filesize ?? null,
        width: doc.width ?? null,
        height: doc.height ?? null,
        sha256Original: doc.sha256Original ?? null,
      },
      201,
    )
  },
})

const FILE_COLLECTION: Record<string, CollectionSlug> = {
  receipts: 'media-receipts',
  'transfer-proofs': 'media-transfer-proofs',
  signatures: 'media-signatures',
  attachments: 'media-attachments',
  company: 'media-company',
}

type MediaDoc = {
  id: number
  filename?: string | null
  mimeType?: string | null
  sizes?: { thumb?: { filename?: string | null; mimeType?: string | null } | null } | null
}

/** view_sensitive throttle (ADR 0006 §4: 1 row per user/doc/10 min). In-process: one web instance. */
const lastSensitiveView = new Map<string, number>()
function shouldAuditView(key: string, now = Date.now()): boolean {
  const prev = lastSensitiveView.get(key)
  if (prev !== undefined && now - prev < 10 * 60_000) return false
  lastSensitiveView.set(key, now)
  if (lastSensitiveView.size > 5000) {
    for (const [k, t] of lastSensitiveView) if (now - t >= 10 * 60_000) lastSensitiveView.delete(k)
  }
  return true
}

/**
 * Signatures are readable by their uploader and office roles (collection access); in addition a
 * signature REFERENCED BY an approval row of a request the caller may read is visible (the APK
 * shows the signed positions of the caller's own/team requests, US-05/US-43).
 */
async function signatureOnVisibleRequest(req: PayloadRequest, mediaId: number): Promise<boolean> {
  const rows = await req.payload.find({
    collection: 'approvals',
    where: { signature: { equals: mediaId } },
    depth: 0,
    pagination: false,
    select: { request: true },
    overrideAccess: true, // SYSTEM-READ: which requests reference this signature
    req,
  })
  const reqIds = rows.docs.map((d) => relId((d as { request?: unknown }).request)).filter((x): x is number => x !== undefined)
  if (reqIds.length === 0) return false
  const visible = await visibleRequestIds(req)
  return reqIds.some((x) => visible.includes(x))
}

/**
 * GET /api/v1/media/{collection}/{id}/file[?variant=thumb] — authenticated, scoped file download
 * for the APK (ADR 0004 §4; Traefik strips bearer tokens on the Payload-proxied /api/<slug>/file
 * path). Read access = the media collection's own access (owner-document derived), else 404 (no
 * existence leak). The stored name comes from the DB and must be a server-generated one inside the
 * collection's staticDir (no path traversal). Streams the file with `private, no-store`, nosniff
 * and a fixed Content-Disposition. Transfer proofs (bank data) are audited `view_sensitive`.
 */
export const mediaFileEndpoint = v1({
  path: '/media/:collection/:id/file',
  method: 'get',
  rateLimit: [240, 60_000],
  handler: async ({ req, params }) => {
    const kind = FileCollectionEnum.safeParse(params.collection)
    if (!kind.success) throw new HttpError(404, 'Not Found')
    const slug = FILE_COLLECTION[kind.data]!
    if (!/^\d{1,10}$/.test(params.id ?? '')) throw new HttpError(404, 'Not Found')
    const id = Number(params.id)
    const variant = req.searchParams.get('variant')
    if (variant !== null && variant !== 'thumb') throw new HttpError(400, 'Bad Request', { detail: 'variant hanya "thumb".' })

    let doc = (await req.payload
      .findByID({ collection: slug, id, depth: 0, user: req.user, overrideAccess: false, req })
      .catch(() => null)) as MediaDoc | null
    if (!doc && slug === 'media-signatures' && (await signatureOnVisibleRequest(req, id))) {
      doc = (await req.payload.findByID({ collection: slug, id, depth: 0, overrideAccess: true /* SYSTEM-READ: visibility checked above */, req }).catch(() => null)) as MediaDoc | null
    }
    if (!doc) throw new HttpError(404, 'Not Found')

    const name = variant === 'thumb' ? doc.sizes?.thumb?.filename : doc.filename
    const mime = (variant === 'thumb' ? doc.sizes?.thumb?.mimeType : doc.mimeType) ?? 'application/octet-stream'
    const file = mediaPath(req.payload, slug, name)
    const size = file ? await fileSize(file) : null
    if (!file || size === null) throw new HttpError(404, 'Not Found')

    if (slug === 'media-transfer-proofs' && shouldAuditView(`${userId(req)}:${slug}:${id}`)) {
      await withReqTransaction(req, () =>
        writeAudit(req, [{ action: 'view_sensitive', docType: 'media_transfer_proofs', docId: String(id), field: variant ?? 'file' }]),
      )
    }
    const ext = path.extname(file)
    const disposition = mime === 'application/pdf' ? 'attachment' : 'inline'
    const stream = Readable.toWeb(createReadStream(file)) as unknown as ReadableStream<Uint8Array>
    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Content-Length': String(size),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': `${disposition}; filename="${kind.data}-${id}${variant ? '-thumb' : ''}${ext}"`,
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    })
  },
})
