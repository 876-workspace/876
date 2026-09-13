import { CustomerListShell } from '@876/crm-ui/customer-list-shell'
import { AppError } from '@876/ui/app-error'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import { notFound } from 'next/navigation'
import { Suspense, type ReactNode } from 'react'

import { CustomerList } from '@/features/crm/components/customer-list'
import { CRM_CUSTOMERS_SKELETON_COLUMNS } from '@/features/crm/components/customers-skeleton-columns'
import { NoCrmWorkspace } from '@/features/crm/components/no-crm-workspace'
import { toCustomerRow } from '@/features/crm/customer-rows'
import { workspaceBase } from '@/features/orgs/app-workspaces'
import { crm } from '@/lib/services/crm'

import { resolveOrg } from '@/features/orgs/org-data'

type Props = {
  children: ReactNode
  params: Promise<{ orgSlug: string }>
}

/** Gives the embedded list and card a stable internal scrolling viewport. */
const WORKSPACE_CONTENT_HEIGHT =
  'min-h-[32rem] h-[calc(100svh-11rem)] sm:h-[calc(100svh-12rem)] lg:h-[calc(100svh-13rem)]'

/**
 * Owns the toolbar and the customer list for every route under the workspace's
 * `/customers`.
 *
 * Keeping them in the layout — rather than in each page — is what lets opening
 * a record re-render only the card, and what keeps the list column a single
 * element across open/close so its width can animate.
 */
export default function CustomersLayout({ children, params }: Props) {
  return (
    <div className={WORKSPACE_CONTENT_HEIGHT}>
      <CustomerListShell
        toolbar={
          <ResourceToolbar
            title="Customers"
            titleFilter={
              <StatusFilterHeading
                label="Customers"
                value="all"
                options={[{ value: 'all', label: 'All Customers' }]}
              />
            }
            refresh
          />
        }
        list={
          <Suspense
            fallback={
              <div className="flex h-full min-h-0 flex-col">
                <DataTableSkeleton
                  columns={CRM_CUSTOMERS_SKELETON_COLUMNS}
                  rows={5}
                />
              </div>
            }
          >
            <CustomerListData params={params} />
          </Suspense>
        }
      >
        {children}
      </CustomerListShell>
    </div>
  )
}

async function CustomerListData({ params }: Pick<Props, 'params'>) {
  const { orgSlug } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  const result = await crm.customers.list(org.id)
  if (result.error?.code === 'crm/tenant-not-found') return <NoCrmWorkspace />

  // The list column scrolls inside the shell rather than growing the page, so
  // it must be the flex column that owns the overflow.
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {result.error ? (
        <AppError
          title="Customer data is temporarily unavailable"
          error={result.error}
          variant="banner"
          showCode
        />
      ) : (
        <CustomerList
          customers={(result.data?.data ?? []).map(toCustomerRow)}
          customersHref={`${workspaceBase(orgSlug, 'crm')}/customers`}
        />
      )}
    </div>
  )
}
