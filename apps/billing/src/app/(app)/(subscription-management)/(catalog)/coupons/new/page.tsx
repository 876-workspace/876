import Link from 'next/link'

import { ChevronRightIcon } from '@876/ui/icons'
import { Page, PageDescription, PageHeader, PageTitle } from '@876/ui/page'

import { CatalogCouponCreateForm } from '@/components/coupon-create-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export const metadata = { title: 'New Coupon' }

export default async function NewCouponPage() {
  const context = await requirePagePermission('subscriptions:write')
  const [products, plans, addons, customers, currencies] = await Promise.all([
    service.products.list(context.tenant.id, true),
    service.plans.list(context.tenant.id, true),
    service.addons.list(context.tenant.id, true),
    service.customers.list(context.tenant.id, 'ACTIVE'),
    service.currencies.list(context.tenant.id),
  ])
  return (
    <Page>
      <nav className="mb-5 flex items-center gap-1.5 text-sm">
        <Link
          href="/coupons"
          className="text-muted-foreground hover:text-foreground"
        >
          Coupons
        </Link>
        <ChevronRightIcon className="text-muted-foreground size-4" />
        <span className="font-medium">New Coupon</span>
      </nav>
      <PageHeader>
        <PageTitle>New Coupon</PageTitle>
        <PageDescription>
          Configure targeted, limited, and auditable subscription discounts.
        </PageDescription>
      </PageHeader>
      <CatalogCouponCreateForm
        products={products.map((product) => ({
          id: product.id,
          label: product.name,
        }))}
        plans={plans.map((plan) => ({
          id: plan.id,
          label: plan.name,
          productId: plan.productId,
        }))}
        addons={addons.map((addon) => ({
          id: addon.id,
          label: addon.name,
          productId: addon.productId,
          priceType: addon.priceType,
        }))}
        customers={customers.map((customer) => ({
          id: customer.id,
          label: customer.name,
        }))}
        currencies={currencies.map(({ currency }) => ({
          id: currency.code,
          label: `${currency.name} (${currency.code})`,
        }))}
      />
    </Page>
  )
}
