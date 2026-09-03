import 'server-only'

import type { PlatformRoutingMembership } from '@876/core/platform'
import * as Sentry from '@sentry/nextjs'
import { cookies } from 'next/headers'
import { cache } from 'react'

import { getPlatformClient } from '@/lib/services/platform'
import { PROJECTS_APP_SLUG } from '@/lib/projects-app'
import type { AccessStatus, ProjectsContext, CrmContextResult } from '@/types/auth'

import { isAccountUsable } from './account-validity'
import { normalizeOrgRole } from './roles'
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

export const getProjectsContextResult = cache(
  async function getProjectsContextResult(): Promise<CrmContextResult> {
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
      Sentry.captureMessage('Projects context: routing memberships failed', {
        level: 'error',
        tags: { category: 'platform-client', phase: 'crm-context' },
        extra: {
          errorCode: membershipsResult.error.code ?? null,
          userId: session.user.id,
        },
      })
      return { status: 'unavailable' }
    }

    const cookieStore = await cookies()
    const activeOrgId = cookieStore.get('crm_active_org')?.value

    const memberships = membershipsResult.data.data.filter(isUsable)
    const selected =
      (activeOrgId
        ? memberships.find((m) => m.organization.id === activeOrgId)
        : undefined) ??
      memberships.find(
        (membership) => membership.organization.id === session.user.orgId
      ) ??
      memberships[0]
    if (!selected) return { status: 'no-organization' }

    const subscription = await platform.subscriptions.retrieve({
      organizationId: selected.organization.id,
      appSlug: PROJECTS_APP_SLUG,
    })

    const context: ProjectsContext = {
      userId: session.user.id,
      orgId: selected.organization.id,
      orgName: selected.organization.name ?? 'Organization',
      orgSlug: selected.organization.slug,
      role: normalizeOrgRole(selected.role),
      organizations: memberships.map((membership) => ({
        id: membership.organization.id,
        name: membership.organization.name ?? 'Organization',
        slug: membership.organization.slug,
        role: normalizeOrgRole(membership.role),
      })),
      accessStatus: toAccessStatus(subscription.data?.status),
    }

    return { status: 'ok', context }
  }
)

export async function getCrmContext(): Promise<ProjectsContext | null> {
  const result = await getProjectsContextResult()
  return result.status === 'ok' ? result.context : null
}
