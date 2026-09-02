'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { ApplicationProvisioningProfile } from '@876/core/types/application-provisioning-profile'
import { cn } from '@876/core/utils'
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

export function ProfilesList({
  profiles,
  slug,
}: {
  profiles: ApplicationProvisioningProfile[]
  slug: string
}) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const selectedKey = segments[0] ?? null
  const open = selectedKey !== null

  // Applied here rather than in the loader because a layout receives no searchParams.
  const status = searchParams.get('status') ?? 'all'
  const rows = useMemo(
    () =>
      status === 'all'
        ? profiles
        : profiles.filter((profile) => profile.status === status),
    [profiles, status]
  )

  if (!open) return <ProfilesTable profiles={rows} slug={slug} />

  return (
    <div className="876-card flex h-full min-h-0 flex-col overflow-hidden">
      <header className="876-header-row shrink-0 border-b px-4 py-3 text-[0.8125rem] font-semibold">
        Profiles
      </header>
      <div className="876-scroll min-h-0 flex-1 overflow-y-auto">
        <Table className="table-fixed">
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell className="text-muted-foreground px-4 py-8 text-center text-xs">
                  No profiles match this view
                </TableCell>
              </TableRow>
            ) : (
              rows.map((profile) => (
                <ProfileRow
                  key={profile.id}
                  profile={profile}
                  slug={slug}
                  selected={profile.key === selectedKey}
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

function ProfilesTable({
  profiles,
  slug,
}: {
  profiles: ApplicationProvisioningProfile[]
  slug: string
}) {
  return (
    <div className="876-card overflow-hidden">
      <Table>
        <TableHeader className="876-header-row">
          <TableRow>
            <TableHead className="px-5 py-3.5">Profile</TableHead>
            <TableHead className="px-5 py-3.5">Description</TableHead>
            <TableHead className="px-5 py-3.5">Published revision</TableHead>
            <TableHead className="px-5 py-3.5">Conditions</TableHead>
            <TableHead className="px-5 py-3.5">Organizations</TableHead>
            <TableHead className="px-5 py-3.5">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-muted-foreground px-5 py-8 text-center text-[0.8125rem]"
              >
                No profiles match this view.
              </TableCell>
            </TableRow>
          ) : (
            profiles.map((profile) => (
              <ProfileRow key={profile.id} profile={profile} slug={slug} />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function ProfileRow({
  profile,
  slug,
  condensed = false,
  selected = false,
}: {
  profile: ApplicationProvisioningProfile
  slug: string
  condensed?: boolean
  selected?: boolean
}) {
  const href = `/apps/${encodeURIComponent(slug)}/provisioning/${encodeURIComponent(profile.key)}`

  if (condensed) {
    return (
      <TableRow
        data-state={selected ? 'selected' : undefined}
        className={cn(
          'transition-colors',
          selected && 'bg-muted/70 font-medium'
        )}
      >
        <TableCell className="relative px-4 py-3">
          <ProfileLink href={href} name={profile.name} />
          <div className="flex min-w-0 items-center gap-1.5">
            <p className="truncate text-[0.8125rem] font-medium text-sky-600 dark:text-sky-400">
              {profile.name}
            </p>
            {profile.is_default ? (
              <Badge
                variant="info"
                className="h-4 shrink-0 px-1 py-0 text-[0.625rem]"
              >
                Default
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground truncate font-mono text-[0.6875rem]">
            {profile.key}
          </p>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow className="transition-colors">
      <TableCell className="relative px-5 py-3.5">
        <ProfileLink href={href} name={profile.name} />
        <span className="font-medium text-sky-600 dark:text-sky-400">
          {profile.name}
        </span>
        {profile.is_default ? (
          <Badge variant="info" className="ml-2">
            Default
          </Badge>
        ) : null}
        <div className="text-muted-foreground font-mono text-xs">
          {profile.key}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground max-w-xs truncate px-5 py-3.5 text-[0.8125rem]">
        {profile.description || '—'}
      </TableCell>
      <TableCell className="px-5 py-3.5 font-mono text-xs tabular-nums">
        {profile.published_revision === null
          ? '—'
          : `r${profile.published_revision}`}
        {profile.has_draft ? (
          <Badge variant="outline" className="ml-2">
            Draft
          </Badge>
        ) : null}
      </TableCell>
      <TableCell className="text-muted-foreground px-5 py-3.5 text-[0.8125rem]">
        {profile.is_default ? (
          <span className="italic">Default fallback</span>
        ) : (
          `${profile.conditions.length} ${
            profile.conditions.length === 1 ? 'condition' : 'conditions'
          }`
        )}
      </TableCell>
      <TableCell className="px-5 py-3.5 tabular-nums">
        {profile.selection_count}
      </TableCell>
      <TableCell className="px-5 py-3.5">
        <Badge
          variant={
            profile.status === 'active'
              ? 'success'
              : profile.status === 'draft'
                ? 'outline'
                : 'secondary'
          }
        >
          {profile.status}
        </Badge>
      </TableCell>
    </TableRow>
  )
}

function ProfileLink({ href, name }: { href: string; name: string }) {
  return (
    <Link
      href={href}
      aria-label={`View profile ${name}`}
      className="focus-visible:ring-ring absolute inset-0 z-10 rounded-sm focus-visible:ring-2 focus-visible:outline-none"
    />
  )
}
