import type { Endpoint } from 'payload'

import { testEmailEndpoint } from './endpoints/admin'
import { registerDeviceEndpoint, revokeDeviceEndpoint } from './endpoints/devices'
import { healthEndpoint, healthHeadEndpoint, readyEndpoint, readyHeadEndpoint } from './endpoints/health'
import { mastersEndpoint } from './endpoints/masters'
import { meEndpoint } from './endpoints/me'
import { openapiEndpoint } from './endpoints/openapi'

/** Root custom endpoints served at /api/v1/* (architecture §6.1/§6.3). */
export const v1Endpoints: Endpoint[] = [
  healthEndpoint,
  healthHeadEndpoint,
  readyEndpoint,
  readyHeadEndpoint,
  meEndpoint,
  mastersEndpoint,
  registerDeviceEndpoint,
  revokeDeviceEndpoint,
  testEmailEndpoint,
  openapiEndpoint,
]
