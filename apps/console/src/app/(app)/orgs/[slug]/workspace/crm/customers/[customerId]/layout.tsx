import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { AppError } from '@876/ui/app-error'

import { CustomerCard } from '@/features/crm/components/customer-card'
import { NoCrmWorkspace } from '@/features/crm/components/no-crm-workspace'
import { loadOrgCustomerRecord } from '@/features/crm/customer-record-data'
import { workspaceBase } from '@/features/orgs/app-workspaces'
import { resolveOrg } from '../../../../_data'

type Props = {
  children: ReactNode
  params: Promise<{ slug: string; customerId: string }>
}

/**
 * The customer card, rendered into the detail column of the customers shell.
 *
 * It returns the card as the column's only child: the card is `h-full`, so an
 * intermediate wrapper with its own flow height collapses it. The list beside
 * it is the way back to `/customers`, which is why there is no breadcrumb here.
 */
export default async function CrmWorkspaceCustomerLayout({
  children,
  params,
}: Props) {
  const { slug, customerId } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const base = workspaceBase(slug, 'crm')
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
      baseHref={`${base}/customers/${encodeURIComponent(customerId)}`}
    >
      {children}
    </CustomerCard>
  )
}
