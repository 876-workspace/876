import { Skeleton } from '@876/ui/skeleton'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { TemplateDetailData } from '@/features/projects/components/template-detail-data'
import { projects } from '@/lib/clients/projects'

import { resolveOrg } from '@/features/orgs/org-data'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { parseTemplateStartDate } from '@/features/projects/template-start'

type Props = {
  params: Promise<{ orgSlug: string; templateId: string }>
  searchParams: Promise<{ start?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgSlug, templateId } = await params
  const org = await resolveOrg(orgSlug)
  if (!org) return { title: 'Template' }

  const result = await projects.projectTemplates.retrieve(
    org.id,
    decodeURIComponent(templateId)
  )
  if (!result.data) return { title: 'Template' }

  return { title: `${result.data.name} • Templates - Organizations` }
}

export default async function OrganizationTemplateDetailPage({
  params,
  searchParams,
}: Props) {
  const { orgSlug, templateId } = await params
  const { start } = await searchParams
  const org = await resolveOrg(orgSlug)
  if (!org) notFound()

  return (
    <Suspense fallback={<TemplateDetailFallback />}>
      <TemplateDetailData
        organizationId={org.id}
        base={projectsBase(orgSlug)}
        templateId={templateId}
        startDate={parseTemplateStartDate(start)}
      />
    </Suspense>
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
