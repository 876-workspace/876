import { notFound } from 'next/navigation'

import { AddonsTable } from '@/app/(app)/(subscription-management)/(catalog)/addons/addons-table'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export default async function ProductAddonsPage({
  params,
}: {
  params: Promise<{ productId: string }>
}) {
  const { productId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null
  const [product, addons] = await Promise.all([
    service.products.retrieve(context.tenant.id, productId),
    service.addons.list(context.tenant.id, undefined, productId),
  ])
  if (!product) notFound()
  return addons.length ? (
    <AddonsTable addons={addons} />
  ) : (
    <p className="text-muted-foreground text-sm">
      This product has no add-ons.
    </p>
  )
}
