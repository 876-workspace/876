import Link from 'next/link'
import { ChevronRightIcon } from '@876/ui/icons'
import { Page, PageDescription, PageHeader, PageTitle } from '@876/ui/page'

import { PriceCreateForm } from '@/components/price-create-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = { title: 'New Price' }

export default async function NewPricePage() {
  const context = await requirePagePermission('catalog:write')

  const [items, plans, addons, currencies] = await Promise.all([
    service.items.list(context.tenant.id),
    service.plans.list(context.tenant.id),
    service.addons.list(context.tenant.id),
    service.currencies.list(context.tenant.id),
  ])

  return (
    <Page>
      <nav className="mb-5 flex items-center gap-1.5 text-sm">
        <Link
          href="/prices"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Prices
        </Link>
        <ChevronRightIcon className="text-muted-foreground size-4" />
        <span className="font-medium">New Price</span>
      </nav>

      <PageHeader>
        <PageTitle>New Price</PageTitle>
        <PageDescription>
          Prices are immutable records. Create a new price rather than changing
          an amount used by a subscriber.
        </PageDescription>
      </PageHeader>

      <PriceCreateForm
        returnUrl="/prices"
        currencies={currencies.map(({ currency }) => ({
          id: currency.code,
          label: `${currency.name} (${currency.code})`,
        }))}
        items={items.map((item) => ({ id: item.id, label: item.name }))}
        plans={plans.map((plan) => ({
          id: plan.id,
          label: `${plan.product.name} — ${plan.name}`,
          priceType: 'RECURRING' as const,
          intervalUnit: plan.intervalUnit,
          intervalCount: plan.intervalCount,
        }))}
        addons={addons.map((addon) => ({
          id: addon.id,
          label: `${addon.product.name} — ${addon.name}`,
          priceType: addon.priceType,
          intervalUnit: addon.intervalUnit,
          intervalCount: addon.intervalCount,
        }))}
      />
    </Page>
  )
}
