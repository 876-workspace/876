import 'server-only'

import { create876ProjectsOperatorClient } from '@876/projects/operator'

function options(requestId?: string) {
  return {
    baseUrl: process.env.PROJECTS_API_URL,
    internalKey: process.env.PROJECTS_INTERNAL_KEY!,
    requestId,
  }
}

export function createProjects(requestId?: string) {
  return create876ProjectsOperatorClient(options(requestId))
}

export const projects = createProjects()
