import { notFound } from 'next/navigation'

import { Badge } from '@876/ui/badge'

import { AddonAssociationManager } from '@/components/addon-association-manager'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { service } from '@/lib/service'

export default async function AddonPlansPage({
  params,
}: {
  params: Promise<{ addonId: string }>
}) {
  const { addonId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null
  const addon = await service.addons.retrieve(context.tenant.id, addonId)
  if (!addon) notFound()
  const plans = await service.plans.list(
    context.tenant.id,
    true,
    addon.productId
  )
  const compatiblePlans = plans.filter(
    (plan) =>
      addon.priceType === 'ONE_TIME' ||
      (plan.intervalUnit === addon.intervalUnit &&
        plan.intervalCount === addon.intervalCount)
  )
  if (context.permissions.includes('catalog:write'))
    return (
      <AddonAssociationManager
        addonId={addon.id}
        plans={compatiblePlans.map((plan) => ({
          id: plan.id,
          name: plan.name,
        }))}
        associations={addon.planAssociations.map((association) => ({
          planId: association.planId,
          enabled: association.isActive,
          associationType: association.associationType,
          events: association.events,
          frequency: association.frequency,
        }))}
      />
    )
  return (
    <div className="876-card divide-y overflow-hidden">
      {addon.planAssociations.length ? (
        addon.planAssociations.map((association) => (
          <div
            key={association.id}
            className="flex items-center gap-4 px-5 py-4"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{association.plan.name}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {association.events
                  .map((event) => event.toLowerCase().replaceAll('_', ' '))
                  .join(', ')}
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
          No plan associations.
        </p>
      )}
    </div>
  )
}
