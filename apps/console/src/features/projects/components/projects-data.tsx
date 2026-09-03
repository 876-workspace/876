import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import type { ProjectFilterStatus } from '../project-status'
import { projects } from '@/lib/services/projects'
import { ProjectsTable } from '@876/projects-ui/project-list'

import { resolveOrg } from '../../../app/(app)/orgs/[slug]/_data'

export async function ProjectsData({
  slug,
  status,
}: {
  slug: string
  status: ProjectFilterStatus
}) {
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const result = await projects.projects.list(org.id, {
    status: status === 'all' ? undefined : status,
  })

  return (
    <div className="space-y-3">
      {result.error ? (
        <AppError
          title="Some project data could not be loaded"
          error={result.error}
          variant="banner"
          showCode
        />
      ) : null}
      <ProjectsTable
        projects={result.data?.data ?? []}
        projectsHref={`/orgs/${slug}/workspace/projects/projects`}
        newProjectHref={`/orgs/${slug}/workspace/projects/projects/new`}
      />
    </div>
  )
}
