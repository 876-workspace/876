import { notFound } from 'next/navigation'

import { PlansTable } from '@/app/(app)/(subscription-management)/(catalog)/plans/plans-table'
import { resolveProduct } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export default async function ProductPlansPage({
  params,
}: {
  params: Promise<{ productId: string }>
}) {
  const { productId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const [product, plans] = await Promise.all([
    resolveProduct(context.tenant.id, productId),
    service.plans.list(context.tenant.id, undefined, productId),
  ])
  if (!product) notFound()

  return (
    <>
      {plans.length > 0 ? (
        <PlansTable plans={plans} />
      ) : (
        <div className="876-card text-muted-foreground p-8 text-center text-sm">
          This product has no plans yet.
        </div>
      )}
    </>
  )
}
