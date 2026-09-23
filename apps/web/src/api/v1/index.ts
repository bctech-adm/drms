import type { Endpoint } from 'payload'

import { registerDeviceEndpoint, revokeDeviceEndpoint } from './endpoints/devices'
import { healthEndpoint, readyEndpoint } from './endpoints/health'
import { mastersEndpoint } from './endpoints/masters'
import { meEndpoint } from './endpoints/me'
import { openapiEndpoint } from './endpoints/openapi'

/** Root custom endpoints served at /api/v1/* (architecture §6.1/§6.3). */
export const v1Endpoints: Endpoint[] = [
  healthEndpoint,
  readyEndpoint,
  meEndpoint,
  mastersEndpoint,
  registerDeviceEndpoint,
  revokeDeviceEndpoint,
  openapiEndpoint,
]
