import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  resolveDefaultApplicationManifestTarget: vi.fn(),
  findManifestFirst: vi.fn(),
  findRevisionByStatus: vi.fn(),
}))

vi.mock('../application-provisioning-profile.service', () => ({
  resolveDefaultApplicationManifestTarget:
    mocks.resolveDefaultApplicationManifestTarget,
}))

vi.mock('../provisioning.repository', () => ({
  findManifestFirst: mocks.findManifestFirst,
  findRevisionByStatus: mocks.findRevisionByStatus,
}))

const { retrieveManifest } = await import('../provisioning.service')

const NOW = BigInt(1_788_163_200)

function manifest(targetKey: string) {
  return {
    id: `pvm_${targetKey}`,
    targetType: 'application',
    targetKey,
    manifestVersion: 1,
    createdAt: NOW,
    updatedAt: NOW,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.findManifestFirst.mockImplementation(
    async (_targetType: string, targetKey: string) => manifest(targetKey)
  )
  mocks.findRevisionByStatus.mockResolvedValue(null)
})

describe('generic application manifest compatibility', () => {
  it('follows the current default profile target after the operator changes the default', async () => {
    mocks.resolveDefaultApplicationManifestTarget
      .mockResolvedValueOnce({
        manifestTargetKey: 'rap_crm',
        app: { id: 'rap_crm', slug: '876-crm' },
        profile: { id: 'apppr_default', key: 'default' },
      })
      .mockResolvedValueOnce({
        manifestTargetKey: 'apppr_jamaica',
        app: { id: 'rap_crm', slug: '876-crm' },
        profile: { id: 'apppr_jamaica', key: 'jamaica' },
      })

    const before = await retrieveManifest('application', '876-crm')
    const after = await retrieveManifest('application', '876-crm')

    expect(before.target_key).toBe('rap_crm')
    expect(after.target_key).toBe('apppr_jamaica')
    expect(mocks.resolveDefaultApplicationManifestTarget).toHaveBeenCalledTimes(2)
    expect(mocks.resolveDefaultApplicationManifestTarget).toHaveBeenNthCalledWith(
      1,
      '876-crm'
    )
    expect(mocks.resolveDefaultApplicationManifestTarget).toHaveBeenNthCalledWith(
      2,
      '876-crm'
    )
    expect(mocks.findManifestFirst).toHaveBeenNthCalledWith(
      1,
      'application',
      'rap_crm'
    )
    expect(mocks.findManifestFirst).toHaveBeenNthCalledWith(
      2,
      'application',
      'apppr_jamaica'
    )
    expect(mocks.findManifestFirst).not.toHaveBeenCalledWith(
      'application',
      '876-crm'
    )
  })
})
