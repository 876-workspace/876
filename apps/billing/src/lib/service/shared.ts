import { prisma } from '@/lib/db'

/** Checks whether a tenant has enabled a supported transaction currency. */
export async function hasEnabledCurrency(
  tenantId: string,
  currency: string
): Promise<boolean> {
  const tenantCurrency = await prisma.tenantCurrency.findFirst({
    where: {
      tenantId,
      currencyCode: currency,
      isEnabled: true,
      currency: { isActive: true },
    },
    select: { tenantId: true },
  })

  return tenantCurrency !== null
}

/** Detects an expected database uniqueness conflict without exposing internals. */
export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  )
}
