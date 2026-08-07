import { randomBytes } from 'node:crypto'

import { Prisma } from '@/db'

import { AppHttpError } from '@/http/errors'
import { listObject, type ListObject } from '@/http/envelope'
import { generateId, normalizeSlug } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'
import { defaultPermissionsForRoleName } from '@/platform/permissions'
import { reconcileFinanceConnections } from '@/services/finance-provisioning'
import { createFinanceProvisioningRepository } from '@/services/finance-provisioning.repository'
import { provisionOrganization } from '@/services/provisioning'
import {
  deleteProviderOrganization,
  ensureProviderMembership,
} from '@/services/identity-sync'
import { getSettings } from '@/config'
import { getAuthProvider } from '@/providers/workos/adapter'
import {
  createOrganizationBootstrapDeps,
  bootstrapExistingUser as bootstrapExistingUserFn,
} from '@/services/organization-bootstrap'

import { findRoleByIdForOrg } from './access.repository'
import * as repository from './organizations.repository'
import {
  serializeInvite,
  serializeOrganization,
  serializeSubscription,
} from './organizations.serializers'
import type {
  InviteCreateBody,
  InviteToken,
  ListOrganizationsQuery,
  Organization,
  OrganizationCreateBody,
  OrganizationUpdateBody,
  OrgProfileUpdateBody,
  OrgSetupBody,
  SearchOrganizationsQuery,
  Subscription,
  SubscriptionProvisionBody,
  SubscriptionUpdateBody,
} from './organizations.schemas'

function notFound(code: string, message: string): AppHttpError {
  return new AppHttpError({ code, message, httpStatus: 404 })
}

function forbidden(message = 'Forbidden.'): AppHttpError {
  return new AppHttpError({ code: 'auth/forbidden', message, httpStatus: 403 })
}

function noSession(): AppHttpError {
  return new AppHttpError({
    code: 'auth/no-session',
    message: 'No active session.',
    httpStatus: 401,
  })
}

export type Principal = {
  internal: boolean
  userId: string | null
}

export async function requireOrgMembership(
  organizationId: string,
  principal: Principal,
  roles?: readonly string[]
): Promise<void> {
  if (principal.internal) return
  if (!principal.userId) throw noSession()
  const membership = await repository.findMembershipByOrgAndUser(
    organizationId,
    principal.userId
  )
  if (!membership || membership.status !== 'active') throw forbidden()
  if (roles && !roles.includes(membership.role)) throw forbidden()
}

export async function requireOrgPermission(
  organizationId: string,
  principal: Principal,
  permission: string
): Promise<void> {
  if (principal.internal) return
  if (!principal.userId) throw noSession()
  const membership = await repository.findMembershipByOrgAndUser(
    organizationId,
    principal.userId
  )
  if (!membership || membership.status !== 'active') throw forbidden()
  const permissions = await resolveMemberPermissions(membership)
  if (!permissions.has(permission)) throw forbidden()
}

async function resolveMemberPermissions(membership: {
  roleId: string | null
  organizationId: string
  role: string
}): Promise<Set<string>> {
  if (membership.roleId) {
    const role = await findRoleByIdForOrg(
      membership.roleId,
      membership.organizationId
    ).catch(() => null)
    if (role) return new Set(role.permissions)
  }
  return new Set(defaultPermissionsForRoleName(membership.role))
}

