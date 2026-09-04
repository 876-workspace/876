import 'server-only'

import { resolveNavigation } from '@876/core/access'
import { navigationPermissionKeys } from '@876/billing/navigation'
import * as Sentry from '@sentry/nextjs'
import { cache } from 'react'

import { workspace } from '@/lib/services/workspace'

import {
  workspaceBase,
  type AppWorkspace,
  type WorkspaceIconKey,
} from './app-workspaces'

/**
 * The organization's enabled feature slugs for one product app.
 *
 * `userId` is deliberately omitted: the question is what this *organization*
 * has, not what the operator viewing it has. An operator's own rollout is
 * irrelevant to how the org's product looks.
 *
 * Evaluation fails closed to `[]`, which hides feature-gated sections rather
 * than advertising a capability the organization may not have.
 */
const resolveOrgFeatureKeys = cache(async function resolveOrgFeatureKeys(
  organizationId: string,
  appSlug: string
): Promise<string[]> {
  const result = await workspace.features.evaluate({ appSlug, organizationId })
  if (result.error || !result.data) {
    Sentry.captureMessage('Feature flag outage: workspace navigation', {
      level: 'error',
      tags: { category: 'feature-flags' },
      extra: {
        call: 'features.evaluate',
        appSlug,
        organizationId,
        errorCode: result.error?.code ?? null,
      },
    })
    return []
  }

  return result.data.data.map((feature) => feature.slug)
})

export type WorkspaceNavLink = {
  key: string
  label: string
  href: string
  iconKey: WorkspaceIconKey
  exact: boolean
}

/**
 * Resolves an organization's product navigation for the operator rail.
 *
 * An operator is a Console admin, not a member of the organization, so they are
 * projected the product's full permission vocabulary — everything the registry
 * references. What actually varies between organizations is entitlement and
 * feature rollout, and those are what filter the rail: an organization without
 * `billing-banking` has no Banking section, exactly as its own members see.
 *
 * This is a presentation projection, never authorization. Reaching the workspace
 * at all is decided by Console's own permission check on the route.
 */
export async function resolveWorkspaceNavigation(
  orgSlug: string,
  organizationId: string,
  workspaceDefinition: AppWorkspace
): Promise<WorkspaceNavLink[]> {
  const groups = workspaceDefinition.navigationGroups
  if (!groups) return []

  const features = await resolveOrgFeatureKeys(
    organizationId,
    workspaceDefinition.appSlug
  )

  const resolved = resolveNavigation(groups, {
    subject: { userId: '' },
    permissions: navigationPermissionKeys(groups),
    features,
    experiments: {},
  })

  const base = workspaceBase(orgSlug, workspaceDefinition.key)
  const implemented = new Map(
    workspaceDefinition.sections.map((section) => [section.entryKey, section])
  )

  return resolved.flatMap((group) =>
    group.entries.flatMap((entry) =>
      // A parent and its children are both candidates. Billing files Invoices
      // and Payments under a `sales` group entry, and Console's rail is flat,
      // so binding only top-level keys would put those two permanently out of
      // reach. `resolveNavigation` has already dropped a subtree whose parent
      // the organization cannot see, so walking children never widens the rail.
      [entry, ...(entry.children ?? [])].flatMap((candidate) => {
        const section = implemented.get(candidate.key)
        // A registry entry Console has no screen for is omitted rather than
        // linked: the workspace route binding test guarantees every section it
        // does render resolves to a page, and a dead rail link is worse than a
        // missing one.
        if (!section) return []

        return [
          {
            key: candidate.key,
            label: section.label,
            href: section.segment ? `${base}/${section.segment}` : base,
            iconKey: section.iconKey,
            exact: section.exact ?? false,
          },
        ]
      })
    )
  )
}
