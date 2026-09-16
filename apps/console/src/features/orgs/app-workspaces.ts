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
 * resolves itself (`.claude/rules/app-layout.md`). `navigationGroups` is the
 * one exception in shape only, not in kind: it is the product's own
 * `NavGroupDefinition[]`, itself plain data for the same reason, imported
 * rather than restated so this file and the product's contract package cannot
 * disagree about what that product's navigation is.
 */

import type { NavGroupDefinition } from '@876/core/access'
import { billingNavigation, invoiceNavigation } from '@876/billing/navigation'

/** Icon key a client component resolves to a component. */
export type WorkspaceIconKey =
  | 'dashboard'
  | 'customers'
  | 'requests'
  | 'projects'
  | 'issues'
  | 'board'
  | 'labels'
  | 'phases'
  | 'cycles'
  | 'task-lists'
  | 'calendar'
  | 'time'
  | 'templates'
  | 'layouts'
  | 'workflows'
  | 'automation'
  | 'settings'
  | 'billing'
  | 'packages'
  | 'items'
  | 'teams'
  | 'categories'
  | 'forms'
  | 'payments'
  | 'banking'
  | 'branches'
  | 'warehouses'

/** One navigable area inside an app's workspace. */
export type WorkspaceSection = {
  label: string
  /**
   * The product navigation entry this section mirrors.
   *
   * Console shows a section only when the organization's own product
   * navigation would show it, so an organization without a feature flag has no
   * section for it. Sections without a matching registry entry — apps whose
   * registry has not moved into a package yet — fall back to always visible.
   */
  entryKey?: string
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
  /** URL segment under `/workspace/[orgSlug]`, e.g. `'crm'`. */
  key: string
  /** Product name as an operator would say it. */
  label: string
  /** One line naming what is inside. Not marketing copy. */
  summary: string
  iconKey: WorkspaceIconKey
  sections: readonly WorkspaceSection[]
  /**
   * The product's own permission-catalog navigation, when it has moved into a
   * shared contract package (`@876/billing/navigation` today). Its entries'
   * `key`s are matched against `sections[].entryKey` to build the operator
   * rail, so an organization's entitlement/feature state filters the rail the
   * same way it filters that product's own navigation — see
   * `resolveWorkspaceNavigation`.
   *
   * A workspace without one (CRM, Projects, Couriers today) falls back to
   * `sections` unfiltered; their registries have not moved into a package yet.
   */
  navigationGroups?: readonly NavGroupDefinition[]
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
    appSlug: '876-projects',
    key: 'projects',
    label: '876 Projects',
    summary: 'Projects, issues, and the board this organization plans on.',
    iconKey: 'projects',
    sections: [
      { label: 'Overview', segment: '', iconKey: 'dashboard', exact: true },
      { label: 'Projects', segment: 'projects', iconKey: 'projects' },
      { label: 'Issues', segment: 'issues', iconKey: 'issues' },
      { label: 'Board', segment: 'board', iconKey: 'board' },
      { label: 'Labels', segment: 'labels', iconKey: 'labels' },
      { label: 'Phases', segment: 'phases', iconKey: 'phases' },
      { label: 'Cycles', segment: 'cycles', iconKey: 'cycles' },
      { label: 'Task Lists', segment: 'task-lists', iconKey: 'task-lists' },
      { label: 'Calendar', segment: 'calendar', iconKey: 'calendar' },
      { label: 'Time', segment: 'time', iconKey: 'time' },
      { label: 'Templates', segment: 'templates', iconKey: 'templates' },
      { label: 'Layouts', segment: 'layouts', iconKey: 'layouts' },
      { label: 'Workflows', segment: 'workflows', iconKey: 'workflows' },
      { label: 'Automation', segment: 'automation', iconKey: 'automation' },
      { label: 'Project Fields', segment: 'project-fields', iconKey: 'forms' },
    ],
  },
  {
    appSlug: '876-billing',
    key: 'billing',
    label: '876 Billing',
    summary:
      'Customers, catalog items, invoices, payments, subscriptions, and banking.',
    iconKey: 'billing',
    sections: [
      {
        label: 'Overview',
        segment: '',
        iconKey: 'dashboard',
        exact: true,
        entryKey: 'home',
      },
      {
        label: 'Customers',
        segment: 'customers',
        iconKey: 'customers',
        entryKey: 'customers',
      },
      { label: 'Items', segment: 'items', iconKey: 'items', entryKey: 'items' },
      {
        label: 'Invoices',
        segment: 'invoices',
        iconKey: 'billing',
        entryKey: 'sales-invoices',
      },
      {
        label: 'Payments',
        segment: 'payments',
        iconKey: 'payments',
        entryKey: 'sales-payments',
      },
      {
        label: 'Subscriptions',
        segment: 'subscriptions',
        iconKey: 'requests',
        entryKey: 'subscriptions',
      },
      {
        label: 'Banking',
        segment: 'banking',
        iconKey: 'banking',
        entryKey: 'banking',
      },
    ],
    navigationGroups: billingNavigation,
  },
  {
    appSlug: '876-invoice',
    key: 'invoice',
    label: '876 Invoice',
    summary: 'Invoices, line items, drafts, and customer billing schedules.',
    iconKey: 'billing',
    sections: [
      {
        label: 'Overview',
        segment: '',
        iconKey: 'dashboard',
        exact: true,
        entryKey: 'home',
      },
      {
        label: 'Customers',
        segment: 'customers',
        iconKey: 'customers',
        entryKey: 'customers',
      },
      { label: 'Items', segment: 'items', iconKey: 'items', entryKey: 'items' },
      {
        label: 'Invoices',
        segment: 'invoices',
        iconKey: 'billing',
        entryKey: 'invoices',
      },
      {
        label: 'Payments',
        segment: 'payments',
        iconKey: 'payments',
        entryKey: 'payments',
      },
    ],
    navigationGroups: invoiceNavigation,
  },
  {
    appSlug: '876-couriers',
    key: 'couriers',
    label: '876 Couriers',
    summary: 'Dispatch, deliveries, couriers, and live logistics.',
    iconKey: 'packages',
    sections: [
      { label: 'Overview', segment: '', iconKey: 'dashboard', exact: true },
      { label: 'Customers', segment: 'customers', iconKey: 'customers' },
      { label: 'Packages', segment: 'packages', iconKey: 'packages' },
      { label: 'Branches', segment: 'branches', iconKey: 'branches' },
      { label: 'Warehouses', segment: 'warehouses', iconKey: 'warehouses' },
      { label: 'Team', segment: 'team', iconKey: 'teams' },
    ],
  },
] as const satisfies readonly AppWorkspace[]

