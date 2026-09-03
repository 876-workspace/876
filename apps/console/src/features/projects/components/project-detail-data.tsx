import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { projects } from '@/lib/services/projects'
import { ProjectDetail } from '@876/projects-ui/project-detail'

import { resolveOrg } from '../../../app/(app)/orgs/[slug]/_data'

export async function ProjectDetailData({
  slug,
  projectId,
}: {
  slug: string
  projectId: string
}) {
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const [projectResult, issuesResult] = await Promise.all([
    projects.projects.retrieve(org.id, projectId),
    projects.issues.list(org.id, { project: projectId }),
  ])

  if (projectResult.error?.code === 'projects/project-not-found') {
    notFound()
  }

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
      issuesHref={`/orgs/${slug}/workspace/projects/issues`}
      projectsHref={`/orgs/${slug}/workspace/projects/projects`}
    />
  )
}
