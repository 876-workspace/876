import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ redirect: vi.fn() }))

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))

import AccessDeniedPage from './page'

describe('AccessDeniedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.redirect.mockImplementation((path: string) => {
      throw Object.assign(new Error(`redirect:${path}`), { path })
    })
  })

  it('keeps legacy realm-gate URLs inside Enterprise workspace setup', () => {
    expect(() => AccessDeniedPage()).toThrow(
      expect.objectContaining({ path: '/register' })
    )
    expect(mocks.redirect).toHaveBeenCalledWith('/register')
  })
})
