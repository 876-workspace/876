import { describe, expect, it, vi } from 'vitest'

import { create876Client } from './index.ts'

const appPayload = {
  object: 'app',
  id: 'app_2Yt0kQ',
  name: 'Acme dashboard',
  slug: 'acme-dashboard',
  feature_prefix: 'acme_dashboard',
  organization_id: 'org_4XmK9wQr',
  client_id: 'client_abc123',
  client_type: 'public',
  app_kind: 'external',
  status: 'active',
  allowed_redirect_uris: ['https://acme.example/callback'],
  allowed_logout_uris: [],
  logo_url: null,
  homepage_url: 'https://acme.example',
  type: 'oauth',
  scopes_allowed: ['openid', 'profile'],
  created_at: 1717200000,
  updated_at: 1717200000,
} as const

const grantPayload = {
  id: 'grant_9Vb2',
  appId: 'app_2Yt0kQ',
  name: 'Acme dashboard',
  clientId: 'client_abc123',
  logoUrl: null,
  homepageUrl: 'https://acme.example',
  scopes: ['openid', 'profile'],
  createdAt: 1717200000,
  updatedAt: 1717200000,
} as const

const profilePayload = {
  object: 'consumer_profile',
  id: 'upr_123',
  user_id: 'user_123',
  email: 'jane@example.com',
  username: 'jane',
  first_name: 'Jane',
  last_name: 'Doe',
  middle_name: null,
  nickname: 'J',
  avatar: null,
  gender: 'female',
  phone_number: '+15555550100',
  date_of_birth: '1990-01-01',
  language: 'en',
  timezone: 'America/New_York',
  created_at: 1717200000,
  updated_at: 1717200001,
} as const

const addressPayload = {
  object: 'address',
  id: 'adr_123',
  user_id: 'user_123',
  organization_id: null,
  type: 'home',
  label: 'Home',
  line1: '1 Main St',
  line2: null,
  city: 'Kingston',
  region_id: null,
  country_code: 'JM',
  postal_code: null,
  is_default: false,
  created_at: 1717200000,
  updated_at: 1717200001,
} as const

const contactPayload = {
  object: 'user_contact',
  id: 'cnt_123',
  owner_user_id: 'user_123',
  contact_user_id: 'user_456',
  contact_user: {
    object: 'user',
    id: 'user_456',
    email: 'alex@example.com',
    username: 'alex',
    first_name: 'Alex',
    last_name: 'Stone',
    middle_name: null,
    avatar: null,
  },
  nickname: 'Alex',
  notes: null,
  created_at: 1717200000,
  updated_at: 1717200001,
} as const

function jsonFetch(payload: unknown) {
  return vi.fn().mockResolvedValue({ json: () => Promise.resolve(payload) })
}

