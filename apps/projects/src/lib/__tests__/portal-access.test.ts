import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  probePortalGrant,
  resolvePortalGrant,
} from '../portal-access'

function success(data: unknown = { data: [] }) {
  return { data, error: null }
}

function failure(code = 'projects/client-grant-not-found') {
  return { data: null, error: { code, message: 'Not found.' } }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('probePortalGrant', () => {
  it('grants when the portal answers data', async () => {
    const listIssues = vi.fn().mockResolvedValue(success())

    await expect(
      probePortalGrant({ listIssues }, 'org_1', 'prj_1')
    ).resolves.toBe(true)
    expect(listIssues).toHaveBeenCalledWith('org_1', 'prj_1', { limit: 1 })
  })

  it('denies when the portal answers an error', async () => {
    const listIssues = vi.fn().mockResolvedValue(failure())

    await expect(
      probePortalGrant({ listIssues }, 'org_1', 'prj_1')
    ).resolves.toBe(false)
  })

  it('denies a revoked grant, which reads as not found', async () => {
    const listIssues = vi
      .fn()
      .mockResolvedValue(failure('projects/client-grant-not-found'))

    await expect(
      probePortalGrant({ listIssues }, 'org_1', 'prj_1')
    ).resolves.toBe(false)
  })
})

describe('resolvePortalGrant', () => {
  it('returns the first organization holding a live grant', async () => {
    const probe = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
    const createClient = vi.fn().mockReturnValue({ listIssues: vi.fn() })

    const access = await resolvePortalGrant({
      projectId: 'prj_1',
      userId: 'usr_client',
      orgIds: ['org_a', 'org_b'],
      createClient,
      probe,
    })

    expect(access).toEqual({ orgId: 'org_b', userId: 'usr_client' })
    expect(probe).toHaveBeenCalledTimes(2)
  })

  it('creates the portal client for the acting user, never an internal check', async () => {
    const probe = vi.fn().mockResolvedValue(true)
    const createClient = vi.fn().mockReturnValue({ listIssues: vi.fn() })

    await resolvePortalGrant({
      projectId: 'prj_1',
      userId: 'usr_client',
      orgIds: ['org_1'],
      createClient,
      probe,
    })

    expect(createClient).toHaveBeenCalledWith('usr_client')
  })

  it('denies when no organization holds a grant', async () => {
    const probe = vi.fn().mockResolvedValue(false)
    const createClient = vi.fn().mockReturnValue({ listIssues: vi.fn() })

    await expect(
      resolvePortalGrant({
        projectId: 'prj_1',
        userId: 'usr_client',
        orgIds: ['org_a', 'org_b'],
        createClient,
        probe,
      })
    ).resolves.toBeNull()
  })

  it('denies when the user has no candidate organizations', async () => {
    const probe = vi.fn()
    const createClient = vi.fn().mockReturnValue({ listIssues: vi.fn() })

    await expect(
      resolvePortalGrant({
        projectId: 'prj_1',
        userId: 'usr_client',
        orgIds: [],
        createClient,
        probe,
      })
    ).resolves.toBeNull()
    expect(probe).not.toHaveBeenCalled()
  })

  it('stops probing after the first live grant', async () => {
    const probe = vi.fn().mockResolvedValue(true)
    const createClient = vi.fn().mockReturnValue({ listIssues: vi.fn() })

    await resolvePortalGrant({
      projectId: 'prj_1',
      userId: 'usr_client',
      orgIds: ['org_a', 'org_b', 'org_c'],
      createClient,
      probe,
    })

    expect(probe).toHaveBeenCalledTimes(1)
  })

  it('denies when the probe rejects instead of answering', async () => {
    const probe = vi.fn().mockRejectedValue(new Error('boom'))
    const createClient = vi.fn().mockReturnValue({ listIssues: vi.fn() })

    await expect(
      resolvePortalGrant({
        projectId: 'prj_1',
        userId: 'usr_client',
        orgIds: ['org_1'],
        createClient,
        probe,
      })
    ).resolves.toBeNull()
  })
})
