import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { CustomerTransactionsAccordions } from '@876/billing-ui/customer-transactions-accordions'
import { resolveUser } from '../_data'

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) return { title: 'Transactions' }
  const name =
    [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
  return { title: `${name} • Transactions - Users` }
}

/**
 * The same transaction sections Billing and Invoice show on a customer. The
 * user's ledger is not wired to Console yet, so every section renders its
 * real, empty shape rather than a placeholder sentence.
 */
export default async function UserTransactionsPage({ params }: Props) {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) notFound()

  return (
    <CustomerTransactionsAccordions
      entries={[]}
      currencyDecimals={{}}
      includeCreditNotes
    />
  )
}
