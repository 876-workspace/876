'use client'

import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { ArrowLeft, ChevronDown } from '@876/ui/icons'

import {
  workspaceBase,
  workspaceIndex,
  type WorkspaceIconKey,
} from '../app-workspaces'
import { WorkspaceIcon } from './workspace-icon'

export type WorkspaceSwitcherOrg = { slug: string; name: string }

export type WorkspaceSwitcherApp = {
  key: string
  label: string
  iconKey: WorkspaceIconKey
}

export type WorkspaceSwitchersProps = {
  orgSlug: string
  orgName: string
  workspaceKey: string
  workspaceLabel: string
  /** Organizations an operator can jump to, already resolved and sorted. */
  orgs: readonly WorkspaceSwitcherOrg[]
  /** Products this organization is entitled to. */
  apps: readonly WorkspaceSwitcherApp[]
}

/**
 * Header navigation controls for an operator workspace.
 *
 * A workspace is a top-level context, so nothing above it names the
 * organization or offers a way back. The return link goes to the organization
 * directory, while the organization and app switchers provide the two
 * primary navigation axes (cross-organization and cross-product) an operator
 * actually moves along.
 */
export function WorkspaceSwitchers({
  orgSlug,
  orgName,
  workspaceKey,
  workspaceLabel,
  orgs,
  apps,
}: WorkspaceSwitchersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Link
        href="/orgs"
        aria-label="Back to Organizations"
        className="text-muted-foreground hover:text-foreground hover:bg-muted/70 flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1"
      >
        <ArrowLeft className="size-3.5" />
        Organizations
      </Link>

      <span aria-hidden="true" className="text-muted-foreground/40">
        |
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Switch organization"
          className="hover:bg-muted/70 text-foreground flex min-w-0 items-center gap-1 rounded-lg px-2 py-1 font-medium"
        >
          {orgName}
          <ChevronDown className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Organizations</DropdownMenuLabel>
          {orgs.map((org) => (
            <DropdownMenuItem
              key={org.slug}
              render={
                <Link
                  href={workspaceBase(org.slug, workspaceKey)}
                  aria-current={org.slug === orgSlug ? 'page' : undefined}
                />
              }
            >
              {org.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/orgs" />}>
            Browse all organizations
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <span aria-hidden="true" className="text-muted-foreground/50">
        /
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Switch app"
          className="hover:bg-muted/70 text-foreground flex min-w-0 items-center gap-1 rounded-lg px-2 py-1 font-medium"
        >
          {workspaceLabel}
          <ChevronDown className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {apps.length > 0 ? (
            <>
              <DropdownMenuLabel>Apps</DropdownMenuLabel>
              {apps.map((app) => (
                <DropdownMenuItem
                  key={app.key}
                  render={
                    <Link
                      href={workspaceBase(orgSlug, app.key)}
                      aria-current={
                        app.key === workspaceKey ? 'page' : undefined
                      }
                    />
                  }
                >
                  <WorkspaceIcon iconKey={app.iconKey} className="size-4" />
                  {app.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem render={<Link href={workspaceIndex(orgSlug)} />}>
            All workspaces
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
