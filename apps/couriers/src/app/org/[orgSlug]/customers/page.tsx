import { Badge } from '@876/ui/badge'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { CursorPagination } from '@/components/cursor-pagination'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@/components/status-filter-heading'
import { getManageContext } from '@/lib/auth/manage-context'
import { getFinanceClient } from '@/lib/finance/client'
import { service } from '@/lib/service'

const CUSTOMER_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Customers' },
  { value: 'active', label: 'Active', headingLabel: 'Active Customers' },
  { value: 'archived', label: 'Archived', headingLabel: 'Archived Customers' },
]

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{
    after?: string
    before?: string
    status?: string
  }>
}

export default async function CustomersPage({ params, searchParams }: Props) {
  const [{ orgSlug }, { after, before, status }] = await Promise.all([
    params,
    searchParams,
  ])
  const selectedStatus =
    status === 'active' || status === 'archived' ? status : 'all'
  const customerStatus = selectedStatus === 'all' ? undefined : selectedStatus
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) return null

  const finance = await getFinanceClient()
  const [customers, profiles] = await Promise.all([
    finance.customers.list(ctx.orgId, {
      limit: 25,
      starting_after: after,
      ending_before: before,
      status: customerStatus,
    }),
    service.customerProfiles.list(ctx.tenant.id),
  ])
  const rows = customers.error ? [] : customers.data.data
  const enrolledCustomerIds = new Set(
    profiles.flatMap((profile) =>
      profile.billingCustomerId ? [profile.billingCustomerId] : []
    )
  )

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
          {
            label: 'Import',
            icon: 'import',
            href: `/org/${orgSlug}/customers/import`,
          },
        ]}
      />

      {customers.error ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm">
          {customers.error.message}
        </div>
      ) : rows.length === 0 ? (
        <div className="876-empty-dashed">No shared customers.</div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Customer</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-5 text-right">
                  Courier profile
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="pl-5">
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {customer.email ?? customer.id}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {customer.customerNumber ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {customer.customerKind === 'BUSINESS'
                      ? 'Business'
                      : 'Individual'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        customer.status === 'ACTIVE' ? 'secondary' : 'outline'
                      }
                    >
                      {customer.status === 'ACTIVE' ? 'Active' : 'Archived'}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    {enrolledCustomerIds.has(customer.id) ? (
                      <Badge variant="secondary">Enrolled</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        Not enrolled
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <CursorPagination
            firstId={rows[0]?.id ?? null}
            lastId={rows[rows.length - 1]?.id ?? null}
            hasMore={customers.data.has_more}
            count={rows.length}
          />
        </div>
      )}
    </Page>
  )
}
