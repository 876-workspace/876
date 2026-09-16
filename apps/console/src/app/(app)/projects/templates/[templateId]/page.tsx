import { Page } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { TemplateDetailData } from '@/features/projects/components/template-detail-data'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { parseTemplateStartDate } from '@/features/projects/template-start'
import { projects } from '@/lib/services/projects'

import { requirePlatformProjectsOrgId } from '../../_lib/base'

type Props = {
  params: Promise<{ templateId: string }>
  searchParams: Promise<{ start?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { templateId } = await params
  const organizationId = await requirePlatformProjectsOrgId()

  const result = await projects.projectTemplates.retrieve(
    organizationId,
    decodeURIComponent(templateId)
  )
  if (!result.data) return { title: 'Template' }

  return { title: `${result.data.name} • Templates` }
}

export default async function PlatformTemplateDetailPage({
  params,
  searchParams,
}: Props) {
  const { templateId } = await params
  const { start } = await searchParams

  return (
    <Page>
      <Suspense fallback={<TemplateDetailFallback />}>
        <TemplateDetailSection templateId={templateId} start={start} />
      </Suspense>
    </Page>
  )
}

async function TemplateDetailSection({
  templateId,
  start,
}: {
  templateId: string
  start: string | undefined
}) {
  const organizationId = await requirePlatformProjectsOrgId()

  return (
    <TemplateDetailData
      organizationId={organizationId}
      base={projectsBase(null)}
      templateId={templateId}
      startDate={parseTemplateStartDate(start)}
    />
  )
}

function TemplateDetailFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-4 w-96" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}
