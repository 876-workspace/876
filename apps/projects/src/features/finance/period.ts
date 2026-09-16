/**
 * Finance period resolution for `?from&to` (unix seconds).
 *
 * The overview accepts an explicit period and falls back to the current UTC
 * calendar month. Invalid input never throws — it falls back to the default.
 */

export type FinancePeriod = { from: number; to: number }

export function currentMonthPeriod(nowSeconds?: number): FinancePeriod {
  const now = new Date((nowSeconds ?? Date.now() / 1000) * 1000)
  const from = Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000
  )
  const to = Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) / 1000
  )
  return { from, to }
}

export function parsePeriodQuery(query: {
  from?: string
  to?: string
}): FinancePeriod | null {
  if (query.from === undefined || query.to === undefined) return null
  const from = Number(query.from)
  const to = Number(query.to)
  if (!Number.isInteger(from) || !Number.isInteger(to)) return null
  if (from < 0 || to <= from) return null
  return { from, to }
}

export function resolvePeriod(
  query: { from?: string; to?: string },
  nowSeconds?: number
): FinancePeriod {
  return parsePeriodQuery(query) ?? currentMonthPeriod(nowSeconds)
}
