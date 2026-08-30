import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { AppError } from '@876/ui/app-error'
import { PageBreadcrumb } from '@876/ui/page'

import { ConsoleCustomerCard } from '@/features/crm/components/customer-card'
import { NoCrmWorkspace } from '@/features/crm/components/no-crm-workspace'
import { loadOrgCustomerRecord } from '@/features/crm/customer-record-data'
import { workspaceBase } from '@/features/orgs/app-workspaces'
import { resolveOrg } from '../../../../_data'

type Props = {
  children: ReactNode
  params: Promise<{ slug: string; customerId: string }>
}

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
      <div className="space-y-4">
        <PageBreadcrumb href={`${base}/customers`} label="Customers" />
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
      </div>
    )

  return (
    <div className="space-y-4">
      <PageBreadcrumb href={`${base}/customers`} label="Customers" />
      <ConsoleCustomerCard
        customer={record.row}
        baseHref={`${base}/customers/${encodeURIComponent(customerId)}`}
      >
        {children}
      </ConsoleCustomerCard>
    </div>
  )
}
