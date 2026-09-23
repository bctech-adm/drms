import { stat } from 'node:fs/promises'
import path from 'node:path'

import type { CollectionSlug, Payload } from 'payload'

/**
 * Server-generated media names only (ADR 0004 §1: `<uuid>.<ext>`, image sizes `<uuid>-<w>x<h>.<ext>`).
 * Anything else — separators, `..`, NUL, other extensions — is refused before touching the disk.
 */
export const MEDIA_FILENAME_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-\d{1,5}x\d{1,5})?\.(jpg|png|webp|pdf)$/

/**
 * Absolute path of a stored media file inside the collection's `staticDir`, or null when the name
 * is not a server-generated one or would escape the directory (defence in depth against path
 * traversal: the name comes from the DB, never from the request).
 */
export function mediaPath(payload: Payload, collection: CollectionSlug, filename: string | null | undefined): string | null {
  if (!filename || !MEDIA_FILENAME_RE.test(filename)) return null
  const upload = payload.collections[collection]?.config.upload
  const dir = upload && typeof upload === 'object' ? upload.staticDir : undefined
  if (!dir) return null
  const root = path.resolve(dir)
  const full = path.resolve(root, filename)
  if (path.dirname(full) !== root) return null
  return full
}

export async function fileSize(p: string): Promise<number | null> {
  try {
    const s = await stat(p)
    return s.isFile() ? s.size : null
  } catch {
    return null
  }
}
