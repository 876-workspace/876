import { notFound } from 'next/navigation'

import { PricesTable } from '@/app/(app)/(subscription-management)/(catalog)/prices/prices-table'
import { resolvePlan } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export default async function PlanPricesPage({
  params,
}: {
  params: Promise<{ planId: string }>
}) {
  const { planId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const [plan, prices] = await Promise.all([
    resolvePlan(context.tenant.id, planId),
    service.prices.list(context.tenant.id, undefined, { planId }),
  ])
  if (!plan) notFound()

  return (
    <>
      {prices.length > 0 ? (
        <PricesTable prices={prices} />
      ) : (
        <div className="876-card text-muted-foreground p-8 text-center text-sm">
          This plan has no prices yet.
        </div>
      )}
    </>
  )
}
