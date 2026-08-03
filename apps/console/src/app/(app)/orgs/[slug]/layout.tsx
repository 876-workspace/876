import { Suspense, type ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { Building2, Calendar, Globe, Hash, Mail, Trash } from '@876/ui/icons'
import { cn } from '@876/core/utils'

import { DetailChromeGate } from '@/components/patterns/detail/detail-chrome-gate'
import { ChangeImageDialog } from '@/components/patterns/change-image-dialog'
import { RouteTabs, type RouteTabItem as DetailTab } from '@876/ui/route-tabs'
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
import { resolveOrg, resolveOrgMembers } from './_data'
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

export default async function OrganizationDetailLayout({
  children,
  params,
}: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const base = `/orgs/${slug}`
  const tabs: DetailTab[] = [
    { label: 'Overview', href: base, exact: true },
    {
      label: <MemberTabLabel orgId={org.id} />,
      href: `${base}/members`,
    },
    { label: 'Onboarding', href: `${base}/onboarding` },
    { label: 'Billing', href: `${base}/billing` },
    { label: 'Activity', href: `${base}/activity` },
    { label: 'Notes', href: `${base}/notes` },
  ]

  return (
    <div>
      {org.deleted_at && (
        <DetailHeaderNotice>
          <Trash className="size-4 shrink-0" />
          This organization was deleted on {formatDate(org.deleted_at)}. The
          record is retained and visible to Console admins only.
        </DetailHeaderNotice>
      )}
      <DetailChromeGate>
        <DetailHeader
          condensedTitle={
            <>
              <ChangeImageDialog
                entity="organization"
                routeKey="organization.primaryLogo"
                ownerId={org.id}
                currentImageUrl={org.logo_url}
                currentFileId={org.logo_file_id}
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
              <span className="truncate text-sm font-semibold">
                {org.name ?? org.slug}
              </span>
            </>
          }
        >
          <DetailHeaderTop>
            <DetailHeaderMain>
              <ChangeImageDialog
                entity="organization"
                routeKey="organization.primaryLogo"
                ownerId={org.id}
                currentImageUrl={org.logo_url}
                currentFileId={org.logo_file_id}
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
                      <span className="text-muted-foreground italic">
                        Unnamed
                      </span>
                    )}
                  </h1>
                  <span
                    aria-hidden="true"
                    className="text-muted-foreground/40 text-sm"
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

                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] sm:gap-x-4 sm:text-sm">
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
            </DetailHeaderMain>

            <DetailHeaderActions>
              <OrgActions org={org} />
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

function MemberTabLabel({ orgId }: { orgId: string }) {
  return (
    <Suspense
      fallback={
        <>
          <span>Members</span>{' '}
          <Skeleton className="inline-block h-3 w-5 align-middle" />
        </>
      }
    >
      <MemberCountLabel orgId={orgId} />
    </Suspense>
  )
}

async function MemberCountLabel({ orgId }: { orgId: string }) {
  const membersResult = await resolveOrgMembers(orgId)
  return <>Members ({membersResult?.data.length ?? 0})</>
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
