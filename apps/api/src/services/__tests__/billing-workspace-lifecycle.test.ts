import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}))

vi.mock('@/config', () => ({ getSettings: mocks.getSettings }))
vi.mock('@/platform/logger', () => ({
  getLogger: () => ({ error: mocks.error, info: mocks.info }),
}))

import { applyBillingWorkspaceLifecycle } from '../billing-workspace-lifecycle'

const fetchMock = vi.fn()

function settings(overrides: { url?: string; internalKey?: string } = {}) {
  return {
    billing: {
      url: overrides.url ?? 'https://billing.876.test/',
      internalKey: overrides.internalKey ?? 'sk_billing_internal',
    },
  }
}

describe('applyBillingWorkspaceLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    mocks.getSettings.mockReturnValue(settings())
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts the archive action with the internal credential', async () => {
    await applyBillingWorkspaceLifecycle({
      organizationId: 'org_1',
      action: 'archive',
      deletedBy: 'user_admin',
      reason: 'organization deleted',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe(
      'https://billing.876.test/api/v1/internal/tenants/lifecycle'
    )
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({
      'x-internal-key': 'sk_billing_internal',
      'content-type': 'application/json',
    })
    expect(JSON.parse(init.body as string)).toEqual({
      organizationId: 'org_1',
      action: 'archive',
      deletedBy: 'user_admin',
      reason: 'organization deleted',
    })
    expect(mocks.error).not.toHaveBeenCalled()
  })

  it('sends null attribution for a restore', async () => {
    await applyBillingWorkspaceLifecycle({
      organizationId: 'org_1',
      action: 'restore',
    })

    expect(JSON.parse(fetchMock.mock.calls[0]![1].body as string)).toEqual({
      organizationId: 'org_1',
      action: 'restore',
      deletedBy: null,
      reason: null,
    })
  })

  it('logs and gives up when Billing is not configured', async () => {
    mocks.getSettings.mockReturnValue(settings({ url: '   ' }))

    await applyBillingWorkspaceLifecycle({
      organizationId: 'org_1',
      action: 'archive',
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(mocks.error).toHaveBeenCalledTimes(1)
    expect(mocks.error).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: 'org_1',
        has_billing_url: false,
        has_internal_key: true,
      }),
      'billing_workspace.not_configured'
    )
  })

  it('logs the Billing response body on a rejection without throwing', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => '{"error":{"code":"auth/invalid-internal-key"}}',
    })

    await expect(
      applyBillingWorkspaceLifecycle({
        organizationId: 'org_1',
        action: 'archive',
      })
    ).resolves.toBeUndefined()

    expect(mocks.error).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: 'org_1',
        status: 401,
        body: '{"error":{"code":"auth/invalid-internal-key"}}',
      }),
      'billing_workspace.failed'
    )
  })

  it('never propagates a transport failure into the delete it follows', async () => {
    fetchMock.mockRejectedValue(new Error('network down'))

    await expect(
      applyBillingWorkspaceLifecycle({
        organizationId: 'org_1',
        action: 'archive',
      })
    ).resolves.toBeUndefined()

    expect(mocks.error).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: 'org_1' }),
      'billing_workspace.failed'
    )
  })

  describe('url and key normalization', () => {
    it('trims trailing slashes from the billing url', async () => {
      mocks.getSettings.mockReturnValue(settings({ url: 'https://billing.876.test///' }))
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive' })
      expect(fetchMock.mock.calls[0]![0]).toBe('https://billing.876.test/api/v1/internal/tenants/lifecycle')
    })

    it('trims surrounding whitespace from the billing url', async () => {
      mocks.getSettings.mockReturnValue(settings({ url: '  https://billing.876.test/  ' }))
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive' })
      expect(fetchMock.mock.calls[0]![0]).toBe('https://billing.876.test/api/v1/internal/tenants/lifecycle')
    })

    it('handles a url without a trailing slash', async () => {
      mocks.getSettings.mockReturnValue(settings({ url: 'https://billing.876.test' }))
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive' })
      expect(fetchMock.mock.calls[0]![0]).toBe('https://billing.876.test/api/v1/internal/tenants/lifecycle')
    })

    it('treats a whitespace-only internal key as not configured', async () => {
      mocks.getSettings.mockReturnValue(settings({ internalKey: '   ' }))
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive' })
      expect(fetchMock).not.toHaveBeenCalled()
      expect(mocks.error).toHaveBeenCalledWith(
        expect.objectContaining({ has_billing_url: true, has_internal_key: false }),
        'billing_workspace.not_configured'
      )
    })

    it('treats an empty url and empty key as not configured', async () => {
      mocks.getSettings.mockReturnValue(settings({ url: '', internalKey: '' }))
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive' })
      expect(fetchMock).not.toHaveBeenCalled()
      expect(mocks.error).toHaveBeenCalledWith(
        expect.objectContaining({ has_billing_url: false, has_internal_key: false }),
        'billing_workspace.not_configured'
      )
    })

    it('treats both whitespace url and whitespace key as not configured', async () => {
      mocks.getSettings.mockReturnValue(settings({ url: '   ', internalKey: '   ' }))
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive' })
      expect(fetchMock).not.toHaveBeenCalled()
      expect(mocks.error).toHaveBeenCalledTimes(1)
    })

    it('trims the internal key before sending', async () => {
      mocks.getSettings.mockReturnValue(settings({ internalKey: '  sk_trimmed  ' }))
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive' })
      expect(fetchMock.mock.calls[0]![1].headers).toMatchObject({ 'x-internal-key': 'sk_trimmed' })
    })
  })

  describe('payload serialization', () => {
    it('coalesces undefined deletedBy and reason to null', async () => {
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive', deletedBy: undefined, reason: undefined })
      expect(JSON.parse(fetchMock.mock.calls[0]![1].body as string)).toEqual({
        organizationId: 'org_1',
        action: 'archive',
        deletedBy: null,
        reason: null,
      })
    })

    it('sends explicit nulls for archive without attribution', async () => {
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive' })
      const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string)
      expect(body.deletedBy).toBeNull()
      expect(body.reason).toBeNull()
    })

    it('sends explicit values when provided', async () => {
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_42', action: 'archive', deletedBy: 'user_123', reason: 'duplicate' })
      expect(JSON.parse(fetchMock.mock.calls[0]![1].body as string)).toEqual({
        organizationId: 'org_42',
        action: 'archive',
        deletedBy: 'user_123',
        reason: 'duplicate',
      })
    })

    it('preserves organizationId verbatim', async () => {
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_with-dash_123', action: 'restore' })
      expect(JSON.parse(fetchMock.mock.calls[0]![1].body as string).organizationId).toBe('org_with-dash_123')
    })

    it('sends correct content-type header', async () => {
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive' })
      expect(fetchMock.mock.calls[0]![1].headers['content-type']).toBe('application/json')
    })

    it('uses POST method', async () => {
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive' })
      expect(fetchMock.mock.calls[0]![1].method).toBe('POST')
    })
  })

  describe('success path', () => {
    it('logs info on success for archive', async () => {
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive' })
      expect(mocks.info).toHaveBeenCalledWith(
        { organization_id: 'org_1', action: 'archive' },
        'billing_workspace.applied'
      )
      expect(mocks.error).not.toHaveBeenCalled()
    })

    it('logs info on success for restore', async () => {
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'restore' })
      expect(mocks.info).toHaveBeenCalledWith(
        { organization_id: 'org_1', action: 'restore' },
        'billing_workspace.applied'
      )
    })

    it('does not log error on success', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => 'ok' })
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive' })
      expect(mocks.error).not.toHaveBeenCalled()
    })

    it('passes an abort signal to fetch', async () => {
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive' })
      const init = fetchMock.mock.calls[0]![1]
      expect(init.signal).toBeDefined()
      expect(init.signal instanceof AbortSignal).toBe(true)
    })

    it('clears the timeout after success', async () => {
      const clearSpy = vi.spyOn(global, 'clearTimeout')
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive' })
      expect(clearSpy).toHaveBeenCalled()
      clearSpy.mockRestore()
    })
  })

  describe('failure handling', () => {
    it('logs status and body on 500', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => 'Internal Server Error' })
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive' })
      expect(mocks.error).toHaveBeenCalledWith(
        expect.objectContaining({ status: 500, body: 'Internal Server Error' }),
        'billing_workspace.failed'
      )
    })

    it('logs status and body on 404', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 404, text: async () => 'not found' })
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive' })
      expect(mocks.error).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }), 'billing_workspace.failed')
    })

    it('trims body and slices to 500 chars', async () => {
      const longBody = 'x'.repeat(600)
      fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => longBody })
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive' })
      const loggedBody = mocks.error.mock.calls[0]![0].body as string
      expect(loggedBody.length).toBe(500)
      expect(loggedBody).toBe('x'.repeat(500))
    })

    it('trims whitespace from body before logging', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => '  hello world  ' })
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive' })
      expect(mocks.error).toHaveBeenCalledWith(expect.objectContaining({ body: 'hello world' }), 'billing_workspace.failed')
    })

    it('handles empty body on error', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => '' })
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive' })
      expect(mocks.error).toHaveBeenCalledWith(expect.objectContaining({ body: '' }), 'billing_workspace.failed')
    })

    it('handles whitespace-only body as empty', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => '   \n  ' })
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive' })
      expect(mocks.error).toHaveBeenCalledWith(expect.objectContaining({ body: '' }), 'billing_workspace.failed')
    })

    it('does not throw when response.text rejects', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => { throw new Error('text failed') } })
      await expect(applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive' })).resolves.toBeUndefined()
      expect(mocks.error).toHaveBeenCalledWith(expect.objectContaining({ organization_id: 'org_1' }), 'billing_workspace.failed')
    })

    it('logs the action in the error context', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 403, text: async () => 'forbidden' })
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'restore' })
      expect(mocks.error).toHaveBeenCalledWith(expect.objectContaining({ action: 'restore' }), 'billing_workspace.failed')
    })

    it('logs organization_id in every failure', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => 'bad' })
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_special', action: 'archive' })
      expect(mocks.error).toHaveBeenCalledWith(expect.objectContaining({ organization_id: 'org_special' }), 'billing_workspace.failed')
    })

    it('handles AbortError without throwing', async () => {
      const abortErr = new DOMException('Aborted', 'AbortError')
      fetchMock.mockRejectedValue(abortErr)
      await expect(applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive' })).resolves.toBeUndefined()
      expect(mocks.error).toHaveBeenCalledWith(expect.objectContaining({ err: abortErr }), 'billing_workspace.failed')
    })

    it('handles generic fetch rejection and logs err', async () => {
      const err = new Error('connection refused')
      fetchMock.mockRejectedValue(err)
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive' })
      expect(mocks.error).toHaveBeenCalledWith(expect.objectContaining({ err }), 'billing_workspace.failed')
    })

    it('clears timeout even on fetch failure', async () => {
      const clearSpy = vi.spyOn(global, 'clearTimeout')
      fetchMock.mockRejectedValue(new Error('down'))
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive' })
      expect(clearSpy).toHaveBeenCalled()
      clearSpy.mockRestore()
    })

    it('clears timeout even on non-ok response', async () => {
      const clearSpy = vi.spyOn(global, 'clearTimeout')
      fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => 'err' })
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive' })
      expect(clearSpy).toHaveBeenCalled()
      clearSpy.mockRestore()
    })

    it('does not call info on failure', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => 'err' })
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive' })
      expect(mocks.info).not.toHaveBeenCalled()
    })
  })

  describe('not configured', () => {
    it('logs not_configured with action archive', async () => {
      mocks.getSettings.mockReturnValue(settings({ url: '' }))
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive' })
      expect(mocks.error).toHaveBeenCalledWith(expect.objectContaining({ action: 'archive' }), 'billing_workspace.not_configured')
    })

    it('logs not_configured with action restore', async () => {
      mocks.getSettings.mockReturnValue(settings({ url: '' }))
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'restore' })
      expect(mocks.error).toHaveBeenCalledWith(expect.objectContaining({ action: 'restore' }), 'billing_workspace.not_configured')
    })

    it('does not call info when not configured', async () => {
      mocks.getSettings.mockReturnValue(settings({ url: '' }))
      await applyBillingWorkspaceLifecycle({ organizationId: 'org_1', action: 'archive' })
      expect(mocks.info).not.toHaveBeenCalled()
    })
  })
})
