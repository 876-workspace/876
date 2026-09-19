import { notFound } from 'next/navigation'
import { AppError } from '@876/ui/app-error'
import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'
import type { RecurringInvoiceFormInitial } from '@876/billing-ui/recurring-invoice-form'

import { requirePagePermission } from '@/lib/auth/billing-context'
import { getBilling } from '@/lib/clients/billing'
import { BillingRecurringInvoiceEditForm } from '../../_components/recurring-invoice-edit-form'

type Props = { params: Promise<{ recurringInvoiceId: string }> }

export const metadata = { title: 'Edit Recurring Invoice' }

export default async function EditRecurringInvoicePage({ params }: Props) {
  const { recurringInvoiceId } = await params
  const context = await requirePagePermission('sales:write')
  const billing = await getBilling()

  const [profile, customers, terms, currencies, items, variants] =
    await Promise.all([
      billing.recurringInvoices.retrieve(recurringInvoiceId),
      billing.customers.list(),
      billing.paymentTerms.list(),
      billing.currencies.list(),
      billing.items.list({ active: true, limit: 100 }),
      billing.items.searchVariants({ active: true, limit: 100 }),
    ])

  if (profile.error) {
    if (profile.error.code === 'billing/recurring-invoice-not-found')
      notFound()
    return (
      <Page>
        <AppError
          error={{
            code: profile.error.code,
            message: 'Recurring invoice details are unavailable right now.',
          }}
        />
      </Page>
    )
  }

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

  const record = profile.data as unknown as Record<string, unknown>
  const frequency = record.frequency as
    | { intervalUnit?: unknown; intervalCount?: unknown }
    | undefined
  const initial: RecurringInvoiceFormInitial = {
    profileName: String(record.profileName ?? ''),
    customerId: String(record.customerId ?? ''),
    currency: String(record.currency ?? context.tenant.defaultCurrency),
    intervalUnit: String(frequency?.intervalUnit ?? 'month'),
    intervalCount:
      typeof frequency?.intervalCount === 'number'
        ? frequency.intervalCount
        : 1,
    startAt: typeof record.startAt === 'number' ? record.startAt : 0,
    endAt: typeof record.endAt === 'number' ? record.endAt : null,
    maxCycles: typeof record.maxCycles === 'number' ? record.maxCycles : null,
    generationMode:
      record.generationMode === 'finalize' ||
      record.generationMode === 'finalize-and-send'
        ? record.generationMode
        : 'draft',
    paymentTermId:
      typeof record.paymentTermId === 'string' ? record.paymentTermId : null,
    notes: typeof record.notes === 'string' ? record.notes : null,
    terms: typeof record.terms === 'string' ? record.terms : null,
    lines: (Array.isArray(record.lines) ? record.lines : []).map((entry) => {
      const line = entry as Record<string, unknown>
      return {
        itemId: typeof line.itemId === 'string' ? line.itemId : null,
        variantId: typeof line.variantId === 'string' ? line.variantId : null,
        priceId: typeof line.priceId === 'string' ? line.priceId : null,
        description:
          typeof line.description === 'string' ? line.description : null,
        quantity: typeof line.quantity === 'number' ? line.quantity : 1,
        unitAmount:
          typeof line.unitAmount === 'string' ? line.unitAmount : null,
        taxAmount: typeof line.taxAmount === 'string' ? line.taxAmount : '0',
        discountAmount:
          typeof line.discountAmount === 'string' ? line.discountAmount : '0',
      }
    }),
  }

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
        href={`/recurring-invoices/${recurringInvoiceId}`}
        label="Recurring Invoice"
        className="mb-4"
      />
      <PageHeader className="mb-8">
        <PageTitle>Edit recurring invoice</PageTitle>
      </PageHeader>

      <BillingRecurringInvoiceEditForm
        recurringInvoiceId={recurringInvoiceId}
        initial={initial}
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
