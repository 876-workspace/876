import { Suspense, type ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { AppError } from '@876/ui/app-error'
import { Building2, Calendar, Globe, Hash, Mail, Trash } from '@876/ui/icons'
import { cn } from '@876/core/utils'

import { DetailChromeGate } from '@/components/patterns/detail/detail-chrome-gate'
import { ChangeImageDialog } from '@/components/patterns/change-image-dialog'
import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardMeta,
  DetailCardMetaItem,
  DetailCardRouteTabs,
} from '@876/ui/detail-card'
import { OrgAvatar as OrgLogo } from '@876/ui/org-avatar'
import { Skeleton } from '@876/ui/skeleton'
import { formatDate, statusBadgeClass } from '@/lib/format'
import {
  resolveOrg,
  resolveOrgMembers,
  resolveOrgResult,
  resolveOrgSubscriptions,
} from '@/features/orgs/org-data'
import { orgTabs } from '@/features/orgs/app-tabs'
import { OrgActions } from './_components/org-actions'

type Props = {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) return { title: 'Organization' }
  return { title: `${org.name ?? org.slug} - Organizations` }
}

/**
 * The organization detail card. It renders in the layout's detail column
 * beside the persistent organization list.
 *
 * The frame awaits `params` and nothing else. Data streams into Suspense
 * islands sized to match, and every island calls the same request-cached
 * resolvers, so this costs one fetch per resource, not several.
 */
export default async function OrganizationDetailLayout({
  children,
  params,
}: Props) {
  const { slug } = await params

  return (
    <DetailCard aria-label="Organization">
      <DetailChromeGate>
        <>
          <Suspense fallback={<DetailCardHeaderSkeleton />}>
            <OrgCardHeader slug={slug} />
          </Suspense>
          <Suspense fallback={<DetailCardRouteTabs tabs={orgTabs(slug, [])} />}>
            <EntitledCardTabs slug={slug} />
          </Suspense>
        </>
      </DetailChromeGate>
      <DetailCardBody>
        <Suspense fallback={null}>
          <DeletedNotice slug={slug} />
        </Suspense>
        {children}
      </DetailCardBody>
    </DetailCard>
  )
}

async function DeletedNotice({ slug }: { slug: string }) {
  const org = await resolveOrg(slug)
  if (!org?.deleted_at) return null

  return (
    <div
      role="status"
      className="mb-4 flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-700 dark:text-red-400"
    >
      <Trash className="size-4 shrink-0" />
      This organization was deleted on {formatDate(org.deleted_at)}. The record
      is retained and visible to Console admins only.
    </div>
  )
}

/**
 * The card header. This is the one piece that decides the route exists, so
 * `notFound()` lives here — the pages under this layout already do the same
 * for their own data.
 */
async function OrgCardHeader({ slug }: { slug: string }) {
  const result = await resolveOrgResult(slug)
  if (result.error?.code === 'organization/not-found') notFound()
  if (result.error || !result.data)
    return (
      <DetailCardHeader
        title="Organization details are temporarily unavailable"
        subtitle={result.error?.message ?? 'Unknown error'}
        closeHref="/orgs"
        closeLabel="Close organization details"
      />
    )

  const org = result.data

  return (
    <DetailCardHeader
      icon={
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
      }
      title={
        org.name ?? (
          <span className="text-muted-foreground italic">Unnamed</span>
        )
      }
      meta={
        <span
          className={cn(
            'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
            statusBadgeClass(org.status)
          )}
        >
          {org.status}
        </span>
      }
      subtitle={
        <DetailCardMeta>
          <DetailCardMetaItem icon={<Hash />}>{org.slug}</DetailCardMetaItem>
          <Suspense
            fallback={
              <DetailCardMetaItem icon={<Building2 />}>
                Members <Skeleton className="h-3 w-5" />
              </DetailCardMetaItem>
            }
          >
            <MemberCount orgId={org.id} />
          </Suspense>
          {org.primary_email ? (
            <DetailCardMetaItem icon={<Mail />}>
              {org.primary_email}
            </DetailCardMetaItem>
          ) : null}
          {org.website_url ? (
            <DetailCardMetaItem icon={<Globe />}>
              {org.website_url.replace(/^https?:\/\//, '')}
            </DetailCardMetaItem>
          ) : null}
          <DetailCardMetaItem icon={<Calendar />}>
            Created {formatDate(org.created_at)}
          </DetailCardMetaItem>
        </DetailCardMeta>
      }
      actions={<OrgActions org={org} />}
      closeHref="/orgs"
      closeLabel="Close organization details"
    />
  )
}

function DetailCardHeaderSkeleton() {
  return (
    <DetailCardHeader
      icon={<Skeleton className="size-14 shrink-0 rounded-xl sm:size-16" />}
      title={<Skeleton className="h-6 w-52 max-w-full" />}
      subtitle={<Skeleton className="h-3.5 w-72 max-w-full" />}
      actions={<Skeleton className="h-8 w-24" />}
      closeHref="/orgs"
      closeLabel="Close organization details"
    />
  )
}

async function MemberCount({ orgId }: { orgId: string }) {
  const membersResult = await resolveOrgMembers(orgId)
  if (membersResult.error)
    return (
      <DetailCardMetaItem icon={<Building2 />}>
        Members unavailable
      </DetailCardMetaItem>
    )

  const memberCount = membersResult.data.length
  return (
    <DetailCardMetaItem icon={<Building2 />}>
      {memberCount} {memberCount === 1 ? 'member' : 'members'}
    </DetailCardMetaItem>
  )
}

async function EntitledCardTabs({ slug }: { slug: string }) {
  const org = await resolveOrg(slug)
  if (!org) return <DetailCardRouteTabs tabs={orgTabs(slug, [])} />

  const subscriptions = await resolveOrgSubscriptions(org.id)
  const activeSubscriptions = subscriptions.data.filter(
    (subscription) =>
      subscription.status === 'active' || subscription.status === 'trialing'
  )

  return (
    <>
      <DetailCardRouteTabs tabs={orgTabs(slug, activeSubscriptions)} />
      {subscriptions.error ? (
        <AppError
          title="App entitlement data is temporarily unavailable"
          error={subscriptions.error}
          variant="inline"
          showCode
        />
      ) : null}
    </>
  )
}
