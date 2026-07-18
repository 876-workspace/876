import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { CurrencyUpdateParams } from '@/types/currency'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

/** Updates a global currency (which is shared but in this context managed by tenants). */
export async function update(
  tenantId: string, // tenantId is passed to verify they have access to it, though strictly they could edit any currency they enabled
  code: string,
  params: CurrencyUpdateParams
): ServiceResult<{ currency: string }> {
  const currencyCode = code.toUpperCase()

  const tenantCurrency = await prisma.tenantCurrency.findUnique({
    where: { tenantId_currencyCode: { tenantId, currencyCode } },
  })

  if (!tenantCurrency) return err('Currency not found.', 404)

  const now = nowUnixSeconds()

  const currency = await prisma.currency.update({
    where: { code: currencyCode },
    data: {
      name: params.name,
      symbol: params.symbol,
      decimalPlaces: params.decimalPlaces,
      updatedAt: now,
    },
  })

  return ok({ currency: currency.code })
}
