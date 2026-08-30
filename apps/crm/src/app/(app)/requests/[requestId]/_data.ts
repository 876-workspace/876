import 'server-only'

import { notFound } from 'next/navigation'
import { cache } from 'react'

import type { DirectoryMember } from '@/features/directory/types'
import { requireCrmContext } from '@/lib/auth/require-crm-context'
import { crm } from '@/lib/services/crm'
import { getWorkspace } from '@/lib/services/workspace'

export const loadCrmContext = cache(requireCrmContext)
export type RequestTeam = { id: string; name: string; color: string | null }

export const loadRequest = cache(async (requestId: string) => {
  const context = await loadCrmContext()
  const result = await crm.requests.retrieve(context.orgId, requestId)
  if (result.error?.code === 'crm/request-not-found') notFound()
  return { context, request: result.data, error: result.error }
})

export const loadDirectory = cache(async () => {
  const context = await loadCrmContext()
  const workspace = await getWorkspace()
  const [teamsResult, membersResult] = await Promise.all([
    crm.teams.list(context.orgId, { status: 'ACTIVE' }),
    workspace.members.list(context.orgId),
  ])
  const teams: RequestTeam[] =
    teamsResult.data?.data.map((team) => ({ id: team.id, name: team.name, color: team.color })) ?? []
  const members: DirectoryMember[] =
    membersResult.data?.data.map((member) => {
      const nameParts = [member.first_name, member.last_name].filter(Boolean)
      const name = nameParts.length > 0 ? nameParts.join(' ') : (member.email ?? member.user_id)
      return { userId: member.user_id, name, email: member.email, avatar: member.avatar }
    }) ?? []
  return { teams, members, teamsError: teamsResult.error, membersError: membersResult.error }
})

export const loadCategoryIndex = cache(async () => {
  const context = await loadCrmContext()
  const result = await crm.requestCategories.list(context.orgId)
  return { categories: new Map((result.data?.data ?? []).map((category) => [category.id, category])), error: result.error }
})

export const loadPriorities = cache(async () => {
  const context = await loadCrmContext()
  const result = await crm.requestPriorities.list(context.orgId)
  return { priorities: result.data?.data ?? [], error: result.error }
})

export const loadCustomer = cache(async (customerId: string) => {
  const context = await loadCrmContext()
  const result = await crm.customerProfiles.retrieve(context.orgId, customerId)
  return { profile: result.data?.profile, customer: result.data?.customer, error: result.error }
})

export const loadNotes = cache(async (requestId: string) => {
  const context = await loadCrmContext()
  const result = await crm.requestNotes.list(context.orgId, requestId, { viewerId: context.userId })
  return { notes: result.data?.data ?? [], error: result.error }
})

export const loadTasks = cache(async (requestId: string) => {
  const context = await loadCrmContext()
  const result = await crm.requestTasks.list(context.orgId, requestId)
  return { tasks: result.data?.data ?? [], error: result.error }
})

export const loadReminders = cache(async (requestId: string) => {
  const context = await loadCrmContext()
  const result = await crm.requestReminders.list(context.orgId, requestId)
  return { reminders: result.data?.data ?? [], error: result.error }
})

export const loadEvents = cache(async (requestId: string) => {
  const context = await loadCrmContext()
  const result = await crm.requestEvents.list(context.orgId, requestId)
  return { events: result.data?.data ?? [], error: result.error }
})
