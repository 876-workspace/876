import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

import { DetailLayout } from '@/components/detail-layout'
import { CatalogResourceActions } from '@/components/catalog-resource-actions'
import { resolveProduct } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'

export default async function ProductDetailLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ productId: string }>
}) {
  const { productId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const product = await resolveProduct(context.tenant.id, productId)
  if (!product) notFound()

  const base = `/products/${product.id}`

  return (
    <DetailLayout
      backHref="/products"
      backLabel="Products"
      eyebrow="Subscription product"
      title={product.name}
      description={product.description ?? product.slug}
      status={product.isActive ? 'active' : 'archived'}
      statusVariant={product.isActive ? 'success' : 'secondary'}
      actions={
        context.permissions.includes('catalog:write') ? (
          <CatalogResourceActions
            resource="product"
            resourceId={product.id}
            resourceName={product.name}
            isActive={product.isActive}
            returnHref="/products"
            editHref={`/products/${product.id}/edit`}
          />
        ) : null
      }
      tabs={[
        { label: 'Overview', href: base, exact: true },
        { label: 'Plans', href: `${base}/plans` },
        { label: 'Add-ons', href: `${base}/addons` },
      ]}
    >
      {children}
    </DetailLayout>
  )
}
