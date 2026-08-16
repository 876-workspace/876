import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAuthSession: vi.fn(),
  usersRetrieve: vi.fn(),
  listRouting: vi.fn(),
  subscriptionsRetrieve: vi.fn(),
  captureMessage: vi.fn(),
}))

vi.mock('./session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./session')>()),
  getAuthSession: mocks.getAuthSession,
}))
vi.mock('@/lib/876/platform-client', () => ({
  getPlatformClient: async () => ({
    users: { retrieve: mocks.usersRetrieve },
    memberships: { listRouting: mocks.listRouting },
    subscriptions: { retrieve: mocks.subscriptionsRetrieve },
  }),
}))
vi.mock('@sentry/nextjs', () => ({ captureMessage: mocks.captureMessage }))

const { getInvoiceContextResult } = await import('./context')

const SESSION = {
  accessToken: 'at_live',
  user: { id: 'user_9f2', email: 'alejandra@example.com', orgId: 'org_44' },
}

function activeAccount(overrides: Record<string, unknown> = {}) {
  return {
    data: { id: 'user_9f2', status: 'active', banned: false, ...overrides },
    error: null,
  }
}

function membership() {
  return {
    status: 'active',
    role: 'owner',
    organization: {
      id: 'org_44',
      name: 'Marchand Logistics',
      slug: 'marchand',
      status: 'active',
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getAuthSession.mockResolvedValue(SESSION)
  mocks.usersRetrieve.mockResolvedValue(activeAccount())
  mocks.listRouting.mockResolvedValue({
    data: { data: [membership()] },
    error: null,
  })
  mocks.subscriptionsRetrieve.mockResolvedValue({
    data: { status: 'active' },
    error: null,
  })
})

describe('getInvoiceContextResult', () => {
  describe('dead sessions', () => {
    // Regression: a purged account kept a valid sealed cookie, its memberships
    // came back empty, and that was indistinguishable from a brand-new account
    // — so a deleted user was offered the create-an-organization form.
    it('reports signed-out when the account no longer exists', async () => {
      mocks.usersRetrieve.mockResolvedValue({
        data: null,
        error: { code: 'user/not-found' },
      })

      const result = await getInvoiceContextResult()

      expect(result).toEqual({ status: 'signed-out' })
      expect(mocks.listRouting).not.toHaveBeenCalled()
    })

    it('reports signed-out when the account is banned', async () => {
      mocks.usersRetrieve.mockResolvedValue(activeAccount({ banned: true }))

      const result = await getInvoiceContextResult()

      expect(result).toEqual({ status: 'signed-out' })
      expect(mocks.listRouting).not.toHaveBeenCalled()
    })

    it('reports signed-out when the account status is not active', async () => {
      mocks.usersRetrieve.mockResolvedValue(
        activeAccount({ status: 'suspended' })
      )

      const result = await getInvoiceContextResult()

      expect(result).toEqual({ status: 'signed-out' })
      expect(mocks.listRouting).not.toHaveBeenCalled()
    })

    it('reports signed-out when there is no signed session', async () => {
      mocks.getAuthSession.mockResolvedValue({ user: null })

      const result = await getInvoiceContextResult()

      expect(result).toEqual({ status: 'signed-out' })
      expect(mocks.usersRetrieve).not.toHaveBeenCalled()
    })
  })

  describe('live accounts', () => {
    it('still resolves a context for an active account', async () => {
      const result = await getInvoiceContextResult()

      expect(result.status).toBe('ok')
      expect(mocks.usersRetrieve).toHaveBeenCalledTimes(1)
      expect(mocks.usersRetrieve).toHaveBeenCalledWith({ id: 'user_9f2' })
    })

    // A null status must not be read as "disabled" — it means the platform did
    // not state one, and treating that as dead would sign out live accounts.
    it('does not sign out an account whose status is null', async () => {
      mocks.usersRetrieve.mockResolvedValue(activeAccount({ status: null }))

      const result = await getInvoiceContextResult()

      expect(result.status).toBe('ok')
    })

    it('reports no-organization for a live account with no usable membership', async () => {
      mocks.listRouting.mockResolvedValue({ data: { data: [] }, error: null })

      const result = await getInvoiceContextResult()

      expect(result).toEqual({ status: 'no-organization' })
    })
  })
})
