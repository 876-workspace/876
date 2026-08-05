import { cache } from 'react'
import { service } from '@/lib/service'

import { $876 } from '@/lib/876'
import type {
  AccountShape,
  UserOrgMembership,
  UserRelationship,
  UserRequestSummary,
} from '@/types/customer'

/**
 * Resolve a user by `user_*` id or username, including soft-deleted records so
 * Console can display deleted user detail pages with a tombstone banner.
 * Wrapped in React `cache()` so the segment layout, the overview page, and
 * each tab page dedupe to a single fetch per request.
 */
export const resolveUser = cache(async (username: string) => {
  const result = username.startsWith('user_')
    ? await $876.users.retrieve(username, { includeDeleted: true })
    : await $876.users.retrieveByUsername(username, {
        includeDeleted: true,
      })
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
  const result = await $876.memberships.list({ userId, limit: 50 })
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

/**
 * The user's sign-in methods — email/password plus every linked social account
 * (Google, Apple, …). This is the answer to "they logged in through Google,
 * where does that show": it is credential data, so it belongs with the rest of
 * the account's security posture, not mixed into their profile facts.
 */
export const resolveUserAccounts = cache(async (userId: string) => {
  const result = await $876.users.listAccounts(userId)
  return result.error ? [] : result.data.data
})

/**
 * Every org membership the user holds, joined to its organization.
 *
 * The org lookups fan out in parallel rather than sequentially — a user in six
 * organizations would otherwise pay six round trips in series. A membership
 * whose org fails to resolve is kept with a null org so the row still renders
 * (a dangling membership is itself worth seeing in Console).
 */
export const resolveUserMemberships = cache(
  async (userId: string): Promise<UserOrgMembership[]> => {
    const result = await $876.memberships.list({ userId, limit: 50 })
    if (result.error) return []

    return Promise.all(
      result.data.data.map(async (membership) => {
        const org = await $876.organizations.retrieve(
          membership.organization_id
        )
        return { membership, org: org.error ? null : org.data }
      })
    )
  }
)

/**
 * How this account reads today. Derived, never stored — see `AccountShape`.
 *
 * A user with no memberships is consumer-shaped; with memberships, enterprise-
 * shaped; with both memberships and app relationships of their own, `dual` — the
 * courier employee who is also a customer. The views light up different sections
 * per shape rather than branching into two different pages, because the same
 * person can be both and a page type cannot.
 */
export const resolveAccountShape = cache(
  async (userId: string): Promise<AccountShape> => {
    const [memberships, relationships] = await Promise.all([
      resolveUserMemberships(userId),
      resolveUserRelationships(userId),
    ])
    if (memberships.length === 0) return 'consumer'
    return relationships.length > 0 ? 'dual' : 'enterprise'
  }
)

/**
 * The user's (organization × app) relationships — their Layer 3 app profiles.
 *
 * **Not yet wired to a source.** The data exists (couriers'
 * `CourierCustomerProfile`, the registry's `billing_customers`) but each owning
 * app must first expose it over its own internal admin surface, keyed by the
 * opaque 876 user id, for Console to read with the shared service key. Until
 * then this resolves empty and the views render their empty state.
 *
 * The wiring, when it lands, is one `Promise.all` here — one call per app that
 * declares a customer profile — mapped into `UserRelationship`. Console must
 * never query another app's database directly, and must never hold a
 * cross-database foreign key to one; see `.claude/rules/platform-services.md`.
 */
export const resolveUserRelationships = cache(
  async (userId: string): Promise<UserRelationship[]> => {
    void userId
    return []
  }
)

/**
 * The user's support requests and disputes, newest first.
 *
 * **Not yet wired to a source.** 876 Desk is a shared platform service with its
 * own bounded context; it does not exist yet. This resolver is the seam: when
 * the service ships, this becomes a single scoped list call and every surface
 * that already reads it — the Requests tab and all three overview variants —
 * lights up without touching a component.
 */
export const resolveUserRequests = cache(
  async (userId: string): Promise<UserRequestSummary[]> => {
    void userId
    return []
  }
)
