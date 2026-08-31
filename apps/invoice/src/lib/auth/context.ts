import 'server-only'

import type { PlatformRoutingMembership } from '@876/core/platform'
import * as Sentry from '@sentry/nextjs'
import { cache } from 'react'

import { getPlatformClient } from '@/lib/services/platform'
import { INVOICE_APP_SLUG } from '@/lib/invoice-app'
import type {
  AccessStatus,
  InvoiceContext,
  InvoiceContextResult,
} from '@/types/auth'

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

/**
 * Resolves the acting organization and the org's `876-invoice` entitlement.
 *
 * Returns a discriminated result rather than `InvoiceContext | null`, because
 * "this account has no organization" and "we could not reach the platform" are
 * different answers that need different screens. Collapsing them shows an
 * established organization the create-an-organization form.
 */
export const getInvoiceContextResult = cache(
  async function getInvoiceContextResult(): Promise<InvoiceContextResult> {
    const session = await getAuthSession()
    if (!isSignedSession(session)) return { status: 'signed-out' }

    // A valid cookie is not a valid session. `/onboarding` resolves its context
    // here and sits *outside* the `(app)` route group, so the shell's guard
    // never runs for it — a deleted account with a still-sealed cookie resolved
    // no memberships, was read as "no organization yet", and was parked on the
    // create-an-organization form forever. Reporting it as signed-out here is
    // what makes every route agree, shell or not.
    if (!(await isAccountUsable(session.user.id)))
      return { status: 'signed-out' }

    const platform = await getPlatformClient()
    const membershipsResult = await platform.memberships.listRouting({
      userId: session.user.id,
      status: 'active',
    })

    if (membershipsResult.error) {
      Sentry.captureMessage('Invoice context: routing memberships failed', {
        level: 'error',
        tags: {
          category: 'platform_client',
          phase: 'invoice_context',
          dependency: '876_api',
        },
        extra: {
          call: 'memberships.listRouting',
          errorCode: membershipsResult.error.code ?? null,
          errorStatus:
            (membershipsResult.error as unknown as { status?: number })
              ?.status ?? null,
          platformUrl: process.env.API_876_URL || process.env.API_URL || null,
          userId: session.user.id,
          consequence:
            'The viewer cannot be routed; onboarding must not offer to create an organization.',
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
      appSlug: INVOICE_APP_SLUG,
    })

    const context: InvoiceContext = {
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

/** The acting context, or null when there is no usable one. */
export async function getInvoiceContext(): Promise<InvoiceContext | null> {
  const result = await getInvoiceContextResult()
  return result.status === 'ok' ? result.context : null
}
