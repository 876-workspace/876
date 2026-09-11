import { Prisma } from '@/db/generated/prisma/client'

/**
 * The one annualising rule for recurring revenue. Both the dashboard
 * projection and the subscription summary share this SQL fragment and the
 * combiner below, so current MRR/ARR cannot drift between the two surfaces.
 *
 * Mirrors the historical dashboard annualisation exactly: DAY × 365, WEEK × 52,
 * MONTH × 12, YEAR × 1, all over the price interval count. Rows with a missing
 * unit amount or a missing/non-positive interval count are excluded by the
 * caller query, as is every non-recurring price.
 */
export function mrrAnnualSql(): Prisma.Sql {
  return Prisma.sql`
    CASE "price"."interval_unit"
      WHEN 'DAY'
        THEN (COALESCE("item"."unit_amount", "price"."unit_amount") * "item"."quantity" * 365) / "price"."interval_count"
      WHEN 'WEEK'
        THEN (COALESCE("item"."unit_amount", "price"."unit_amount") * "item"."quantity" * 52) / "price"."interval_count"
      WHEN 'MONTH'
        THEN (COALESCE("item"."unit_amount", "price"."unit_amount") * "item"."quantity" * 12) / "price"."interval_count"
      ELSE (COALESCE("item"."unit_amount", "price"."unit_amount") * "item"."quantity") / "price"."interval_count"
    END
  `
}

export type MrrRow = {
  currency: string
  annual: unknown
}

function toBigint(value: unknown): bigint {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number') return BigInt(Math.trunc(value))
  if (typeof value === 'string' && value.trim() !== '') {
    const [integer = '0'] = value.trim().split('.')
    return BigInt(integer === '' || integer === '-' ? '0' : integer)
  }
  return 0n
}

/**
 * Combines bounded per-currency annual-revenue rows into MRR/ARR money
 * strings. MRR is the annual figure divided by 12 with BigInt truncation,
 * matching the historical dashboard projection.
 */
export function combineMrrRows(rows: MrrRow[]): Array<{
  currency: string
  mrr: string
  arr: string
}> {
  const annual = new Map<string, bigint>()
  for (const row of rows) {
    const currency = row.currency.toUpperCase()
    annual.set(currency, (annual.get(currency) ?? 0n) + toBigint(row.annual))
  }

  return [...annual]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, arr]) => ({
      currency,
      mrr: (arr / 12n).toString(),
      arr: arr.toString(),
    }))
}
