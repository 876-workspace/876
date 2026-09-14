import { toDocumentTaxRateOptions } from '@876/billing-ui/document/document-tax-rate-options'
import { DocumentFormPage } from '@876/billing-ui/document/document-form-layout'
import { DocumentCreateForm } from '@/features/documents/components/document-create-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { formatPriceCadence } from '@/lib/format'
import { service } from '@/lib/service'

export const metadata = { title: 'New Quote' }

export default async function NewQuotePage() {
  const context = await requirePagePermission('sales:write')

  const [items, prices, priceLists, currencies, taxRates] = await Promise.all([
    service.items.list(context.tenant.id),
    service.prices.list(context.tenant.id, true),
    service.priceLists.list(context.tenant.id, true),
    service.currencies.list(context.tenant.id),
    service.taxRates.list(context.tenant.id),
  ])

  return (
    <DocumentFormPage title="New Quote">
      <DocumentCreateForm
        kind="quote"
        taxRates={toDocumentTaxRateOptions(taxRates)}
        defaultCurrency={context.tenant.defaultCurrency}
        returnUrl="/quotes"
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
        currencies={currencies.map(({ currency }) => ({
          value: currency.code,
          label: `${currency.name} (${currency.code})`,
          decimalPlaces: currency.decimalPlaces,
        }))}
      />
    </DocumentFormPage>
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
