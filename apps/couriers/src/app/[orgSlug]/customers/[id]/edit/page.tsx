import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { Page, PageBreadcrumb, PageHeader, PageTitle } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'
import { $876, get876Client } from '@/lib/876'
import { getManageContext } from '@/lib/auth/manage-context'
import {
  isCouriersNotFound,
  requireCouriersData,
  toCustomerView,
} from '@/lib/couriers'
import { CustomerForm } from '../../_components/customer-form'

type Props = { params: Promise<{ orgSlug: string; id: string }> }
export default async function EditCustomerPage({ params }: Props) {
  const { orgSlug, id } = await params
  return (
    <Page>
      <PageBreadcrumb
        href={`/${orgSlug}/customers/${id}`}
        label="Customer"
        className="mb-4"
      />
      <PageHeader className="mb-8">
        <PageTitle>Edit customer</PageTitle>
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <EditCustomerData orgSlug={orgSlug} id={id} />
      </Suspense>
    </Page>
  )
}
async function EditCustomerData({
  orgSlug,
  id,
}: {
  orgSlug: string
  id: string
}) {
  const [ctx, request876] = await Promise.all([
    getManageContext(orgSlug),
    get876Client(),
  ])
  if (!ctx?.tenant) notFound()
  const customerResult = await $876.customers.retrieve(ctx.tenant.id, id)
  if (isCouriersNotFound(customerResult)) notFound()
  const profile = toCustomerView(requireCouriersData(customerResult))
  const [branchesResult, registry] = await Promise.all([
    $876.branches.list(ctx.tenant.id),
    request876.billing.customers.retrieve(
      ctx.tenant.orgId,
      profile.billingCustomerId
    ),
  ])
  const branches = requireCouriersData(branchesResult).data

  if (!registry.data) notFound()

  return (
    <CustomerForm
      orgSlug={orgSlug}
      branches={branches.map(({ id: branchId, name }) => ({
        id: branchId,
        name,
      }))}
      customer={{
        // Identity is picked field by field, never spread: the registry record
        // carries its own `id`, `status`, and timestamps, and spreading it over
        // the profile would point this form's PATCH at the Billing customer id
        // and overwrite the courier status with the registry's ACTIVE/ARCHIVED.
        ...profile,
        customerKind: registry.data.customerKind,
        customerType: registry.data.customerType,
        name: registry.data.name,
        firstName: registry.data.firstName,
        lastName: registry.data.lastName,
        companyName: registry.data.companyName,
        email: registry.data.email,
        phone: registry.data.phone,
        mailboxNumber: null,
        branchName: null,
      }}
    />
  )
}
