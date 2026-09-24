import type { PayloadRequest } from 'payload'

import { getEnv } from '@/lib/env'
import { DEFAULT_TZ } from '@/lib/time'

import { compareVersions, HttpError, v1 } from '../http'
import { AppConfigQuery, SYNC_MAX_BYTES, SYNC_MAX_ITEMS } from '../schemas-sync'
import { SYNC_RATE_LIMIT } from './sync'

type GateSettings = {
  minAppVersion: string | null
  latestAppVersion: string | null
  appDownloadUrl: string | null
  timezone: string
  syncExpenseDraftsEnabled: boolean
}

let cache: { value: GateSettings; at: number } | undefined
/** Test seam. */
export function resetAppConfigCache(): void {
  cache = undefined
}

/** Public endpoint → settings cached 60 s in-process (no DB read per anonymous request). */
async function gateSettings(req: PayloadRequest): Promise<GateSettings> {
  if (cache && Date.now() - cache.at < 60_000) return cache.value
  const s = (await req.payload.findGlobal({ slug: 'company-settings', depth: 0, overrideAccess: true /* SYSTEM-READ: public app gate subset */, req })) as {
    minAppVersion?: string | null
    latestAppVersion?: string | null
    appDownloadUrl?: string | null
    timezone?: string | null
    syncExpenseDraftsEnabled?: boolean | null
  }
  const value: GateSettings = {
    minAppVersion: s.minAppVersion || null,
    latestAppVersion: s.latestAppVersion || null,
    appDownloadUrl: s.appDownloadUrl || null,
    timezone: s.timezone || DEFAULT_TZ,
    syncExpenseDraftsEnabled: s.syncExpenseDraftsEnabled !== false,
  }
  cache = { value, at: Date.now() }
  return value
}

/**
 * GET /api/v1/app/config — APK version gate + client configuration (ADR 0010 decision 13).
 * PUBLIC: the APK must learn that it is too old BEFORE login, and old versions get 426 on every
 * authenticated call. Returns only non-sensitive values (versions, download URL, company TZ,
 * feature flags, sync limits). Values: company-settings (admin/owner editable) + env (package).
 */
export const appConfigEndpoint = v1({
  path: '/app/config',
  method: 'get',
  auth: 'public',
  handler: async ({ req }) => {
    const q = AppConfigQuery.safeParse(Object.fromEntries(req.searchParams.entries()))
    if (!q.success) throw new HttpError(400, 'Bad Request', { detail: 'version harus x.y.z.' })
    const s = await gateSettings(req)
    const v = q.data.version
    const body = {
      minSupportedVersion: s.minAppVersion,
      latestVersion: s.latestAppVersion,
      downloadUrl: s.appDownloadUrl,
      updateRequired: v ? (s.minAppVersion ? compareVersions(v, s.minAppVersion) < 0 : false) : null,
      updateAvailable: v ? (s.latestAppVersion ? compareVersions(v, s.latestAppVersion) < 0 : false) : null,
      timezone: s.timezone,
      serverTime: new Date().toISOString(),
      android: { packageName: getEnv().ANDROID_APP_PACKAGE },
      features: {
        // No FCM project/dispatcher yet (ADR 0011): the APK polls GET /notifications.
        pushEnabled: false,
        syncExpenseDrafts: s.syncExpenseDraftsEnabled,
        syncAttendance: false, // F5
        syncProgressReports: false, // F5
      },
      sync: { maxItemsPerBatch: SYNC_MAX_ITEMS, maxBatchBytes: SYNC_MAX_BYTES, rateLimitPerMinute: SYNC_RATE_LIMIT[0] },
    }
    return Response.json(body, { status: 200, headers: { 'Cache-Control': 'public, max-age=60' } })
  },
})
