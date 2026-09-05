import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { projects } from '@/lib/services/projects'
import { ProjectDetail } from '@876/projects-ui/project-detail'

export async function ProjectDetailData({
  organizationId,
  base,
  projectId,
}: {
  organizationId: string
  base: string
  projectId: string
}) {
  const [projectResult, issuesResult] = await Promise.all([
    projects.projects.retrieve(organizationId, projectId),
    projects.issues.list(organizationId, { project: projectId }),
  ])

  if (projectResult.error?.code === 'projects/project-not-found') notFound()

  if (projectResult.error || !projectResult.data) {
    return (
      <AppError
        title="Project could not be loaded"
        error={projectResult.error}
        variant="banner"
        showCode
      />
    )
  }

  return (
    <ProjectDetail
      project={projectResult.data}
      issues={issuesResult.data?.data ?? []}
      issuesHref={`${base}/issues`}
    />
  )
}
