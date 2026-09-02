import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

import { DetailLayout } from '@/components/patterns/detail/detail-layout'
import { getWorkspaceContext } from '@/lib/auth/billing-context'
import type { LegacyBillingRecord } from '@/lib/service'
import { resolveVendor } from '@/app/(app)/_lib/detail-data'

export default async function VendorDetailLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ vendorId: string }>
}) {
  const { vendorId } = await params
  const context = await getWorkspaceContext()
  if (!context) return null

  const vendor: LegacyBillingRecord | null = await resolveVendor(
    context.tenant.id,
    vendorId
  )
  if (!vendor) notFound()

  const base = `/purchases/vendors/${vendor.id}`

  return (
    <DetailLayout
      backHref="/purchases/vendors"
      backLabel="Vendors"
      eyebrow="Vendor"
      title={vendor.name}
      description={
        vendor.email ?? vendor.phone ?? vendor.defaultCurrency ?? 'Vendor'
      }
      status={vendor.status.toLowerCase()}
      statusVariant={vendor.status === 'ACTIVE' ? 'success' : 'secondary'}
      tabs={[{ label: 'Overview', href: base, exact: true }]}
      recordId={vendor.id}
    >
      {children}
    </DetailLayout>
  )
}
