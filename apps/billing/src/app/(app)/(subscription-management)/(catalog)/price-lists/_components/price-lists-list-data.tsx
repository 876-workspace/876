import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { PriceListsList } from './price-lists-list'

/**
 * Data half of the list column. Rendered from the layout inside a Suspense
 * boundary, so the toolbar is interactive before this resolves.
 */
export async function PriceListsListData() {
  const context = await getWorkspaceContext()
  if (!context) return null

  const lists = await service.priceLists.list(context.tenant.id)

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PriceListsList lists={lists} />
    </div>
  )
}
