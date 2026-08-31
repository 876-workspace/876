import 'server-only'

import { notFound } from 'next/navigation'
import { cache } from 'react'

import { requireSession } from '@/lib/auth/guards'
import { getPlatformOrganization } from '@/lib/platform-org'
import { billing } from '@/lib/services/billing'
import { crm } from '@/lib/services/crm'
import { workspace } from '@/lib/services/workspace'

import { toRequestCustomerOption } from './request-customer-option'
import { PLATFORM_REQUESTS_HREF } from './request-paths'
import type { DirectoryMember, RequestDepartment } from './types'

/**
 * Resolve Console's operator request surface to 876's CRM service workspace.
 * The target organization identifies the CRM workspace; it is not a check for
 * or grant of the standalone `876-crm` product entitlement.
 */
export const loadPlatformRequestContext = cache(async (requestId?: string) => {
  const [org, session] = await Promise.all([
    getPlatformOrganization(),
    requireSession(
      requestId
        ? `${PLATFORM_REQUESTS_HREF}/${requestId}`
        : PLATFORM_REQUESTS_HREF
    ),
  ])
  return { org, session }
})

export const loadOrgDirectory = cache(async (orgId: string) => {
  const [departmentsResult, membersResult] = await Promise.all([
    workspace.departments.list(orgId),
    workspace.members.list(orgId, { limit: 100 }),
  ])

  const departments: RequestDepartment[] =
    departmentsResult.data?.data.map((d) => ({ id: d.id, name: d.name })) ?? []
  const members: DirectoryMember[] =
    membersResult.data?.data.map((m) => {
      const nameParts = [m.first_name, m.last_name].filter(Boolean)
      const name =
        nameParts.length > 0 ? nameParts.join(' ') : (m.email ?? m.user_id)
      return {
        userId: m.user_id,
        name,
        email: m.email,
        avatar: m.avatar,
      }
    }) ?? []

  return {
    departments,
    members,
    departmentsError: departmentsResult.error,
    membersError: membersResult.error,
  }
})

export const loadOrgCategoryIndex = cache(async (orgId: string) => {
  const result = await crm.requestCategories.list(orgId)
  return {
    categories: new Map(
      (result.data?.data ?? []).map((category) => [category.id, category])
    ),
    error: result.error,
  }
})

export const loadOrgPriorities = cache(async (orgId: string) => {
  const result = await crm.requestPriorities.list(orgId)
  return { priorities: result.data?.data ?? [], error: result.error }
})

export const loadOrgRequestCustomers = cache(async (orgId: string) => {
  const result = await crm.customers.list(orgId)

  return {
    customers:
      result.data?.data
        .map(toRequestCustomerOption)
        .sort((left, right) => left.name.localeCompare(right.name)) ?? [],
    error: result.error,
  }
})

export const loadOrgCustomer = cache(
  async (orgId: string, customerId: string) => {
    const result = await crm.customers.retrieve(orgId, customerId)
    if (result.data) {
      return {
        profile: result.data.profile,
        customer: result.data.customer,
        error: result.error,
      }
    }

    const fallbackResult = await billing.customers.retrieve(orgId, customerId)
    return {
      profile: null,
      customer: fallbackResult.data ?? null,
      error: result.error ?? fallbackResult.error,
    }
  }
)

async function loadOrgRequestUncached(
  orgId: string,
  requestId: string,
  returnPath: string = PLATFORM_REQUESTS_HREF
) {
  const session = await requireSession(returnPath)
  const result = await crm.requests.retrieve(orgId, requestId)
  if (result.error?.code === 'crm/request-not-found') notFound()

  return {
    org: { id: orgId },
    session,
    request: result.data,
    error: result.error,
  }
}

export const loadOrgRequest = cache(loadOrgRequestUncached)

export const loadOrgNotes = cache(async (orgId: string, requestId: string) => {
  const result = await crm.requestNotes.list(orgId, requestId, {
    includePrivate: true,
  })
  return { notes: result.data?.data ?? [], error: result.error }
})

export const loadOrgTasks = cache(async (orgId: string, requestId: string) => {
  const result = await crm.requestTasks.list(orgId, requestId)
  return { tasks: result.data?.data ?? [], error: result.error }
})

export const loadOrgReminders = cache(
  async (orgId: string, requestId: string) => {
    const result = await crm.requestReminders.list(orgId, requestId)
    return { reminders: result.data?.data ?? [], error: result.error }
  }
)

export const loadOrgEvents = cache(async (orgId: string, requestId: string) => {
  const result = await crm.requestEvents.list(orgId, requestId)
  return { events: result.data?.data ?? [], error: result.error }
})

export const resolveRequestOrgId = cache(
  async (organizationId?: string): Promise<string | null> => {
    if (organizationId) return organizationId
    const org = await getPlatformOrganization()
    return org?.id ?? null
  }
)

export function requestCustomerHref(
  baseHref: string,
  customerId: string
): string {
  const workspaceBase = baseHref.split('/requests')[0]
  return baseHref.startsWith('/orgs/')
    ? `${workspaceBase}/customers/${customerId}`
    : `/customers/${customerId}`
}

export const loadRequestRowContext = cache(async (orgId: string) => {
  const [profiles, directory] = await Promise.all([
    crm.customers.list(orgId),
    loadOrgDirectory(orgId),
  ])
  return {
    customerProfiles: profiles.data?.data ?? [],
    members: directory.members,
    departments: directory.departments,
    profilesError: profiles.error,
    membersError: directory.membersError,
    departmentsError: directory.departmentsError,
  }
})

export const loadRequest = cache(async (requestId: string) => {
  const { org, session } = await loadPlatformRequestContext(requestId)
  if (!org) return { org: null, session, request: null, error: null }
  return loadOrgRequest(
    org.id,
    requestId,
    `${PLATFORM_REQUESTS_HREF}/${requestId}`
  )
})

export const loadDirectory = cache(async () => {
  const { org } = await loadPlatformRequestContext()
  if (!org)
    return {
      departments: [],
      members: [],
      departmentsError: null,
      membersError: null,
    }
  return loadOrgDirectory(org.id)
})

export const loadCategoryIndex = cache(async () => {
  const { org } = await loadPlatformRequestContext()
  if (!org) return { categories: new Map(), error: null }
  return loadOrgCategoryIndex(org.id)
})

export const loadPriorities = cache(async () => {
  const { org } = await loadPlatformRequestContext()
  if (!org) return { priorities: [], error: null }
  return loadOrgPriorities(org.id)
})

export const loadCustomer = cache(async (customerId: string) => {
  const { org } = await loadPlatformRequestContext()
  if (!org) return { profile: null, customer: null, error: null }
  return loadOrgCustomer(org.id, customerId)
})

export const loadNotes = cache(async (requestId: string) => {
  const { org } = await loadPlatformRequestContext(requestId)
  if (!org) return { notes: [], error: null }
  return loadOrgNotes(org.id, requestId)
})

export const loadTasks = cache(async (requestId: string) => {
  const { org } = await loadPlatformRequestContext(requestId)
  if (!org) return { tasks: [], error: null }
  return loadOrgTasks(org.id, requestId)
})

export const loadReminders = cache(async (requestId: string) => {
  const { org } = await loadPlatformRequestContext(requestId)
  if (!org) return { reminders: [], error: null }
  return loadOrgReminders(org.id, requestId)
})

export const loadEvents = cache(async (requestId: string) => {
  const { org } = await loadPlatformRequestContext(requestId)
  if (!org) return { events: [], error: null }
  return loadOrgEvents(org.id, requestId)
})
