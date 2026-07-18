import { PageBreadcrumb } from '@876/ui/page'

import { SubscriptionBulkInvoiceForm } from '@/components/subscription-bulk-invoice-form'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { buildSubscriptionTableRows } from '@/lib/subscriptions/view'

export const metadata = { title: 'Bulk subscription invoice preferences' }

export default async function BulkInvoicePreferencePage() {
  const context = await requirePagePermission('subscriptions:write')
  const subscriptions = await service.subscriptions.list(context.tenant.id)
  const rows = buildSubscriptionTableRows(subscriptions)

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageBreadcrumb href="/subscriptions" label="Subscriptions" />
      <div>
        <h1 className="876-page-title">Bulk invoice preferences</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Choose whether renewal invoices inherit the workspace default,
          finalize automatically, or remain drafts for review.
        </p>
      </div>
      <SubscriptionBulkInvoiceForm
        subscriptions={subscriptions.map((subscription) => {
          const row = rows.find((entry) => entry.id === subscription.id)
          return {
            id: subscription.id,
            label: `${row?.customer.name ?? 'Customer'} · ${row?.offering.planName ?? row?.offering.productName ?? subscription.id}`,
            invoiceMode:
              subscription.invoiceModeOverride === 'DRAFT'
                ? 'Draft override'
                : subscription.invoiceModeOverride === 'AUTO_FINALIZE'
                  ? 'Auto-finalize override'
                  : 'Workspace default',
          }
        })}
      />
    </div>
  )
}
