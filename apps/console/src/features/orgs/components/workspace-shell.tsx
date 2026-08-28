import type { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight } from '@876/ui/icons'

import type { AppWorkspace } from '../app-workspaces'
import { workspaceIndex, workspaceSectionLinks } from '../app-workspaces'
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
 * It is drawn as a bordered window rather than blending into the page because
 * the boundary is the whole point: everything inside belongs to the
 * organization's tenant in another product, not to 876's view of that
 * organization. Mistaking one for the other is the failure this surface exists
 * to prevent, and a visible frame plus a header naming both the app and the
 * organization is the cheapest way to keep them apart.
 *
 * The frame, the header and the rail are static — they need no I/O and render
 * immediately. Only the page inside streams.
 */
export function WorkspaceShell({
  workspace,
  orgSlug,
  orgName,
  notice,
  children,
}: Props) {
  return (
    <section className="876-card overflow-hidden">
      <header className="bg-muted/40 flex flex-wrap items-center gap-x-2 gap-y-1 border-b px-4 py-2.5">
        <Link
          href={workspaceIndex(orgSlug)}
          className="text-muted-foreground hover:text-foreground text-[0.8125rem] font-medium transition-colors"
        >
          Workspace
        </Link>
        <ChevronRight
          className="text-muted-foreground/50 size-3.5 shrink-0"
          aria-hidden="true"
        />
        <span className="flex min-w-0 items-center gap-1.5 text-[0.8125rem] font-semibold">
          <WorkspaceIcon
            iconKey={workspace.iconKey}
            className="text-876-accent-fg size-4 shrink-0"
          />
          <span className="truncate">{workspace.label}</span>
        </span>
        <span className="text-muted-foreground min-w-0 truncate text-[0.8125rem]">
          · {orgName}&rsquo;s workspace
        </span>
      </header>

      {notice}

      <div className="flex flex-col lg:flex-row">
        <div className="border-b lg:border-r lg:border-b-0">
          <WorkspaceNav links={workspaceSectionLinks(orgSlug, workspace)} />
        </div>
        <div className="min-w-0 flex-1 p-4 sm:p-5">{children}</div>
      </div>
    </section>
  )
}
