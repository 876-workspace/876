import { Suspense, type ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { Calendar, Trash } from '@876/ui/icons'
import { cn } from '@876/core/utils'

import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { FlagStripe } from '@876/ui/flag-stripe'
import { OrgAvatar } from '@876/ui/org-avatar'
import { Skeleton } from '@876/ui/skeleton'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardMeta,
  DetailCardMetaItem,
  DetailCardRouteTabs,
} from '@876/ui/detail-card'
import { DetailChromeGate } from '@/components/patterns/detail/detail-chrome-gate'
import { ChangeImageDialog } from '@/components/patterns/change-image-dialog'
import { formatDate, statusBadgeClass } from '@/lib/format'
import { resolveUser, resolveUserAddresses } from './_data'
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
 * The user detail card. It renders in the layout's detail column beside the
 * persistent user list.
 *
 * The frame awaits `params` and nothing else. Data streams into Suspense
 * islands sized to match, and every island calls the same request-cached
 * `resolveUser`, so this costs one fetch, not several.
 */
export default async function UserDetailLayout({ children, params }: Props) {
  const { username } = await params
  const base = `/users/${username}`

  return (
    <DetailCard aria-label="User">
      <DetailChromeGate
        editHref={`${base}/edit`}
        editChrome={
          <Suspense fallback={<EditHeaderSkeleton base={base} />}>
            <UserEditHeader username={username} />
          </Suspense>
        }
      >
        <>
          <Suspense fallback={<DetailCardHeaderSkeleton />}>
            <UserCardHeader username={username} />
          </Suspense>
          <DetailCardRouteTabs tabs={userTabs(base)} />
        </>
      </DetailChromeGate>
      <DetailCardBody>
        <Suspense fallback={null}>
          <DeletedNotice username={username} />
        </Suspense>
        {children}
      </DetailCardBody>
    </DetailCard>
  )
}

async function DeletedNotice({ username }: { username: string }) {
  const user = await resolveUser(username)
  if (!user?.deleted_at) return null

  return (
    <div
      role="status"
      className="mb-4 flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-700 dark:text-red-400"
    >
      <Trash className="size-4 shrink-0" />
      This user was deleted on {formatDate(user.deleted_at)}. The record is
      retained and visible to Console admins only.
    </div>
  )
}

/**
 * The card header. This is the one piece that decides the route exists, so
 * `notFound()` lives here — the pages under this layout already do the same
 * for their own data.
 */
async function UserCardHeader({ username }: { username: string }) {
  const user = await resolveUser(username)
  if (!user) notFound()

  const displayName = nameOf(user)

  return (
    <DetailCardHeader
      icon={
        <div className="flex items-center gap-2">
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
              {user.avatar && (
                <AvatarImage src={user.avatar} alt={displayName} />
              )}
              <AvatarFallback>{initialsOf(user)}</AvatarFallback>
            </Avatar>
          </ChangeImageDialog>
        </div>
      }
      title={displayName}
      meta={
        user.banned ? (
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
        )
      }
      subtitle={
        <DetailCardMeta>
          {user.username ? (
            <DetailCardMetaItem>@{user.username}</DetailCardMetaItem>
          ) : null}
          {user.company ? (
            <DetailCardMetaItem
              icon={
                <OrgAvatar
                  name={user.company}
                  src={user.company_logo}
                  size="sm"
                  className="size-4 shrink-0 rounded-[5px] text-[0.5rem]"
                />
              }
            >
              {user.company_short_name || user.company}
            </DetailCardMetaItem>
          ) : null}
          <DetailCardMetaItem icon={<Calendar />}>
            Joined {formatDate(user.created_at)}
          </DetailCardMetaItem>
        </DetailCardMeta>
      }
      actions={<UserActions user={user} />}
      closeHref="/users"
      closeLabel="Close user details"
    />
  )
}

function DetailCardHeaderSkeleton() {
  return (
    <DetailCardHeader
      icon={<Skeleton className="size-14 rounded-full sm:size-16" />}
      title={<Skeleton className="h-6 w-44" />}
      subtitle={<Skeleton className="h-3.5 w-72" />}
      actions={<Skeleton className="h-8 w-24" />}
      closeHref="/users"
      closeLabel="Close user details"
    />
  )
}

/**
 * The record header while editing: the record shrinks to one line naming what
 * is being edited, and closing it returns to the record rather than the list.
 */
async function UserEditHeader({ username }: { username: string }) {
  const user = await resolveUser(username)
  if (!user) notFound()

  const displayName = nameOf(user)

  return (
    <DetailCardHeader
      className="items-center py-3"
      icon={
        <Avatar className="size-8 text-xs">
          {user.avatar && <AvatarImage src={user.avatar} alt={displayName} />}
          <AvatarFallback>{initialsOf(user)}</AvatarFallback>
        </Avatar>
      }
      title={<span className="text-base sm:text-lg">Edit {displayName}</span>}
      closeHref={`/users/${username}`}
      closeLabel="Stop editing"
    />
  )
}

function EditHeaderSkeleton({ base }: { base: string }) {
  return (
    <DetailCardHeader
      className="items-center py-3"
      icon={<Skeleton className="size-8 rounded-full" />}
      title={<Skeleton className="h-5 w-48" />}
      closeHref={base}
      closeLabel="Stop editing"
    />
  )
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
