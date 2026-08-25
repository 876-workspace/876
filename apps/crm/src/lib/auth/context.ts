import 'server-only'

import type { PlatformRoutingMembership } from '@876/core/platform'
import * as Sentry from '@sentry/nextjs'
import { cache } from 'react'

import { getPlatformClient } from '@/lib/876/platform-client'
import { CRM_APP_SLUG } from '@/lib/crm-app'
import type { AccessStatus, CrmContext, CrmContextResult } from '@/types/auth'

import { isAccountUsable } from './account-validity'
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

export const getCrmContextResult = cache(
  async function getCrmContextResult(): Promise<CrmContextResult> {
    const session = await getAuthSession()
    if (!isSignedSession(session)) return { status: 'signed-out' }
    if (!(await isAccountUsable(session.user.id)))
      return { status: 'signed-out' }

    const platform = await getPlatformClient()
    const membershipsResult = await platform.memberships.listRouting({
      userId: session.user.id,
      status: 'active',
    })

    if (membershipsResult.error) {
      Sentry.captureMessage('CRM context: routing memberships failed', {
        level: 'error',
        tags: { category: 'platform_client', phase: 'crm_context' },
        extra: {
          errorCode: membershipsResult.error.code ?? null,
          userId: session.user.id,
        },
      })
      return { status: 'unavailable' }
    }

    const memberships = membershipsResult.data.data.filter(isUsable)
    const selected =
      memberships.find(
        (membership) => membership.organization.id === session.user.orgId
      ) ?? memberships[0]
    if (!selected) return { status: 'no-organization' }

    const subscription = await platform.subscriptions.retrieve({
      organizationId: selected.organization.id,
      appSlug: CRM_APP_SLUG,
    })

    const context: CrmContext = {
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

    return { status: 'ok', context }
  }
)

export async function getCrmContext(): Promise<CrmContext | null> {
  const result = await getCrmContextResult()
  return result.status === 'ok' ? result.context : null
}
