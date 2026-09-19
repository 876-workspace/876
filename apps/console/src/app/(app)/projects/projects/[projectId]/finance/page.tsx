import { nowUnixSeconds } from '@876/core/timestamps'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { ProjectFinanceData } from '@/features/projects/components/project-finance-data'
import { ProjectTabs } from '@/features/projects/components/project-tabs'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { projects } from '@/lib/clients/projects'

import { requirePlatformProjectsOrgId } from '../../../_lib/base'

const DAY_SECONDS = 86400
const DEFAULT_RANGE_DAYS = 90

function parseTimestamp(value: string | undefined): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

type Props = {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ from?: string; to?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId } = await params
  const organizationId = await requirePlatformProjectsOrgId()

  const result = await projects.projects.retrieve(organizationId, projectId)
  if (!result.data) return { title: 'Finance' }

  return { title: `${result.data.name} • Finance - Projects` }
}

export default async function PlatformProjectFinancePage({
  params,
  searchParams,
}: Props) {
  const { projectId } = await params
  const query = await searchParams
  const base = projectsBase(null)

  const now = nowUnixSeconds()
  const to = parseTimestamp(query.to) ?? now
  const from = parseTimestamp(query.from) ?? to - DEFAULT_RANGE_DAYS * DAY_SECONDS

  return (
    <Page>
      <ProjectTabs base={base} projectId={projectId} />
      <ResourceToolbar title="Finance" refresh />
      <Suspense fallback={<Skeleton className="h-80 w-full rounded-lg" />}>
        <ProjectFinanceSection
          projectId={projectId}
          from={from < to ? from : to - DEFAULT_RANGE_DAYS * DAY_SECONDS}
          to={to}
        />
      </Suspense>
    </Page>
  )
}

async function ProjectFinanceSection({
  projectId,
  from,
  to,
}: {
  projectId: string
  from: number
  to: number
}) {
  const organizationId = await requirePlatformProjectsOrgId()

  return (
    <ProjectFinanceData
      organizationId={organizationId}
      base={projectsBase(null)}
      projectId={projectId}
      from={from}
      to={to}
    />
  )
}
