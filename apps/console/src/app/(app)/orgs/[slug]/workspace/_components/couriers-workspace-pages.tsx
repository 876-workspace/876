import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { AppError } from '@876/ui/app-error'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { toBranchRows } from '@/features/couriers/branch-rows'
import { toCustomerRows } from '@/features/couriers/customer-rows'
import { toPackageRows } from '@/features/couriers/package-rows'
import { toTeamRows } from '@/features/couriers/team-rows'
import { toWarehouseRows } from '@/features/couriers/warehouse-rows'
import { BranchesTable } from '@/features/couriers/components/branches-table'
import { CustomersTable } from '@/features/couriers/components/customers-table'
import { NoCouriersWorkspace } from '@/features/couriers/components/no-couriers-workspace'
import { PackagesTable } from '@/features/couriers/components/packages-table'
import { TeamTable } from '@/features/couriers/components/team-table'
import { WarehousesTable } from '@/features/couriers/components/warehouses-table'
import {
  COURIERS_BRANCHES_SKELETON_COLUMNS,
  COURIERS_CUSTOMERS_SKELETON_COLUMNS,
  COURIERS_PACKAGES_SKELETON_COLUMNS,
  COURIERS_TEAM_SKELETON_COLUMNS,
  COURIERS_WAREHOUSES_SKELETON_COLUMNS,
} from '@/features/couriers/components/skeleton-columns'
import { workspaceBase } from '@/features/orgs/app-workspaces'
import { billing } from '@/lib/services/billing'
import { couriers } from '@/lib/services/couriers'

import { resolveOrg, resolveOrgMembers } from '../../_data'

type Props = { params: Promise<{ slug: string }> }

/**
 * The 876 Couriers workspace screens, as an operator reads them.
 *
 * Couriers is keyed by tenant rather than by organization, so every screen
 * resolves the tenant first. An organization with no tenant is a normal state —
 * it has simply never used Couriers — and renders the empty view rather than an
 * error.
 *
 * Every page is chrome first: the toolbar renders immediately and only the data
 * region suspends (`CLAUDE.md` → Loading States & Suspense Placement).
 */

const WORKSPACE_KEY = 'couriers'
const APP_LABEL = 'Couriers'

/** The error a Couriers tenant lookup returns for an organization without one. */
const TENANT_NOT_FOUND = 'tenant/not-found'

function metadataFor(title: string) {
  return async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params
    const org = await resolveOrg(slug)
    if (!org) return { title }

    return { title: `${org.name ?? org.slug} • ${title} - ${APP_LABEL}` }
  }
}

function sectionHref(slug: string, segment: string) {
  return `${workspaceBase(slug, WORKSPACE_KEY)}/${segment}`
}

function emptyLine(line: string) {
  return (
    <p className="text-muted-foreground py-10 text-center text-sm">{line}</p>
  )
}

/**
 * Resolves the organization and its Couriers tenant together.
 *
 * Returns the tenant id, or a node to render instead: the empty view when the
 * organization has no tenant, and an `AppError` when the lookup genuinely
 * failed. Keeping the two apart is the point — a missing tenant must never be
 * reported as an outage.
 */
type TenantContext =
  | { ok: true; orgId: string; tenantId: string }
  | { ok: false; fallback: ReactNode }

async function resolveTenant(
  slug: string,
  title: string
): Promise<TenantContext> {
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const tenant = await couriers.tenants.retrieve({ organizationId: org.id })
  if (tenant.error?.code === TENANT_NOT_FOUND)
    return { ok: false, fallback: <NoCouriersWorkspace /> }

  if (tenant.error || !tenant.data)
    return {
      ok: false,
      fallback: (
        <AppError
          title={`${title} are temporarily unavailable`}
          error={
            tenant.error ?? {
              code: 'couriers/tenant-unavailable',
              message: 'The Couriers workspace could not be resolved.',
            }
          }
          variant="banner"
          showCode
        />
      ),
    }

  return { ok: true, orgId: org.id, tenantId: tenant.data.id }
}

export function createCouriersCustomersPage() {
  const generateMetadata = metadataFor('Customers')

  function Page({ params }: Props) {
    return (
      <div className="space-y-4">
        <ResourceToolbar title="Customers" refresh />
        <Suspense
          fallback={
            <DataTableSkeleton
              columns={COURIERS_CUSTOMERS_SKELETON_COLUMNS}
              rows={5}
            />
          }
        >
          <CustomersData params={params} />
        </Suspense>
      </div>
    )
  }

  return { Page, generateMetadata }
}

async function CustomersData({ params }: Props) {
  const { slug } = await params
  const context = await resolveTenant(slug, 'Customers')
  if (!context.ok) return context.fallback

  const { orgId, tenantId } = context

  // A courier customer profile carries no name of its own and points at the
  // organization's registry customer, and its branch is a separate resource.
  // One list of each names every row; a retrieve per row would be an N+1.
  const [result, registry, branches] = await Promise.all([
    couriers.customers.list(tenantId),
    billing.customers.list(orgId),
    couriers.branches.list(tenantId),
  ])

  if (result.error)
    return (
      <AppError
        title="Customers are temporarily unavailable"
        error={result.error}
        variant="banner"
        showCode
      />
    )

  return (
    <>
      {registry.error ? (
        <AppError
          title="Customer names could not be resolved"
          error={registry.error}
          variant="inline"
          showCode
        />
      ) : null}
      <CustomersTable
        customers={toCustomerRows(
          result.data?.data ?? [],
          registry.data?.data ?? [],
          branches.data?.data ?? []
        )}
        baseHref={sectionHref(slug, 'customers')}
        emptyState={emptyLine(
          'No customers are enrolled with this courier yet.'
        )}
      />
    </>
  )
}

