import { UsersIcon } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { toCustomerTableRows } from './customers-rows'
import { CustomersList } from './customers-list'

/**
 * Data half of the list column. Rendered from the layout inside a Suspense
 * boundary, so the toolbar is interactive before this resolves.
 */
export async function CustomersListData() {
  const context = await getWorkspaceContext()
  if (!context) return null

  const customers = await service.customers.list(context.tenant.id)

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <CustomersList
        customers={toCustomerTableRows(
          customers,
          context.tenant.defaultCurrency
        )}
        emptyState={
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UsersIcon />
              </EmptyMedia>
              <EmptyTitle>No customers yet</EmptyTitle>
              <EmptyDescription>
                Create a customer before preparing a quote, invoice, or
                subscription.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
    </div>
  )
}
