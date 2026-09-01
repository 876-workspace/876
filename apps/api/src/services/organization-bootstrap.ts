import type {
  ProvisioningSelectionContext,
  ProvisioningSetupSelection,
} from '@876/core/types/provisioning-selection'

import { getSettings } from '@/config'
import { AppHttpError } from '@/http/errors'
import { generateId, normalizeSlug } from '@/platform/ids'
import { getLogger } from '@/platform/logger'
import { SUPER_ADMIN_ROLE_NAME } from '@/platform/permissions'
import { nowUnixSeconds } from '@/platform/timestamps'
import { getAuthProvider } from '@/providers/workos/adapter'

import * as repository from './organization-bootstrap.repository'
import type {
  MembershipRow,
  OrganizationRow,
  UserRow,
} from './organization-bootstrap.repository'
import {
  resolveInitialProvisioningSelection,
  type ProvisioningWorkspaceDefaults,
} from './provisioning-policy'
import { workspace } from './workspace'

const log = getLogger('organization-bootstrap')

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/
const SLUG_MAX_LENGTH = 64
const SLUG_COLLISION_LIMIT = 50
const RANDOM_SUFFIX_LENGTH = 6
const RANDOM_SUFFIX_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

export type OrganizationBootstrapProvider = {
  createOrganization(params: {
    name: string
    externalId: string
    metadata: Record<string, string>
  }): Promise<{ id: string; metadata?: unknown }>
  createOrganizationMembership(params: {
    userId: string
    organizationId: string
    roleSlug: string
  }): Promise<{ id: string }>
  deleteOrganization(organizationId: string): Promise<void>
}

export type OrganizationBootstrapRepository = {
  findUserById(userId: string): Promise<UserRow | null>
  findOrganizationBySlug(slug: string): Promise<OrganizationRow | null>
  createOrganization(data: {
    id: string
    workosOrganizationId: string | null
    name: string
    slug: string
    status: string
    countryCode: string | null
    currencyCode: string
    language: string
    provisioningSetupKey: string
    provisioningSelectionType: 'policy' | 'fallback'
    provisioningMatchGroupKey: string | null
    provisioningMatchPriority: number | null
    provisioningMatchedFields: string[]
    provisioningSetupSelectedAt: bigint
    metadata: unknown
    createdAt: bigint
    updatedAt: bigint
  }): Promise<OrganizationRow>
  createMembership(data: {
    id: string
    organizationId: string
    userId: string
    workosMembershipId: string | null
    role: string
    roleId: string | null
    status: string
    createdAt: bigint
    updatedAt: bigint
  }): Promise<MembershipRow>
}

export type OrganizationBootstrapWorkspace = {
  setup(
    organizationId: string,
    options?: {
      sourceAppId?: string | null
      finance?: 'ready' | 'defer'
      requireProvisioningSelection?: boolean
      now?: number
    }
  ): Promise<Record<string, { id: string }>>
  finance: {
    ensure(params: { organizationId: string }): Promise<unknown>
  }
  work: {
    ensure(params: { organizationId: string }): Promise<void>
  }
}

export type OrganizationBootstrapDeps = {
  provider: OrganizationBootstrapProvider
  repository: OrganizationBootstrapRepository
  workspace: OrganizationBootstrapWorkspace
  resolveProvisioning(context: Partial<ProvisioningSelectionContext>): Promise<{
    selection: ProvisioningSetupSelection
    defaults: ProvisioningWorkspaceDefaults
  }>
}

export function appendSlugSuffix(base: string, suffix: string): string {
  const prefix = base
    .slice(0, SLUG_MAX_LENGTH - suffix.length - 1)
    .replace(/-+$/g, '')
  return `${prefix}-${suffix}`
}

function randomSuffix(): string {
  let out = ''
  for (let i = 0; i < RANDOM_SUFFIX_LENGTH; i++) {
    const idx = Math.floor(Math.random() * RANDOM_SUFFIX_ALPHABET.length)
    out += RANDOM_SUFFIX_ALPHABET[idx]!
  }
  return out
}

