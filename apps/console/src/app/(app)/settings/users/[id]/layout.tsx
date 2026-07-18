import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { Badge } from '@876/ui/badge'
import { DetailChromeGate } from '@/components/detail/detail-chrome-gate'
import { RouteTabs, type RouteTabItem as DetailTab } from '@876/ui/route-tabs'
import {
  DetailHeader,
  DetailHeaderTop,
  DetailHeaderMain,
  DetailHeaderTabs,
} from '@876/ui/detail-header'

import { resolveMemberGrant, resolveMemberIdentity } from './_data'

const ROLE_BADGE_CLASS: Record<string, string> = {
  super_admin:
    'border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-400',
  owner:
    'border-purple-400/40 bg-purple-400/10 text-purple-700 dark:text-purple-400',
  admin: 'border-sky-400/40 bg-sky-400/10 text-sky-700 dark:text-sky-400',
  staff:
    'border-emerald-400/40 bg-emerald-400/10 text-emerald-700 dark:text-emerald-400',
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  owner: 'Owner',
  admin: 'Admin',
  staff: 'Staff',
}

type Props = { children: ReactNode; params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const [grant, identity] = await Promise.all([
    resolveMemberGrant(id),
    resolveMemberIdentity(id),
  ])
  if (!grant) return { title: 'Member not found' }
  const name =
    [identity?.first_name, identity?.last_name].filter(Boolean).join(' ') ||
    identity?.email ||
    id
  return { title: `${name} - Team` }
}

export default async function TeamMemberLayout({ children, params }: Props) {
  const { id } = await params
  const [grant, identity] = await Promise.all([
    resolveMemberGrant(id),
    resolveMemberIdentity(id),
  ])
  if (!grant) notFound()

  const base = `/settings/users/${id}`
  const tabs: DetailTab[] = [
    { label: 'Overview', href: base, exact: true },
    { label: 'Tickets', href: `${base}/tickets` },
    { label: 'Permissions', href: `${base}/permissions` },
    { label: 'Notes', href: `${base}/notes` },
    { label: 'Audit', href: `${base}/audit` },
  ]

  const displayName =
    [identity?.first_name, identity?.last_name].filter(Boolean).join(' ') ||
    identity?.email ||
    id

  const initials =
    [identity?.first_name?.[0], identity?.last_name?.[0]]
      .filter(Boolean)
      .join('')
      .toUpperCase() || (identity?.email?.[0] ?? '?').toUpperCase()

  return (
    <div>
      <DetailChromeGate>
        <DetailHeader className="border-876-surface-border border-b sm:static sm:z-auto">
          <DetailHeaderTop className="px-4 pt-4 pb-4 sm:px-6 lg:px-8">
            <DetailHeaderMain className="gap-3.5">
              <Avatar className="ring-876-surface size-11 shrink-0 shadow-sm ring-2">
                {identity?.avatar && (
                  <AvatarImage src={identity.avatar} alt="" />
                )}
                <AvatarFallback className="text-sm">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h2 className="truncate text-base font-semibold tracking-tight">
                    {displayName}
                  </h2>
                  <Badge
                    variant="outline"
                    className={ROLE_BADGE_CLASS[grant.roleName] ?? ''}
                  >
                    {ROLE_LABELS[grant.roleName] ?? grant.roleName}
                  </Badge>
                  {grant.status !== 'active' && (
                    <Badge
                      variant="outline"
                      className="border-red-400/40 bg-red-400/10 text-red-700 dark:text-red-400"
                    >
                      {grant.status}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-0.5 truncate text-sm">
                  {identity?.email}
                </p>
              </div>
            </DetailHeaderMain>
          </DetailHeaderTop>
          <DetailHeaderTabs>
            <RouteTabs tabs={tabs} />
          </DetailHeaderTabs>
        </DetailHeader>
      </DetailChromeGate>

      <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </div>
  )
}
