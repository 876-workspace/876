export function adjustRenewalAmount(
  amount: bigint | null,
  policy: 'RETAIN_EXISTING' | 'USE_LATEST' | 'MARKUP' | 'MARKDOWN',
  percentValue: string | null
): bigint | null {
  if (
    amount === null ||
    policy === 'RETAIN_EXISTING' ||
    policy === 'USE_LATEST'
  )
    return amount

  const [whole = '0', fraction = ''] = (percentValue ?? '0').split('.')
  const scaledPercent =
    BigInt(whole) * 10_000n + BigInt(`${fraction}0000`.slice(0, 4))
  const adjustment = (amount * scaledPercent + 500_000n) / 1_000_000n

  return policy === 'MARKUP'
    ? amount + adjustment
    : amount > adjustment
      ? amount - adjustment
      : 0n
}
