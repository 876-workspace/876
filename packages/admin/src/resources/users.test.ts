import { describe, expect, it, vi } from 'vitest'

import { create876AdminClient } from '../client'

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

describe('admin users resource', () => {
  it('routes user feature mutations through the feature grant API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        object: 'user_feature',
        id: 'uf_test',
        user_id: 'user_test',
        feature_id: 'feat_test',
        slug: 'test-feature',
        status: 'disabled',
        note: null,
        synced_at: 1700000000,
        created_at: 1700000000,
        updated_at: 1700000000,
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
              user_id: 'user_test',
              type: 'trn',
              label: 'Taxpayer Registration Number',
              country_code: 'JM',
              value_masked: '••••••789',
              verified: false,
              verified_at: null,
              created_at: 1700000000,
              updated_at: 1700000000,
            },
          ],
          has_more: false,
          url: '/users/user_test/identifications',
          total_count: 1,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      const result = await $876.users.identifications.list('user_test')

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
          user_id: 'user_test',
          type: 'trn',
          label: 'Taxpayer Registration Number',
          country_code: 'JM',
          value_masked: '••••••789',
          verified: false,
          verified_at: null,
          created_at: 1700000000,
          updated_at: 1700000000,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.users.identifications.create('user_test', {
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
          user_id: 'user_test',
          type: 'trn',
          label: 'Taxpayer Registration Number',
          country_code: 'JM',
          value_masked: '••••••321',
          verified: false,
          verified_at: null,
          created_at: 1700000000,
          updated_at: 1700000001,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.users.identifications.update('user_test', 'trn', {
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

      const result = await $876.users.identifications.delete('user_test', 'trn')

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
          country_code: 'JM',
          verified: true,
          disclosed_at: 1700000002,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      const result = await $876.users.identifications.disclose(
        'user_test',
        'trn',
        {
          organizationId: 'org_test',
          appSlug: '876-couriers',
          reason: 'JCA customs clearance',
        }
      )

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/users/user_test/identifications/trn/disclose',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            organization_id: 'org_test',
            app_slug: '876-couriers',
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
          user_id: 'user_test',
          type: 'trn',
          label: 'Taxpayer Registration Number',
          country_code: 'JM',
          value_masked: '••••••789',
          verified: true,
          verified_at: 1700000003,
          created_at: 1700000000,
          updated_at: 1700000003,
        })
      )
      const $876 = create876AdminClient({
        baseUrl: 'https://api.test',
        internalKey: 'test-internal-key',
        fetch: fetchMock,
      })

      await $876.users.identifications.verify('user_test', 'trn', {
        verifiedBy: 'admin_42',
      })

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.test/users/user_test/identifications/trn/verify',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ verified_by: 'admin_42' }),
        })
      )
    })
  })
})
