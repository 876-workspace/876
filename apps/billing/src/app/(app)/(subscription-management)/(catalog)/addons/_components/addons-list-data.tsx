import { CircleStackIcon } from '@876/ui/icons'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { AddonsList } from './addons-list'

export async function AddonsListData() {
  const context = await getWorkspaceContext()
  if (!context) return null

  // Fetch unfiltered because layout receives no searchParams
  const addons = await service.addons.list(context.tenant.id, undefined)

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <AddonsList
        addons={addons}
        emptyState={
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CircleStackIcon />
              </EmptyMedia>
              <EmptyTitle>No add-ons yet</EmptyTitle>
              <EmptyDescription>
                Add modular recurring or one-time services to your plans.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
    </div>
  )
}
