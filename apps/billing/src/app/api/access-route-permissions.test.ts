import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  context: null as { orgId: string; permissions: string[] } | null,
  getPlatformClient: vi.fn(),
  proxy: vi.fn(),
}))

vi.mock('@/lib/auth/billing-context', () => ({
  getContext: () => mocks.context,
}))

vi.mock('@/lib/api/resource-proxy', () => ({
  proxyBillingResourceRequest: mocks.proxy,
}))

vi.mock('@/lib/services/platform', () => ({
  getPlatformClient: mocks.getPlatformClient,
}))

import * as membersRoute from './members/[[...path]]/route'
import * as rolesRoute from './roles/[[...path]]/route'
import * as salesOrdersRoute from './sales-orders/[[...path]]/route'
import { POST as invite } from './team/invites/route'
import { DELETE as revoke } from './team/invites/[inviteId]/route'

const routeContext = { params: Promise.resolve({ path: ['role_1'] }) }
const inviteContext = { params: Promise.resolve({ inviteId: 'invite_1' }) }

function request(method: string) {
  return new Request('http://billing.test/api/resource', { method })
}

async function expectForbidden(response: Response) {
  expect(response.status).toBe(403)
  await expect(response.json()).resolves.toMatchObject({
    data: null,
    error: { code: 'auth/forbidden' },
  })
  expect(mocks.proxy).not.toHaveBeenCalled()
  expect(mocks.getPlatformClient).not.toHaveBeenCalled()
}

