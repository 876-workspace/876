import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { VendorCreateParams } from '@/types/vendor'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'
import { hasEnabledCurrency, isUniqueConstraintError } from '../shared'

/** Creates an external or optionally core-linked Billing vendor. */
export async function create(
  tenantId: string,
  params: VendorCreateParams
): ServiceResult<{ id: string }> {
  const currency = params.currency ?? null
  if (currency && !(await hasEnabledCurrency(tenantId, currency)))
    return err('Enable the vendor currency before using it.', 422)

  try {
    const now = nowUnixSeconds()
    const vendor = await prisma.vendor.create({
      data: {
        id: generateId('Vendor'),
        tenantId,
        externalReference: params.externalReference ?? null,
        name: params.name,
        email: params.email ?? null,
        phone: params.phone ?? null,
        defaultCurrency: currency,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      },
    })

    return ok({ id: vendor.id })
  } catch (error) {
    if (isUniqueConstraintError(error))
      return err(
        'This core reference or external reference is already a vendor.',
        409
      )

    console.error('[billing.service.vendors.create]', error)
    return err('Failed to create the vendor.', 500)
  }
}
