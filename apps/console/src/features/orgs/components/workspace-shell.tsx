import type { ReactNode } from 'react'

import type { AppWorkspace } from '../app-workspaces'
import { workspaceSectionLinks } from '../app-workspaces'
import { WorkspaceIcon } from './workspace-icon'
import { WorkspaceNav } from './workspace-nav'

type Props = {
  workspace: AppWorkspace
  orgSlug: string
  /**
   * The organization's display name for the "whose workspace is this" line.
   *
   * A node rather than a string so the caller can stream it: resolving the name
   * is I/O, and the frame must not wait on I/O to render.
   */
  orgName: ReactNode
  /** Streams in above the content — an entitlement notice, usually. */
  notice?: ReactNode
  children: ReactNode
}

/**
 * The frame an operator works inside when they open an organization's app.
 *
 * Full-width two-column layout with a left sidebar rail and main content area,
 * positioned compactly under the condensed organization header.
 */
export function WorkspaceShell({
  workspace,
  orgSlug,
  notice,
  children,
}: Props) {
  return (
    <div className="space-y-4">
      {notice}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <aside className="space-y-3 lg:w-48 lg:shrink-0">
          <div className="flex items-center gap-2 px-1">
            <span className="bg-muted text-muted-foreground flex size-5 shrink-0 items-center justify-center rounded">
              <WorkspaceIcon iconKey={workspace.iconKey} className="size-3.5" />
            </span>
            <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              {workspace.label}
            </span>
          </div>
          <WorkspaceNav links={workspaceSectionLinks(orgSlug, workspace)} />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
