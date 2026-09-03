import type { NavEntry, NavGroupDefinition } from '@876/core/access'

import { PLATFORM_CONTEXT_KEY } from '@/components/shell/sidebar-context'
import type { SidebarContextDefinition } from '@/components/shell/sidebar-context'
import { workspaceBase, type AppWorkspace } from './app-workspaces'
import type { WorkspaceNavLink } from './workspace-navigation'

/**
 * One organization's product workspace, as a level of the sidebar stack.
 *
 * The workspace owns the whole rail while it is open — it does not render a
 * second rail of its own beside the platform one. That is the point of moving
 * it to a top-level route: entering a workspace makes Console behave like that
 * product, and the back control is what returns.
 *
 * `links` are already resolved against the organization's feature rollout, so
 * this only reshapes them; it never decides what an organization can see.
 */
export function workspaceSidebarContext(
  orgSlug: string,
  workspace: AppWorkspace,
  links: readonly WorkspaceNavLink[],
  orgName: string
): SidebarContextDefinition {
  const entries: NavEntry[] = links.map((link) => ({
    key: `workspace-${workspace.key}-${link.key}`,
    title: link.label,
    href: link.href,
    icon: link.iconKey,
  }))

  return {
    key: `workspace-${orgSlug}-${workspace.key}`,
    kind: 'workspace',
    title: workspace.label,
    // The rail is the only chrome naming the organization once the workspace is
    // top-level, so the subtitle is not decoration: without it an operator
    // cannot tell whose CRM they are looking at.
    subtitle: orgName,
    href: workspaceBase(orgSlug, workspace.key),
    icon: workspace.iconKey,
    parentKey: PLATFORM_CONTEXT_KEY,
    groups: [
      { key: `workspace-${workspace.key}`, entries } as NavGroupDefinition,
    ],
  }
}
