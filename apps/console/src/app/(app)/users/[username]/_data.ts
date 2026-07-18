import { cache } from 'react'
import { service } from '@/lib/service'

import { $876 } from '@/lib/876'

/**
 * Resolve a user by `user_*` id or username, including soft-deleted records so
 * Console can display deleted user detail pages with a tombstone banner.
 * Wrapped in React `cache()` so the segment layout, the overview page, and
 * each tab page dedupe to a single fetch per request.
 */
export const resolveUser = cache(async (username: string) => {
  const result = username.startsWith('user_')
    ? await $876.users.retrieve(username, { include_deleted: true })
    : await $876.users.retrieveByUsername(username, { include_deleted: true })
  if (result.error) return null
  return result.data
})

/**
 * The user's saved addresses. Cached so the layout (tab visibility), the
 * overview (count + preview), and the addresses tab share a single fetch.
 */
export const resolveUserAddresses = cache(async (userId: string) => {
  const result = await $876.users.listAddresses(userId)
  return result.error ? [] : result.data.data
})

/** The user's saved contacts. Cached and shared the same way as addresses. */
export const resolveUserContacts = cache(async (userId: string) => {
  const result = await $876.users.listContacts(userId)
  return result.error ? [] : result.data.data
})

/**
 * The user's consumer profile (nickname, phone, locale, …) — `null` when none
 * is saved. Only the edit form and the lazily-loaded Account accordion need it,
 * so it is no longer fetched as part of the eager page/layout load.
 */
export const resolveUserProfile = cache(async (userId: string) => {
  const result = await $876.users.retrieveProfile(userId)
  return result.error ? null : result.data
})

/**
 * The user's Console role, or `null` if they have no MC access. Read
 * from Console's OWN database (`@/lib/db`) by opaque user ID — the
 * identity API no longer carries this fact. Cached per request.
 */
export const resolveUserMcRole = cache(async (userId: string) => {
  const grant = await service.team.retrieve(userId)
  return grant?.roleName ?? null
})

/**
 * Count of the user's org memberships — feeds the Apps accordion count pill
 * without the per-org N+1 (org details load lazily when the panel opens).
 */
export const resolveUserMembershipCount = cache(async (userId: string) => {
  const result = await $876.memberships.list({ user_id: userId, limit: 50 })
  if (result.error) return 0
  return result.data.total_count ?? result.data.data.length
})

/**
 * The apps this user has authenticated through (session enrollments).
 * Used to show which 876-powered products the user has accessed.
 */
export const resolveUserApps = cache(async (userId: string) => {
  const result = await $876.users.listApps(userId)
  return result.error ? [] : result.data.data
})