function applyOrgProfileFields(
  updateData: Record<string, unknown>,
  body: OrgProfileUpdateBody,
  explicitlySet: Record<string, unknown>
): void {
  if (body.name !== undefined && body.name !== null)
    updateData.name = (body.name as string).trim()
  else if ('name' in explicitlySet) updateData.name = body.name
  const fields = [
    'short_name',
    'logo_file_id',
    'logo_url',
    'primary_phone',
    'primary_email',
    'fax',
    'website_url',
    'support_url',
    'doing_business_as',
    'industry',
    'business_type',
    'registration_number',
    'trn',
    'nis_number',
    'gct_number',
    'tax_id',
    'incorporation_date',
    'primary_contact_user_id',
    'timezone',
    'language',
    'address_line1',
    'address_line2',
    'city',
    'region_id',
  ] as const
  for (const field of fields) {
    if (field in explicitlySet) {
      const key = field
      // map snake to camel for prisma
      const prismaKey = snakeToCamel(key)
      updateData[prismaKey] = (body as Record<string, unknown>)[key]
    }
  }
  if ('country_code' in explicitlySet) {
    const value = (body as Record<string, unknown>).country_code as
      | string
      | null
      | undefined
    updateData.countryCode = value ? value.toUpperCase() : (value ?? null)
  }
  if ('currency_code' in explicitlySet) {
    const value = (body as Record<string, unknown>).currency_code as
      | string
      | null
      | undefined
    updateData.currencyCode = value ? value.toUpperCase() : (value ?? null)
  }
}

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

function sentFields<T extends object>(body: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(body).filter(([, v]) => v !== undefined)
  )
}

export async function listOrganizations(
  query: ListOrganizationsQuery
): Promise<ListObject<Organization>> {
  if (query.search) {
    const rows = await repository.searchOrganizations({
      query: query.search,
      limit: query.limit,
      status: query.status ?? null,
    })
    return listObject({
      data: rows.map(serializeOrganization),
      hasMore: false,
      url: '/organizations',
    })
  }
  const { data, hasMore } = await repository.listOrganizations({
    limit: query.limit,
    starting_after: query.starting_after,
    ending_before: query.ending_before,
    includeDeleted: query.include_deleted ?? false,
    status: query.status ?? null,
    search: null,
  })
  return listObject({
    data: data.map(serializeOrganization),
    hasMore,
    url: '/organizations',
  })
}

export async function searchOrganizations(
  query: SearchOrganizationsQuery
): Promise<ListObject<Organization>> {
  const rows = await repository.searchOrganizations({
    query: query.query,
    limit: query.limit,
    status: query.status ?? null,
  })
  return listObject({
    data: rows.map(serializeOrganization),
    hasMore: false,
    url: '/organizations/search',
  })
}

export async function createOrganization(
  body: OrganizationCreateBody
): Promise<Organization> {
  const newId = generateId('organization')
  const rawSlug = body.slug || newId
  const normalizedSlug = normalizeSlug(rawSlug)
  const finalSlug = normalizedSlug || newId.toLowerCase()

  if (await repository.findOrganizationBySlug(finalSlug)) {
    throw new AppHttpError({
      code: 'organization/duplicate-slug',
      message: 'An organization with this slug already exists.',
      httpStatus: 409,
    })
  }
  if (body.workos_organization_id) {
    if (
      await repository.findOrganizationByWorkosId(body.workos_organization_id)
    ) {
      throw new AppHttpError({
        code: 'organization/duplicate-workos-id',
        message: 'An organization with this WorkOS identifier already exists.',
        httpStatus: 409,
      })
    }
  }
  const now = nowUnixSeconds()
  const nowBig = BigInt(now)
  const org = await repository.createOrganization({
    id: newId,
    workosOrganizationId: body.workos_organization_id ?? null,
    name: body.name?.trim() ?? null,
    shortName: body.short_name ?? null,
    doingBusinessAs: body.doing_business_as ?? null,
    slug: finalSlug,
    status: body.status ?? 'active',
    industry: body.industry ?? null,
    businessType: body.business_type ?? null,
    registrationNumber: body.registration_number ?? null,
    trn: body.trn ?? null,
    nisNumber: body.nis_number ?? null,
    gctNumber: body.gct_number ?? null,
    taxId: body.tax_id ?? null,
    incorporationDate: body.incorporation_date ?? null,
    primaryPhone: body.primary_phone ?? null,
    primaryEmail: body.primary_email ?? null,
    fax: body.fax ?? null,
    websiteUrl: body.website_url ?? null,
    supportUrl: body.support_url ?? null,
    primaryContactUserId: body.primary_contact_user_id ?? null,
    timezone: body.timezone ?? null,
    language: body.language ?? null,
    addressLine1: body.address_line1 ?? null,
    addressLine2: body.address_line2 ?? null,
    city: body.city ?? null,
    regionId: body.region_id ?? null,
    countryCode: body.country_code ?? null,
    currencyCode: body.currency_code ?? 'JMD',
    metadata: body.metadata ?? null,
    createdAt: nowBig,
    updatedAt: nowBig,
  })
  await provisionOrganization(org.id, now)
  return serializeOrganization(org)
}

