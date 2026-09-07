import { parseDecimalToMinorUnits, PERCENT_SCALE } from '@876/core/money'

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
    numerator <= 0n
      ? 0n
      : divideRounded(amount * numerator, PERCENT_SCALE)
  return roundMinorUnits(adjusted, rounding, roundingPrecision)
}
