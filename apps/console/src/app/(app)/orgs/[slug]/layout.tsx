import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { Building2, Calendar, Globe, Hash, Mail, Trash } from '@876/ui/icons'
import { cn } from '@876/core/utils'

import { DetailChromeGate } from '@/components/detail/detail-chrome-gate'
import { RouteTabs, type RouteTabItem as DetailTab } from '@876/ui/route-tabs'
import {
  DetailHeader,
  DetailHeaderTop,
  DetailHeaderMain,
  DetailHeaderActions,
  DetailHeaderTabs,
} from '@876/ui/detail-header'
import { OrgAvatar as OrgLogo } from '@876/ui/org-avatar'
import { formatDate, statusBadgeClass } from '@/lib/format'
import { resolveOrg, resolveOrgMembers } from './_data'
import { OrgActions } from './org-actions'

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

  const membersResult = await resolveOrgMembers(org.id)
  const memberCount = membersResult?.data.length ?? 0

  const base = `/orgs/${slug}`
  const tabs: DetailTab[] = [
    { label: 'Overview', href: base, exact: true },
    { label: `Members (${memberCount})`, href: `${base}/members` },
    { label: 'Onboarding', href: `${base}/onboarding` },
    { label: 'Billing', href: `${base}/billing` },
    { label: 'Activity', href: `${base}/activity` },
    { label: 'Notes', href: `${base}/notes` },
  ]

  return (
    <div>
      {org.deleted_at && (
        <div className="border-b border-red-400/30 bg-red-500/10 px-4 py-2.5 sm:px-6 lg:px-8">
          <p className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
            <Trash className="size-4 shrink-0" />
            This organization was deleted on {formatDate(org.deleted_at)}. The
            record is retained and visible to Console admins only.
          </p>
        </div>
      )}
      <DetailChromeGate>
        <DetailHeader>
          <DetailHeaderTop>
            <DetailHeaderMain>
              <OrgLogo
                name={org.name}
                src={org.logo_url}
                size="lg"
                className="ring-876-surface size-14 shrink-0 text-lg shadow-sm ring-2 sm:size-16 sm:text-xl"
              />

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
                  <span className="flex shrink-0 items-center gap-1.5">
                    <Building2 className="size-3.5 shrink-0" />
                    {memberCount} {memberCount === 1 ? 'member' : 'members'}
                  </span>
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
