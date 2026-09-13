import { prisma } from '@/db/client'

export interface CommercialTaxRateReference {
  id: string
  name: string
  rate: string
  inclusive: boolean
}

/**
 * Resolves selected tax rates once for a commercial document build so every
 * persisted line can snapshot the agreed tax identity without N+1 lookups.
 */
export async function resolveCommercialTaxRates(
  tenantId: string,
  taxRateIds: readonly string[]
): Promise<
  | { data: Map<string, CommercialTaxRateReference>; error: null }
  | { data: null; error: string }
> {
  const ids = [...new Set(taxRateIds)]
  if (ids.length === 0) return { data: new Map(), error: null }

  const rows = await prisma.taxRate.findMany({
    where: { tenantId, id: { in: ids }, isActive: true },
    select: { id: true, name: true, rate: true, inclusive: true },
  })
  if (rows.length !== ids.length)
    return {
      data: null,
      error: 'One or more selected tax rates were not found or are inactive.',
    }

  return {
    data: new Map(
      rows.map((row) => [
        row.id,
        {
          id: row.id,
          name: row.name,
          rate: row.rate.toString(),
          inclusive: row.inclusive,
        },
      ])
    ),
    error: null,
  }
}
