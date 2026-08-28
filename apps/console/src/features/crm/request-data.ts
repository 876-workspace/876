import 'server-only'

import { notFound } from 'next/navigation'
import { cache } from 'react'

import { requireSession } from '@/lib/auth/guards'
import { $876 } from '@/lib/876'
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

  return {
    departments,
    members,
    departmentsError: departmentsResult.error,
    membersError: membersResult.error,
  }
})

export const loadOrgCategoryIndex = cache(async (orgId: string) => {
  const result = await $876.requestCategories.list(orgId)
  return {
    categories: new Map(
      (result.data?.data ?? []).map((category) => [category.id, category])
    ),
    error: result.error,
  }
})

export const loadOrgPriorities = cache(async (orgId: string) => {
  const result = await $876.requestPriorities.list(orgId)
  return { priorities: result.data?.data ?? [], error: result.error }
})

export const loadOrgRequestCustomers = cache(async (orgId: string) => {
  const result = await $876.customerProfiles.list(orgId)

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
    const result = await $876.customerProfiles.retrieve(orgId, customerId)
    if (result.data) {
      return {
        profile: result.data.profile,
        customer: result.data.customer,
        error: result.error,
      }
    }

    const fallbackResult = await $876.customers.retrieve(orgId, customerId)
    return {
      profile: null,
      customer: fallbackResult.data ?? null,
      error: result.error ?? fallbackResult.error,
    }
  }
)

export const loadOrgRequest = cache(
  async (orgId: string, requestId: string, returnPath = '/support') => {
    const session = await requireSession(returnPath)
    const result = await $876.requests.retrieve(orgId, requestId)
    if (result.error?.code === 'crm/request-not-found') notFound()

    return {
      org: { id: orgId },
      session,
      request: result.data,
      error: result.error,
    }
  }
)

export const loadOrgNotes = cache(async (orgId: string, requestId: string) => {
  const result = await $876.requestNotes.list(orgId, requestId, {
    includePrivate: true,
  })
  return { notes: result.data?.data ?? [], error: result.error }
})

export const loadOrgTasks = cache(async (orgId: string, requestId: string) => {
  const result = await $876.requestTasks.list(orgId, requestId)
  return { tasks: result.data?.data ?? [], error: result.error }
})

export const loadOrgReminders = cache(
  async (orgId: string, requestId: string) => {
    const result = await $876.requestReminders.list(orgId, requestId)
    return { reminders: result.data?.data ?? [], error: result.error }
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
    profilesError: profiles.error,
    membersError: directory.membersError,
    departmentsError: directory.departmentsError,
  }
})

export const loadRequest = cache(async (requestId: string) => {
  const { org, session } = await loadSupportContext(requestId)
  if (!org) return { org: null, session, request: null, error: null }
  return loadOrgRequest(org.id, requestId, `/support/${requestId}`)
})

export const loadDirectory = cache(async () => {
  const { org } = await loadSupportContext()
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
  const { org } = await loadSupportContext()
  if (!org) return { categories: new Map(), error: null }
  return loadOrgCategoryIndex(org.id)
})

export const loadPriorities = cache(async () => {
  const { org } = await loadSupportContext()
  if (!org) return { priorities: [], error: null }
  return loadOrgPriorities(org.id)
})

export const loadCustomer = cache(async (customerId: string) => {
  const { org } = await loadSupportContext()
  if (!org) return { profile: null, customer: null, error: null }
  return loadOrgCustomer(org.id, customerId)
})

export const loadNotes = cache(async (requestId: string) => {
  const { org } = await loadSupportContext(requestId)
  if (!org) return { notes: [], error: null }
  return loadOrgNotes(org.id, requestId)
})

export const loadTasks = cache(async (requestId: string) => {
  const { org } = await loadSupportContext(requestId)
  if (!org) return { tasks: [], error: null }
  return loadOrgTasks(org.id, requestId)
})

export const loadReminders = cache(async (requestId: string) => {
  const { org } = await loadSupportContext(requestId)
  if (!org) return { reminders: [], error: null }
  return loadOrgReminders(org.id, requestId)
})
