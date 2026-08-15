import 'server-only'

import { cache } from 'react'

import { INVOICE_APP_SLUG } from '@/lib/invoice-app'
import type { InvoiceContext } from '@/types/auth'
import { getPlatformClient } from '@/lib/876/platform-client'
import { getAuthSession, isSignedSession } from './session'

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

    const memberships = membershipsResult.data.data.filter(
      (m: any) => m.status === 'active' && m.organization.status === 'active'
    )
    if (memberships.length === 0) return null

    const selected =
      memberships.find((m: any) => m.organization.id === session.user.orgId) ??
      memberships[0]
    if (!selected) return null

    const subscription = await platform.subscriptions.retrieve({
      organizationId: selected.organization.id,
      appSlug: INVOICE_APP_SLUG,
    })

    const rawStatus = (subscription.data as any)?.status ?? null
    let accessStatus: InvoiceContext['accessStatus'] = 'none'
    if (rawStatus === 'active' || rawStatus === 'trialing') accessStatus = rawStatus as InvoiceContext['accessStatus']
    else if (rawStatus) accessStatus = 'blocked'

    return {
      userId: session.user.id,
      orgId: selected.organization.id,
      orgName: (selected.organization.name as string) ?? 'Organization',
      orgSlug: selected.organization.slug ?? null,
      role: ((selected.role as string | null) ?? 'member') as string,
      organizations: memberships.map((m: any) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug ?? null,
        role: m.role,
      })),
      accessStatus,
    }
  }
)
