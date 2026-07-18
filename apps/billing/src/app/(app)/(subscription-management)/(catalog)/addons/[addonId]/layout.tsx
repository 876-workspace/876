import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

import { DetailLayout } from '@/components/detail-layout'
import { CatalogResourceActions } from '@/components/catalog-resource-actions'
import { resolveAddon } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'

export default async function AddonDetailLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ addonId: string }>
}) {
  const { addonId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null
  const addon = await resolveAddon(context.tenant.id, addonId)
  if (!addon) notFound()
  const base = `/addons/${addon.id}`
  return (
    <DetailLayout
      backHref="/addons"
      backLabel="Add-ons"
      eyebrow={addon.product.name}
      title={addon.name}
      description={addon.description ?? addon.code}
      status={addon.isActive ? 'active' : 'archived'}
      statusVariant={addon.isActive ? 'success' : 'secondary'}
      actions={
        context.permissions.includes('catalog:write') ? (
          <CatalogResourceActions
            resource="addon"
            resourceId={addon.id}
            resourceName={addon.name}
            isActive={addon.isActive}
            returnHref="/addons"
            editHref={`/addons/${addon.id}/edit`}
            resourceCode={addon.code}
          />
        ) : null
      }
      tabs={[
        { label: 'Overview', href: base, exact: true },
        { label: 'Prices', href: `${base}/prices` },
        { label: 'Plans', href: `${base}/plans` },
      ]}
    >
      {children}
    </DetailLayout>
  )
}
