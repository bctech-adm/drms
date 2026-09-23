import { createLocalReq, type Payload, type PayloadRequest } from 'payload'

/**
 * Runs `fn` in ONE explicit DB transaction with a fresh local req (ADR 0007 fallback pattern):
 * every Local API call that receives this `req` joins the transaction (Payload initTransaction
 * reuses an existing `req.transactionID` and leaves commit/rollback to its owner).
 * Used by system tooling (auth routes, seed, tests). `user` null = system actor.
 */
export async function withSystemTransaction<T>(
  payload: Payload,
  user: PayloadRequest['user'],
  fn: (req: PayloadRequest) => Promise<T>,
  context: Record<string, unknown> = {},
): Promise<T> {
  const req = await createLocalReq({ user: user ?? undefined, context }, payload)
  return withReqTransaction(req, () => fn(req))
}

/**
 * Wraps `fn` in a transaction bound to an EXISTING req (custom /api/v1 endpoints: Payload does
 * not open a transaction for root endpoints). Nested use joins the outer transaction.
 */
export async function withReqTransaction<T>(req: PayloadRequest, fn: () => Promise<T>): Promise<T> {
  if (req.transactionID) return fn()
  const id = await req.payload.db.beginTransaction()
  if (!id) throw new Error('transactions not supported by adapter')
  req.transactionID = id
  try {
    const result = await fn()
    await req.payload.db.commitTransaction(id)
    return result
  } catch (err) {
    await req.payload.db.rollbackTransaction(id)
    throw err
  } finally {
    delete req.transactionID
  }
}
