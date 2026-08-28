import 'server-only'

import { cache } from 'react'
import { notFound } from 'next/navigation'

import { $876 } from '@/lib/876'
import { requireSession } from '@/lib/auth/guards'
import { getPlatformOrganization } from '@/lib/platform-org'

import { toRequestCustomerOption } from './request-customer-option'
import type { DirectoryMember, RequestDepartment } from './types'

export const loadSupportContext = cache(async (requestId?: string) => {
  const [org, session] = await Promise.all([
    getPlatformOrganization(),
    requireSession(requestId ? `/support/${requestId}` : '/support'),
  ])
  return { org, session }
})

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

export const loadOrgCategoryIndex = cache(async (orgId: string) => {
  const result = await $876.requestCategories.list(orgId)
  return new Map(
    (result.data?.data ?? []).map((category) => [category.id, category])
  )
})

export const loadOrgPriorities = cache(async (orgId: string) => {
  const result = await $876.requestPriorities.list(orgId)
  if (result.error) throw new Error(result.error.message)
  return result.data.data
})

export const loadOrgRequestCustomers = cache(async (orgId: string) => {
  const result = await $876.customerProfiles.list(orgId)
  if (result.error) throw new Error(result.error.message)

  return result.data.data
    .map(toRequestCustomerOption)
    .sort((left, right) => left.name.localeCompare(right.name))
})

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

export const loadOrgRequest = cache(
  async (orgId: string, requestId: string, returnPath = '/support') => {
    const session = await requireSession(returnPath)
    const result = await $876.requests.retrieve(orgId, requestId)
    if (result.error?.code === 'crm/request-not-found') notFound()
    if (result.error) throw new Error(result.error.message)
    return { org: { id: orgId }, session, request: result.data }
  }
)

export const loadOrgNotes = cache(async (orgId: string, requestId: string) => {
  const result = await $876.requestNotes.list(orgId, requestId, {
    includePrivate: true,
  })
  if (result.error) throw new Error(result.error.message)
  return result.data.data
})

export const loadOrgTasks = cache(async (orgId: string, requestId: string) => {
  const result = await $876.requestTasks.list(orgId, requestId)
  if (result.error) throw new Error(result.error.message)
  return result.data.data
})

export const loadOrgReminders = cache(
  async (orgId: string, requestId: string) => {
    const result = await $876.requestReminders.list(orgId, requestId)
    if (result.error) throw new Error(result.error.message)
    return result.data.data
  }
)

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
    $876.customerProfiles.list(orgId),
    loadOrgDirectory(orgId),
  ])
  return {
    customerProfiles: profiles.data?.data ?? [],
    members: directory.members,
    departments: directory.departments,
  }
})

export const loadRequest = cache(async (requestId: string) => {
  const { org, session } = await loadSupportContext(requestId)
  if (!org) return { org: null, session, request: null }
  return loadOrgRequest(org.id, requestId, `/support/${requestId}`)
})

export const loadDirectory = cache(async () => {
  const { org } = await loadSupportContext()
  if (!org) return { departments: [], members: [] }
  return loadOrgDirectory(org.id)
})

export const loadCategoryIndex = cache(async () => {
  const { org } = await loadSupportContext()
  if (!org) return new Map()
  return loadOrgCategoryIndex(org.id)
})

export const loadPriorities = cache(async () => {
  const { org } = await loadSupportContext()
  if (!org) return []
  return loadOrgPriorities(org.id)
})

export const loadCustomer = cache(async (customerId: string) => {
  const { org } = await loadSupportContext()
  if (!org) return { profile: null, customer: null }
  return loadOrgCustomer(org.id, customerId)
})

export const loadNotes = cache(async (requestId: string) => {
  const { org } = await loadSupportContext(requestId)
  if (!org) return []
  return loadOrgNotes(org.id, requestId)
})

export const loadTasks = cache(async (requestId: string) => {
  const { org } = await loadSupportContext(requestId)
  if (!org) return []
  return loadOrgTasks(org.id, requestId)
})

export const loadReminders = cache(async (requestId: string) => {
  const { org } = await loadSupportContext(requestId)
  if (!org) return []
  return loadOrgReminders(org.id, requestId)
})
