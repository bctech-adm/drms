import { z } from 'zod'

/**
 * /api/v1 contract for the F2a expense-request flow (T1–T4, T6–T8, period closing).
 * Money = integer Rupiah; business dates = 'YYYY-MM-DD' (company TZ); server timestamps ISO-8601 UTC.
 * Pure module (bundled by scripts/gen-openapi.mjs).
 */
const id = z.number().int().positive()
const rupiah = z.number().int().min(0).max(1e13)
const rupiahPos = z.number().int().min(1).max(1e13)
const businessDate = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'YYYY-MM-DD')
const reason = z.string().trim().min(3).max(1000)
const qty = z
  .number()
  .positive()
  .max(1e9)
  .refine((v) => Math.abs(Math.round(v * 1000) - v * 1000) < 1e-6, 'maks. 3 desimal')

export const RequestTypeEnum = z.enum(['advance', 'reimburse']).meta({ id: 'RequestType', description: 'advance = Uang Muka, reimburse = Reimburse' })
export const RequestStatusEnum = z
  .enum([
    'draft',
    'pending_ack',
    'pending_approval',
    'approved',
    'receipt_revision',
    'receipts_verified',
    'transferred',
    'receipts_complete',
    'lpj_submitted',
    'lpj_revision',
    'lpj_verified',
    'completed',
    'rejected',
    'cancelled',
  ])
  .meta({ id: 'RequestStatus' })

export const ActionEnum = z
  .enum([
    'edit',
    'submit',
    'withdraw',
    'cancel',
    'acknowledge',
    'approve',
    'reject',
    'add_receipt',
    'receipt_verify',
    'receipt_reject',
    'receipts_resubmit',
    'verify_receipts',
    'review_flag',
    'transfer',
    'transfer_void',
    'complete',
    'resubmit',
  ])
  .meta({ id: 'RequestAction' })

export const LineInput = z
  .object({
    id: z.string().max(64).optional().meta({ description: 'Existing line id (keep to update a line in place; omit for new lines).' }),
    description: z.string().max(500).optional(),
    qty: qty.nullable().optional(),
    uomId: id.nullable().optional(),
    unitPrice: rupiah.nullable().optional().meta({ description: 'Informational only — never used to compute the total (Q-05).' }),
    total: rupiahPos.nullable().optional().meta({ description: 'PRIMARY value entered by the user (may be rounded from the receipt).' }),
    notes: z.string().max(500).nullable().optional(),
    categoryId: id.nullable().optional(),
    vehicleId: id.nullable().optional(),
  })
  .strict()
  .meta({ id: 'ExpenseLineInput' })

const draftFields = {
  title: z.string().trim().min(1).max(200),
  projectId: id.nullable().optional(),
  costCenterId: id.nullable().optional(),
  neededDate: businessDate.nullable().optional(),
  periodFrom: businessDate.nullable().optional(),
  periodTo: businessDate.nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  requesterIds: z.array(id).max(20).optional().meta({ description: '"Diajukan Oleh" in order (default: the caller\'s employee).' }),
  bankAccountId: id.nullable().optional().meta({ description: 'employee-bank-accounts id of one of the requesters (Q-11).' }),
  lines: z.array(LineInput).max(200).optional(),
  attachmentIds: z.array(id).max(20).optional(),
}

export const ExpenseRequestCreate = z
  .object({
    type: RequestTypeEnum,
    ...draftFields,
    clientUuid: z.uuid().optional().meta({ description: 'APK offline id; a retry with the same value returns the existing draft.' }),
  })
  .strict()
  .meta({ id: 'ExpenseRequestCreate' })

export const ExpenseRequestUpdate = z
  .object({ type: RequestTypeEnum.optional(), ...draftFields, title: draftFields.title.optional() })
  .strict()
  .meta({ id: 'ExpenseRequestUpdate', description: 'Draft only. Omitted fields stay unchanged; `lines` replaces all lines.' })

export const SignBody = z
  .object({ signatureMediaId: id.nullable().optional().meta({ description: 'media-signatures id captured on screen (own upload); default = profile signature.' }) })
  .strict()
  .meta({ id: 'SignBody' })

export const ReasonBody = z.object({ reason }).strict().meta({ id: 'ReasonBody' })

