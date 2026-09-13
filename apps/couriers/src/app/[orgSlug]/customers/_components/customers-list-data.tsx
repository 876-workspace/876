import type { ReactNode } from 'react'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { UsersIcon } from '@876/ui/icons'
import { couriersOperator } from '@/lib/services/couriers'
import { billingIntegration } from '@/lib/services/billing'
import { getManageContext } from '@/lib/auth/manage-context'
import { requireCouriersData, toCustomerView } from '@/lib/couriers'
import type { CustomerView } from '@/types/customer'

import { CustomersList } from './customers-list'
import type { CustomerTableRow } from './customers-table'

/**
 * Data half of the list column, rendered from the layout behind Suspense so
 * the toolbar is interactive first. It lists this workspace's own courier
 * profiles and resolves identity for exactly those ids. Every profile is
 * loaded; the status filter is applied by `CustomersList`, because a layout
 * receives no `searchParams`.
 */
export async function CustomersListData({ orgSlug }: { orgSlug: string }) {
  const emptyState = (
    <Empty className="border-0 py-6">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UsersIcon />
        </EmptyMedia>
        <EmptyTitle>No customers</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )

  const ctx = await getManageContext(orgSlug)
  if (!ctx?.tenant)
    return (
      <CustomersListColumn>
        <CustomersList
          customers={[]}
          orgSlug={orgSlug}
          emptyState={emptyState}
        />
      </CustomersListColumn>
    )

  const profiles: CustomerView[] = []
  let customersError: { code: string; message: string } | null = null
  let startingAfter: string | undefined
  for (;;) {
    try {
      const page = requireCouriersData(
        await couriersOperator.customers.list(ctx.tenant.id, {
          limit: 100,
          ...(startingAfter === undefined
            ? {}
            : { starting_after: startingAfter }),
        })
      )
      profiles.push(...page.data.map(toCustomerView))
      const lastId = page.data.at(-1)?.id
      if (!page.has_more || lastId === undefined) break
      startingAfter = lastId
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load customers.'
      const match = message.match(/\(([^)]+)\):\s*(.*)/)
      customersError = {
        code: match?.[1] ?? 'couriers/unavailable',
        message: match?.[2] ?? message,
      }
      break
    }
  }
  if (customersError) {
    return (
      <CustomersListColumn>
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-[0.8125rem]">
          {customersError.message}
        </div>
        <CustomersList
          customers={[]}
          orgSlug={orgSlug}
          emptyState={emptyState}
        />
      </CustomersListColumn>
    )
  }

  if (profiles.length === 0)
    return (
      <CustomersListColumn>
        <CustomersList
          customers={[]}
          orgSlug={orgSlug}
          emptyState={emptyState}
        />
      </CustomersListColumn>
    )

  const billingCustomerIds = profiles.flatMap((profile) =>
    profile.billingCustomerId ? [profile.billingCustomerId] : []
  )

  // The registry caps a list at 100, and this workspace's profile count is not
  // bounded by that — a tenant with 150 customers would otherwise render 50 rows
  // with an opaque id where the name belongs. Ask for them a page at a time and
  // in parallel, since the pages do not depend on one another.
  const REGISTRY_PAGE = 100
  const idPages: string[][] = []
  for (let index = 0; index < billingCustomerIds.length; index += REGISTRY_PAGE)
    idPages.push(billingCustomerIds.slice(index, index + REGISTRY_PAGE))

  const pages = await Promise.all(
    idPages.map((ids) =>
      billingIntegration.customers.list(ctx.orgId, {
        limit: REGISTRY_PAGE,
        ids,
      })
    )
  )

  const benignCodes = new Set([
    'billing/tenant-not-found',
    'billing/database-not-ready',
    'billing/unreachable',
  ])
  const registry =
    pages.find((page) => page.error && !benignCodes.has(page.error.code)) ??
    pages.find((page) => page.error) ??
    pages[0] ??
    null
  const displayRegistryError =
    registry?.error && !benignCodes.has(registry.error.code)
      ? registry.error
      : null

  const identityById = new Map(
    pages.flatMap((page) =>
      (page.data?.data ?? []).map(
        (customer) => [customer.id, customer] as const
      )
    )
  )

  const rows: CustomerTableRow[] = profiles.map((profile) => {
    const identity = identityById.get(profile.billingCustomerId)
    const contact = identity?.primaryContact ?? null
    const fallbackName = profile.billingCustomerId ?? profile.id
    const customerName =
      [identity?.firstName, identity?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      identity?.name ||
      fallbackName

    return {
      id: profile.id,
      billingCustomerId: fallbackName,
      customerName,
      companyName: identity?.companyName ?? null,
      email: contact?.email ?? identity?.email ?? null,
      phone: identity?.phone ?? identity?.workPhone ?? null,
      status: profile.status,
    }
  })

  return (
    <CustomersListColumn>
      {displayRegistryError ? (
        <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-4 text-[0.8125rem]">
          {displayRegistryError.message}
        </div>
      ) : null}

      <CustomersList
        customers={rows}
        orgSlug={orgSlug}
        emptyState={emptyState}
      />
    </CustomersListColumn>
  )
}

/** The list column owns its own scroll region inside the split view. */
function CustomersListColumn({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-0 flex-col gap-3">{children}</div>
}
