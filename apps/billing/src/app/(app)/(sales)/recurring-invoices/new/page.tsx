import { AppError } from '@876/ui/app-error'
import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

import { requirePagePermission } from '@/lib/auth/billing-context'
import { getBilling } from '@/lib/services/billing'
import { BillingRecurringInvoiceCreateForm } from '../_components/recurring-invoice-create-form'

export const metadata = { title: 'New Recurring Invoice' }

export default async function NewRecurringInvoicePage() {
  const context = await requirePagePermission('sales:write')
  const billing = await getBilling()

  const [customers, terms, currencies, items, variants] = await Promise.all([
    billing.customers.list(),
    billing.paymentTerms.list(),
    billing.currencies.list(),
    billing.items.list({ active: true, limit: 100 }),
    billing.items.searchVariants({ active: true, limit: 100 }),
  ])

  const unavailable = (code: string) => (
    <Page>
      <AppError
        error={{
          code,
          message: 'Recurring invoice entry data is unavailable right now.',
        }}
      />
    </Page>
  )
  if (customers.error) return unavailable(customers.error.code)
  if (terms.error) return unavailable(terms.error.code)
  if (currencies.error) return unavailable(currencies.error.code)
  if (items.error) return unavailable(items.error.code)
  if (variants.error) return unavailable(variants.error.code)

  const currencyRows = currencies.data.data.filter((row) => row.isEnabled)
  const defaultCurrency =
    currencyRows.find(
      (row) => row.currency.code === context.tenant.defaultCurrency
    )?.currency.code ??
    currencyRows.find((row) => row.isDefault)?.currency.code ??
    currencyRows[0]?.currency.code ??
    context.tenant.defaultCurrency

  return (
    <Page>
      <PageBreadcrumb
        href="/recurring-invoices"
        label="Recurring Invoices"
        className="mb-4"
      />
      <PageHeader className="mb-8">
        <PageTitle>New recurring invoice</PageTitle>
      </PageHeader>

      <BillingRecurringInvoiceCreateForm
        customers={customers.data.data
          .filter((customer) => customer.status === 'ACTIVE')
          .map((customer) => ({ value: customer.id, label: customer.name }))}
        paymentTerms={terms.data.data.map((term) => ({
          value: term.id,
          label: term.name,
        }))}
        currencies={currencyRows.map(({ currency }) => ({
          value: currency.code,
          label: `${currency.name} (${currency.code})`,
          decimalPlaces: currency.decimalPlaces,
        }))}
        items={items.data.data.map((item) => ({
          value: `item:${item.id}`,
          label: item.name,
          itemId: item.id,
          defaultAmount: item.defaultSellingAmount,
          currency: item.defaultSellingCurrency,
          trackStock: item.trackStock,
          stockQuantity: item.stockQuantity,
          allowOutOfStock: item.allowOutOfStock,
          variants:
            item.variantMode === 'variant'
              ? variants.data.data
                  .filter((variant) => variant.itemId === item.id)
                  .map((variant) => ({
                    id: variant.id,
                    label: variant.name,
                    sku: variant.sku,
                    defaultAmount: variant.defaultSellingAmount,
                    currency: variant.defaultSellingCurrency,
                    trackStock: item.trackStock,
                    stockQuantity: variant.stockQuantity,
                    allowOutOfStock: item.allowOutOfStock,
                  }))
              : undefined,
        }))}
        defaultCurrency={defaultCurrency}
      />
    </Page>
  )
}
