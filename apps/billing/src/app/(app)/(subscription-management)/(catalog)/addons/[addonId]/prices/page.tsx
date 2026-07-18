import { notFound } from 'next/navigation'

import { PricesTable } from '@/app/(app)/(subscription-management)/(catalog)/prices/prices-table'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export default async function AddonPricesPage({
  params,
}: {
  params: Promise<{ addonId: string }>
}) {
  const { addonId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null
  const [addon, prices] = await Promise.all([
    service.addons.retrieve(context.tenant.id, addonId),
    service.prices.list(context.tenant.id, undefined, { addonId }),
  ])
  if (!addon) notFound()
  return prices.length ? (
    <PricesTable prices={prices} />
  ) : (
    <p className="text-muted-foreground text-sm">No prices for this add-on.</p>
  )
}
