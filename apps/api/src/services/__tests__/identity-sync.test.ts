import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppHttpError } from '@/http/errors'

import {
  compensateProviderUser,
  deleteProviderMembership,
  deleteProviderOrganization,
  deleteProviderUser,
  ensureProviderMembership,
  type IdentitySyncProvider,
} from '../identity-sync'

function makeProvider() {
  return {
    createOrganizationMembership:
      vi.fn<IdentitySyncProvider['createOrganizationMembership']>(),
    listOrganizationMemberships:
      vi.fn<IdentitySyncProvider['listOrganizationMemberships']>(),
    deleteOrganizationMembership:
      vi.fn<IdentitySyncProvider['deleteOrganizationMembership']>(),
    deleteUser: vi.fn<IdentitySyncProvider['deleteUser']>(),
    deleteOrganization: vi.fn<IdentitySyncProvider['deleteOrganization']>(),
  } satisfies IdentitySyncProvider
}

const gone = () =>
  new AppHttpError({
    code: 'provider/not-found',
    message: 'Not found.',
    httpStatus: 404,
  })

const providerDown = () =>
  new AppHttpError({
    code: 'provider/unavailable',
    message: 'Upstream failed.',
    httpStatus: 502,
  })

let provider: ReturnType<typeof makeProvider>

beforeEach(() => {
  provider = makeProvider()
})

describe('ensureProviderMembership', () => {
  it('creates the membership and returns its provider id', async () => {
    provider.createOrganizationMembership.mockResolvedValue({ id: 'om_1' })

    const result = await ensureProviderMembership(provider, {
      workosOrganizationId: 'org_workos',
      workosUserId: 'user_workos',
      role: 'member',
    })

    expect(result).toBe('om_1')
    expect(provider.createOrganizationMembership).toHaveBeenCalledWith({
      userId: 'user_workos',
      organizationId: 'org_workos',
      roleSlug: null,
    })
  })

  it('maps only the owner role to a provider role slug', async () => {
    // Every other 876 role takes the environment default, so a custom org role
    // can never fail the call with a slug WorkOS has never heard of.
    provider.createOrganizationMembership.mockResolvedValue({ id: 'om_1' })

    await ensureProviderMembership(provider, {
      workosOrganizationId: 'org_workos',
      workosUserId: 'user_workos',
      role: 'owner',
    })

    expect(provider.createOrganizationMembership).toHaveBeenCalledWith(
      expect.objectContaining({ roleSlug: 'admin' })
    )
  })

  it('adopts an existing membership rather than duplicating it', async () => {
    // A retry after an uncertain create must converge, not raise a conflict.
    provider.createOrganizationMembership.mockRejectedValue(providerDown())
    provider.listOrganizationMemberships.mockResolvedValue([{ id: 'om_prior' }])

    const result = await ensureProviderMembership(provider, {
      workosOrganizationId: 'org_workos',
      workosUserId: 'user_workos',
      role: 'member',
    })

    expect(result).toBe('om_prior')
  })

  it('re-raises when the create failed and no membership exists', async () => {
    provider.createOrganizationMembership.mockRejectedValue(providerDown())
    provider.listOrganizationMemberships.mockResolvedValue([])

    await expect(
      ensureProviderMembership(provider, {
        workosOrganizationId: 'org_workos',
        workosUserId: 'user_workos',
        role: 'member',
      })
    ).rejects.toThrow('Upstream failed.')
  })

  it('does nothing when the organization has no provider record', async () => {
    const result = await ensureProviderMembership(provider, {
      workosOrganizationId: null,
      workosUserId: 'user_workos',
      role: 'member',
    })

    expect(result).toBeNull()
    expect(provider.createOrganizationMembership).not.toHaveBeenCalled()
  })

  it('does nothing when the user has no provider record', async () => {
    const result = await ensureProviderMembership(provider, {
      workosOrganizationId: 'org_workos',
      workosUserId: null,
      role: 'member',
    })

    expect(result).toBeNull()
    expect(provider.createOrganizationMembership).not.toHaveBeenCalled()
  })
})

