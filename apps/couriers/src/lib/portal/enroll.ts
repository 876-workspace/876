import 'server-only'

import type { CourierCustomerProfile } from '@/lib/db'
import { getFinanceClient } from '@/lib/finance/client'
import { ensureSharedCoreUserCustomer } from '@/lib/finance/customers'
import { service } from '@/lib/service'
import { errFrom, ok } from '@/lib/service/result'
import type {
  EnsurePortalCustomerResult,
  PortalCustomerEnsureParams,
} from '@/types/portal'

export async function ensurePortalCustomer(
  params: PortalCustomerEnsureParams
): EnsurePortalCustomerResult {
  const existing = await service.customerProfiles.retrieveByTenantAndUser(
    params.tenant.id,
    params.userId
  )
  if (existing) return withPrimaryMailbox(existing)

  const finance = await getFinanceClient()
  const billingCustomer = await ensureSharedCoreUserCustomer(
    finance,
    params.tenant.orgId,
    {
      id: params.userId,
      email: params.email,
      firstName: params.firstName ?? null,
      lastName: params.lastName ?? null,
    }
  )
  if (billingCustomer.error || !billingCustomer.data)
    return errFrom('portal/billing-unavailable')

  let allocation = await service.mailboxes.allocate({
    tenantId: params.tenant.id,
  })
  if (allocation.data === null) return allocation

  try {
    const profile = await service.customerProfiles.ensure({
      tenantId: params.tenant.id,
      userId: params.userId,
      billingCustomerId: billingCustomer.data.id,
      mailboxNumber: allocation.data.number,
    })

    return withPrimaryMailbox(profile)
  } catch (error) {
    if (!isUniqueViolation(error)) {
      console.error('[portal.ensurePortalCustomer]', error)
      return errFrom('portal/enrollment-failed')
    }
  }

  const concurrentProfile =
    await service.customerProfiles.retrieveByTenantAndUser(
      params.tenant.id,
      params.userId
    )
  if (concurrentProfile) return withPrimaryMailbox(concurrentProfile)

  allocation = await service.mailboxes.allocate({
    tenantId: params.tenant.id,
  })
  if (allocation.data === null) return allocation

  try {
    const profile = await service.customerProfiles.ensure({
      tenantId: params.tenant.id,
      userId: params.userId,
      billingCustomerId: billingCustomer.data.id,
      mailboxNumber: allocation.data.number,
    })

    return withPrimaryMailbox(profile)
  } catch (error) {
    if (!isUniqueViolation(error)) {
      console.error('[portal.ensurePortalCustomer]', error)
      return errFrom('portal/enrollment-failed')
    }

    const profile = await service.customerProfiles.retrieveByTenantAndUser(
      params.tenant.id,
      params.userId
    )
    if (profile) return withPrimaryMailbox(profile)

    console.error('[portal.ensurePortalCustomer]', error)
    return errFrom('portal/mailbox-unavailable')
  }
}

async function withPrimaryMailbox(
  profile: CourierCustomerProfile
): EnsurePortalCustomerResult {
  const mailboxes = await service.mailboxes.list({
    tenantId: profile.tenantId,
    customerId: profile.id,
  })
  const primaryMailbox = mailboxes.find((mailbox) => mailbox.isPrimary)
  if (!primaryMailbox) return errFrom('portal/mailbox-unavailable')

  return ok({
    ...profile,
    primaryMailboxNumber: primaryMailbox.number,
  })
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  )
}