export const RejectBody = z
  .object({ reason, signatureMediaId: id.nullable().optional() })
  .strict()
  .meta({ id: 'RejectBody' })

export const EmptyBody = z.object({}).strict().meta({ id: 'EmptyBody' })

export const ReceiptCreate = z
  .object({
    lineId: z.string().min(1).max(64),
    receiptNo: z.string().max(64).nullable().optional(),
    vendorName: z.string().trim().min(1).max(160),
    vendorId: id.nullable().optional(),
    receiptDate: businessDate,
    receiptTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).nullable().optional(),
    amount: rupiahPos.meta({ description: 'Total PRINTED on the receipt.' }),
    taxAmount: rupiah.nullable().optional(),
    imageId: id.meta({ description: 'media-receipts id uploaded by the caller (POST /media/receipts).' }),
  })
  .strict()
  .meta({ id: 'ReceiptCreate' })

export const ReceiptUpdate = ReceiptCreate.omit({ imageId: true }).partial().strict().meta({ id: 'ReceiptUpdate' })

export const FlagReviewBody = z.object({ note: z.string().max(500).optional() }).strict().meta({ id: 'FlagReviewBody' })

export const TransferCreate = z
  .object({
    cashAccountId: id,
    bankRef: z.string().trim().min(1).max(64),
    proofMediaId: id.meta({ description: 'media-transfer-proofs id (POST /media/transfer-proofs).' }),
    transferDate: businessDate.optional(),
    amount: rupiahPos.optional().meta({ description: 'Optional echo; must equal the approved amount (Finance cannot change it, G3).' }),
  })
  .strict()
  .meta({ id: 'TransferCreate' })

export const ListQuery = z
  .object({
    scope: z.enum(['mine', 'team', 'inbox', 'all']).default('all'),
    status: z.string().regex(/^[a-z_]+(,[a-z_]+)*$/).optional(),
    type: RequestTypeEnum.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().max(64).optional(),
  })
  .meta({ id: 'ExpenseRequestListQuery' })

const Ref = z.object({ id, code: z.string().nullish(), name: z.string().nullish() }).meta({ id: 'Ref' })

export const ExpenseRequestListItem = z
  .object({
    id,
    docNo: z.string().nullable(),
    type: RequestTypeEnum,
    typeLabel: z.string(),
    status: RequestStatusEnum,
    statusLabel: z.string(),
    title: z.string(),
    projectId: id.nullable(),
    costCenterId: id.nullable(),
    grandTotal: rupiah,
    approvedAmount: rupiah.nullable(),
    requestDate: z.string().nullable(),
    neededDate: z.string().nullable(),
    createdById: id.nullable(),
    updatedAt: z.string().nullable(),
    openWarningFlags: z.number().int().optional(),
  })
  .meta({ id: 'ExpenseRequestListItem' })

export const ExpenseRequestList = z
  .object({ items: z.array(ExpenseRequestListItem), nextCursor: z.string().nullable() })
  .meta({ id: 'ExpenseRequestList' })