/** The top-level segment every workspace lives under. */
export const WORKSPACE_SEGMENT = 'workspace'

/** The base path of one app's workspace for an organization. */
export function workspaceBase(orgSlug: string, workspaceKey: string): string {
  return `${workspaceIndex(orgSlug)}/${workspaceKey}`
}

/** The base path for Projects in either an organization or platform context. */
export function projectsBase(orgSlug: string | null): string {
  return orgSlug ? workspaceBase(orgSlug, 'projects') : '/projects'
}

/**
 * The workspace index for an organization.
 *
 * A workspace is a top-level Console context, not a tab inside the
 * organization record: entering one swaps the whole rail for that product's
 * navigation, so it lives at `/workspace/<org>` rather than nested under
 * `/orgs/<org>`. The organization record links into it; it does not own it.
 */
export function workspaceIndex(orgSlug: string): string {
  return `/${WORKSPACE_SEGMENT}/${encodeURIComponent(orgSlug)}`
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
  key: string
  label: string
  href: string
  iconKey: WorkspaceIconKey
  exact: boolean
}[] {
  const base = workspaceBase(orgSlug, workspace.key)

  return workspace.sections.map((section) => ({
    // Structurally a `WorkspaceNavLink`, so the resolved and the fallback rail
    // are the same shape. Keyed off the registry entry where there is one, so a
    // fallback rail and a resolved rail agree on a section's identity.
    // `||`, not `??`: the index section's segment is the empty string.
    key: section.entryKey || section.segment || 'index',
    label: section.label,
    href: section.segment ? `${base}/${section.segment}` : base,
    iconKey: section.iconKey,
    exact: section.exact ?? false,
  }))
}
