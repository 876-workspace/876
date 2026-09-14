import 'server-only'

import { cache } from 'react'

import { COMMERCE_APP_SLUG } from '@/lib/commerce-app'
import { getPlatformClient } from '@/lib/services/platform'

import { getCommerceSession } from './session'
import { isAccountUsable } from './account-validity'
import { isOrganizationAdmin } from './roles'

export type CommerceContextResult =
  | { status: 'signed-out' }
  | { status: 'wrong-account' }
  | { status: 'no-organization' }
  | { status: 'unavailable' }
  | {
      status: 'ok'
      userId: string
      organizationId: string
      organizationName: string
      appId: string | null
      isAdmin: boolean
      accessStatus: 'active' | 'trialing' | 'blocked' | 'none'
    }

export const getCommerceContextResult = cache(
  async function getCommerceContextResult(): Promise<CommerceContextResult> {
    const session = await getCommerceSession()
    if (!session) return { status: 'signed-out' }
    if (!(await isAccountUsable(session.userId)))
      return { status: 'signed-out' }
    if (session.realm === 'consumer' && !session.crossRealm)
      return { status: 'wrong-account' }

    const platform = await getPlatformClient()
    const routingMemberships = await platform.memberships.listRouting({
      userId: session.userId,
      status: 'active',
    })
    if (routingMemberships.error) return { status: 'unavailable' }

    const activeMemberships = routingMemberships.data.data.filter(
      (membership) =>
        membership.status === 'active' &&
        membership.organization.status === 'active'
    )
    const organizationMembership =
      activeMemberships.find(
        (membership) => membership.organization.id === session.orgId
      ) ?? activeMemberships[0]
    if (!organizationMembership) return { status: 'no-organization' }

    const subscription = await platform.subscriptions.retrieve({
      organizationId: organizationMembership.organization.id,
      appSlug: COMMERCE_APP_SLUG,
    })
    if (subscription.error) return { status: 'unavailable' }

    const subscriptionStatus = subscription.data?.status
    return {
      status: 'ok',
      userId: session.userId,
      organizationId: organizationMembership.organization.id,
      organizationName:
        organizationMembership.organization.name ?? 'Organization',
      appId: subscription.data?.app_id ?? null,
      isAdmin: isOrganizationAdmin(organizationMembership.role),
      accessStatus:
        subscriptionStatus === 'active' || subscriptionStatus === 'trialing'
          ? subscriptionStatus
          : subscriptionStatus
            ? 'blocked'
            : 'none',
    }
  }
)