export async function generateUniqueOrgSlug(
  repository: OrganizationBootstrapRepository,
  name: string
): Promise<string> {
  let base = normalizeSlug(name).slice(0, SLUG_MAX_LENGTH).replace(/-+$/g, '')
  if (base.length < 3) base = 'workspace'

  if (!(await repository.findOrganizationBySlug(base))) return base

  for (let index = 2; index <= SLUG_COLLISION_LIMIT; index++) {
    const candidate = appendSlugSuffix(base, String(index))
    if (!(await repository.findOrganizationBySlug(candidate))) return candidate
  }

  for (let i = 0; i < SLUG_COLLISION_LIMIT; i++) {
    const candidate = appendSlugSuffix(base, randomSuffix())
    if (!(await repository.findOrganizationBySlug(candidate))) return candidate
  }

  throw new AppHttpError({
    code: 'organization/slug-generation-failed',
    message: 'Could not generate a unique organization slug.',
    httpStatus: 409,
  })
}

async function resolveSlug(
  repository: OrganizationBootstrapRepository,
  name: string,
  slug: string | null | undefined,
  errorDomain: 'auth' | 'organization'
): Promise<string> {
  const explicitSlug = slug?.trim() ?? ''

  if (!explicitSlug) return generateUniqueOrgSlug(repository, name)

  if (
    explicitSlug.length < 3 ||
    explicitSlug.length > SLUG_MAX_LENGTH ||
    !SLUG_PATTERN.test(explicitSlug)
  ) {
    throw new AppHttpError({
      code:
        errorDomain === 'auth'
          ? 'auth/invalid-input'
          : 'organization/validation-failed',
      message:
        errorDomain === 'auth'
          ? 'Please check your input.'
          : 'Invalid organization slug.',
      httpStatus: 400,
    })
  }

  if (await repository.findOrganizationBySlug(explicitSlug)) {
    throw new AppHttpError({
      code:
        errorDomain === 'auth'
          ? 'auth/organization-slug-taken'
          : 'organization/duplicate-slug',
      message:
        errorDomain === 'auth'
          ? 'This organization slug is already taken.'
          : 'An organization with this slug already exists.',
      httpStatus: 409,
    })
  }

  return explicitSlug
}

export async function resolveRegistrationSlug(
  deps: OrganizationBootstrapDeps,
  name: string,
  slug: string | null | undefined
): Promise<string> {
  return resolveSlug(deps.repository, name, slug, 'auth')
}

function isRetryableWorkspaceFailure(error: unknown): boolean {
  return (
    error instanceof AppHttpError &&
    (error.code === 'provisioning/finance-workspace-unavailable' ||
      error.code === 'provisioning/work-workspace-unavailable')
  )
}

