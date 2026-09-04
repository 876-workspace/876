import { ServerSidebar } from '@/components/shell/server-sidebar'
import { resolveWorkspaceContexts } from '@/features/orgs/workspace-contexts'
import { resolveAccessContext } from '@/lib/auth/access-context'
import { requireSession } from '@/lib/auth/guards'

/**
 * The sidebar inside one organization's product workspace.
 *
 * A **required** catch-all, not an optional one. `/workspace/[orgSlug]` is a
 * real page — the launcher index — and Next.js refuses a route tree where a
 * concrete route and an optional catch-all share a node: "You cannot define a
 * route with the same specificity as a optional catch-all route". Requiring at
 * least one segment removes the collision and is also the behaviour wanted: the
 * launcher belongs to no one product, so it keeps the platform rail through
 * `default.tsx` rather than matching here at all.
 *
 * The contexts themselves are resolved by `resolveWorkspaceContexts`, shared
 * with the `@mobilenav` slot so the rail and the sheet cannot disagree.
 */
export default async function WorkspaceSidebarSlot({
  params,
}: {
  params: Promise<{ orgSlug: string; section: string[] }>
}) {
  const [{ orgSlug, section }, sessionUser] = await Promise.all([
    params,
    requireSession('/'),
  ])
  const access = await resolveAccessContext(sessionUser.id)

  return (
    <ServerSidebar
      userId={sessionUser.id}
      contexts={await resolveWorkspaceContexts(
        orgSlug,
        section,
        access?.permissions ?? []
      )}
    />
  )
}
