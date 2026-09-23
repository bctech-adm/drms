/**
 * In-process token bucket (architecture §6.5: single web instance → in-memory is sufficient;
 * state is lost on restart, acceptable). Edge limits per IP are Traefik's job.
 */
type Bucket = { tokens: number; updatedAt: number }

const buckets = new Map<string, Bucket>()
const MAX_KEYS = 10_000

/** Consumes one token of `key`; `limit` tokens refill evenly over `windowMs`. */
export function takeToken(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  let b = buckets.get(key)
  if (!b) {
    if (buckets.size >= MAX_KEYS) {
      // Drop the oldest entries (Map keeps insertion order) — bounded memory.
      for (const k of buckets.keys()) {
        buckets.delete(k)
        if (buckets.size < MAX_KEYS / 2) break
      }
    }
    b = { tokens: limit, updatedAt: now }
    buckets.set(key, b)
  }
  const refill = ((now - b.updatedAt) / windowMs) * limit
  b.tokens = Math.min(limit, b.tokens + refill)
  b.updatedAt = now
  if (b.tokens < 1) return false
  b.tokens -= 1
  return true
}

/** Test seam. */
export function resetRateLimits(): void {
  buckets.clear()
}
