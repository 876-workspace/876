import Link from 'next/link'

import { ChevronRightIcon } from '@876/ui/icons'
import { Page, PageDescription, PageHeader, PageTitle } from '@876/ui/page'

import { PriceListCreateForm } from '@/components/price-list-create-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { formatMoney } from '@/lib/format'
import { service } from '@/lib/service'

export const metadata = { title: 'New Price List' }

export default async function NewPriceListPage() {
  const context = await requirePagePermission('catalog:write')
  const [prices, currencies] = await Promise.all([
    service.prices.list(context.tenant.id, true),
    service.currencies.list(context.tenant.id),
  ])
  return (
    <Page>
      <nav className="mb-5 flex items-center gap-1.5 text-sm">
        <Link
          href="/price-lists"
          className="text-muted-foreground hover:text-foreground"
        >
          Price Lists
        </Link>
        <ChevronRightIcon className="text-muted-foreground size-4" />
        <span className="font-medium">New Price List</span>
      </nav>
      <PageHeader>
        <PageTitle>New Price List</PageTitle>
        <PageDescription>
          Apply reusable markups, markdowns, foreign-currency rates, or custom
          catalog pricing without changing base prices.
        </PageDescription>
      </PageHeader>
      <PriceListCreateForm
        currencies={currencies.map(({ currency }) => ({
          id: currency.code,
          label: `${currency.name} (${currency.code})`,
        }))}
        prices={prices.map((price) => ({
          id: price.id,
          label: `${price.item?.name ?? price.plan?.name ?? price.addon?.name ?? price.nickname ?? price.id} — ${formatMoney(price.unitAmount, price.currency)}`,
        }))}
      />
    </Page>
  )
}
