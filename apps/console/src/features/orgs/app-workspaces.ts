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
  | 'dashboard'
  | 'customers'
  | 'requests'
  | 'settings'
  | 'billing'
  | 'packages'
  | 'items'
  | 'teams'
  | 'categories'
  | 'forms'

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
      { label: 'Forms', segment: 'forms', iconKey: 'forms' },
    ],
  },
  {
    appSlug: '876-billing',
    key: 'billing',
    label: '876 Billing',
    summary:
      'Accounts, subscriptions, payment methods, and financial transactions.',
    iconKey: 'billing',
    sections: [
      { label: 'Overview', segment: '', iconKey: 'dashboard', exact: true },
      { label: 'Subscriptions', segment: 'subscriptions', iconKey: 'requests' },
      { label: 'Items', segment: 'items', iconKey: 'items' },
      { label: 'Accounts', segment: 'accounts', iconKey: 'settings' },
    ],
  },
  {
    appSlug: '876-invoice',
    key: 'invoice',
    label: '876 Invoice',
    summary: 'Invoices, line items, drafts, and customer billing schedules.',
    iconKey: 'billing',
    sections: [
      { label: 'Overview', segment: '', iconKey: 'dashboard', exact: true },
      { label: 'Invoices', segment: 'invoices', iconKey: 'billing' },
      { label: 'Items', segment: 'items', iconKey: 'items' },
    ],
  },
  {
    appSlug: '876-couriers',
    key: 'couriers',
    label: '876 Couriers',
    summary: 'Dispatch, deliveries, couriers, and live logistics.',
    iconKey: 'packages',
    sections: [
      { label: 'Overview', segment: '', iconKey: 'dashboard', exact: true },
      { label: 'Deliveries', segment: 'deliveries', iconKey: 'packages' },
      { label: 'Couriers', segment: 'couriers', iconKey: 'customers' },
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
