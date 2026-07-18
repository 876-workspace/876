import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { InvoicePreferenceUpdateParams } from '@/types/invoice-preference'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

/** Updates workspace invoice defaults without modifying existing invoices. */
export async function update(
  tenantId: string,
  params: InvoicePreferenceUpdateParams
): ServiceResult<{ tenantId: string }> {
  try {
    const result = await prisma.invoicePreference.updateMany({
      where: { tenantId },
      data: {
        ...params,
        lateFeePercent:
          params.lateFeeCalculationType === 'PERCENTAGE'
            ? params.lateFeePercent
            : null,
        lateFeeAmount:
          params.lateFeeCalculationType === 'FIXED'
            ? params.lateFeeAmount
            : null,
        updatedAt: nowUnixSeconds(),
      },
    })
    if (result.count === 0)
      return err('Invoice preferences were not found.', 404)

    return ok({ tenantId })
  } catch (error) {
    console.error('[billing.service.invoice-preferences.update]', error)
    return err('Failed to update invoice preferences.', 500)
  }
}
