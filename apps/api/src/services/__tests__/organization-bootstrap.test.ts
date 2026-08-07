import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppHttpError } from '@/http/errors'

import {
  appendSlugSuffix,
  bootstrapExistingUser,
  generateUniqueOrgSlug,
  resolveRegistrationSlug,
} from '../organization-bootstrap'
import type {
  OrganizationBootstrapDeps,
  OrganizationBootstrapProvider,
  OrganizationBootstrapRepository,
} from '../organization-bootstrap'

const NOW = 1_700_000_000

function makeRepository(
  overrides: Partial<OrganizationBootstrapRepository> = {}
) {
  return {
    findUserById: vi.fn<OrganizationBootstrapRepository['findUserById']>(),
    findOrganizationBySlug:
      vi.fn<OrganizationBootstrapRepository['findOrganizationBySlug']>(),
    createOrganization:
      vi.fn<OrganizationBootstrapRepository['createOrganization']>(),
    createMembership:
      vi.fn<OrganizationBootstrapRepository['createMembership']>(),
    ...overrides,
  } as unknown as OrganizationBootstrapRepository & {
    findUserById: ReturnType<typeof vi.fn>
    findOrganizationBySlug: ReturnType<typeof vi.fn>
    createOrganization: ReturnType<typeof vi.fn>
    createMembership: ReturnType<typeof vi.fn>
  }
}

function makeProvider(overrides: Partial<OrganizationBootstrapProvider> = {}) {
  return {
    createOrganization:
      vi.fn<OrganizationBootstrapProvider['createOrganization']>(),
    createOrganizationMembership:
      vi.fn<OrganizationBootstrapProvider['createOrganizationMembership']>(),
    deleteOrganization:
      vi.fn<OrganizationBootstrapProvider['deleteOrganization']>(),
    ...overrides,
  } as unknown as OrganizationBootstrapProvider & {
    createOrganization: ReturnType<typeof vi.fn>
    createOrganizationMembership: ReturnType<typeof vi.fn>
    deleteOrganization: ReturnType<typeof vi.fn>
  }
}

function makeDeps(
  overrides: Partial<OrganizationBootstrapDeps> = {}
): OrganizationBootstrapDeps & {
  provider: ReturnType<typeof makeProvider>
  repository: ReturnType<typeof makeRepository>
  provisionOrganization: ReturnType<typeof vi.fn>
} {
  const repository = makeRepository(overrides.repository as never)
  const provider = makeProvider(overrides.provider as never)
  const provisionOrganization =
    (overrides.provisionOrganization as unknown as ReturnType<typeof vi.fn>) ??
    vi.fn().mockResolvedValue({ owner: { id: 'rol_owner' } })
  return { provider, repository, provisionOrganization } as never
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW * 1000)
  return () => {
    vi.useRealTimers()
  }
})

// ---------------------------------------------------------------------------
// appendSlugSuffix
// ---------------------------------------------------------------------------

describe('appendSlugSuffix', () => {
  it('appends suffix', () => {
    expect(appendSlugSuffix('my-org', '2')).toBe('my-org-2')
  })

  it('trims base to respect max length', () => {
    const base = 'a'.repeat(64)
    const result = appendSlugSuffix(base, '2')
    expect(result.length).toBeLessThanOrEqual(64)
    expect(result.endsWith('-2')).toBe(true)
  })

  it('strips trailing dashes before appending', () => {
    expect(appendSlugSuffix('my-org---', '2')).toBe('my-org-2')
  })
})

// ---------------------------------------------------------------------------
// generateUniqueOrgSlug
// ---------------------------------------------------------------------------

