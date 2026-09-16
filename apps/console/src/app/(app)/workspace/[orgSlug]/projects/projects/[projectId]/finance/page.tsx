import { nowUnixSeconds } from '@876/core/timestamps'
import { Skeleton } from '@876/ui/skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { ProjectFinanceData } from '@/features/projects/components/project-finance-data'
import { ProjectTabs } from '@/features/projects/components/project-tabs'
import { projects } from '@/lib/services/projects'

import { resolveOrg } from '@/features/orgs/org-data'
import { projectsBase } from '@/features/orgs/app-workspaces'

const DAY_SECONDS = 86400
const DEFAULT_RANGE_DAYS = 90

function parseTimestamp(value: string | undefined): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

type Props = {
  params: Promise<{ orgSlug: string; projectId: string }>
  searchParams: Promise<{ from?: string; to?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, projectId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Finance' }

  const result = await projects.projects.retrieve(org.id, projectId)
  if (!result.data) return { title: 'Finance' }

  return { title: `${result.data.name} • Finance - Organizations` }
}

export default async function OrganizationProjectFinancePage({
  params,
  searchParams,
}: Props) {
  const { orgSlug, projectId } = await params
  const query = await searchParams
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  const now = nowUnixSeconds()
  const to = parseTimestamp(query.to) ?? now
  const from =
    parseTimestamp(query.from) ?? to - DEFAULT_RANGE_DAYS * DAY_SECONDS

  return (
    <>
      <ProjectTabs base={projectsBase(orgSlug)} projectId={projectId} />
      <ResourceToolbar title="Finance" refresh />
      <Suspense fallback={<Skeleton className="h-80 w-full rounded-lg" />}>
        <ProjectFinanceData
          organizationId={org.id}
          base={projectsBase(orgSlug)}
          projectId={projectId}
          from={from < to ? from : to - DEFAULT_RANGE_DAYS * DAY_SECONDS}
          to={to}
        />
      </Suspense>
    </>
  )
}
