import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

import { getCustomerRow } from '../_lib/customers-data'
import { CustomerCardFrame } from './_components/customer-card-frame'
import { CustomerCardSkeleton } from './_components/customer-card-skeleton'

type Props = {
  children: ReactNode
  params: Promise<{ customerId: string }>
}

/**
 * The customer card's chrome. Awaits `params` and nothing else — the record is
 * resolved inside the Suspense boundary, so opening a customer never blocks in
 * the list's segment (see `.claude/rules/navigation-performance.md`).
 */
export default async function CustomerCardLayout({ children, params }: Props) {
  const { customerId } = await params

  return (
    <Suspense key={customerId} fallback={<CustomerCardSkeleton />}>
      <CustomerCardChrome customerId={customerId}>
        {children}
      </CustomerCardChrome>
    </Suspense>
  )
}

async function CustomerCardChrome({
  customerId,
  children,
}: {
  customerId: string
  children: ReactNode
}) {
  const customer = await getCustomerRow(customerId)
  // Resolved here rather than in the layout body: this is where the record is
  // actually known, and a client component could not call `notFound()`.
  if (!customer) notFound()

  return <CustomerCardFrame customer={customer}>{children}</CustomerCardFrame>
}
