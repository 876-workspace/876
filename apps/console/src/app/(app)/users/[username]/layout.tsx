import { Suspense, type ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { Calendar, Trash } from '@876/ui/icons'
import { cn } from '@876/core/utils'

import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { FlagStripe } from '@876/ui/flag-stripe'
import { OrgAvatar } from '@876/ui/org-avatar'
import { Skeleton } from '@876/ui/skeleton'
import { DetailChromeGate } from '@/components/patterns/detail/detail-chrome-gate'
import { ChangeImageDialog } from '@/components/patterns/change-image-dialog'
import { RouteTabs } from '@876/ui/route-tabs'
import {
  DetailHeader,
  DetailHeaderNotice,
  DetailHeaderTop,
  DetailHeaderMain,
  DetailHeaderActions,
  DetailHeaderTabs,
} from '@876/ui/detail-header'
import { formatDate, statusBadgeClass } from '@/lib/format'
import { resolveUser, resolveUserAddresses, resolveUserContacts } from './_data'
import { userTabs } from './_lib/user-tabs'
import { UserActions } from './_components/user-actions'

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

const badgeBase =
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium'

/**
 * The user detail shell.
 *
 * It awaits `params` and nothing else. That is deliberate: a layout renders
 * *outside* its own `loading.tsx`, so every await here suspends into the parent
 * segment's boundary and replaces whatever the user was looking at — the list
 * they just clicked from. Awaiting the user meant a click on a row could never
 * be instant, no matter how the fallbacks above were shaped.
 *
 * So the frame, the padding and the tab strip render synchronously, and each
 * piece that needs the user streams into its own boundary sized to match. Every
 * streamed piece calls the same request-cached `resolveUser`, so this costs one
 * fetch, not five.
 */
export default async function UserDetailLayout({ children, params }: Props) {
  const { username } = await params
  const base = `/users/${username}`

  return (
    <div>
      <Suspense fallback={null}>
        <DeletedNotice username={username} />
      </Suspense>

      <DetailChromeGate>
        <DetailHeader
          condensedTitle={
            <Suspense fallback={<CondensedTitleFallback />}>
              <CondensedTitle username={username} />
            </Suspense>
          }
        >
          <DetailHeaderTop>
            <DetailHeaderMain>
              <Suspense fallback={<IdentityFallback />}>
                <Identity username={username} />
              </Suspense>
            </DetailHeaderMain>

            <DetailHeaderActions>
              <Suspense fallback={<ActionsFallback />}>
                <HeaderActions username={username} />
              </Suspense>
            </DetailHeaderActions>
          </DetailHeaderTop>

          <DetailHeaderTabs>
            {/* Real, clickable tabs immediately. Only the conditional Contacts
                tab needs data, and its absence is the correct rendering when
                there are no contacts — so the fallback is the tab strip itself,
                never a skeleton. */}
            <Suspense fallback={<RouteTabs tabs={userTabs(base, false)} />}>
              <UserTabs base={base} username={username} />
            </Suspense>
          </DetailHeaderTabs>
        </DetailHeader>
      </DetailChromeGate>

      <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </div>
  )
}

async function DeletedNotice({ username }: { username: string }) {
  const user = await resolveUser(username)
  if (!user?.deleted_at) return null

  return (
    <DetailHeaderNotice>
      <Trash className="size-4 shrink-0" />
      This user was deleted on {formatDate(user.deleted_at)}. The record is
      retained and visible to Console admins only.
    </DetailHeaderNotice>
  )
}

async function CondensedTitle({ username }: { username: string }) {
  const user = await resolveUser(username)
  if (!user) return null

  const displayName = nameOf(user)

  return (
    <>
      <ChangeImageDialog
        entity="user"
        routeKey="user.avatar"
        ownerId={user.id}
        currentImageUrl={user.avatar}
        fallbackName={displayName}
        imageKind="avatar"
        compact
      >
        <Avatar size="sm" className="size-6 shrink-0 text-[0.625rem]">
          {user.avatar && <AvatarImage src={user.avatar} alt={displayName} />}
          <AvatarFallback>{initialsOf(user)}</AvatarFallback>
        </Avatar>
      </ChangeImageDialog>
      <span className="truncate text-[0.8125rem] font-semibold">{displayName}</span>
    </>
  )
}

function CondensedTitleFallback() {
  return (
    <>
      <Skeleton className="size-6 shrink-0 rounded-full" />
      <Skeleton className="h-4 w-36" />
    </>
  )
}

/**
 * The identity block. This is the one piece that decides the route exists, so
 * `notFound()` lives here rather than in the layout body — the pages under this
 * layout already do the same for their own data.
 */
async function Identity({ username }: { username: string }) {
  const user = await resolveUser(username)
  if (!user) notFound()

  const displayName = nameOf(user)

  return (
    <>
      <Suspense
        fallback={<Skeleton className="h-14 w-2 self-center sm:h-16" />}
      >
        <UserCountryFlag userId={user.id} />
      </Suspense>

      <ChangeImageDialog
        entity="user"
        routeKey="user.avatar"
        ownerId={user.id}
        currentImageUrl={user.avatar}
        fallbackName={displayName}
        imageKind="avatar"
      >
        <Avatar
          size="lg"
          className="ring-876-surface size-14 shrink-0 text-lg shadow-sm ring-2 sm:size-16 sm:text-xl"
        >
          {user.avatar && <AvatarImage src={user.avatar} alt={displayName} />}
          <AvatarFallback>{initialsOf(user)}</AvatarFallback>
        </Avatar>
      </ChangeImageDialog>

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
            <span className={cn(badgeBase, statusBadgeClass(user.status))}>
              {user.status}
            </span>
          )}
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] sm:gap-x-4 sm:text-[0.8125rem]">
          {user.username && <span className="truncate">@{user.username}</span>}
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
    </>
  )
}

