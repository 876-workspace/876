import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  complete: vi.fn(),
  getManageContext: vi.fn(),
  getPlatformClient: vi.fn(),
  updateProfile: vi.fn(),
}))

vi.mock('@/lib/storage', () => ({
  $storage: { uploads: { complete: mocks.complete } },
}))
vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/876/platform-client', () => ({
  getPlatformClient: mocks.getPlatformClient,
}))

import { POST } from './route'

function request(body: string | Record<string, unknown>) {
  return new Request(
    'http://couriers.test/api/manage/settings/orglogo/complete',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }
  ) as never
}

function context(role: 'owner' | 'admin' | 'member') {
  return {
    userId: 'user_123',
    orgId: 'org_context',
    orgSlug: 'island-logistics',
    role,
  }
}

const validBody = { orgSlug: 'island-logistics', id: 'upl_123' }
const readyFile = {
  object: 'file',
  id: 'file_new',
  owner_type: 'organization',
  owner_id: 'org_context',
  status: 'ready',
  url: 'https://assets.876.test/logo-new.png',
}

describe('Couriers organization logo upload completion route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue(context('owner'))
    mocks.complete.mockResolvedValue({ data: readyFile, error: null })
    mocks.getPlatformClient.mockResolvedValue({
      orgs: { updateProfile: mocks.updateProfile },
    })
    mocks.updateProfile.mockResolvedValue({
      data: { object: 'organization', id: 'org_context' },
      error: null,
    })
  })

  describe('authorization', () => {
    it('returns 401 when there is no manage context', async () => {
      mocks.getManageContext.mockResolvedValue(null)

      const response = await POST(request(validBody))
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.error).toEqual({
        code: 'auth/no-session',
        message: 'Unauthorized.',
      })
      expect(mocks.complete).not.toHaveBeenCalled()
      expect(mocks.updateProfile).not.toHaveBeenCalled()
    })

    it('refuses an unauthorized member', async () => {
      mocks.getManageContext.mockResolvedValue(context('member'))

      const response = await POST(request(validBody))
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.error.code).toBe('auth/forbidden')
      expect(mocks.complete).not.toHaveBeenCalled()
      expect(mocks.updateProfile).not.toHaveBeenCalled()
    })

    it.each(['owner', 'admin'] as const)(
      'allows a %s to complete an upload for their org',
      async (role) => {
        mocks.getManageContext.mockResolvedValue(context(role))

        const response = await POST(request(validBody))

        expect(response.status).toBe(200)
        expect(mocks.complete).toHaveBeenCalledTimes(1)
        expect(mocks.updateProfile).toHaveBeenCalledTimes(1)
      }
    )
  })

  describe('request validation', () => {
    it('rejects malformed JSON', async () => {
      const response = await POST(request('{bad'))
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error.code).toBe('storage/invalid-request')
      expect(mocks.getManageContext).not.toHaveBeenCalled()
    })

    it.each([
      ['missing orgSlug', { id: 'upl_123' }],
      ['empty orgSlug', { orgSlug: '', id: 'upl_123' }],
      ['missing id', { orgSlug: 'island-logistics' }],
      ['empty id', { orgSlug: 'island-logistics', id: '' }],
      [
        'id without upl_ prefix',
        { orgSlug: 'island-logistics', id: 'file_123' },
      ],
      ['id with wrong prefix', { orgSlug: 'island-logistics', id: 'sess_123' }],
    ] as const)('rejects %s', async (_label, payload) => {
      const response = await POST(request(payload as Record<string, unknown>))
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error.code).toBe('storage/invalid-request')
      expect(mocks.getManageContext).not.toHaveBeenCalled()
      expect(mocks.complete).not.toHaveBeenCalled()
    })

    it('rejects a client-supplied organization id', async () => {
      const response = await POST(
        request({ ...validBody, organizationId: 'org_attacker' })
      )

      expect(response.status).toBe(400)
      expect(mocks.getManageContext).not.toHaveBeenCalled()
      expect(mocks.complete).not.toHaveBeenCalled()
      expect(mocks.updateProfile).not.toHaveBeenCalled()
    })

    it.each([
      'owner_id',
      'logo_file_id',
      'logo_url',
      'file_id',
      'category',
      'audience',
    ] as const)(
      'rejects client-supplied privileged field %s via strict schema',
      async (field) => {
        const response = await POST(
          request({ ...validBody, [field]: 'attacker-value' })
        )

        expect(response.status).toBe(400)
        expect(mocks.complete).not.toHaveBeenCalled()
        expect(mocks.updateProfile).not.toHaveBeenCalled()
      }
    )
  })

  describe('completion and profile attach', () => {
    it('leaves the existing profile untouched when Storage completion fails', async () => {
      mocks.complete.mockResolvedValue({
        data: null,
        error: {
          code: 'storage/upload-verification-failed',
          message: 'The uploaded file could not be verified.',
        },
      })

      const response = await POST(request(validBody))
      const body = await response.json()

      expect(response.status).toBe(422)
      expect(body.error.code).toBe('storage/upload-verification-failed')
      expect(mocks.getPlatformClient).not.toHaveBeenCalled()
      expect(mocks.updateProfile).not.toHaveBeenCalled()
    })

    it.each([
      ['storage/upload-not-found', 404],
      ['storage/upload-expired', 410],
      ['storage/upload-incomplete', 409],
      ['storage/provider-error', 502],
    ] as const)(
      'maps Storage completion error %s to HTTP %s without profile writes',
      async (code, status) => {
        mocks.complete.mockResolvedValue({
          data: null,
          error: { code, message: 'Storage rejected completion.' },
        })

        const response = await POST(request(validBody))
        const body = await response.json()

        expect(response.status).toBe(status)
        expect(body.error.code).toBe(code)
        expect(mocks.updateProfile).not.toHaveBeenCalled()
      }
    )

    it('updates the context organization only after the file is ready', async () => {
      const response = await POST(request(validBody))
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body).toEqual({ data: readyFile, error: null })
      expect(mocks.complete).toHaveBeenCalledWith('upl_123')
      expect(mocks.updateProfile).toHaveBeenCalledTimes(1)
      expect(mocks.updateProfile).toHaveBeenCalledWith('org_context', {
        logo_file_id: 'file_new',
        logo_url: 'https://assets.876.test/logo-new.png',
      })
    })

    it('never uses a client-supplied org id when attaching the logo', async () => {
      mocks.getManageContext.mockResolvedValue({
        ...context('owner'),
        orgId: 'org_from_session_cookie',
      })
      mocks.complete.mockResolvedValue({
        data: {
          ...readyFile,
          owner_id: 'org_from_session_cookie',
        },
        error: null,
      })

      await POST(request(validBody))

      expect(mocks.updateProfile).toHaveBeenCalledWith(
        'org_from_session_cookie',
        expect.objectContaining({ logo_file_id: 'file_new' })
      )
      expect(mocks.updateProfile).not.toHaveBeenCalledWith(
        'org_context',
        expect.anything()
      )
    })

    it('does not attach a completed file owned by another organization', async () => {
      mocks.complete.mockResolvedValue({
        data: { ...readyFile, owner_id: 'org_other' },
        error: null,
      })

      const response = await POST(request(validBody))
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error.code).toBe('storage/invalid-owner')
      expect(mocks.updateProfile).not.toHaveBeenCalled()
    })

    it('does not attach a file with a non-organization owner type', async () => {
      mocks.complete.mockResolvedValue({
        data: {
          ...readyFile,
          owner_type: 'user',
          owner_id: 'user_123',
        },
        error: null,
      })

      const response = await POST(request(validBody))
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error.code).toBe('storage/invalid-owner')
      expect(mocks.updateProfile).not.toHaveBeenCalled()
    })

    it('does not replace the profile for an unexpected non-ready file', async () => {
      mocks.complete.mockResolvedValue({
        data: { ...readyFile, status: 'pending', url: null },
        error: null,
      })

      const response = await POST(request(validBody))
      const body = await response.json()

      expect(response.status).toBe(422)
      expect(body.error.code).toBe('storage/upload-verification-failed')
      expect(mocks.updateProfile).not.toHaveBeenCalled()
    })

    it('does not replace the profile when a ready file has no public URL', async () => {
      mocks.complete.mockResolvedValue({
        data: { ...readyFile, status: 'ready', url: null },
        error: null,
      })

      const response = await POST(request(validBody))
      const body = await response.json()

      expect(response.status).toBe(422)
      expect(body.error.code).toBe('storage/upload-verification-failed')
      expect(mocks.updateProfile).not.toHaveBeenCalled()
    })

    it('does not replace the profile when a ready file has an empty URL', async () => {
      mocks.complete.mockResolvedValue({
        data: { ...readyFile, status: 'ready', url: '' },
        error: null,
      })

      const response = await POST(request(validBody))

      expect(response.status).toBe(422)
      expect(mocks.updateProfile).not.toHaveBeenCalled()
    })

    it('surfaces a platform profile failure without claiming the attach succeeded', async () => {
      mocks.updateProfile.mockResolvedValue({
        data: null,
        error: {
          code: 'organization/not-found',
          message: 'Organization not found.',
        },
      })

      const response = await POST(request(validBody))
      const body = await response.json()

      expect(response.status).toBe(502)
      expect(body).toEqual({
        data: null,
        error: {
          code: 'organization/not-found',
          message: 'Organization not found.',
        },
      })
      expect(mocks.complete).toHaveBeenCalledTimes(1)
      expect(mocks.updateProfile).toHaveBeenCalledTimes(1)
    })
  })
})
