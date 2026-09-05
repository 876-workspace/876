'use client'

import { cn } from '@876/core/utils'
import type { AdminProvisioningSetup } from '@876/platform/compat'
import { Badge } from '@876/ui/badge'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'

export function SetupsList({ setups }: { setups: AdminProvisioningSetup[] }) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const selectedKey = segments[0] ?? null
  const open = selectedKey !== null

  // Applied here rather than in the loader because a layout receives no
  // `searchParams`.
  const status = searchParams.get('status') ?? 'all'
  const rows = useMemo(
    () =>
      status === 'all'
        ? setups
        : setups.filter((setup) => setup.status === status),
    [setups, status]
  )

  if (!open) return <SetupsTable setups={rows} />

  return (
    <div className="876-card overflow-hidden">
      <Table className="table-fixed">
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell className="text-muted-foreground px-4 py-8 text-center text-xs">
                No setups match this view
              </TableCell>
            </TableRow>
          ) : (
            rows.map((setup) => (
              <SetupRow
                key={setup.id}
                setup={setup}
                selected={setup.key === selectedKey}
                condensed
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function SetupsTable({ setups }: { setups: AdminProvisioningSetup[] }) {
  return (
    <div className="876-card overflow-hidden">
      <Table>
        <TableHeader className="876-header-row">
          <TableRow>
            <TableHead className="px-5 py-3.5">Setup</TableHead>
            <TableHead className="px-5 py-3.5">Description</TableHead>
            <TableHead className="px-5 py-3.5">Published revision</TableHead>
            <TableHead className="px-5 py-3.5">Organizations</TableHead>
            <TableHead className="px-5 py-3.5">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {setups.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-muted-foreground px-5 py-8 text-center text-[0.8125rem]"
              >
                No setups match this view.
              </TableCell>
            </TableRow>
          ) : (
            setups.map((setup) => <SetupRow key={setup.id} setup={setup} />)
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function SetupRow({
  setup,
  condensed = false,
  selected = false,
}: {
  setup: AdminProvisioningSetup
  condensed?: boolean
  selected?: boolean
}) {
  const href = `/settings/orgs/provisioning/${encodeURIComponent(setup.key)}`
  if (condensed)
    return (
      <TableRow
        data-state={selected ? 'selected' : undefined}
        className={cn(
          'transition-colors',
          selected && 'bg-muted/70 font-medium'
        )}
      >
        <TableCell className="relative px-4 py-3">
          <SetupLink href={href} name={setup.name} />
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="truncate text-[0.8125rem] font-medium text-sky-600 dark:text-sky-400">
              {setup.name}
            </p>
            {setup.is_default ? (
              <Badge
                variant="info"
                className="h-4 shrink-0 px-1 py-0 text-[0.625rem]"
              >
                Default
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground truncate font-mono text-[0.6875rem]">
            {setup.key}
          </p>
        </TableCell>
      </TableRow>
    )

  return (
    <TableRow className="transition-colors">
      <TableCell className="relative px-5 py-3.5">
        <SetupLink href={href} name={setup.name} />
        <span className="font-medium text-sky-600 dark:text-sky-400">
          {setup.name}
        </span>
        {setup.is_default ? (
          <Badge variant="info" className="ml-2">
            Default
          </Badge>
        ) : null}
        <div className="text-muted-foreground font-mono text-xs">
          {setup.key}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground max-w-xs truncate px-5 py-3.5 text-[0.8125rem]">
        {setup.description || '—'}
      </TableCell>
      <TableCell className="px-5 py-3.5 font-mono text-xs tabular-nums">
        {setup.published_revision === null
          ? '—'
          : `v${setup.published_revision}`}
        {setup.has_draft ? (
          <Badge variant="outline" className="ml-2">
            Draft
          </Badge>
        ) : null}
      </TableCell>
      <TableCell className="px-5 py-3.5 tabular-nums">
        {setup.organization_count}
      </TableCell>
      <TableCell className="px-5 py-3.5">
        <Badge variant={setup.status === 'active' ? 'success' : 'secondary'}>
          {setup.status}
        </Badge>
      </TableCell>
    </TableRow>
  )
}

function SetupLink({ href, name }: { href: string; name: string }) {
  return (
    <Link
      href={href}
      aria-label={`View setup ${name}`}
      className="focus-visible:ring-ring absolute inset-0 z-10 rounded-sm focus-visible:ring-2 focus-visible:outline-none"
    />
  )
}
