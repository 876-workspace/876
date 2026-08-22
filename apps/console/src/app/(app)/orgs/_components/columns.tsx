'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import type { AdminOrganization, AdminSubscription } from '@876/admin'
import { cn } from '@876/core/utils'

import { OrgAvatar as OrgLogo } from '@876/ui/org-avatar'
import { appColor } from '@/lib/app-color'
import { formatDate, statusBadgeClass } from '@/lib/format'

function AppLogos({ access }: { access: AdminSubscription[] }) {
  const active = access.filter(
    (item) => item.status === 'active' && item.app_kind === 'product'
  )
  if (active.length === 0)
    return <span className="text-muted-foreground text-xs">—</span>

  return (
    <div className="flex items-center gap-2">
      {active.slice(0, 3).map((item) => {
        const label = item.app_name || item.app_slug || item.app_id
        const appKey = item.app_slug || item.app_id
        const initial = label.trim().charAt(0).toUpperCase() || 'A'

        return item.app_logo_url ? (
          <Image
            key={item.id}
            src={item.app_logo_url}
            alt={label}
            title={label}
            width={20}
            height={20}
            unoptimized
            className="size-5 rounded-sm object-cover"
          />
        ) : (
          <span
            key={item.id}
            title={label}
            aria-label={label}
            className={`inline-flex size-5 items-center justify-center rounded-sm text-[10px] font-semibold text-white ${appColor(appKey)}`}
          >
            {initial}
          </span>
        )
      })}
      {active.length > 3 && (
        <span className="text-muted-foreground text-xs">
          +{active.length - 3}
        </span>
      )}
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
            className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.name}
          </Link>
        </div>
      ),
    },
    {
      accessorKey: 'primary_contact_user_id',
      header: 'Primary Contact',
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.primary_contact_user_id ?? '—'}
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
      accessorKey: 'created_at',
      header: 'Joined',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-[0.8125rem]">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={cn(
            'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
            statusBadgeClass(row.original.status)
          )}
        >
          {row.original.status}
        </span>
      ),
    },
  ]
}

/** @deprecated use buildOrgColumns */
export const orgColumns = buildOrgColumns({})
