/**
 * The operator workspace registry.
 *
 * Console has to answer two different questions about an organization, and they
 * are not the same question:
 *
 * - **org-as-customer** — what does this organization have *with 876*? That is
 *   its members, its entitlements, its billing account, its notes. Those are
 *   the organization detail tabs.
 * - **org-as-tenant** — what is this organization *doing inside an app*? Its
 *   own CRM requests, its own invoices, its own packages. That is a workspace.
 *
 * A workspace is the second one. It is the operator equivalent of opening the
 * product as that organization sees it, and it is deliberately a separate
 * surface so the org tab strip does not grow a tab per app as apps are added:
 * N apps cost exactly one `Workspace` tab, forever.
 *
 * This file is **plain data**. It carries no icon components and no functions,
 * because it crosses the RSC → client boundary — icons are string keys the nav
 * resolves itself (`.claude/rules/app-layout.md`).
 */

/** Icon key a client component resolves to a component. */
export type WorkspaceIconKey =
  'dashboard' | 'customers' | 'requests' | 'settings' | 'billing' | 'packages'

/** One navigable area inside an app's workspace. */
export type WorkspaceSection = {
  label: string
  /** Segment appended to the workspace base; the empty string is the index. */
  segment: string
  iconKey: WorkspaceIconKey
  /** True for the index, so it does not stay active on every child route. */
  exact?: boolean
}

/** One app's workspace, shown only when the organization is entitled to it. */
export type AppWorkspace = {
  /** Platform app slug that gates this workspace, e.g. `'876-crm'`. */
  appSlug: string
  /** URL segment under `/orgs/[slug]/workspace`, e.g. `'crm'`. */
  key: string
  /** Product name as an operator would say it. */
  label: string
  /** One line naming what is inside. Not marketing copy. */
  summary: string
  iconKey: WorkspaceIconKey
  sections: readonly WorkspaceSection[]
}

/**
 * Every app whose workspace Console can open.
 *
 * Adding an app is one entry here plus its route folder under
 * `orgs/[slug]/workspace/<key>/`. Nothing else in Console names an app.
 *
 * 876 Billing is deliberately absent: its organization-scoped surface predates
 * this pattern and still lives at `/orgs/[slug]/billing`. Migrating it is the
 * next step, and it is a move, not a rewrite.
 */
export const APP_WORKSPACES = [
  {
    appSlug: '876-crm',
    key: 'crm',
    label: '876 CRM',
    summary: 'Requests, customers, and the teams this organization routes to.',
    iconKey: 'requests',
    sections: [
      { label: 'Overview', segment: '', iconKey: 'dashboard', exact: true },
      { label: 'Customers', segment: 'customers', iconKey: 'customers' },
      { label: 'Requests', segment: 'requests', iconKey: 'requests' },
    ],
  },
] as const satisfies readonly AppWorkspace[]

/** The organization-detail segment every workspace lives under. */
export const WORKSPACE_SEGMENT = 'workspace'

/** The base path of one app's workspace for an organization. */
export function workspaceBase(orgSlug: string, workspaceKey: string): string {
  return `${workspaceIndex(orgSlug)}/${workspaceKey}`
}

/** The workspace index for an organization. */
export function workspaceIndex(orgSlug: string): string {
  return `/orgs/${orgSlug}/${WORKSPACE_SEGMENT}`
}

/** Look a workspace up by its URL segment. Unknown segments are a 404. */
export function findAppWorkspace(
  workspaceKey: string
): AppWorkspace | undefined {
  return APP_WORKSPACES.find((workspace) => workspace.key === workspaceKey)
}

/**
 * The workspaces an organization can actually open.
 *
 * Entitlement decides what the index lists and what the app switcher offers. It
 * does not, by itself, decide what an operator may read: a direct visit to a
 * workspace whose entitlement lapsed still resolves, with a notice, because the
 * data outlives the subscription and an operator is usually there precisely
 * because something lapsed.
 */
export function entitledWorkspaces(
  entitledAppSlugs: readonly string[]
): AppWorkspace[] {
  const entitled = new Set(entitledAppSlugs)
  return APP_WORKSPACES.filter((workspace) => entitled.has(workspace.appSlug))
}

/** Absolute hrefs for one workspace's sections, in registry order. */
export function workspaceSectionLinks(
  orgSlug: string,
  workspace: AppWorkspace
): {
  label: string
  href: string
  iconKey: WorkspaceIconKey
  exact: boolean
}[] {
  const base = workspaceBase(orgSlug, workspace.key)

  return workspace.sections.map((section) => ({
    label: section.label,
    href: section.segment ? `${base}/${section.segment}` : base,
    iconKey: section.iconKey,
    exact: section.exact ?? false,
  }))
}
