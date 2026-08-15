import 'server-only'

import type { PlatformRoutingMembership } from '@876/core/platform'
import { cache } from 'react'

import { getPlatformClient } from '@/lib/876/platform-client'
import { INVOICE_APP_SLUG } from '@/lib/invoice-app'
import type { AccessStatus, InvoiceContext } from '@/types/auth'

import { getAuthSession, isSignedSession } from './session'

function toAccessStatus(status: string | null | undefined): AccessStatus {
  if (status === 'active' || status === 'trialing') return status
  return status ? 'blocked' : 'none'
}

function isUsable(membership: PlatformRoutingMembership): boolean {
  return (
    membership.status === 'active' &&
    membership.organization.status === 'active'
  )
}

/**
 * Resolves the acting organization and the org's `876-invoice` entitlement.
 * Access to Invoice is decided here and nowhere else — a Billing workspace
 * existing does not grant it, and a `876-billing` subscription is unrelated.
 */
export const getInvoiceContext = cache(
  async function getInvoiceContext(): Promise<InvoiceContext | null> {
    const session = await getAuthSession()
    if (!isSignedSession(session)) return null

    const platform = await getPlatformClient()
    const membershipsResult = await platform.memberships.listRouting({
      userId: session.user.id,
      status: 'active',
    })
    if (membershipsResult.error) return null

    const memberships = membershipsResult.data.data.filter(isUsable)
    const selected =
      memberships.find(
        (membership) => membership.organization.id === session.user.orgId
      ) ?? memberships[0]
    if (!selected) return null

    const subscription = await platform.subscriptions.retrieve({
      organizationId: selected.organization.id,
      appSlug: INVOICE_APP_SLUG,
    })

    return {
      userId: session.user.id,
      orgId: selected.organization.id,
      orgName: selected.organization.name ?? 'Organization',
      orgSlug: selected.organization.slug,
      role: selected.role,
      organizations: memberships.map((membership) => ({
        id: membership.organization.id,
        name: membership.organization.name ?? 'Organization',
        slug: membership.organization.slug,
        role: membership.role,
      })),
      accessStatus: toAccessStatus(subscription.data?.status),
    }
  }
)
