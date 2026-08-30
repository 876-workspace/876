import { Suspense, type ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { CustomerListShell } from '@876/crm-ui/customer-list-shell'
import { AppError } from '@876/ui/app-error'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { CustomerList } from '@/features/crm/components/customer-list'
import { CRM_CUSTOMERS_SKELETON_COLUMNS } from '@/features/crm/components/customers-skeleton-columns'
import { NoCrmWorkspace } from '@/features/crm/components/no-crm-workspace'
import { toCustomerRow } from '@/features/crm/customer-rows'
import { workspaceBase } from '@/features/orgs/app-workspaces'
import { $876 } from '@/lib/876'

import { resolveOrg } from '../../../_data'

type Props = {
  children: ReactNode
  params: Promise<{ slug: string }>
}

/**
 * `ListDetailShell` needs a **definite** height. Its grid is
 * `rows-[auto_auto_minmax(0,1fr)]` with the detail card spanning every row, so
 * when the container's height is indefinite the `1fr` list row degenerates to
 * `auto` and the tall card stretches the rows — which pushes the list column
 * down the page instead of sitting beside the card. That is the exact symptom
 * to look for.
 *
 * `h-full` does not supply that height here. The standalone CRM shell sits in
 * `AppShellMain` (`min-h-0 flex-1 overflow-y-auto`) inside a fixed-height
 * frame, so a percentage resolves. The Console workspace `<main>` is a
 * scrolling page whose row carries only a `min-height`, so it does not.
 *
 * Until `WorkspaceShell` grows a real height chain, the measure is taken from
 * the viewport instead, which depends on nothing above it: `svh` so mobile
 * browser chrome does not clip it, and a floor so a short window still gets a
 * usable card. Slack in either direction costs a little whitespace or a little
 * page scroll — never the collapsed-grid failure above.
 */
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
        toolbar={<ResourceToolbar title="Customers" refresh />}
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
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const result = await $876.customerProfiles.list(org.id)
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
          customersHref={`${workspaceBase(slug, 'crm')}/customers`}
        />
      )}
    </div>
  )
}
