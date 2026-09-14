'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneItem,
} from '@876/ui/list-pane'

import { resolvePackageStatusFilter } from '../_lib/packages-list-config'
import { PackagesTable, type PackageTableRow } from './packages-table'

type Props = {
  packages: PackageTableRow[]
  orgSlug: string
  emptyState?: ReactNode
}

export function PackagesList({ packages, orgSlug, emptyState }: Props) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedId = segments[0] === 'new' ? null : (segments[0] ?? null)
  const status = resolvePackageStatusFilter(searchParams.get('status'))
  const category = searchParams.get('category')
  const statusRows =
    status === 'all'
      ? packages
      : packages.filter((row) => row.statusCode === status)
  // Filter client-side because layouts receive no searchParams and this list holds every page.
  const rows = category
    ? statusRows.filter((row) => row.categoryId === category)
    : statusRows

  if (segments.length === 0)
    return (
      <PackagesTable
        packages={rows}
        orgSlug={orgSlug}
        emptyState={emptyState}
      />
    )

  const baseHref = `/${orgSlug}/packages`

  return (
    <ListPane>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>No packages</ListPaneEmpty>
        ) : (
          rows.map((pkg) => (
            <ListPaneItem
              key={pkg.id}
              href={
                query
                  ? `${baseHref}/${pkg.id}?${query}`
                  : `${baseHref}/${pkg.id}`
              }
              selected={pkg.id === selectedId}
              label={`View package ${pkg.trackingNumber}`}
              title={
                <span className="text-sky-600 dark:text-sky-400">
                  {pkg.trackingNumber}
                </span>
              }
              subtitle={`${pkg.customerName} · ${pkg.category}`}
              trailing={<PackageStatusBadge status={pkg.status} />}
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}

function PackageStatusBadge({ status }: { status: string }) {
  const variant =
    status === 'Collected' || status === 'Arrived'
      ? 'success'
      : status === 'Ready for pickup'
        ? 'info'
        : status === 'Unclaimed'
          ? 'destructive'
          : 'secondary'

  return <Badge variant={variant}>{status}</Badge>
}