describe('Billing mutating route authorization', () => {
  beforeEach(() => {
    mocks.context = { orgId: 'org_1', permissions: [] }
    mocks.proxy.mockResolvedValue(new Response('proxied'))
    mocks.getPlatformClient.mockResolvedValue({
      invites: {
        create: vi.fn(),
        revoke: vi.fn(),
      },
    })
  })

  it('denies a role create without roles write before the billing client', async () => {
    await expectForbidden(await rolesRoute.POST(request('POST'), routeContext))
  })

  it('denies a role replacement without roles write before the billing client', async () => {
    await expectForbidden(await rolesRoute.PUT(request('PUT'), routeContext))
  })

  it('denies a role update without roles write before the billing client', async () => {
    await expectForbidden(
      await rolesRoute.PATCH(request('PATCH'), routeContext)
    )
  })

  it('denies a role deletion without roles write before the billing client', async () => {
    await expectForbidden(
      await rolesRoute.DELETE(request('DELETE'), routeContext)
    )
  })

  it('denies a member create without members write before the billing client', async () => {
    await expectForbidden(
      await membersRoute.POST(request('POST'), routeContext)
    )
  })

  it('denies a member replacement without members write before the billing client', async () => {
    await expectForbidden(await membersRoute.PUT(request('PUT'), routeContext))
  })

  it('denies a member update without members write before the billing client', async () => {
    await expectForbidden(
      await membersRoute.PATCH(request('PATCH'), routeContext)
    )
  })

  it('denies a member deletion without members write before the billing client', async () => {
    await expectForbidden(
      await membersRoute.DELETE(request('DELETE'), routeContext)
    )
  })

  it('denies an invite without members write before the platform client', async () => {
    await expectForbidden(
      await invite(
        new Request('http://billing.test/api/team/invites', {
          method: 'POST',
          body: JSON.stringify({ email: 'ada@example.com' }),
        })
      )
    )
  })

  it('denies a Sales Order create without sales-orders write', async () => {
    await expectForbidden(
      await salesOrdersRoute.POST(request('POST'), routeContext)
    )
  })

  it('denies a Sales Order update without sales-orders write', async () => {
    await expectForbidden(
      await salesOrdersRoute.PATCH(request('PATCH'), routeContext)
    )
  })

  it('proxies a permitted Sales Order create exactly once', async () => {
    mocks.context = { orgId: 'org_1', permissions: ['sales-orders:write'] }
    const input = request('POST')
    await salesOrdersRoute.POST(input, routeContext)
    expect(mocks.proxy).toHaveBeenCalledTimes(1)
    expect(mocks.proxy).toHaveBeenCalledWith(input, 'sales-orders', ['role_1'])
  })

  it('proxies a permitted Sales Order lifecycle command exactly once', async () => {
    mocks.context = { orgId: 'org_1', permissions: ['sales-orders:write'] }
    const input = request('POST')
    const lifecycleContext = {
      params: Promise.resolve({ path: ['so_1', 'confirm'] }),
    }
    await salesOrdersRoute.POST(input, lifecycleContext)
    expect(mocks.proxy).toHaveBeenCalledTimes(1)
    expect(mocks.proxy).toHaveBeenCalledWith(input, 'sales-orders', [
      'so_1',
      'confirm',
    ])
  })

  it('denies invite revocation without members write before the platform client', async () => {
    await expectForbidden(await revoke(request('DELETE'), inviteContext))
  })

  it('proxies a permitted role create exactly once', async () => {
    mocks.context = { orgId: 'org_1', permissions: ['roles:write'] }
    const input = request('POST')

    await rolesRoute.POST(input, routeContext)

    expect(mocks.proxy).toHaveBeenCalledTimes(1)
    expect(mocks.proxy).toHaveBeenCalledWith(input, 'roles', ['role_1'])
  })

  it('proxies a permitted role replacement exactly once', async () => {
    mocks.context = { orgId: 'org_1', permissions: ['roles:write'] }
    const input = request('PUT')

    await rolesRoute.PUT(input, routeContext)

    expect(mocks.proxy).toHaveBeenCalledTimes(1)
    expect(mocks.proxy).toHaveBeenCalledWith(input, 'roles', ['role_1'])
  })

  it('proxies a permitted role update exactly once', async () => {
    mocks.context = { orgId: 'org_1', permissions: ['roles:write'] }
    const input = request('PATCH')

    await rolesRoute.PATCH(input, routeContext)

    expect(mocks.proxy).toHaveBeenCalledTimes(1)
    expect(mocks.proxy).toHaveBeenCalledWith(input, 'roles', ['role_1'])
  })

  it('proxies a permitted role deletion exactly once', async () => {
    mocks.context = { orgId: 'org_1', permissions: ['roles:write'] }
    const input = request('DELETE')

    await rolesRoute.DELETE(input, routeContext)

    expect(mocks.proxy).toHaveBeenCalledTimes(1)
    expect(mocks.proxy).toHaveBeenCalledWith(input, 'roles', ['role_1'])
  })

  it('proxies a permitted member create exactly once', async () => {
    mocks.context = { orgId: 'org_1', permissions: ['members:write'] }
    const input = request('POST')

    await membersRoute.POST(input, routeContext)

    expect(mocks.proxy).toHaveBeenCalledTimes(1)
    expect(mocks.proxy).toHaveBeenCalledWith(input, 'members', ['role_1'])
  })

  it('proxies a permitted member replacement exactly once', async () => {
    mocks.context = { orgId: 'org_1', permissions: ['members:write'] }
    const input = request('PUT')

    await membersRoute.PUT(input, routeContext)

    expect(mocks.proxy).toHaveBeenCalledTimes(1)
    expect(mocks.proxy).toHaveBeenCalledWith(input, 'members', ['role_1'])
  })

  it('proxies a permitted member update exactly once', async () => {
    mocks.context = { orgId: 'org_1', permissions: ['members:write'] }
    const input = request('PATCH')

    await membersRoute.PATCH(input, routeContext)

    expect(mocks.proxy).toHaveBeenCalledTimes(1)
    expect(mocks.proxy).toHaveBeenCalledWith(input, 'members', ['role_1'])
  })

  it('proxies a permitted member deletion exactly once', async () => {
    mocks.context = { orgId: 'org_1', permissions: ['members:write'] }
    const input = request('DELETE')

    await membersRoute.DELETE(input, routeContext)

    expect(mocks.proxy).toHaveBeenCalledTimes(1)
    expect(mocks.proxy).toHaveBeenCalledWith(input, 'members', ['role_1'])
  })

  it('creates an invite with the exact organization and payload', async () => {
    mocks.context = { orgId: 'org_1', permissions: ['members:write'] }
    const create = vi.fn().mockResolvedValue({
      data: { id: 'invite_1' },
      error: null,
    })
    mocks.getPlatformClient.mockResolvedValue({ invites: { create } })

    const response = await invite(
      new Request('http://billing.test/api/team/invites', {
        method: 'POST',
        body: JSON.stringify({ email: 'ada@example.com', role: 'accountant' }),
      })
    )

    expect(create).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledWith('org_1', {
      email: 'ada@example.com',
      role: 'accountant',
    })
    await expect(response.json()).resolves.toMatchObject({
      data: { id: 'invite_1' },
      error: null,
    })
  })

  it('returns the invite service error without a success payload', async () => {
    mocks.context = { orgId: 'org_1', permissions: ['members:write'] }
    const create = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'invite/duplicate', message: 'Already invited.' },
    })
    mocks.getPlatformClient.mockResolvedValue({ invites: { create } })

    const response = await invite(
      new Request('http://billing.test/api/team/invites', {
        method: 'POST',
        body: JSON.stringify({ email: 'ada@example.com' }),
      })
    )

    expect(create).toHaveBeenCalledTimes(1)
    await expect(response.json()).resolves.toMatchObject({
      data: null,
      error: { code: 'error/bad-request' },
    })
  })

  it('revokes an invite with the exact organization and invitation id', async () => {
    mocks.context = { orgId: 'org_1', permissions: ['members:write'] }
    const revokeInvite = vi.fn().mockResolvedValue({
      data: { id: 'invite_1' },
      error: null,
    })
    mocks.getPlatformClient.mockResolvedValue({
      invites: { revoke: revokeInvite },
    })

    const response = await revoke(request('DELETE'), inviteContext)

    expect(revokeInvite).toHaveBeenCalledTimes(1)
    expect(revokeInvite).toHaveBeenCalledWith('org_1', 'invite_1')
    await expect(response.json()).resolves.toMatchObject({
      data: { id: 'invite_1' },
      error: null,
    })
  })

  it('returns the revoke service error without a success payload', async () => {
    mocks.context = { orgId: 'org_1', permissions: ['members:write'] }
    const revokeInvite = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'invite/not-found', message: 'Missing.' },
    })
    mocks.getPlatformClient.mockResolvedValue({
      invites: { revoke: revokeInvite },
    })

    const response = await revoke(request('DELETE'), inviteContext)

    expect(revokeInvite).toHaveBeenCalledTimes(1)
    await expect(response.json()).resolves.toMatchObject({
      data: null,
      error: { code: 'error/bad-request' },
    })
  })
})
