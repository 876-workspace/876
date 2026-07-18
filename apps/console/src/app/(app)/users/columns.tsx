'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ColumnDef } from '@tanstack/react-table'
import type { AdminUser, AdminUserApp } from '@876/admin'

import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'

import { OrgAvatar as OrgLogo } from '@876/ui/org-avatar'
import { formatDate } from '@/lib/format'

function initialsOf(user: {
  first_name: string
  last_name: string
  email: string
}): string {
  return (
    [user.first_name?.[0], user.last_name?.[0]]
      .filter(Boolean)
      .join('')
      .toUpperCase() ||
    user.email[0]?.toUpperCase() ||
    '?'
  )
}

const APP_COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
]

function appColor(slug: string): string {
  let hash = 0
  for (let i = 0; i < slug.length; i++)
    hash = (hash * 31 + slug.charCodeAt(i)) | 0
  return APP_COLORS[Math.abs(hash) % APP_COLORS.length]!
}

function AppLogoChip({ app }: { app: AdminUserApp }) {
  return app.logo_url ? (
    <Image
      src={app.logo_url}
      alt={app.name}
      title={app.name}
      width={20}
      height={20}
      unoptimized
      className="size-5 rounded-sm object-cover"
    />
  ) : (
    <span
      title={app.name}
      className={`inline-flex size-5 items-center justify-center rounded-sm text-[10px] font-semibold text-white ${appColor(app.slug)}`}
    >
      {app.name[0]?.toUpperCase() ?? '?'}
    </span>
  )
}

export function makeUserColumns(
  enrollmentsMap: Record<string, AdminUserApp[]>
): ColumnDef<AdminUser, unknown>[] {
  return [
    {
      id: 'avatar',
      size: 36,
      enableSorting: false,
      header: () => <span className="sr-only">Avatar</span>,
      cell: ({ row }) => (
        <Avatar className="size-8">
          {row.original.avatar && (
            <AvatarImage src={row.original.avatar} alt="" />
          )}
          <AvatarFallback className="text-xs">
            {initialsOf(row.original)}
          </AvatarFallback>
        </Avatar>
      ),
    },
    {
      accessorKey: 'first_name',
      header: 'Name',
      sortingFn: (a, b) => {
        const nameA =
          [a.original.first_name, a.original.last_name]
            .filter(Boolean)
            .join(' ') || ''
        const nameB =
          [b.original.first_name, b.original.last_name]
            .filter(Boolean)
            .join(' ') || ''
        return nameA.localeCompare(nameB)
      },
      cell: ({ row }) => {
        const user = row.original
        const displayName =
          [user.first_name, user.last_name].filter(Boolean).join(' ') || '—'
        return (
          <div>
            <Link
              href={`/users/${user.username ?? user.id}`}
              className="hover:text-primary font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              {displayName}
            </Link>
            {user.username && (
              <p className="text-muted-foreground text-xs">@{user.username}</p>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.original.email}
        </span>
      ),
    },
    {
      accessorKey: 'company',
      header: 'Company',
      cell: ({ row }) =>
        row.original.company ? (
          <span className="flex items-center gap-2.5 text-sm">
            <OrgLogo
              name={row.original.company}
              src={row.original.company_logo}
              size="sm"
            />
            <span className="truncate">{row.original.company}</span>
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      id: 'apps',
      enableSorting: false,
      header: 'Apps',
      cell: ({ row }) => {
        const apps = enrollmentsMap[row.original.id] ?? []
        if (apps.length === 0)
          return <span className="text-muted-foreground text-sm">—</span>
        return (
          <div className="flex items-center gap-1">
            {apps.slice(0, 3).map((app) => (
              <AppLogoChip key={app.id} app={app} />
            ))}
            {apps.length > 3 && (
              <span className="text-muted-foreground text-xs">
                +{apps.length - 3}
              </span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Joined',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
  ]
}
