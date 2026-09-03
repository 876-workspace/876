import 'server-only'

import { create876ProjectsOperatorClient } from '@876/projects/operator'

/**
 * The 876 Projects service client for this host.
 *
 * Built lazily: OpenNext and `next build` import route modules while the
 * runtime secrets are deliberately absent, so constructing at module scope
 * would throw during the build rather than on the first real request.
 */
let cached: ReturnType<typeof create876ProjectsOperatorClient> | null = null

export function createProjects(requestId?: string) {
  return create876ProjectsOperatorClient({
    baseUrl: process.env.PROJECTS_API_URL,
    internalKey: process.env.PROJECTS_INTERNAL_KEY!,
    requestId,
  })
}

export function getProjects() {
  cached ??= createProjects()
  return cached
}
