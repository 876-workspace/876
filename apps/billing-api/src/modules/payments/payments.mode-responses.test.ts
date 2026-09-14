import { beforeEach, describe, expect, it, vi } from 'vitest'

const modes = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
}))

vi.mock('./repositories/payment-modes', () => ({
  paymentModes: modes,
}))

import { paymentsService } from './payments.service'

const mode = {
  id: 'pm_1',
  tenantId: 'ten_1',
  name: 'Bank transfer',
  isDefault: false,
  isActive: true,
  isSystem: false,
  createdAt: 1,
  updatedAt: 1,
}
const resource = {
  object: 'payment_mode' as const,
  id: 'pm_1',
  name: 'Bank transfer',
  isDefault: false,
  isActive: true,
  isSystem: false,
  createdAt: 1,
  updatedAt: 1,
}

describe('paymentsService payment-mode mutation responses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    modes.create.mockResolvedValue({ data: mode, error: null, status: 201 })
    modes.update.mockResolvedValue({ data: mode, error: null, status: 200 })
  })

  it('serializes the actual created payment-mode row into the integration resource', async () => {
    const result = await paymentsService.createMode('ten_1', {
      name: 'Bank transfer',
    })

    expect(result).toEqual(resource)
    expect(modes.create).toHaveBeenCalledTimes(1)
    expect(modes.create).toHaveBeenCalledWith('ten_1', {
      name: 'Bank transfer',
    })
  })

  it('serializes the actual updated payment-mode row into the integration resource', async () => {
    const result = await paymentsService.updateMode('ten_1', 'pm_1', {
      isDefault: true,
    })

    expect(result).toEqual(resource)
    expect(modes.update).toHaveBeenCalledTimes(1)
    expect(modes.update).toHaveBeenCalledWith('ten_1', 'pm_1', {
      isDefault: true,
    })
  })
})
