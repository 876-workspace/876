import 'server-only'

import { resolveNavigation } from '@876/core/access'

import { MobileNav } from '@/components/shell/mobile-nav'
import { navConfig } from '@/components/shell/nav-config'
import { navContexts } from '@/components/shell/nav-contexts'
import type { SidebarContextDefinition } from '@/components/shell/sidebar-context'
import { resolveAccessContext } from '@/lib/auth/access-context'

/**
 * Console's mobile navigation sheet, resolved for one subject.
 *
 * A second parallel slot beside `@sidebar`, for the same reason that one
 * exists: a route segment contributes contexts only it can resolve. The sheet
 * sits in the header, above the body where the sidebar slot renders, so it
 * cannot read the sidebar's node — without its own slot a phone would show the
 * platform rail inside an app record or a workspace while the desktop rail
 * showed the product.
 */
export async function ServerMobileNav({
  userId,
  contexts = [],
}: {
  userId: string
  /** Contexts this route adds to the ones Console always declares. */
  contexts?: readonly SidebarContextDefinition[]
}) {
  const context = await resolveAccessContext(userId)
  const navigation = context ? resolveNavigation(navConfig, context) : []

  return (
    <MobileNav
      navigation={navigation}
      contexts={[...navContexts, ...contexts]}
    />
  )
}
