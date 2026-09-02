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
import { PricesList } from './prices-list'

export async function PricesListData() {
  const context = await getWorkspaceContext()
  if (!context) return null

  // Fetch unfiltered because layout receives no searchParams
  const prices = await service.prices.list(context.tenant.id, undefined)

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PricesList
        prices={prices}
        emptyState={
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CreditCardIcon />
              </EmptyMedia>
              <EmptyTitle>No prices yet</EmptyTitle>
              <EmptyDescription>
                Add a currency-specific price to an item or plan.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
    </div>
  )
}
