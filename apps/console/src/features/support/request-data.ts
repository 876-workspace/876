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

/** The request itself. Calls `notFound()` for an id this org cannot see. */
export const loadRequest = cache(async (requestId: string) => {
  const { org, session } = await loadSupportContext(requestId)
  if (!org) return { org: null, session, request: null }

  const result = await $876.requests.retrieve(org.id, requestId)
  if (result.error?.code === 'crm/request-not-found') notFound()
  if (result.error) throw new Error(result.error.message)

  return { org, session, request: result.data }
})

/** The org's teams and members — what assignment and authorship resolve against. */
export const loadDirectory = cache(async () => {
  const { org } = await loadSupportContext()
  if (!org) return { departments: [], members: [] }

  const [departmentsResult, membersResult] = await Promise.all([
    $876.departments.list(org.id),
    $876.organizationMembers.list(org.id),
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

/**
 * The org's request-category catalog, as a lookup.
 */
export const loadCategoryIndex = cache(async () => {
  const { org } = await loadSupportContext()
  if (!org) return new Map()

  const result = await $876.requestCategories.list(org.id)

  return new Map(
    (result.data?.data ?? []).map((category) => [category.id, category])
  )
})

/** The customer this request belongs to. */
export const loadCustomer = cache(async (customerId: string) => {
  const { org } = await loadSupportContext()
  if (!org) return { profile: null, customer: null }

  const result = await $876.customers.retrieve(org.id, customerId)
  return {
    profile: null,
    customer: result.data ?? null,
  }
})

/** The request's notes. */
export const loadNotes = cache(async (requestId: string) => {
  const { org } = await loadSupportContext(requestId)
  if (!org) return []

  const result = await $876.requestNotes.list(org.id, requestId)
  if (result.error) throw new Error(result.error.message)
  return result.data.data
})

/** The request's tasks. */
export const loadTasks = cache(async (requestId: string) => {
  const { org } = await loadSupportContext(requestId)
  if (!org) return []

  const result = await $876.requestTasks.list(org.id, requestId)
  if (result.error) throw new Error(result.error.message)
  return result.data.data
})

/** The request's reminders. */
export const loadReminders = cache(async (requestId: string) => {
  const { org } = await loadSupportContext(requestId)
  if (!org) return []

  const result = await $876.requestReminders.list(org.id, requestId)
  if (result.error) throw new Error(result.error.message)
  return result.data.data
})
