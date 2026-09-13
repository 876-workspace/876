import { CustomerListShell } from '@876/crm-ui/customer-list-shell'
import { AppError } from '@876/ui/app-error'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import { Suspense, type ReactNode } from 'react'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { CustomerList } from '@/features/crm/components/customer-list'
import { CRM_CUSTOMERS_SKELETON_COLUMNS } from '@/features/crm/components/customers-skeleton-columns'
import { NoCrmWorkspace } from '@/features/crm/components/no-crm-workspace'
import { toCustomerRow } from '@/features/crm/customer-rows'
import { getPlatformOrganization } from '@/lib/platform-org'
import { crm } from '@/lib/services/crm'

import { PLATFORM_CUSTOMERS_HREF } from './_lib/paths'

/**
 * Gives the list and card a definite height so they sit side by side and own
 * their own scrolling (`.claude/rules/app-layout.md` §5a). A viewport measure,
 * not `h-full`: the value has to survive whatever the page column above it is.
 */
const CONTENT_HEIGHT =
  'min-h-[32rem] h-[calc(100svh-8rem)] sm:h-[calc(100svh-9rem)]'

/**
 * Owns the toolbar and customer list for every route under
 * `/requests/customers` — 876's own service-desk customers.
 *
 * Keeping them here rather than in each page is what lets opening a record
 * re-render only the card, and keeps the list column one element across
 * open/close so its width can animate.
 */
export default function PlatformRequestCustomersLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className={CONTENT_HEIGHT}>
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
            <CustomerListData />
          </Suspense>
        }
      >
        {children}
      </CustomerListShell>
    </div>
  )
}

async function CustomerListData() {
  const org = await getPlatformOrganization()
  if (!org) return <PlatformOrganizationUnavailable />

  const result = await crm.customers.list(org.id)
  if (result.error?.code === 'crm/tenant-not-found') return <NoCrmWorkspace />

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
          customersHref={PLATFORM_CUSTOMERS_HREF}
        />
      )}
    </div>
  )
}