export async function bootstrapOrganization(body: {
  ownerUserId: string
  name: string
  slug?: string | null
}): Promise<Organization> {
  const deps = createOrganizationBootstrapDeps()
  const org = await bootstrapExistingUserFn(deps, {
    ownerUserId: body.ownerUserId,
    name: body.name,
    slug: body.slug ?? null,
  })
  return serializeOrganization(org as unknown as never)
}

export async function setupOrganization(
  body: OrgSetupBody
): Promise<Organization> {
  const org = await repository.findOrganizationById(body.organizationId)
  if (!org)
    throw notFound(
      'organization/not-found',
      'No organization exists with the provided identifier.'
    )
  const normalizedSlug = normalizeSlug(body.slug)
  if (!normalizedSlug) {
    throw new AppHttpError({
      code: 'organization/validation-failed',
      message: 'Invalid slug.',
      httpStatus: 400,
    })
  }
  const existing = await repository.findOrganizationBySlug(normalizedSlug)
  if (existing && existing.id !== body.organizationId) {
    throw new AppHttpError({
      code: 'organization/duplicate-slug',
      message: 'An organization with this slug already exists.',
      httpStatus: 409,
    })
  }
  const now = nowUnixSeconds()
  const updated = await repository.updateOrganization(body.organizationId, {
    name: body.name.trim(),
    slug: normalizedSlug,
    primaryPhone: body.primary_phone,
    primaryEmail: body.primary_email ?? null,
    websiteUrl: body.websiteUrl ?? null,
    supportUrl: body.supportUrl ?? null,
    addressLine1: body.address_line1,
    addressLine2: body.addressLine2 ?? null,
    city: body.city,
    regionId: body.regionId,
    countryCode: body.countryCode.toUpperCase(),
    currencyCode: body.currencyCode.toUpperCase(),
    enrollmentCompletedAt: BigInt(now),
    updatedAt: BigInt(now),
  })
  if (!updated)
    throw notFound(
      'organization/not-found',
      'No organization exists with the provided identifier.'
    )
  return serializeOrganization(updated)
}

export async function retrieveOrganization(
  organizationId: string,
  includeDeleted: boolean
): Promise<Organization> {
  const org = await repository.findOrganizationById(
    organizationId,
    includeDeleted
  )
  if (!org)
    throw notFound(
      'organization/not-found',
      'No organization exists with the provided identifier.'
    )
  return serializeOrganization(org)
}

export async function retrieveOrganizationBySlug(
  slug: string,
  includeDeleted: boolean
): Promise<Organization> {
  const org = await repository.findOrganizationBySlug(slug, includeDeleted)
  if (!org)
    throw notFound(
      'organization/not-found',
      'No organization exists with the provided slug.'
    )
  return serializeOrganization(org)
}

