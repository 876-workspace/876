import { formatMoney } from '@/lib/format'

/**
 * Console's money policy for the shared finance tables.
 *
 * Billing serializes amounts as minor-unit decimal strings; the `bigint` arm
 * exists because the shared row types also accept the Prisma shape the product
 * apps hold, and one formatter has to satisfy both.
 */
export function formatBillingAmount(
  amount: bigint | string | null,
  currency: string
): string {
  return formatMoney(
    typeof amount === 'bigint' ? amount.toString() : amount,
    currency
  )
}
