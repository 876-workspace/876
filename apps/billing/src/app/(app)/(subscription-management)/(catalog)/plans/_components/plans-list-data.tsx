import { ClipboardList } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { PlansList } from './plans-list'

export async function PlansListData() {
  const context = await getWorkspaceContext()
  if (!context) return null

  // Fetch unfiltered because layout receives no searchParams
  const plans = await service.plans.list(context.tenant.id, undefined)

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PlansList
        plans={plans}
        emptyState={
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ClipboardList />
              </EmptyMedia>
              <EmptyTitle>No plans yet</EmptyTitle>
              <EmptyDescription>
                Create a product first, then add the plan cadence that customers
                can subscribe to.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
    </div>
  )
}