export async function updateOrganization(
  organizationId: string,
  body: OrganizationUpdateBody
): Promise<Organization> {
  const org = await repository.findOrganizationById(organizationId)
  if (!org)
    throw notFound(
      'organization/not-found',
      'No organization exists with the provided identifier.'
    )

  const updateData: Record<string, unknown> = {}
  const explicitlySet = sentFields(body)
  applyOrgProfileFields(
    updateData,
    body as unknown as OrgProfileUpdateBody,
    explicitlySet
  )

  if (body.slug !== undefined && body.slug !== null) {
    const normalizedSlug = normalizeSlug(body.slug)
    const existing = await repository.findOrganizationBySlug(normalizedSlug)
    if (existing && existing.id !== organizationId) {
      throw new AppHttpError({
        code: 'organization/duplicate-slug',
        message: 'An organization with this slug already exists.',
        httpStatus: 409,
      })
    }
    updateData.slug = normalizedSlug
  }
  if ('workos_organization_id' in explicitlySet) {
    const value = body.workos_organization_id
    if (value) {
      const existing = await repository.findOrganizationByWorkosId(value)
      if (existing && existing.id !== organizationId) {
        throw new AppHttpError({
          code: 'organization/duplicate-workos-id',
          message:
            'An organization with this WorkOS identifier already exists.',
          httpStatus: 409,
        })
      }
    }
    updateData.workosOrganizationId = value ?? null
  }
  if (body.status !== undefined && body.status !== null)
    updateData.status = body.status
  if ('metadata' in explicitlySet) {
    updateData.metadata = body.metadata ?? Prisma.DbNull
  }
  updateData.updatedAt = BigInt(nowUnixSeconds())

  const updated = await repository.updateOrganization(
    organizationId,
    updateData
  )
  if (!updated)
    throw notFound(
      'organization/not-found',
      'No organization exists with the provided identifier.'
    )

  // A status change can activate or suspend the org's finance connections, so
  // the reconcile runs inline and its failure surfaces — the Python does the
  // same. Swallowing it would leave the connection state silently diverged
  // from the org it belongs to.
  if ('status' in updateData) {
    await reconcileFinanceConnections(
      { repository: createFinanceProvisioningRepository() },
      { organizationId, limit: null }
    )
  }

  return serializeOrganization(updated)
}

export async function retrieveOrganizationProfile(
  organizationId: string,
  principal: Principal
): Promise<Organization> {
  await requireOrgMembership(organizationId, principal)
  const org = await repository.findOrganizationById(organizationId)
  if (!org)
    throw notFound(
      'organization/not-found',
      'No organization exists with the provided identifier.'
    )
  return serializeOrganization(org)
}

export async function updateOrganizationProfile(
  organizationId: string,
  body: OrgProfileUpdateBody,
  principal: Principal
): Promise<Organization> {
  await requireOrgMembership(organizationId, principal, ['owner', 'admin'])
  const org = await repository.findOrganizationById(organizationId)
  if (!org)
    throw notFound(
      'organization/not-found',
      'No organization exists with the provided identifier.'
    )
  const updateData: Record<string, unknown> = {}
  const explicitlySet = sentFields(body)
  applyOrgProfileFields(updateData, body, explicitlySet)
  updateData.updatedAt = BigInt(nowUnixSeconds())
  const updated = await repository.updateOrganization(
    organizationId,
    updateData
  )
  if (!updated)
    throw notFound(
      'organization/not-found',
      'No organization exists with the provided identifier.'
    )
  return serializeOrganization(updated)
}

export async function deleteOrganization(
  organizationId: string,
  deletedBy: string | null,
  reason: string | null
): Promise<{ object: 'organization'; id: string; deleted: true }> {
  const org = await repository.findOrganizationById(organizationId, true)
  if (!org)
    throw notFound(
      'organization/not-found',
      'No organization exists with the provided identifier.'
    )
  const memberCount = await repository.countMembershipsForOrg(organizationId)
  if (memberCount > 0) {
    throw new AppHttpError({
      code: 'organization/has-members',
      message:
        'Remove all members before deleting this organization, or purge it to permanently delete the organization and everything in it.',
      httpStatus: 409,
    })
  }
  const workosId = org.workosOrganizationId
  await repository.deleteOrganization(organizationId, deletedBy, reason)
  if (workosId) {
    try {
      const provider = getAuthProvider(getSettings())
      await deleteProviderOrganization(
        provider as unknown as Parameters<typeof deleteProviderOrganization>[0],
        workosId,
        {
          localOrganizationId: organizationId,
        }
      )
    } catch {
      // provider errors propagate? Python flushes then calls provider; we swallow AlreadyGone via service
    }
  }
  return { object: 'organization', id: organizationId, deleted: true }
}

