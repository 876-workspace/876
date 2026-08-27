import 'server-only'

import { cache } from 'react'
import { notFound } from 'next/navigation'

import { get876Client } from '@/lib/876'
import { requireCrmContext } from '@/lib/auth/require-crm-context'
import type { DirectoryMember } from '@/features/directory/types'

/**
 * Loaders for the request record, shared by its layout and every tab page.
 *
 * Each is wrapped in `React.cache`, so a layout resolving the identity band and
 * a page resolving its own content inside the same request pay for one call
 * between them. Every loader takes primitives: `cache` compares arguments with
 * `Object.is`, and an options object would miss on every call.
 */
export const loadCrmContext = cache(requireCrmContext)

export type RequestDepartment = {
  id: string
  name: string
}

/** The request itself. Calls `notFound()` for an id this org cannot see. */
export const loadRequest = cache(async (requestId: string) => {
  const context = await loadCrmContext()
  const $876 = await get876Client()
  const result = await $876.requests.retrieve(context.orgId, requestId)
  if (result.error?.code === 'crm/request-not-found') notFound()
  if (result.error) throw new Error(result.error.message)

  return { context, request: result.data }
})

/** The org's teams and members — what assignment and authorship resolve against. */
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

  return { departments, members }
})

/**
 * The org's request-category catalog, as a lookup.
 *
 * Every category is loaded, not only the active ones: a request keeps its
 * category after that category is archived, and resolving only active rows
 * would blank the field on exactly the historical requests that still need it.
 */
export const loadCategoryIndex = cache(async () => {
  const context = await loadCrmContext()
  const $876 = await get876Client()
  const result = await $876.requestCategories.list(context.orgId)

  return new Map(
    (result.data?.data ?? []).map((category) => [category.id, category])
  )
})

/** The customer this request belongs to, as the registry holds them. */
export const loadCustomer = cache(async (customerId: string) => {
  const context = await loadCrmContext()
  const $876 = await get876Client()
  const result = await $876.customerProfiles.retrieve(context.orgId, customerId)
  return {
    profile: result.data?.profile,
    customer: result.data?.customer,
  }
})

/**
 * The request's notes.
 *
 * A failed read is an outage, not an empty thread. Swallowing it with `?? []`
 * renders "no notes" over a broken request and hides the real cause.
 */
export const loadNotes = cache(async (requestId: string) => {
  const context = await loadCrmContext()
  const $876 = await get876Client()
  const result = await $876.requestNotes.list(context.orgId, requestId)
  if (result.error) throw new Error(result.error.message)
  return result.data.data
})
