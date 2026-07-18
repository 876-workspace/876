import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

import { DetailLayout } from '@/components/detail-layout'
import { CatalogResourceActions } from '@/components/catalog-resource-actions'
import { resolveItem } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'

export default async function ItemDetailLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ itemId: string }>
}) {
  const { itemId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const item = await resolveItem(context.tenant.id, itemId)
  if (!item) notFound()

  const base = `/items/${item.id}`

  return (
    <DetailLayout
      backHref="/items"
      backLabel="Items"
      eyebrow="Invoice item"
      title={item.name}
      description={item.description ?? item.sku ?? 'Sellable invoice item'}
      status={item.isActive ? 'active' : 'archived'}
      statusVariant={item.isActive ? 'success' : 'secondary'}
      actions={
        context.permissions.includes('catalog:write') ? (
          <CatalogResourceActions
            resource="item"
            resourceId={item.id}
            resourceName={item.name}
            isActive={item.isActive}
            returnHref="/items"
            editHref={`/items/${item.id}/edit`}
          />
        ) : null
      }
      tabs={[
        { label: 'Overview', href: base, exact: true },
        { label: 'Prices', href: `${base}/prices` },
        { label: 'Transactions', href: `${base}/transactions` },
        { label: 'Audit', href: `${base}/audit` },
      ]}
    >
      {children}
    </DetailLayout>
  )
}
