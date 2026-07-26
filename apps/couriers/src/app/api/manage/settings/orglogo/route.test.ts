import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  getFeatures: vi.fn(),
  getManageContext: vi.fn(),
}))

vi.mock('@/lib/storage', () => ({
  $storage: { uploads: { create: mocks.create } },
}))
vi.mock('@/lib/features', () => ({
  getFeatures: mocks.getFeatures,
}))
vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))

import { POST } from './route'

function request(body: string | Record<string, unknown>) {
  return new Request('http://couriers.test/api/manage/settings/orglogo', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as never
}

function context(role: 'owner' | 'admin' | 'member' | 'billing') {
  return {
    userId: 'user_123',
    orgId: 'org_context',
    orgSlug: 'island-logistics',
    role,
  }
}

const validBody = {
  orgSlug: 'island-logistics',
  file_name: 'logo.png',
  content_type: 'image/png',
  size_bytes: 1024,
}

const session = {
  object: 'upload_session',
  id: 'upl_123',
  file_id: 'file_123',
  upload_url: 'https://r2.example.test/signed',
  method: 'PUT',
  headers: {
    'Content-Type': 'image/png',
    'Content-Length': '1024',
  },
  expires_at: 2_000_000_000,
}

describe('Couriers organization logo upload start route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getManageContext.mockResolvedValue(context('admin'))
    mocks.getFeatures.mockResolvedValue({ storageOrgLogoUpload: true })
    mocks.create.mockResolvedValue({
      data: session,
      error: null,
    })
  })

  describe('authorization', () => {
    it('returns 401 when there is no manage context', async () => {
      mocks.getManageContext.mockResolvedValue(null)

      const response = await POST(request(validBody))
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body).toEqual({
        data: null,
        error: {
          code: 'auth/no-session',
          message: 'Unauthorized.',
        },
      })
      expect(mocks.getFeatures).not.toHaveBeenCalled()
      expect(mocks.create).not.toHaveBeenCalled()
    })

    it('refuses an unauthorized member', async () => {
      mocks.getManageContext.mockResolvedValue(context('member'))

      const response = await POST(request(validBody))
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.error.code).toBe('auth/forbidden')
      expect(mocks.getFeatures).not.toHaveBeenCalled()
      expect(mocks.create).not.toHaveBeenCalled()
    })

    it.each(['owner', 'admin'] as const)(
      'allows a %s to open a signed upload session',
      async (role) => {
        mocks.getManageContext.mockResolvedValue(context(role))

        const response = await POST(request(validBody))
        const body = await response.json()

        expect(response.status).toBe(201)
        expect(body.data).toEqual(session)
        expect(body.error).toBeNull()
        expect(mocks.create).toHaveBeenCalledTimes(1)
      }
    )

    it('disables new sessions when the feature flag is off', async () => {
      mocks.getFeatures.mockResolvedValue({ storageOrgLogoUpload: false })

      const response = await POST(request(validBody))
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body).toEqual({
        data: null,
        error: {
          code: 'storage/forbidden',
          message: 'Organization logo uploads are not enabled.',
        },
      })
      expect(mocks.create).not.toHaveBeenCalled()
    })

    it('evaluates the feature flag for the authenticated org actor only', async () => {
      await POST(request(validBody))

      expect(mocks.getFeatures).toHaveBeenCalledTimes(1)
      expect(mocks.getFeatures).toHaveBeenCalledWith({
        userId: 'user_123',
        organizationId: 'org_context',
      })
    })
  })

  describe('request validation', () => {
    it('rejects malformed JSON', async () => {
      const response = await POST(request('{not-json'))
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error.code).toBe('storage/invalid-request')
      expect(mocks.getManageContext).not.toHaveBeenCalled()
      expect(mocks.create).not.toHaveBeenCalled()
    })

    it.each([
      [
        'missing orgSlug',
        { file_name: 'logo.png', content_type: 'image/png', size_bytes: 1 },
      ],
      ['empty orgSlug', { ...validBody, orgSlug: '' }],
      [
        'missing file_name',
        {
          orgSlug: 'island-logistics',
          content_type: 'image/png',
          size_bytes: 1,
        },
      ],
      ['empty file_name', { ...validBody, file_name: '' }],
      [
        'missing content_type',
        { orgSlug: 'island-logistics', file_name: 'logo.png', size_bytes: 1 },
      ],
      ['empty content_type', { ...validBody, content_type: '' }],
      [
        'missing size_bytes',
        {
          orgSlug: 'island-logistics',
          file_name: 'logo.png',
          content_type: 'image/png',
        },
      ],
      ['zero size_bytes', { ...validBody, size_bytes: 0 }],
      ['negative size_bytes', { ...validBody, size_bytes: -1 }],
      ['fractional size_bytes', { ...validBody, size_bytes: 1.5 }],
      ['string size_bytes', { ...validBody, size_bytes: '1024' }],
    ] as const)('rejects %s', async (_label, payload) => {
      const response = await POST(request(payload as Record<string, unknown>))
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error.code).toBe('storage/invalid-request')
      expect(mocks.getManageContext).not.toHaveBeenCalled()
      expect(mocks.create).not.toHaveBeenCalled()
    })

    it('rejects a client-supplied organization id', async () => {
      const response = await POST(
        request({ ...validBody, organizationId: 'org_attacker' })
      )

      expect(response.status).toBe(400)
      expect(mocks.getManageContext).not.toHaveBeenCalled()
      expect(mocks.create).not.toHaveBeenCalled()
    })

    it.each([
      'owner_id',
      'owner_type',
      'route_key',
      'actor_user_id',
      'source_app_id',
      'category',
      'audience',
      'purpose',
      'bucket',
      'object_key',
    ] as const)(
      'rejects client-supplied privileged field %s via strict schema',
      async (field) => {
        const response = await POST(
          request({ ...validBody, [field]: 'attacker-value' })
        )

        expect(response.status).toBe(400)
        expect(mocks.getManageContext).not.toHaveBeenCalled()
        expect(mocks.create).not.toHaveBeenCalled()
      }
    )
  })

  describe('storage session creation', () => {
    it('takes the owner and actor ids from context, never the request body', async () => {
      const response = await POST(request(validBody))

      expect(response.status).toBe(201)
      expect(mocks.getManageContext).toHaveBeenCalledWith('island-logistics')
      expect(mocks.create).toHaveBeenCalledTimes(1)
      expect(mocks.create).toHaveBeenCalledWith({
        route_key: 'organization.primaryLogo',
        owner_type: 'organization',
        owner_id: 'org_context',
        actor_user_id: 'user_123',
        source_app_id: '876-couriers',
        file_name: 'logo.png',
        content_type: 'image/png',
        size_bytes: 1024,
      })
    })

    it('returns the signed session envelope on success', async () => {
      const response = await POST(request(validBody))
      const body = await response.json()

      expect(response.status).toBe(201)
      expect(body).toEqual({ data: session, error: null })
    })

    it('forwards jpeg and webp content types to Storage unchanged', async () => {
      for (const content_type of ['image/jpeg', 'image/webp'] as const) {
        mocks.create.mockClear()
        mocks.create.mockResolvedValue({ data: session, error: null })

        const response = await POST(
          request({
            ...validBody,
            file_name: content_type === 'image/jpeg' ? 'logo.jpg' : 'logo.webp',
            content_type,
          })
        )

        expect(response.status).toBe(201)
        expect(mocks.create).toHaveBeenCalledWith(
          expect.objectContaining({ content_type })
        )
      }
    })

    it('returns the Storage bad-MIME rejection', async () => {
      mocks.create.mockResolvedValue({
        data: null,
        error: {
          code: 'storage/mime-not-allowed',
          message: 'This file type is not allowed for this upload.',
        },
      })

      const response = await POST(
        request({
          ...validBody,
          file_name: 'logo.svg',
          content_type: 'image/svg+xml',
        })
      )
      const body = await response.json()

      expect(response.status).toBe(415)
      expect(body).toEqual({
        data: null,
        error: {
          code: 'storage/mime-not-allowed',
          message: 'This file type is not allowed for this upload.',
        },
      })
    })

    it('returns the Storage oversize rejection', async () => {
      mocks.create.mockResolvedValue({
        data: null,
        error: {
          code: 'storage/file-too-large',
          message: 'The file is larger than the allowed size.',
        },
      })

      const response = await POST(
        request({ ...validBody, size_bytes: 5 * 1024 * 1024 + 1 })
      )
      const body = await response.json()

      expect(response.status).toBe(413)
      expect(body.error.code).toBe('storage/file-too-large')
    })

    it.each([
      ['storage/route-not-found', 404],
      ['storage/not-configured', 503],
      ['storage/provider-error', 502],
      ['storage/invalid-owner', 400],
    ] as const)('maps Storage error %s to HTTP %s', async (code, status) => {
      mocks.create.mockResolvedValue({
        data: null,
        error: { code, message: 'Storage rejected the request.' },
      })

      const response = await POST(request(validBody))
      const body = await response.json()

      expect(response.status).toBe(status)
      expect(body.error.code).toBe(code)
      expect(body.data).toBeNull()
    })
  })
})