describe('generateUniqueOrgSlug', () => {
  it('returns normalized base when not taken', async () => {
    const repo = makeRepository()
    repo.findOrganizationBySlug.mockResolvedValue(null)

    const slug = await generateUniqueOrgSlug(repo, 'Acme Inc')
    expect(slug).toBe('acme-inc')
    expect(repo.findOrganizationBySlug).toHaveBeenCalledWith('acme-inc')
  })

  it('falls back to workspace when normalized base is too short', async () => {
    const repo = makeRepository()
    repo.findOrganizationBySlug.mockResolvedValue(null)

    const slug = await generateUniqueOrgSlug(repo, '--')
    expect(slug).toBe('workspace')
  })

  it('appends numeric suffix when base is taken', async () => {
    const repo = makeRepository()
    // base taken, -2 free
    repo.findOrganizationBySlug
      .mockResolvedValueOnce({ id: 'org_1' } as never)
      .mockResolvedValueOnce(null)

    const slug = await generateUniqueOrgSlug(repo, 'Acme')
    expect(slug).toBe('acme-2')
  })

  it('walks numeric suffixes sequentially', async () => {
    const repo = makeRepository()
    repo.findOrganizationBySlug
      .mockResolvedValueOnce({ id: 'org_1' } as never) // base
      .mockResolvedValueOnce({ id: 'org_1' } as never) // -2 taken
      .mockResolvedValueOnce({ id: 'org_1' } as never) // -3 taken
      .mockResolvedValueOnce(null) // -4 free

    const slug = await generateUniqueOrgSlug(repo, 'Acme')
    expect(slug).toBe('acme-4')
  })

  it('falls back to random suffix after numeric space exhausted and succeeds', async () => {
    const repo = makeRepository()
    // Exhaust base + 49 numeric candidates (2..50)
    for (let i = 0; i < 50; i++)
      repo.findOrganizationBySlug.mockResolvedValueOnce({
        id: 'org_1',
      } as never)
    // First random probe free
    repo.findOrganizationBySlug.mockResolvedValueOnce(null)

    const slug = await generateUniqueOrgSlug(repo, 'Acme')
    // random suffix is 6 chars a-z0-9
    expect(slug).toMatch(/^acme-[a-z0-9]{6}$/)
  })

  it('throws slug-generation-failed when every candidate is taken', async () => {
    const repo = makeRepository()
    // 1 base + 49 numeric + 50 random = 100 calls, all taken
    for (let i = 0; i < 100; i++)
      repo.findOrganizationBySlug.mockResolvedValue({ id: 'org_1' } as never)

    await expect(generateUniqueOrgSlug(repo, 'Acme')).rejects.toMatchObject({
      code: 'organization/slug-generation-failed',
    })
    // Must be 409
    try {
      await generateUniqueOrgSlug(repo, 'Acme')
    } catch (e) {
      expect((e as AppHttpError).httpStatus).toBe(409)
    }
  })
})

// ---------------------------------------------------------------------------
// resolveRegistrationSlug
// ---------------------------------------------------------------------------

describe('resolveRegistrationSlug', () => {
  it('generates slug when none provided', async () => {
    const deps = makeDeps()
    deps.repository.findOrganizationBySlug.mockResolvedValue(null)

    const slug = await resolveRegistrationSlug(deps, 'Acme Inc', null)
    expect(slug).toBe('acme-inc')
  })

  it('generates slug when empty string provided', async () => {
    const deps = makeDeps()
    deps.repository.findOrganizationBySlug.mockResolvedValue(null)

    const slug = await resolveRegistrationSlug(deps, 'Acme Inc', '')
    expect(slug).toBe('acme-inc')
  })

  it('returns explicit slug when valid and free', async () => {
    const deps = makeDeps()
    deps.repository.findOrganizationBySlug.mockResolvedValue(null)

    const slug = await resolveRegistrationSlug(deps, 'Acme', 'my-org')
    expect(slug).toBe('my-org')
  })

  it('trims explicit slug', async () => {
    const deps = makeDeps()
    deps.repository.findOrganizationBySlug.mockResolvedValue(null)

    const slug = await resolveRegistrationSlug(deps, 'Acme', '  my-org  ')
    expect(slug).toBe('my-org')
  })

  it('rejects invalid slug with auth/invalid-input', async () => {
    const deps = makeDeps()

    await expect(
      resolveRegistrationSlug(deps, 'Acme', 'ab')
    ).rejects.toMatchObject({
      code: 'auth/invalid-input',
    })
    await expect(
      resolveRegistrationSlug(deps, 'Acme', 'bad slug')
    ).rejects.toMatchObject({
      code: 'auth/invalid-input',
    })
    await expect(
      resolveRegistrationSlug(deps, 'Acme', '-bad-')
    ).rejects.toMatchObject({
      code: 'auth/invalid-input',
    })
  })

  it('throws 400 for invalid slug', async () => {
    const deps = makeDeps()
    try {
      await resolveRegistrationSlug(deps, 'Acme', 'ab')
    } catch (e) {
      expect((e as AppHttpError).httpStatus).toBe(400)
      expect((e as AppHttpError).message).toBe('Please check your input.')
    }
  })

  it('rejects taken slug with auth/organization-slug-taken', async () => {
    const deps = makeDeps()
    deps.repository.findOrganizationBySlug.mockResolvedValue({
      id: 'org_1',
    } as never)

    await expect(
      resolveRegistrationSlug(deps, 'Acme', 'taken')
    ).rejects.toMatchObject({
      code: 'auth/organization-slug-taken',
    })
  })

  it('throws 409 for taken slug', async () => {
    const deps = makeDeps()
    deps.repository.findOrganizationBySlug.mockResolvedValue({
      id: 'org_1',
    } as never)

    try {
      await resolveRegistrationSlug(deps, 'Acme', 'taken')
    } catch (e) {
      expect((e as AppHttpError).httpStatus).toBe(409)
    }
  })
})

