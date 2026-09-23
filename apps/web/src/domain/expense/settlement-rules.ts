/**
 * T5 LPJ & settlement vocabulary and arithmetic (architecture §5.1 "settle" choice, §5.3).
 * Pure module (unit-tested, bundled by the OpenAPI generator).
 */
export const SETTLEMENT_STATUSES = ['draft', 'submitted', 'revision', 'verified', 'settled'] as const
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number]

export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  draft: 'Draft',
  submitted: 'Diajukan',
  revision: 'Revisi',
  verified: 'Terverifikasi',
  settled: 'Disettle',
}

export type SettlementType = 'none' | 'refund' | 'shortfall'

export const SETTLEMENT_TYPE_LABELS: Record<SettlementType, string> = {
  none: 'Pas — tanpa selisih',
  refund: 'Sisa dana dikembalikan ke kas (KM Pengembalian LPJ)',
  shortfall: 'Kekurangan dibayar dengan transfer',
}

/** Allowed settlement status moves (mirrors the DB trigger pk_settlements_guard). */
export const SETTLEMENT_MOVES: Readonly<Record<SettlementStatus, readonly SettlementStatus[]>> = {
  draft: ['submitted'],
  submitted: ['revision', 'verified'],
  revision: ['submitted'],
  verified: ['settled'],
  settled: [],
}

/**
 * difference = transferred − verified receipts (architecture §5.1):
 * > 0 surplus → staff returns the rest → refund (KM); < 0 → company owes the rest → shortfall
 * transfer (T3); 0 → nothing to settle.
 */
export function settlementOf(transferredTotal: number, verifiedReceiptsTotal: number): { difference: number; type: SettlementType; amount: number } {
  const difference = transferredTotal - verifiedReceiptsTotal
  if (difference > 0) return { difference, type: 'refund', amount: difference }
  if (difference < 0) return { difference, type: 'shortfall', amount: -difference }
  return { difference: 0, type: 'none', amount: 0 }
}
