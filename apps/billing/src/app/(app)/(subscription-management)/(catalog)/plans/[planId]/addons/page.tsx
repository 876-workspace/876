import { notFound } from 'next/navigation'

import { Badge } from '@876/ui/badge'

import { resolvePlan } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'

export default async function PlanAddonsPage({
  params,
}: {
  params: Promise<{ planId: string }>
}) {
  const { planId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null
  const plan = await resolvePlan(context.tenant.id, planId)
  if (!plan) notFound()
  return (
    <div className="876-card divide-y overflow-hidden">
      {plan.addonAssociations.length ? (
        plan.addonAssociations.map((association) => (
          <div
            key={association.id}
            className="flex items-center gap-4 px-5 py-4"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{association.addon.name}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {association.addon.priceType.toLowerCase().replace('_', '-')}
              </p>
            </div>
            <Badge
              variant={
                association.associationType === 'MANDATORY'
                  ? 'warning'
                  : 'secondary'
              }
            >
              {association.associationType.toLowerCase()}
            </Badge>
          </div>
        ))
      ) : (
        <p className="text-muted-foreground p-5 text-sm">
          No add-ons are associated with this plan.
        </p>
      )}
    </div>
  )
}