describe('deleteProviderUser', () => {
  it('deletes and reports that a call landed', async () => {
    provider.deleteUser.mockResolvedValue(undefined)

    const result = await deleteProviderUser(provider, 'user_workos', {
      localUserId: 'user_1',
    })

    expect(result).toBe(true)
    expect(provider.deleteUser).toHaveBeenCalledWith('user_workos')
  })

  it('treats an already-absent record as success', async () => {
    // Idempotence: a reconciliation pass must converge, not fail.
    provider.deleteUser.mockRejectedValue(gone())

    const result = await deleteProviderUser(provider, 'user_workos', {
      localUserId: 'user_1',
    })

    expect(result).toBe(false)
  })

  it('re-raises any other provider failure', async () => {
    // A 502 means the delete may not have happened, so the local write must
    // roll back rather than be reported as synced.
    provider.deleteUser.mockRejectedValue(providerDown())

    await expect(
      deleteProviderUser(provider, 'user_workos', { localUserId: 'user_1' })
    ).rejects.toThrow('Upstream failed.')
  })

  it('skips the call when there is no provider record', async () => {
    const result = await deleteProviderUser(provider, null, {
      localUserId: 'user_1',
    })

    expect(result).toBe(false)
    expect(provider.deleteUser).not.toHaveBeenCalled()
  })
})

describe('deleteProviderOrganization', () => {
  it('deletes and reports that a call landed', async () => {
    provider.deleteOrganization.mockResolvedValue(undefined)

    const result = await deleteProviderOrganization(provider, 'org_workos', {
      localOrganizationId: 'org_1',
    })

    expect(result).toBe(true)
  })

  it('treats an already-absent record as success', async () => {
    provider.deleteOrganization.mockRejectedValue(gone())

    const result = await deleteProviderOrganization(provider, 'org_workos', {
      localOrganizationId: 'org_1',
    })

    expect(result).toBe(false)
  })

  it('re-raises any other provider failure', async () => {
    provider.deleteOrganization.mockRejectedValue(providerDown())

    await expect(
      deleteProviderOrganization(provider, 'org_workos', {
        localOrganizationId: 'org_1',
      })
    ).rejects.toThrow('Upstream failed.')
  })

  it('skips the call when there is no provider record', async () => {
    const result = await deleteProviderOrganization(provider, null, {
      localOrganizationId: 'org_1',
    })

    expect(result).toBe(false)
    expect(provider.deleteOrganization).not.toHaveBeenCalled()
  })
})

describe('deleteProviderMembership', () => {
  it('deletes and reports that a call landed', async () => {
    provider.deleteOrganizationMembership.mockResolvedValue(undefined)

    const result = await deleteProviderMembership(provider, 'om_1', {
      localMembershipId: 'mem_1',
    })

    expect(result).toBe(true)
  })

  it('treats an already-absent record as success', async () => {
    provider.deleteOrganizationMembership.mockRejectedValue(gone())

    const result = await deleteProviderMembership(provider, 'om_1', {
      localMembershipId: 'mem_1',
    })

    expect(result).toBe(false)
  })

  it('re-raises any other provider failure', async () => {
    provider.deleteOrganizationMembership.mockRejectedValue(providerDown())

    await expect(
      deleteProviderMembership(provider, 'om_1', {
        localMembershipId: 'mem_1',
      })
    ).rejects.toThrow('Upstream failed.')
  })

  it('skips the call when there is no provider record', async () => {
    const result = await deleteProviderMembership(provider, null, {
      localMembershipId: 'mem_1',
    })

    expect(result).toBe(false)
    expect(provider.deleteOrganizationMembership).not.toHaveBeenCalled()
  })
})

describe('compensateProviderUser', () => {
  it('deletes the user created earlier in the failed request', async () => {
    provider.deleteUser.mockResolvedValue(undefined)

    await compensateProviderUser(provider, 'user_workos', {
      operation: 'register',
    })

    expect(provider.deleteUser).toHaveBeenCalledWith('user_workos')
  })

  it('never throws, so the original failure is what the caller re-raises', async () => {
    // It runs inside a catch that is about to re-raise; letting a compensation
    // error escape would replace the real cause with a confusing one.
    provider.deleteUser.mockRejectedValue(providerDown())

    await expect(
      compensateProviderUser(provider, 'user_workos', { operation: 'register' })
    ).resolves.toBeUndefined()
  })

  it('does not throw even on a non-Error rejection', async () => {
    provider.deleteUser.mockRejectedValue('a string')

    await expect(
      compensateProviderUser(provider, 'user_workos', { operation: 'register' })
    ).resolves.toBeUndefined()
  })
})
