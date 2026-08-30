import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ redirect: vi.fn() }))

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))

import NoAccessPage from './page'

describe('NoAccessPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.redirect.mockImplementation((path: string) => {
      throw Object.assign(new Error(`redirect:${path}`), { path })
    })
  })

  it('routes legacy no-access URLs through the normal home resolver', () => {
    expect(() => NoAccessPage()).toThrow(expect.objectContaining({ path: '/' }))
    expect(mocks.redirect).toHaveBeenCalledWith('/')
  })
})
