import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { DetailField } from '@/components/detail-field'
import { DetailActionList } from '@/components/detail-action-list'
import { MetricCard } from '@/components/metric-card'
import { resolveProduct } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatDate } from '@/lib/format'

interface Props {
  params: Promise<{ productId: string }>
}

export const metadata: Metadata = {
  title: 'Product details',
  description: 'Subscription product configuration.',
}

export default async function ProductDetailPage({ params }: Props) {
  const { productId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const product = await resolveProduct(context.tenant.id, productId)
  if (!product) notFound()

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Add-ons"
          value={product._count.addons}
          detail="Modular enhancements"
        />
        <MetricCard
          label="Plans"
          value={product._count.plans}
          detail="Subscription plans"
        />
        <MetricCard
          label="Type"
          value={product.type.toLowerCase()}
          detail="Offering classification"
        />
        <MetricCard
          label="Source"
          value={product.sourceAppId ? '876 app' : 'Standalone'}
          detail="Product ownership"
        />
      </div>

      <DetailActionList
        title="Product catalog"
        description="Keep the product as the stable offering, then manage its plans and optional add-ons independently."
        actions={[
          {
            href: `/products/${product.id}/plans`,
            label: 'Plans',
            description:
              'Manage billing intervals, trials, free plans, prices, and availability.',
            meta: product._count.plans,
          },
          {
            href: `/products/${product.id}/addons`,
            label: 'Add-ons',
            description:
              'Manage recurring and one-time enhancements available with this product.',
            meta: product._count.addons,
          },
        ]}
      />

      <section className="876-card p-5">
        <h2 className="876-section-title mb-4">Product information</h2>
        <dl className="divide-876-surface-border divide-y">
          <DetailField label="Slug" value={product.slug} mono />
          <DetailField
            label="Free-plan fallback"
            value={product.fallbackPlan?.name ?? 'None'}
          />
          <DetailField
            label="Source app ID"
            value={product.sourceAppId ?? '—'}
            mono
          />
          <DetailField
            label="Redirect URL"
            value={product.redirectUrl ?? '—'}
            mono
          />
          <DetailField
            label="Notifications"
            value={product.notificationRecipients ?? '—'}
          />
          <DetailField label="Updated" value={formatDate(product.updatedAt)} />
          <DetailField label="Product ID" value={product.id} mono />
        </dl>
      </section>
    </div>
  )
}
