import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import type {
  AccountingImportResourceType,
  AccountingProviderImportCandidate,
} from '@876/billing/operator'
import { Button, buttonVariants } from '@876/ui/button'
import { CircleStackIcon } from '@876/ui/icons'
import { Page, PageBreadcrumb } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import { AdoptionRow } from './_components/adoption-row'
import {
  canManageBilling,
  requirePagePermission,
} from '@/lib/auth/billing-context'
import { service } from '@/lib/service'
import { getAccountingProviderClient } from '@/lib/services/accounting-providers'

type Props = {
  params: Promise<{ connectionId: string }>
  searchParams: Promise<{ type?: string; page?: string }>
}

type LocalOption = {
  value: string
  label: string
  secondary: string | null
}

type CandidatePage = {
  data: AccountingProviderImportCandidate[]
  has_more: boolean
}

export const metadata = { title: 'Adopt Accounting Records - Settings' }

export default async function AccountingProviderImportsPage({
  params,
  searchParams,
}: Props) {
  const context = await requirePagePermission('settings:read')
  if (!canManageBilling(context.role)) redirect('/no-access?reason=permission')

  const { connectionId } = await params
  const query = await searchParams
  const resourceType: AccountingImportResourceType =
    query.type === 'item' ? 'item' : 'customer'
  const pageNumber = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1)
  const accounting = await getAccountingProviderClient()
  const connectionResult =
    await accounting.accountingProviders.connections.retrieve({
      organizationId: context.orgId,
      connectionId,
    })
  const connection = connectionResult.data

  let candidates: CandidatePage | null = null
  let candidateError: string | null = null
  let localOptions: LocalOption[] = []
  let localError: string | null = null

  if (connection?.status === 'active') {
    const [remote, local] = await Promise.all([
      accounting.accountingProviders.connections.imports.list({
        organizationId: context.orgId,
        connectionId,
        resourceType,
        page: pageNumber,
        perPage: 50,
      }),
      loadLocalOptions(context.tenant.id, resourceType),
    ])
    candidates = remote.data
    candidateError = remote.error?.message ?? null
    localOptions = local.data
    localError = local.error
  }

  const rows = candidates?.data ?? []

  return (
    <Page>
      <PageBreadcrumb
        href="/settings/accounting-providers"
        label="Accounting providers"
        className="mb-4"
      />
      <ResourceToolbar
        title="Adopt provider records"
        titleFilter={
          <StatusFilterHeading
            label="Adopt provider records"
            value="all"
            options={[{ value: 'all', label: 'All Provider Records' }]}
          />
        }
        description={
          connection
            ? `Map existing ${connection.providerKey} records to canonical 876 Billing records. Adoption does not overwrite either side.`
            : 'Map existing accounting-provider records to canonical 876 Billing records.'
        }
        refresh
      />

      <div className="space-y-5">
        {connectionResult.error ? (
          <Notice>{connectionResult.error.message}</Notice>
        ) : null}

        {connection && connection.status !== 'active' ? (
          <Notice>
            This connection must be active before provider records can be
            inspected or adopted. Return to Accounting providers and connect it
            first.
          </Notice>
        ) : null}

        {candidateError ? <Notice>{candidateError}</Notice> : null}
        {localError ? <Notice>{localError}</Notice> : null}

        <div className="flex flex-wrap gap-2">
          <Link
            href="?type=customer&page=1"
            className={buttonVariants({
              size: 'sm',
              variant: resourceType === 'customer' ? 'default' : 'outline',
            })}
          >
            Customers
          </Link>
          <Link
            href="?type=item&page=1"
            className={buttonVariants({
              size: 'sm',
              variant: resourceType === 'item' ? 'default' : 'outline',
            })}
          >
            Items
          </Link>
        </div>

        <div className="876-card overflow-hidden">
          {connection?.status !== 'active' ? (
            <EmptyMessage title="Provider connection is not active" />
          ) : candidateError ? (
            <EmptyMessage title="Provider records are temporarily unavailable" />
          ) : rows.length === 0 ? (
            <EmptyMessage title="No provider records on this page" />
          ) : (
            <div className="divide-border divide-y">
              {rows.map((candidate) => (
                <AdoptionRow
                  key={candidate.externalId}
                  connectionId={connectionId}
                  resourceType={resourceType}
                  candidate={candidate}
                  localOptions={localOptions}
                />
              ))}
            </div>
          )}
        </div>

        {connection?.status === 'active' ? (
          <div className="flex items-center justify-between gap-3">
            {pageNumber > 1 ? (
              <Link
                href={`?type=${resourceType}&page=${Math.max(1, pageNumber - 1)}`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Previous
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
            )}
            <span className="text-muted-foreground text-xs tabular-nums">
              Page {pageNumber}
            </span>
            {candidates?.has_more ? (
              <Link
                href={`?type=${resourceType}&page=${pageNumber + 1}`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Next
              </Link>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </Page>
  )
}

async function loadLocalOptions(
  tenantId: string,
  resourceType: AccountingImportResourceType
): Promise<{ data: LocalOption[]; error: string | null }> {
  try {
    const rows =
      resourceType === 'customer'
        ? await service.customers.list(tenantId, 'ACTIVE')
        : await service.items.list(tenantId, true)
    return {
      data: rows.map((row) => ({
        value: String(row.id),
        label:
          resourceType === 'customer'
            ? String(row.companyName ?? row.name ?? row.id)
            : String(row.name ?? row.id),
        secondary:
          resourceType === 'customer'
            ? typeof row.email === 'string'
              ? row.email
              : null
            : typeof row.sku === 'string'
              ? row.sku
              : null,
      })),
      error: null,
    }
  } catch {
    return {
      data: [],
      error: `Active Billing ${resourceType === 'customer' ? 'customers' : 'items'} could not be loaded.`,
    }
  }
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="border-warning/30 bg-warning/5 text-warning rounded-lg border px-4 py-3 text-sm">
      {children}
    </div>
  )
}

function EmptyMessage({ title }: { title: string }) {
  return (
    <div className="px-5 py-12 text-center">
      <CircleStackIcon className="text-muted-foreground mx-auto size-6" />
      <p className="mt-3 font-medium">{title}</p>
    </div>
  )
}
