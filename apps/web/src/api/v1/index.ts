import type { Endpoint } from 'payload'

import { testEmailEndpoint } from './endpoints/admin'
import { registerDeviceEndpoint, revokeDeviceEndpoint } from './endpoints/devices'
import { healthEndpoint, healthHeadEndpoint, readyEndpoint, readyHeadEndpoint } from './endpoints/health'
import { CASH_ENDPOINTS } from './endpoints/cash'
import { EXPENSE_ENDPOINTS } from './endpoints/expense-requests'
import { mastersEndpoint } from './endpoints/masters'
import { uploadMediaEndpoint } from './endpoints/media'
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
  // F2a expense-request flow (T1–T4, T6–T8, period closing)
  ...EXPENSE_ENDPOINTS,
  ...CASH_ENDPOINTS,
  uploadMediaEndpoint,
]
