import { ServerMobileNav } from '@/components/shell/server-mobile-nav'
import { resolveWorkspaceContexts } from '@/features/orgs/workspace-contexts'
import { requireSession } from '@/lib/auth/guards'

/**
 * A **required** catch-all: `/workspace/[orgSlug]` is the launcher index, and an
 * optional catch-all would collide with it. The launcher belongs to no one
 * product, so it keeps the platform navigation through `default.tsx`.
 */
export default async function WorkspaceMobileNavSlot({
  params,
}: {
  params: Promise<{ orgSlug: string; section: string[] }>
}) {
  const [{ orgSlug, section }, sessionUser] = await Promise.all([
    params,
    requireSession('/'),
  ])

  return (
    <ServerMobileNav
      userId={sessionUser.id}
      contexts={await resolveWorkspaceContexts(orgSlug, section)}
    />
  )
}
