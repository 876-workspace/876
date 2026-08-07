import { createHash } from 'node:crypto'

import { generateId } from '@/platform/ids'

export const CUSTOMER_EVENT_TYPE = 'customer.ensure'

export type PartySnapshot = {
  subjectType: string
  subjectId: string
  customerKind: string
  name: string
  email: string | null
  companyName: string | null
  firstName: string | null
  lastName: string | null
  phone: string | null
  contactUserId: string | null
  contactFirstName: string | null
  contactLastName: string | null
  contactEmail: string | null
  contactPhone: string | null
}

export type OrganizationRow = {
  id: string
  name: string | null
  shortName?: string | null
  slug: string
  doingBusinessAs?: string | null
  primaryEmail?: string | null
  primaryPhone?: string | null
  primaryContactUserId?: string | null
}

export type UserRow = {
  id: string
  email: string | null
  name?: string | null
  firstName?: string | null
  lastName?: string | null
  username?: string | null
  phone?: string | null
}

export type MembershipRow = {
  id: string
  organizationId: string
  userId: string
  role: string
  createdAt: bigint
}

export type BillingCustomerOutboxRow = {
  id: string
  eventType: string
  subjectType: string
  subjectId: string
  name: string
  email: string | null
  occurredAt: bigint
  status: string
  attemptCount: number
  availableAt: bigint
  lockedAt: bigint | null
  deliveredAt: bigint | null
  lastError: string | null
  createdAt: bigint
  updatedAt: bigint
  customerKind: string | null
  companyName: string | null
  firstName: string | null
  lastName: string | null
  phone: string | null
  contactUserId: string | null
  contactFirstName: string | null
  contactLastName: string | null
  contactEmail: string | null
  contactPhone: string | null
  payloadHash: string | null
}

export type BillingCustomerSyncRepository = {
  findUserById(userId: string): Promise<UserRow | null>
  listMembershipsByOrganizationId(
    organizationId: string
  ): Promise<MembershipRow[]>
  findLatestOutboxBySubject(
    subjectType: string,
    subjectId: string
  ): Promise<BillingCustomerOutboxRow | null>
  createOutboxEvent(
    data: BillingCustomerOutboxRow
  ): Promise<BillingCustomerOutboxRow>
  updateOutboxEvent(
    eventId: string,
    data: Partial<BillingCustomerOutboxRow>
  ): Promise<BillingCustomerOutboxRow>
  listOrganizations(): Promise<OrganizationRow[]>
  listKnownUserIds(): Promise<string[]>
}

export type BillingCustomerSyncDeps = {
  repository: BillingCustomerSyncRepository
}

function fullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string | null {
  const parts = [firstName, lastName]
    .filter(
      (part): part is string =>
        typeof part === 'string' && part.trim().length > 0
    )
    .map((part) => part.trim())
  return parts.length > 0 ? parts.join(' ') : null
}

function customerNameForUser(user: UserRow): string {
  return (
    (user.name?.trim() || null) ??
    fullName(user.firstName, user.lastName) ??
    (user.username?.trim() || null) ??
    (user.email?.trim() || null) ??
    user.id
  )
}

async function resolveOrgPrimaryContact(
  repository: BillingCustomerSyncRepository,
  organization: OrganizationRow
): Promise<UserRow | null> {
  const declaredId = (organization as Record<string, unknown>)
    .primaryContactUserId as string | null | undefined
  if (declaredId) {
    const declared = await repository.findUserById(declaredId)
    if (declared) return declared
  }

  const memberships = await repository.listMembershipsByOrganizationId(
    organization.id
  )
  if (memberships.length === 0) return null

  const sorted = [...memberships].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1
    return a.id.localeCompare(b.id)
  })

  const owner = sorted.find((m) => m.role === 'owner') ?? sorted[0]!
  return repository.findUserById(owner.userId)
}

