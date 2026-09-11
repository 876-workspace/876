import { AppError } from '@876/ui/app-error'
import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'

import { requirePagePermission } from '@/lib/auth/billing-context'
import { getBilling } from '@/lib/services/billing'
import { BillingSalesReceiptCreateForm } from '../_components/sales-receipt-create-form'

export const metadata = { title: 'New Sales Receipt' }

export default async function NewSalesReceiptPage() {
  const context = await requirePagePermission('sales:write')
  const billing = await getBilling()

  const [customers, accounts, modes, currencies, items, variants] =
    await Promise.all([
      billing.customers.list(),
      billing.bankAccounts.list(),
      billing.paymentModes.list(),
      billing.currencies.list(),
      billing.items.list({ active: true, limit: 100 }),
      billing.items.searchVariants({ active: true, limit: 100 }),
    ])

  const unavailable = (code: string) => (
    <Page>
      <AppError
        error={{
          code,
          message: 'Sales receipt entry data is unavailable right now.',
        }}
      />
    </Page>
  )
  if (customers.error) return unavailable(customers.error.code)
  if (accounts.error) return unavailable(accounts.error.code)
  if (modes.error) return unavailable(modes.error.code)
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
        href="/sales-receipts"
        label="Sales Receipts"
        className="mb-4"
      />
      <PageHeader className="mb-8">
        <PageTitle>New sales receipt</PageTitle>
      </PageHeader>

      <BillingSalesReceiptCreateForm
        customers={customers.data.data
          .filter((customer) => customer.status === 'ACTIVE')
          .map((customer) => ({ value: customer.id, label: customer.name }))}
        accounts={accounts.data.data
          .filter((account) => account.isActive)
          .map((account) => ({
            value: account.id,
            label: `${account.name} (${account.currency})`,
            currency: account.currency,
          }))}
        modes={modes.data.data
          .filter((mode) => mode.isActive)
          .map((mode) => ({ value: mode.id, label: mode.name }))}
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
