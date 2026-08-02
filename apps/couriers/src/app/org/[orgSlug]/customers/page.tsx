import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { UsersIcon } from '@876/ui/icons'
import { Page } from '@876/ui/page'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import { get876Client } from '@/lib/876'
import { getManageContext } from '@/lib/auth/manage-context'
import { service } from '@/lib/service'
import { customerStatusSchema } from '@/types/customer'

import {
  CustomersTable,
  type CustomerTableRow,
} from './_components/customers-table'

const CUSTOMER_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Customers' },
  { value: 'active', label: 'Active', headingLabel: 'Active Customers' },
  {
    value: 'suspended',
    label: 'Suspended',
    headingLabel: 'Suspended Customers',
  },
]

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ status?: string }>
}

export default async function CustomersPage({ params, searchParams }: Props) {
  const { orgSlug } = await params
  const { status } = await searchParams
  const selectedStatus =
    status === 'active' || status === 'suspended' ? status : 'all'
  const profileStatus =
    selectedStatus === 'all'
      ? undefined
      : customerStatusSchema.parse(selectedStatus.toUpperCase())

  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) return null

  // Layer 3 first: this workspace's own enrolled customers are the list. The
  // shared registry is then read only for the identity of those customers.
  const profiles = await service.customerProfiles.list(
    ctx.tenant.id,
    profileStatus
  )

  const billingCustomerIds = profiles.flatMap((profile) =>
    profile.billingCustomerId ? [profile.billingCustomerId] : []
  )

  const $876 = await get876Client()
  const registry = billingCustomerIds.length
    ? await $876.billing.customers.list(ctx.orgId, {
        limit: 100,
        ids: billingCustomerIds,
      })
    : null

  const identityById = new Map(
    registry?.data?.data.map((customer) => [customer.id, customer]) ?? []
  )

  const rows: CustomerTableRow[] = profiles.map((profile) => {
    const identity = identityById.get(profile.billingCustomerId)
    const contact = identity?.primaryContact ?? null
    const contactName =
      [contact?.firstName, contact?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || null

    return {
      id: profile.id,
      billingCustomerId: profile.billingCustomerId,
      name: identity?.name ?? profile.billingCustomerId,
      contactName,
      email: contact?.email ?? identity?.email ?? null,
      customerKind: identity?.customerKind ?? 'INDIVIDUAL',
      status: profile.status,
      isCommercial: profile.isCommercial,
    }
  })

  return (
    <Page>
      <ResourceToolbar
        title="Customers"
        titleFilter={
          <StatusFilterHeading
            label="Customers"
            value={selectedStatus}
            options={CUSTOMER_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref={`/org/${orgSlug}/customers/new`}
        primaryVariant="info"
        refresh
        dropdownActions={[
          { label: 'Import', icon: 'import' },
          { label: 'Export', icon: 'export' },
          {
            label: 'Delete',
            icon: 'delete',
            destructive: true,
            separator: true,
          },
        ]}
      />

      {registry?.error ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive mb-4 rounded-lg border p-4 text-sm">
          {registry.error.message}
        </div>
      ) : null}

      <CustomersTable
        customers={rows}
        emptyState={
          <Empty className="border-0 py-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UsersIcon />
              </EmptyMedia>
              <EmptyTitle>No customers</EmptyTitle>
            </EmptyHeader>
          </Empty>
        }
      />
    </Page>
  )
}
