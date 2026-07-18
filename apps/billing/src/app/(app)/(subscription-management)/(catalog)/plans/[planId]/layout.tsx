import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

import { DetailLayout } from '@/components/detail-layout'
import { CatalogResourceActions } from '@/components/catalog-resource-actions'
import { resolvePlan } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'

export default async function PlanDetailLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ planId: string }>
}) {
  const { planId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const plan = await resolvePlan(context.tenant.id, planId)
  if (!plan) notFound()

  const base = `/plans/${plan.id}`

  return (
    <DetailLayout
      backHref="/plans"
      backLabel="Plans"
      eyebrow={plan.product.name}
      title={plan.name}
      description={plan.description ?? plan.code}
      status={plan.isActive ? 'active' : 'archived'}
      statusVariant={plan.isActive ? 'success' : 'secondary'}
      actions={
        context.permissions.includes('catalog:write') ? (
          <CatalogResourceActions
            resource="plan"
            resourceId={plan.id}
            resourceName={plan.name}
            isActive={plan.isActive}
            returnHref="/plans"
            editHref={`/plans/${plan.id}/edit`}
            resourceCode={plan.code}
          />
        ) : null
      }
      tabs={[
        { label: 'Overview', href: base, exact: true },
        { label: 'Prices', href: `${base}/prices` },
        { label: 'Add-ons', href: `${base}/addons` },
      ]}
    >
      {children}
    </DetailLayout>
  )
}
