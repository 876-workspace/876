import Link from 'next/link'

import { ChevronRightIcon } from '@876/ui/icons'
import { Page, PageDescription, PageHeader, PageTitle } from '@876/ui/page'

import { AddonCreateForm } from '@/components/addon-create-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = { title: 'New Add-on' }

export default async function NewAddonPage() {
  const context = await requirePagePermission('catalog:write')
  const [products, plans, currencies] = await Promise.all([
    service.products.list(context.tenant.id, true),
    service.plans.list(context.tenant.id, true),
    service.currencies.list(context.tenant.id),
  ])

  return (
    <Page>
      <nav className="mb-5 flex items-center gap-1.5 text-sm">
        <Link
          href="/addons"
          className="text-muted-foreground hover:text-foreground"
        >
          Add-ons
        </Link>
        <ChevronRightIcon className="text-muted-foreground size-4" />
        <span className="font-medium">New Add-on</span>
      </nav>
      <PageHeader>
        <PageTitle>New Add-on</PageTitle>
        <PageDescription>
          Add an optional, recommended, or mandatory enhancement to compatible
          subscription plans.
        </PageDescription>
      </PageHeader>
      <AddonCreateForm
        products={products.map((product) => ({
          id: product.id,
          label: product.name,
        }))}
        plans={plans.map((plan) => ({
          id: plan.id,
          label: plan.name,
          productId: plan.productId,
          intervalUnit: plan.intervalUnit,
          intervalCount: plan.intervalCount,
        }))}
        currencies={currencies.map(({ currency }) => ({
          id: currency.code,
          label: `${currency.name} (${currency.code})`,
        }))}
      />
    </Page>
  )
}
