import 'server-only'

import { randomUUID } from 'node:crypto'

import { getCrmBillingIntegration } from '@/lib/876/billing-integration'
import { prisma } from '@/lib/db'
import { createExternalCustomer } from '@/lib/finance/customers'
import { fail, ok, type ServiceResult } from '@/lib/service/result'
import type { CrmCustomer, CrmCustomerCreateInput } from '@/types/crm'

export async function create(
  organizationId: string,
  params: CrmCustomerCreateInput
): Promise<ServiceResult<CrmCustomer>> {
  const finance = await getCrmBillingIntegration()
  const shared = await createExternalCustomer(finance, organizationId, params)
  if (shared.error)
    return fail(shared.error.code, shared.error.message)

  try {
    const profile = await prisma.customerProfile.create({
      data: {
        id: `crm_cus_${randomUUID().replaceAll('-', '')}`,
        organizationId,
        billingCustomerId: shared.data.id,
        ownerId: params.ownerId ?? null,
      },
    })
    return ok({ profile, customer: shared.data })
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code === 'P2002')
      return fail('crm/customer-exists', 'This customer is already in CRM.')
    return fail('crm/customer-create-failed', 'The CRM customer could not be created.')
  }
}
