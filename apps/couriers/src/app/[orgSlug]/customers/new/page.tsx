import { Suspense } from 'react'
import { Page, PageHeader, PageTitle } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'
import { notFound } from 'next/navigation'
import { getManageContext } from '@/lib/auth/manage-context'
import { $876 } from '@/lib/876'
import type { GlobalCustomerOption } from '@/types/customer'
import { AddCustomerPanel } from '../_components/add-customer-panel'

export const metadata = { title: 'Add customer' }

type Props = { params: Promise<{ orgSlug: string }> }

export default async function NewCustomerPage({ params }: Props) {
  const { orgSlug } = await params

  return (
    <Page>
      <PageHeader className="mb-4">
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
  const branches = await $876.couriers.branches.list(ctx.tenant.id)
  if (branches.error)
    return (
      <div className="border-destructive/30 bg-destructive/5 text-destructive max-w-2xl rounded-lg border p-4 text-sm">
        {branches.error.message}
      </div>
    )

  const [enrolled, global] = await Promise.all([
    listEnrolledCustomerIds(ctx.tenant.id),
    listGlobalCustomers(ctx.orgId),
  ])
  const selectionError = enrolled.error ?? global.error
  const availableCustomers =
    enrolled.data && global.data
      ? global.data.filter((customer) => !enrolled.data.has(customer.id))
      : []

  return (
    <AddCustomerPanel
      orgSlug={orgSlug}
      branches={branches.data.data.map(({ id, name }) => ({ id, name }))}
      globalCustomers={availableCustomers}
      selectionError={selectionError}
    />
  )
}

type LoadResult<T> = { data: T; error: null } | { data: null; error: string }

async function listEnrolledCustomerIds(
  tenantId: string
): Promise<LoadResult<Set<string>>> {
  const ids = new Set<string>()
  let startingAfter: string | undefined

  for (;;) {
    const result = await $876.couriers.customers.list(tenantId, {
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
    const page = await $876.billing.customers.list(organizationId, {
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