export const ExpenseRequestDetail = ExpenseRequestListItem.extend({
  uuid: z.string().nullable(),
  project: Ref.nullable(),
  costCenter: Ref.nullable(),
  periodFrom: z.string().nullable(),
  periodTo: z.string().nullable(),
  notes: z.string().nullable(),
  requesters: z.array(Ref.nullable()),
  createdBy: z.object({ id, name: z.string().nullish() }).nullable(),
  bankAccountId: id.nullable(),
  bank: z
    .object({ bankName: z.string().nullable(), accountNo: z.string().nullable().meta({ description: 'Masked (last 4) unless own request or Finance/Owner/Admin.' }), accountHolder: z.string().nullable() })
    .nullable(),
  lines: z.array(
    z.object({
      id: z.string(),
      no: z.number().int(),
      description: z.string().nullable(),
      qty: z.number().nullable(),
      uom: Ref.nullable(),
      unitPrice: rupiah.nullable(),
      unitPriceDisplay: rupiah.nullable().meta({ description: 'unitPrice, else total ÷ qty (display only).' }),
      total: rupiah,
      notes: z.string().nullable(),
      category: Ref.nullable(),
      vehicle: z.object({ id, plateNo: z.string().nullish(), plateDisplay: z.string().nullish(), type: z.string().nullish() }).nullable(),
    }),
  ),
  transferredTotal: rupiah,
  approvalCycle: z.number().int(),
  currentLevel: z.number().int().nullable(),
  approvalRule: z
    .object({
      id,
      name: z.string(),
      acknowledge: z.enum(['required', 'optional', 'none']),
      acknowledgerUserId: id.nullable(),
      steps: z.array(z.object({ level: z.number().int(), approverRole: z.string().nullable(), approverUserId: id.nullable() })),
      signDiajukan: z.enum(['required', 'optional', 'none']),
      signDibuat: z.enum(['required', 'optional', 'none']),
    })
    .nullable(),
  approvals: z.array(
    z.object({
      id,
      cycle: z.number().int(),
      position: z.enum(['diajukan', 'dibuat', 'diketahui', 'approval']),
      level: z.number().int(),
      actorId: id.nullable(),
      employeeId: id.nullable(),
      actorName: z.string().nullable(),
      onBehalf: z.boolean(),
      decision: z.enum(['signed', 'acknowledged', 'approved', 'rejected']),
      reason: z.string().nullable(),
      decidedAt: z.string().nullable(),
      budgetPctBefore: z.number().nullable(),
      budgetPctAfter: z.number().nullable(),
      openFlags: z.number().int().nullable(),
      signatureId: id.nullable(),
      signatureSha256: z.string().nullable(),
      signatureSource: z.string().nullable(),
    }),
  ),
  receipts: z.array(
    z.object({
      id,
      lineId: z.string(),
      lineNo: z.number().int().nullable(),
      receiptNo: z.string().nullable(),
      vendorName: z.string(),
      receiptDate: z.string(),
      amount: rupiah,
      imageId: id.nullable(),
      status: z.enum(['pending', 'valid', 'rejected', 'removed']),
    }),
  ),
  flags: z.array(
    z.object({
      id,
      kind: z.enum(['amount_diff', 'date_after_request', 'date_too_old', 'date_out_of_period', 'uom_suspicious', 'duplicate']),
      kindLabel: z.string(),
      level: z.string(),
      status: z.string(),
      lineId: z.string().nullable(),
      lineNo: z.number().int().nullable(),
      receiptId: id.nullable(),
      relatedRequestId: id.nullable(),
      message: z.string(),
      reviewNote: z.string().nullable(),
    }),
  ),
  transfers: z.array(
    z.object({
      id,
      docNo: z.string(),
      kind: z.string(),
      amount: rupiah,
      transferDate: z.string(),
      bankRef: z.string(),
      status: z.string(),
      cashEntryId: id.nullable(),
      proofId: id.nullable(),
      voidReason: z.string().nullable(),
    }),
  ),
  budget: z
    .object({ basis: z.enum(['project', 'none']), pctBefore: z.number().nullable(), pctAfter: z.number().nullable() })
    .meta({ description: 'US-26 preview (committed % before → after); cost centers: "none" (Q-24).' }),
  openWarningFlags: z.number().int(),
  allowedActions: z.array(ActionEnum).meta({ description: 'UI hint; the server re-checks every action.' }),
  resubmitOfId: id.nullable(),
  submittedAt: z.string().nullable(),
  cancelReason: z.string().nullable(),
  rejectReason: z.string().nullable(),
  clientUuid: z.string().nullable(),
  createdAt: z.string().nullable(),
}).meta({ id: 'ExpenseRequestDetail' })

export const HistoryItem = z
  .object({
    serverTime: z.string(),
    action: z.string(),
    field: z.string().nullable(),
    lineNo: z.number().int().nullable(),
    oldValue: z.unknown(),
    newValue: z.unknown(),
    statusFrom: z.string().nullable(),
    statusTo: z.string().nullable(),
    reason: z.string().nullable(),
    userId: z.number().int().nullable(),
    source: z.string().nullable(),
  })
  .meta({ id: 'HistoryItem' })
export const History = z.object({ items: z.array(HistoryItem) }).meta({ id: 'History' })

