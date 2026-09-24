import { z } from 'zod'

/**
 * F4 — APK offline sync + app gate (ADR 0010 "Sync contract", decision 13). Pure module (bundled by
 * scripts/gen-openapi.mjs).
 *
 * The sync envelope keeps the ADR's snake_case field names (`batch_id`, `client_uuid`, …) so the
 * contract in ADR 0010 and this schema read the same. Entity ids are the numeric server ids of the
 * rest of /api/v1 (masters, media uploads); receipts reference an image uploaded beforehand with
 * POST /api/v1/media/receipts (`media_id`).
 */
const id = z.number().int().positive()
const rupiah = z.number().int().min(0).max(1e13)
const rupiahPos = z.number().int().min(1).max(1e13)
const businessDate = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'YYYY-MM-DD')
const dateTime = z.iso.datetime({ offset: true })
const qty = z
  .number()
  .positive()
  .max(1e9)
  .refine((v) => Math.abs(Math.round(v * 1000) - v * 1000) < 1e-6, 'maks. 3 desimal')

export const SYNC_MAX_ITEMS = 50
export const SYNC_MAX_BYTES = 256 * 1024

export const SyncItemTypeEnum = z
  .enum([
    'attendance.check_in',
    'attendance.check_out',
    'attendance.on_behalf',
    'expense_request.draft_upsert',
    'expense_request.draft_delete',
    'progress_report.draft_upsert',
  ])
  .meta({ id: 'SyncItemType', description: 'Attendance and progress reports are accepted by the schema but answered `unsupported` until their phase ships (F5).' })
export type SyncItemType = z.infer<typeof SyncItemTypeEnum>

export const SyncClock = z
  .object({
    device_time: dateTime.meta({ description: 'Device wall clock at send time (with offset). Comparison only.' }),
    elapsed_ms: z.number().int().min(0).meta({ description: 'Android monotonic time since boot at send time.' }),
    boot_id: z.string().min(1).max(64),
    last_server_time: dateTime.nullable().optional().meta({ description: 'server_time of the last successful online call on this boot.' }),
    last_server_elapsed_ms: z.number().int().min(0).nullable().optional().meta({ description: 'elapsed_ms recorded together with last_server_time.' }),
  })
  .strict()
  .meta({ id: 'SyncClock' })

export const SyncReceiptInput = z
  .object({
    client_uuid: z.uuid().meta({ description: 'APK id of the receipt (stable across edits).' }),
    receipt_no: z.string().max(64).nullable().optional(),
    vendor_name: z.string().trim().min(1).max(160),
    vendor_id: id.nullable().optional(),
    receipt_date: businessDate,
    receipt_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).nullable().optional(),
    amount: rupiahPos.meta({ description: 'Total PRINTED on the receipt.' }),
    tax_amount: rupiah.nullable().optional(),
    media_id: id.meta({ description: 'media-receipts id uploaded by the caller (POST /api/v1/media/receipts). Cannot change once synced.' }),
  })
  .strict()
  .meta({ id: 'SyncReceiptInput' })

export const SyncLineInput = z
  .object({
    id: z.string().min(1).max(64).optional().meta({ description: 'Server line id (lines that came from the server).' }),
    client_uuid: z.uuid().optional().meta({ description: 'APK id of a new line; becomes the server line id.' }),
    description: z.string().max(500).optional(),
    qty: qty.nullable().optional(),
    uom_id: id.nullable().optional(),
    unit_price: rupiah.nullable().optional(),
    total: rupiahPos.nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
    category_id: id.nullable().optional(),
    vehicle_id: id.nullable().optional(),
    receipts: z.array(SyncReceiptInput).max(20).optional().meta({ description: 'Reimburse drafts only. Upserted by client_uuid; receipts missing here are NOT removed.' }),
  })
  .strict()
  .meta({ id: 'SyncLineInput' })

export const SyncDraftUpsertPayload = z
  .object({
    request_id: id.optional().meta({ description: 'Server id of a draft created online.' }),
    draft_client_uuid: z.uuid().optional().meta({ description: 'APK id of the draft (default: the item client_uuid, i.e. the item that created it).' }),
    kind: z.enum(['advance', 'reimburse']).optional().meta({ description: 'Required for a new draft. advance = Uang Muka.' }),
    title: z.string().trim().min(1).max(200).optional().meta({ description: 'Required for a new draft.' }),
    project_id: id.nullable().optional(),
    cost_center_id: id.nullable().optional(),
    needed_date: businessDate.nullable().optional(),
    period_from: businessDate.nullable().optional(),
    period_to: businessDate.nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
    requester_ids: z.array(id).max(20).optional(),
    bank_account_id: id.nullable().optional(),
    client_grand_total: rupiah.nullable().optional().meta({ description: 'Advisory; mismatch with the server total → flag CLIENT_TOTAL_MISMATCH.' }),
    lines: z.array(SyncLineInput).max(200).optional().meta({ description: 'Replaces ALL lines when present.' }),
  })
  .strict()
  .meta({ id: 'SyncDraftUpsertPayload', description: 'Omitted fields stay unchanged on an existing draft.' })
