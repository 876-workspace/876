import { ProjectDetail } from '@876/projects-ui/project-detail'
import { notFound } from 'next/navigation'

import { projects } from '@/lib/services/projects'

export async function ProjectDetailData({
  orgId,
  projectId,
}: {
  orgId: string
  projectId: string
}) {
  const [projectResult, issuesResult] = await Promise.all([
    projects.projects.retrieve(orgId, projectId),
    projects.issues.list(orgId, { project: projectId, limit: 25 }),
  ])

  if (!projectResult.data) notFound()

  return (
    <ProjectDetail
      project={projectResult.data}
      issues={issuesResult.data?.data ?? []}
      issuesHref="/issues"
    />
  )
}