export async function purgeOrganization(
  organizationId: string,
  deletedBy: string | null
): Promise<{ object: 'organization'; id: string; deleted: true }> {
  const org = await repository.findOrganizationById(organizationId, true)
  if (!org)
    throw notFound(
      'organization/not-found',
      'No organization exists with the provided identifier.'
    )
  const workosId = org.workosOrganizationId
  await repository.purgeOrganization(organizationId)
  if (workosId) {
    try {
      const provider = getAuthProvider(getSettings())
      await deleteProviderOrganization(
        provider as unknown as Parameters<typeof deleteProviderOrganization>[0],
        workosId,
        {
          localOrganizationId: organizationId,
        }
      )
    } catch {
      // ignore
    }
  }
  void deletedBy
  return { object: 'organization', id: organizationId, deleted: true }
}

export async function listOrganizationMemberships(
  organizationId: string,
  query: { limit: number; starting_after?: string; ending_before?: string }
): Promise<
  ListObject<{
    object: 'membership'
    id: string
    organization_id: string
    user_id: string
    role: string
    status: string
    created_at: number
    updated_at: number
  }>
> {
  const org = await repository.findOrganizationById(organizationId)
  if (!org)
    throw notFound(
      'organization/not-found',
      'No organization exists with the provided identifier.'
    )
  const { data, hasMore } = await repository.listMembershipsForOrg(
    organizationId,
    query
  )
  const { fromDbUnixSeconds } = await import('@/platform/timestamps')
  const serialized = data.map((row) => ({
    object: 'membership' as const,
    id: row.id,
    organization_id: row.organizationId,
    user_id: row.userId,
    role: row.role,
    status: row.status,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }))
  return listObject({
    data: serialized,
    hasMore,
    url: `/organizations/${organizationId}/memberships`,
  })
}

export async function createOrganizationMembership(
  organizationId: string,
  body: { user_id: string; role?: string | null; status?: string | null }
): Promise<{
  object: 'membership'
  id: string
  organization_id: string
  user_id: string
  role: string
  status: string
  created_at: number
  updated_at: number
}> {
  const org = await repository.findOrganizationById(organizationId)
  if (!org) {
    throw new AppHttpError({
      code: 'membership/validation-failed',
      message: 'Please check the membership input and try again.',
      httpStatus: 400,
    })
  }
  const user = await repository.findUserById(body.user_id)
  if (!user)
    throw notFound(
      'membership/not-found',
      'No membership exists with the provided identifier.'
    )
  if (
    await repository.findMembershipByOrgAndUser(organizationId, body.user_id)
  ) {
    throw new AppHttpError({
      code: 'membership/duplicate',
      message: 'This user is already a member of the organization.',
      httpStatus: 409,
    })
  }
  const now = nowUnixSeconds()
  const nowBig = BigInt(now)
  const role = body.role ?? 'member'
  const workosMembershipId = await ensureProviderMembership(
    getAuthProvider(getSettings()) as unknown as Parameters<
      typeof ensureProviderMembership
    >[0],
    {
      workosOrganizationId: org.workosOrganizationId,
      workosUserId: user.workosUserId,
      role,
    }
  )
  const membership = await repository.createMembership({
    id: generateId('membership'),
    organizationId,
    userId: body.user_id,
    workosMembershipId,
    role,
    status: body.status ?? 'active',
    createdAt: nowBig,
    updatedAt: nowBig,
  })
  // Link role and assign apps best-effort
  try {
    const { linkMembershipRole, assignMemberApps } =
      await import('@/services/provisioning')
    await (
      linkMembershipRole as unknown as (
        m: unknown,
        now: number
      ) => Promise<void>
    )(membership, now)
    if (membership.status === 'active') {
      await (assignMemberApps as unknown as (p: unknown) => Promise<void>)({
        organizationId,
        userId: body.user_id,
        now,
      })
    }
  } catch {
    // ignore
  }
  const { fromDbUnixSeconds: f } = await import('@/platform/timestamps')
  return {
    object: 'membership',
    id: membership.id,
    organization_id: membership.organizationId,
    user_id: membership.userId,
    role: membership.role,
    status: membership.status,
    created_at: f(membership.createdAt),
    updated_at: f(membership.updatedAt),
  }
}