/** Sized to the resolved identity block so the band does not shift on hand-off. */
function IdentityFallback() {
  return (
    <>
      <Skeleton className="h-14 w-2 self-center sm:h-16" />
      <Skeleton className="size-14 shrink-0 rounded-full sm:size-16" />
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-x-2">
          <Skeleton className="h-7 w-44 max-w-full" />
          <Skeleton className="h-[1.375rem] w-16 rounded-md" />
        </div>
        <Skeleton className="h-5 w-60 max-w-full" />
      </div>
    </>
  )
}

async function HeaderActions({ username }: { username: string }) {
  const user = await resolveUser(username)
  if (!user) return null
  return <UserActions user={user} />
}

function ActionsFallback() {
  return (
    <div className="flex w-full gap-2 sm:w-auto sm:justify-end">
      <Skeleton className="h-8 w-[4.5rem] rounded-md" />
      <Skeleton className="h-8 w-8 rounded-md" />
    </div>
  )
}

async function UserTabs({
  base,
  username,
}: {
  base: string
  username: string
}) {
  const user = await resolveUser(username)
  if (!user) return <RouteTabs tabs={userTabs(base, false)} />

  const contacts = await resolveUserContacts(user.id)
  return <RouteTabs tabs={userTabs(base, contacts.length > 0)} />
}

async function UserCountryFlag({ userId }: { userId: string }) {
  const addresses = await resolveUserAddresses(userId)
  const countryCode =
    addresses.find((address) => address.country_code)?.country_code ?? 'JM'
  return (
    <FlagStripe
      countryCode={countryCode}
      className="h-14 self-center sm:h-16"
    />
  )
}

function nameOf(user: {
  first_name: string
  last_name: string
  email: string
}) {
  return (
    [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
  )
}

function initialsOf(user: {
  first_name: string
  last_name: string
  email: string
}) {
  return (
    [user.first_name?.[0], user.last_name?.[0]]
      .filter(Boolean)
      .join('')
      .toUpperCase() || user.email[0].toUpperCase()
  )
}
