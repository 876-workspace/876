'use client'

import Link from 'next/link'
import type { AdminProvisioningSetup } from '@876/admin'
import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import { cn } from '@876/core/utils'
import { Badge } from '@876/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

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
    <div className="876-card flex h-full min-h-0 flex-col overflow-hidden">
      <header className="876-header-row shrink-0 border-b px-4 py-3 text-[0.8125rem] font-semibold">
        Setups
      </header>
      <div className="876-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <Table>
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
            <TableHead className="px-5 py-3.5">Country</TableHead>
            <TableHead className="px-5 py-3.5">Currency</TableHead>
            <TableHead className="px-5 py-3.5">Revision</TableHead>
            <TableHead className="px-5 py-3.5">Organizations</TableHead>
            <TableHead className="px-5 py-3.5">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {setups.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
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
            <p className="text-foreground truncate text-[0.8125rem] font-medium">
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
      <TableCell className="text-muted-foreground px-5 py-3.5">
        {setup.country_code ?? '—'}
      </TableCell>
      <TableCell className="text-muted-foreground px-5 py-3.5">
        {setup.currency_code ?? '—'}
      </TableCell>
      <TableCell className="px-5 py-3.5 tabular-nums">
        {setup.published_revision ?? '—'}
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
