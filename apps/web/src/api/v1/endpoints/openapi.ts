import { openapiDocument } from '../openapi.generated'

import { json, problem, v1 } from '../http'

/**
 * GET /api/v1/openapi.json — the document generated at build (scripts/gen-openapi.mjs →
 * packages/api-contract/openapi.json + src/api/v1/openapi.generated.ts). Authentication required outside development
 * (architecture §6.3).
 */
export const openapiEndpoint = v1({
  path: '/openapi.json',
  method: 'get',
  auth: 'public',
  handler: async ({ req }) => {
    if (process.env.NODE_ENV !== 'development' && !req.user) return problem(401, 'Unauthorized')
    return json(openapiDocument)
  },
})
