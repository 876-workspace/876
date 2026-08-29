import { createElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ReportsLayout from '@/app/(app)/reports/layout'
import SecurityLayout from '@/app/(app)/security/layout'
import SettingsSecurityLayout from '@/app/(app)/settings/security/layout'
import MembersLayout from '@/app/(app)/settings/users/layout'
import RolesLayout from '@/app/(app)/settings/users/roles/layout'
import StorageLayout from '@/app/(app)/storage/layout'
import SupportLayout from '@/app/(app)/support/layout'
import { ROUTE_PERMISSIONS } from './route-permissions'

const mocks = vi.hoisted(() => ({ requireSession: vi.fn(), requireConsolePermission: vi.fn() }))
vi.mock('@/lib/auth/guards', () => ({ requireSession: mocks.requireSession, requireConsolePermission: mocks.requireConsolePermission }))
vi.mock('@/app/(app)/settings/users/_components/team-section-actions', () => ({ TeamSectionActions: () => null }))
const child = createElement('span', null, 'content')
const denied = new Error('permission denied')

beforeEach(() => { vi.clearAllMocks(); mocks.requireSession.mockResolvedValue({ id: 'user_operator' }); mocks.requireConsolePermission.mockResolvedValue({ id: 'user_operator' }) })

describe('new route permission layouts', () => {
  it('renders support when the support permission guard allows it', async () => { const result = await SupportLayout({ children: child }); expect(result.props.children).toBe(child); expect(mocks.requireConsolePermission).toHaveBeenCalledWith('user_operator', ROUTE_PERMISSIONS['/support']) })
  it('blocks support when the support permission guard rejects it', async () => { mocks.requireConsolePermission.mockRejectedValueOnce(denied); await expect(SupportLayout({ children: child })).rejects.toBe(denied); expect(mocks.requireConsolePermission).toHaveBeenCalledTimes(1) })
  it('renders security when the security permission guard allows it', async () => { const result = await SecurityLayout({ children: child }); expect(result.props.children).toBe(child); expect(mocks.requireConsolePermission).toHaveBeenCalledWith('user_operator', ROUTE_PERMISSIONS['/security']) })
  it('blocks security when the security permission guard rejects it', async () => { mocks.requireConsolePermission.mockRejectedValueOnce(denied); await expect(SecurityLayout({ children: child })).rejects.toBe(denied); expect(mocks.requireConsolePermission).toHaveBeenCalledTimes(1) })
  it('renders storage when the storage permission guard allows it', async () => { const result = await StorageLayout({ children: child }); expect(result.props.children).toBe(child); expect(mocks.requireConsolePermission).toHaveBeenCalledWith('user_operator', ROUTE_PERMISSIONS['/storage']) })
  it('blocks storage when the storage permission guard rejects it', async () => { mocks.requireConsolePermission.mockRejectedValueOnce(denied); await expect(StorageLayout({ children: child })).rejects.toBe(denied); expect(mocks.requireConsolePermission).toHaveBeenCalledTimes(1) })
  it('renders reports when the reports permission guard allows it', async () => { const result = await ReportsLayout({ children: child }); expect(result.props.children).toBe(child); expect(mocks.requireConsolePermission).toHaveBeenCalledWith('user_operator', ROUTE_PERMISSIONS['/reports']) })
  it('blocks reports when the reports permission guard rejects it', async () => { mocks.requireConsolePermission.mockRejectedValueOnce(denied); await expect(ReportsLayout({ children: child })).rejects.toBe(denied); expect(mocks.requireConsolePermission).toHaveBeenCalledTimes(1) })
  it('renders the Team shell when the team-list guard allows it', async () => { const result = await MembersLayout({ children: child }); expect(result.type).toBe('div'); expect(mocks.requireConsolePermission).toHaveBeenCalledWith('user_operator', ROUTE_PERMISSIONS['/settings/users']) })
  it('blocks the Team shell when the team-list guard rejects it', async () => { mocks.requireConsolePermission.mockRejectedValueOnce(denied); await expect(MembersLayout({ children: child })).rejects.toBe(denied); expect(mocks.requireConsolePermission).toHaveBeenCalledTimes(1) })
  it('renders Roles when the roles-list guard allows it', async () => { const result = await RolesLayout({ children: child }); expect(result.props.children).toBe(child); expect(mocks.requireConsolePermission).toHaveBeenCalledWith('user_operator', ROUTE_PERMISSIONS['/settings/users/roles']) })
  it('blocks Roles when the roles-list guard rejects it', async () => { mocks.requireConsolePermission.mockRejectedValueOnce(denied); await expect(RolesLayout({ children: child })).rejects.toBe(denied); expect(mocks.requireConsolePermission).toHaveBeenCalledTimes(1) })
  it('renders Settings Security when its security guard allows it', async () => { const result = await SettingsSecurityLayout({ children: child }); expect(result.props.children).toBe(child); expect(mocks.requireConsolePermission).toHaveBeenCalledWith('user_operator', ROUTE_PERMISSIONS['/settings/security']) })
  it('blocks Settings Security when its security guard rejects it', async () => { mocks.requireConsolePermission.mockRejectedValueOnce(denied); await expect(SettingsSecurityLayout({ children: child })).rejects.toBe(denied); expect(mocks.requireConsolePermission).toHaveBeenCalledTimes(1) })
})
