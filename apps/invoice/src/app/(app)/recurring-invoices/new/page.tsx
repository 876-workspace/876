import { redirect } from 'next/navigation'
import { AppError } from '@876/ui/app-error'
import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

import { canAccess, resolveAccessContext } from '@/lib/auth/access-context'
import { getInvoiceContext } from '@/lib/auth/context'
import { getBilling } from '@/lib/clients/billing'
import { InvoiceRecurringInvoiceCreateForm } from '../_components/recurring-invoice-create-form'

export const metadata = { title: 'New Recurring Invoice' }

export default async function NewRecurringInvoicePage() {
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const access = await resolveAccessContext(context.userId, context.orgId)
  if (access.status !== 'ok' || !canAccess(access.context, 'invoices.create'))
    redirect('/no-access')

  const billing = await getBilling(context.orgId)
  const [customers, currencies, items, variants] = await Promise.all([
    billing.customers.list(),
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
  if (currencies.error) return unavailable(currencies.error.code)
  if (items.error) return unavailable(items.error.code)
  if (variants.error) return unavailable(variants.error.code)

  const currencyRows = currencies.data.data.filter((row) => row.isEnabled)
  const defaultCurrency =
    currencyRows.find((row) => row.isDefault)?.currency.code ??
    currencyRows[0]?.currency.code ??
    'JMD'

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

      <InvoiceRecurringInvoiceCreateForm
        customers={customers.data.data
          .filter((customer) => customer.status === 'ACTIVE')
          .map((customer) => ({ value: customer.id, label: customer.name }))}
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
