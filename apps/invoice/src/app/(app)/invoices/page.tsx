import { redirect } from 'next/navigation'

import { get876Client } from '@/lib/876'
import { getInvoiceContext } from '@/lib/auth/context'

import { InvoicesTable } from './_components/invoices-table'
import { toInvoiceRow } from './_lib/invoice-row'

/**
 * The Billing workspace is provisioned asynchronously after the `876-invoice`
 * entitlement lands, so a missing workspace means "still provisioning" — never
 * "not subscribed", which the layout has already ruled out.
 */
const PROVISIONING_ERROR_CODES = new Set([
  'billing/tenant-not-found',
  'billing/unreachable',
])

export default async function InvoicesPage() {
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const $876 = await get876Client(context.orgId)
  const result = await $876.invoices.list()

  if (result.error) {
    const provisioning = PROVISIONING_ERROR_CODES.has(result.error.code)
    console.error('invoice.invoices.list_failed', {
      code: result.error.code,
      orgId: context.orgId,
    })

    return (
      <div className="space-y-4">
        <h1 className="876-page-title">Invoices</h1>
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium">
            {provisioning
              ? 'Setting up your Invoice workspace'
              : 'Invoices are unavailable right now'}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Please try again shortly.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="876-page-title">Invoices</h1>
      <InvoicesTable invoices={result.data.data.map(toInvoiceRow)} />
    </div>
  )
}
