import type { ComponentProps } from 'react'
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
import { EstimatesList } from './estimates-list'

export async function EstimatesListData() {
  const context = await getWorkspaceContext()
  if (!context) return null

  // Fetch unfiltered because layout receives no searchParams.
  const estimates = await service.estimates.list(context.tenant.id)

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <EstimatesList
        estimates={
          estimates as unknown as ComponentProps<typeof EstimatesList>['estimates']
        }
        emptyState={
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ClipboardList />
              </EmptyMedia>
              <EmptyTitle>No estimates yet</EmptyTitle>
              <EmptyDescription>
                Create a customer and item, then prepare the first draft estimate.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
    </div>
  )
}
