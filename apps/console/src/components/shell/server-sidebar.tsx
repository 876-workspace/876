import 'server-only'

import { resolveNavigation } from '@876/core/access'

import { navConfig } from '@/components/shell/nav-config'
import { navContexts } from '@/components/shell/nav-contexts'
import { Sidebar } from '@/components/shell/sidebar'
import type { SidebarContextDefinition } from '@/components/shell/sidebar-context'
import {
  resolveSidebarSlots,
  sidebarSlotDefinitions,
} from '@/components/shell/sidebar-slots'
import { resolveAccessContext } from '@/lib/auth/access-context'

/**
 * Console's sidebar, resolved for one subject.
 *
 * Rendered from the `@sidebar` parallel route slot rather than from the shell,
 * so a route segment can contribute its own context with data only that segment
 * has — an app record knows its `app_kind`, and the shell above it does not.
 * The slot keeps that server-resolved and URL-derived; a client provider written
 * to by a nested layout would flash the platform rail first.
 */
export async function ServerSidebar({
  userId,
  contexts = [],
}: {
  userId: string
  /** Contexts this route adds to the ones Console always declares. */
  contexts?: readonly SidebarContextDefinition[]
}) {
  const context = await resolveAccessContext(userId)
  const navigation = context ? resolveNavigation(navConfig, context) : []
  const slots = context
    ? resolveSidebarSlots(sidebarSlotDefinitions, context)
    : []

  return (
    <Sidebar
      navigation={navigation}
      contexts={[...navContexts, ...contexts]}
      slots={slots}
    />
  )
}
