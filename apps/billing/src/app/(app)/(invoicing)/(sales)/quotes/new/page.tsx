import Link from 'next/link'
import { ChevronRightIcon } from '@876/ui/icons'
import { Page, PageDescription, PageHeader, PageTitle } from '@876/ui/page'

import { DocumentCreateForm } from '@/components/document-create-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { toDocumentCustomerOption } from '@/lib/customers/document-recipient'
import { formatPriceCadence } from '@/lib/format'
import { service } from '@/lib/service'

export const metadata = { title: 'New Quote' }

export default async function NewQuotePage() {
  const context = await requirePagePermission('sales:write')

  const [customers, items, prices, priceLists, currencies] = await Promise.all([
    service.customers.listDocumentRecipients(context.tenant.id),
    service.items.list(context.tenant.id),
    service.prices.list(context.tenant.id, true),
    service.priceLists.list(context.tenant.id, true),
    service.currencies.list(context.tenant.id),
  ])

  return (
    <Page>
      <nav className="mb-5 flex items-center gap-1.5 text-sm">
        <Link
          href="/quotes"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Quotes
        </Link>
        <ChevronRightIcon className="text-muted-foreground size-4" />
        <span className="font-medium">New Quote</span>
      </nav>

      <PageHeader>
        <PageTitle>New Quote</PageTitle>
        <PageDescription>
          Prepare an itemized proposal for the customer to review before it
          becomes an invoice.
        </PageDescription>
      </PageHeader>

      <DocumentCreateForm
        kind="quote"
        defaultCurrency={context.tenant.defaultCurrency}
        returnUrl="/quotes"
        customers={customers.map(toDocumentCustomerOption)}
        items={[
          ...items.map((item) => ({
            value: `item:${item.id}`,
            label: item.name,
            itemId: item.id,
            priceId: null,
            defaultAmount: item.defaultSellingAmount?.toString() ?? null,
            currency: item.defaultSellingCurrency,
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