// ---------------------------------------------------------------------------
// bootstrapExistingUser
// ---------------------------------------------------------------------------

describe('bootstrapExistingUser', () => {
  it('creates organization and owner membership on happy path', async () => {
    const deps = makeDeps()
    deps.repository.findUserById.mockResolvedValue({
      id: 'user_1',
      workosUserId: 'wos_user_1',
    } as never)
    deps.repository.findOrganizationBySlug.mockResolvedValue(null)
    deps.provider.createOrganization.mockResolvedValue({
      id: 'wos_org_1',
      metadata: { slug: 'acme' },
    })
    deps.provider.createOrganizationMembership.mockResolvedValue({
      id: 'wos_mem_1',
    })
    deps.repository.createOrganization.mockImplementation(async (data) => ({
      id: data.id,
      workosOrganizationId: data.workosOrganizationId,
      name: data.name,
      slug: data.slug,
      status: data.status,
      metadata: data.metadata,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }))
    deps.repository.createMembership.mockImplementation(async (data) => ({
      id: data.id,
      organizationId: data.organizationId,
      userId: data.userId,
      workosMembershipId: data.workosMembershipId,
      role: data.role,
      roleId: data.roleId,
      status: data.status,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }))

    const org = await bootstrapExistingUser(deps, {
      ownerUserId: 'user_1',
      name: ' Acme Inc ',
      slug: null,
    })

    expect(org.name).toBe('Acme Inc')
    expect(org.slug).toBe('acme-inc')
    expect(deps.provider.createOrganization).toHaveBeenCalledWith({
      name: 'Acme Inc',
      externalId: expect.stringMatching(/^org_/),
      metadata: { slug: 'acme-inc', owner_workos_user_id: 'wos_user_1' },
    })
    expect(deps.provider.createOrganizationMembership).toHaveBeenCalledWith({
      userId: 'wos_user_1',
      organizationId: 'wos_org_1',
      roleSlug: 'admin',
    })
    // timestamps are frozen
    expect(deps.repository.createOrganization).toHaveBeenCalledWith(
      expect.objectContaining({
        createdAt: BigInt(NOW),
        updatedAt: BigInt(NOW),
      })
    )
    expect(deps.provisionOrganization).toHaveBeenCalledWith(
      expect.any(String),
      NOW
    )
    expect(deps.repository.createMembership).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'owner',
        roleId: 'rol_owner',
        workosMembershipId: 'wos_mem_1',
      })
    )
  })

  it('links owner membership without role_id when provisioning has no owner role', async () => {
    const deps = makeDeps()
    deps.repository.findUserById.mockResolvedValue({
      id: 'user_1',
      workosUserId: 'wos_user_1',
    } as never)
    deps.repository.findOrganizationBySlug.mockResolvedValue(null)
    deps.provider.createOrganization.mockResolvedValue({ id: 'wos_org_1' })
    deps.provider.createOrganizationMembership.mockResolvedValue({
      id: 'wos_mem_1',
    })
    deps.repository.createOrganization.mockImplementation(async (data) => ({
      id: data.id,
      workosOrganizationId: data.workosOrganizationId,
      name: data.name,
      slug: data.slug,
      status: data.status,
      metadata: data.metadata,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }))
    deps.repository.createMembership.mockImplementation(async (data) => ({
      id: data.id,
      organizationId: data.organizationId,
      userId: data.userId,
      workosMembershipId: data.workosMembershipId,
      role: data.role,
      roleId: data.roleId,
      status: data.status,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }))
    deps.provisionOrganization = vi.fn().mockResolvedValue({})

    await bootstrapExistingUser(deps, {
      ownerUserId: 'user_1',
      name: 'Acme',
      slug: null,
    })

    expect(deps.repository.createMembership).toHaveBeenCalledWith(
      expect.objectContaining({ roleId: null })
    )
  })

  it('throws user/not-found when owner missing', async () => {
    const deps = makeDeps()
    deps.repository.findUserById.mockResolvedValue(null)

    await expect(
      bootstrapExistingUser(deps, {
        ownerUserId: 'missing',
        name: 'Acme',
        slug: null,
      })
    ).rejects.toMatchObject({ code: 'user/not-found' })

    try {
      await bootstrapExistingUser(deps, {
        ownerUserId: 'missing',
        name: 'Acme',
        slug: null,
      })
    } catch (e) {
      expect((e as AppHttpError).httpStatus).toBe(404)
    }
  })

  it('throws organization/validation-failed when name is blank', async () => {
    const deps = makeDeps()
    deps.repository.findUserById.mockResolvedValue({
      id: 'user_1',
      workosUserId: 'wos_1',
    } as never)

    await expect(
      bootstrapExistingUser(deps, {
        ownerUserId: 'user_1',
        name: '   ',
        slug: null,
      })
    ).rejects.toMatchObject({ code: 'organization/validation-failed' })

    try {
      await bootstrapExistingUser(deps, {
        ownerUserId: 'user_1',
        name: '   ',
        slug: null,
      })
    } catch (e) {
      expect((e as AppHttpError).httpStatus).toBe(400)
      expect((e as AppHttpError).message).toBe('Organization name is required.')
    }
  })

  it('throws organization/validation-failed for invalid explicit slug', async () => {
    const deps = makeDeps()
    deps.repository.findUserById.mockResolvedValue({
      id: 'user_1',
      workosUserId: 'wos_1',
    } as never)

    await expect(
      bootstrapExistingUser(deps, {
        ownerUserId: 'user_1',
        name: 'Acme',
        slug: 'ab',
      })
    ).rejects.toMatchObject({ code: 'organization/validation-failed' })
  })

  it('throws organization/duplicate-slug when explicit slug taken', async () => {
    const deps = makeDeps()
    deps.repository.findUserById.mockResolvedValue({
      id: 'user_1',
      workosUserId: 'wos_1',
    } as never)
    deps.repository.findOrganizationBySlug.mockResolvedValue({
      id: 'org_1',
    } as never)

    await expect(
      bootstrapExistingUser(deps, {
        ownerUserId: 'user_1',
        name: 'Acme',
        slug: 'taken',
      })
    ).rejects.toMatchObject({ code: 'organization/duplicate-slug' })

    try {
      await bootstrapExistingUser(deps, {
        ownerUserId: 'user_1',
        name: 'Acme',
        slug: 'taken',
      })
    } catch (e) {
      expect((e as AppHttpError).httpStatus).toBe(409)
      expect((e as AppHttpError).message).toBe(
        'An organization with this slug already exists.'
      )
    }
  })

  it('compensates provider organization when local create fails', async () => {
    const deps = makeDeps()
    deps.repository.findUserById.mockResolvedValue({
      id: 'user_1',
      workosUserId: 'wos_1',
    } as never)
    deps.repository.findOrganizationBySlug.mockResolvedValue(null)
    deps.provider.createOrganization.mockResolvedValue({ id: 'wos_org_1' })
    deps.provider.createOrganizationMembership.mockResolvedValue({
      id: 'wos_mem_1',
    })
    deps.repository.createOrganization.mockRejectedValue(new Error('db down'))
    deps.provider.deleteOrganization.mockResolvedValue(undefined)

    await expect(
      bootstrapExistingUser(deps, {
        ownerUserId: 'user_1',
        name: 'Acme',
        slug: null,
      })
    ).rejects.toThrow('db down')

    expect(deps.provider.deleteOrganization).toHaveBeenCalledWith('wos_org_1')
  })

  it('does not compensate when provider createOrganization itself failed', async () => {
    const deps = makeDeps()
    deps.repository.findUserById.mockResolvedValue({
      id: 'user_1',
      workosUserId: 'wos_1',
    } as never)
    deps.repository.findOrganizationBySlug.mockResolvedValue(null)
    deps.provider.createOrganization.mockRejectedValue(
      new Error('provider down')
    )

    await expect(
      bootstrapExistingUser(deps, {
        ownerUserId: 'user_1',
        name: 'Acme',
        slug: null,
      })
    ).rejects.toThrow('provider down')

    expect(deps.provider.deleteOrganization).not.toHaveBeenCalled()
  })

  it('re-throws original error even when compensation delete fails', async () => {
    const deps = makeDeps()
    deps.repository.findUserById.mockResolvedValue({
      id: 'user_1',
      workosUserId: 'wos_1',
    } as never)
    deps.repository.findOrganizationBySlug.mockResolvedValue(null)
    deps.provider.createOrganization.mockResolvedValue({ id: 'wos_org_1' })
    deps.provider.createOrganizationMembership.mockResolvedValue({
      id: 'wos_mem_1',
    })
    deps.repository.createOrganization.mockRejectedValue(new Error('db down'))
    deps.provider.deleteOrganization.mockRejectedValue(
      new Error('delete failed')
    )

    await expect(
      bootstrapExistingUser(deps, {
        ownerUserId: 'user_1',
        name: 'Acme',
        slug: null,
      })
    ).rejects.toThrow('db down')
  })

  it('compensates when membership creation fails', async () => {
    const deps = makeDeps()
    deps.repository.findUserById.mockResolvedValue({
      id: 'user_1',
      workosUserId: 'wos_1',
    } as never)
    deps.repository.findOrganizationBySlug.mockResolvedValue(null)
    deps.provider.createOrganization.mockResolvedValue({ id: 'wos_org_1' })
    deps.provider.createOrganizationMembership.mockResolvedValue({
      id: 'wos_mem_1',
    })
    deps.repository.createOrganization.mockImplementation(async (data) => ({
      id: data.id,
      workosOrganizationId: data.workosOrganizationId,
      name: data.name,
      slug: data.slug,
      status: data.status,
      metadata: data.metadata,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }))
    deps.repository.createMembership.mockRejectedValue(
      new Error('membership failed')
    )

    await expect(
      bootstrapExistingUser(deps, {
        ownerUserId: 'user_1',
        name: 'Acme',
        slug: null,
      })
    ).rejects.toThrow('membership failed')

    expect(deps.provider.deleteOrganization).toHaveBeenCalledWith('wos_org_1')
  })

  it('uses explicit slug when provided', async () => {
    const deps = makeDeps()
    deps.repository.findUserById.mockResolvedValue({
      id: 'user_1',
      workosUserId: 'wos_1',
    } as never)
    deps.repository.findOrganizationBySlug.mockResolvedValue(null)
    deps.provider.createOrganization.mockResolvedValue({ id: 'wos_org_1' })
    deps.provider.createOrganizationMembership.mockResolvedValue({
      id: 'wos_mem_1',
    })
    deps.repository.createOrganization.mockImplementation(async (data) => ({
      id: data.id,
      workosOrganizationId: data.workosOrganizationId,
      name: data.name,
      slug: data.slug,
      status: data.status,
      metadata: data.metadata,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }))
    deps.provisionOrganization = vi
      .fn()
      .mockResolvedValue({ owner: { id: 'rol_1' } })
    deps.repository.createMembership.mockResolvedValue({} as never)

    await bootstrapExistingUser(deps, {
      ownerUserId: 'user_1',
      name: 'Acme',
      slug: 'custom-slug',
    })

    expect(deps.provider.createOrganization).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ slug: 'custom-slug' }),
      })
    )
    expect(deps.repository.createOrganization).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'custom-slug' })
    )
  })
})
