import 'server-only'

import { getCrmBillingIntegration } from '@/lib/876/billing-integration'
import { prisma } from '@/lib/db'
import { updateExternalCustomer } from '@/lib/finance/customers'
import { fail, ok, type ServiceResult } from '@/lib/service/result'
import type { CrmCustomer, CrmCustomerUpdateInput } from '@/types/crm'

export async function update(
  organizationId: string,
  id: string,
  params: CrmCustomerUpdateInput
): Promise<ServiceResult<CrmCustomer>> {
  const current = await prisma.customerProfile.findFirst({
    where: { id, organizationId, deletedAt: null },
  })
  if (!current)
    return fail('crm/customer-not-found', 'The CRM customer was not found.')

  const finance = await getCrmBillingIntegration()
  const registry = await finance.customers.list(organizationId, {
    ids: [current.billingCustomerId],
    limit: 1,
  })
  if (registry.error)
    return fail(registry.error.code, registry.error.message)

  let customer = registry.data.data[0] ?? null
  if (customer?.customerType === 'EXTERNAL') {
    const shared = await updateExternalCustomer(
      finance,
      organizationId,
      current.billingCustomerId,
      params
    )
    if (shared.error)
      return fail(shared.error.code, shared.error.message)
    customer = shared.data
  }

  try {
    const profile = await prisma.customerProfile.update({
      where: { id: current.id },
      data: {
        ...(params.ownerId !== undefined ? { ownerId: params.ownerId } : {}),
        ...(params.status ? { status: params.status } : {}),
      },
    })
    return ok({ profile, customer })
  } catch {
    return fail('crm/customer-update-failed', 'The CRM customer could not be updated.')
  }
}