describe('$876.apps', () => {
  it('lists apps with organization and pagination query params', async () => {
    const listPayload = {
      object: 'list',
      data: [appPayload],
      has_more: false,
      url: '/apps',
      total_count: 1,
    }
    const fetchMock = jsonFetch({ data: listPayload, error: null })
    const $876 = create876Client({ baseUrl: '/api', fetch: fetchMock })

    const result = await $876.apps.list({
      organizationId: 'org_4XmK9wQr',
      limit: 25,
      status: 'active',
    })

    expect(result).toEqual({ data: listPayload, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/apps?organizationId=org_4XmK9wQr&limit=25&status=active',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('omits the query string when no list params are given', async () => {
    const fetchMock = jsonFetch({
      data: {
        object: 'list',
        data: [],
        has_more: false,
        url: '/apps',
        total_count: 0,
      },
      error: null,
    })
    const $876 = create876Client({ baseUrl: '/api', fetch: fetchMock })

    await $876.apps.list()

    expect(fetchMock).toHaveBeenCalledWith('/api/apps', expect.any(Object))
  })

  it('creates an app and returns the one-time client secret', async () => {
    const created = {
      ...appPayload,
      client_type: 'confidential',
      clientSecret: 'secret_value',
    }
    const fetchMock = jsonFetch({ data: created, error: null })
    const $876 = create876Client({ baseUrl: '/api', fetch: fetchMock })

    const result = await $876.apps.create({
      name: 'Acme dashboard',
      clientType: 'confidential',
      organizationId: 'org_4XmK9wQr',
      redirectUris: ['https://acme.example/callback'],
    })

    expect(result.data?.clientSecret).toBe('secret_value')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/apps',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('rejects invalid create params without sending a request', async () => {
    const fetchMock = vi.fn()
    const $876 = create876Client({ baseUrl: '/api', fetch: fetchMock })

    const result = await $876.apps.create({
      name: '',
      clientType: 'public',
    })

    expect(result.error?.code).toBe('auth/invalid-input')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('$876.oauthGrants', () => {
  it('lists a user connected apps', async () => {
    const fetchMock = jsonFetch({ data: [grantPayload], error: null })
    const $876 = create876Client({ baseUrl: '/api', fetch: fetchMock })

    const result = await $876.oauthGrants.list('usr_4XmK9wQr')

    expect(result).toEqual({ data: [grantPayload], error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/users/usr_4XmK9wQr/oauth-grants',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('revokes a grant via POST', async () => {
    const fetchMock = jsonFetch({ data: { revoked: true }, error: null })
    const $876 = create876Client({ baseUrl: '/api', fetch: fetchMock })

    const result = await $876.oauthGrants.revoke('usr_4XmK9wQr', 'grant_9Vb2')

    expect(result).toEqual({ data: { revoked: true }, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/users/usr_4XmK9wQr/oauth-grants/grant_9Vb2/revoke',
      expect.objectContaining({ method: 'POST' })
    )
  })
})

describe('$876.users', () => {
  it('retrieves and updates the current consumer profile', async () => {
    const fetchMock = jsonFetch({ data: profilePayload, error: null })
    const $876 = create876Client({ baseUrl: '/api', fetch: fetchMock })

    const retrieveResult = await $876.users.profile.retrieve()
    const updateResult = await $876.users.profile.update({ nickname: 'J' })

    expect(retrieveResult.data?.object).toBe('consumer_profile')
    expect(updateResult.data?.nickname).toBe('J')
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/users/me/profile',
      expect.objectContaining({ method: 'GET' })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/users/me/profile',
      expect.objectContaining({ method: 'PATCH' })
    )
  })

  it('creates, lists, updates, and deletes current user addresses', async () => {
    const listPayload = {
      object: 'list',
      data: [addressPayload],
      has_more: false,
      url: '/users/me/addresses',
      total_count: null,
    }
    const fetchMock = jsonFetch({ data: addressPayload, error: null })
    fetchMock.mockResolvedValueOnce({
      json: () => Promise.resolve({ data: listPayload, error: null }),
    })
    fetchMock.mockResolvedValueOnce({
      json: () => Promise.resolve({ data: addressPayload, error: null }),
    })
    fetchMock.mockResolvedValueOnce({
      json: () => Promise.resolve({ data: addressPayload, error: null }),
    })
    fetchMock.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          data: { object: 'address', id: 'adr_123', deleted: true },
          error: null,
        }),
    })
    const $876 = create876Client({ baseUrl: '/api', fetch: fetchMock })

    await $876.users.addresses.list()
    await $876.users.addresses.create({ type: 'home', line1: '1 Main St' })
    await $876.users.addresses.update('adr_123', { label: 'Home' })
    const deleted = await $876.users.addresses.del('adr_123')

    expect(deleted.data?.deleted).toBe(true)
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/users/me/addresses',
      expect.objectContaining({ method: 'GET' })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/users/me/addresses',
      expect.objectContaining({ method: 'POST' })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/users/me/addresses/adr_123',
      expect.objectContaining({ method: 'PATCH' })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      '/api/users/me/addresses/adr_123',
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('creates, lists, updates, and deletes current user contacts', async () => {
    const listPayload = {
      object: 'list',
      data: [contactPayload],
      has_more: false,
      url: '/users/me/contacts',
      total_count: null,
    }
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce({
      json: () => Promise.resolve({ data: listPayload, error: null }),
    })
    fetchMock.mockResolvedValueOnce({
      json: () => Promise.resolve({ data: contactPayload, error: null }),
    })
    fetchMock.mockResolvedValueOnce({
      json: () => Promise.resolve({ data: contactPayload, error: null }),
    })
    fetchMock.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          data: { object: 'user_contact', id: 'cnt_123', deleted: true },
          error: null,
        }),
    })
    const $876 = create876Client({ baseUrl: '/api', fetch: fetchMock })

    await $876.users.contacts.list()
    await $876.users.contacts.create({ contactUserId: 'user_456' })
    await $876.users.contacts.update('cnt_123', { nickname: 'Alex' })
    const deleted = await $876.users.contacts.del('cnt_123')

    expect(deleted.data?.deleted).toBe(true)
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/users/me/contacts',
      expect.objectContaining({ method: 'GET' })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/users/me/contacts',
      expect.objectContaining({ method: 'POST' })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/users/me/contacts/cnt_123',
      expect.objectContaining({ method: 'PATCH' })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      '/api/users/me/contacts/cnt_123',
      expect.objectContaining({ method: 'DELETE' })
    )
  })
})
