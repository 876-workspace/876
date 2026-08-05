import type { MoneyAmount } from '@/types/customer'

/**
 * Render a money figure that arrived as a decimal string.
 *
 * The string is split and grouped by hand rather than parsed into a `Number` and
 * handed to `Intl.NumberFormat`. Going through a float is how `184200.00`
 * becomes something that is not `184200.00`, and these are figures on a
 * customer's account — see the decimal rule in
 * `.claude/rules/module-settings.md`.
 */
export function formatMoney(money: MoneyAmount): string {
  const negative = money.amount.startsWith('-')
  const bare = negative ? money.amount.slice(1) : money.amount
  const [whole = '0', fraction = ''] = bare.split('.')

  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const cents = fraction.padEnd(2, '0').slice(0, 2)

  // The sign belongs to the number, not to the currency code: `USD -4,200.00`.
  return `${money.currency} ${negative ? '-' : ''}${grouped}.${cents}`
}
