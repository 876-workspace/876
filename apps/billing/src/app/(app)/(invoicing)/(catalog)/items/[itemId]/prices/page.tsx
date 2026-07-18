import { notFound } from 'next/navigation'

import { PricesTable } from '@/app/(app)/(subscription-management)/(catalog)/prices/prices-table'
import { resolveItem } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export default async function ItemPricesPage({
  params,
}: {
  params: Promise<{ itemId: string }>
}) {
  const { itemId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const [item, prices] = await Promise.all([
    resolveItem(context.tenant.id, itemId),
    service.prices.list(context.tenant.id, undefined, { itemId }),
  ])
  if (!item) notFound()

  return (
    <>
      {prices.length > 0 ? (
        <PricesTable prices={prices} />
      ) : (
        <div className="876-card text-muted-foreground p-8 text-center text-sm">
          This item has no prices yet.
        </div>
      )}
    </>
  )
}
