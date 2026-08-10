import { beforeEach, describe, expect, it, vi } from 'vitest'

const { kioskDevice, branch } = vi.hoisted(() => ({
  kioskDevice: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  branch: { findFirst: vi.fn() },
}))

vi.mock('./kiosk.repository', () => ({ prisma: { kioskDevice, branch } }))

const { enroll, revoke } = await import('./kiosk.service')

beforeEach(() => {
  vi.clearAllMocks()
  branch.findFirst.mockResolvedValue({ id: 'br_1' })
  kioskDevice.create.mockResolvedValue({
    id: 'kdev_1',
    tenantId: 'ten_1',
    branchId: 'br_1',
    name: 'Front desk',
    status: 'ACTIVE',
    lastUsedAt: null,
    revokedAt: null,
    createdAt: 1,
    updatedAt: 1,
  })
  kioskDevice.findFirst.mockResolvedValue({
    id: 'kdev_1',
    tenantId: 'ten_1',
    branchId: 'br_1',
    name: 'Front desk',
    status: 'ACTIVE',
    lastUsedAt: null,
    revokedAt: null,
    createdAt: 1,
    updatedAt: 1,
  })
  kioskDevice.update.mockResolvedValue({
    id: 'kdev_1',
    tenantId: 'ten_1',
    branchId: 'br_1',
    name: 'Front desk',
    status: 'REVOKED',
    lastUsedAt: null,
    revokedAt: 2,
    createdAt: 1,
    updatedAt: 2,
  })
})

describe('kiosk device enrollment', () => {
  it('returns the raw credential once but persists only its SHA-256 hash', async () => {
    const result = await enroll('ten_1', {
      branch_id: 'br_1',
      name: 'Front desk',
    })
    expect(result.credential).toMatch(/^kdev_/)
    expect(result.device).not.toHaveProperty('credential_hash')
    expect(kioskDevice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          credentialHash: expect.not.stringMatching(/^kdev_/),
        }),
      })
    )
  })

  it('cannot enroll a device against another tenant branch', async () => {
    branch.findFirst.mockResolvedValue(null)
    await expect(
      enroll('ten_1', { branch_id: 'br_other', name: 'Front desk' })
    ).rejects.toMatchObject({ code: 'branch/not-found', httpStatus: 404 })
    expect(kioskDevice.create).not.toHaveBeenCalled()
  })

  it('revokes an enrolled device without deleting its audit record', async () => {
    const result = await revoke('ten_1', 'kdev_1')
    expect(result.status).toBe('REVOKED')
    expect(kioskDevice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'REVOKED',
          revokedAt: expect.any(Number),
        }),
      })
    )
  })
})
