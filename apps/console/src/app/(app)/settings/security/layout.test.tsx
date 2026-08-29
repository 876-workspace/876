import { createElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ROUTE_PERMISSIONS } from '@/lib/auth/route-permissions'

import Layout from './layout'

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  requireConsolePermission: vi.fn(),
}))

vi.mock('@/lib/auth/guards', () => ({
  requireSession: mocks.requireSession,
  requireConsolePermission: mocks.requireConsolePermission,
}))

const child = createElement('span', null, 'content')
const denied = new Error('permission denied')

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireSession.mockResolvedValue({ id: 'user_operator' })
  mocks.requireConsolePermission.mockResolvedValue({ id: 'user_operator' })
})

describe('Settings security route guard', () => {
  it('renders the section when the permission guard allows it', async () => {
    const result = await Layout({ children: child })

    expect(result.props.children).toBe(child)
    expect(mocks.requireConsolePermission).toHaveBeenCalledTimes(1)
    expect(mocks.requireConsolePermission).toHaveBeenCalledWith(
      'user_operator',
      ROUTE_PERMISSIONS['/settings/security']
    )
  })

  it('blocks the section when the permission guard rejects it', async () => {
    mocks.requireConsolePermission.mockRejectedValueOnce(denied)

    await expect(Layout({ children: child })).rejects.toBe(denied)
    expect(mocks.requireConsolePermission).toHaveBeenCalledTimes(1)
  })

  it('requires a session before checking the permission', async () => {
    await Layout({ children: child })

    expect(mocks.requireSession).toHaveBeenCalledTimes(1)
  })

  it('checks the same permission the navigation registry declares', async () => {
    await Layout({ children: child })

    const [, permission] = mocks.requireConsolePermission.mock.calls[0]!
    expect(permission).toBe(ROUTE_PERMISSIONS['/settings/security'])
  })
})
