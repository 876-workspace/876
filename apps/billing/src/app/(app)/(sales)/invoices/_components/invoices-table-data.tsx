import { CreditCardIcon } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { InvoicesTable } from '@/features/documents/components/invoices-table'

/** Data half of the persistent invoices list column. */
export async function InvoicesTableData() {
  const context = await getWorkspaceContext()
  if (!context) return null

  const invoices = await service.invoices.list(context.tenant.id)

  return (
    <InvoicesTable
      invoices={invoices}
      emptyState={
        <Empty className="py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CreditCardIcon />
            </EmptyMedia>
            <EmptyTitle>No invoices yet</EmptyTitle>
            <EmptyDescription>
              Create a draft invoice from a customer and item. It will not send
              or collect payment automatically.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  )
}
