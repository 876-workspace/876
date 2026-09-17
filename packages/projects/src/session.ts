import { createCommentsResource } from './resources/comments'
import { createIssuesResource } from './resources/issues'
import { createMyWorkResource } from './resources/my-work'
import { createNotificationsResource } from './resources/notifications'
import { createProjectsResource } from './resources/projects'
import { buildRuntime } from './runtime'

export interface SessionClientOptions {
  baseUrl?: string
  accessToken?: string
  fetch?: typeof fetch
  requestId?: string
}

/**
 * Signed-in user access to Projects for native clients such as the Projects
 * mobile app. The caller passes the user's Core-issued OAuth access token;
 * the Projects API verifies the bearer, binds it to the path organization,
 * and enforces the caller's app permissions on every route.
 *
 * The service is the authorization boundary: routes outside the session-opened
 * subset keep requiring the internal credential and answer 401 to a bearer.
 * The session-opened subset is project reads, issue reads plus gated
 * create/edit, comment reads plus gated create/edit/delete, notification
 * reads, and self-scoped My Work reads.
 *
 * This entrypoint stays free of `server-only` so native runtimes can import
 * it. It never accepts an internal key — a bearer and an internal key are
 * mutually exclusive authorities.
 */
export function create876ProjectsSessionClient(
  options: SessionClientOptions = {}
) {
  const runtime = {
    ...buildRuntime(options),
    accessToken: options.accessToken,
    internalKey: undefined,
  }
  return {
    projects: createProjectsResource(runtime),
    issues: createIssuesResource(runtime),
    comments: createCommentsResource(runtime),
    notifications: createNotificationsResource(runtime),
    myWork: createMyWorkResource(runtime),
  }
}

export type ProjectsSessionClient = ReturnType<
  typeof create876ProjectsSessionClient
>
