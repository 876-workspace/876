import { Suspense } from 'react'
import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'
import { notFound } from 'next/navigation'
import { getManageContext } from '@/lib/auth/manage-context'
import { $couriers, requireCouriersData } from '@/lib/couriers'
import { CustomerForm } from '../_components/customer-form'

export const metadata = { title: 'Add customer' }

type Props = { params: Promise<{ orgSlug: string }> }

export default async function NewCustomerPage({ params }: Props) {
  const { orgSlug } = await params

  return (
    <Page>
      <PageBreadcrumb
        href={`/${orgSlug}/customers`}
        label="Customers"
        className="mb-4"
      />
      <PageHeader className="mb-8">
        <PageTitle>Add customer</PageTitle>
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <NewCustomerData orgSlug={orgSlug} />
      </Suspense>
    </Page>
  )
}

async function NewCustomerData({ orgSlug }: { orgSlug: string }) {
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) notFound()
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return (
      <div className="876-empty-dashed max-w-2xl">
        You do not have permission to manage customers.
      </div>
    )
  const branches = requireCouriersData(
    await $couriers.branches.list(ctx.tenant.id)
  )
  return (
    <CustomerForm
      orgSlug={orgSlug}
      branches={branches.data.map(({ id, name }) => ({ id, name }))}
    />
  )
}
