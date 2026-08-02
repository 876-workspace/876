'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import type { AdminOrganization, AdminSubscription } from '@876/admin'
import { cn } from '@876/core/utils'

import { OrgAvatar as OrgLogo } from '@876/ui/org-avatar'
import { formatDate, statusBadgeClass } from '@/lib/format'

function AppLogos({ access }: { access: AdminSubscription[] }) {
  const active = access.filter(
    (item) => item.status === 'active' && item.app_kind === 'product'
  )
  if (active.length === 0)
    return <span className="text-muted-foreground text-xs">—</span>

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {active.map((item) => {
        const label = item.app_name || item.app_slug || item.app_id
        const initial = label.trim().charAt(0).toUpperCase() || 'A'
        return (
          <span
            key={item.id}
            title={label}
            aria-label={label}
            className="border-876-surface-border bg-background inline-flex size-7 items-center justify-center overflow-hidden rounded-md border text-[11px] font-semibold"
          >
            {item.app_logo_url ? (
              <Image
                src={item.app_logo_url}
                alt=""
                width={28}
                height={28}
                unoptimized
                className="size-full object-cover"
              />
            ) : (
              initial
            )}
          </span>
        )
      })}
    </div>
  )
}

export function buildOrgColumns(
  subscriptionsMap: Record<string, AdminSubscription[]>
): ColumnDef<AdminOrganization, unknown>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <OrgLogo
            name={row.original.name}
            src={row.original.logo_url}
            size="sm"
          />
          <Link
            href={`/orgs/${row.original.slug}`}
            className="hover:text-primary font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.name}
          </Link>
        </div>
      ),
    },
    {
      accessorKey: 'slug',
      header: 'Slug',
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.slug}
        </span>
      ),
    },
    {
      id: 'apps',
      header: 'Apps',
      cell: ({ row }) => (
        <AppLogos access={subscriptionsMap[row.original.id] ?? []} />
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={cn(
            'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
            statusBadgeClass(row.original.status)
          )}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
  ]
}

/** @deprecated use buildOrgColumns */
export const orgColumns = buildOrgColumns({})