export async function listOrganizationInvites(
  organizationId: string,
  principal: Principal,
  query: { limit: number; starting_after?: string; ending_before?: string }
): Promise<ListObject<InviteToken>> {
  await requireOrgPermission(organizationId, principal, 'members:invite')
  const org = await repository.findOrganizationById(organizationId)
  if (!org)
    throw notFound(
      'organization/not-found',
      'No organization exists with the provided identifier.'
    )
  const { data, hasMore } = await repository.listInvitesByOrg(
    organizationId,
    query
  )
  return listObject({
    data: data.map(serializeInvite),
    hasMore,
    url: `/organizations/${organizationId}/invites`,
  })
}

export async function createOrganizationInvite(
  organizationId: string,
  principal: Principal,
  body: InviteCreateBody
): Promise<InviteToken> {
  await requireOrgPermission(organizationId, principal, 'members:invite')
  const org = await repository.findOrganizationById(organizationId)
  if (!org)
    throw notFound(
      'organization/not-found',
      'No organization exists with the provided identifier.'
    )
  let sourceAppId: string | null = null
  if (body.source_app_id || body.source_app_slug) {
    const app = body.source_app_id
      ? await repository.findAppById(body.source_app_id)
      : body.source_app_slug
        ? await repository.findAppBySlug(body.source_app_slug)
        : null
    if (!app)
      throw notFound(
        'invite/app-not-found',
        'No app exists with the provided identifier.'
      )
    sourceAppId = app.id
  }
  const now = nowUnixSeconds()
  // The same construction as the Python's `secrets.token_urlsafe(32)`: 32
  // CSPRNG bytes, URL-safe. The token is the only credential the invite link
  // carries, so it must not be built from an id generator whose shape is
  // predictable.
  const token = randomBytes(32).toString('base64url')
  const invite = await repository.createInvite({
    id: generateId('invite'),
    organizationId,
    email: body.email.trim().toLowerCase(),
    role: body.role ?? 'member',
    sourceAppId,
    token,
    status: 'pending',
    expiresAt: BigInt(now + 7 * 24 * 60 * 60),
    createdAt: BigInt(now),
    updatedAt: BigInt(now),
  })
  return serializeInvite(invite)
}

export async function revokeOrganizationInvite(
  organizationId: string,
  inviteId: string,
  principal: Principal
): Promise<InviteToken> {
  await requireOrgPermission(organizationId, principal, 'members:invite')
  const invite = await repository.findInviteById(inviteId)
  if (!invite || invite.organizationId !== organizationId) {
    throw notFound(
      'invite/not-found',
      'No invite exists with the provided identifier.'
    )
  }
  const updated = await repository.updateInvite(inviteId, {
    status: 'revoked',
    updatedAt: BigInt(nowUnixSeconds()),
  })
  if (!updated)
    throw notFound(
      'invite/not-found',
      'No invite exists with the provided identifier.'
    )
  return serializeInvite(updated)
}

export async function getInvitePreview(token: string): Promise<{
  object: 'invite_preview'
  org_name: string | null
  org_slug: string
  email: string
  role: string
  expires_at: number
}> {
  const invite = await getValidInvite(token)
  const org = await repository.findOrganizationById(invite.organizationId)
  return {
    object: 'invite_preview',
    org_name: org?.name ?? null,
    org_slug: org?.slug ?? '',
    email: invite.email,
    role: invite.role,
    expires_at: Number(invite.expiresAt),
  }
}

