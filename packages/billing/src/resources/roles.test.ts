import { beforeEach, describe, expect, it, vi } from 'vitest'

import { create876Client } from '../client'
import type { Role } from '../types'

const BASE = 'https://billing.example.test'

function createRole(overrides: Partial<Role> = {}): Role {
  return {
    object: 'billing_role',
    id: 'Role_2kL9mN4q',
    slug: 'accounts_payable',
    name: 'Accounts payable',
    description: 'Records supplier bills and payments.',
    permissions: ['billing:access', 'purchases:read', 'purchases:write'],
    isSystem: false,
    isDefault: false,
    memberCount: 3,
    createdAt: 1_788_825_600,
    updatedAt: 1_788_825_700,
    ...overrides,
  }
}

function jsonFetch(body: unknown, init?: ResponseInit) {
  return vi.fn<typeof fetch>().mockResolvedValue(Response.json(body, init))
}

function client(fetchMock: ReturnType<typeof jsonFetch>) {
  return create876Client({ baseUrl: BASE, fetch: fetchMock })
}

describe('roles resource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('requests GET /api/v1/roles and returns the parsed list', async () => {
      const role = createRole()
      const list = {
        object: 'list',
        data: [role],
        has_more: false,
        total_count: 1,
        url: '/api/v1/roles',
      }
      const fetchMock = jsonFetch({ data: list, error: null })

      const result = await client(fetchMock).roles.list()

      expect(result).toEqual({ data: list, error: null })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith(
        `${BASE}/api/v1/roles`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('surfaces a client-safe error without throwing', async () => {
      const error = {
        code: 'auth/forbidden',
        message: 'You do not have permission to read roles.',
      }
      const fetchMock = jsonFetch({ data: null, error }, { status: 403 })

      const result = await client(fetchMock).roles.list()

      expect(result.data).toBeNull()
      expect(result.error).toMatchObject(error)
    })

    it('rejects a list whose item is not a role', async () => {
      const fetchMock = jsonFetch({
        data: {
          object: 'list',
          data: [{ object: 'billing_member', id: 'Member_1' }],
          has_more: false,
          total_count: 1,
          url: '/api/v1/roles',
        },
        error: null,
      })

      const result = await client(fetchMock).roles.list()

      expect(result.data).toBeNull()
      expect(result.error).not.toBeNull()
    })
  })

  describe('create', () => {
    it('posts the role body and returns the acknowledgement', async () => {
      const fetchMock = jsonFetch({
        data: { object: 'billing_role', id: 'Role_1' },
        error: null,
      })
      const params = {
        slug: 'accounts_payable',
        name: 'Accounts payable',
        description: 'Records supplier bills.',
        permissions: ['billing:access', 'purchases:read'],
      }

      const result = await client(fetchMock).roles.create(params)

      expect(result).toEqual({
        data: { object: 'billing_role', id: 'Role_1' },
        error: null,
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0]!
      expect(url).toBe(`${BASE}/api/v1/roles`)
      expect(init).toMatchObject({ method: 'POST' })
      expect(JSON.parse(String((init as RequestInit).body))).toEqual(params)
    })

    it('returns the conflict error when the slug is taken', async () => {
      const fetchMock = jsonFetch(
        {
          data: null,
          error: {
            code: 'billing_role/already-exists',
            message: 'A role with this identifier already exists.',
          },
        },
        { status: 409 }
      )

      const result = await client(fetchMock).roles.create({
        slug: 'staff',
        name: 'Staff',
        permissions: ['billing:access'],
      })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('billing_role/already-exists')
    })
  })

  describe('retrieve', () => {
    it('encodes the role id in the path', async () => {
      const role = createRole({ id: 'Role/with space' })
      const fetchMock = jsonFetch({ data: role, error: null })

      const result = await client(fetchMock).roles.retrieve('Role/with space')

      expect(result).toEqual({ data: role, error: null })
      expect(fetchMock).toHaveBeenCalledWith(
        `${BASE}/api/v1/roles/Role%2Fwith%20space`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('returns the not-found error rather than throwing', async () => {
      const fetchMock = jsonFetch(
        {
          data: null,
          error: { code: 'billing_role/not-found', message: 'Role not found.' },
        },
        { status: 404 }
      )

      const result = await client(fetchMock).roles.retrieve('Role_missing')

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('billing_role/not-found')
    })
  })

  describe('update', () => {
    it('patches only the fields supplied', async () => {
      const fetchMock = jsonFetch({
        data: { object: 'billing_role', id: 'Role_1' },
        error: null,
      })

      await client(fetchMock).roles.update('Role_1', { name: 'Bookkeeper' })

      const [url, init] = fetchMock.mock.calls[0]!
      expect(url).toBe(`${BASE}/api/v1/roles/Role_1`)
      expect(init).toMatchObject({ method: 'PATCH' })
      expect(JSON.parse(String((init as RequestInit).body))).toEqual({
        name: 'Bookkeeper',
      })
    })

    it('sends the complete permission set it is given, unfiltered', async () => {
      const fetchMock = jsonFetch({
        data: { object: 'billing_role', id: 'Role_1' },
        error: null,
      })
      // The caller is responsible for merging out-of-surface grants back in;
      // the transport must not quietly drop a key it does not recognize.
      const permissions = [
        'billing:access',
        'customers:read',
        'subscriptions:write',
      ]

      await client(fetchMock).roles.update('Role_1', { permissions })

      expect(
        JSON.parse(String((fetchMock.mock.calls[0]![1] as RequestInit).body))
      ).toEqual({ permissions })
    })

    it('returns the system-role conflict without throwing', async () => {
      const fetchMock = jsonFetch(
        {
          data: null,
          error: {
            code: 'billing_role/system-role',
            message: 'System roles cannot be modified.',
          },
        },
        { status: 409 }
      )

      const result = await client(fetchMock).roles.update('Role_staff', {
        name: 'Staff renamed',
      })

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('billing_role/system-role')
    })
  })

  describe('delete', () => {
    it('requests DELETE and returns the tombstone', async () => {
      const fetchMock = jsonFetch({
        data: { object: 'billing_role', id: 'Role_1', deleted: true },
        error: null,
      })

      const result = await client(fetchMock).roles.delete('Role_1')

      expect(result).toEqual({
        data: { object: 'billing_role', id: 'Role_1', deleted: true },
        error: null,
      })
      expect(fetchMock).toHaveBeenCalledWith(
        `${BASE}/api/v1/roles/Role_1`,
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('returns the in-use conflict when the role still has members', async () => {
      const fetchMock = jsonFetch(
        {
          data: null,
          error: {
            code: 'billing_role/in-use',
            message: 'Reassign every member from this role before deleting it.',
          },
        },
        { status: 409 }
      )

      const result = await client(fetchMock).roles.delete('Role_1')

      expect(result.data).toBeNull()
      expect(result.error?.code).toBe('billing_role/in-use')
    })
  })

  it('makes no request until a method is called', () => {
    const fetchMock = jsonFetch({ data: null, error: null })
    client(fetchMock)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
