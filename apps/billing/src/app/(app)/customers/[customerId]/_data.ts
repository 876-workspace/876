import 'server-only'

import { cache } from 'react'
import type { PlatformOrganization } from '@876/core/platform'

import { getPlatformClient } from '@/lib/876/platform-client'

/** Where a customer's primary contact details were sourced from. */
export type PrimaryContactSource = 'org-owner' | 'org-member' | 'user' | 'self'

/** Resolved contact card for a customer's overview page. */
export interface PrimaryContact {
  name: string
  email: string | null
  phone: string | null
  avatar: string | null
  /** Human role label (e.g. `Owner`) when the contact is an org member. */
  role: string | null
  source: PrimaryContactSource
}

/** The 876 party (org + contact) behind a billing customer, when linked. */
export interface CustomerParty {
  org: PlatformOrganization | null
  memberCount: number | null
  contact: PrimaryContact | null
}

/** Minimal customer fields the party resolver reads. */
export interface CustomerPartyInput {
  customerType: string
  organizationId: string | null
  userId: string | null
  name: string
  email: string | null
  phone: string | null
}

function fullName(
  first: string | null,
  last: string | null,
  fallback: string
): string {
  const joined = [first, last].filter(Boolean).join(' ').trim()
  return joined || fallback
}

/**
 * Resolves the 876 org and primary contact behind a billing customer.
 *
 * - `CORE_ORGANIZATION`: the contact is the org's owner (falling back to any
 *   member), and the org header details come from the platform record.
 * - `CORE_USER`: the contact is the linked 876 user.
 * - `EXTERNAL`: the contact is the customer's own stored details.
 *
 * Cached per request so the layout header and overview page share one fetch.
 */
export const resolveCustomerParty = cache(
  async (customer: CustomerPartyInput): Promise<CustomerParty> => {
    const self: PrimaryContact = {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      avatar: null,
      role: null,
      source: 'self',
    }

    const platform = await getPlatformClient()

    if (
      customer.customerType === 'CORE_ORGANIZATION' &&
      customer.organizationId
    )
      return resolveOrgParty(platform, customer, self)

    if (customer.customerType === 'CORE_USER' && customer.userId) {
      const { data: user } = await platform.users.retrieve(customer.userId)
      if (!user) return { org: null, memberCount: null, contact: self }

      return {
        org: null,
        memberCount: null,
        contact: {
          name: fullName(user.first_name, user.last_name, user.email),
          email: user.email,
          phone: customer.phone,
          avatar: user.avatar,
          role: null,
          source: 'user',
        },
      }
    }

    return { org: null, memberCount: null, contact: self }
  }
)

async function resolveOrgParty(
  platform: Awaited<ReturnType<typeof getPlatformClient>>,
  customer: CustomerPartyInput,
  self: PrimaryContact
): Promise<CustomerParty> {
  const organizationId = customer.organizationId!

  const [orgResult, membersResult] = await Promise.all([
    platform.orgs.retrieve(organizationId),
    platform.memberships.list({ organization_id: organizationId, limit: 100 }),
  ])

  const org = orgResult.data
  const memberships = membersResult.data?.data ?? []
  const memberCount = membersResult.data ? memberships.length : null

  const primary =
    memberships.find((membership) => membership.role === 'owner') ??
    memberships[0] ??
    null

  if (!primary) return { org, memberCount, contact: self }

  const { data: owner } = await platform.users.retrieve(primary.user_id)
  if (!owner)
    return { org, memberCount, contact: { ...self, role: primary.role } }

  return {
    org,
    memberCount,
    contact: {
      name: fullName(owner.first_name, owner.last_name, owner.email),
      email: owner.email,
      phone: customer.phone,
      avatar: owner.avatar,
      role: primary.role === 'owner' ? 'Owner' : primary.role,
      source: primary.role === 'owner' ? 'org-owner' : 'org-member',
    },
  }
}