async function getValidInvite(token: string) {
  const invite = await repository.findInviteByToken(token)
  const now = Math.floor(Date.now() / 1000)
  if (
    !invite ||
    invite.status !== 'pending' ||
    Number(invite.expiresAt) < now
  ) {
    throw notFound(
      'invite/not-found',
      'This invite link is invalid or has expired.'
    )
  }
  return invite
}

export async function acceptInvite(
  token: string,
  userId: string
): Promise<{
  object: 'membership'
  id: string
  organization_id: string
  user_id: string
  role: string
  status: string
  created_at: number
  updated_at: number
}> {
  const invite = await getValidInvite(token)
  const user = await repository.findUserForInvite(userId)
  if (!user) throw notFound('invite/user-not-found', 'User not found.')
  if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
    throw new AppHttpError({
      code: 'invite/email-mismatch',
      message: 'This invite was sent to a different email address.',
      httpStatus: 403,
    })
  }
  const existing = await repository.findMembershipForUser(
    invite.organizationId,
    userId
  )
  const org = await repository.findOrganizationById(invite.organizationId)
  const workosMembershipId = await ensureProviderMembership(
    getAuthProvider(getSettings()) as unknown as Parameters<
      typeof ensureProviderMembership
    >[0],
    {
      workosOrganizationId: org?.workosOrganizationId ?? null,
      workosUserId: user.workosUserId,
      role: invite.role,
    }
  )
  const now = nowUnixSeconds()
  const nowBig = BigInt(now)
  let membership
  if (existing) {
    membership = await repository.activateMembership(existing.id, {
      role: invite.role,
      workosMembershipId: workosMembershipId ?? existing.workosMembershipId,
      updatedAt: nowBig,
    })
  } else {
    membership = await repository.createMembership({
      id: generateId('membership'),
      organizationId: invite.organizationId,
      userId,
      workosMembershipId,
      role: invite.role,
      status: 'active',
      createdAt: nowBig,
      updatedAt: nowBig,
    })
  }
  try {
    const { linkMembershipRole, assignMemberApps } =
      await import('@/services/provisioning')
    await (
      linkMembershipRole as unknown as (
        m: unknown,
        now: number
      ) => Promise<void>
    )(membership, now)
    await (assignMemberApps as unknown as (p: unknown) => Promise<void>)({
      organizationId: invite.organizationId,
      userId,
      now,
      sourceAppId: invite.sourceAppId,
    })
  } catch {
    // ignore
  }
  await repository.updateInvite(invite.id, {
    status: 'accepted',
    updatedAt: nowBig,
  })
  const { fromDbUnixSeconds: f } = await import('@/platform/timestamps')
  return {
    object: 'membership',
    id: membership.id,
    organization_id: membership.organizationId,
    user_id: membership.userId,
    role: membership.role,
    status: membership.status,
    created_at: f(membership.createdAt),
    updated_at: f(membership.updatedAt),
  }
}

export async function batchListSubscriptions(
  organizationIds: string
): Promise<{ object: 'list'; data: Subscription[]; total_count: number }> {
  const orgIds = organizationIds
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const rows = await repository.listSubscriptionsByOrgs(orgIds, 'product')
  const data = rows.map(serializeSubscription)
  return { object: 'list', data, total_count: data.length }
}

export async function listOrgSubscriptions(
  orgId: string
): Promise<Subscription[]> {
  const rows = await repository.listSubscriptionsByOrgs([orgId], 'product')
  return rows.map(serializeSubscription)
}

export async function listMyOrgSubscriptions(
  orgId: string,
  principal: Principal
): Promise<ListObject<Subscription>> {
  await requireOrgMembership(orgId, principal)
  const rows = await repository.listSubscriptionsByOrg(orgId)
  return listObject({
    data: rows.map(serializeSubscription),
    hasMore: false,
    url: `/organizations/${orgId}/subscriptions`,
  })
}

