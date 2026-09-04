import 'server-only'

import type { SidebarContextDefinition } from '@/components/shell/sidebar-context'
import { hasAnyProductPermission } from '@/lib/operator-permissions'
import { findAppWorkspace, workspaceSectionLinks } from './app-workspaces'
import { resolveOrg } from './org-data'
import { resolveWorkspaceNavigation } from './workspace-navigation'
import { workspaceSidebarContext } from './workspace-sidebar-context'

/**
 * The navigation contexts a workspace route contributes to the shell.
 *
 * Shared by the `@sidebar` and `@mobilenav` slots so the rail and the sheet
 * cannot disagree about which product an operator is in, or which sections that
 * organization can see. Both resolvers below are request-cached, so the two
 * slots resolving the same route cost one round trip between them.
 */
export async function resolveWorkspaceContexts(
  orgSlug: string,
  section: readonly string[],
  operatorPermissions: readonly string[]
): Promise<SidebarContextDefinition[]> {
  // An unknown first segment is a 404 under the real route; navigation simply
  // stays on the platform context rather than inventing a product.
  const workspace = findAppWorkspace(section[0] ?? '')
  if (!workspace) return []

  const org = await resolveOrg(orgSlug)

  // §6.2's AND: the operator's own projected permission for this product,
  // never the organization's. Deliberately coarse — "holds at least one
  // projected permission for this product" rather than a per-section check —
  // because a section's `entryKey` is that product's own org-member
  // vocabulary (Billing/Invoice's `home`/`sales-invoices`/…), which has no
  // reliable 1:1 mapping onto the `<module>.<action>` catalog this file
  // projects; inventing one risked getting a specific mapping wrong. An
  // operator with zero permission for the product gets an empty context —
  // the same mechanism Storage's contextless context already uses (Phase 1) —
  // rather than the registry's fallback sections. This is presentation, not
  // authorization: reaching the workspace route itself is still gated only by
  // `requireSession`, exactly as `resolveWorkspaceNavigation` already notes.
  if (!hasAnyProductPermission(operatorPermissions, workspace.appSlug))
    return [
      workspaceSidebarContext(orgSlug, workspace, [], org?.name ?? orgSlug),
    ]

  const links = org
    ? await resolveWorkspaceNavigation(orgSlug, org.id, workspace)
    : []

  return [
    workspaceSidebarContext(
      orgSlug,
      workspace,
      // An organization whose navigation could not be resolved still gets the
      // registry's own sections rather than an empty rail: navigation is
      // chrome, and an operator is usually here because something is wrong.
      links.length > 0 ? links : workspaceSectionLinks(orgSlug, workspace),
      org?.name ?? orgSlug
    ),
  ]
}
