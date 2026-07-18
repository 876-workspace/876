import * as z from 'zod'

import type { ApiResult } from './api'
import type { Error } from './errors'

export const providerErrorCodeValues = [
  'provider/access-denied',
  'provider/account-selection-required',
  'provider/consumer-account-required',
  'provider/code-expired',
  'provider/code-not-found',
  'provider/code-used',
  'provider/consent-required',
  'provider/posthog-error',
  'provider/posthog-invalid',
  'provider/internal-error',
  'provider/invalid-client',
  'provider/invalid-client-secret',
  'provider/invalid-code-challenge',
  'provider/invalid-code-verifier',
  'provider/invalid-redirect-uri',
  'provider/invalid-request',
  'provider/invalid-scope',
  'provider/login-required',
  'provider/misconfigured',
  'provider/token-expired',
  'provider/token-invalid',
  'provider/unsupported-grant-type',
  'provider/unsupported-response-type',
] as const

export const providerErrorCodeSchema = z.enum(providerErrorCodeValues)

export type ProviderErrorCode = z.infer<typeof providerErrorCodeSchema>

export type ProviderServiceResult<TSuccess> = ApiResult<
  TSuccess,
  Error<ProviderErrorCode>
>
