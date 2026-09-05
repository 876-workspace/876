import { createElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ROUTE_PERMISSIONS } from '@/lib/auth/route-permissions'

import WorkspaceLayout from './layout'

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  requireConsolePermission: vi.fn(),
}))

vi.mock('@/lib/auth/guards', () => ({
  requireSession: mocks.requireSession,
  requireConsolePermission: mocks.requireConsolePermission,
}))

const child = createElement('span', null, 'workspace')
const denied = new Error('permission denied')

describe('Workspace route guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireSession.mockResolvedValue({ id: 'user_operator' })
    mocks.requireConsolePermission.mockResolvedValue({ id: 'user_operator' })
  })

  it('renders the workspace hub when the guard permits it', async () => {
    const result = await WorkspaceLayout({ children: child })

    expect(result.props.children).toBe(child)
  })

  it('requires the workspace registry permission', async () => {
    await WorkspaceLayout({ children: child })

    expect(mocks.requireConsolePermission).toHaveBeenCalledWith(
      'user_operator',
      ROUTE_PERMISSIONS['/workspace']
    )
  })

  it('requires a session before rendering the hub', async () => {
    await WorkspaceLayout({ children: child })

    expect(mocks.requireSession).toHaveBeenCalledWith('/workspace')
  })

  it('does not render the hub when permission is denied', async () => {
    mocks.requireConsolePermission.mockRejectedValueOnce(denied)

    await expect(WorkspaceLayout({ children: child })).rejects.toBe(denied)
  })

  it('does not check permissions after session resolution rejects', async () => {
    mocks.requireSession.mockRejectedValueOnce(denied)

    await expect(WorkspaceLayout({ children: child })).rejects.toBe(denied)
    expect(mocks.requireConsolePermission).not.toHaveBeenCalled()
  })
})
