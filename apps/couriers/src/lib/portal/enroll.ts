import 'server-only'

import { get876Client } from '@/lib/876'
import { ensureSharedCoreUserCustomer } from '@/lib/finance/customers'
import { getError, type CouriersErrorCode } from '@/lib/errors'
import type {
  EnsurePortalCustomerResult,
  PortalCustomer,
  PortalCustomerEnsureParams,
} from '@/types/portal'

import { createPortalCouriersClient, isPortalNotFound } from './client'

export async function ensurePortalCustomer(
  params: PortalCustomerEnsureParams
): EnsurePortalCustomerResult {
  const couriers = createPortalCouriersClient(params.accessToken)
  const existing = await couriers.portal.customer.retrieve(params.tenant.id)
  if (existing.error === null) {
    const shippingAddress = await couriers.portal.shippingAddress.retrieve(
      params.tenant.id
    )
    if (shippingAddress.error !== null || shippingAddress.data.mailbox === null)
      return localFailure('portal/mailbox-unavailable')
    return {
      data: toPortalCustomer(
        existing.data,
        shippingAddress.data.mailbox.number
      ),
      error: null,
    }
  }
  if (!isPortalNotFound(existing))
    return localFailure('portal/enrollment-failed')

  const $876 = await get876Client()
  const billingCustomer = await ensureSharedCoreUserCustomer(
    $876.billing,
    params.tenant.orgId,
    {
      id: params.userId,
      email: params.email,
      firstName: params.firstName ?? null,
      lastName: params.lastName ?? null,
    }
  )
  if (billingCustomer.error || !billingCustomer.data)
    return localFailure('portal/billing-unavailable')

  const enrollment = await couriers.portal.enrollments.create(
    params.tenant.id,
    {
      billing_customer_id: billingCustomer.data.id,
    }
  )
  if (enrollment.error !== null) {
    if (enrollment.error.code === 'mailbox/allocation-exhausted')
      return localFailure('portal/mailbox-unavailable')
    return localFailure('portal/enrollment-failed')
  }

  return {
    data: toPortalCustomer(
      enrollment.data.customer,
      enrollment.data.mailbox.number
    ),
    error: null,
  }
}

function localFailure(code: CouriersErrorCode) {
  const error = getError(code)
  return {
    data: null,
    error: error.message,
    status: error.httpStatus,
    code: error.code,
  }
}

function toPortalCustomer(
  customer: {
    id: string
    tenant_id: string
    user_id: string | null
    billing_customer_id: string
    branch_id: string | null
    status: 'ACTIVE' | 'SUSPENDED'
    is_commercial: boolean
    first_seen_at: number
    created_at: number
    updated_at: number
  },
  primaryMailboxNumber: string
): PortalCustomer {
  return {
    id: customer.id,
    tenantId: customer.tenant_id,
    userId: customer.user_id,
    billingCustomerId: customer.billing_customer_id,
    branchId: customer.branch_id,
    status: customer.status,
    trn: null,
    isCommercial: customer.is_commercial,
    firstSeenAt: customer.first_seen_at,
    createdAt: customer.created_at,
    updatedAt: customer.updated_at,
    primaryMailboxNumber,
  }
}
