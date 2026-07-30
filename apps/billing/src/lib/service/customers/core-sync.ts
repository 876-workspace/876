import { nowUnixSeconds } from '@876/core/timestamps'
import type { Platform876Client } from '@876/core/platform'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'

/** An org owner resolved from the live 876 identity API. */
export interface ResolvedOrgOwner {
  userId: string
  firstName: string | null
  lastName: string | null
  email: string | null
}

/** The organization identity fields mirrored onto its customer record. */
interface ResolvedOrgParty {
  /** Registered/legal name. */
  companyName: string | null
  /** Trading name when set, otherwise the legal name. */
  displayName: string | null
  email: string | null
  phone: string | null
}

/**
 * Resolves the owner of a core 876 organization via the platform API. Prefers
 * the membership whose role is `owner`; falls back to the earliest-created
 * membership when no explicit owner role is present. Returns null when the org
 * cannot be resolved (absent, no members, or an API error) — callers must not
 * fabricate a contact in that case.
 */
export async function resolveOrgOwner(
  platform: Platform876Client,
  organizationId: string
): Promise<ResolvedOrgOwner | null> {
  const memberships = await platform.memberships.list({
    organizationId,
    limit: 100,
  })
  if (memberships.error || !memberships.data) return null

  const rows = memberships.data.data
  if (rows.length === 0) return null

  const owner =
    rows.find((membership) => membership.role === 'owner') ??
    rows.reduce((earliest, current) =>
      current.created_at < earliest.created_at ? current : earliest
    )

  const user = await platform.users.retrieve(owner.user_id)
  if (user.error || !user.data)
    return {
      userId: owner.user_id,
      firstName: null,
      lastName: null,
      email: null,
    }

  return {
    userId: owner.user_id,
    firstName: user.data.first_name,
    lastName: user.data.last_name,
    email: user.data.email,
  }
}

/**
 * Resolves an organization's identity fields from the live 876 record.
 *
 * Uses the profile endpoint so the legal name, trading name, and AP contact
 * details are available; falls back to the basic org record when the profile
 * cannot be read. Returns null only when neither can be resolved.
 */
export async function resolveOrgParty(
  platform: Platform876Client,
  organizationId: string
): Promise<ResolvedOrgParty | null> {
  const profile = await platform.organizations.retrieveProfile(organizationId)
  if (profile.data)
    return {
      companyName: profile.data.name,
      displayName: profile.data.doing_business_as ?? profile.data.name,
      email: profile.data.primary_email,
      phone: profile.data.primary_phone,
    }

  const org = await platform.organizations.retrieve(organizationId)
  if (!org.data) return null

  return {
    companyName: org.data.name,
    displayName: org.data.name,
    email: null,
    phone: null,
  }
}

/** Outcome of a single owner-contact sync. */
export type OwnerContactSync =
  | { status: 'created'; contactId: string }
  | { status: 'refreshed'; contactId: string }
  | { status: 'skipped'; reason: 'not_core_org' | 'unresolved' }

/**
 * Ensures a core-organization customer has a primary contact set to the org's
 * owner, refreshing the cached snapshot from the live 876 record. Members are
 * never bulk-imported — only the owner is seeded as the default contact.
 */
export async function syncOrgOwnerContact(
  platform: Platform876Client,
  tenantId: string,
  customerId: string,
  organizationId: string
): Promise<OwnerContactSync> {
  const [owner, party] = await Promise.all([
    resolveOrgOwner(platform, organizationId),
    resolveOrgParty(platform, organizationId),
  ])

  const now = nowUnixSeconds()

  // Repair the party snapshot even when the owner cannot be resolved: a
  // business customer with a company name and no contact still beats a blank
  // row. Only fields Core actually resolved are written.
  if (party)
    await prisma.customer.updateMany({
      where: { id: customerId, tenantId },
      data: {
        customerKind: 'BUSINESS',
        ...(party.displayName ? { name: party.displayName } : {}),
        companyName: party.companyName,
        ...(party.email ? { email: party.email } : {}),
        ...(party.phone ? { phone: party.phone } : {}),
        ...(owner
          ? { firstName: owner.firstName, lastName: owner.lastName }
          : {}),
        coreSyncedAt: now,
        updatedAt: now,
      },
    })

  if (!owner) return { status: 'skipped', reason: 'unresolved' }
  const existing = await prisma.contact.findFirst({
    where: { tenantId, customerId, userId: owner.userId },
    select: { id: true },
  })

  if (existing) {
    await prisma.contact.update({
      where: { id: existing.id },
      data: {
        salutation: undefined,
        firstName: owner.firstName,
        lastName: owner.lastName,
        email: owner.email,
        isPrimary: true,
        coreSyncedAt: now,
        updatedAt: now,
      },
    })
    return { status: 'refreshed', contactId: existing.id }
  }

  // A customer may already have a hand-added primary contact; demote it so the
  // owner becomes primary without violating the one-primary-per-customer index.
  await prisma.contact.updateMany({
    where: { tenantId, customerId, isPrimary: true },
    data: { isPrimary: false, updatedAt: now },
  })

  const contact = await prisma.contact.create({
    data: {
      id: generateId('Contact'),
      tenantId,
      customerId,
      userId: owner.userId,
      firstName: owner.firstName,
      lastName: owner.lastName,
      email: owner.email,
      isPrimary: true,
      coreSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  })

  await prisma.customer.updateMany({
    where: { id: customerId, tenantId },
    data: { coreSyncedAt: now, updatedAt: now },
  })

  return { status: 'created', contactId: contact.id }
}

/**
 * Backfills owner primary-contacts for every core-organization customer in a
 * tenant (or all tenants when omitted). Idempotent and safe to re-run; skips
 * orgs that cannot be resolved against the identity API.
 */
export async function backfillOrgOwnerContacts(
  platform: Platform876Client,
  tenantId?: string
): Promise<{ created: number; refreshed: number; skipped: number }> {
  const customers = await prisma.customer.findMany({
    where: {
      customerType: 'CORE_ORGANIZATION',
      organizationId: { not: null },
      ...(tenantId ? { tenantId } : {}),
    },
    select: { id: true, tenantId: true, organizationId: true },
  })

  let created = 0
  let refreshed = 0
  let skipped = 0

  for (const customer of customers) {
    const result = await syncOrgOwnerContact(
      platform,
      customer.tenantId,
      customer.id,
      customer.organizationId as string
    )
    if (result.status === 'created') created += 1
    else if (result.status === 'refreshed') refreshed += 1
    else skipped += 1
  }

  return { created, refreshed, skipped }
}
