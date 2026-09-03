import 'server-only'

import { createCommentsResource } from './resources/comments'
import { createIssuesResource } from './resources/issues'
import { createLabelsResource } from './resources/labels'
import { createProjectsResource } from './resources/projects'
import { createTenantsResource } from './resources/tenants'
import { buildRuntime } from './runtime'
import type { ClientOptions } from './types'

export function create876ProjectsClient(options: ClientOptions = {}) {
  const runtime = buildRuntime(options)
  return {
    tenants: createTenantsResource(runtime),
    projects: createProjectsResource(runtime),
    issues: createIssuesResource(runtime),
    labels: createLabelsResource(runtime),
    comments: createCommentsResource(runtime),
  }
}

export type ProjectsClient = ReturnType<typeof create876ProjectsClient>
