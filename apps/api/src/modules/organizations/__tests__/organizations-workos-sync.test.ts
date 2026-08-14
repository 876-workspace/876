import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { repository } = vi.hoisted(() => ({
  repository: {
    findOrganizationByWorkosId: vi.fn(),
    updateOrganization: vi.fn(),
  },
}))

vi.mock('@/db/client', () => ({
  prisma: {},
  disconnectDb: vi.fn(),
  pingDb: vi.fn(),
}))
vi.mock('../organizations.repository', () => repository)

const { syncOrganizationFromWorkos, findLocalOrgIdByWorkosId } =
  await import('../organizations.service')

const NOW = 1_785_000_000

describe('syncOrganizationFromWorkos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW * 1000)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('updates the local org name when matched by WorkOS id', async () => {
    repository.findOrganizationByWorkosId.mockResolvedValue({ id: 'org_1' })
    repository.updateOrganization.mockResolvedValue({ id: 'org_1' })

    const result = await syncOrganizationFromWorkos({
      workosOrganizationId: 'org_workos_1',
      name: 'Acme Renamed',
    })

    expect(result).toBe(true)
    expect(repository.updateOrganization).toHaveBeenCalledWith('org_1', {
      name: 'Acme Renamed',
      updatedAt: BigInt(NOW),
    })
  })

  it('does not update when the event carries no name', async () => {
    repository.findOrganizationByWorkosId.mockResolvedValue({ id: 'org_1' })

    const result = await syncOrganizationFromWorkos({
      workosOrganizationId: 'org_workos_1',
    })

    expect(result).toBe(false)
    expect(repository.updateOrganization).not.toHaveBeenCalled()
  })

  it('is a no-op for an unknown organization', async () => {
    repository.findOrganizationByWorkosId.mockResolvedValue(null)

    const result = await syncOrganizationFromWorkos({
      workosOrganizationId: 'org_absent',
      name: 'Whatever',
    })

    expect(result).toBe(false)
    expect(repository.updateOrganization).not.toHaveBeenCalled()
  })
})

describe('findLocalOrgIdByWorkosId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the local id when the org resolves', async () => {
    repository.findOrganizationByWorkosId.mockResolvedValue({ id: 'org_5' })
    expect(await findLocalOrgIdByWorkosId('org_workos_5')).toBe('org_5')
  })

  it('returns null when the org does not resolve', async () => {
    repository.findOrganizationByWorkosId.mockResolvedValue(null)
    expect(await findLocalOrgIdByWorkosId('org_absent')).toBeNull()
  })
})
