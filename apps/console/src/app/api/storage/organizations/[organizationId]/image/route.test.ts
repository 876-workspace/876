import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  create: vi.fn(),
  complete: vi.fn(),
  retrieve: vi.fn(),
  update: vi.fn(),
  deleteFile: vi.fn(),
}))

vi.mock('@/lib/auth/route-guard', () => ({
  requireConsolePermission: mocks.requirePermission,
}))

vi.mock('@/lib/876', () => ({
  $876: {
    storage: {
      uploads: { create: mocks.create, complete: mocks.complete },
      files: { delete: mocks.deleteFile },
    },
    organizations: { retrieve: mocks.retrieve, update: mocks.update },
  },
}))

import { POST as start } from './route'
import { POST as complete } from './complete/route'
import { DELETE as remove } from './remove/route'

const context = {
  params: Promise.resolve({ organizationId: 'org_123' }),
}

function request(method: string, body?: unknown) {
  return new Request(
    'http://console.test/api/storage/organizations/org_123/image',
    {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers:
        body === undefined ? undefined : { 'content-type': 'application/json' },
    }
  ) as NextRequest
}

const startBody = {
  route_key: 'organization.primaryLogo',
  file_name: 'logo.png',
  content_type: 'image/png',
  size_bytes: 4,
}

const readyFile = {
  id: 'file_new',
  owner_type: 'organization',
  owner_id: 'org_123',
  status: 'ready',
  url: 'https://assets.876.test/logo.png',
}

describe('organization image routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requirePermission.mockResolvedValue({
      caller: { id: 'user_admin' },
      response: null,
    })
  })

  it.each([
    ['start', start, request('POST', startBody)],
    ['complete', complete, request('POST', { id: 'upl_123' })],
    ['remove', remove, request('DELETE')],
  ])(
    'returns 401 before backend access for unauthorized %s',
    async (_name, handler, req) => {
      mocks.requirePermission.mockResolvedValue({
        caller: null,
        response: Response.json({ error: 'Unauthorized.' }, { status: 401 }),
      })

      const response = await handler(req, context)

      expect(response.status).toBe(401)
      expect(mocks.create).not.toHaveBeenCalled()
      expect(mocks.complete).not.toHaveBeenCalled()
      expect(mocks.retrieve).not.toHaveBeenCalled()
    }
  )

  it.each([
    ['start', start, request('POST', startBody)],
    ['complete', complete, request('POST', { id: 'upl_123' })],
    ['remove', remove, request('DELETE')],
  ])(
    'returns 403 before backend access when %s permission is missing',
    async (_name, handler, req) => {
      mocks.requirePermission.mockResolvedValue({
        caller: null,
        response: Response.json({ error: 'Forbidden.' }, { status: 403 }),
      })

      const response = await handler(req, context)

      expect(response.status).toBe(403)
      expect(mocks.create).not.toHaveBeenCalled()
      expect(mocks.complete).not.toHaveBeenCalled()
      expect(mocks.retrieve).not.toHaveBeenCalled()
    }
  )

  it('starts with the organization route and owner', async () => {
    mocks.create.mockResolvedValue({ data: { id: 'upl_123' }, error: null })

    const response = await start(request('POST', startBody), context)

    expect(response.status).toBe(201)
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      'console:organizations'
    )
    expect(mocks.create).toHaveBeenCalledWith({
      ...startBody,
      owner_type: 'organization',
      owner_id: 'org_123',
      actor_user_id: 'user_admin',
      source_app_id: '876-console',
    })
  })

  it('rejects a completed file with the wrong owner without updating', async () => {
    mocks.complete.mockResolvedValue({
      data: { ...readyFile, owner_id: 'org_other' },
      error: null,
    })

    const response = await complete(request('POST', { id: 'upl_123' }), context)

    expect(response.status).toBe(400)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('rejects an unverified file without updating', async () => {
    mocks.complete.mockResolvedValue({
      data: { ...readyFile, status: 'uploaded', url: null },
      error: null,
    })

    const response = await complete(request('POST', { id: 'upl_123' }), context)

    expect(response.status).toBe(400)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('updates both organization image fields after verification', async () => {
    mocks.complete.mockResolvedValue({ data: readyFile, error: null })
    mocks.update.mockResolvedValue({ data: { id: 'org_123' }, error: null })

    const response = await complete(request('POST', { id: 'upl_123' }), context)

    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith('org_123', {
      logo_file_id: 'file_new',
      logo_url: 'https://assets.876.test/logo.png',
    })
  })

  it('clears the organization reference before deleting the Storage file', async () => {
    mocks.retrieve.mockResolvedValue({
      data: { id: 'org_123', logo_file_id: 'file_old' },
      error: null,
    })
    mocks.update.mockResolvedValue({ data: { id: 'org_123' }, error: null })
    mocks.deleteFile.mockResolvedValue({
      data: { object: 'file', id: 'file_old', deleted: true },
      error: null,
    })

    const response = await remove(request('DELETE'), context)

    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith('org_123', {
      logo_file_id: null,
      logo_url: null,
    })
    expect(mocks.update.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.deleteFile.mock.invocationCallOrder[0]
    )
  })
})