export async function snapshotForOrganization(
  deps: BillingCustomerSyncDeps,
  organization: OrganizationRow
): Promise<PartySnapshot> {
  const contact = await resolveOrgPrimaryContact(deps.repository, organization)
  const legalName = organization.name ?? organization.id
  const displayName = (organization as Record<string, unknown>)
    .doingBusinessAs as string | null | undefined
  const name = (displayName as string | null) ?? legalName

  const primaryEmail = (organization as Record<string, unknown>)
    .primaryEmail as string | null | undefined
  const primaryPhone = (organization as Record<string, unknown>)
    .primaryPhone as string | null | undefined

  const contactPhone = contact
    ? (((contact as Record<string, unknown>).phone as
        | string
        | null
        | undefined) ?? null)
    : null

  return {
    subjectType: 'organization',
    subjectId: organization.id,
    customerKind: 'BUSINESS',
    name,
    email: (primaryEmail as string | null) ?? contact?.email ?? null,
    companyName: legalName,
    firstName: contact?.firstName ?? null,
    lastName: contact?.lastName ?? null,
    phone: (primaryPhone as string | null) ?? null,
    contactUserId: contact?.id ?? null,
    contactFirstName: contact?.firstName ?? null,
    contactLastName: contact?.lastName ?? null,
    contactEmail: contact?.email ?? null,
    contactPhone,
  }
}

export function snapshotForUser(user: UserRow): PartySnapshot {
  const email = (user.email?.trim() ? user.email : null) ?? null
  return {
    subjectType: 'user',
    subjectId: user.id,
    customerKind: 'INDIVIDUAL',
    name: customerNameForUser(user),
    email,
    companyName: null,
    firstName: (user.firstName?.trim() ? user.firstName : null) ?? null,
    lastName: (user.lastName?.trim() ? user.lastName : null) ?? null,
    phone: (user.phone ?? null) as string | null,
    contactUserId: null,
    contactFirstName: null,
    contactLastName: null,
    contactEmail: null,
    contactPhone: null,
  }
}

function payloadHash(snapshot: PartySnapshot): string {
  // Match Python's json.dumps(snapshot.__dict__, sort_keys=True, separators=(",", ":"))
  const sorted = Object.fromEntries(
    Object.entries(snapshot).sort(([a], [b]) => a.localeCompare(b))
  )
  const compact = JSON.stringify(sorted)
  return createHash('sha256').update(compact, 'utf-8').digest('hex')
}

function applySnapshot(
  event: BillingCustomerOutboxRow,
  snapshot: PartySnapshot,
  hash: string,
  now: number
): void {
  event.name = snapshot.name
  event.email = snapshot.email
  event.customerKind = snapshot.customerKind
  event.companyName = snapshot.companyName
  event.firstName = snapshot.firstName
  event.lastName = snapshot.lastName
  event.phone = snapshot.phone
  event.contactUserId = snapshot.contactUserId
  event.contactFirstName = snapshot.contactFirstName
  event.contactLastName = snapshot.contactLastName
  event.contactEmail = snapshot.contactEmail
  event.contactPhone = snapshot.contactPhone
  event.payloadHash = hash
  event.occurredAt = BigInt(now)
}

