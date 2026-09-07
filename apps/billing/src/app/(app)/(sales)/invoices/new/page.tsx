import { Page, PageHeader, PageTitle } from '@876/ui/page'

import { DocumentCreateForm } from '@/features/documents/components/document-create-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { formatPriceCadence } from '@/lib/format'
import { service } from '@/lib/service'

export const metadata = { title: 'New Invoice' }

export default async function NewInvoicePage() {
  const context = await requirePagePermission('sales:write')

  const [items, prices, priceLists, currencies, salespeople] =
    await Promise.all([
      service.items.list(context.tenant.id),
      service.prices.list(context.tenant.id, true),
      service.priceLists.list(context.tenant.id, true),
      service.currencies.list(context.tenant.id),
      service.salespeople.list(context.tenant.id),
    ])

  return (
    <Page>
      <PageHeader>
        <PageTitle>New Invoice</PageTitle>
      </PageHeader>

      <DocumentCreateForm
        kind="invoice"
        defaultCurrency={context.tenant.defaultCurrency}
        returnUrl="/invoices"
        items={[
          ...items.map((item) => ({
            value: `item:${item.id}`,
            label: item.name,
            itemId: item.id,
            priceId: null,
            defaultAmount: item.defaultSellingAmount?.toString() ?? null,
            currency: item.defaultSellingCurrency,
            trackStock: item.trackStock,
            stockQuantity: item.stockQuantity,
            allowOutOfStock: item.allowOutOfStock,
          })),
          ...prices.map((price) => ({
            value: `price:${price.id}`,
            label: `${priceOwnerName(price)} · ${formatPriceCadence(price)}`,
            itemId: price.itemId,
            priceId: price.id,
            defaultAmount:
              price.unitAmount?.toString() ??
              price.tiers[0]?.unitAmount?.toString() ??
              null,
            currency: price.currency,
            trackStock: price.item?.trackStock ?? false,
            stockQuantity: price.item?.stockQuantity ?? null,
            allowOutOfStock: price.item?.allowOutOfStock ?? false,
          })),
        ]}
        priceLists={priceLists.map((priceList) => ({
          value: priceList.id,
          label: priceList.name,
        }))}
        salespeople={salespeople
          .filter((salesperson) => salesperson.isActive)
          .map((salesperson) => ({
            value: salesperson.id,
            label: salesperson.name,
          }))}
        currencies={currencies.map(({ currency }) => ({
          value: currency.code,
          label: `${currency.name} (${currency.code})`,
          decimalPlaces: currency.decimalPlaces,
        }))}
      />
    </Page>
  )
}

function priceOwnerName(
  price: Awaited<ReturnType<typeof service.prices.list>>[number]
) {
  return (
    price.item?.name ??
    price.plan?.name ??
    price.addon?.name ??
    price.nickname ??
    'Catalog price'
  )
}
