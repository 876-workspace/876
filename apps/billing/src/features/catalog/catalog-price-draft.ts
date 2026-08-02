export type PricingModel = 'FLAT' | 'PER_UNIT' | 'VOLUME' | 'TIERED' | 'PACKAGE'

export type TierDraft = {
  from: string
  to: string
  unit: string
  flat: string
}

export const INITIAL_TIER: TierDraft = {
  from: '1',
  to: '',
  unit: '',
  flat: '',
}

export function isTieredPricingModel(model: PricingModel) {
  return model === 'VOLUME' || model === 'TIERED'
}

export function parseMoney(value: string) {
  if (value.trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0
    ? String(Math.round(number * 100))
    : null
}

export function parseTierDrafts(tiers: TierDraft[]) {
  const parsed = tiers.map((tier) => ({
    fromUnit: Number(tier.from),
    toUnit: tier.to ? Number(tier.to) : null,
    unitAmount: tier.unit ? parseMoney(tier.unit) : null,
    flatAmount: tier.flat ? parseMoney(tier.flat) : null,
  }))
  const invalid = parsed.some(
    (tier) =>
      !Number.isInteger(tier.fromUnit) ||
      tier.fromUnit < 1 ||
      (tier.toUnit !== null &&
        (!Number.isInteger(tier.toUnit) || tier.toUnit < tier.fromUnit)) ||
      (tier.unitAmount === null && tier.flatAmount === null)
  )
  return invalid ? null : parsed
}
