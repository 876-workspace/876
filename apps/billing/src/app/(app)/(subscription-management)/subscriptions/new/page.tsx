import Link from 'next/link'
import { ChevronRightIcon } from '@876/ui/icons'
import { Page, PageDescription, PageHeader, PageTitle } from '@876/ui/page'

import { SubscriptionCreateForm } from '@/components/subscription-create-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = { title: 'New Subscription' }

interface Props {
  searchParams: Promise<{ customerId?: string }>
}

export default async function NewSubscriptionPage({ searchParams }: Props) {
  const { customerId } = await searchParams
  const context = await requirePagePermission('subscriptions:write')

  const [customers, prices] = await Promise.all([
    service.customers.list(context.tenant.id),
    service.prices.list(context.tenant.id),
  ])
  const recurringPrices = prices.filter(
    (price) =>
      price.isActive &&
      price.priceType === 'RECURRING' &&
      price.unitAmount !== null &&
      price.intervalUnit !== null &&
      price.intervalCount !== null
  )
  const initialCustomerId = customers.some(
    (customer) => customer.id === customerId
  )
    ? customerId
    : undefined

  return (
    <Page>
      <nav className="mb-5 flex items-center gap-1.5 text-sm">
        <Link
          href="/subscriptions"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Subscriptions
        </Link>
        <ChevronRightIcon className="text-muted-foreground size-4" />
        <span className="font-medium">New Subscription</span>
      </nav>

      <PageHeader>
        <PageTitle>New Subscription</PageTitle>
        <PageDescription>
          Create a commercial agreement from a recurring price. This does not
          create a payment, invoice, or 876 entitlement.
        </PageDescription>
      </PageHeader>

      <SubscriptionCreateForm
        returnUrl={
          initialCustomerId
            ? `/customers/${initialCustomerId}`
            : '/subscriptions'
        }
        initialCustomerId={initialCustomerId}
        customers={customers.map((customer) => ({
          value: customer.id,
          label: customer.name,
        }))}
        prices={recurringPrices.map((price) => ({
          value: price.id,
          label: `${price.item?.name ?? price.plan?.name ?? 'Price'} · ${price.currency}`,
        }))}
      />
    </Page>
  )
}
