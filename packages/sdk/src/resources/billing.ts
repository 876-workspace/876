import { buildClientQuery } from '@876/core/client'

import { sendAuthRequest } from '../request.ts'
import type { SdkRuntime } from '../request.ts'
import type { RequestOptions } from '../types/api.ts'
import {
  sdk876BillingAccountListSchema,
  sdk876BillingAccountSchema,
  sdk876SubscriptionListSchema,
  sdk876SubscriptionSchema,
} from '../types/billing.ts'
import type {
  BillingAccountListResult,
  BillingAccountResult,
  SubscriptionListResult,
  SubscriptionResult,
} from '../types/billing.ts'

export function createBillingResource(runtime: SdkRuntime) {
  return {
    accounts: {
      /** Lists all billing accounts for an organization. */
      list(
        params?: {
          organizationId?: string
          limit?: number
          starting_after?: string
          ending_before?: string
        },
        requestOptions?: RequestOptions
      ): Promise<BillingAccountListResult> {
        return sendAuthRequest(
          runtime,
          'GET',
          `/billing/accounts${buildClientQuery(params ?? {})}`,
          undefined,
          sdk876BillingAccountListSchema,
          requestOptions
        )
      },

      /** Retrieves a specific billing account by ID. */
      retrieve(
        billingAccountId: string,
        requestOptions?: RequestOptions
      ): Promise<BillingAccountResult> {
        return sendAuthRequest(
          runtime,
          'GET',
          `/billing/accounts/${billingAccountId}`,
          undefined,
          sdk876BillingAccountSchema,
          requestOptions
        )
      },
    },
    subscriptions: {
      /** Lists all subscriptions for an organization. */
      list(
        params?: {
          organizationId?: string
          appId?: string
          limit?: number
          starting_after?: string
          ending_before?: string
        },
        requestOptions?: RequestOptions
      ): Promise<SubscriptionListResult> {
        return sendAuthRequest(
          runtime,
          'GET',
          `/billing/subscriptions${buildClientQuery(params ?? {})}`,
          undefined,
          sdk876SubscriptionListSchema,
          requestOptions
        )
      },

      /** Retrieves a specific subscription by ID. */
      retrieve(
        subscriptionId: string,
        requestOptions?: RequestOptions
      ): Promise<SubscriptionResult> {
        return sendAuthRequest(
          runtime,
          'GET',
          `/billing/subscriptions/${subscriptionId}`,
          undefined,
          sdk876SubscriptionSchema,
          requestOptions
        )
      },
    },
  }
}