export function createCouriersPackagesPage() {
  const generateMetadata = metadataFor('Packages')

  function Page({ params }: Props) {
    return (
      <div className="space-y-4">
        <ResourceToolbar title="Packages" refresh />
        <Suspense
          fallback={
            <DataTableSkeleton
              columns={COURIERS_PACKAGES_SKELETON_COLUMNS}
              rows={5}
            />
          }
        >
          <PackagesData params={params} />
        </Suspense>
      </div>
    )
  }

  return { Page, generateMetadata }
}

async function PackagesData({ params }: Props) {
  const { slug } = await params
  const context = await resolveTenant(slug, 'Packages')
  if (!context.ok) return context.fallback

  const { orgId, tenantId } = context

  // A package names its customer by courier profile id, and that profile names
  // the party only through the registry — so the same two lists that build the
  // Customers screen resolve every package's customer here.
  const [result, customers, registry] = await Promise.all([
    couriers.packages.list(tenantId),
    couriers.customers.list(tenantId),
    billing.customers.list(orgId),
  ])

  if (result.error)
    return (
      <AppError
        title="Packages are temporarily unavailable"
        error={result.error}
        variant="banner"
        showCode
      />
    )

  const customerRows = toCustomerRows(
    customers.data?.data ?? [],
    registry.data?.data ?? [],
    []
  )

  return (
    <PackagesTable
      packages={toPackageRows(result.data?.data ?? [], customerRows)}
      baseHref={sectionHref(slug, 'packages')}
      emptyState={emptyLine(
        'No packages have been received for this courier yet.'
      )}
    />
  )
}

export function createCouriersBranchesPage() {
  const generateMetadata = metadataFor('Branches')

  function Page({ params }: Props) {
    return (
      <div className="space-y-4">
        <ResourceToolbar title="Branches" refresh />
        <Suspense
          fallback={
            <DataTableSkeleton
              columns={COURIERS_BRANCHES_SKELETON_COLUMNS}
              rows={4}
            />
          }
        >
          <BranchesData params={params} />
        </Suspense>
      </div>
    )
  }

  return { Page, generateMetadata }
}

async function BranchesData({ params }: Props) {
  const { slug } = await params
  const context = await resolveTenant(slug, 'Branches')
  if (!context.ok) return context.fallback

  const { tenantId } = context

  const result = await couriers.branches.list(tenantId)
  if (result.error)
    return (
      <AppError
        title="Branches are temporarily unavailable"
        error={result.error}
        variant="banner"
        showCode
      />
    )

  return (
    <BranchesTable
      branches={toBranchRows(result.data?.data ?? [])}
      baseHref={sectionHref(slug, 'branches')}
      emptyState={emptyLine('No branches exist in this workspace yet.')}
    />
  )
}

export function createCouriersWarehousesPage() {
  const generateMetadata = metadataFor('Warehouses')

  function Page({ params }: Props) {
    return (
      <div className="space-y-4">
        <ResourceToolbar title="Warehouses" refresh />
        <Suspense
          fallback={
            <DataTableSkeleton
              columns={COURIERS_WAREHOUSES_SKELETON_COLUMNS}
              rows={4}
            />
          }
        >
          <WarehousesData params={params} />
        </Suspense>
      </div>
    )
  }

  return { Page, generateMetadata }
}

async function WarehousesData({ params }: Props) {
  const { slug } = await params
  const context = await resolveTenant(slug, 'Warehouses')
  if (!context.ok) return context.fallback

  const { tenantId } = context

  const result = await couriers.warehouses.list(tenantId)
  if (result.error)
    return (
      <AppError
        title="Warehouses are temporarily unavailable"
        error={result.error}
        variant="banner"
        showCode
      />
    )

  return (
    <WarehousesTable
      warehouses={toWarehouseRows(result.data?.data ?? [])}
      baseHref={sectionHref(slug, 'warehouses')}
      emptyState={emptyLine('No warehouses exist in this workspace yet.')}
    />
  )
}

export function createCouriersTeamPage() {
  const generateMetadata = metadataFor('Team')

  function Page({ params }: Props) {
    return (
      <div className="space-y-4">
        <ResourceToolbar title="Team" refresh />
        <Suspense
          fallback={
            <DataTableSkeleton
              columns={COURIERS_TEAM_SKELETON_COLUMNS}
              rows={4}
            />
          }
        >
          <TeamData params={params} />
        </Suspense>
      </div>
    )
  }

  return { Page, generateMetadata }
}

async function TeamData({ params }: Props) {
  const { slug } = await params
  const context = await resolveTenant(slug, 'Team members')
  if (!context.ok) return context.fallback

  const { orgId, tenantId } = context

  // A Couriers membership carries only a user id; the person behind it belongs
  // to the organization directory, which is already resolved once per request.
  const [result, directory] = await Promise.all([
    couriers.team.list(tenantId),
    resolveOrgMembers(orgId),
  ])

  if (result.error)
    return (
      <AppError
        title="Team members are temporarily unavailable"
        error={result.error}
        variant="banner"
        showCode
      />
    )

  return (
    <>
      {directory.error ? (
        <AppError
          title="Member names could not be resolved"
          error={directory.error}
          variant="inline"
          showCode
        />
      ) : null}
      <TeamTable
        members={toTeamRows(result.data?.data ?? [], directory.data)}
        baseHref={sectionHref(slug, 'team')}
        emptyState={emptyLine('No staff have been added to this courier yet.')}
      />
    </>
  )
}
