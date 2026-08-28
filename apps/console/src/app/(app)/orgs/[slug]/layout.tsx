import { Suspense, type ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { Building2, Calendar, Globe, Hash, Mail, Trash } from '@876/ui/icons'
import { cn } from '@876/core/utils'

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
import { OrgAvatar as OrgLogo } from '@876/ui/org-avatar'
import { Skeleton } from '@876/ui/skeleton'
import { formatDate, statusBadgeClass } from '@/lib/format'
import { resolveOrg, resolveOrgMembers, resolveOrgSubscriptions } from './_data'
import { orgTabs } from '@/features/orgs/app-tabs'
import { OrgActions } from './_components/org-actions'

type Props = {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Organization not found' }
  return { title: `${org.name ?? org.slug} - Organizations` }
}

/**
 * The organization detail shell.
 *
 * It awaits `params` and nothing else, for the reason spelled out in the user
 * detail layout: a layout renders outside its own `loading.tsx`, so an await here
 * suspends into the parent boundary and tears down the list the record was
 * opened from. Frame, padding and tabs are synchronous; the identity band and
 * actions stream into boundaries sized to match.
 */
export default async function OrganizationDetailLayout({
  children,
  params,
}: Props) {
  const { slug } = await params
  const base = `/orgs/${slug}`

  return (
    <div>
      <Suspense fallback={null}>
        <DeletedNotice slug={slug} />
      </Suspense>

      <DetailChromeGate>
        <DetailHeader
          condensedTitle={
            <Suspense fallback={<CondensedTitleFallback />}>
              <CondensedTitle slug={slug} />
            </Suspense>
          }
        >
          <DetailHeaderTop>
            <DetailHeaderMain>
              <Suspense fallback={<IdentityFallback />}>
                <Identity slug={slug} />
              </Suspense>
            </DetailHeaderMain>

            <DetailHeaderActions>
              <Suspense fallback={<ActionsFallback />}>
                <HeaderActions slug={slug} />
              </Suspense>
            </DetailHeaderActions>
          </DetailHeaderTop>

          <DetailHeaderTabs>
            <Suspense fallback={<RouteTabs tabs={orgTabs(base, [])} />}>
              <EntitledTabs base={base} slug={slug} />
            </Suspense>
          </DetailHeaderTabs>
        </DetailHeader>
      </DetailChromeGate>

      <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </div>
  )
}

async function DeletedNotice({ slug }: { slug: string }) {
  const org = await resolveOrg(slug)
  if (!org?.deleted_at) return null

  return (
    <DetailHeaderNotice>
      <Trash className="size-4 shrink-0" />
      This organization was deleted on {formatDate(org.deleted_at)}. The record
      is retained and visible to Console admins only.
    </DetailHeaderNotice>
  )
}

async function CondensedTitle({ slug }: { slug: string }) {
  const org = await resolveOrg(slug)
  if (!org) return null

  return (
    <>
      <ChangeImageDialog
        entity="organization"
        routeKey="organization.primaryLogo"
        ownerId={org.id}
        currentImageUrl={org.logo_url}
        fallbackName={org.name ?? org.slug}
        imageKind="logo"
        compact
      >
        <OrgLogo
          name={org.name}
          src={org.logo_url}
          size="sm"
          className="size-6 shrink-0 text-[0.625rem]"
        />
      </ChangeImageDialog>
      <span className="truncate text-[0.8125rem] font-semibold">
        {org.name ?? org.slug}
      </span>
    </>
  )
}

function CondensedTitleFallback() {
  return (
    <>
      <Skeleton className="size-6 shrink-0 rounded-md" />
      <Skeleton className="h-4 w-40" />
    </>
  )
}

/** Decides the route exists, so `notFound()` belongs here rather than in the shell. */
async function Identity({ slug }: { slug: string }) {
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return (
    <>
      <ChangeImageDialog
        entity="organization"
        routeKey="organization.primaryLogo"
        ownerId={org.id}
        currentImageUrl={org.logo_url}
        fallbackName={org.name ?? org.slug}
        imageKind="logo"
      >
        <OrgLogo
          name={org.name}
          src={org.logo_url}
          size="lg"
          className="ring-876-surface size-14 shrink-0 text-lg shadow-sm ring-2 sm:size-16 sm:text-xl"
        />
      </ChangeImageDialog>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <h1 className="876-page-title min-w-0 truncate">
            {org.name ?? (
              <span className="text-muted-foreground italic">Unnamed</span>
            )}
          </h1>
          <span
            aria-hidden="true"
            className="text-muted-foreground/40 text-[0.8125rem]"
          >
            ·
          </span>
          <span
            className={cn(
              'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
              statusBadgeClass(org.status)
            )}
          >
            {org.status}
          </span>
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] sm:gap-x-4 sm:text-[0.8125rem]">
          <span className="flex min-w-0 items-center gap-1.5">
            <Hash className="size-3.5 shrink-0" />
            <span className="max-w-[160px] truncate sm:max-w-[220px]">
              {org.slug}
            </span>
          </span>
          <MemberCount orgId={org.id} />
          {org.primary_email && (
            <span className="flex min-w-0 items-center gap-1.5">
              <Mail className="size-3.5 shrink-0" />
              <span className="max-w-[180px] truncate sm:max-w-[240px]">
                {org.primary_email}
              </span>
            </span>
          )}
          {org.website_url && (
            <span className="flex min-w-0 items-center gap-1.5">
              <Globe className="size-3.5 shrink-0" />
              <span className="max-w-[180px] truncate sm:max-w-[240px]">
                {org.website_url.replace(/^https?:\/\//, '')}
              </span>
            </span>
          )}
          <span className="flex shrink-0 items-center gap-1.5">
            <Calendar className="size-3.5 shrink-0" />
            Created {formatDate(org.created_at)}
          </span>
        </div>
      </div>
    </>
  )
}

/** Sized to the resolved identity band so nothing shifts on hand-off. */
function IdentityFallback() {
  return (
    <>
      <Skeleton className="size-14 shrink-0 rounded-xl sm:size-16" />
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-x-2">
          <Skeleton className="h-7 w-52 max-w-full" />
          <Skeleton className="h-[1.375rem] w-16 rounded-md" />
        </div>
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>
    </>
  )
}

async function HeaderActions({ slug }: { slug: string }) {
  const org = await resolveOrg(slug)
  if (!org) return null
  return <OrgActions org={org} />
}

function ActionsFallback() {
  return (
    <div className="flex w-full gap-2 sm:w-auto sm:justify-end">
      <Skeleton className="h-8 w-[4.5rem] rounded-md" />
      <Skeleton className="h-8 w-8 rounded-md" />
    </div>
  )
}

function MemberCount({ orgId }: { orgId: string }) {
  return (
    <Suspense
      fallback={
        <span className="flex shrink-0 items-center gap-1.5">
          <Building2 className="size-3.5 shrink-0" />
          Members <Skeleton className="h-3 w-5" />
        </span>
      }
    >
      <MemberCountValue orgId={orgId} />
    </Suspense>
  )
}

async function MemberCountValue({ orgId }: { orgId: string }) {
  const membersResult = await resolveOrgMembers(orgId)
  const memberCount = membersResult?.data.length ?? 0
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <Building2 className="size-3.5 shrink-0" />
      {memberCount} {memberCount === 1 ? 'member' : 'members'}
    </span>
  )
}

/**
 * Streams the full, entitlement-aware tab strip.
 *
 * Resolves the org and then its active/trialing app entitlements. Because
 * `resolveOrg` is memoised with `React.cache`, the call here dedupes with the
 * parallel `Identity` fetch. The parent layout renders this inside a
 * `<Suspense>` whose fallback is the always-present baseline tabs — real,
 * clickable, and never a skeleton — so navigation is instant regardless of how
 * long the entitlement fetch takes.
 */
async function EntitledTabs({ base, slug }: { base: string; slug: string }) {
  const org = await resolveOrg(slug)
  if (!org) {
    // notFound() is called by the Identity component in its own boundary;
    // return the baseline strip here so the fallback doesn't flicker.
    return <RouteTabs tabs={orgTabs(base, [])} />
  }

  const subscriptions = await resolveOrgSubscriptions(org.id)
  const entitledAppSlugs = (subscriptions ?? [])
    .filter((s) => s.status === 'active' || s.status === 'trialing')
    .flatMap((s) => (s.app_slug ? [s.app_slug] : []))

  return <RouteTabs tabs={orgTabs(base, entitledAppSlugs)} />
}
