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
import { InvoicesList } from './invoices-list'
import type { ComponentProps } from 'react'

export async function InvoicesListData() {
  const context = await getWorkspaceContext()
  if (!context) return null

  const invoices = await service.invoices.list(context.tenant.id)

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <InvoicesList
        invoices={
          invoices as unknown as ComponentProps<typeof InvoicesList>['invoices']
        }
        emptyState={
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CreditCardIcon />
              </EmptyMedia>
              <EmptyTitle>No invoices yet</EmptyTitle>
              <EmptyDescription>
                Create a draft invoice from a customer and item. It will not
                send or collect payment automatically.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
    </div>
  )
}
