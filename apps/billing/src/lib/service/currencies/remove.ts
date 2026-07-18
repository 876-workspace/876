import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'
import { err, ok } from '../result'

/** Removes a currency from the tenant (disables it). */
export async function remove(
  tenantId: string,
  code: string
): ServiceResult<void> {
  const currencyCode = code.toUpperCase()

  const tenantCurrency = await prisma.tenantCurrency.findUnique({
    where: { tenantId_currencyCode: { tenantId, currencyCode } },
  })

  if (!tenantCurrency) return err('Currency not found.', 404)
  if (tenantCurrency.isDefault)
    return err('Cannot delete the default base currency.', 400)

  await prisma.tenantCurrency.delete({
    where: { tenantId_currencyCode: { tenantId, currencyCode } },
  })

  return ok(undefined)
}