export async function retrieveMyOrgSubscriptionBySlug(
  orgId: string,
  appSlug: string,
  principal: Principal
): Promise<Subscription> {
  await requireOrgMembership(orgId, principal)
  const row = await repository.getSubscriptionByAppSlug(orgId, appSlug)
  if (!row) throw notFound('subscription/not-found', 'Subscription not found.')
  return serializeSubscription(row)
}

export async function provisionSubscription(
  orgId: string,
  body: SubscriptionProvisionBody
): Promise<Subscription> {
  return provisionOrgSubscription(orgId, body)
}

export async function provisionMyOrgSubscription(
  orgId: string,
  body: SubscriptionProvisionBody,
  principal: Principal
): Promise<Subscription> {
  await requireOrgPermission(orgId, principal, 'apps:provision')
  return provisionOrgSubscription(orgId, body)
}

async function provisionOrgSubscription(
  orgId: string,
  body: SubscriptionProvisionBody
): Promise<Subscription> {
  const org = await repository.findOrganizationById(orgId)
  if (!org) throw notFound('organization/not-found', 'Organization not found.')

  let app: { id: string } | null = null
  if (body.app_id) app = await repository.findAppById(body.app_id)
  else if (body.app_slug) app = await repository.findAppBySlug(body.app_slug)
  else {
    throw new AppHttpError({
      code: 'subscription/app-required',
      message: 'Provide app_id or app_slug.',
      httpStatus: 422,
    })
  }
  if (!app) throw notFound('app/not-found', 'App not found.')

  let priceId = body.price_id ?? null
  if (priceId === null) {
    const defaultPrice = await repository.findDefaultPriceForApp(app.id)
    priceId = defaultPrice?.id ?? null
  }
  const row = await repository.provisionSubscription({
    organizationId: orgId,
    appId: app.id,
    priceId,
    now: BigInt(nowUnixSeconds()),
  })
  return serializeSubscription(row)
}

export async function getSubscriptionBySlug(
  orgId: string,
  appSlug: string
): Promise<Subscription> {
  const row = await repository.getSubscriptionByAppSlug(orgId, appSlug)
  if (!row) throw notFound('subscription/not-found', 'Subscription not found.')
  return serializeSubscription(row)
}

export async function getSubscription(
  orgId: string,
  appId: string
): Promise<Subscription> {
  const row = await repository.getSubscription(orgId, appId)
  if (!row) throw notFound('subscription/not-found', 'Subscription not found.')
  return serializeSubscription(row)
}

export async function updateSubscription(
  orgId: string,
  appId: string,
  body: SubscriptionUpdateBody
): Promise<Subscription> {
  const updates: {
    status?: string
    cancelAtPeriodEnd?: boolean
    canceledAt?: bigint
  } = {}
  if (body.status !== undefined && body.status !== null) {
    updates.status = body.status
    if (body.status === 'canceled')
      updates.canceledAt = BigInt(nowUnixSeconds())
  }
  if (
    body.cancel_at_period_end !== undefined &&
    body.cancel_at_period_end !== null
  ) {
    updates.cancelAtPeriodEnd = body.cancel_at_period_end
  }
  if (
    Object.keys(updates).length === 0 &&
    (body.price_id === undefined || body.price_id === null)
  ) {
    throw new AppHttpError({
      code: 'subscription/update-required',
      message: 'Provide status, cancel_at_period_end, or price_id.',
      httpStatus: 422,
    })
  }
  let row: Awaited<ReturnType<typeof repository.getSubscription>> = null
  if (Object.keys(updates).length > 0) {
    row = await repository.updateSubscription(orgId, appId, updates)
  } else {
    row = await repository.getSubscription(orgId, appId)
  }
  if (!row) throw notFound('subscription/not-found', 'Subscription not found.')
  if (body.price_id !== undefined && body.price_id !== null) {
    await repository.setSubscriptionPrice(
      row.id,
      body.price_id,
      nowUnixSeconds()
    )
    row = await repository.getSubscription(orgId, appId)
    if (!row)
      throw notFound('subscription/not-found', 'Subscription not found.')
  }
  return serializeSubscription(row)
}
