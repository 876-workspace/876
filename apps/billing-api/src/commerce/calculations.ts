import { parseDecimalToMinorUnits, PERCENT_SCALE } from '@876/core/money'

export type PricingModel = 'FLAT' | 'PER_UNIT' | 'PACKAGE' | 'VOLUME' | 'TIERED'

export type PriceTier = {
  fromUnit: number
  toUnit: number | null
  unitAmount: bigint | null
  flatAmount: bigint | null
}

function requiredAmount(value: bigint | null): bigint {
  if (value === null) throw new Error('Price amount is unavailable.')
  return value
}

/** Calculates a catalog price without accessing domain state or persistence. */
export function calculateCatalogAmount(options: {
  pricingModel: PricingModel
  unitAmount: bigint | null
  quantity: number
  packageSize?: number | null
  tiers?: readonly PriceTier[]
}): bigint {
  const { pricingModel, unitAmount, quantity } = options
  if (!Number.isInteger(quantity) || quantity <= 0)
    throw new Error('Quantity must be a positive integer.')
  if (pricingModel === 'FLAT') return requiredAmount(unitAmount)
  if (pricingModel === 'PER_UNIT')
    return requiredAmount(unitAmount) * BigInt(quantity)
  if (pricingModel === 'PACKAGE') {
    if (!options.packageSize) throw new Error('Package size is unavailable.')
    const packages = Math.ceil(quantity / options.packageSize)
    return requiredAmount(unitAmount) * BigInt(packages)
  }

  const tiers = [...(options.tiers ?? [])].sort(
    (left, right) => left.fromUnit - right.fromUnit
  )
  if (pricingModel === 'VOLUME') {
    const tier = tiers.find(
      ({ fromUnit, toUnit }) =>
        quantity >= fromUnit && (toUnit === null || quantity <= toUnit)
    )
    if (!tier) throw new Error('No volume tier covers this quantity.')
    return (
      requiredAmount(tier.unitAmount) * BigInt(quantity) +
      (tier.flatAmount ?? 0n)
    )
  }

  let total = 0n
  let coveredThrough = 0
  for (const tier of tiers) {
    if (quantity < tier.fromUnit) break
    const tierEnd = Math.min(quantity, tier.toUnit ?? quantity)
    const units = Math.max(tierEnd - tier.fromUnit + 1, 0)
    if (units > 0) {
      total +=
        requiredAmount(tier.unitAmount) * BigInt(units) +
        (tier.flatAmount ?? 0n)
      coveredThrough = Math.max(coveredThrough, tierEnd)
    }
  }
  if (coveredThrough < quantity)
    throw new Error('The tiered price does not cover this quantity.')
  return total
}

function divideRounded(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / 2n) / denominator
}

function roundMinorUnits(
  amount: bigint,
  rounding: 'NONE' | 'NEAREST' | 'UP' | 'DOWN',
  precision: number
): bigint {
  if (rounding === 'NONE' || precision >= 2) return amount
  const step = precision === 0 ? 100n : 10n
  const remainder = amount % step
  if (remainder === 0n) return amount
  if (rounding === 'DOWN') return amount - remainder
  if (rounding === 'UP') return amount + step - remainder
  return remainder * 2n >= step ? amount + step - remainder : amount - remainder
}

/** Applies a percentage price-list adjustment without converting the rate to a JS float. */
export function applyPercentageAdjustment(
  amount: bigint,
  direction: 'MARKUP' | 'MARKDOWN',
  percentage: string,
  rounding: 'NONE' | 'NEAREST' | 'UP' | 'DOWN' = 'NONE',
  roundingPrecision = 2
): bigint {
  const basisPoints = parseDecimalToMinorUnits(percentage, 2)
  if (basisPoints === null || basisPoints < 0n)
    throw new Error('Price-list percentage is invalid.')

  const numerator =
    direction === 'MARKUP'
      ? PERCENT_SCALE + basisPoints
      : PERCENT_SCALE - basisPoints
  const adjusted =
    numerator <= 0n ? 0n : divideRounded(amount * numerator, PERCENT_SCALE)
  return roundMinorUnits(adjusted, rounding, roundingPrecision)
}
