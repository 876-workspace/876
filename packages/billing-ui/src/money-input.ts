import { formatMinorUnits, parseDecimalToMinorUnits } from '@876/core/money'

export function minorAmountInputStep(decimalPlaces: number): string {
  return decimalPlaces === 0 ? '1' : `0.${'0'.repeat(decimalPlaces - 1)}1`
}

export function zeroMinorAmountInput(decimalPlaces: number): string {
  return decimalPlaces === 0 ? '0' : `0.${'0'.repeat(decimalPlaces)}`
}

export function formatMinorAmountInput(
  amount: bigint | string,
  decimalPlaces: number
): string {
  return formatMinorUnits(
    typeof amount === 'bigint' ? amount : BigInt(amount),
    decimalPlaces
  )
}

export function parseMinorAmountInput(
  value: string,
  decimalPlaces: number,
  allowZero = false
): string | null {
  const normalized = value.trim()
  if (!normalized) return allowZero ? '0' : null

  const amount = parseDecimalToMinorUnits(normalized, decimalPlaces)
  if (amount === null || amount < 0n || (!allowZero && amount === 0n))
    return null

  return amount.toString()
}

export function unixTimestampToDateInput(timestamp: number): string {
  return new Date(Math.floor(timestamp) * 1000).toISOString().slice(0, 10)
}
