import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

import { DetailLayout } from '@/components/detail-layout'
import { resolvePrice } from '@/app/(app)/detail-data'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { formatMoney } from '@/lib/format'

export default async function PriceDetailLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ priceId: string }>
}) {
  const { priceId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const price = await resolvePrice(context.tenant.id, priceId)
  if (!price) notFound()

  const base = `/prices/${price.id}`

  return (
    <DetailLayout
      backHref="/prices"
      backLabel="Prices"
      eyebrow="Immutable price"
      title={price.nickname ?? price.item?.name ?? price.plan?.name ?? 'Price'}
      description={formatMoney(price.unitAmount, price.currency)}
      status={price.isActive ? 'active' : 'archived'}
      statusVariant={price.isActive ? 'success' : 'secondary'}
      tabs={[
        { label: 'Overview', href: base, exact: true },
        ...(price.tiers.length > 0
          ? [{ label: 'Tiers', href: `${base}/tiers` }]
          : []),
      ]}
    >
      {children}
    </DetailLayout>
  )
}
