import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { CustomerCard } from '@/features/crm/components/customer-card'
import { NoCrmWorkspace } from '@/features/crm/components/no-crm-workspace'
import { loadOrgCustomerRecord } from '@/features/crm/customer-record-data'
import { getPlatformOrganization } from '@/lib/platform-org'

import { PLATFORM_CUSTOMERS_HREF } from '../_lib/paths'

type Props = {
  children: ReactNode
  params: Promise<{ customerId: string }>
}

/**
 * The customer card, rendered into the detail column of the customers shell.
 *
 * It returns the card as the column's only child: the card is `h-full`, so an
 * intermediate wrapper with its own flow height collapses it. The list beside
 * it is the way back, which is why there is no breadcrumb here.
 */
export default async function PlatformRequestCustomerLayout({
  children,
  params,
}: Props) {
  const { customerId } = await params
  const org = await getPlatformOrganization()
  if (!org) return <PlatformOrganizationUnavailable />

  const record = await loadOrgCustomerRecord(org.id, customerId)
  if (record.result.error?.code === 'crm/tenant-not-found')
    return <NoCrmWorkspace />
  if (record.result.error?.code === 'crm/customer-not-found') notFound()
  if (record.result.error || !record.row)
    return (
      <AppError
        title="Customer details are temporarily unavailable"
        error={
          record.result.error ?? {
            code: 'crm/customer-not-found',
            message: 'Customer details are unavailable.',
          }
        }
        variant="banner"
        showCode
      />
    )

  return (
    <CustomerCard
      customer={record.row}
      baseHref={`${PLATFORM_CUSTOMERS_HREF}/${encodeURIComponent(customerId)}`}
    >
      {children}
    </CustomerCard>
  )
}
