import type { ClientHttpMethod } from '@876/core/client'

import type { Result } from './common'

/** Server-only credentials for one Billing request tier. */
export type BillingServerCredentials =
  | { accessToken: string; internalKey?: never; organizationId?: string }
  | { accessToken?: never; internalKey: string; organizationId?: never }
  | {
      accessToken?: never
      internalKey?: never
      organizationId?: never
      public: true
    }

/** Options for the server-only Billing transport. */
export type BillingServerClientOptions = BillingServerCredentials & {
  baseUrl?: string
  fetch?: typeof fetch
  requestId?: string
}

/** A versioned Billing API request made by a server-only compatibility caller. */
export interface BillingServerRequest {
  method?: ClientHttpMethod
  path: string
  body?: unknown
  query?: Record<string, boolean | number | string | undefined>
}

/** Result returned by the server-only Billing transport. */
export type BillingServerResult<T> = Result<T>
