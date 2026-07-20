import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

/**
 * Unlinks a CORE_USER billing customer back to EXTERNAL, clearing the
 * account reference. Snapshot identity fields (name, email, …) are retained
 * as plain data. CORE_ORGANIZATION rows are provisioning-owned and are never
 * unlinked here. See `.claude/rules/customer-architecture.md`.
 */
export async function unlink(
  tenantId: string,
  customerId: string
): ServiceResult<{ id: string }> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
    select: { id: true, customerType: true },
  })
  if (!customer) return err('Customer not found.', 404)

  if (customer.customerType === 'EXTERNAL')
    return err('This customer is not linked to an 876 account.', 422)
  if (customer.customerType === 'CORE_ORGANIZATION')
    return err('Organization customers cannot be unlinked here.', 422)

  try {
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        customerType: 'EXTERNAL',
        userId: null,
        coreSyncedAt: null,
        updatedAt: nowUnixSeconds(),
      },
    })

    return ok({ id: customerId })
  } catch (error) {
    console.error('[billing.service.customers.unlink]', error)
    return err('Failed to unlink the customer.', 500)
  }
}
