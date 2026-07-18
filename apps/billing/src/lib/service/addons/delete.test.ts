import { beforeEach, describe, expect, it, vi } from 'vitest'

import { deleteAddon } from './delete'

const mocks = vi.hoisted(() => ({
  prismaRef: { current: null as unknown as Record<string, unknown> },
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mocks.prismaRef.current
  },
}))

describe('deleteAddon', () => {
  beforeEach(() => {
    mocks.prismaRef.current = {
      addon: {
        findFirst: vi.fn().mockResolvedValue({
          _count: {
            prices: 0,
            planAssociations: 0,
            couponApplicabilities: 0,
          },
        }),
        delete: vi.fn().mockResolvedValue({ id: 'addon_1' }),
      },
    }
    vi.clearAllMocks()
  })

  it('preserves add-ons referenced by catalog configuration', async () => {
    const addon = (
      mocks.prismaRef.current as unknown as {
        addon: {
          findFirst: ReturnType<typeof vi.fn>
          delete: ReturnType<typeof vi.fn>
        }
      }
    ).addon
    addon.findFirst.mockResolvedValue({
      _count: {
        prices: 0,
        planAssociations: 1,
        couponApplicabilities: 0,
      },
    })

    const result = await deleteAddon('ten_1', 'addon_1')

    expect(result).toEqual({
      data: null,
      error:
        'This add-on has prices or catalog associations. Archive it instead.',
      status: 409,
    })
    expect(addon.delete).not.toHaveBeenCalled()
  })

  it('deletes a truly unreferenced add-on', async () => {
    const addon = (
      mocks.prismaRef.current as unknown as {
        addon: { delete: ReturnType<typeof vi.fn> }
      }
    ).addon

    const result = await deleteAddon('ten_1', 'addon_1')

    expect(result).toEqual({ data: { id: 'addon_1' }, error: null })
    expect(addon.delete).toHaveBeenCalledWith({ where: { id: 'addon_1' } })
  })
})