export const MediaKindEnum = z.enum(['receipts', 'transfer-proofs', 'signatures', 'attachments']).meta({ id: 'MediaKind' })
export const MediaUploaded = z
  .object({ id, kind: MediaKindEnum, mimeType: z.string().nullable(), filesize: z.number().int().nullable(), width: z.number().int().nullable(), height: z.number().int().nullable(), sha256Original: z.string().nullable() })
  .meta({ id: 'MediaUploaded' })

export const CashEntryCreate = z
  .object({
    direction: z.enum(['in', 'out']),
    entryDate: businessDate.optional(),
    cashAccountId: id,
    amount: rupiahPos,
    description: z.string().trim().min(1).max(1000),
    categoryId: id.nullable().optional().meta({ description: 'Required for direction=out.' }),
    cashInSourceId: id.nullable().optional().meta({ description: 'Required for direction=in.' }),
    projectId: id.nullable().optional(),
    costCenterId: id.nullable().optional(),
    vehicleId: id.nullable().optional(),
    proofId: id.nullable().optional().meta({ description: 'media-attachments id (optional, US-23).' }),
  })
  .strict()
  .meta({ id: 'CashEntryCreate' })

export const CashEntryUpdate = z
  .object({
    reason,
    description: z.string().trim().min(1).max(1000).optional(),
    categoryId: id.nullable().optional(),
    cashInSourceId: id.nullable().optional(),
    projectId: id.nullable().optional(),
    costCenterId: id.nullable().optional(),
    vehicleId: id.nullable().optional(),
  })
  .strict()
  .meta({ id: 'CashEntryUpdate', description: 'Manual entries of an open period only; amount/date/account changes = void + new entry.' })

export const CashEntry = z
  .object({
    id,
    entryNo: z.string(),
    entryDate: z.string(),
    period: z.string().nullable(),
    direction: z.enum(['in', 'out']),
    amount: rupiah,
    cashAccountId: id,
    categoryId: id.nullable(),
    cashInSourceId: id.nullable(),
    projectId: id.nullable(),
    costCenterId: id.nullable(),
    vehicleId: id.nullable(),
    description: z.string().nullable(),
    sourceType: z.enum(['transfer', 'settlement_refund', 'manual', 'reversal', 'opening']),
    expenseRequestId: id.nullable(),
    transferId: id.nullable(),
    status: z.enum(['posted', 'void']),
    reversalOfId: id.nullable(),
    reversedById: id.nullable(),
    voidReason: z.string().nullable(),
    postedAt: z.string().nullable(),
  })
  .meta({ id: 'CashEntry' })

export const CashEntryList = z.object({ items: z.array(CashEntry), nextCursor: z.string().nullable() }).meta({ id: 'CashEntryList' })
export const CashListQuery = z
  .object({
    period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
    cashAccountId: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: z.string().max(64).optional(),
  })
  .meta({ id: 'CashEntryListQuery' })

export const VoidResult = z.object({ original: CashEntry, reversal: CashEntry }).meta({ id: 'CashVoidResult' })

export const Balances = z
  .object({
    asOf: z.string().nullable(),
    items: z.array(z.object({ cashAccountId: id, name: z.string(), openingBalance: z.number().int(), totalIn: z.number().int(), totalOut: z.number().int(), balance: z.number().int() })),
  })
  .meta({ id: 'Balances' })

export const PeriodCloseBody = z
  .object({ period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), note: z.string().max(500).optional() })
  .strict()
  .meta({ id: 'PeriodCloseBody' })

export const PeriodClosing = z
  .object({
    id,
    period: z.string(),
    status: z.enum(['closed', 'reopened']),
    note: z.string().nullable(),
    closedById: id.nullable(),
    closedAt: z.string().nullable(),
    reopenedById: id.nullable(),
    reopenedAt: z.string().nullable(),
    reopenReason: z.string().nullable(),
  })
  .meta({ id: 'PeriodClosing' })
export const PeriodClosingList = z.object({ lockDate: z.string().nullable(), items: z.array(PeriodClosing) }).meta({ id: 'PeriodClosingList' })

export const TransferResult = z
  .object({
    request: ExpenseRequestDetail,
    transferId: id,
    transferDocNo: z.string(),
    cashEntryId: id,
    cashEntryNo: z.string(),
  })
  .meta({ id: 'TransferResult' })

export const Created = z.object({ id }).meta({ id: 'Created' })
