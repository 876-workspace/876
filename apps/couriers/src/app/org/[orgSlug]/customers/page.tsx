import { Badge } from '@876/ui/badge'
import { Page, PageDescription, PageHeader, PageTitle } from '@876/ui/page'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { getManageContext } from '@/lib/auth/manage-context'
import { getFinanceClient } from '@/lib/finance/client'
import { service } from '@/lib/service'

export default async function CustomersPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant) return null

  const finance = await getFinanceClient()
  const [customers, profiles] = await Promise.all([
    finance.customers.list(ctx.orgId, { limit: 100 }),
    service.customerProfiles.list(ctx.tenant.id),
  ])
  const enrolledCustomerIds = new Set(
    profiles.flatMap((profile) =>
      profile.billingCustomerId ? [profile.billingCustomerId] : []
    )
  )

  return (
    <Page>
      <PageHeader className="mb-8">
        <PageTitle>Customers</PageTitle>
        <PageDescription>
          Shared finance customers for {ctx.orgName ?? ctx.tenant.name}. Courier
          profiles are added only when a customer uses Courier services.
        </PageDescription>
      </PageHeader>

      {customers.error ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm">
          {customers.error.message}
        </div>
      ) : customers.data.data.length === 0 ? (
        <div className="876-empty-dashed">
          No shared customers in this finance workspace yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-5 text-right">
                  Courier profile
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.data.data.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="pl-5">
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {customer.email ?? customer.id}
                    </div>
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
          {customers.data.has_more && (
            <p className="text-muted-foreground border-t px-5 py-3 text-xs">
              Showing the first 100 customers.
            </p>
          )}
        </div>
      )}
    </Page>
  )
}
