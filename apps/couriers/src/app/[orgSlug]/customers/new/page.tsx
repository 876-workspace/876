import { Suspense } from 'react'
import { Page, PageHeader, PageTitle } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'
import { notFound } from 'next/navigation'
import { getManageContext } from '@/lib/auth/manage-context'
import { getCouriers } from '@/lib/services/couriers'
import { billingIntegration } from '@/lib/services/billing'
import type { GlobalCustomerOption } from '@/types/customer'
import { AddCustomerPanel } from '../_components/add-customer-panel'
import type { CustomerBranchOption } from '../_components/customer-branch-field'
import type { CustomerSelection } from '../_components/customer-enrollment-form'

export const metadata = { title: 'Add customer' }

type Props = { params: Promise<{ orgSlug: string }> }

export default async function NewCustomerPage({ params }: Props) {
  const { orgSlug } = await params

  return (
    <Page>
      <PageHeader className="mb-4">
        <PageTitle>Add customer</PageTitle>
      </PageHeader>
      <Suspense fallback={<Skeleton className="h-24 w-full" />}>
        <NewCustomerAccess orgSlug={orgSlug} />
      </Suspense>
    </Page>
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

  const $876 = await getCouriers()
  const branches = loadBranches($876)
  const customers = loadAvailableCustomers($876, ctx.orgId)

  return (
    <AddCustomerPanel
      orgSlug={orgSlug}
      branches={branches}
      customers={customers}
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

async function loadAvailableCustomers(
  client: Awaited<ReturnType<typeof getCouriers>>,
  organizationId: string
): Promise<CustomerSelection> {
  const [enrolled, global] = await Promise.all([
    listEnrolledCustomerIds(client),
    listGlobalCustomers(organizationId),
  ])
  const error = enrolled.error ?? global.error

  if (error || !enrolled.data || !global.data) {
    return { data: [], error: error ?? 'Customers could not be loaded.' }
  }

  return {
    data: global.data.filter((customer) => !enrolled.data.has(customer.id)),
    error: null,
  }
}

type LoadResult<T> = { data: T; error: null } | { data: null; error: string }

async function listEnrolledCustomerIds(
  client: Awaited<ReturnType<typeof getCouriers>>
): Promise<LoadResult<Set<string>>> {
  const ids = new Set<string>()
  let startingAfter: string | undefined

  for (;;) {
    const result = await client.customers.list({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })
    if (result.error) return { data: null, error: result.error.message }
    const page = result.data
    for (const customer of page.data) ids.add(customer.billing_customer_id)
    const lastId = page.data.at(-1)?.id
    if (!page.has_more || !lastId) break
    startingAfter = lastId
  }

  return { data: ids, error: null }
}

async function listGlobalCustomers(
  organizationId: string
): Promise<LoadResult<GlobalCustomerOption[]>> {
  const customers: GlobalCustomerOption[] = []
  let startingAfter: string | undefined

  for (;;) {
    const page = await billingIntegration.customers.list(organizationId, {
      status: 'ACTIVE',
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })
    if (page.error) return { data: null, error: page.error.message }

    customers.push(
      ...page.data.data.map((customer) => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      }))
    )
    const lastId = page.data.data.at(-1)?.id
    if (!page.data.has_more || !lastId) break
    startingAfter = lastId
  }

  return { data: customers, error: null }
}