export type SyncDraftUpsert = z.infer<typeof SyncDraftUpsertPayload>

export const SyncDraftDeletePayload = z
  .object({
    request_id: id.optional(),
    draft_client_uuid: z.uuid().optional(),
    reason: z.string().trim().min(3).max(1000).optional().meta({ description: 'Default "Draft dihapus dari aplikasi".' }),
  })
  .strict()
  .meta({ id: 'SyncDraftDeletePayload', description: 'Soft delete = the draft is cancelled (no hard delete).' })
export type SyncDraftDelete = z.infer<typeof SyncDraftDeletePayload>

export const SyncItem = z
  .object({
    client_uuid: z.uuid().meta({ description: 'Idempotency key of this queue item (UUIDv7). Replays return `duplicate` with the stored result.' }),
    type: SyncItemTypeEnum,
    schema_version: z.literal(1),
    offline: z.boolean().meta({ description: 'true = created while offline (stored as a comparison flag).' }),
    device_time: dateTime.meta({ description: 'Device wall clock when the user acted. Comparison only; the server time is authoritative.' }),
    elapsed_ms: z.number().int().min(0).meta({ description: 'Monotonic time since boot when the user acted.' }),
    boot_id: z.string().min(1).max(64).optional().meta({ description: 'Boot of elapsed_ms (default: clock.boot_id). A different boot → time_trust device_only.' }),
    base_rev: z
      .number()
      .int()
      .min(1)
      .nullable()
      .optional()
      .meta({
        description:
          'Server `rev` the edit is based on (null/absent = new draft; on an existing draft → conflict). A new draft starts at rev 1 and every applied edit adds exactly 1, so queued edits of a draft created offline use 1, 2, … in queue order.',
      }),
    depends_on: z.array(z.uuid()).max(SYNC_MAX_ITEMS).optional().meta({ description: 'client_uuid of earlier items that must be applied first.' }),
    // Documented as anyOf (components for the Dart client); validated per item type by the
    // service, so a bad payload rejects only its own item (never the whole batch).
    payload: z
      .union([SyncDraftUpsertPayload, SyncDraftDeletePayload, z.record(z.string(), z.unknown())])
      .meta({ description: 'Type specific: expense_request.draft_upsert → SyncDraftUpsertPayload, expense_request.draft_delete → SyncDraftDeletePayload; other types: free-form until supported.' }),
  })
  .strict()
  .meta({ id: 'SyncItem' })
export type SyncItemIn = z.infer<typeof SyncItem>

export const SyncBatch = z
  .object({
    batch_id: z.uuid(),
    device_id: z.uuid().meta({ description: 'Must equal the X-Device-Id of the registered device.' }),
    clock: SyncClock,
    items: z.array(SyncItem).min(1).max(SYNC_MAX_ITEMS),
  })
  .strict()
  .meta({ id: 'SyncBatch', description: `≤ ${SYNC_MAX_ITEMS} items and ≤ ${SYNC_MAX_BYTES} bytes JSON per batch (ADR 0010 decision 14).` })
export type SyncBatchIn = z.infer<typeof SyncBatch>


export const SyncDraftCopy = z
  .object({
    id,
    uuid: z.string().nullable(),
    client_uuid: z.string().nullable(),
    rev: z.number().int(),
    status: z.string(),
    doc_no: z.string().nullable(),
    kind: z.enum(['advance', 'reimburse']),
    title: z.string(),
    project_id: id.nullable(),
    cost_center_id: id.nullable(),
    needed_date: z.string().nullable(),
    period_from: z.string().nullable(),
    period_to: z.string().nullable(),
    notes: z.string().nullable(),
    requester_ids: z.array(id),
    bank_account_id: id.nullable(),
    grand_total: rupiah,
    updated_at: z.string().nullable(),
    lines: z.array(
      z.object({
        id: z.string(),
        no: z.number().int(),
        description: z.string().nullable(),
        qty: z.number().nullable(),
        uom_id: id.nullable(),
        unit_price: rupiah.nullable(),
        total: rupiah.nullable(),
        notes: z.string().nullable(),
        category_id: id.nullable(),
        vehicle_id: id.nullable(),
      }),
    ),
    receipts: z.array(
      z.object({
        id,
        client_uuid: z.string().nullable(),
        line_id: z.string(),
        receipt_no: z.string().nullable(),
        vendor_name: z.string(),
        receipt_date: z.string(),
        receipt_time: z.string().nullable(),
        amount: rupiah,
        tax_amount: rupiah.nullable(),
        media_id: id.nullable(),
        status: z.string(),
      }),
    ),
  })
  .meta({ id: 'SyncDraftCopy', description: 'Server version of the draft (server wins on conflict).' })
