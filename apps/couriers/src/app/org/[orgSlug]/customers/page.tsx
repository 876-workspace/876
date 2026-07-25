import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { UsersIcon } from '@876/ui/icons'
import { Page } from '@876/ui/page'

import { ResourceToolbar } from '@/components/resource-toolbar'
import { StatusFilterHeading } from '@/components/status-filter-heading'
import { getManageContext } from '@/lib/auth/manage-context'
import { getFinanceClient } from '@/lib/finance/client'
import { service } from '@/lib/service'

import { CustomersTable } from './customers-table'

const CUSTOMER_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Customers' },
  { value: 'active', label: 'Active', headingLabel: 'Active Customers' },
  { value: 'archived', label: 'Archived', headingLabel: 'Archived Customers' },
]

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ status?: string }>
}

export default async function CustomersPage({ params, searchParams }: Props) {
  const { orgSlug } = await params
  const { status } = await searchParams
  const selectedStatus =
    status === 'active' || status === 'archived' ? status : 'all'
  const filterStatus =
    selectedStatus === 'all'
      ? undefined
      : (selectedStatus.toUpperCase() as 'ACTIVE' | 'ARCHIVED')

  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) return null

  const finance = await getFinanceClient()
  const [customers, profiles] = await Promise.all([
    finance.customers.list(ctx.orgId, {
      limit: 100,
      status: filterStatus,
    }),
    service.customerProfiles.list(ctx.tenant.id),
  ])
  const profileByBillingId = new Map(
    profiles.map((profile) => [profile.billingCustomerId, profile])
  )

  const rows = customers.error
    ? []
    : customers.data.data.map((customer) => {
        const profile = profileByBillingId.get(customer.id)
        const primaryMailbox = profile?.mailboxes[0]
        const contactName = [customer.firstName, customer.lastName]
          .filter(Boolean)
          .join(' ')
          .trim()
        // Name = owner/contact person; organization stays on its own column.
        const name =
          contactName ||
          (customer.customerKind === 'INDIVIDUAL' ? customer.name : '—')
        const organization =
          customer.companyName ??
          (customer.customerKind === 'BUSINESS' ? customer.name : null)

        return {
          id: customer.id,
          name,
          email: customer.email,
          organization,
          mailboxNumber: primaryMailbox?.number ?? null,
        }
      })

  const emptyMessage =
    selectedStatus === 'all'
      ? 'No shared customers in this finance workspace yet.'
      : `No ${selectedStatus} customers.`

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
            label: 'Delete customers',
            icon: 'delete',
            destructive: true,
            separator: true,
          },
        ]}
      />

      {customers.error ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive mb-4 rounded-lg border p-4 text-sm">
          {customers.error.message}
        </div>
      ) : null}

      <CustomersTable
        customers={rows}
        hasMore={!customers.error && customers.data.has_more}
        emptyState={
          <Empty className="border-0 py-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UsersIcon />
              </EmptyMedia>
              <EmptyTitle>No customers</EmptyTitle>
              <EmptyDescription>{emptyMessage}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
    </Page>
  )
}
