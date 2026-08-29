import 'server-only'

import { notFound } from 'next/navigation'
import { cache } from 'react'

import type { DirectoryMember } from '@/features/directory/types'
import { get876Client } from '@/lib/876'
import { requireCrmContext } from '@/lib/auth/require-crm-context'

export const loadCrmContext = cache(requireCrmContext)

export type RequestDepartment = { id: string; name: string }

export const loadRequest = cache(async (requestId: string) => {
  const context = await loadCrmContext()
  const $876 = await get876Client()
  const result = await $876.requests.retrieve(context.orgId, requestId)
  if (result.error?.code === 'crm/request-not-found') notFound()

  return { context, request: result.data, error: result.error }
})

export const loadDirectory = cache(async () => {
  const context = await loadCrmContext()
  const $876 = await get876Client()
  const [departmentsResult, membersResult] = await Promise.all([
    $876.departments.list(context.orgId),
    $876.organizationMembers.list(context.orgId),
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

export const loadCategoryIndex = cache(async () => {
  const context = await loadCrmContext()
  const $876 = await get876Client()
  const result = await $876.requestCategories.list(context.orgId)

  return {
    categories: new Map(
      (result.data?.data ?? []).map((category) => [category.id, category])
    ),
    error: result.error,
  }
})

export const loadPriorities = cache(async () => {
  const context = await loadCrmContext()
  const $876 = await get876Client()
  const result = await $876.requestPriorities.list(context.orgId)

  return { priorities: result.data?.data ?? [], error: result.error }
})

export const loadCustomer = cache(async (customerId: string) => {
  const context = await loadCrmContext()
  const $876 = await get876Client()
  const result = await $876.customerProfiles.retrieve(context.orgId, customerId)

  return {
    profile: result.data?.profile,
    customer: result.data?.customer,
    error: result.error,
  }
})

export const loadNotes = cache(async (requestId: string) => {
  const context = await loadCrmContext()
  const $876 = await get876Client()
  const result = await $876.requestNotes.list(context.orgId, requestId, {
    viewerId: context.userId,
  })

  return { notes: result.data?.data ?? [], error: result.error }
})

export const loadTasks = cache(async (requestId: string) => {
  const context = await loadCrmContext()
  const $876 = await get876Client()
  const result = await $876.requestTasks.list(context.orgId, requestId)

  return { tasks: result.data?.data ?? [], error: result.error }
})

export const loadReminders = cache(async (requestId: string) => {
  const context = await loadCrmContext()
  const $876 = await get876Client()
  const result = await $876.requestReminders.list(context.orgId, requestId)

  return { reminders: result.data?.data ?? [], error: result.error }
})