async function enqueueCustomerEnsure(
  deps: BillingCustomerSyncDeps,
  snapshot: PartySnapshot,
  now: number
): Promise<boolean> {
  const hash = payloadHash(snapshot)
  const latest = await deps.repository.findLatestOutboxBySubject(
    snapshot.subjectType,
    snapshot.subjectId
  )

  if (latest) {
    if (latest.status === 'pending' || latest.status === 'processing') {
      if (latest.payloadHash !== hash) {
        applySnapshot(latest, snapshot, hash, now)
        latest.updatedAt = BigInt(now)
        await deps.repository.updateOutboxEvent(latest.id, {
          name: latest.name,
          email: latest.email,
          customerKind: latest.customerKind,
          companyName: latest.companyName,
          firstName: latest.firstName,
          lastName: latest.lastName,
          phone: latest.phone,
          contactUserId: latest.contactUserId,
          contactFirstName: latest.contactFirstName,
          contactLastName: latest.contactLastName,
          contactEmail: latest.contactEmail,
          contactPhone: latest.contactPhone,
          payloadHash: latest.payloadHash,
          occurredAt: latest.occurredAt,
          updatedAt: latest.updatedAt,
        })
      }
      return false
    }

    if (latest.status === 'delivered' && latest.payloadHash === hash) {
      return false
    }
  }

  const event: BillingCustomerOutboxRow = {
    id: generateId('billingCustomerEvent'),
    eventType: CUSTOMER_EVENT_TYPE,
    subjectType: snapshot.subjectType,
    subjectId: snapshot.subjectId,
    name: snapshot.name,
    email: snapshot.email,
    occurredAt: BigInt(now),
    status: 'pending',
    attemptCount: 0,
    availableAt: BigInt(now),
    lockedAt: null,
    deliveredAt: null,
    lastError: null,
    createdAt: BigInt(now),
    updatedAt: BigInt(now),
    customerKind: null,
    companyName: null,
    firstName: null,
    lastName: null,
    phone: null,
    contactUserId: null,
    contactFirstName: null,
    contactLastName: null,
    contactEmail: null,
    contactPhone: null,
    payloadHash: null,
  }
  applySnapshot(event, snapshot, hash, now)
  await deps.repository.createOutboxEvent(event)
  return true
}

export async function enqueueCustomerEnsureForOrganization(
  deps: BillingCustomerSyncDeps,
  organization: OrganizationRow,
  now: number
): Promise<void> {
  const snapshot = await snapshotForOrganization(deps, organization)
  await enqueueCustomerEnsure(deps, snapshot, now)
}

export async function enqueueCustomerEnsureForUser(
  deps: BillingCustomerSyncDeps,
  user: UserRow,
  now: number
): Promise<void> {
  const snapshot = snapshotForUser(user)
  await enqueueCustomerEnsure(deps, snapshot, now)
}

export function customerEventPayload(
  event: BillingCustomerOutboxRow
): Record<string, unknown> {
  const common: Record<string, unknown> = {
    customerKind:
      event.customerKind ??
      (event.subjectType === 'organization' ? 'BUSINESS' : 'INDIVIDUAL'),
    name: event.name,
    email: event.email,
    firstName: event.firstName,
    lastName: event.lastName,
    phone: event.phone,
  }

  if (event.subjectType === 'organization') {
    return {
      ...common,
      customerType: 'CORE_ORGANIZATION',
      organizationId: event.subjectId,
      companyName: event.companyName,
      primaryContact: contactPayload(event),
    }
  }

  return {
    ...common,
    customerType: 'CORE_USER',
    userId: event.subjectId,
  }
}

function contactPayload(
  event: BillingCustomerOutboxRow
): Record<string, unknown> | null {
  if (!event.contactUserId) return null
  return {
    userId: event.contactUserId,
    firstName: event.contactFirstName,
    lastName: event.contactLastName,
    email: event.contactEmail,
    phone: event.contactPhone,
  }
}

export async function enqueueReconcileAll(
  deps: BillingCustomerSyncDeps,
  now: number
): Promise<{ organizations: number; users: number }> {
  const organizations = await deps.repository.listOrganizations()
  let organizationCount = 0
  for (const organization of organizations) {
    const snapshot = await snapshotForOrganization(deps, organization)
    if (await enqueueCustomerEnsure(deps, snapshot, now)) {
      organizationCount += 1
    }
  }

  const knownUserIds = await deps.repository.listKnownUserIds()
  let userCount = 0
  for (const userId of knownUserIds) {
    const user = await deps.repository.findUserById(userId)
    if (!user) continue
    const snapshot = snapshotForUser(user)
    if (await enqueueCustomerEnsure(deps, snapshot, now)) {
      userCount += 1
    }
  }

  return { organizations: organizationCount, users: userCount }
}

// Exported for tests — mirrors Python's private but tests import via snapshot helpers
export { payloadHash as _payloadHash }
