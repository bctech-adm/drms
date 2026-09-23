import type { CollectionSlug } from 'payload'

import { HttpError, json, v1 } from '../http'
import { MediaKindEnum } from '../schemas-flow'

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
