import 'server-only'

import type { Project } from '@876/projects/contracts'

import { projects } from './services/projects'

/** Loads per-project milestones concurrently for forms and settings summaries. */
export function listProjectMilestones(orgId: string, projectItems: Project[]) {
  return Promise.all(
    projectItems.map((project) => projects.milestones.list(orgId, project.id))
  )
}
