import 'server-only'

import { cache } from 'react'
import { notFound } from 'next/navigation'

import { $876 } from '@/lib/876'
import { requireSession } from '@/lib/auth/guards'
import { getPlatformOrganization } from '@/lib/platform-org'

import type { DirectoryMember, RequestDepartment } from './types'

/**
 * Resolves the platform support tenant and current authenticated session.
 * Cached per request.
 */
export const loadSupportContext = cache(async (requestId?: string) => {
  const [org, session] = await Promise.all([
    getPlatformOrganization(),
    requireSession(requestId ? `/support/${requestId}` : '/support'),
  ])
  return { org, session }
})

/** The org's teams and members for any organization. */
export const loadOrgDirectory = cache(async (orgId: string) => {
  const [departmentsResult, membersResult] = await Promise.all([
    $876.departments.list(orgId),
    $876.organizationMembers.admin.list(orgId, { limit: 100 }),
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

  return { departments, members }
})

/** The org's request-category catalog for any organization. */
export const loadOrgCategoryIndex = cache(async (orgId: string) => {
  const result = await $876.requestCategories.list(orgId)
  return new Map(
    (result.data?.data ?? []).map((category) => [category.id, category])
  )
})

/** The customer this request belongs to for any organization. */
export const loadOrgCustomer = cache(
  async (orgId: string, customerId: string) => {
    const result = await $876.customerProfiles.retrieve(orgId, customerId)
    if (result.data) {
      return {
        profile: result.data.profile,
        customer: result.data.customer,
      }
    }

    const fallbackResult = await $876.customers.retrieve(orgId, customerId)
    return {
      profile: null,
      customer: fallbackResult.data ?? null,
    }
  }
)

/** The request itself for any organization. */
export const loadOrgRequest = cache(
  async (orgId: string, requestId: string, returnPath = '/support') => {
    const session = await requireSession(returnPath)
    const result = await $876.requests.retrieve(orgId, requestId)
    if (result.error?.code === 'crm/request-not-found') notFound()
    if (result.error) throw new Error(result.error.message)

    return { org: { id: orgId }, session, request: result.data }
  }
)

/** The request's notes for any organization. */
export const loadOrgNotes = cache(async (orgId: string, requestId: string) => {
  const result = await $876.requestNotes.list(orgId, requestId)
  if (result.error) throw new Error(result.error.message)
  return result.data.data
})

/** The request's tasks for any organization. */
export const loadOrgTasks = cache(async (orgId: string, requestId: string) => {
  const result = await $876.requestTasks.list(orgId, requestId)
  if (result.error) throw new Error(result.error.message)
  return result.data.data
})

/** The request's reminders for any organization. */
export const loadOrgReminders = cache(
  async (orgId: string, requestId: string) => {
    const result = await $876.requestReminders.list(orgId, requestId)
    if (result.error) throw new Error(result.error.message)
    return result.data.data
  }
)

/**
 * The organization a request surface is scoped to.
 *
 * An organization workspace route already knows the organization; the platform
 * support desk resolves 876's own organization. That is the *only* difference
 * between the two surfaces — everything below this line loads a request the
 * same way for both, which is what lets them share one component set.
 */
export const resolveRequestOrgId = cache(
  async (organizationId?: string): Promise<string | null> => {
    if (organizationId) return organizationId
    const org = await getPlatformOrganization()
    return org?.id ?? null
  }
)

/** The customer link for a request, relative to the surface it is opened from. */
export function requestCustomerHref(
  baseHref: string,
  customerId: string
): string {
  const workspaceBase = baseHref.split('/requests')[0]
  return baseHref.startsWith('/orgs/')
    ? `${workspaceBase}/customers/${customerId}`
    : `/customers/${customerId}`
}

/**
 * The name indexes a request queue is rendered with.
 *
 * A row shows the customer, the assignee, and the team by name, and those come
 * from two different lists. Both are fetched once per organization per request
 * and joined in memory, so a page of 50 requests still costs two calls.
 */
export const loadRequestRowContext = cache(async (orgId: string) => {
  const [profiles, directory] = await Promise.all([
    $876.customerProfiles.list(orgId),
    loadOrgDirectory(orgId),
  ])

  return {
    customerProfiles: profiles.data?.data ?? [],
    members: directory.members,
    departments: directory.departments,
  }
})

/** The request itself in the platform support desk context. */
export const loadRequest = cache(async (requestId: string) => {
  const { org, session } = await loadSupportContext(requestId)
  if (!org) return { org: null, session, request: null }

  return loadOrgRequest(org.id, requestId, `/support/${requestId}`)
})

/** The org's teams and members for the platform support desk. */
export const loadDirectory = cache(async () => {
  const { org } = await loadSupportContext()
  if (!org) return { departments: [], members: [] }
  return loadOrgDirectory(org.id)
})

/** The org's request-category catalog for the platform support desk. */
export const loadCategoryIndex = cache(async () => {
  const { org } = await loadSupportContext()
  if (!org) return new Map()
  return loadOrgCategoryIndex(org.id)
})

/** The customer this request belongs to for the platform support desk. */
export const loadCustomer = cache(async (customerId: string) => {
  const { org } = await loadSupportContext()
  if (!org) return { profile: null, customer: null }
  return loadOrgCustomer(org.id, customerId)
})

/** The request's notes for the platform support desk. */
export const loadNotes = cache(async (requestId: string) => {
  const { org } = await loadSupportContext(requestId)
  if (!org) return []
  return loadOrgNotes(org.id, requestId)
})

/** The request's tasks for the platform support desk. */
export const loadTasks = cache(async (requestId: string) => {
  const { org } = await loadSupportContext(requestId)
  if (!org) return []
  return loadOrgTasks(org.id, requestId)
})

/** The request's reminders for the platform support desk. */
export const loadReminders = cache(async (requestId: string) => {
  const { org } = await loadSupportContext(requestId)
  if (!org) return []
  return loadOrgReminders(org.id, requestId)
})
