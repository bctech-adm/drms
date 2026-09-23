import type { PayloadRequest } from 'payload'
import type { PostgresAdapter } from '@payloadcms/db-postgres'

/**
 * Drizzle handle of the CURRENT Payload request transaction.
 * Mirrors @payloadcms/drizzle `utilities/getTransaction.ts` (not exported by the package, v3.90.1):
 * `adapter.sessions[await req.transactionID].db`. `sessions` is part of the public adapter type,
 * but its semantics are internal → covered by an integration test (spike d) and pinned Payload.
 * Throws instead of silently falling back to a pool connection (which would break atomicity).
 */
export async function getRequestTx(req: PayloadRequest) {
  const adapter = req.payload.db as unknown as PostgresAdapter
  const id = req.transactionID ? await req.transactionID : undefined
  const session = id !== undefined ? adapter.sessions[String(id)] : undefined
  if (!session) {
    throw new Error('getRequestTx: no active transaction on req')
  }
  return session.db
}