export type SyncDraftCopyOut = z.infer<typeof SyncDraftCopy>

export const SYNC_STATUSES = ['applied', 'duplicate', 'rejected', 'conflict', 'deferred', 'unsupported'] as const
export type SyncStatus = (typeof SYNC_STATUSES)[number]

export const SyncResult = z
  .object({
    client_uuid: z.string(),
    status: z.enum(SYNC_STATUSES).meta({
      description:
        'applied | duplicate (replay; original result below) | rejected (business rule, never retry) | conflict (stale base_rev, server wins, see server_copy) | deferred (retry later) | unsupported (item type not enabled on this server yet — keep it queued, do not count as an attempt; see GET /app/config features).',
    }),
    original_status: z.enum(['applied', 'rejected', 'conflict']).nullable().meta({ description: 'For duplicate: the status of the first processing.' }),
    server_id: z.string().nullable().meta({ description: 'Server id (numeric, as string) of the expense request.' }),
    rev: z.number().int().nullable(),
    received_at: z.string().meta({ description: 'Authoritative server time of (first) processing, UTC.' }),
    time_trust: z.enum(['server', 'estimated', 'device_only']),
    flags: z.array(z.string()).meta({ description: 'OFFLINE, CLOCK_SKEW, CLIENT_TOTAL_MISMATCH, ALREADY_CANCELLED.' }),
    errors: z.array(
      z.object({
        code: z.string().meta({ description: 'VALIDATION, NOT_EDITABLE, STALE_REV (conflict), NOT_FOUND, FORBIDDEN, MEDIA_MISSING, CLIENT_UUID_CONFLICT, FEATURE_DISABLED, DEPENDENCY_FAILED, DEPENDENCY_PENDING, STATE_CONFLICT, INTEGRITY, UNSUPPORTED, INTERNAL.' }),
        field: z.string().optional(),
        message: z.string(),
      }),
    ),
    server_copy: SyncDraftCopy.nullable(),
  })
  .meta({ id: 'SyncResult' })
export type SyncResultOut = z.infer<typeof SyncResult>

export const SyncBatchResponse = z
  .object({ batch_id: z.string(), server_time: z.string(), results: z.array(SyncResult) })
  .meta({ id: 'SyncBatchResponse' })

// ---------------------------------------------------------------- app gate

export const AppConfigQuery = z
  .object({ version: z.string().regex(/^\d+\.\d+\.\d+$/).optional().meta({ description: 'Installed APK version → updateRequired / updateAvailable.' }) })
  .meta({ id: 'AppConfigQuery' })

export const AppConfig = z
  .object({
    minSupportedVersion: z.string().nullable().meta({ description: 'Below this every authenticated call answers 426.' }),
    latestVersion: z.string().nullable(),
    downloadUrl: z.string().nullable().meta({ description: 'APK download page (side-load); null = not published yet ("hubungi admin").' }),
    updateRequired: z.boolean().nullable().meta({ description: 'Only with ?version=.' }),
    updateAvailable: z.boolean().nullable().meta({ description: 'Only with ?version=.' }),
    timezone: z.string().meta({ description: 'Company display timezone (IANA).' }),
    serverTime: z.string(),
    android: z.object({ packageName: z.string() }),
    features: z.object({
      pushEnabled: z.boolean().meta({ description: 'false until FCM is configured (ADR 0011) — poll GET /notifications instead.' }),
      syncExpenseDrafts: z.boolean(),
      syncAttendance: z.boolean(),
      syncProgressReports: z.boolean(),
    }),
    sync: z.object({ maxItemsPerBatch: z.number().int(), maxBatchBytes: z.number().int(), rateLimitPerMinute: z.number().int() }),
  })
  .meta({ id: 'AppConfig' })
