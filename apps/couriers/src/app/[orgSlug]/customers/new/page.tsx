import { Suspense } from 'react'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
} from '@876/ui/detail-card'
import { Skeleton } from '@876/ui/skeleton'
import { notFound } from 'next/navigation'
import { getManageContext } from '@/lib/auth/manage-context'
import { getCouriers } from '@/lib/services/couriers'
import { getFeatures } from '@/lib/features'
import { AddCustomerPanel } from '../_components/add-customer-panel'
import type { CustomerBranchOption } from '../_components/customer-branch-field'

export const metadata = { title: 'Add customer' }

type Props = { params: Promise<{ orgSlug: string }> }

export default async function NewCustomerPage({ params }: Props) {
  const { orgSlug } = await params

  return (
    // Create opens in the detail column, where the new record will appear.
    <DetailCard aria-label="Add customer">
      <DetailCardHeader
        title="Add customer"
        closeHref={`/${orgSlug}/customers`}
        closeLabel="Close add customer"
      />
      <DetailCardBody>
        <Suspense fallback={<Skeleton className="h-24 w-full" />}>
          <NewCustomerAccess orgSlug={orgSlug} />
        </Suspense>
      </DetailCardBody>
    </DetailCard>
  )
}

/** Authorization is structural; option data is not. */
async function NewCustomerAccess({ orgSlug }: { orgSlug: string }) {
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) notFound()
  if (ctx.role !== 'super-admin' && ctx.role !== 'admin')
    return (
      <div className="876-empty-dashed max-w-2xl">
        You do not have permission to manage customers.
      </div>
    )

  const [$876, features] = await Promise.all([
    getCouriers(),
    getFeatures({ userId: ctx.userId, organizationId: ctx.orgId }),
  ])
  const branches = loadBranches($876)

  return (
    <AddCustomerPanel
      orgSlug={orgSlug}
      branches={branches}
      customerCreationEnabled={features.customerCreation}
    />
  )
}

async function loadBranches(
  client: Awaited<ReturnType<typeof getCouriers>>
): Promise<CustomerBranchOption[]> {
  const result = await client.branches.list()
  if (result.error) throw new Error(result.error.message)
  return result.data.data.map(({ id, name }) => ({ id, name }))
}
