import { describe, expect, it, vi } from 'vitest'

import { create876AdminClient } from '../client'

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

describe('admin users resource', () => {
  it('sends and returns the canonical user avatar file reference', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        object: 'user',
        id: 'user_test',
        avatarFileId: null,
      })
    )
    const $876 = create876AdminClient({
      baseUrl: 'https://api.test',
      internalKey: 'test-internal-key',
      fetch: fetchMock,
    })

    const result = await $876.users.update('user_test', {
      avatarFileId: null,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/users/user_test',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ avatarFileId: null }),
      })
    )
    expect(result.data?.avatar_file_id).toBeNull()
  })

  it('routes user feature mutations through the feature grant API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        object: 'user_feature',
        id: 'uf_test',
        userId: 'user_test',
        featureId: 'feat_test',
        slug: 'test-feature',
        status: 'disabled',
        note: null,
        syncedAt: 1700000000,
        createdAt: 1700000000,
        updatedAt: 1700000000,
      })
    )
    const $876 = create876AdminClient({
      baseUrl: 'https://api.test',
      internalKey: 'test-internal-key',
      fetch: fetchMock,
    })

    await $876.users.updateFeature('user_test', 'feat_test', {
      enabled: false,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/features/users/user_test/features/feat_test',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ enabled: false }),
      })
    )
  })

  describe('identifications', () => {
    it('lists a user identifications with masked values', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'list',
          data: [
            {
              object: 'user_identification',
              id: 'uident_test',
              userId: 'user_test',
              type: 'trn',
              label: 'Taxpayer Registration Number',
              countryCode: 'JM',
              valueMasked: '••••••789',
              verified: false,
              verifiedAt: null,
              createdAt: 1700000000,
              updatedAt: 1700000000,
            },
          ],
          hasMore: false,
          url: '/users/user_test/identifications',
          totalCount: 1,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      const result = await $876.identifications.list('user_test')

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/users/user_test/identifications',
        expect.objectContaining({ method: 'GET' })
      )
      expect(result.data?.data[0]?.value_masked).toBe('••••••789')
    })

    it('creates an identification with the type, value, and country code', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'user_identification',
          id: 'uident_new',
          userId: 'user_test',
          type: 'trn',
          label: 'Taxpayer Registration Number',
          countryCode: 'JM',
          valueMasked: '••••••789',
          verified: false,
          verifiedAt: null,
          createdAt: 1700000000,
          updatedAt: 1700000000,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.identifications.create('user_test', {
        type: 'trn',
        value: '123-456-789',
      })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/users/user_test/identifications',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ type: 'trn', value: '123-456-789' }),
        })
      )
    })

    it('updates an identification value by type', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'user_identification',
          id: 'uident_test',
          userId: 'user_test',
          type: 'trn',
          label: 'Taxpayer Registration Number',
          countryCode: 'JM',
          valueMasked: '••••••321',
          verified: false,
          verifiedAt: null,
          createdAt: 1700000000,
          updatedAt: 1700000001,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.identifications.update('user_test', 'trn', {
        value: '987654321',
      })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/users/user_test/identifications/trn',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ value: '987654321' }),
        })
      )
    })

    it('deletes an identification by type and returns a tombstone', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'user_identification',
          id: 'uident_test',
          deleted: true,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      const result = await $876.identifications.delete('user_test', 'trn')

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/users/user_test/identifications/trn',
        expect.objectContaining({ method: 'DELETE' })
      )
      expect(result.data?.deleted).toBe(true)
    })

    it('discloses the full value with the org/app entitlement params', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'user_identification_disclosure',
          type: 'trn',
          value: '123456789',
          countryCode: 'JM',
          verified: true,
          disclosedAt: 1700000002,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      const result = await $876.identifications.disclose('user_test', 'trn', {
        organizationId: 'org_test',
        appSlug: '876-couriers',
        reason: 'JCA customs clearance',
      })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/users/user_test/identifications/trn/disclose',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            organizationId: 'org_test',
            appSlug: '876-couriers',
            reason: 'JCA customs clearance',
          }),
        })
      )
      expect(result.data?.value).toBe('123456789')
    })

    it('verifies an identification with the verifying actor id', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          object: 'user_identification',
          id: 'uident_test',
          userId: 'user_test',
          type: 'trn',
          label: 'Taxpayer Registration Number',
          countryCode: 'JM',
          valueMasked: '••••••789',
          verified: true,
          verifiedAt: 1700000003,
          createdAt: 1700000000,
          updatedAt: 1700000003,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.identifications.verify('user_test', 'trn', {
        verifiedBy: 'admin_42',
      })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/users/user_test/identifications/trn/verify',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ verifiedBy: 'admin_42' }),
        })
      )
    })
  })
})
