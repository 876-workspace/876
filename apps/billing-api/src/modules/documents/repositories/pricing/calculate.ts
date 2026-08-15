type Tier = {
  fromUnit: number
  toUnit: number | null
  unitAmount: bigint | null
  flatAmount?: bigint | null
}

type PriceTerms = {
  pricingModel?: 'FLAT' | 'PER_UNIT' | 'VOLUME' | 'TIERED' | 'PACKAGE'
  unitAmount: bigint | null
  packageSize: number | null
  tiers?: readonly Tier[]
}

/** Calculates a catalog charge in minor units without floating-point money. */
export function calculateCatalogAmount(
  price: PriceTerms,
  quantity: number
): bigint {
  if (!Number.isInteger(quantity) || quantity <= 0)
    throw new Error('Quantity must be a positive integer.')

  const pricingModel = price.pricingModel ?? 'PER_UNIT'
  if (pricingModel === 'FLAT') return requiredAmount(price.unitAmount)
  if (pricingModel === 'PER_UNIT')
    return requiredAmount(price.unitAmount) * BigInt(quantity)
  if (pricingModel === 'PACKAGE') {
    const packageSize = price.packageSize
    if (!packageSize) throw new Error('Package size is unavailable.')
    const packages = Math.ceil(quantity / packageSize)
    return requiredAmount(price.unitAmount) * BigInt(packages)
  }

  const tiers = [...(price.tiers ?? [])].sort(
    (left, right) => left.fromUnit - right.fromUnit
  )
  if (pricingModel === 'VOLUME') {
    const tier = tiers.find(
      (entry) =>
        quantity >= entry.fromUnit &&
        (entry.toUnit === null || quantity <= entry.toUnit)
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
    if (units === 0) continue
    total +=
      requiredAmount(tier.unitAmount) * BigInt(units) + (tier.flatAmount ?? 0n)
    coveredThrough = Math.max(coveredThrough, tierEnd)
  }
  if (coveredThrough < quantity)
    throw new Error('The tiered price does not cover this quantity.')
  return total
}

export function applyPercentageAdjustment(
  amount: bigint,
  direction: 'MARKUP' | 'MARKDOWN',
  percentage: number,
  rounding: 'NONE' | 'NEAREST' | 'UP' | 'DOWN' = 'NONE',
  roundingPrecision = 2
): bigint {
  const scale = 10_000n
  const hundred = 100n * scale
  const adjustment = BigInt(Math.round(percentage * Number(scale)))
  const numerator =
    direction === 'MARKUP' ? hundred + adjustment : hundred - adjustment
  const adjusted =
    numerator <= 0n ? 0n : divideRounded(amount * numerator, hundred)
  return roundMinorUnits(adjusted, rounding, roundingPrecision)
}

function requiredAmount(amount: bigint | null): bigint {
  if (amount === null) throw new Error('Price amount is unavailable.')
  return amount
}

function divideRounded(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / 2n) / denominator
}

function roundMinorUnits(
  amount: bigint,
  rounding: 'NONE' | 'NEAREST' | 'UP' | 'DOWN',
  precision: number
) {
  if (rounding === 'NONE' || precision >= 2) return amount
  const step = precision === 0 ? 100n : 10n
  const remainder = amount % step
  if (remainder === 0n) return amount
  if (rounding === 'DOWN') return amount - remainder
  if (rounding === 'UP') return amount + step - remainder
  return remainder * 2n >= step ? amount + step - remainder : amount - remainder
}
