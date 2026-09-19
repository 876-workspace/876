import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  PROJECTS_MOBILE_CLIENT_ID,
  PROJECTS_MOBILE_REDIRECT_URI,
  PROJECTS_MOBILE_SCOPES,
  PROJECTS_MOBILE_SLUG,
  seedNativeApps,
} from './native-apps'
import {
  createNativeApp,
  findNativeAppBySlug,
  syncNativeApp,
} from './native-apps.repository'

vi.mock('./native-apps.repository', () => ({
  findNativeAppBySlug: vi.fn(),
  createNativeApp: vi.fn(),
  syncNativeApp: vi.fn(),
}))

vi.mock('@/platform/logger', () => ({
  getLogger: vi.fn(() => ({ info: vi.fn(), error: vi.fn() })),
}))

const findMock = vi.mocked(findNativeAppBySlug)
const createMock = vi.mocked(createNativeApp)
const syncMock = vi.mocked(syncNativeApp)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('seedNativeApps', () => {
  it('creates the public native client with the fixed client id', async () => {
    findMock.mockResolvedValue(null)

    const summary = await seedNativeApps({ organizationId: 'org_1' })

    expect(summary).toEqual({ created: true, synced: false })
    expect(createMock).toHaveBeenCalledOnce()
    const params = createMock.mock.calls[0]?.[0]
    expect(params).toMatchObject({
      slug: PROJECTS_MOBILE_SLUG,
      organizationId: 'org_1',
      clientId: PROJECTS_MOBILE_CLIENT_ID,
      appKind: 'product',
      type: 'native',
      allowedRedirectUris: [PROJECTS_MOBILE_REDIRECT_URI],
      scopesAllowed: PROJECTS_MOBILE_SCOPES,
    })
  })

  it('leaves a conforming row untouched', async () => {
    findMock.mockResolvedValue({
      id: 'app_1',
      slug: PROJECTS_MOBILE_SLUG,
      clientId: PROJECTS_MOBILE_CLIENT_ID,
      clientType: 'public',
      clientSecretHash: null,
      appKind: 'product',
      status: 'active',
      type: 'native',
      allowedRedirectUris: [PROJECTS_MOBILE_REDIRECT_URI],
      scopesAllowed: [...PROJECTS_MOBILE_SCOPES],
    })

    const summary = await seedNativeApps({ organizationId: 'org_1' })

    expect(summary).toEqual({ created: false, synced: false })
    expect(createMock).not.toHaveBeenCalled()
    expect(syncMock).not.toHaveBeenCalled()
  })

  it('repairs a drifted row instead of duplicating the client', async () => {
    findMock.mockResolvedValue({
      id: 'app_1',
      slug: PROJECTS_MOBILE_SLUG,
      clientId: PROJECTS_MOBILE_CLIENT_ID,
      clientType: 'public',
      clientSecretHash: null,
      appKind: 'product',
      status: 'active',
      type: 'native',
      allowedRedirectUris: ['com.efesto.projects://old-callback'],
      scopesAllowed: ['openid', 'profile', 'email'],
    })

    const summary = await seedNativeApps({ organizationId: 'org_1' })

    expect(summary).toEqual({ created: false, synced: true })
    expect(createMock).not.toHaveBeenCalled()
    expect(syncMock).toHaveBeenCalledOnce()
  })

  it('repairs a row that gained a secret', async () => {
    findMock.mockResolvedValue({
      id: 'app_1',
      slug: PROJECTS_MOBILE_SLUG,
      clientId: PROJECTS_MOBILE_CLIENT_ID,
      clientType: 'confidential',
      clientSecretHash: 'deadbeef',
      appKind: 'product',
      status: 'active',
      type: 'native',
      allowedRedirectUris: [PROJECTS_MOBILE_REDIRECT_URI],
      scopesAllowed: [...PROJECTS_MOBILE_SCOPES],
    })

    const summary = await seedNativeApps({ organizationId: 'org_1' })

    expect(summary).toEqual({ created: false, synced: true })
    expect(syncMock).toHaveBeenCalledOnce()
  })
})
