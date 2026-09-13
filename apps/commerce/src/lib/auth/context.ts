import 'server-only'

import { cache } from 'react'

import { COMMERCE_APP_SLUG } from '@/lib/commerce-app'
import { getPlatformClient } from '@/lib/services/platform'

import { getCommerceSession } from './session'

function isOrganizationAdmin(role: string): boolean {
  const normalized = role.toLowerCase()
  return (
    normalized === 'admin' ||
    normalized === 'super-admin' ||
    normalized === 'super_admin' ||
    normalized === 'superadmin' ||
    normalized === 'owner'
  )
}

export type CommerceContextResult =
  | { status: 'signed-out' }
  | { status: 'no-organization' }
  | { status: 'unavailable' }
  | {
      status: 'ok'
      userId: string
      organizationId: string
      isAdmin: boolean
      entitled: boolean
    }

export const getCommerceContextResult = cache(async function getCommerceContextResult(): Promise<CommerceContextResult> {
  const session = await getCommerceSession()
  if (!session) return { status: 'signed-out' }

  const platform = await getPlatformClient()
  const routingMemberships = await platform.memberships.listRouting({
    userId: session.userId,
    status: 'active',
  })
  if (routingMemberships.error) return { status: 'unavailable' }

  const activeMemberships = routingMemberships.data.data.filter(
    (membership) =>
      membership.status === 'active' && membership.organization.status === 'active'
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

  const appId = subscription.data?.app_id
  return {
    status: 'ok',
    userId: session.userId,
    organizationId: organizationMembership.organization.id,
    isAdmin: isOrganizationAdmin(organizationMembership.role),
    entitled: Boolean(
      appId &&
        (subscription.data?.status === 'active' ||
          subscription.data?.status === 'trialing')
    ),
  }
})
