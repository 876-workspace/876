import { adminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import type {
  AdminBillingAccount,
  AdminBillingAccountCreateParams,
  AdminBillingAccountUpdateParams,
  AdminDeletedBillingAccount,
  AdminListResponse,
} from '../types'

/** `$876.billingAccounts.*` — platform administration of billing accounts. */
export function createAdminBillingAccountsResource(runtime: AdminRuntime) {
  return {
    /** Lists all billing accounts across the platform. */
    list(params?: { organizationId?: string; limit?: number }) {
      return adminRequest<AdminListResponse<AdminBillingAccount>>(runtime, {
        method: 'GET',
        path: '/billing/accounts',
        query: {
          organization_id: params?.organizationId,
          limit: params?.limit,
        },
      })
    },

    /** Retrieves a specific billing account by ID. */
    retrieve(billingAccountId: string) {
      return adminRequest<AdminBillingAccount>(runtime, {
        method: 'GET',
        path: `/billing/accounts/${billingAccountId}`,
      })
    },

    /** Creates a new billing account. */
    create(params: AdminBillingAccountCreateParams) {
      return adminRequest<AdminBillingAccount>(runtime, {
        method: 'POST',
        path: '/billing/accounts',
        body: params,
      })
    },

    /** Updates a billing account. */
    update(billingAccountId: string, body: AdminBillingAccountUpdateParams) {
      return adminRequest<AdminBillingAccount>(runtime, {
        method: 'PATCH',
        path: `/billing/accounts/${billingAccountId}`,
        body,
      })
    },

    /** Deletes a billing account. */
    del(billingAccountId: string) {
      return adminRequest<AdminDeletedBillingAccount>(runtime, {
        method: 'DELETE',
        path: `/billing/accounts/${billingAccountId}`,
      })
    },
  }
}