export async function bootstrapExistingUser(
  deps: OrganizationBootstrapDeps,
  params: {
    creatorUserId: string
    name: string
    slug?: string | null
    countryCode?: string | null
    subdivision?: string | null
    jurisdiction?: string | null
    /** Compatibility override; setup finance default is used when omitted. */
    currencyCode?: string | null
    /** Compatibility override; setup workspace language is used when omitted. */
    language?: string | null
    sourceAppId?: string | null
  }
): Promise<OrganizationRow> {
  const user = await deps.repository.findUserById(params.creatorUserId)
  if (!user) {
    throw new AppHttpError({
      code: 'user/not-found',
      message: 'No user exists with the provided identifier.',
      httpStatus: 404,
    })
  }

  const organizationName = params.name.trim()
  if (!organizationName) {
    throw new AppHttpError({
      code: 'organization/validation-failed',
      message: 'Organization name is required.',
      httpStatus: 400,
    })
  }

  const resolvedSlug = await resolveSlug(
    deps.repository,
    organizationName,
    params.slug ?? null,
    'organization'
  )
  const resolved = await deps.resolveProvisioning({
    country: params.countryCode ?? null,
    subdivision: params.subdivision ?? null,
    jurisdiction: params.jurisdiction ?? null,
  })

  const organizationId = generateId('organization')
  let workosOrganizationId: string | null = null

  try {
    const workosOrg = await deps.provider.createOrganization({
      name: organizationName,
      externalId: organizationId,
      metadata: { slug: resolvedSlug, owner_workos_user_id: user.workosUserId },
    })
    workosOrganizationId = workosOrg.id

    const workosMembership = await deps.provider.createOrganizationMembership({
      userId: user.workosUserId,
      organizationId: workosOrganizationId,
      roleSlug: 'admin',
    })

    const now = nowUnixSeconds()
    const nowBigint = BigInt(now)
    const selectionType = resolved.selection.match_type
    if (selectionType !== 'policy' && selectionType !== 'fallback')
      throw new Error('Initial organization selection must be policy or fallback.')

    const organization = await deps.repository.createOrganization({
      id: organizationId,
      workosOrganizationId,
      name: organizationName,
      slug: resolvedSlug,
      status: 'active',
      countryCode:
        resolved.selection.context.country ?? resolved.defaults.country_code,
      currencyCode:
        params.currencyCode?.trim().toUpperCase() ||
        resolved.defaults.currency_code,
      language: params.language?.trim() || resolved.defaults.language,
      provisioningSetupKey: resolved.selection.setup_key,
      provisioningSelectionType: selectionType,
      provisioningMatchGroupKey: resolved.selection.match_group_key,
      provisioningMatchPriority: resolved.selection.match_priority,
      provisioningMatchedFields: resolved.selection.matched_fields,
      provisioningSetupSelectedAt: nowBigint,
      metadata: (workosOrg as { metadata?: unknown }).metadata ?? null,
      createdAt: nowBigint,
      updatedAt: nowBigint,
    })

    const orgRoles = await deps.workspace.setup(organization.id, {
      sourceAppId: params.sourceAppId ?? null,
      finance: 'defer',
      requireProvisioningSelection: true,
      now,
    })
    const superAdminRole = (orgRoles as Record<string, { id: string } | undefined>)[
      SUPER_ADMIN_ROLE_NAME
    ]

    await deps.repository.createMembership({
      id: generateId('membership'),
      organizationId: organization.id,
      userId: user.id,
      workosMembershipId: workosMembership.id,
      role: SUPER_ADMIN_ROLE_NAME,
      roleId: superAdminRole?.id ?? null,
      status: 'active',
      createdAt: nowBigint,
      updatedAt: nowBigint,
    })

    await deps.workspace.finance.ensure({ organizationId: organization.id })
    await deps.workspace.work.ensure({ organizationId: organization.id })

    return organization
  } catch (error) {
    // Durable org/membership/workspace failures are retried against the persisted
    // setup. Do not delete the provider org after the local identity exists.
    if (isRetryableWorkspaceFailure(error)) throw error

    if (workosOrganizationId !== null) {
      try {
        await deps.provider.deleteOrganization(workosOrganizationId)
        log.info(
          { workos_organization_id: workosOrganizationId },
          'organization.bootstrap_existing_user.compensated'
        )
      } catch (compError) {
        log.warn(
          { err: compError, workos_organization_id: workosOrganizationId },
          'organization.bootstrap_existing_user.compensation_failed'
        )
      }
    }
    throw error
  }
}

export class OrganizationBootstrapService {
  constructor(private readonly deps: OrganizationBootstrapDeps) {}

  resolveRegistrationSlug(
    name: string,
    slug: string | null | undefined
  ): Promise<string> {
    return resolveRegistrationSlug(this.deps, name, slug)
  }

  bootstrapExistingUser(params: {
    creatorUserId: string
    name: string
    slug?: string | null
    countryCode?: string | null
    subdivision?: string | null
    jurisdiction?: string | null
    sourceAppId?: string | null
  }): Promise<OrganizationRow> {
    return bootstrapExistingUser(this.deps, params)
  }
}

function requireProviderId(
  record: Record<string, unknown>,
  resource: string
): { id: string; metadata?: unknown } {
  const id = record['id']
  if (typeof id !== 'string' || !id) {
    throw new AppHttpError({
      code: 'auth/internal-error',
      message:
        'An unexpected error occurred during authentication. Please try again later.',
      httpStatus: 502,
      description: `WorkOS returned no id for ${resource}.`,
    })
  }
  return { id, metadata: record['metadata'] }
}

export function createOrganizationBootstrapDeps(): OrganizationBootstrapDeps {
  const workos = getAuthProvider(getSettings())

  return {
    provider: {
      createOrganization: async (params) =>
        requireProviderId(
          await workos.createOrganization(params),
          'organization'
        ),
      createOrganizationMembership: async (params) =>
        requireProviderId(
          await workos.createOrganizationMembership(params),
          'organization membership'
        ),
      deleteOrganization: (organizationId) =>
        workos.deleteOrganization(organizationId),
    },
    repository,
    workspace,
    resolveProvisioning: async (context) => {
      const { selection, defaults } =
        await resolveInitialProvisioningSelection(context)
      return { selection, defaults }
    },
  }
}
