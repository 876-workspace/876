import Link from 'next/link'

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@876/ui/empty'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { $876 } from '@/lib/876'
import { requireCrmContext } from '@/lib/auth/require-crm-context'

export const metadata = { title: 'Customers' }

export default async function CustomersPage() {
  const context = await requireCrmContext()
  const result = await $876.customerProfiles.list(context.orgId)
  if (result.error) throw new Error(result.error.message)

  const customers = result.data.data

  return (
    <Page>
      <ResourceToolbar
        title="Customers"
        primaryLabel="Add"
        primaryHref="/customers/new"
        primaryVariant="info"
      />

      {customers.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No CRM customers yet</EmptyTitle>
            <EmptyDescription>
              Add a customer to the shared 876 customer registry and enroll the relationship into CRM.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(({ profile, customer }) => (
                <tr key={profile.id} className="border-t">
                  <td className="px-4 py-3">
                    <Link href={`/customers/${profile.id}`} className="font-medium hover:underline">
                      {customer?.name ?? profile.billingCustomerId}
                    </Link>
                  </td>
                  <td className="text-muted-foreground px-4 py-3">{customer?.email ?? '—'}</td>
                  <td className="text-muted-foreground px-4 py-3">{customer?.phone ?? '—'}</td>
                  <td className="px-4 py-3">{profile.status === 'ACTIVE' ? 'Active' : 'Inactive'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  )
}
