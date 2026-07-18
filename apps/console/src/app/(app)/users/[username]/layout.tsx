import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { Calendar, Trash } from '@876/ui/icons'
import { cn } from '@876/core/utils'

import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { FlagStripe } from '@876/ui/flag-stripe'
import { OrgAvatar } from '@876/ui/org-avatar'
import { DetailChromeGate } from '@/components/detail/detail-chrome-gate'
import { RouteTabs, type RouteTabItem } from '@876/ui/route-tabs'
import {
  DetailHeader,
  DetailHeaderTop,
  DetailHeaderMain,
  DetailHeaderActions,
  DetailHeaderTabs,
} from '@876/ui/detail-header'
import { formatDate, statusBadgeClass } from '@/lib/format'
import { resolveUser, resolveUserAddresses, resolveUserContacts } from './_data'
import { UserActions } from './user-actions'

type Props = {
  children: ReactNode
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props) {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) return { title: 'User not found' }
  const name =
    [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
  return { title: `${name} - Users` }
}

export default async function UserDetailLayout({ children, params }: Props) {
  const { username } = await params
  const user = await resolveUser(username)
  if (!user) notFound()

  const base = `/users/${username}`
  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
  const initials =
    [user.first_name?.[0], user.last_name?.[0]]
      .filter(Boolean)
      .join('')
      .toUpperCase() || user.email[0].toUpperCase()

  // Addresses and contacts are independent — fetch them together rather than
  // letting the country lookup (which reads addresses) serialize ahead of the
  // contacts fetch. The flag-stripe country is then derived locally.
  const [addresses, contacts] = await Promise.all([
    resolveUserAddresses(user.id),
    resolveUserContacts(user.id),
  ])
  const countryCode =
    addresses.find((address) => address.country_code)?.country_code ?? 'JM'
  const hasContacts = contacts.length > 0

  const tabs: RouteTabItem[] = [
    { label: 'Overview', href: base, exact: true },
    {
      label: 'Contacts',
      href: `${base}/contacts`,
      hideUnlessActive: !hasContacts,
    },
    { label: 'Invoices', href: `${base}/invoices` },
    { label: 'Requests', href: `${base}/tickets` },
    { label: 'Notes', href: `${base}/notes` },
    { label: 'Security', href: `${base}/security` },
    { label: 'Audit', href: `${base}/audit` },
  ]

  const badgeBase =
    'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium'

  return (
    <div>
      {user.deleted_at && (
        <div className="border-b border-red-400/30 bg-red-500/10 px-4 py-2.5 sm:px-6 lg:px-8">
          <p className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
            <Trash className="size-4 shrink-0" />
            This user was deleted on {formatDate(user.deleted_at)}. The record
            is retained and visible to Console admins only.
          </p>
        </div>
      )}
      <DetailChromeGate>
        <DetailHeader>
          <DetailHeaderTop>
            <DetailHeaderMain>
              <FlagStripe
                countryCode={countryCode}
                className="h-14 self-center sm:h-16"
              />

              <Avatar
                size="lg"
                className="ring-876-surface size-14 shrink-0 text-lg shadow-sm ring-2 sm:size-16 sm:text-xl"
              >
                {user.avatar && (
                  <AvatarImage src={user.avatar} alt={displayName} />
                )}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h1 className="876-page-title truncate">{displayName}</h1>
                  {user.banned ? (
                    <span
                      className={cn(
                        badgeBase,
                        'border-red-400/40 bg-red-400/10 text-red-700 dark:text-red-400'
                      )}
                    >
                      banned
                    </span>
                  ) : (
                    <span
                      className={cn(badgeBase, statusBadgeClass(user.status))}
                    >
                      {user.status}
                    </span>
                  )}
                </div>

                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] sm:gap-x-4 sm:text-sm">
                  {user.username && (
                    <span className="truncate">@{user.username}</span>
                  )}
                  {user.company && (
                    <span className="flex min-w-0 items-center gap-1.5">
                      <OrgAvatar
                        name={user.company}
                        src={user.company_logo}
                        size="sm"
                        className="size-4 shrink-0 rounded-[5px] text-[0.5rem]"
                      />
                      <span className="max-w-[160px] truncate sm:max-w-[200px]">
                        {user.company_short_name || user.company}
                      </span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 shrink-0" />
                    Joined {formatDate(user.created_at)}
                  </span>
                </div>
              </div>
            </DetailHeaderMain>

            <DetailHeaderActions>
              <UserActions user={user} />
            </DetailHeaderActions>
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
