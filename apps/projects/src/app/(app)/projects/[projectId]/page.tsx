import { ProjectDetail } from '@876/projects-ui/project-detail'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { requireAppPermission } from '@/lib/auth/require-projects-context'
import { requireProjectsContext } from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/services/projects'

type Props = { params: Promise<{ projectId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId } = await params
  return { title: projectId }
}

export default async function ProjectDetailPage({ params }: Props) {
  await requireAppPermission('projects.view')
  const { projectId } = await params
  const { orgId } = await requireProjectsContext()

  const result = await projects.projects.retrieve(orgId, projectId)
  if (!result.data) notFound()

  const issues = await projects.issues.list(orgId, {
    project: result.data.id,
    limit: 25,
  })

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/projects" label="Projects" className="mb-4" />
      <ProjectDetail
        project={result.data}
        issues={issues.data?.data ?? []}
        issuesHref="/issues"
        projectsHref="/projects"
      />
    </div>
  )
}
