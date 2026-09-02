export const metadata = {
  title: 'Banking',
  description: 'Manual financial accounts and transaction balances.',
}

/**
 * The list-only state. The toolbar and the account list live in the layout, so
 * this route renders nothing of its own — it simply leaves the card slot
 * empty, which is what collapses the second grid column.
 */
export default function BankingPage() {
  return null
}
